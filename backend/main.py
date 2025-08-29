from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import tempfile
import logging
import time
from dotenv import load_dotenv
import requests
import torch
import librosa
import numpy as np
from transformers import WhisperProcessor, WhisperForConditionalGeneration
from pydantic import BaseModel
from typing import Optional

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI app initialization
app = FastAPI(
    title="GST & License Analyzer API",
    description="API for audio transcription and GST/License analysis using IBM WatsonX",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React development server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for token and model management
access_token_cache = {
    "token": None,
    "expiry": 0
}

whisper_model_cache = {
    "processor": None,
    "model": None
}

# Pydantic models
class TranscriptionResponse(BaseModel):
    transcription: str
    success: bool
    message: str

class IntentResponse(BaseModel):
    intent: str
    success: bool
    message: str

class ResolutionResponse(BaseModel):
    resolution: str
    success: bool
    message: str

class FullAnalysisResponse(BaseModel):
    transcription: str
    intent: str
    resolution: str
    success: bool
    message: str

def get_access_token(api_key: str, force_refresh: bool = False) -> Optional[str]:
    """
    Get IBM Cloud access token with caching and refresh logic.
    """
    try:
        current_time = time.time()
        
        # Check if we have a valid cached token
        if (not force_refresh and 
            access_token_cache["token"] and 
            current_time < access_token_cache["expiry"]):
            logger.info("Using cached access token")
            return access_token_cache["token"]
        
        logger.info("Requesting new access token...")
        url = "https://iam.cloud.ibm.com/identity/token"
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
        }
        data = {
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": api_key
        }
        
        response = requests.post(url, headers=headers, data=data, timeout=30)
        response.raise_for_status()
        
        token_data = response.json()
        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 3600)
        
        if access_token:
            # Store token and calculate expiry time (with 5-minute buffer)
            access_token_cache["token"] = access_token
            access_token_cache["expiry"] = current_time + expires_in - 300
            logger.info(f"New access token obtained, expires in {expires_in} seconds")
            return access_token
        else:
            logger.error("No access token in response")
            return None
    
    except Exception as e:
        logger.error(f"Error getting access token: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting access token: {str(e)}")

def make_watsonx_request(payload: dict, api_key: str, max_retries: int = 2) -> Optional[dict]:
    """
    Make a request to WatsonX with automatic token refresh on 401 errors.
    """
    for attempt in range(max_retries + 1):
        try:
            force_refresh = attempt > 0
            access_token = get_access_token(api_key, force_refresh=force_refresh)
            
            if not access_token:
                raise HTTPException(status_code=500, detail="Failed to obtain access token")
            
            # WatsonX API configuration
            watsonx_url = "https://us-south.ml.cloud.ibm.com/ml/v1/text/chat"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            response = requests.post(
                watsonx_url,
                headers=headers,
                json=payload,
                params={"version": "2023-05-29"},
                timeout=300
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401 and attempt < max_retries:
                logger.warning(f"Token expired on attempt {attempt + 1}, refreshing...")
                access_token_cache["token"] = None
                access_token_cache["expiry"] = 0
                continue
            else:
                logger.error(f"API Response Status: {response.status_code}")
                logger.error(f"API Response: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"WatsonX API Error: {response.text}"
                )
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error on attempt {attempt + 1}: {str(e)}")
            if attempt == max_retries:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to connect to WatsonX API after {max_retries + 1} attempts: {str(e)}"
                )
            else:
                time.sleep(1)
    
    return None

def load_whisper_model():
    """
    Load Whisper model and processor (cached to avoid reloading).
    """
    try:
        if whisper_model_cache["processor"] is None or whisper_model_cache["model"] is None:
            logger.info("Loading Whisper model...")
            processor = WhisperProcessor.from_pretrained("openai/whisper-small")
            model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-small")
            
            whisper_model_cache["processor"] = processor
            whisper_model_cache["model"] = model
            logger.info("Whisper model loaded successfully!")
        
        return whisper_model_cache["processor"], whisper_model_cache["model"]
    except Exception as e:
        logger.error(f"Error loading Whisper model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error loading Whisper model: {str(e)}")

def preprocess_audio(audio_path: str) -> tuple:
    """
    Preprocess audio for better transcription quality.
    """
    try:
        audio, sr = librosa.load(audio_path, sr=None)
        audio = librosa.util.normalize(audio)
        audio, _ = librosa.effects.trim(audio, top_db=20)
        audio = librosa.effects.preemphasis(audio)
        
        if sr != 16000:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
        
        return audio, 16000
    except Exception as e:
        logger.error(f"Error preprocessing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error preprocessing audio: {str(e)}")

def transcribe_audio_file(audio_file: UploadFile) -> str:
    """
    Enhanced transcribe function with chunking for long audio files.
    """
    try:
        # Check file size (limit to 100MB)
        max_size = 100 * 1024 * 1024  # 100MB
        content = audio_file.file.read()
        
        if len(content) > max_size:
            raise HTTPException(
                status_code=413, 
                detail="File too large. Please upload files smaller than 100MB."
            )
        
        processor, model = load_whisper_model()
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp_file:
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Preprocess audio
            audio_array, sampling_rate = preprocess_audio(tmp_file_path)
            duration = len(audio_array) / sampling_rate
            
            # Log duration for debugging
            logger.info(f"Audio duration: {duration:.2f} seconds")
            
            # For very long audio files (>10 minutes), use smaller chunks
            if duration > 600:  # 10 minutes
                return transcribe_very_long_audio(audio_array, sampling_rate, processor, model)
            elif duration > 30:
                return transcribe_long_audio(audio_array, sampling_rate, processor, model)
            else:
                return transcribe_short_audio(audio_array, sampling_rate, processor, model)
        finally:
            # Clean up temporary file
            try:
                os.unlink(tmp_file_path)
            except:
                pass
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Critical error in transcription: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Critical error in transcription: {str(e)}")

def transcribe_short_audio(audio_array, sampling_rate, processor, model) -> str:
    """
    Transcribe short audio files (<=30 seconds).
    """
    try:
        input_features = processor(
            audio_array, 
            sampling_rate=sampling_rate, 
            return_tensors="pt"
        ).input_features
        
        predicted_ids = model.generate(
            input_features,
            max_length=448,
            num_beams=5,
            do_sample=False,
            temperature=0.0,
            early_stopping=True,
            no_repeat_ngram_size=3
        )
        
        transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        return transcription.strip()
        
    except Exception as e:
        logger.error(f"Short audio transcription failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Short audio transcription failed: {str(e)}")

def transcribe_long_audio(audio_array, sampling_rate, processor, model) -> str:
    """
    Transcribe long audio files by splitting into chunks.
    """
    try:
        chunk_length = 30
        chunk_samples = chunk_length * sampling_rate
        chunks = []
        overlap_samples = int(2 * sampling_rate)
        
        start = 0
        while start < len(audio_array):
            end = min(start + chunk_samples, len(audio_array))
            chunk = audio_array[start:end]
            
            if len(chunk) < chunk_samples and start > 0:
                chunk = np.pad(chunk, (0, chunk_samples - len(chunk)), 'constant')
            
            chunks.append(chunk)
            
            if end >= len(audio_array):
                break
            start = end - overlap_samples
        
        # Transcribe each chunk
        all_transcriptions = []
        for i, chunk in enumerate(chunks):
            try:
                input_features = processor(
                    chunk, 
                    sampling_rate=sampling_rate, 
                    return_tensors="pt"
                ).input_features
                
                predicted_ids = model.generate(
                    input_features,
                    max_length=448,
                    num_beams=5,
                    do_sample=False,
                    temperature=0.0,
                    early_stopping=True,
                    no_repeat_ngram_size=3
                )
                
                chunk_transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
                
                if chunk_transcription.strip():
                    all_transcriptions.append(chunk_transcription.strip())
                    
            except Exception as chunk_error:
                logger.warning(f"Chunk {i+1} failed: {str(chunk_error)}")
                continue
        
        if not all_transcriptions:
            raise HTTPException(status_code=500, detail="No successful chunk transcriptions")
        
        return clean_combined_transcription(all_transcriptions)
        
    except Exception as e:
        logger.error(f"Long audio transcription failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Long audio transcription failed: {str(e)}")

def transcribe_very_long_audio(audio_array, sampling_rate, processor, model) -> str:
    """
    Transcribe very long audio files (>10 minutes) with smaller chunks.
    """
    try:
        chunk_length = 20  # 20 seconds per chunk for very long files
        chunk_samples = chunk_length * sampling_rate
        chunks = []
        overlap_samples = int(1 * sampling_rate)  # 1 second overlap
        
        start = 0
        while start < len(audio_array):
            end = min(start + chunk_samples, len(audio_array))
            chunk = audio_array[start:end]
            
            if len(chunk) < chunk_samples and start > 0:
                chunk = np.pad(chunk, (0, chunk_samples - len(chunk)), 'constant')
            
            chunks.append(chunk)
            
            if end >= len(audio_array):
                break
            start = end - overlap_samples
        
        logger.info(f"Processing {len(chunks)} chunks for very long audio...")
        
        # Transcribe each chunk with progress tracking
        all_transcriptions = []
        for i, chunk in enumerate(chunks):
            if i % 10 == 0:  # Log progress every 10 chunks
                logger.info(f"Processing chunk {i+1}/{len(chunks)}...")
            
            try:
                input_features = processor(
                    chunk, 
                    sampling_rate=sampling_rate, 
                    return_tensors="pt"
                ).input_features
                
                predicted_ids = model.generate(
                    input_features,
                    max_length=224,  # Shorter for faster processing
                    num_beams=3,     # Fewer beams for speed
                    do_sample=False,
                    temperature=0.0,
                    early_stopping=True,
                    no_repeat_ngram_size=2
                )
                
                chunk_transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
                
                if chunk_transcription.strip():
                    all_transcriptions.append(chunk_transcription.strip())
                    
            except Exception as chunk_error:
                logger.warning(f"Chunk {i+1} failed: {str(chunk_error)}")
                continue
        
        if not all_transcriptions:
            raise HTTPException(status_code=500, detail="No successful chunk transcriptions")
        
        return clean_combined_transcription(all_transcriptions)
        
    except Exception as e:
        logger.error(f"Very long audio transcription failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Very long audio transcription failed: {str(e)}")

def clean_combined_transcription(transcriptions) -> str:
    """
    Clean and combine transcriptions from multiple chunks, removing duplicates.
    """
    if not transcriptions:
        return ""
    
    if len(transcriptions) == 1:
        return transcriptions[0]
    
    combined = transcriptions[0]
    
    for i in range(1, len(transcriptions)):
        current_transcription = transcriptions[i]
        combined_words = combined.split()
        current_words = current_transcription.split()
        
        max_overlap = min(10, len(combined_words), len(current_words))
        overlap_found = 0
        
        for overlap_len in range(max_overlap, 0, -1):
            if combined_words[-overlap_len:] == current_words[:overlap_len]:
                overlap_found = overlap_len
                break
        
        if overlap_found > 0:
            combined += " " + " ".join(current_words[overlap_found:])
        else:
            combined += " " + current_transcription
    
    return combined.strip()

# API Endpoints
@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "GST & License Analyzer API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Detailed health check endpoint."""
    api_key = os.getenv("API_KEY")
    project_id = os.getenv("PROJECT_ID")
    model_id = os.getenv("MODEL_ID")
    
    return {
        "status": "healthy",
        "environment": {
            "api_key_configured": bool(api_key),
            "project_id_configured": bool(project_id),
            "model_id_configured": bool(model_id),
        },
        "token_status": {
            "has_cached_token": bool(access_token_cache["token"]),
            "token_valid": time.time() < access_token_cache["expiry"] if access_token_cache["token"] else False
        }
    }

@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio_endpoint(file: UploadFile = File(...)):
    """Transcribe audio file to text."""
    try:
        if not file.filename.lower().endswith('.mp3'):
            raise HTTPException(status_code=400, detail="Only MP3 files are supported")
        
        transcription = transcribe_audio_file(file)
        
        return TranscriptionResponse(
            transcription=transcription,
            success=True,
            message="Transcription completed successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.post("/recognize-intent", response_model=IntentResponse)
async def recognize_intent_endpoint(content: dict):
    """Recognize intent from transcribed text."""
    try:
        api_key = os.getenv("API_KEY")
        project_id = os.getenv("PROJECT_ID")
        model_id = os.getenv("MODEL_ID")
        
        if not all([api_key, project_id, model_id]):
            raise HTTPException(
                status_code=500, 
                detail="Missing required environment variables (API_KEY, PROJECT_ID, MODEL_ID)"
            )
        
        text_content = content.get("text", "")
        if not text_content:
            raise HTTPException(status_code=400, detail="Text content is required")
        
        # Intent recognition system message
        system_message = """You are an intent recognition system for business inquiries. 
        Analyze the transcribed text and identify the specific intent category.
        
        Possible intents:
        1. GST_REGISTRATION - Questions about GST registration process
        2. GST_COMPLIANCE - GST compliance issues or requirements
        3. GST_CALCULATION - GST calculation or tax amount queries
        4. LICENSE_APPLICATION - License application processes
        5. LICENSE_RENEWAL - License renewal or validity issues
        6. LICENSE_COMPLIANCE - License compliance requirements
        7. TAX_FILING - Tax filing procedures or deadlines
        8. BUSINESS_SETUP - General business setup queries
        9. DOCUMENTATION - Document requirements or submission
        10. OTHER - Any other business-related query
        
        Respond with ONLY the intent category (e.g., "GST_REGISTRATION") and a brief 1-sentence description of what the user is asking about."""
        
        user_message = f"Identify the intent in this transcribed text: {text_content}"
        
        payload = {
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            "parameters": {
                "decoding_method": "greedy",
                "max_new_tokens": 100,
                "temperature": 0.1,
                "top_p": 0.9,
                "repetition_penalty": 1.1
            },
            "model_id": model_id,
            "project_id": project_id
        }
        
        result = make_watsonx_request(payload, api_key)
        
        if result:
            intent_response = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            return IntentResponse(
                intent=intent_response.strip(),
                success=True,
                message="Intent recognition completed successfully"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to get intent recognition response")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Intent recognition error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Intent recognition failed: {str(e)}")

@app.post("/generate-resolution", response_model=ResolutionResponse)
async def generate_resolution_endpoint(data: dict):
    """Generate resolution based on identified intent."""
    try:
        api_key = os.getenv("API_KEY")
        project_id = os.getenv("PROJECT_ID")
        model_id = os.getenv("MODEL_ID")
        
        if not all([api_key, project_id, model_id]):
            raise HTTPException(
                status_code=500,
                detail="Missing required environment variables (API_KEY, PROJECT_ID, MODEL_ID)"
            )
        
        content = data.get("content", "")
        intent = data.get("intent", "")
        
        if not content or not intent:
            raise HTTPException(status_code=400, detail="Both content and intent are required")
        
        # Intent-specific resolution templates
        resolution_templates = {
            "GST_REGISTRATION": """You are a GST registration expert. Provide detailed step-by-step guidance for GST registration including:
            - Required documents and eligibility criteria
            - Online registration process on GST portal
            - Timeline and fees involved
            - Common issues and solutions""",
            
            "GST_COMPLIANCE": """You are a GST compliance specialist. Provide comprehensive compliance guidance including:
            - Monthly/quarterly filing requirements
            - Record keeping obligations
            - Compliance deadlines and penalties
            - Best practices for maintaining compliance""",
            
            "GST_CALCULATION": """You are a GST calculation expert. Provide detailed calculation guidance including:
            - GST rate applicable to specific goods/services
            - Input tax credit calculations
            - Reverse charge mechanism
            - Examples with step-by-step calculations""",
            
            "LICENSE_APPLICATION": """You are a business licensing expert. Provide comprehensive license application guidance including:
            - Types of licenses required for the business
            - Application process and required documents
            - Timelines and fees
            - Authority contacts and follow-up procedures""",
            
            "LICENSE_RENEWAL": """You are a license renewal specialist. Provide detailed renewal guidance including:
            - Renewal timelines and advance notice requirements
            - Required documents and fees
            - Online vs offline renewal processes
            - Consequences of delayed renewal""",
            
            "LICENSE_COMPLIANCE": """You are a license compliance expert. Provide comprehensive compliance guidance including:
            - Ongoing compliance requirements
            - Regular submissions and renewals
            - Inspection readiness
            - Penalty avoidance strategies""",
            
            "TAX_FILING": """You are a tax filing expert. Provide detailed filing guidance including:
            - Filing deadlines and procedures
            - Required forms and documents
            - Online filing process
            - Common errors and how to avoid them""",
            
            "BUSINESS_SETUP": """You are a business setup consultant. Provide comprehensive setup guidance including:
            - Business registration requirements
            - Legal structure recommendations
            - Required licenses and permits
            - Tax registrations needed""",
            
            "DOCUMENTATION": """You are a documentation specialist. Provide detailed document guidance including:
            - Required documents for specific processes
            - Document formats and specifications
            - Submission procedures
            - Document validity and renewal requirements""",
            
            "OTHER": """You are a general business consultant. Analyze the query and provide relevant business guidance including:
            - Understanding the specific requirement
            - Applicable regulations and procedures
            - Step-by-step action plan
            - Resources and contacts for further assistance"""
        }
        
        # Extract intent category from the intent response
        intent_category = intent.split()[0] if intent else "OTHER"
        if intent_category not in resolution_templates:
            intent_category = "OTHER"
        
        system_message = resolution_templates[intent_category]
        
        user_message = f"""
        Identified Intent: {intent}
        
        Original Query: {content}
        
        Please provide a detailed, actionable resolution for this query. Include:
        1. Immediate steps to take
        2. Required documents or information
        3. Relevant deadlines or timelines
        4. Contact information or resources
        5. Potential challenges and solutions
        
        Format your response in a clear, professional manner suitable for business implementation.
        """
        
        payload = {
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            "parameters": {
                "decoding_method": "greedy",
                "max_new_tokens": 1500,
                "temperature": 0.1,
                "top_p": 0.9,
                "repetition_penalty": 1.1
            },
            "model_id": model_id,
            "project_id": project_id
        }
        
        result = make_watsonx_request(payload, api_key)
        
        if result:
            resolution_response = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            return ResolutionResponse(
                resolution=resolution_response.strip(),
                success=True,
                message="Resolution generated successfully"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to get resolution response")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resolution generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Resolution generation failed: {str(e)}")

@app.post("/analyze", response_model=FullAnalysisResponse)
async def full_analysis_endpoint(file: UploadFile = File(...)):
    """Complete analysis: transcription, intent recognition, and resolution generation."""
    try:
        if not file.filename.lower().endswith('.mp3'):
            raise HTTPException(status_code=400, detail="Only MP3 files are supported")
        
        api_key = os.getenv("API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="API_KEY not found in environment variables")
        
        # Step 1: Transcribe audio
        transcription = transcribe_audio_file(file)
        
        # Step 2: Recognize intent
        intent_result = await recognize_intent_endpoint({"text": transcription})
        
        # Step 3: Generate resolution
        resolution_result = await generate_resolution_endpoint({
            "content": transcription,
            "intent": intent_result.intent
        })
        
        return FullAnalysisResponse(
            transcription=transcription,
            intent=intent_result.intent,
            resolution=resolution_result.resolution,
            success=True,
            message="Full analysis completed successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Full analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Full analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# GST & License Analyzer

A modern React + FastAPI application for analyzing audio files to provide business compliance guidance using IBM WatsonX AI.

## Features

- **Audio Transcription**: Convert speech to text using OpenAI's Whisper model
- **Intent Recognition**: Automatically identify business intents from transcribed text
- **Smart Resolution**: Generate detailed, actionable guidance based on identified intents
- **Modern UI**: Clean, responsive React interface with real-time updates
- **System Monitoring**: Built-in health checks and status monitoring

## Supported Business Intents

- GST Registration & Setup
- GST Compliance & Filing  
- GST Calculations
- License Applications
- License Renewals
- License Compliance
- Tax Filing Procedures
- Business Setup Guidance
- Documentation Requirements
- General Business Queries

## Architecture

```
├── backend/           # FastAPI backend
│   ├── main.py       # Main application file
│   └── requirements.txt
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API services
│   │   └── App.js       # Main app component
│   └── package.json
└── README.md
```

## Prerequisites

- Python 3.8+
- Node.js 16+
- IBM Cloud account with WatsonX access
- IBM Cloud API key and Project ID

## Setup Instructions

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your IBM Cloud credentials:
   ```
   API_KEY=your_ibm_cloud_api_key_here
   PROJECT_ID=your_watsonx_project_id_here
   MODEL_ID=ibm/granite-13b-chat-v2
   ```

5. **Run the backend server:**
   ```bash
   python main.py
   ```
   
   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment (optional):**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` if you need to change the backend URL:
   ```
   REACT_APP_API_URL=http://localhost:8000
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```
   
   The application will be available at `http://localhost:3000`

## Usage

1. **Open the application** in your browser at `http://localhost:3000`

2. **Upload an MP3 file** by dragging and dropping or clicking to browse

3. **Choose analysis type:**
   - **Quick Analysis**: Complete analysis in one go
   - **Step-by-Step**: Process each step individually with intermediate results

4. **View results:**
   - Transcribed text
   - Identified business intent
   - Detailed resolution and guidance

## API Endpoints

The FastAPI backend provides the following endpoints:

- `GET /health` - System health check
- `POST /transcribe` - Transcribe audio file
- `POST /recognize-intent` - Recognize intent from text
- `POST /generate-resolution` - Generate resolution based on intent
- `POST /analyze` - Complete analysis (transcription + intent + resolution)

API documentation is available at `http://localhost:8000/docs` when the server is running.

## Environment Variables

### Backend (.env)
- `API_KEY` - IBM Cloud API key (required)
- `PROJECT_ID` - WatsonX project ID (required)
- `MODEL_ID` - WatsonX model ID (default: ibm/granite-13b-chat-v2)
- `DEBUG` - Enable debug mode (default: False)
- `LOG_LEVEL` - Logging level (default: INFO)

### Frontend (.env)
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:8000)
- `REACT_APP_DEBUG` - Enable debug features (default: false)

## Development

### Backend Development

The FastAPI backend uses:
- **FastAPI** for the web framework
- **Transformers** and **Whisper** for audio transcription
- **Librosa** for audio preprocessing
- **Requests** for WatsonX API calls

Key features:
- Automatic token management with refresh
- Chunked audio processing for long files
- Comprehensive error handling
- Health monitoring

### Frontend Development

The React frontend uses:
- **React 18** with hooks
- **Tailwind CSS** for styling
- **Axios** for API calls
- **React Dropzone** for file uploads
- **Lucide React** for icons
- **React Hot Toast** for notifications

Key features:
- Responsive design
- Real-time status updates
- Audio preview
- Copy-to-clipboard functionality
- System status monitoring

## Troubleshooting

### Common Issues

1. **"API Key not found" error:**
   - Ensure `.env` file exists in backend directory
   - Verify API_KEY is correctly set
   - Check file permissions

2. **"Failed to connect to WatsonX API":**
   - Verify your IBM Cloud API key is valid
   - Check internet connection
   - Ensure PROJECT_ID is correct

3. **"Error loading Whisper model":**
   - First run may take time to download the model
   - Ensure sufficient disk space
   - Check internet connection for model download

4. **Frontend can't connect to backend:**
   - Verify backend is running on port 8000
   - Check CORS settings if using different ports
   - Ensure firewall isn't blocking connections

### Performance Tips

- For better transcription accuracy, use clear audio with minimal background noise
- Large audio files (>5 minutes) will take longer to process
- The Whisper model download happens once on first use
- Consider using a more powerful model for better accuracy (e.g., whisper-medium)

## License

This project is built for business analysts and compliance professionals. Please ensure you have appropriate licenses for IBM WatsonX usage.

## Support

For issues related to:
- **IBM WatsonX**: Check IBM Cloud documentation
- **Audio processing**: Ensure MP3 files are properly formatted
- **Application bugs**: Check console logs for detailed error messages

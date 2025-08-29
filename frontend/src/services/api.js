import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 10 minutes timeout for audio processing
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    } else if (error.response?.status === 404) {
      throw new Error('Service not found. Please check your configuration.');
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data?.detail || 'Invalid request. Please check your input.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. The audio file might be too large or the server is busy.');
    } else if (error.code === 'NETWORK_ERROR') {
      throw new Error('Network error. Please check your internet connection.');
    }
    
    throw error;
  }
);

export const apiService = {
  // Health check
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },

  // Transcribe audio file
  async transcribeAudio(audioFile) {
    const formData = new FormData();
    formData.append('file', audioFile);
    
    const response = await api.post('/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  // Recognize intent from text
  async recognizeIntent(text) {
    const response = await api.post('/recognize-intent', { text });
    return response.data;
  },

  // Generate resolution
  async generateResolution(content, intent) {
    const response = await api.post('/generate-resolution', { content, intent });
    return response.data;
  },

  // Full analysis (transcription + intent + resolution)
  async fullAnalysis(audioFile) {
    const formData = new FormData();
    formData.append('file', audioFile);
    
    const response = await api.post('/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
};

export default api;

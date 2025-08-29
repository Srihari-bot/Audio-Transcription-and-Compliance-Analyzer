import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Mic, Settings, Info, Play, Zap, Brain, FileAudio, Cpu, Activity, ChevronRight } from 'lucide-react';
import AudioUploader from './components/AudioUploader';
import ResultsDisplay from './components/ResultsDisplay';
import StatusPanel from './components/StatusPanel';
import { apiService } from './services/api';
import toast from 'react-hot-toast';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showStatus, setShowStatus] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const processingSteps = [
    { id: 0, name: 'Initialize', icon: Cpu, desc: 'Preparing system...' },
    { id: 1, name: 'Upload', icon: FileAudio, desc: 'Uploading audio file...' },
    { id: 2, name: 'Transcribe', icon: Mic, desc: 'AI transcription in progress...' },
    { id: 3, name: 'Analyze', icon: Brain, desc: 'Analyzing business intent...' },
    { id: 4, name: 'Generate', icon: Zap, desc: 'Generating smart resolution...' },
    { id: 5, name: 'Complete', icon: Activity, desc: 'Analysis complete!' }
  ];

  // Simulate progress updates
  useEffect(() => {
    if (isProcessing && currentStep > 0) {
      const interval = setInterval(() => {
        setProcessingProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 500);
      
      return () => clearInterval(interval);
    } else {
      setProcessingProgress(0);
    }
  }, [isProcessing, currentStep]);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    if (!file) {
      setResults(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Please select an audio file first');
      return;
    }

    setIsProcessing(true);
    setCurrentStep(1);
    setResults(null);

    try {
      // Step 1: Upload
      setCurrentStep(1);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload
      
      // Step 2: Full analysis
      setCurrentStep(2);
      const analysisResult = await apiService.fullAnalysis(selectedFile);
      
      // Step 3: Complete
      setCurrentStep(5);
      setProcessingProgress(100);
      
      setResults(analysisResult);
      
      if (analysisResult.success) {
        toast.success('🚀 Analysis completed successfully!');
      } else {
        toast.error('⚠️ Analysis completed with warnings');
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Analysis failed. Please try again.');
      setResults({
        success: false,
        message: error.message || 'Analysis failed. Please try again.'
      });
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep(0);
        setProcessingProgress(0);
      }, 1500);
    }
  };

  const handleStepByStep = async () => {
    if (!selectedFile) {
      toast.error('Please select an audio file first');
      return;
    }

    setIsProcessing(true);
    setCurrentStep(0);
    setResults(null);

    try {
      // Step 1: Transcription
      setCurrentStep(1);
      const transcriptionResult = await apiService.transcribeAudio(selectedFile);
      
      setResults(prev => ({
        ...prev,
        transcription: transcriptionResult.transcription,
        success: transcriptionResult.success,
        message: transcriptionResult.message
      }));

      // Step 2: Intent Recognition
      setCurrentStep(2);
      const intentResult = await apiService.recognizeIntent(transcriptionResult.transcription);
      
      setResults(prev => ({
        ...prev,
        intent: intentResult.intent
      }));

      // Step 3: Resolution Generation
      setCurrentStep(3);
      const resolutionResult = await apiService.generateResolution(
        transcriptionResult.transcription,
        intentResult.intent
      );

      // Step 4: Complete
      setCurrentStep(4);
      
      setResults(prev => ({
        ...prev,
        resolution: resolutionResult.resolution,
        success: resolutionResult.success,
        message: 'Analysis completed successfully!'
      }));

      toast.success('Step-by-step analysis completed!');
      
    } catch (error) {
      console.error('Step-by-step analysis error:', error);
      toast.error(error.message || 'Analysis failed. Please try again.');
      setResults({
        success: false,
        message: error.message || 'Analysis failed. Please try again.'
      });
    } finally {
      setIsProcessing(false);
      setCurrentStep(0);
    }
  };

  return (
    <div className="min-h-screen animated-bg">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(17, 24, 39, 0.95)',
            color: '#e2e8f0',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            backdropFilter: 'blur(12px)',
          },
        }}
      />

      {/* Cyber Header */}
      <header className="relative z-10 border-b border-gray-700/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl glow-blue">
                  <Mic className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full status-online"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-cyber mb-1">
                  NEURAL ANALYZER
                </h1>
                <p className="text-cyber-secondary text-sm tracking-wider">
                  AI-POWERED BUSINESS INTELLIGENCE SYSTEM
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowStatus(!showStatus)}
                className={`btn-cyber-secondary p-3 ${showStatus ? 'glow-blue' : ''}`}
                title="System Status"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Interface */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Main Processing Area */}
          <div className="xl:col-span-3 space-y-8">
            
            {/* Upload Interface */}
            <div className="card-cyber p-8 fade-in">
              <div className="flex items-center space-x-3 mb-6">
                <FileAudio className="h-6 w-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">
                  AUDIO INPUT MODULE
                </h2>
              </div>
              <AudioUploader 
                onFileSelect={handleFileSelect}
                isProcessing={isProcessing}
              />
            </div>

            {/* Control Panel */}
            {selectedFile && (
              <div className="card-cyber p-8 slide-up">
                <div className="flex items-center space-x-3 mb-6">
                  <Zap className="h-6 w-6 text-purple-400" />
                  <h3 className="text-xl font-bold text-white">
                    NEURAL PROCESSING CONTROLS
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={handleAnalyze}
                    disabled={isProcessing}
                    className="btn-cyber flex items-center justify-center px-8 py-4 text-lg"
                  >
                    <Play className="h-6 w-6 mr-3" />
                    {isProcessing ? 'PROCESSING...' : 'QUANTUM ANALYSIS'}
                  </button>
                  
                  <button
                    onClick={handleStepByStep}
                    disabled={isProcessing}
                    className="btn-cyber-secondary flex items-center justify-center px-8 py-4 text-lg"
                  >
                    <Brain className="h-6 w-6 mr-3" />
                    {isProcessing ? 'PROCESSING...' : 'SEQUENTIAL MODE'}
                  </button>
                </div>
                
                <div className="neon-border p-6 holographic">
                  <div className="flex items-start space-x-3">
                    <Info className="h-6 w-6 text-cyan-400 mt-1" />
                    <div className="text-gray-300">
                      <p className="font-semibold text-white mb-2">PROCESSING MODES:</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <ChevronRight className="h-4 w-4 text-blue-400" />
                          <span><strong className="text-blue-400">QUANTUM:</strong> Complete neural analysis pipeline</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <ChevronRight className="h-4 w-4 text-purple-400" />
                          <span><strong className="text-purple-400">SEQUENTIAL:</strong> Step-by-step processing with intermediate outputs</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Status Dashboard */}
            {isProcessing && (
              <div className="card-cyber p-8 slide-up">
                <div className="flex items-center space-x-3 mb-6">
                  <Activity className="h-6 w-6 text-green-400" />
                  <h3 className="text-xl font-bold text-white">
                    NEURAL PROCESSING STATUS
                  </h3>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 font-mono text-sm">PROGRESS</span>
                    <span className="text-cyan-400 font-mono text-sm">{Math.round(processingProgress)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${processingProgress}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Processing Steps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {processingSteps.map((step) => {
                    const IconComponent = step.icon;
                    const isActive = step.id === currentStep;
                    const isComplete = step.id < currentStep;
                    
                    return (
                      <div 
                        key={step.id} 
                        className={`
                          p-4 rounded-xl border transition-all duration-300
                          ${isActive 
                            ? 'border-blue-400 bg-blue-500/20 glow-blue' 
                            : isComplete
                              ? 'border-green-400 bg-green-500/20'
                              : 'border-gray-700 bg-gray-800/50'
                          }
                        `}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`
                            w-8 h-8 rounded-lg flex items-center justify-center
                            ${isActive 
                              ? 'bg-blue-500 text-white' 
                              : isComplete
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-700 text-gray-400'
                            }
                          `}>
                            {isComplete ? (
                              <Activity className="h-4 w-4" />
                            ) : (
                              <IconComponent className="h-4 w-4" />
                            )}
                          </div>
                          <span className={`
                            font-semibold text-sm
                            ${isActive ? 'text-blue-400' : isComplete ? 'text-green-400' : 'text-gray-500'}
                          `}>
                            {step.name.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono">
                          {isActive ? step.desc : isComplete ? 'Completed' : 'Pending'}
                        </p>
                        {isActive && (
                          <div className="mt-2 flex space-x-1">
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Results Display */}
            <ResultsDisplay 
              results={results} 
              isLoading={isProcessing}
            />
          </div>

          {/* Side Panel */}
          <div className="space-y-8">
            
            {/* System Status */}
            {showStatus && (
              <div className="fade-in">
                <StatusPanel />
              </div>
            )}
            
            {/* How It Works */}
            <div className="card-cyber p-6 fade-in">
              <div className="flex items-center space-x-3 mb-6">
                <Info className="h-6 w-6 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">
                  SYSTEM OVERVIEW
                </h3>
              </div>
              <div className="space-y-4 text-sm text-gray-300">
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-blue-400 mb-2">NEURAL TRANSCRIPTION</h4>
                  <p>Advanced Whisper AI converts audio to high-precision text using deep learning algorithms.</p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-purple-400 mb-2">INTENT ANALYSIS</h4>
                  <p>Machine learning models identify business context and compliance requirements.</p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-cyan-400 mb-2">SMART RESOLUTION</h4>
                  <p>AI-generated actionable solutions tailored to your specific business needs.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Cyber Footer */}
      <footer className="relative z-10 border-t border-gray-700/50 backdrop-blur-xl mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="text-center">
            <p className="text-gray-400 font-mono text-sm">
              POWERED BY <span className="text-cyber">REACT</span> • <span className="text-cyber">FASTAPI</span> • <span className="text-cyber">IBM WATSONX</span>
            </p>
            <p className="text-gray-500 text-xs mt-1">
              DESIGNED FOR BUSINESS ANALYSTS • VERSION 2.1.0
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

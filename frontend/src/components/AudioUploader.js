import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';

const AudioUploader = ({ onFileSelect, isProcessing = false }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      toast.error('Please upload only MP3 files');
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size should be less than 50MB');
        return;
      }

      setSelectedFile(file);
      
      // Create audio URL for preview
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      
      // Notify parent component
      onFileSelect(file);
      
      toast.success('Audio file uploaded successfully');
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mp3': ['.mp3'],
      'audio/mpeg': ['.mp3']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  const removeFile = () => {
    setSelectedFile(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setIsPlaying(false);
    onFileSelect(null);
  };

  const togglePlayback = () => {
    if (audioRef) {
      if (isPlaying) {
        audioRef.pause();
      } else {
        audioRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`
            upload-zone p-12 text-center cursor-pointer transition-all duration-300
            ${isDragActive ? 'upload-zone-active scale-105' : 'hover:border-blue-500/50'}
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="relative mb-6">
            <Upload className="mx-auto h-16 w-16 text-blue-400 mb-4" />
            <div className="absolute inset-0 bg-blue-400 rounded-full opacity-20 blur-xl"></div>
          </div>
          <p className="text-2xl font-bold text-white mb-3">
            {isDragActive ? 'RELEASE TO UPLOAD' : 'NEURAL AUDIO INPUT'}
          </p>
          <p className="text-gray-300 mb-4 font-mono text-sm">
            DRAG & DROP AUDIO FILE OR CLICK TO BROWSE
          </p>
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-800/60 rounded-lg border border-gray-600">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400 font-mono">MP3 • MAX 100MB • ENHANCED PROCESSING</span>
          </div>
        </div>
      ) : (
        <div className="card-cyber p-6 neon-border-hover">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex-shrink-0">
                <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                  <File className="h-8 w-8 text-blue-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white truncate mb-1">
                  {selectedFile.name}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-400 font-mono">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>READY</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={removeFile}
              disabled={isProcessing}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-red-400 transition-colors bg-gray-800/50 rounded-lg border border-gray-600 hover:border-red-500/50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Audio Preview */}
          {audioUrl && (
            <div className="mt-6">
              <div className="flex items-center space-x-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <button
                  onClick={togglePlayback}
                  disabled={isProcessing}
                  className="btn-cyber p-3"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </button>
                <div className="flex-1">
                  <audio
                    ref={setAudioRef}
                    src={audioUrl}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onLoadedMetadata={(e) => {
                      const duration = e.target.duration;
                      if (duration && duration !== Infinity) {
                        // Update file info with duration
                      }
                    }}
                    className="w-full h-10 bg-gray-900 rounded-lg"
                    controls
                    style={{
                      filter: 'hue-rotate(200deg) saturate(1.5)',
                      backgroundColor: '#1f2937',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mr-3"></div>
                <span className="text-blue-400 font-mono text-sm">
                  NEURAL PROCESSING IN PROGRESS...
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioUploader;

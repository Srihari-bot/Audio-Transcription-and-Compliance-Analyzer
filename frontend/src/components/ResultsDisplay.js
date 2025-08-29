import React from 'react';
import { CheckCircle, AlertCircle, FileText, Brain, Lightbulb, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const ResultsDisplay = ({ results, isLoading = false }) => {
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const getIntentColor = (intent) => {
    const intentCategory = intent?.split(' ')[0] || '';
    const colors = {
      'GST_REGISTRATION': 'bg-blue-100 text-blue-800',
      'GST_COMPLIANCE': 'bg-green-100 text-green-800',
      'GST_CALCULATION': 'bg-purple-100 text-purple-800',
      'LICENSE_APPLICATION': 'bg-orange-100 text-orange-800',
      'LICENSE_RENEWAL': 'bg-yellow-100 text-yellow-800',
      'LICENSE_COMPLIANCE': 'bg-teal-100 text-teal-800',
      'TAX_FILING': 'bg-indigo-100 text-indigo-800',
      'BUSINESS_SETUP': 'bg-pink-100 text-pink-800',
      'DOCUMENTATION': 'bg-gray-100 text-gray-800',
      'OTHER': 'bg-slate-100 text-slate-800'
    };
    return colors[intentCategory] || colors['OTHER'];
  };

  const formatResolution = (resolution) => {
    // Split resolution into sections and format with markdown-like styling
    const sections = resolution.split('\n\n');
    return sections.map((section, index) => {
      // Check if it's a numbered list or bullet point
      if (section.match(/^\d+\./)) {
        const lines = section.split('\n');
        return (
          <div key={index} className="mb-6">
            {lines.map((line, lineIndex) => (
              <div key={lineIndex} className="mb-3">
                {line.match(/^\d+\./) ? (
                  <div className="font-bold text-cyan-300 text-lg">{line}</div>
                ) : (
                  <div className="ml-6 text-gray-200 leading-relaxed">{line}</div>
                )}
              </div>
            ))}
          </div>
        );
      } else if (section.includes('•') || section.includes('-')) {
        const lines = section.split('\n');
        return (
          <div key={index} className="mb-6">
            {lines.map((line, lineIndex) => (
              <div key={lineIndex} className="mb-2 text-gray-200 leading-relaxed">
                {line}
              </div>
            ))}
          </div>
        );
      } else {
        return (
          <div key={index} className="mb-6 text-gray-200 leading-relaxed text-base">
            {section}
          </div>
        );
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="card-cyber p-8">
          <div className="animate-pulse">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-blue-500/30 rounded-xl mr-4"></div>
              <div className="h-6 bg-gray-700 rounded w-48"></div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
        
        <div className="card-cyber p-8">
          <div className="animate-pulse">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-purple-500/30 rounded-xl mr-4"></div>
              <div className="h-6 bg-gray-700 rounded w-56"></div>
            </div>
            <div className="h-10 bg-gray-700 rounded w-80"></div>
          </div>
        </div>
        
        <div className="card-cyber p-8">
          <div className="animate-pulse">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-cyan-500/30 rounded-xl mr-4"></div>
              <div className="h-6 bg-gray-700 rounded w-52"></div>
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  return (
    <div className="space-y-8 fade-in">
      {/* Success/Error Message */}
      {results.success !== undefined && (
        <div className={`rounded-xl p-6 border ${results.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <div className="flex items-center">
            {results.success ? (
              <CheckCircle className="h-6 w-6 text-green-400 mr-4" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-400 mr-4" />
            )}
            <span className={`font-semibold font-mono ${results.success ? 'text-green-400' : 'text-red-400'}`}>
              {results.message}
            </span>
          </div>
        </div>
      )}

      {/* Transcription Results */}
      {results.transcription && (
        <div className="card-cyber p-8 slide-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <FileText className="h-6 w-6 text-blue-400 mr-3" />
              NEURAL TRANSCRIPTION
            </h3>
            <button
              onClick={() => copyToClipboard(results.transcription, 'Transcription')}
              className="btn-cyber-secondary p-3"
              title="Copy transcription"
            >
              <Copy className="h-5 w-5" />
            </button>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap font-mono text-sm">
              {results.transcription}
            </p>
          </div>
        </div>
      )}

      {/* Intent Recognition */}
      {results.intent && (
        <div className="card-cyber p-8 slide-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <Brain className="h-6 w-6 text-purple-400 mr-3" />
              INTENT ANALYSIS
            </h3>
            <button
              onClick={() => copyToClipboard(results.intent, 'Intent')}
              className="btn-cyber-secondary p-3"
              title="Copy intent"
            >
              <Copy className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-start space-x-4">
            <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 font-mono">
              {results.intent.split(' ')[0] || 'UNKNOWN'}
            </span>
            <p className="text-gray-300 flex-1 leading-relaxed">
              {results.intent.includes(' ') ? results.intent.substring(results.intent.indexOf(' ') + 1) : results.intent}
            </p>
          </div>
        </div>
      )}

      {/* Resolution */}
      {results.resolution && (
        <div className="card-cyber p-8 slide-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <Lightbulb className="h-6 w-6 text-cyan-400 mr-3" />
              SMART RESOLUTION
            </h3>
            <button
              onClick={() => copyToClipboard(results.resolution, 'Resolution')}
              className="btn-cyber-secondary p-3"
              title="Copy resolution"
            >
              <Copy className="h-5 w-5" />
            </button>
          </div>
          <div className="bg-gray-900/80 rounded-xl p-8 border border-gray-600 backdrop-blur-sm">
            <div className="text-gray-100 leading-relaxed space-y-4">
              {formatResolution(results.resolution)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;

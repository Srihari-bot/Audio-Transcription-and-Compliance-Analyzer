import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Server, Database, Cpu, Wifi } from 'lucide-react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

const StatusPanel = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const status = await apiService.healthCheck();
      setHealthStatus(status);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus({
        status: 'unhealthy',
        environment: {
          api_key_configured: false,
          project_id_configured: false,
          model_id_configured: false,
        },
        token_status: {
          has_cached_token: false,
          token_valid: false
        }
      });
      toast.error('Unable to connect to backend server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (isHealthy) => {
    return isHealthy ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (isHealthy) => {
    return isHealthy ? CheckCircle : XCircle;
  };

  const StatusItem = ({ label, isHealthy, icon: Icon = Server, details }) => {
    const StatusIcon = getStatusIcon(isHealthy);
    
    return (
      <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <div className="flex items-center space-x-3">
          <Icon className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-semibold text-white font-mono">{label}</span>
        </div>
        <div className="flex items-center space-x-3">
          {details && (
            <span className="text-xs text-gray-400 font-mono">{details}</span>
          )}
          <StatusIcon className={`h-5 w-5 ${getStatusColor(isHealthy)}`} />
        </div>
      </div>
    );
  };

  return (
    <div className="card-cyber p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center">
          <Server className="h-6 w-6 text-cyan-400 mr-3" />
          SYSTEM STATUS
        </h3>
        <button
          onClick={checkHealth}
          disabled={isLoading}
          className="btn-cyber-secondary p-3"
          title="Refresh status"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {healthStatus ? (
        <div className="space-y-3">
          {/* Overall Status */}
          <StatusItem
            label="Backend Server"
            isHealthy={healthStatus.status === 'healthy'}
            icon={Server}
            details={healthStatus.status}
          />

          {/* Environment Configuration */}
          <StatusItem
            label="API Key"
            isHealthy={healthStatus.environment?.api_key_configured}
            icon={Database}
            details={healthStatus.environment?.api_key_configured ? 'Configured' : 'Missing'}
          />

          <StatusItem
            label="Project ID"
            isHealthy={healthStatus.environment?.project_id_configured}
            icon={Database}
            details={healthStatus.environment?.project_id_configured ? 'Configured' : 'Missing'}
          />

          <StatusItem
            label="Model ID"
            isHealthy={healthStatus.environment?.model_id_configured}
            icon={Cpu}
            details={healthStatus.environment?.model_id_configured ? 'Configured' : 'Missing'}
          />

          {/* Token Status */}
          <StatusItem
            label="Authentication Token"
            isHealthy={healthStatus.token_status?.token_valid}
            icon={Wifi}
            details={
              healthStatus.token_status?.has_cached_token
                ? healthStatus.token_status?.token_valid
                  ? 'Valid'
                  : 'Expired'
                : 'None'
            }
          />

          {/* Last Checked */}
          {lastChecked && (
            <div className="text-xs text-gray-400 text-center mt-6 font-mono">
              LAST SCAN: {lastChecked.toLocaleTimeString()}
            </div>
          )}

          {/* Warnings */}
          {healthStatus.status === 'healthy' && (
            (!healthStatus.environment?.api_key_configured ||
             !healthStatus.environment?.project_id_configured ||
             !healthStatus.environment?.model_id_configured) && (
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <div className="flex items-start">
                  <AlertCircle className="h-6 w-6 text-yellow-400 mr-3 mt-0.5" />
                  <div className="text-sm text-yellow-400">
                    <p className="font-bold font-mono mb-2">CONFIG WARNING</p>
                    <p className="text-gray-300">Some environment variables are missing. Check your .env configuration.</p>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          <span className="ml-3 text-gray-300 font-mono">SCANNING SYSTEMS...</span>
        </div>
      )}
    </div>
  );
};

export default StatusPanel;

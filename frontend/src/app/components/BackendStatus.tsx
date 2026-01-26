import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Server, Cpu, Brain, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { auditorApi, HealthResponse } from '../../services/auditorApi';
import { toast } from 'sonner';

export function BackendStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const healthData = await auditorApi.checkHealth();
      setHealth(healthData);
      setLastChecked(new Date());
      
      if (!healthData.ollama_available) {
        toast.warning('Ollama service not available. AI analysis will not work.');
      }
    } catch (error) {
      console.error('Health check failed:', error);
      toast.error('Cannot connect to backend service');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!health) {
    return (
      <div className="p-4 rounded-xl backdrop-blur-md animate-pulse"
           style={{
             background: 'rgba(26, 31, 46, 0.4)',
             border: '1px solid rgba(255, 255, 255, 0.1)',
           }}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-24"></div>
            <div className="h-3 bg-gray-800 rounded w-32"></div>
          </div>
          <div className="w-4 h-4 bg-gray-700 rounded-full"></div>
        </div>
      </div>
    );
  }

  const isHealthy = health.status === 'healthy';
  const hasGPU = health.gpu_available;
  const hasModels = health.models.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl backdrop-blur-md cursor-pointer hover:opacity-90 transition-opacity"
      style={{
        background: isHealthy 
          ? 'rgba(16, 185, 129, 0.1)' 
          : 'rgba(245, 158, 11, 0.1)',
        border: `1px solid ${isHealthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
      }}
      onClick={checkHealth}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isHealthy ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
            {isHealthy ? (
              <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
            ) : (
              <AlertTriangle className="w-5 h-5" style={{ color: '#F59E0B' }} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#F8FAFC' }}>
                {isHealthy ? 'System Ready' : 'Service Degraded'}
              </span>
              {isChecking && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
                  style={{ color: '#94A3B8' }}
                />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1" style={{ fontSize: '11px', color: '#94A3B8' }}>
                <Cpu className="w-3 h-3" />
                <span>{hasGPU ? 'GPU Ready' : 'CPU Only'}</span>
              </div>
              <div className="flex items-center gap-1" style={{ fontSize: '11px', color: '#94A3B8' }}>
                <Brain className="w-3 h-3" />
                <span>{hasModels ? `${health.models.length} models` : 'No Models'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div style={{ fontSize: '10px', color: '#94A3B8' }}>
            {lastChecked ? `Checked ${lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Never'}
          </div>
          <div style={{ fontSize: '9px', color: '#64748B', marginTop: '2px' }}>
            Click to refresh
          </div>
        </div>
      </div>
    </motion.div>
  );
}
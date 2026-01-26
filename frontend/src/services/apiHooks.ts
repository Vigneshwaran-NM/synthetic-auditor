/**
 * React hooks for Synthetic Auditor API
 */

import { useState, useCallback, useEffect } from 'react';
import { auditorApi, ProcessingResponse, SessionData, HealthResponse } from './auditorApi';
import { toast } from 'sonner';

export function useAuditorApi() {
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = useCallback(async () => {
    try {
      const isAvailable = await auditorApi.checkHealth().then(health => health.ollama_available);
      setIsBackendAvailable(isAvailable);
      
      if (!isAvailable) {
        toast.warning('Backend service is not fully available. Some features may be limited.');
      }
    } catch (err) {
      setIsBackendAvailable(false);
      toast.error('Cannot connect to backend service. Please ensure the API server is running.');
    }
  }, []);

  const processFiles = useCallback(async (
    files: File[],
    companyContext: string,
    minSeverity: string = 'High'
  ): Promise<ProcessingResponse | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await auditorApi.processFiles(files, companyContext, minSeverity);
      
      if (result.status === 'error') {
        throw new Error(result.errors?.join(', ') || 'Processing failed');
      }
      
      toast.success(`Analysis complete: ${result.findings_count} findings processed`);
      return result;
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process files';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateReports = useCallback(async (
    sessionId: string,
    viewType: 'executive' | 'technical' | 'both' = 'both'
  ): Promise<ProcessingResponse | null> => {
    setIsLoading(true);
    
    try {
      const result = await auditorApi.generateReports(sessionId, viewType, 'pdf');
      toast.success('Reports generated successfully');
      return result;
    } catch (err: any) {
      toast.error(`Failed to generate reports: ${err.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const downloadReport = useCallback(async (
    sessionId: string,
    reportType: 'executive' | 'technical' | 'combined',
    filename?: string
  ): Promise<void> => {
    try {
      const blob = await auditorApi.downloadReport(sessionId, reportType);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${reportType}_report_${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${reportType} report`);
    } catch (err: any) {
      toast.error(`Download failed: ${err.message}`);
    }
  }, []);

  const getSessionData = useCallback(async (sessionId: string): Promise<SessionData | null> => {
    try {
      return await auditorApi.getSessionData(sessionId);
    } catch (err: any) {
      toast.error(`Failed to get session data: ${err.message}`);
      return null;
    }
  }, []);

  return {
    isBackendAvailable,
    isLoading,
    error,
    checkBackendHealth,
    processFiles,
    generateReports,
    downloadReport,
    getSessionData,
    clearError: () => setError(null),
  };
}

// Hook for real-time processing updates
export function useProcessingProgress(sessionId?: string) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'parsing' | 'analyzing' | 'generating' | 'complete'>('idle');
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let interval: ReturnType<typeof setInterval> | undefined;

interval = setInterval(() => {
  // health check / polling
}, 5000);

// cleanup
clearInterval(interval);
interval = undefined;

    
    const updateProgress = () => {
      // Simulate progress updates (in real implementation, use WebSockets)
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatus('complete');
          return 100;
        }
        
        const newProgress = prev + Math.random() * 10;
        
        // Update status based on progress
        if (newProgress < 25) setStatus('uploading');
        else if (newProgress < 50) setStatus('parsing');
        else if (newProgress < 80) setStatus('analyzing');
        else setStatus('generating');
        
        return Math.min(newProgress, 100);
      });
    };

    interval = setInterval(updateProgress, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionId]);

  return { progress, status, estimatedTime };
}
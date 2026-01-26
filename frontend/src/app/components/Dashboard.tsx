import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gauge, BrainCircuit, FileText, Settings, ShieldCheck, 
  Upload, Cpu, Activity, CheckCircle, X,
  ChevronRight, ChevronDown, ArrowLeft, Maximize2, Minimize2,
  Database, Search, AlertTriangle, FileCode, ExternalLink,
  Download, Eye, FileArchive, Filter
} from 'lucide-react';
import { auditorApi, validateFile } from '../../services/auditorApi';
import { toast } from 'sonner';
import { useAuditorApi } from '../../services/apiHooks';

export interface Finding {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  evidence: string[];
  description: string;
  businessImpact: string;
  technicalExplanation: string;
  remediation: string[];
  cve?: string;
}

interface DashboardProps {
  onBack?: () => void;
}

export function Dashboard({ onBack }: DashboardProps) {
  const [uploadedFileObjects, setUploadedFileObjects] = useState<File[]>([]);
  const { processFiles, generateReports, downloadReport, isBackendAvailable } = useAuditorApi();
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [companyContext, setCompanyContext] = useState('');
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>(['critical', 'high', 'medium', 'low', 'all']);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [filteredFindings, setFilteredFindings] = useState<Finding[]>([]);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [detailedViewFinding, setDetailedViewFinding] = useState<Finding | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [showExecutivePreview, setShowExecutivePreview] = useState(false);
  const [showTechnicalPreview, setShowTechnicalPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter findings based on selected severities
  useEffect(() => {
    if (findings.length > 0) {
      let filtered;
      if (selectedSeverities.includes('all') || selectedSeverities.length === 5) {
        // Show all findings if "all" is selected or all severities are selected
        filtered = findings;
      } else {
        // Filter based on selected severities
        filtered = findings.filter(finding => 
          selectedSeverities.includes(finding.severity)
        );
      }
      setFilteredFindings(filtered);
    }
  }, [findings, selectedSeverities]);

  useEffect(() => {
  // Check if there's a recent session in localStorage
  const savedSession = localStorage.getItem('last_session');
  const savedSessionTime = localStorage.getItem('last_session_time');
  
  if (savedSession && savedSessionTime) {
    const sessionTime = new Date(savedSessionTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - sessionTime.getTime()) / (1000 * 60 * 60);
    
    // Load session if it's less than 24 hours old
    if (hoursDiff < 24) {
      setCurrentSession(savedSession);
      
      // Try to load session data
      fetch(`http://localhost:8000/api/v1/session/${savedSession}/data`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Session not found');
        })
        .then(sessionData => {
          // Convert findings
          if (sessionData.report_data?.findings) {
            const convertedFindings: Finding[] = sessionData.report_data.findings.map((finding: any) => ({
              id: finding.finding_id,
              title: finding.title,
              severity: finding.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
              confidence: finding.trust_score,
              evidence: finding.analysis?.evidence_referenced || [],
              description: finding.description || finding.analysis?.technical_explanation || '',
              businessImpact: finding.analysis?.business_impact || '',
              technicalExplanation: finding.analysis?.technical_explanation || '',
              remediation: Array.isArray(finding.analysis?.remediation_recommendations) 
                ? finding.analysis.remediation_recommendations.map((rec: any) => 
                    typeof rec === 'object' ? Object.values(rec)[0] : rec
                  )
                : [],
              cve: finding.cve_ids?.[0] || undefined,
            }));
            
            setFindings(convertedFindings);
            setFilteredFindings(convertedFindings);
            setAnalysisComplete(true);
          }
        })
        .catch(err => {
          console.log('Could not load previous session:', err);
          localStorage.removeItem('last_session');
          localStorage.removeItem('last_session_time');
        });
    }
  }
}, []);

// Replace the handleDrop function:
const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  
  const files = Array.from(e.dataTransfer.files);
  
  // Validate files
  const { valid, invalid } = validateFiles(files);
  
  if (invalid.length > 0) {
    invalid.forEach(({ file, reason }) => {
      toast.error(`Invalid file: ${file.name} - ${reason}`);
    });
  }
  
  if (valid.length > 0) {
    setUploadedFileObjects(valid);
    setUploadedFiles(valid.map(f => f.name));
    
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  }
};


  const handleFileInputClick = () => {
    // Clear input safely
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

// Replace the handleFileChange function:
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  
  if (files.length > 0) {
    const { valid, invalid } = validateFiles(files);
    
    if (invalid.length > 0) {
      invalid.forEach(({ file, reason }) => {
        toast.error(`Invalid file: ${file.name} - ${reason}`);
      });
    }
    
    if (valid.length > 0) {
      setUploadedFileObjects(valid);
      setUploadedFiles(valid.map(f => f.name));
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
    }
  }
};

// Update the removeFile function:
const removeFile = (index: number, e: React.MouseEvent) => {
  e.stopPropagation();
  
  const newFiles = [...uploadedFileObjects];
  const newFileNames = [...uploadedFiles];
  
  newFiles.splice(index, 1);
  newFileNames.splice(index, 1);
  
  setUploadedFileObjects(newFiles);
  setUploadedFiles(newFileNames);
};

// Update the clearAllFiles function:
const clearAllFiles = () => {
  setUploadedFileObjects([]);
  setUploadedFiles([]);
  
  // Clear file input
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
};

// Update the validateFiles function:
const validateFiles = (files: File[]): { valid: File[]; invalid: { file: File; reason: string }[] } => {
  const valid: File[] = [];
  const invalid: { file: File; reason: string }[] = [];
  
  const allowedExtensions = ['.zip', '.xml', '.json', '.txt', '.log', '.csv', '.pcap', '.nessus'];
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  files.forEach(file => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    // Check extension
    const isExtensionValid = allowedExtensions.includes(extension);
    
    // Check file size
    const isSizeValid = file.size <= maxSize;
    
    if (!isExtensionValid) {
      invalid.push({ 
        file, 
        reason: `Invalid file type. Supported: ${allowedExtensions.join(', ')}` 
      });
    } else if (!isSizeValid) {
      invalid.push({ 
        file, 
        reason: `File too large (${formatBytes(file.size)}). Max size: 100MB` 
      });
    } else {
      valid.push(file);
    }
  });
  
  return { valid, invalid };
};
// Format bytes helper function:
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

  const handleSeveritySelect = (severity: string) => {
    if (severity === 'all') {
      // If "all" is clicked, select all severities including "all"
      setSelectedSeverities(['critical', 'high', 'medium', 'low', 'all']);
    } else {
      setSelectedSeverities(prev => {
        const newSelection = prev.includes(severity)
          ? prev.filter(s => s !== severity && s !== 'all') // Remove "all" if individual severity is deselected
          : [...prev.filter(s => s !== 'all'), severity]; // Remove "all" when selecting individual severity
        
        // If all individual severities are selected, add "all" back
        const individualSeverities = ['critical', 'high', 'medium', 'low'];
        const allSelected = individualSeverities.every(s => newSelection.includes(s));
        return allSelected ? [...newSelection, 'all'] : newSelection;
      });
    }
  };

const startAnalysis = async () => {
  if (uploadedFileObjects.length === 0 || isAnalyzing) {
    toast.error('Please upload files first');
    return;
  }
  
  if (companyContext.trim().length < 20) {
    toast.error('Please provide detailed company context (min 20 characters)');
    return;
  }
  
  setIsAnalyzing(true);
  setAnalysisComplete(false);
  setFindings([]);
  setFilteredFindings([]);
  setExpandedFinding(null);
  setDetailedViewFinding(null);
  setProcessingStep(0);
  setCurrentSession(null);

  try {
    // Step 1: Upload
    setProcessingStep(1);
    toast.info('Uploading files...');
    
    // Step 2: Process
    setProcessingStep(2);
    toast.info('Processing files...');
    
    // Prepare form data
    const formData = new FormData();
    
    // Add files
    uploadedFileObjects.forEach(file => {
      formData.append('files', file);
    });
    
    // Add company context
    formData.append('company_context', companyContext);
    
    // Make API call
    const response = await fetch('http://localhost:8000/api/v1/process', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'no_findings') {
      toast.warning('No High or Critical severity findings found');
      setIsAnalyzing(false);
      setProcessingStep(0);
      return;
    }
    
    if (result.status !== 'completed') {
      throw new Error(`Processing failed: ${result.errors?.join(', ') || 'Unknown error'}`);
    }
    
    setCurrentSession(result.session_id);
    
    // Step 3: AI Analysis
    setProcessingStep(3);
    toast.info('AI analysis in progress...');
    
    // Get session data for detailed findings
    const sessionResponse = await fetch(`http://localhost:8000/api/v1/session/${result.session_id}/data`);
    
    if (!sessionResponse.ok) {
      throw new Error('Failed to fetch session data');
    }
    
    const sessionData = await sessionResponse.json();
    
    // Step 4: Generate Reports
    setProcessingStep(4);
    toast.info('Generating reports...');
    
    // Convert backend findings to frontend format
    if (sessionData.report_data?.findings) {
      const convertedFindings: Finding[] = sessionData.report_data.findings.map((finding: any) => ({
        id: finding.finding_id,
        title: finding.title,
        severity: finding.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
        confidence: finding.trust_score,
        evidence: finding.analysis?.evidence_referenced || [],
        description: finding.description || finding.analysis?.technical_explanation || '',
        businessImpact: finding.analysis?.business_impact || '',
        technicalExplanation: finding.analysis?.technical_explanation || '',
        remediation: Array.isArray(finding.analysis?.remediation_recommendations) 
          ? finding.analysis.remediation_recommendations.map((rec: any) => 
              typeof rec === 'object' ? Object.values(rec)[0] : rec
            )
          : [],
        cve: finding.cve_ids?.[0] || undefined,
      }));
      
      setFindings(convertedFindings);
      setFilteredFindings(convertedFindings);
    }
    
    // Complete
    setIsAnalyzing(false);
    setAnalysisComplete(true);
    setProcessingStep(0);
    
    toast.success(`Analysis complete! Found ${result.findings_count} vulnerabilities.`);
    localStorage.setItem('last_session', result.session_id);
    localStorage.setItem('last_session_time', new Date().toISOString());
    
  } catch (error: any) {
    console.error('Analysis failed:', error);
    setIsAnalyzing(false);
    setAnalysisComplete(false);
    setProcessingStep(0);
    
    toast.error(`Analysis failed: ${error.message}`);
  }
};

  const severityColors = {
    critical: { 
      bg: 'rgba(239, 68, 68, 0.1)', 
      border: 'rgba(239, 68, 68, 0.5)', 
      text: '#EF4444',
      glow: '0 0 15px rgba(239, 68, 68, 0.5)',
      selectedBg: 'rgba(239, 68, 68, 0.2)'
    },
    high: { 
      bg: 'rgba(245, 158, 11, 0.1)', 
      border: 'rgba(245, 158, 11, 0.5)', 
      text: '#F59E0B',
      glow: '0 0 15px rgba(245, 158, 11, 0.5)',
      selectedBg: 'rgba(245, 158, 11, 0.2)'
    },
    medium: { 
      bg: 'rgba(234, 179, 8, 0.1)', 
      border: 'rgba(234, 179, 8, 0.5)', 
      text: '#EAB308',
      glow: '0 0 15px rgba(234, 179, 8, 0.5)',
      selectedBg: 'rgba(234, 179, 8, 0.2)'
    },
    low: { 
      bg: 'rgba(0, 212, 255, 0.1)', 
      border: 'rgba(0, 212, 255, 0.5)', 
      text: '#00D4FF',
      glow: '0 0 15px rgba(0, 212, 255, 0.5)',
      selectedBg: 'rgba(0, 212, 255, 0.2)'
    },
    all: {
      bg: 'rgba(139, 92, 246, 0.1)',
      border: 'rgba(139, 92, 246, 0.5)',
      text: '#8B5CF6',
      glow: '0 0 15px rgba(139, 92, 246, 0.5)',
      selectedBg: 'rgba(139, 92, 246, 0.2)'
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return '#10B981';
    if (confidence >= 70) return '#F59E0B';
    return '#EF4444';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 90) return 'High';
    if (confidence >= 70) return 'Medium';
    return 'Low';
  };

  const toggleFinding = (id: string) => {
    setExpandedFinding(prev => prev === id ? null : id);
  };

const openDetailedView = (finding: Finding, e: React.MouseEvent) => {
  e.stopPropagation();
  setDetailedViewFinding(finding);
  setShowDetailedView(true);
};

  const closeDetailedView = () => {
    setDetailedViewFinding(null);
  };

const handleDownloadReports = async () => {
  if (!currentSession) {
    toast.error('No active session. Please run analysis first.');
    return;
  }
  
  setIsDownloading(true);
  try {
    // Download combined ZIP
    const response = await fetch(`http://localhost:8000/api/v1/reports/${currentSession}/combined?format=pdf`);
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_reports_${currentSession}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Reports downloaded successfully!');
    
  } catch (error: any) {
    toast.error(`Download failed: ${error.message}`);
  } finally {
    setIsDownloading(false);
  }
};

// Update the handleDownloadExecutiveReport function:
const handleDownloadExecutiveReport = async () => {
  if (!currentSession) {
    toast.error('No active session. Please run analysis first.');
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:8000/api/v1/reports/${currentSession}/executive?format=pdf`);
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executive_report_${currentSession}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Executive report downloaded!');
    
  } catch (error: any) {
    toast.error(`Download failed: ${error.message}`);
  }
};

// Update the handleDownloadTechnicalReport function:
const handleDownloadTechnicalReport = async () => {
  if (!currentSession) {
    toast.error('No active session. Please run analysis first.');
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:8000/api/v1/reports/${currentSession}/technical?format=pdf`);
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `technical_report_${currentSession}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Technical report downloaded!');
    
  } catch (error: any) {
    toast.error(`Download failed: ${error.message}`);
  }
};


  const navItems = [
    { id: 'dashboard', icon: Gauge, label: 'Dashboard' }
  ];

  return (
    <div 
      className="min-h-screen flex"
      style={{ 
        background: 'linear-gradient(180deg, #0B0F19 0%, #1A1F2E 100%)',
        fontFamily: 'var(--font-body)',
        color: '#F8FAFC'
      }}
    >
      {/* Sidebar */}
      <motion.div
        initial={{ x: -80 }}
        animate={{ x: 0 }}
        className="w-20 flex flex-col items-center py-6 gap-8 z-10 relative"
        style={{
          background: 'rgba(26, 31, 46, 0.6)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Logo */}
        <div className="p-3 rounded-xl" style={{ background: 'rgba(0, 212, 255, 0.1)' }}>
          <ShieldCheck className="w-8 h-8" style={{ color: '#00D4FF' }} />
        </div>

        {/* Nav Items */}
        <div className="flex-1 flex flex-col gap-4">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(item.id)}
              className="relative p-3 rounded-xl transition-all group"
              style={{
                background: activeTab === item.id ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                border: activeTab === item.id ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
              }}
            >
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
                  style={{ background: 'linear-gradient(180deg, #00D4FF, #8A2BE2)' }}
                />
              )}
              <item.icon 
                className="w-6 h-6" 
                style={{ 
                  color: activeTab === item.id ? '#00D4FF' : '#94A3B8',
                  filter: activeTab === item.id ? 'drop-shadow(0 0 8px rgba(0, 212, 255, 0.5))' : 'none'
                }} 
              />
              
              {/* Tooltip */}
              <div 
                className="absolute left-full ml-4 px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50"
                style={{
                  background: 'rgba(26, 31, 46, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '12px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                }}
              >
                {item.label}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div 
          className="px-8 py-6 flex items-center justify-between backdrop-blur-md"
          style={{
            background: 'rgba(26, 31, 46, 0.6)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div className="flex items-center gap-4">
            {onBack && (
              <motion.button
                whileHover={{ scale: 1.1, x: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="p-2 rounded-lg transition-all"
                style={{
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                }}
              >
                <ArrowLeft className="w-5 h-5" style={{ color: '#00D4FF' }} />
              </motion.button>
            )}
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 500, marginBottom: '4px' }}>
                Security Auditor
              </h2>
              <div className="flex items-center gap-4" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#94A3B8' }}>
                <span style={{ color: '#00D4FF' }}>Session: #A7F3B2</span>
                <span className="opacity-50">•</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                  <span>GPU: Active</span>
                </div>
                <span className="opacity-50">•</span>
                <span>Model: llama3.1:8b</span>
                <span className="opacity-50">•</span>
                <span style={{ color: '#10B981' }}>Offline</span>
              </div>
            </div>
          </div>
          
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #00D4FF, #8A2BE2)' }}>
            <span style={{ fontSize: '16px' }}>👤</span>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".zip,.xml,.json,.pcap,.txt,.csv,.log"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* Confirmation Message */}
            <AnimatePresence>
              {showConfirmation && (
                <motion.div
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl backdrop-blur-md shadow-2xl"
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.5)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6" style={{ color: '#10B981' }} />
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#10B981', marginBottom: '2px' }}>
                        {isDownloading ? 'Downloading Reports...' : 'Reports Downloaded Successfully'}
                      </p>
                      <p style={{ fontSize: '12px', color: '#94A3B8' }}>
                        {isDownloading ? 'Preparing ZIP archive...' : 'security_reports.zip ready'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* File Upload Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={uploadedFiles.length === 0 ? handleFileInputClick : undefined}
              className="relative p-8 rounded-2xl backdrop-blur-md transition-all cursor-pointer group"
              style={{
                background: isDragging ? 'rgba(0, 212, 255, 0.1)' : 'rgba(26, 31, 46, 0.4)',
                border: `2px dashed ${isDragging ? 'rgba(0, 212, 255, 0.8)' : 'rgba(0, 212, 255, 0.3)'}`,
              }}
            >
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: '#00D4FF' }} />
                <p style={{ fontSize: '18px', marginBottom: '8px' }}>
                  {uploadedFiles.length === 0 ? 'Drag & Drop or Click to Upload Vulnerability Scans' : 'Drag & Drop or Click to Upload More Files'}
                </p>
                <p className="text-xs text-slate-400 mt-2">
  Supports vulnerability scans, logs, and evidence files
</p>
              </div>

              {uploadedFiles.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#94A3B8' }}>
                      Uploaded Files ({uploadedFiles.length})
                    </span>
                    {uploadedFiles.length > 0 && (
                      <button
                        onClick={clearAllFiles}
                        className="text-xs px-3 py-1 rounded-lg hover:bg-red-500/20 transition-colors"
                        style={{
                          color: '#EF4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          background: 'rgba(239, 68, 68, 0.1)'
                        }}
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {uploadedFiles.map((file, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 group relative"
                        style={{
                          background: 'rgba(0, 212, 255, 0.1)',
                          border: '1px solid rgba(0, 212, 255, 0.3)',
                          fontSize: '13px'
                        }}
                      >
                        <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file}
                        </span>
                        
                        {/* X button to remove file */}
                        <button
                          onClick={(e) => removeFile(index, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-500/20 ml-2"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            minWidth: '24px',
                            minHeight: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <X className="w-3 h-3" style={{ color: '#EF4444' }} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Company Context Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl backdrop-blur-md"
              style={{
                background: 'rgba(26, 31, 46, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <label 
                  style={{ 
                    fontSize: '12px', 
                    letterSpacing: '0.1em',
                    color: '#00D4FF',
                    fontWeight: 500
                  }}
                >
                  ORGANIZATION PROFILE
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Context applied to analysis</span>
                </div>
              </div>
              <textarea
                value={companyContext}
                onChange={(e) => setCompanyContext(e.target.value)}
                placeholder="Describe your infrastructure, compliance needs, and business context..."
                className="w-full bg-transparent border rounded-xl p-4 resize-none focus:outline-none focus:border-cyan-500 transition-colors"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#F8FAFC',
                  minHeight: '120px',
                  fontFamily: 'var(--font-body)'
                }}
                maxLength={500}
              />
              <div className="mt-2 flex items-center justify-end gap-2" style={{ fontSize: '12px', color: '#94A3B8' }}>
                <span>{companyContext.length}/500</span>
                <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: `${(companyContext.length / 500) * 100}%`,
                      background: 'linear-gradient(90deg, #00D4FF, #8A2BE2)'
                    }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Severity Filter - Full Width */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl backdrop-blur-md"
              style={{
                background: 'rgba(26, 31, 46, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Filter className="w-5 h-5" style={{ color: '#00D4FF' }} />
                  <label className="block" style={{ fontSize: '16px', fontWeight: 500 }}>
                    Severity Filter
                  </label>
                </div>
                <span style={{ fontSize: '14px', color: '#94A3B8' }}>
                  Showing {filteredFindings.length} of {findings.length} findings
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['critical', 'high', 'medium', 'low', 'all'].map((severity) => {
                  const isSelected = selectedSeverities.includes(severity);
                  const color = severityColors[severity as keyof typeof severityColors];
                  
                  return (
                    <motion.button
                      key={severity}
                      onClick={() => handleSeveritySelect(severity)}
                      className="px-6 py-4 rounded-xl transition-all capitalize flex flex-col items-center gap-2"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        background: isSelected ? color.selectedBg : 'rgba(255, 255, 255, 0.05)',
                        border: `2px solid ${isSelected ? color.border : 'rgba(255, 255, 255, 0.1)'}`,
                        color: isSelected ? color.text : '#94A3B8',
                        fontSize: '14px',
                        boxShadow: isSelected ? color.glow : 'none',
                        transform: isSelected ? 'translateY(-2px)' : 'none'
                      }}
                    >
                      <span className="text-lg font-semibold">
                        {severity === 'all' ? 'All' : severity.charAt(0).toUpperCase() + severity.slice(1)}
                      </span>
                      <span style={{ fontSize: '12px', opacity: 0.8 }}>
                        {severity === 'all' 
                          ? findings.length 
                          : findings.filter(f => f.severity === severity).length
                        } findings
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedSeverities.map(severity => (
                  severity !== 'all' && (
                    <span 
                      key={severity}
                      className="px-3 py-1 rounded-full text-xs capitalize"
                      style={{
                        background: severityColors[severity as keyof typeof severityColors].bg,
                        color: severityColors[severity as keyof typeof severityColors].text,
                        border: `1px solid ${severityColors[severity as keyof typeof severityColors].border}`,
                      }}
                    >
                      {severity}
                    </span>
                  )
                ))}
              </div>
            </motion.div>

            {/* Start Analysis Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startAnalysis}
              disabled={uploadedFiles.length === 0 || isAnalyzing}
              className="w-full py-4 rounded-xl transition-all relative overflow-hidden group"
              style={{
                background: uploadedFiles.length === 0 ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #00D4FF 0%, #8A2BE2 100%)',
                opacity: uploadedFiles.length === 0 ? 0.5 : 1,
                cursor: uploadedFiles.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 500,
                border: 'none'
              }}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Activity className="w-5 h-5" />
                  </motion.div>
                  Analyzing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <BrainCircuit className="w-5 h-5" />
                  Start AI Analysis
                </span>
              )}
            </motion.button>

            {/* Processing Visualization */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-6 rounded-2xl backdrop-blur-md overflow-hidden"
                  style={{
                    background: 'rgba(26, 31, 46, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <h4 className="text-center mb-6" style={{ fontSize: '16px', fontWeight: 500, color: '#00D4FF' }}>
                    Processing Pipeline
                  </h4>
                  <div className="flex items-center justify-between max-w-3xl mx-auto">
                    {[
                      { label: 'Upload', icon: Upload, color: '#00D4FF', active: processingStep >= 1 },
                      { label: 'Parse', icon: Settings, color: '#8A2BE2', active: processingStep >= 2 },
                      { label: 'AI Analyze', icon: BrainCircuit, color: '#00D4FF', active: processingStep >= 3 },
                      { label: 'Generate', icon: FileText, color: '#10B981', active: processingStep >= 4 }
                    ].map((step, index) => (
                      <React.Fragment key={index}>
                        <div className="flex flex-col items-center gap-2">
                          <motion.div
                            animate={step.active ? {
                              scale: [1, 1.1, 1],
                              boxShadow: `0 0 20px ${step.color}`
                            } : {}}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="p-4 rounded-full transition-all"
                            style={{
                              background: step.active ? `${step.color}20` : 'rgba(255, 255, 255, 0.05)',
                              border: `2px solid ${step.active ? step.color : 'rgba(255, 255, 255, 0.1)'}`,
                              opacity: step.active ? 1 : 0.5
                            }}
                          >
                            <step.icon className="w-6 h-6" style={{ color: step.active ? step.color : '#94A3B8' }} />
                          </motion.div>
                          <span style={{ 
                            fontSize: '12px', 
                            color: step.active ? step.color : '#94A3B8',
                            fontWeight: step.active ? 500 : 400 
                          }}>
                            {step.label}
                          </span>
                        </div>
                        {index < 3 && (
                          <div className="flex-1 h-0.5 mx-4 relative overflow-hidden">
                            <div className="absolute inset-0" style={{ background: 'rgba(255, 255, 255, 0.1)' }} />
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: processingStep > index ? '100%' : '0%' }}
                              transition={{ duration: 0.5 }}
                              className="absolute inset-0"
                              style={{ background: 'linear-gradient(90deg, #00D4FF, #8A2BE2)' }}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Findings Display - Only shows after analysis */}
            <AnimatePresence>
              {analysisComplete && filteredFindings.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 style={{ fontSize: '20px', fontWeight: 500 }}>
                      Vulnerability Findings ({filteredFindings.length})
                    </h3>
                    <div className="flex items-center gap-2" style={{ fontSize: '12px', color: '#94A3B8' }}>
                      <span>Filter: </span>
                      {selectedSeverities.includes('all') ? (
                        <span className="px-2 py-1 rounded" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}>
                          All Severities
                        </span>
                      ) : (
                        selectedSeverities.map(severity => (
                          <span 
                            key={severity}
                            className="px-2 py-1 rounded capitalize"
                            style={{
                              background: severityColors[severity as keyof typeof severityColors].bg,
                              color: severityColors[severity as keyof typeof severityColors].text,
                              fontSize: '10px'
                            }}
                          >
                            {severity}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {filteredFindings.map((finding, index) => {
                    const isExpanded = expandedFinding === finding.id;
                    const color = severityColors[finding.severity];
                    
                    return (
                      <motion.div
                        key={finding.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -2 }}
                        className="p-6 rounded-2xl backdrop-blur-md cursor-pointer"
                        style={{
                          background: 'rgba(26, 31, 46, 0.4)',
                          border: `1px solid ${color.border}`,
                        }}
                        onClick={() => toggleFinding(finding.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span 
                                className="px-3 py-1 rounded-full text-xs uppercase font-bold"
                                style={{
                                  background: color.bg,
                                  color: color.text,
                                  border: `1px solid ${color.border}`,
                                  fontFamily: 'var(--font-mono)'
                                }}
                              >
                                {finding.severity}
                              </span>
                              <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                                ID: {finding.id}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center relative">
                                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                                    <circle
                                      cx="16"
                                      cy="16"
                                      r="14"
                                      fill="none"
                                      stroke={getConfidenceColor(finding.confidence)}
                                      strokeWidth="2"
                                      strokeDasharray={`${(finding.confidence / 100) * 87.96}, 87.96`}
                                    />
                                  </svg>
                                  <span style={{ 
                                    fontSize: '10px', 
                                    color: getConfidenceColor(finding.confidence),
                                    fontFamily: 'var(--font-mono)'
                                  }}>
                                    {finding.confidence}%
                                  </span>
                                </div>
                                <span style={{ 
                                  fontSize: '10px', 
                                  color: getConfidenceColor(finding.confidence),
                                  fontFamily: 'var(--font-mono)'
                                }}>
                                  {getConfidenceLabel(finding.confidence)} Confidence
                                </span>
                              </div>
                            </div>
                            
                            <h4 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
                              {finding.title}
                            </h4>
                            
                            <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' }}>
                              {finding.description}
                            </p>

                            {/* Expandable Content */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden space-y-4 pt-4 border-t"
                                  style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
                                >
                                  <div>
                                    <span style={{ fontSize: '12px', color: '#00D4FF', fontWeight: 500 }}>EVIDENCE:</span>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {finding.evidence.map((evidence, i) => (
                                        <span
                                          key={i}
                                          className="px-3 py-1 rounded text-xs"
                                          style={{
                                            background: 'rgba(138, 43, 226, 0.1)',
                                            border: '1px solid rgba(138, 43, 226, 0.3)',
                                            color: '#8A2BE2',
                                            fontFamily: 'var(--font-mono)'
                                          }}
                                        >
                                          {evidence}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Detailed View Button */}
                                  <div className="flex justify-end">
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={(e) => openDetailedView(finding, e)}
                                      className="px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                                      style={{
                                        background: 'rgba(0, 212, 255, 0.1)',
                                        border: '1px solid rgba(0, 212, 255, 0.3)',
                                        color: '#00D4FF'
                                      }}
                                    >
                                      <Maximize2 className="w-4 h-4" />
                                      View Detailed Report
                                    </motion.button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                              {isExpanded ? 'Collapse' : 'Expand'}
                            </span>
                            <motion.div
                              animate={{ rotate: isExpanded ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronRight className="w-5 h-5" style={{ color: '#94A3B8' }} />
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Report Generation - Only shows after analysis */}
            <AnimatePresence>
              {analysisComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 style={{ fontSize: '20px', fontWeight: 500 }}>
                      Generated Reports
                    </h3>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDownloadReports}
                      className="px-6 py-2 rounded-lg flex items-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      {isDownloading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Activity className="w-4 h-4" />
                          </motion.div>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Download All as ZIP
                        </>
                      )}
                    </motion.button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Executive Report */}
                    <motion.div
                      whileHover={{ y: -4 }}
                      className="p-6 rounded-2xl backdrop-blur-md cursor-pointer group relative"
                      style={{
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
                        border: '1px solid rgba(102, 126, 234, 0.3)',
                      }}
                    >
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowExecutivePreview(true);
                          }}
                          className="p-2 rounded-lg"
                          style={{
                            background: 'rgba(102, 126, 234, 0.2)',
                            border: '1px solid rgba(102, 126, 234, 0.3)',
                            color: '#667eea'
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </motion.button>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(102, 126, 234, 0.2)' }}>
                          <FileText className="w-6 h-6" style={{ color: '#667eea' }} />
                        </div>
                        <div className="flex-1">
                          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#667eea' }}>
                            Executive Report
                          </h4>
                          <p style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '12px', lineHeight: '1.6' }}>
                            High-level business impact analysis, risk prioritization, and compliance summary for executives and stakeholders.
                          </p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Format:</span>
                              <span style={{ fontSize: '12px', color: '#667eea', fontFamily: 'var(--font-mono)' }}>PDF Document</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Size:</span>
                              <span style={{ fontSize: '12px', color: '#667eea', fontFamily: 'var(--font-mono)' }}>2.4 MB</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Generated:</span>
                              <span style={{ fontSize: '12px', color: '#667eea', fontFamily: 'var(--font-mono)' }}>Just now</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Technical Report */}
                    <motion.div
                      whileHover={{ y: -4 }}
                      className="p-6 rounded-2xl backdrop-blur-md cursor-pointer group relative"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 136, 204, 0.1))',
                        border: '1px solid rgba(0, 212, 255, 0.3)',
                      }}
                    >
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTechnicalPreview(true);
                          }}
                          className="p-2 rounded-lg"
                          style={{
                            background: 'rgba(0, 212, 255, 0.2)',
                            border: '1px solid rgba(0, 212, 255, 0.3)',
                            color: '#00D4FF'
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </motion.button>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(0, 212, 255, 0.2)' }}>
                          <FileText className="w-6 h-6" style={{ color: '#00D4FF' }} />
                        </div>
                        <div className="flex-1">
                          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#00D4FF' }}>
                            Technical Report
                          </h4>
                          <p style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '12px', lineHeight: '1.6' }}>
                            Detailed findings with remediation guidance, code snippets, and evidence trail for technical teams.
                          </p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Format:</span>
                              <span style={{ fontSize: '12px', color: '#00D4FF', fontFamily: 'var(--font-mono)' }}>PDF Document</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Size:</span>
                              <span style={{ fontSize: '12px', color: '#00D4FF', fontFamily: 'var(--font-mono)' }}>4.8 MB</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Generated:</span>
                              <span style={{ fontSize: '12px', color: '#00D4FF', fontFamily: 'var(--font-mono)' }}>Just now</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Detailed Finding Modal */}
        <AnimatePresence>
          {detailedViewFinding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)' }}
              onClick={closeDetailedView}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl p-8"
                style={{
                  background: 'linear-gradient(135deg, #0B0F19, #1A1F2E)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={closeDetailedView}
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <X className="w-5 h-5" style={{ color: '#EF4444' }} />
                </button>

                <div className="space-y-6">
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
                      {detailedViewFinding.title}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span 
                        className="px-3 py-1 rounded-full text-sm uppercase font-bold"
                        style={{
                          background: severityColors[detailedViewFinding.severity].bg,
                          color: severityColors[detailedViewFinding.severity].text,
                          border: `1px solid ${severityColors[detailedViewFinding.severity].border}`,
                        }}
                      >
                        {detailedViewFinding.severity}
                      </span>
                      <span style={{ fontSize: '14px', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                        ID: {detailedViewFinding.id}
                      </span>
                      {detailedViewFinding.cve && (
                        <span style={{ fontSize: '14px', color: '#8A2BE2', fontFamily: 'var(--font-mono)' }}>
                          {detailedViewFinding.cve}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#00D4FF', marginBottom: '12px' }}>
                        Business Impact
                      </h3>
                      <p style={{ color: '#F8FAFC', fontSize: '14px', lineHeight: '1.6' }}>
                        {detailedViewFinding.businessImpact}
                      </p>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#00D4FF', marginBottom: '12px' }}>
                        Technical Explanation
                      </h3>
                      <p style={{ color: '#F8FAFC', fontSize: '14px', lineHeight: '1.6' }}>
                        {detailedViewFinding.technicalExplanation}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#00D4FF', marginBottom: '12px' }}>
                      Remediation Steps
                    </h3>
                    <ul className="space-y-3">
                      {detailedViewFinding.remediation.map((step, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center mt-0.5" 
                               style={{ background: 'rgba(0, 212, 255, 0.1)', color: '#00D4FF' }}>
                            {index + 1}
                          </div>
                          <span style={{ color: '#F8FAFC', fontSize: '14px', lineHeight: '1.6' }}>
                            {step}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#00D4FF', marginBottom: '12px' }}>
                      Evidence Trail
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {detailedViewFinding.evidence.map((evidence, i) => (
                        <div
                          key={i}
                          className="px-4 py-2 rounded-lg flex items-center gap-2"
                          style={{
                            background: 'rgba(138, 43, 226, 0.1)',
                            border: '1px solid rgba(138, 43, 226, 0.3)',
                            fontFamily: 'var(--font-mono)'
                          }}
                        >
                          <FileCode className="w-4 h-4" style={{ color: '#8A2BE2' }} />
                          <span style={{ color: '#8A2BE2' }}>{evidence}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center relative">
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                              <circle
                                cx="20"
                                cy="20"
                                r="18"
                                fill="none"
                                stroke={getConfidenceColor(detailedViewFinding.confidence)}
                                strokeWidth="2"
                                strokeDasharray={`${(detailedViewFinding.confidence / 100) * 113.1}, 113.1`}
                              />
                            </svg>
                            <span style={{ 
                              fontSize: '12px', 
                              color: getConfidenceColor(detailedViewFinding.confidence),
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {detailedViewFinding.confidence}%
                            </span>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Confidence</div>
                            <div style={{ 
                              fontSize: '14px', 
                              fontWeight: 500,
                              color: getConfidenceColor(detailedViewFinding.confidence)
                            }}>
                              {getConfidenceLabel(detailedViewFinding.confidence)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={closeDetailedView}
                        className="px-6 py-3 rounded-lg font-medium"
                        style={{
                          background: 'linear-gradient(135deg, #00D4FF, #8A2BE2)',
                          color: '#FFFFFF'
                        }}
                      >
                        Close Report
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Preview Modals */}
        <AnimatePresence>
          {showExecutivePreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)' }}
              onClick={() => setShowExecutivePreview(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl p-8"
                style={{
                  background: 'linear-gradient(135deg, #0B0F19, #1A1F2E)',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowExecutivePreview(false)}
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <X className="w-5 h-5" style={{ color: '#EF4444' }} />
                </button>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(102, 126, 234, 0.2)' }}>
                      <FileText className="w-8 h-8" style={{ color: '#667eea' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#667eea' }}>
                        Executive Report Preview
                      </h2>
                      <p style={{ fontSize: '14px', color: '#94A3B8' }}>
                        Business Impact Analysis & Risk Prioritization
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-xl p-6" style={{ borderColor: 'rgba(102, 126, 234, 0.3)', background: 'rgba(102, 126, 234, 0.05)' }}>
                    <div className="space-y-4">
                      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#667eea' }}>
                        Security Assessment Summary
                      </h3>
                      <p style={{ color: '#F8FAFC', fontSize: '14px', lineHeight: '1.6' }}>
                        This executive report provides a high-level overview of security vulnerabilities identified during the assessment. 
                        It focuses on business impact, risk prioritization, and recommended actions for stakeholders.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-4 rounded-lg" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                          <div style={{ fontSize: '12px', color: '#94A3B8' }}>Critical Findings</div>
                          <div style={{ fontSize: '24px', fontWeight: 600, color: '#EF4444' }}>
                            {findings.filter(f => f.severity === 'critical').length}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                          <div style={{ fontSize: '12px', color: '#94A3B8' }}>Total Findings</div>
                          <div style={{ fontSize: '24px', fontWeight: 600, color: '#667eea' }}>
                            {findings.length}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#667eea', marginBottom: '12px' }}>
                          Key Recommendations
                        </h4>
                        <ul className="space-y-2">
                          <li className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full mt-2" style={{ background: '#667eea' }} />
                            <span style={{ color: '#F8FAFC', fontSize: '14px' }}>
                              Immediate attention required for critical SQL injection vulnerabilities
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full mt-2" style={{ background: '#667eea' }} />
                            <span style={{ color: '#F8FAFC', fontSize: '14px' }}>
                              Renew SSL certificates to prevent data breaches
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full mt-2" style={{ background: '#667eea' }} />
                            <span style={{ color: '#F8FAFC', fontSize: '14px' }}>
                              Implement security headers for enhanced protection
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowExecutivePreview(false)}
                      className="px-6 py-2 rounded-lg font-medium"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#F8FAFC'
                      }}
                    >
                      Close Preview
                    </button>
                    <button
                      onClick={handleDownloadReports}
                      className="px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #667eea, #8B5CF6)',
                        color: '#FFFFFF'
                      }}
                    >
                      <Download className="w-4 h-4" />
                      Download Report
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTechnicalPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)' }}
              onClick={() => setShowTechnicalPreview(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl p-8"
                style={{
                  background: 'linear-gradient(135deg, #0B0F19, #1A1F2E)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowTechnicalPreview(false)}
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <X className="w-5 h-5" style={{ color: '#EF4444' }} />
                </button>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(0, 212, 255, 0.2)' }}>
                      <FileText className="w-8 h-8" style={{ color: '#00D4FF' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#00D4FF' }}>
                        Technical Report Preview
                      </h2>
                      <p style={{ fontSize: '14px', color: '#94A3B8' }}>
                        Detailed Findings with Remediation Guidance
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-xl p-6" style={{ borderColor: 'rgba(0, 212, 255, 0.3)', background: 'rgba(0, 212, 255, 0.05)' }}>
                    <div className="space-y-4">
                      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#00D4FF' }}>
                        Technical Vulnerability Details
                      </h3>
                      <p style={{ color: '#F8FAFC', fontSize: '14px', lineHeight: '1.6' }}>
                        This technical report provides detailed information about identified vulnerabilities, including code snippets, 
                        remediation steps, and technical explanations for development and security teams.
                      </p>
                      
                      <div className="mt-4 space-y-4">
                        <div className="p-4 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.1)' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#00D4FF', marginBottom: '8px' }}>
                            Sample Vulnerability: SQL Injection
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Affected File:</span>
                              <code style={{ fontSize: '12px', color: '#8A2BE2', fontFamily: 'var(--font-mono)', marginLeft: '8px' }}>
                                auth.php:line 42
                              </code>
                            </div>
                            <div>
                              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Vulnerable Code:</span>
                              <pre style={{ 
                                fontSize: '12px', 
                                color: '#F8FAFC', 
                                fontFamily: 'var(--font-mono)',
                                background: 'rgba(0, 0, 0, 0.3)',
                                padding: '8px',
                                borderRadius: '4px',
                                marginTop: '4px',
                                overflowX: 'auto'
                              }}>
                                {'$query = "SELECT * FROM users WHERE username = \'" . $_POST[\'username\'] . "\'";'}
                              </pre>
                            </div>
                            <div>
                              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Fixed Code:</span>
                              <pre style={{ 
                                fontSize: '12px', 
                                color: '#10B981', 
                                fontFamily: 'var(--font-mono)',
                                background: 'rgba(16, 185, 129, 0.1)',
                                padding: '8px',
                                borderRadius: '4px',
                                marginTop: '4px',
                                overflowX: 'auto'
                              }}>
                                {'$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");\n$stmt->execute([$_POST[\'username\']]);'}
                              </pre>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.1)' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#00D4FF', marginBottom: '8px' }}>
                            Evidence Collection
                          </h4>
                          <div className="space-y-2">
                            {findings[0]?.evidence.map((evidence, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <FileCode className="w-4 h-4" style={{ color: '#8A2BE2' }} />
                                <code style={{ fontSize: '12px', color: '#8A2BE2', fontFamily: 'var(--font-mono)' }}>
                                  {evidence}
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowTechnicalPreview(false)}
                      className="px-6 py-2 rounded-lg font-medium"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#F8FAFC'
                      }}
                    >
                      Close Preview
                    </button>
                    <button
                      onClick={handleDownloadReports}
                      className="px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, #00D4FF, #8A2BE2)',
                        color: '#FFFFFF'
                      }}
                    >
                      <Download className="w-4 h-4" />
                      Download Report
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metrics Bar */}
        {analysisComplete && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="px-8 py-4 backdrop-blur-md"
            style={{
              background: 'rgba(26, 31, 46, 0.8)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-center justify-around max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5" style={{ color: '#00D4FF' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Processing Time</div>
                  <div style={{ fontSize: '16px', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>2.4s</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5" style={{ color: '#8A2BE2' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>GPU Utilization</div>
                  <div style={{ fontSize: '16px', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>78%</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5" style={{ color: '#10B981' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Memory Usage</div>
                  <div style={{ fontSize: '16px', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>4.2GB</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5" style={{ color: '#F59E0B' }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Trust Score</div>
                  <div style={{ fontSize: '16px', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>87%</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <div className="px-8 py-4 text-center" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <p style={{ fontSize: '11px', color: '#64748B', fontFamily: 'var(--font-body)' }}>
            Made by Straw Hat Crew (PEC)
          </p>
        </div>
      </div>
    </div>
  );
}
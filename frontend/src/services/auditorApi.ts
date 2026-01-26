/**
 * Synthetic Auditor API Client
 * Handles all communication with the FastAPI backend
 */

import { Finding } from '../app/components/Dashboard';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

/* ------------------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------------------ */

export interface ProcessingResponse {
  status: 'completed' | 'processing' | 'error' | 'no_findings';
  session_id: string;
  findings_count: number;
  analysis_time: number;
  avg_trust_score: number;
  report_paths?: {
    executive?: string;
    technical?: string;
  };
  errors?: string[];
}

export interface HealthResponse {
  status: string;
  ollama_available: boolean;
  models: string[];
  gpu_available: boolean;
  disk_space_mb: number;
  timestamp: string;
}

export interface SessionData {
  session_id: string;
  created_at: number;
  company_context: string;
  report_data: {
    metadata: any;
    executive_summary: any;
    technical_summary: any;
    findings: any[];
    statistics: any;
  };
  report_paths: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* HELPER */
/* ------------------------------------------------------------------ */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error (${res.status}): ${text}`);
  }

  return res.json();
}

/* ------------------------------------------------------------------ */
/* MAIN API */
/* ------------------------------------------------------------------ */

export const auditorApi = {
  /* ---------------- HEALTH ---------------- */
  async checkHealth(): Promise<HealthResponse> {
    return apiRequest('/health');
  },

  /* ---------------- PROCESS FILES ---------------- */
  async processFiles(
    files: File[],
    companyContext: string,
    minSeverity = 'High'
  ): Promise<ProcessingResponse> {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    form.append('company_context', companyContext);
    form.append('min_severity', minSeverity);

    const res = await fetch(`${API_BASE_URL}/process`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    return res.json();
  },

  /* ---------------- REPORTS ---------------- */
  async generateReports(
    sessionId: string,
    viewType: 'executive' | 'technical' | 'both' = 'both',
    format: 'pdf' | 'md' = 'pdf'
  ): Promise<ProcessingResponse> {
    return apiRequest(`/reports/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ view_type: viewType, format }),
    });
  },

  async downloadReport(
    sessionId: string,
    reportType: 'executive' | 'technical' | 'combined',
    format: 'pdf' = 'pdf'
  ): Promise<Blob> {
    const res = await fetch(
      `${API_BASE_URL}/reports/${sessionId}/${reportType}?format=${format}`
    );

    if (!res.ok) {
      throw new Error(`Download failed (${res.status})`);
    }

    return res.blob();
  },

  /* ---------------- SESSION ---------------- */
  async getSessionData(sessionId: string): Promise<SessionData> {
    return apiRequest(`/session/${sessionId}/data`);
  },

  async listSessions() {
    return apiRequest('/sessions');
  },

  async deleteSession(sessionId: string) {
    return apiRequest(`/session/${sessionId}`, { method: 'DELETE' });
  },

  /* ---------------- FINDING ADAPTER ---------------- */
  convertBackendFinding(b: any): Finding {
    const a = b?.analysis || {};

    return {
      id: b.finding_id,
      title: b.title || 'Untitled Finding',
      severity: (b.severity || 'low').toLowerCase(),
      confidence: typeof b.trust_score === 'number' ? b.trust_score : 0,
      evidence: Array.isArray(a.evidence_referenced) ? a.evidence_referenced : [],
      description: a.technical_explanation || b.description || '',
      businessImpact: a.business_impact || '',
      technicalExplanation: a.technical_explanation || '',
      remediation: Array.isArray(a.remediation_recommendations)
        ? a.remediation_recommendations.map((r: any) =>
            typeof r === 'string'
              ? r
              : r?.action || r?.description || JSON.stringify(r)
          )
        : [],
      cve: Array.isArray(b.cve_ids) ? b.cve_ids[0] : undefined,
    };
  },
};

/* ------------------------------------------------------------------ */
/* ✅ NAMED EXPORTS (THIS FIXES YOUR ERRORS) */
/* ------------------------------------------------------------------ */

export async function checkBackendAvailability(): Promise<boolean> {
  try {
    const health = await auditorApi.checkHealth();
    return health.ollama_available;
  } catch {
    return false;
  }
}

export function validateFile(
  file: File
): { valid: boolean; error?: string } {
  const allowed = ['zip', 'xml', 'json', 'pcap', 'log', 'txt', 'csv'];
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (!ext || !allowed.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file type. Allowed: ${allowed.join(', ')}`,
    };
  }

  if (file.size > 100 * 1024 * 1024) {
    return { valid: false, error: 'File exceeds 100MB limit' };
  }

  return { valid: true };
}

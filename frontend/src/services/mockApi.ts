/**
 * Mock API for development and testing
 */

import { Finding } from '../app/components/Dashboard';

export const mockApi = {
  async processFiles(files: File[], companyContext: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
    
    return {
      status: 'completed',
      session_id: 'MOCK-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      findings_count: 4,
      analysis_time: 2.4,
      avg_trust_score: 85.5,
      errors: [],
    };
  },

  async generateReports(sessionId: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      status: 'reports_generated',
      session_id: sessionId,
      report_paths: {
        executive: '/mock/executive_report.pdf',
        technical: '/mock/technical_report.pdf',
      },
    };
  },

  getMockFindings(companyContext: string): Finding[] {
    return [
      {
        id: 'MOCK-FIND-001',
        title: 'SQL Injection in Authentication Module',
        severity: 'critical' as const,
        confidence: 94,
        evidence: ['EV-MOCK-001', 'EV-MOCK-002'],
        description: 'Unvalidated user input directly concatenated into SQL query.',
        businessImpact: `This vulnerability in ${companyContext} could lead to data breaches affecting customer trust and regulatory compliance.`,
        technicalExplanation: 'Parameterized queries not implemented in login endpoint.',
        remediation: [
          'Implement input validation',
          'Use parameterized queries',
          'Add WAF protection',
        ],
        cve: 'CVE-2023-12345',
      },
      // Add more mock findings...
    ];
  },
};
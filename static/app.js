// Synthetic Auditor Frontend Application
class SyntheticAuditor {
    constructor() {
        this.API_BASE = 'http://localhost:8000/api/v1';
        this.currentSession = null;
        this.currentFiles = [];
        
        this.initEventListeners();
        this.hideLoading();
    }
    
    initEventListeners() {
        // File upload
        document.getElementById('browseBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        const dropZone = document.getElementById('dropZone');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        
        // Analyze button
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.startAnalysis();
        });
        
        // Report buttons
        document.getElementById('executivePdfBtn').addEventListener('click', () => {
            this.downloadReport('executive');
        });
        
        document.getElementById('technicalPdfBtn').addEventListener('click', () => {
            this.downloadReport('technical');
        });
        
        document.getElementById('generateAllBtn').addEventListener('click', () => {
            this.downloadAllReports();
        });
        
        // Update analyze button state when context changes
        document.getElementById('companyContext').addEventListener('input', () => {
            this.updateAnalyzeButton();
        });
    }
    
    handleFiles(files) {
        if (files.length === 0) return;
        
        this.currentFiles = Array.from(files);
        
        // Update UI
        const dropZone = document.getElementById('dropZone');
        const fileList = this.currentFiles.map(f => 
            `<div class="small mb-1"><i class="fas fa-file me-1"></i>${f.name} (${this.formatBytes(f.size)})</div>`
        ).join('');
        
        dropZone.innerHTML = `
            <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
            <p class="mb-2">${this.currentFiles.length} file(s) selected</p>
            ${fileList}
            <button class="btn btn-sm btn-outline-secondary mt-2" onclick="auditor.clearFiles()">
                <i class="fas fa-times me-1"></i>Clear
            </button>
        `;
        
        this.updateStep(1, 'completed');
        this.updateStep(2, 'active');
        this.updateAnalyzeButton();
    }
    
    clearFiles() {
        this.currentFiles = [];
        const dropZone = document.getElementById('dropZone');
        dropZone.innerHTML = `
            <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
            <p class="mb-2">Drop vulnerability scan files here</p>
            <p class="text-muted small mb-3">Supports: ZIP, XML (Nessus), JSON (Burp)</p>
            <button class="btn btn-primary" id="browseBtn">
                <i class="fas fa-folder-open me-2"></i>Browse Files
            </button>
        `;
        // Re-attach event listeners
        document.getElementById('browseBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        this.updateStep(1, 'active');
        this.updateStep(2, '');
        this.updateAnalyzeButton();
    }
    
    updateAnalyzeButton() {
        const hasFiles = this.currentFiles.length > 0;
        const hasContext = document.getElementById('companyContext').value.trim().length > 20;
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        analyzeBtn.disabled = !(hasFiles && hasContext);
    }
    
    async startAnalysis() {
        if (this.currentFiles.length === 0) {
            this.showError('Please select vulnerability scan files');
            return;
        }
        
        const companyContext = document.getElementById('companyContext').value.trim();
        if (companyContext.length < 20) {
            this.showError('Please provide detailed company context (min 20 characters)');
            return;
        }
        
        this.showLoading();
        this.updateStep(2, 'completed');
        this.updateStep(3, 'active');
        
        try {
            // Prepare form data
            const formData = new FormData();
            this.currentFiles.forEach(file => {
                formData.append('files', file);
            });
            formData.append('company_context', companyContext);
            
            // Send to API
            const response = await fetch(`${this.API_BASE}/process`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const result = await response.json();
            this.currentSession = result.session_id;
            
            this.updateStep(3, 'completed');
            this.updateStep(4, 'active');
            
            // Get detailed session data
            await this.fetchSessionData();
            
            this.hideLoading();
            this.showResults(result);
            
        } catch (error) {
            console.error('Analysis failed:', error);
            this.showError(`Analysis failed: ${error.message}`);
            this.hideLoading();
        }
    }
    
    async fetchSessionData() {
        try {
            const response = await fetch(`${this.API_BASE}/session/${this.currentSession}/data`);
            if (response.ok) {
                this.sessionData = await response.json();
            }
        } catch (error) {
            console.warn('Could not fetch session data:', error);
        }
    }
    
    showResults(result) {
        // Update session info
        document.getElementById('sessionInfo').textContent = `Session: ${this.currentSession}`;
        document.getElementById('processingTime').textContent = `Processing time: ${result.analysis_time.toFixed(2)}s`;
        
        // Show statistics cards
        document.getElementById('statsCards').style.display = 'flex';
        
        // Update stats (these would come from detailed session data)
        if (this.sessionData) {
            const stats = this.sessionData.report_data?.statistics || {};
            document.getElementById('totalFindings').textContent = stats.total_findings || 0;
            document.getElementById('criticalCount').textContent = stats.critical_count || 0;
            document.getElementById('highCount').textContent = stats.high_count || 0;
            
            const avgTrust = stats.avg_trust_score || 0;
            document.getElementById('trustIndicator').innerHTML = `<span>${avgTrust.toFixed(1)}%</span>`;
            document.getElementById('trustIndicator').className = `trust-indicator ${this.getTrustClass(avgTrust)}`;
        }
        
        // Show findings section
        document.getElementById('findingsSection').style.display = 'block';
        if (this.sessionData?.report_data?.findings) {
            this.displayFindings(this.sessionData.report_data.findings);
        }
        
        // Show report section
        document.getElementById('reportSection').style.display = 'block';
    }
    
    displayFindings(findings) {
        const findingsList = document.getElementById('findingsList');
        const findingsCount = document.getElementById('findingsCount');
        
        findingsCount.textContent = findings.length;
        
        findingsList.innerHTML = findings.map(finding => `
            <div class="finding-card mb-3 p-3 finding-${finding.severity.toLowerCase()}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <h6 class="fw-bold mb-1">${finding.title}</h6>
                        <div class="d-flex gap-2 align-items-center">
                            <span class="security-badge badge-${finding.severity.toLowerCase()}">
                                <i class="fas fa-exclamation-triangle"></i>
                                ${finding.severity}
                            </span>
                            <span class="small text-muted">ID: ${finding.finding_id}</span>
                            <span class="small text-muted">Trust: ${finding.trust_score}%</span>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="auditor.showFindingDetail('${finding.finding_id}')">
                        <i class="fas fa-expand-alt"></i>
                    </button>
                </div>
                
                <div class="ai-response mb-2">
                    ${finding.analysis?.business_impact?.substring(0, 150) || 'No analysis available'}...
                </div>
                
                <div class="small">
                    <strong>Evidence:</strong>
                    ${(finding.analysis?.evidence_referenced || [])
                        .map(id => `<span class="evidence-tag me-1">${id}</span>`)
                        .join('') || 'None'}
                </div>
            </div>
        `).join('');
    }
    
    showFindingDetail(findingId) {
        if (!this.sessionData?.report_data?.findings) return;
        
        const finding = this.sessionData.report_data.findings.find(f => f.finding_id === findingId);
        if (!finding) return;
        
        // Create modal for detailed view
        const modalHtml = `
            <div class="modal fade" id="findingModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${finding.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Severity:</strong>
                                    <span class="security-badge badge-${finding.severity.toLowerCase()} ms-2">
                                        ${finding.severity}
                                    </span>
                                </div>
                                <div class="col-md-6">
                                    <strong>Confidence:</strong>
                                    <span class="ms-2">${finding.trust_score}% (${finding.confidence_level})</span>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <strong>Business Impact:</strong>
                                <p class="mt-1">${finding.analysis?.business_impact || 'N/A'}</p>
                            </div>
                            
                            <div class="mb-3">
                                <strong>Technical Explanation:</strong>
                                <p class="mt-1">${finding.analysis?.technical_explanation || 'N/A'}</p>
                            </div>
                            
                            <div class="mb-3">
                                <strong>Remediation:</strong>
                                <ul class="mt-1">
                                    ${(finding.analysis?.remediation_recommendations || [])
                                        .map(rec => `<li>${typeof rec === 'object' ? Object.values(rec)[0] : rec}</li>`)
                                        .join('')}
                                </ul>
                            </div>
                            
                            <div class="mb-3">
                                <strong>Evidence References:</strong>
                                <div class="mt-1">
                                    ${(finding.analysis?.evidence_referenced || [])
                                        .map(id => `<span class="evidence-tag me-1 mb-1 d-inline-block">${id}</span>`)
                                        .join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('findingModal');
        if (existingModal) existingModal.remove();
        
        // Add modal to DOM and show it
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('findingModal'));
        modal.show();
    }
    
    async downloadReport(reportType) {
        if (!this.currentSession) return;
        
        try {
            const response = await fetch(
                `${this.API_BASE}/reports/${this.currentSession}/${reportType}?format=pdf`
            );
            
            if (!response.ok) throw new Error('Download failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportType}_report_${this.currentSession}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            this.showError(`Failed to download ${reportType} report: ${error.message}`);
        }
    }
    
    async downloadAllReports() {
        if (!this.currentSession) return;
        
        try {
            // First generate both reports
            const response = await fetch(`${this.API_BASE}/reports/${this.currentSession}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ view_type: 'both', format: 'pdf' })
            });
            
            if (!response.ok) throw new Error('Report generation failed');
            
            // Download combined ZIP
            const zipResponse = await fetch(
                `${this.API_BASE}/reports/${this.currentSession}/combined?format=pdf`
            );
            
            if (!zipResponse.ok) throw new Error('ZIP download failed');
            
            const blob = await zipResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit_reports_${this.currentSession}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            this.showError(`Failed to generate reports: ${error.message}`);
        }
    }
    
    updateStep(stepNumber, state) {
        const step = document.getElementById(`step${stepNumber}`);
        step.className = `step ${state}`;
    }
    
    getTrustClass(score) {
        if (score >= 85) return 'trust-high';
        if (score >= 60) return 'trust-medium';
        return 'trust-low';
    }
    
    showLoading() {
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('statsCards').style.display = 'none';
        document.getElementById('findingsSection').style.display = 'none';
        document.getElementById('reportSection').style.display = 'none';
        document.getElementById('analyzeBtn').disabled = true;
    }
    
    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
    }
    
    showError(message) {
        alert(`Error: ${message}`);
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

// Initialize application
const auditor = new SyntheticAuditor();
window.auditor = auditor; // Make accessible for inline handlers
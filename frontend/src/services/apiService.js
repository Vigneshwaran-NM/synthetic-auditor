// apiService.js
import sessionService from './sessionService';

class ApiService {
    constructor() {
        this.baseURL = '/api/v1';
    }
    
    async analyzeFiles(files) {
        try {
            // Create form data
            const formData = new FormData();
            files.forEach(file => {
                formData.append('files', file);
            });
            
            // Create new session for analysis
            const sessionId = await sessionService.createSession({
                files: files.map(f => f.name),
                timestamp: new Date().toISOString()
            });
            
            // Upload files
            const uploadResponse = await fetch(`${this.baseURL}/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Session-ID': sessionId
                }
            });
            
            // Process analysis
            const analysisResponse = await fetch(`${this.baseURL}/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': sessionId
                },
                body: JSON.stringify({ session_id: sessionId })
            });
            
            return await analysisResponse.json();
            
        } catch (error) {
            console.error('Analysis failed:', error);
            throw error;
        }
    }
    
    async getAnalysisResults(sessionId = null) {
        try {
            return await sessionService.getSessionData(sessionId);
        } catch (error) {
            if (error.message.includes('expired')) {
                // Show user-friendly message
                this.showSessionExpiredMessage();
            }
            throw error;
        }
    }
    
    showSessionExpiredMessage() {
        // Create a modal or notification
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
                <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px;">
                    <h3>Session Expired</h3>
                    <p>Your analysis session has expired after 24 hours. Please upload your files again to start a new analysis.</p>
                    <button onclick="this.parentElement.parentElement.remove(); window.location.reload();" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Start New Analysis
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

export default new ApiService();
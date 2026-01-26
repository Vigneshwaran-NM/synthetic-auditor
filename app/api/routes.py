"""
FastAPI routes for the Synthetic Auditor API.
"""
import shutil
import json
from pathlib import Path
from typing import List, Dict
from datetime import datetime, timedelta
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse

from app.api.models import (
    ProcessingRequest, ProcessingResponse, ReportRequest,
    HealthResponse, ErrorResponse
)
from app.core.evidence import EvidenceRegistry
from app.ingestion.parser import ScanParser
from app.processing.analyzer import VulnerabilityAnalyzer
from app.reporting.generator import ReportGenerator
from app.core.config import config
from app.core.llm_client import LLMClient
from types import MappingProxyType
from enum import Enum

import zipfile
import tempfile
import uuid
import time
import os

router = APIRouter(prefix="/api/v1", tags=["auditor"])

# ======================
# PERSISTENT SESSION STORAGE
# ======================

SESSIONS_DIR = Path("sessions")
SESSIONS_DIR.mkdir(exist_ok=True)
SESSION_EXPIRY_HOURS = 24  # Sessions expire after 24 hours

def get_session_file(session_id: str) -> Path:
    """Get the path to a session file."""
    return SESSIONS_DIR / f"{session_id}.json"

def make_json_safe(obj):
    """
    Recursively convert any Python object into JSON-serializable data.
    Handles custom classes, enums, and mappingproxy objects.
    """
    if obj is None:
        return None

    # Basic JSON types
    if isinstance(obj, (str, int, float, bool)):
        return obj

    # Dict-like
    if isinstance(obj, dict):
        return {str(k): make_json_safe(v) for k, v in obj.items()}

    # mappingproxy (read-only dict)
    if isinstance(obj, MappingProxyType):
        return {str(k): make_json_safe(v) for k, v in obj.items()}

    # List / tuple / set
    if isinstance(obj, (list, tuple, set)):
        return [make_json_safe(v) for v in obj]

    # Enum
    if isinstance(obj, Enum):
        return obj.value

    # Datetime
    if isinstance(obj, datetime):
        return obj.isoformat()

    # Custom object with __dict__
    if hasattr(obj, "__dict__"):
        return make_json_safe(vars(obj))

    # Dataclass
    if hasattr(obj, "__dataclass_fields__"):
        return make_json_safe({f.name: getattr(obj, f.name) for f in obj.__dataclass_fields__.values()})

    # Fallback: string representation
    try:
        return str(obj)
    except:
        return None

def load_session(session_id: str) -> Dict:
    """Load session data from file."""
    session_file = get_session_file(session_id)
    
    if not session_file.exists():
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    try:
        with open(session_file, 'r', encoding='utf-8') as f:
            session_data = json.load(f)
        
        # Check if session is expired
        created_at_str = session_data.get('created_at', '')
        if created_at_str:
            try:
                created_at = datetime.fromisoformat(created_at_str)
                if datetime.now() - created_at > timedelta(hours=SESSION_EXPIRY_HOURS):
                    delete_session(session_id)
                    raise HTTPException(status_code=404, detail="Session expired")
            except:
                pass
        
        return session_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load session: {str(e)}")

def save_session(session_id: str, session_data: Dict):
    """Save session data to file."""
    session_file = get_session_file(session_id)
    
    # Ensure sessions directory exists
    SESSIONS_DIR.mkdir(exist_ok=True)
    
    try:
        # Make data JSON-safe
        safe_data = make_json_safe(session_data)
        
        with open(session_file, 'w', encoding='utf-8') as f:
            json.dump(safe_data, f, indent=2, ensure_ascii=False)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save session: {str(e)}")

def delete_session(session_id: str):
    """Delete session file and cleanup report files."""
    session_file = get_session_file(session_id)
    
    # Try to load session data to get report paths
    if session_file.exists():
        try:
            with open(session_file, 'r', encoding='utf-8') as f:
                session_data = json.load(f)
            
            # Delete report files
            report_paths = session_data.get('report_paths', {})
            for report_path in report_paths.values():
                try:
                    Path(report_path).unlink(missing_ok=True)
                except:
                    pass
        except:
            pass
    
    # Delete session file
    try:
        session_file.unlink(missing_ok=True)
    except:
        pass

def cleanup_expired_sessions():
    """Clean up expired sessions (run periodically)."""
    try:
        for session_file in SESSIONS_DIR.glob("*.json"):
            try:
                with open(session_file, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                
                created_at_str = session_data.get('created_at', '')
                if created_at_str:
                    created_at = datetime.fromisoformat(created_at_str)
                    if datetime.now() - created_at > timedelta(hours=SESSION_EXPIRY_HOURS):
                        delete_session(session_file.stem)
            except:
                continue
    except:
        pass

# ======================
# API ENDPOINTS
# ======================

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check system health and dependencies."""
    import requests

    # Cleanup expired sessions first
    cleanup_expired_sessions()
    
    # Check Ollama via HTTP API
    try:
        resp = requests.get(
            "http://127.0.0.1:11434/api/tags",
            timeout=2
        )
        if resp.status_code == 200:
            data = resp.json()
            models = [m.get("name") for m in data.get("models", [])]
            ollama_available = True
            ollama_operational = True
        else:
            models = []
            ollama_available = False
            ollama_operational = False
    except Exception as e:
        print(f"Ollama health check error: {e}")
        models = []
        ollama_available = False
        ollama_operational = False

    # Check GPU availability
    try:
        import torch
        gpu_available = torch.cuda.is_available()
    except Exception:
        gpu_available = False

    # Check disk space
    try:
        disk_usage = shutil.disk_usage(".")
        disk_space_mb = disk_usage.free / (1024 * 1024)
    except Exception:
        disk_space_mb = 0

    # Determine overall status
    if ollama_available and ollama_operational:
        status = "healthy"
    elif ollama_available:
        status = "degraded"
    else:
        status = "unavailable"

    return HealthResponse(
        status=status,
        ollama_available=ollama_available and ollama_operational,
        models=models,
        gpu_available=gpu_available,
        disk_space_mb=disk_space_mb
    )

@router.post("/process", response_model=ProcessingResponse)
async def process_vulnerability_scans(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description="Vulnerability scan files (ZIP, XML, JSON)"),
    request: ProcessingRequest = None
):
    """
    Process vulnerability scan files and generate analysis.
    
    This endpoint:
    1. Accepts scan files (ZIP, XML, JSON)
    2. Extracts and filters High/Critical findings
    3. Analyzes with local LLM
    4. Stores results in session
    5. Returns session ID for report generation
    """
    if request is None:
        request = ProcessingRequest()
    
    session_id = str(uuid.uuid4())[:8]
    temp_dir = None
    
    try:
        start_time = time.time()
        
        # Create temporary directory for uploaded files
        temp_dir = Path(tempfile.mkdtemp(prefix=f"audit_{session_id}_"))
        
        # Save uploaded files
        saved_files = []
        for file in files:
            if file.filename:
                file_path = temp_dir / file.filename
                with open(file_path, "wb") as f:
                    content = await file.read()
                    f.write(content)
                saved_files.append(file_path)
        
        if not saved_files:
            raise HTTPException(status_code=400, detail="No valid files uploaded")
        
        # Initialize evidence registry and parser
        registry = EvidenceRegistry()
        parser = ScanParser(registry)
        
        # Process each file
        processed_files = []
        for file_path in saved_files:
            if file_path.suffix.lower() == '.zip':
                parser.process_zip(file_path)
                processed_files.append(file_path.name)
            elif file_path.suffix.lower() in ['.xml', '.json']:
                parser._process_file(file_path)
                processed_files.append(file_path.name)
        
        # Check if we found any vulnerabilities
        filtered_findings = registry.get_findings_by_severity()
        if not filtered_findings:
            # Still save an empty session for consistency
            session_data = {
                "session_id": session_id,
                "created_at": datetime.now().isoformat(),
                "company_context": request.company_context,
                "status": "no_findings",
                "findings_count": 0,
                "processed_files": processed_files,
                "report_data": {},
                "report_paths": {}
            }
            save_session(session_id, session_data)
            
            return ProcessingResponse(
                status="no_findings",
                session_id=session_id,
                findings_count=0,
                analysis_time=time.time() - start_time,
                avg_trust_score=0,
                errors=["No High or Critical severity findings found"]
            )
        
        # Analyze with LLM
        analyzer = VulnerabilityAnalyzer(company_context=request.company_context)
        analysis_result = analyzer.analyze_findings(registry)
        
        # Get report data
        report_data = analyzer.get_report_data()
        
        # Generate reports immediately
        generator = ReportGenerator(evidence_registry=registry)
        reports = generator.generate_both_views(report_data, output_format="pdf")
        
        report_paths = {k: str(v) for k, v in reports.items()}
        
        # Store session data
        session_data = {
            "session_id": session_id,
            "created_at": datetime.now().isoformat(),
            "company_context": request.company_context,
            "status": "completed",
            "findings_count": analysis_result["findings_analyzed"],
            "processed_files": processed_files,
            "report_data": report_data,
            "report_paths": report_paths,
            "analysis_result": analysis_result,
            "analysis_time": time.time() - start_time,
            "avg_trust_score": analysis_result.get("avg_trust_score", 0)
        }
        
        save_session(session_id, session_data)
        
        analysis_time = time.time() - start_time
        
        # Cleanup temp files in background
        background_tasks.add_task(cleanup_temp_dir, temp_dir)
        
        return ProcessingResponse(
            status="completed",
            session_id=session_id,
            findings_count=analysis_result["findings_analyzed"],
            analysis_time=analysis_time,
            avg_trust_score=analysis_result.get("avg_trust_score", 0),
            report_paths=report_paths,
            errors=analysis_result.get("errors", [])
        )
        
    except Exception as e:
        # Cleanup on error
        if temp_dir and temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)
        
        # Cleanup session if created
        delete_session(session_id)
        
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )

@router.post("/reports/{session_id}")
async def generate_reports(
    session_id: str,
    report_request: ReportRequest = None
):
    """
    Generate reports from a processing session.
    
    Note: Reports are already generated in /process endpoint,
    but this endpoint allows re-generation if needed.
    """
    if report_request is None:
        report_request = ReportRequest()

    # Load session data
    session_data = load_session(session_id)
    
    if session_data.get("status") == "no_findings":
        raise HTTPException(status_code=400, detail="No findings to generate reports from")
    
    try:
        # If reports already exist, return them
        existing_paths = session_data.get("report_paths", {})
        if existing_paths:
            return ProcessingResponse(
                status="reports_already_generated",
                session_id=session_id,
                findings_count=session_data.get("findings_count", 0),
                analysis_time=0,
                avg_trust_score=session_data.get("avg_trust_score", 0),
                report_paths=existing_paths
            )
        
        # Otherwise, generate new reports (this shouldn't normally happen)
        report_data = session_data.get("report_data", {})
        
        # Note: We can't recreate the registry from saved data,
        # so we'll just return existing paths or error
        raise HTTPException(
            status_code=500,
            detail="Reports not found. Please re-run the analysis."
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Report generation failed: {str(e)}"
        )

@router.get("/reports/{session_id}/{report_type}")
async def download_report(
    session_id: str,
    report_type: str,
    format: str = "pdf"
):
    """
    Download a generated report.
    
    report_type: executive, technical, or combined
    format: pdf or md
    """
    # Load session data
    session_data = load_session(session_id)
    
    report_paths = session_data.get("report_paths", {})
    
    # Handle combined download (zip of both reports)
    if report_type == "combined":
        if not all(rp in report_paths for rp in ["executive", "technical"]):
            raise HTTPException(status_code=404, detail="Both reports not generated")
        
        # Create zip file
        zip_path = Path("reports") / f"audit_reports_{session_id}.zip"
        
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for rp_type, rp_path in report_paths.items():
                rp_path_obj = Path(rp_path)
                if rp_path_obj.exists():
                    zipf.write(
                        rp_path_obj,
                        arcname=rp_path_obj.name
                    )
        
        if not zip_path.exists():
            raise HTTPException(status_code=500, detail="Failed to create ZIP file")
        
        return FileResponse(
            path=zip_path,
            media_type="application/zip",
            filename=zip_path.name,
            headers={
                "Content-Disposition": f'attachment; filename="{zip_path.name}"',
                "X-Content-Type-Options": "nosniff"
            }
        )
    
    # Handle single report download
    if report_type not in report_paths:
        raise HTTPException(status_code=404, detail=f"{report_type} report not found")
    
    report_path = Path(report_paths[report_type])
    
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report file not found")
    
    # Determine media type
    if report_path.suffix.lower() == ".pdf":
        media_type = "application/pdf"
    else:
        media_type = "text/markdown"
    
    return FileResponse(
        path=report_path,
        media_type=media_type,
        filename=report_path.name,
        headers={
            "Content-Disposition": f'attachment; filename="{report_path.name}"',
            "X-Content-Type-Options": "nosniff"
        }
    )

@router.get("/session/{session_id}/data")
async def get_session_data(session_id: str):
    """Get analysis data for a session (JSON format)."""
    session_data = load_session(session_id)
    
    # Return the session data (already in JSON format)
    return JSONResponse(content=session_data)

@router.delete("/session/{session_id}")
async def delete_session_endpoint(session_id: str):
    """Delete a session and cleanup files."""
    delete_session(session_id)
    
    return {"status": "deleted", "session_id": session_id}

@router.get("/sessions")
async def list_sessions():
    """List all active sessions."""
    sessions_list = []
    
    # Cleanup expired sessions first
    cleanup_expired_sessions()
    
    for session_file in SESSIONS_DIR.glob("*.json"):
        try:
            with open(session_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Check if session is expired
            created_at_str = data.get('created_at', '')
            if created_at_str:
                try:
                    created_at = datetime.fromisoformat(created_at_str)
                    if datetime.now() - created_at <= timedelta(hours=SESSION_EXPIRY_HOURS):
                        sessions_list.append({
                            "session_id": session_file.stem,
                            "created_at": created_at_str,
                            "findings_count": data.get("findings_count", 0),
                            "company_context": data.get("company_context", "")[:50] + ("..." if len(data.get("company_context", "")) > 50 else ""),
                            "status": data.get("status", "unknown")
                        })
                except:
                    continue
        except:
            continue
    
    return {"sessions": sessions_list}

@router.post("/session/recover")
async def recover_session(payload: dict):
    """
    Attempt to recover session from client-side data.
    Useful if browser was closed accidentally.
    """
    old_session_id = payload.get("session_id")
    if not old_session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Check if session still exists
    session_file = get_session_file(old_session_id)
    if session_file.exists():
        return {"status": "session_exists", "session_id": old_session_id}
    
    # Check if we have backup data
    session_data = payload.get("session_data")
    if session_data:
        # Create a new session with the recovered data
        new_session_id = str(uuid.uuid4())[:8]
        session_data["session_id"] = new_session_id
        session_data["created_at"] = datetime.now().isoformat()
        session_data["recovered_from"] = old_session_id
        
        save_session(new_session_id, session_data)
        
        return {
            "status": "recovered",
            "old_session_id": old_session_id,
            "new_session_id": new_session_id
        }
    
    raise HTTPException(status_code=404, detail="Session not recoverable")

def cleanup_temp_dir(temp_dir: Path):
    """Background task to cleanup temporary directory."""
    try:
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)
    except:
        pass
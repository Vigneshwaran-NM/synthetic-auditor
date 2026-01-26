"""
Pydantic models for API request/response validation.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime

class ReportView(str, Enum):
    EXECUTIVE = "executive"
    TECHNICAL = "technical"
    BOTH = "both"

class ReportFormat(str, Enum):
    PDF = "pdf"
    MARKDOWN = "md"

class ProcessingRequest(BaseModel):
    """Request model for processing vulnerability scans."""
    company_context: str = Field(
        default="A financial services company handling sensitive customer data.",
        description="Business context for AI analysis"
    )
    min_severity: str = Field(
        default="High",
        description="Minimum severity to process (Critical, High, Medium, Low)"
    )

class ProcessingResponse(BaseModel):
    """Response model for processing status."""
    status: str
    session_id: str
    findings_count: int
    analysis_time: float
    avg_trust_score: float
    report_paths: Optional[Dict[str, str]] = None
    errors: List[str] = Field(default_factory=list)

class ReportRequest(BaseModel):
    """Request model for report generation."""
    view_type: ReportView = Field(default=ReportView.BOTH, description="Report view type")
    format: ReportFormat = Field(default=ReportFormat.PDF, description="Output format")

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    ollama_available: bool
    models: List[str]
    gpu_available: bool
    disk_space_mb: float
    timestamp: datetime = Field(default_factory=datetime.now)

class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    detail: Optional[str] = None
    session_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)
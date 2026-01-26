"""
Configuration and constants for the Synthetic Auditor.
"""
from pydantic_settings import BaseSettings
from enum import Enum

class Severity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    INFO = "Informational"
# Performance and Resource Optimization Settings
# Used across ingestion, analysis, and reporting layers

class PerformanceConfig:
    """
    Performance configuration for Synthetic Auditor.
    Defaults are optimized for accuracy-first, offline LLM analysis.
    """

    # -------------------------------
    # LLM Inference (Ollama / Local)
    # -------------------------------
    LLM_BATCH_SIZE = 1          # One finding at a time (prevents context bleed)
    LLM_MAX_TOKENS = 2000       # Enough for detailed audit explanations
    LLM_TEMPERATURE = 0.3       # Low temperature = consistent, non-hallucinating output

    # -------------------------------
    # Input & Processing Limits
    # -------------------------------
    MAX_CONCURRENT_FILES = 3    # Prevents CPU / RAM exhaustion
    MAX_FILE_SIZE_MB = 100      # Hard limit for uploads
    MAX_FINDINGS_PER_SESSION = 100

    # -------------------------------
    # Caching (Optional, Best-Effort)
    # -------------------------------
    CACHE_RESULTS = True        # Enable analysis caching (if cache backend exists)
    CACHE_TTL_HOURS = 24        # Cache validity window

    # -------------------------------
    # GPU / Runtime Optimization
    # -------------------------------
    CUDA_DEVICE = None          # None = let runtime decide (Docker-safe)
    
    # Note:
    # TORCH_PRECISION applies only if PyTorch models are used.
    # Ollama uses llama.cpp / GGUF and ignores this.
    TORCH_PRECISION = "float16"

    # -------------------------------
    # Housekeeping
    # -------------------------------
    CLEANUP_INTERVAL_MINUTES = 5  # Session / temp file cleanup frequency

class AppConfig(BaseSettings):
    # LLM Settings
    LLM_MODEL: str = "llama3.1:8b"
    LLM_TIMEOUT: int = 120  # seconds
    
    # Processing Settings
    MIN_SEVERITY: Severity = Severity.HIGH  # Process High and Critical only
    EVIDENCE_PREFIX: str = "EV"
    
    # Trust Score Weights (sum = 1.0)
    TRUST_WEIGHTS: dict = {
        "evidence_count": 0.3,
        "has_scanner_output": 0.3,
        "has_cve_data": 0.25,
        "has_corroboration": 0.15
    }
    
    # Paths
    TEMPLATE_DIR: str = "app/reporting/templates"
    OUTPUT_DIR: str = "./reports"
    
    class Config:
        env_file = ".env"

config = AppConfig()
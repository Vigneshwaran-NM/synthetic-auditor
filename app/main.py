"""
FastAPI application entry point.
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html
import os
from pathlib import Path

from app.api.routes import router as api_router
from app.core.config import config

# Create FastAPI app
app = FastAPI(
    title="Synthetic Auditor API",
    description="Offline AI-Powered Vulnerability Analysis System",
    version="1.0.0",
    docs_url=None,  # We'll customize docs
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )

# Mount API routes
app.include_router(api_router)

# Mount static files (for future frontend)
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Custom docs endpoint
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title="Synthetic Auditor API Docs",
        swagger_favicon_url="https://fastapi.tiangolo.com/img/favicon.png"
    )

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Synthetic Auditor API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "offline_guarantee": True
    }

# Create necessary directories
@app.on_event("startup")
async def startup_event():
    """Create necessary directories on startup."""
    Path(config.OUTPUT_DIR).mkdir(exist_ok=True)
    Path("uploads").mkdir(exist_ok=True)
    Path("static").mkdir(exist_ok=True)
    
    print("=" * 60)
    print("SYNTHETIC AUDITOR API STARTED")
    print("=" * 60)
    print(f"API URL: http://localhost:8000")
    print(f"Docs URL: http://localhost:8000/docs")
    print(f"Output Directory: {config.OUTPUT_DIR}")
    print(f"Model: {config.LLM_MODEL}")
    print("=" * 60)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
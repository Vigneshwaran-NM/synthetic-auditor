"""
Command-line interface for Synthetic Auditor.
"""
import argparse
import sys
from pathlib import Path
import webbrowser
from typing import Optional

def run_api():
    """Start the FastAPI server."""
    import uvicorn
    print("Starting Synthetic Auditor API...")
    print("Press Ctrl+C to stop")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

def process_files_cli(zip_path: Path, company_context: str, view: str):
    """Process files via CLI (bypassing API)."""
    from app.core.evidence import EvidenceRegistry
    from app.ingestion.parser import ScanParser
    from app.processing.analyzer import VulnerabilityAnalyzer
    from app.reporting.generator import ReportGenerator
    
    print(f"Processing: {zip_path}")
    print(f"Company Context: {company_context}")
    
    # Process
    registry = EvidenceRegistry()
    parser = ScanParser(registry)
    parser.process_zip(zip_path)
    
    # Analyze
    analyzer = VulnerabilityAnalyzer(company_context=company_context)
    result = analyzer.analyze_findings(registry)
    
    if result["status"] != "completed":
        print(f"Analysis failed: {result}")
        return
    
    # Generate reports
    report_data = analyzer.get_report_data()
    generator = ReportGenerator(evidence_registry=registry)
    
    if view == "both":
        reports = generator.generate_both_views(report_data, output_format="pdf")
        print(f"\nGenerated Reports:")
        for view_type, path in reports.items():
            print(f"  {view_type.title()}: {path}")
    else:
        report = generator.generate_report(report_data, view_type=view, output_format="pdf")
        print(f"\nGenerated Report: {report}")
    
    print("\nDone!")

def main():
    parser = argparse.ArgumentParser(
        description="Synthetic Auditor - Offline AI Vulnerability Analysis",
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # API command
    api_parser = subparsers.add_parser("api", help="Start the API server")
    api_parser.add_argument("--open", action="store_true", help="Open docs in browser")
    
    # Process command
    process_parser = subparsers.add_parser("process", help="Process files directly")
    process_parser.add_argument("zip_file", type=Path, help="Path to ZIP file with scans")
    process_parser.add_argument("--context", type=str, 
                               default="A financial services company",
                               help="Company context for analysis")
    process_parser.add_argument("--view", choices=["executive", "technical", "both"],
                               default="both", help="Report view to generate")
    
    # Health check command
    health_parser = subparsers.add_parser("health", help="Check system health")
    
    args = parser.parse_args()
    
    if args.command == "api":
        if args.open:
            webbrowser.open("http://localhost:8000/docs")
        run_api()
        
    elif args.command == "process":
        if not args.zip_file.exists():
            print(f"Error: File not found: {args.zip_file}")
            sys.exit(1)
        process_files_cli(args.zip_file, args.context, args.view)
        
    elif args.command == "health":
        from app.core.llm_client import LLMClient
        try:
            client = LLMClient()
            print("✓ System healthy")
            print("✓ Ollama connected")
            print("✓ LLM available")
        except Exception as e:
            print(f"✗ Health check failed: {e}")
            
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
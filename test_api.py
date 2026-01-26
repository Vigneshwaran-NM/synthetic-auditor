"""
Test the FastAPI backend.
"""
import sys
from pathlib import Path
import requests
import time
import json

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint."""
    print("Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/api/v1/health")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Health check passed")
        print(f"  Status: {data['status']}")
        print(f"  Ollama: {'✓' if data['ollama_available'] else '✗'}")
        print(f"  GPU: {'✓' if data['gpu_available'] else '✗'}")
        print(f"  Models: {data['models']}")
        return True
    else:
        print(f"✗ Health check failed: {response.status_code}")
        return False

def test_file_processing():
    """Test file upload and processing."""
    print("\nTesting file processing...")
    
    # Create a test ZIP file
    from app.core.evidence import EvidenceRegistry
    from app.ingestion.parser import ScanParser
    
    registry = EvidenceRegistry()
    
    # Create test data directory
    test_dir = Path("test_api_data")
    test_dir.mkdir(exist_ok=True)
    
    # Create test JSON file
    test_json = test_dir / "test_api_scan.json"
    test_json.write_text(json.dumps([
        {
            "name": "API Test SQL Injection",
            "severity": "Critical",
            "description": "Test vulnerability for API",
            "cve": "CVE-2024-99999",
            "evidence": {"url": "https://test.com/login", "parameter": "id"}
        },
        {
            "name": "API Test XSS",
            "severity": "High",
            "description": "Cross-site scripting test",
            "evidence": {"url": "https://test.com/search", "parameter": "q"}
        }
    ]))
    
    # Create ZIP
    import zipfile
    zip_path = test_dir / "test_scans.zip"
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        zipf.write(test_json, arcname="api_test.json")
    
    print(f"Created test ZIP: {zip_path}")
    
    # Upload and process
    files = {'files': ('test_scans.zip', open(zip_path, 'rb'))}
    data = {
        'company_context': 'Test Company - API Testing'
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/process",
        files=files,
        data=data
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Processing successful")
        print(f"  Session ID: {result['session_id']}")
        print(f"  Findings: {result['findings_count']}")
        print(f"  Trust Score: {result['avg_trust_score']}%")
        return result['session_id']
    else:
        print(f"✗ Processing failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return None

def test_report_generation(session_id: str):
    """Test report generation."""
    print(f"\nTesting report generation for session: {session_id}")
    
    # Generate both reports
    data = {
        "view_type": "both",
        "format": "pdf"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/reports/{session_id}",
        json=data
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Report generation successful")
        print(f"  Report paths: {result.get('report_paths', {})}")
        
        # Test download
        for report_type in ['executive', 'technical']:
            if report_type in result.get('report_paths', {}):
                dl_response = requests.get(
                    f"{BASE_URL}/api/v1/reports/{session_id}/{report_type}?format=pdf"
                )
                if dl_response.status_code == 200:
                    print(f"  ✓ {report_type} download works")
                else:
                    print(f"  ✗ {report_type} download failed")
        
        return True
    else:
        print(f"✗ Report generation failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return False

def test_session_management(session_id: str):
    """Test session endpoints."""
    print(f"\nTesting session management...")
    
    # Get session data
    response = requests.get(f"{BASE_URL}/api/v1/session/{session_id}/data")
    if response.status_code == 200:
        print(f"✓ Session data retrieval works")
    
    # List sessions
    response = requests.get(f"{BASE_URL}/api/v1/sessions")
    if response.status_code == 200:
        sessions = response.json().get('sessions', [])
        print(f"✓ Session listing works ({len(sessions)} sessions)")
    
    # Delete session
    response = requests.delete(f"{BASE_URL}/api/v1/session/{session_id}")
    if response.status_code == 200:
        print(f"✓ Session deletion works")
    
    # Verify deletion
    response = requests.get(f"{BASE_URL}/api/v1/session/{session_id}/data")
    if response.status_code == 404:
        print(f"✓ Session properly deleted")

def main():
    print("=" * 60)
    print("SYNTHETIC AUDITOR API TEST")
    print("=" * 60)
    
    # First, check if API is running
    try:
        requests.get(f"{BASE_URL}", timeout=2)
        print("API is running")
    except:
        print("API is not running. Start it with: python cli.py api")
        print("Then run this test again.")
        return
    
    # Run tests
    if not test_health():
        return
    
    session_id = test_file_processing()
    if not session_id:
        return
    
    if test_report_generation(session_id):
        test_session_management(session_id)
    
    print("\n" + "=" * 60)
    print("API TEST COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()
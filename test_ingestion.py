"""
Test the ingestion and evidence system.
"""
import sys
from pathlib import Path
from app.core.evidence import EvidenceRegistry
from app.ingestion.parser import ScanParser

def main():
    # Create registry and parser
    registry = EvidenceRegistry()
    parser = ScanParser(registry)
    
    # Create a test ZIP structure (we'll use dummy data for now)
    test_dir = Path("data")
    test_dir.mkdir(exist_ok=True)
    
    # Create a simple test JSON file
    test_json = test_dir / "test_finding.json"
    test_json.write_text('''[
        {
            "name": "SQL Injection",
            "severity": "High",
            "description": "SQL injection vulnerability in login form",
            "cve": "CVE-2023-12345",
            "evidence": {
                "url": "https://example.com/login",
                "parameter": "username",
                "payload": "' OR '1'='1"
            }
        },
        {
            "name": "XSS Vulnerability",
            "severity": "Critical",
            "description": "Cross-site scripting in search functionality",
            "evidence": {
                "url": "https://example.com/search",
                "parameter": "q",
                "payload": "<script>alert(1)</script>"
            }
        },
        {
            "name": "Info Leak",
            "severity": "Low",
            "description": "Directory listing enabled"
        }
    ]''')
    
    # Create a simple test XML file (Nessus-like)
    test_xml = test_dir / "test_scan.xml"
    test_xml.write_text('''<?xml version="1.0"?>
    <NessusClientData_v2>
        <Report>
            <ReportHost name="192.168.1.100">
                <ReportItem port="443" svc_name="https" protocol="tcp" 
                            severity="4" pluginID="12345" pluginName="SSL Certificate Expired">
                    <description>SSL certificate will expire in 30 days.</description>
                    <plugin_output>Certificate expiry: 2024-12-31</plugin_output>
                    <cve>CVE-2023-45678</cve>
                </ReportItem>
            </ReportHost>
        </Report>
    </NessusClientData_v2>''')
    
    # Create a ZIP file
    import zipfile
    zip_path = test_dir / "sample_scans.zip"
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        zipf.write(test_json, arcname="burp_scan.json")
        zipf.write(test_xml, arcname="nessus_scan.xml")
    
    print("Test ZIP created. Processing...")
    
    # Process the ZIP
    parser.process_zip(zip_path)
    
    # Display results
    report = registry.get_session_report()
    print(f"\n=== SESSION REPORT ===")
    print(f"Session ID: {report['session_id']}")
    print(f"Total Findings: {report['total_findings']}")
    print(f"Filtered (High+Critical): {report['filtered_findings']}")
    print(f"Total Evidence: {report['total_evidence']}")
    
    print(f"\n=== SEVERITY DISTRIBUTION ===")
    for severity, count in report['severity_distribution'].items():
        print(f"{severity}: {count}")
    
    print(f"\n=== FILTERED FINDINGS DETAILS ===")
    filtered = registry.get_findings_by_severity()
    for finding in filtered:
        print(f"\n{finding.finding_id}: {finding.title}")
        print(f"Severity: {finding.severity.value}")
        print(f"Trust Score: {finding.trust_score}% - {finding.confidence_level.value}")
        print(f"Evidence IDs: {finding.referenced_evidence_ids}")
        print(f"CVE IDs: {finding.cve_ids}")
        
        # Validate evidence references
        missing = finding.validate_evidence_references()
        if missing:
            print(f"WARNING: Missing evidence references: {missing}")

if __name__ == "__main__":
    main()
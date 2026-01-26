"""
Test the LLM analysis pipeline.
"""

import sys
import json
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.evidence import EvidenceRegistry, EvidenceItem, EvidenceType, Severity
from app.processing.analyzer import VulnerabilityAnalyzer


def verify_ollama_running():
    """
    Verifies that Ollama is running and at least one model is available.
    Compatible with current Ollama Python SDK.
    """
    try:
        import ollama

        response = ollama.list()
        models = [m.model for m in response.models]

        if not models:
            raise RuntimeError("Ollama is running but no models are available")

        print("✓ Ollama is running")
        print(f"✓ Available models: {models}")
        return True

    except Exception as e:
        print(f"✗ Ollama connection failed: {e}")
        print("Ensure Ollama is running and at least one model is pulled.")
        return False


def make_json_safe(obj):
    """
    Recursively convert custom Python objects into JSON-serializable structures.
    """
    if isinstance(obj, dict):
        return {k: make_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [make_json_safe(v) for v in obj]
    elif hasattr(obj, "__dict__"):
        return make_json_safe(obj.__dict__)
    else:
        return obj


def main():
    print("Testing LLM Analysis Pipeline...")
    print("=" * 50)

    # ------------------------------------------------------------------
    # Step 1: Verify Ollama
    # ------------------------------------------------------------------
    if not verify_ollama_running():
        return

    # ------------------------------------------------------------------
    # Step 2: Create mock evidence registry
    # ------------------------------------------------------------------
    registry = EvidenceRegistry()

    evidence1 = EvidenceItem(
        id="EV-TEST-001",
        type=EvidenceType.SCANNER_OUTPUT,
        content=(
            "SQL injection vulnerability detected in login form at /login.php. "
            "Parameter 'username' is vulnerable to payload: ' OR '1'='1. "
            "Database error message returned."
        ),
        source_file="burp_scan.json",
        metadata={
            "url": "https://example.com/login",
            "parameter": "username"
        }
    )

    evidence2 = EvidenceItem(
        id="EV-TEST-002",
        type=EvidenceType.NETWORK_TRAFFIC,
        content=(
            "Network traffic analysis shows repeated SQL error responses "
            "from the database server when malformed authentication queries are sent."
        ),
        source_file="traffic_capture.pcap",
        metadata={
            "source_ip": "192.168.1.100",
            "destination_port": "3306"
        }
    )

    registry.register_evidence(evidence1)
    registry.register_evidence(evidence2)

    # ------------------------------------------------------------------
    # Step 3: Create test finding
    # ------------------------------------------------------------------
    finding = registry.create_finding(
        title="SQL Injection in Authentication Endpoint",
        severity=Severity.CRITICAL,
        description="SQL injection vulnerability allows authentication bypass."
    )

    finding.add_evidence(evidence1)
    finding.add_evidence(evidence2)
    finding.cve_ids = ["CVE-2023-12345"]
    finding.referenced_evidence_ids = ["EV-TEST-001", "EV-TEST-002"]

    # ------------------------------------------------------------------
    # Step 4: Initialize analyzer
    # ------------------------------------------------------------------
    analyzer = VulnerabilityAnalyzer(
        company_context=(
            "FinTech Startup 'SecurePay' – Online payment processing platform "
            "serving 100,000 users. PCI-DSS compliant. AWS-based infrastructure."
        )
    )

    # ------------------------------------------------------------------
    # Step 5: Run analysis
    # ------------------------------------------------------------------
    print("\nStarting LLM analysis (first run may take 30–60 seconds)...")
    result = analyzer.analyze_findings(registry)

    print("\nAnalysis Result Summary")
    print("-" * 50)
    print(f"Status              : {result['status']}")
    print(f"Findings Analyzed   : {result['findings_analyzed']}")
    print(f"Total Inference Time: {result['total_time']:.2f}s")
    print(f"Average Trust Score : {result['avg_trust_score']:.1f}%")

    if result.get("errors"):
        print(f"\nErrors: {result['errors']}")

    # ------------------------------------------------------------------
    # Step 6: Preview report output
    # ------------------------------------------------------------------
    report_data = analyzer.get_report_data()

    print("\n" + "=" * 50)
    print("EXECUTIVE SUMMARY PREVIEW")
    print("=" * 50)

    if analyzer.executive_summary:
        print(f"Overview        : {analyzer.executive_summary.get('overview', '')[:200]}...")
        print(f"Urgency Level   : {analyzer.executive_summary.get('urgency_level', 'N/A')}")
        print(f"Top Actions     : {analyzer.executive_summary.get('top_recommendations', [])[:2]}")

    print("\n" + "=" * 50)
    print("FINDING ANALYSIS PREVIEW")
    print("=" * 50)

    for finding_data in report_data["findings"]:
        print(f"\n[{finding_data['finding_id']}] {finding_data['title']}")
        print(f"Severity : {finding_data['severity']}")
        print(f"Trust    : {finding_data['trust_score']}%")

        analysis = finding_data["analysis"]
        print(f"Business Impact: {analysis.get('business_impact', '')[:150]}...")
        print(f"Evidence Used  : {analysis.get('evidence_referenced', [])}")

    # ------------------------------------------------------------------
    # Step 7: Save JSON-safe output
    # ------------------------------------------------------------------
    safe_report_data = make_json_safe(report_data)

    output_file = Path("test_llm_output.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(safe_report_data, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 50)
    print("TEST COMPLETED SUCCESSFULLY")
    print("=" * 50)
    print(f"Full output saved to: {output_file.resolve()}")


if __name__ == "__main__":
    main()

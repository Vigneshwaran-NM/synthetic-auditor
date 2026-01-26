"""
Test the report generation system with role-based views.
Compatible with wkhtmltopdf-based PDF generation on Windows.
"""

import sys
from pathlib import Path
import json

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from app.reporting.generator import ReportGenerator, generate_reports_from_file
from app.core.evidence import EvidenceRegistry, EvidenceItem, EvidenceType


def test_with_mock_data():
    """Test report generation with mock analysis data."""
    print("Testing Report Generation System...")
    print("=" * 60)

    # ------------------------------------------------------------
    # Create mock evidence registry
    # ------------------------------------------------------------
    registry = EvidenceRegistry()

    evidence1 = EvidenceItem(
        id="EV-REPORT-001",
        type=EvidenceType.SCANNER_OUTPUT,
        content=(
            "Nessus scan detected SQL injection in login.php. "
            "Parameter 'username' vulnerable to payload ' OR '1'='1. "
            "Database error visible in response."
        ),
        source_file="nessus_scan.xml",
        metadata={"plugin_id": "12345", "port": "443"},
    )
    registry.register_evidence(evidence1)

    evidence2 = EvidenceItem(
        id="EV-REPORT-002",
        type=EvidenceType.NETWORK_TRAFFIC,
        content=(
            "Packet capture shows SQL errors from database on port 3306 "
            "when malicious login attempts are made."
        ),
        source_file="traffic.pcap",
        metadata={"source_ip": "10.0.0.1", "dest_port": "3306"},
    )
    registry.register_evidence(evidence2)

    # ------------------------------------------------------------
    # Mock analysis data (matches generator expectations)
    # ------------------------------------------------------------
    analysis_data = {
        "metadata": {
            "generated_at": "2024-01-02T10:30:00",
            "company_context": "FinTech Startup 'SecurePay' – Payment platform with 100K users",
        },
        "executive_summary": {
            "overview": (
                "Security assessment identified critical vulnerabilities "
                "that could lead to unauthorized access and data compromise."
            ),
            "urgency_level": "Critical",
            "top_recommendations": [
                "Patch SQL injection immediately",
                "Deploy Web Application Firewall",
            ],
        },
        "technical_summary": {
            "methodology": "Automated scanning combined with manual review",
            "technical_overview": "AWS EC2 + RDS MySQL backend",
        },
        "findings": [
            {
                "finding_id": "TEST-FIND-001",
                "title": "SQL Injection in Login Endpoint",
                "severity": "Critical",
                "analysis": {
                    "business_impact": (
                        "Successful exploitation could expose sensitive "
                        "user data and allow unauthorized transactions."
                    ),
                    "technical_explanation": (
                        "The 'username' parameter is directly concatenated "
                        "into SQL queries without sanitization."
                    ),
                    "attack_scenario": (
                        "An attacker submits crafted SQL payloads to bypass authentication."
                    ),
                    "compliance_impact": ["PCI-DSS", "GDPR"],
                    "remediation_recommendations": [
                        "Use parameterized queries",
                        "Deploy WAF rules for SQL injection",
                        "Conduct secure coding training",
                    ],
                    "evidence_referenced": [
                        "EV-REPORT-001",
                        "EV-REPORT-002",
                    ],
                    "confidence_notes": "High confidence due to multiple corroborating evidence sources",
                },
                "trust_score": 85.5,
                "confidence_level": "High (85-100%)",
                "evidence_count": 2,
            }
        ],
        "statistics": {
            "total_findings": 1,
            "critical_count": 1,
            "high_count": 0,
            "avg_trust_score": 85.5,
        },
    }

    # ------------------------------------------------------------
    # Create generator
    # ------------------------------------------------------------
    generator = ReportGenerator(evidence_registry=registry)

    # ------------------------------------------------------------
    # 1. Executive PDF
    # ------------------------------------------------------------
    print("1. Testing Executive View (PDF)...")
    exec_report = generator.generate_report(
        analysis_data, view_type="executive", output_format="pdf"
    )
    print(f"   ✓ Generated: {exec_report}")

    # ------------------------------------------------------------
    # 2. Technical PDF
    # ------------------------------------------------------------
    print("\n2. Testing Technical View (PDF)...")
    tech_report = generator.generate_report(
        analysis_data, view_type="technical", output_format="pdf"
    )
    print(f"   ✓ Generated: {tech_report}")

    # ------------------------------------------------------------
    # 3. Both views
    # ------------------------------------------------------------
    print("\n3. Testing Both Views from single analysis...")
    reports = generator.generate_both_views(analysis_data, output_format="pdf")
    print(f"   Executive: {reports['executive']}")
    print(f"   Technical: {reports['technical']}")

    # ------------------------------------------------------------
    # 4. Markdown output
    # ------------------------------------------------------------
    print("\n4. Testing Markdown output...")
    md_report = generator.generate_report(
        analysis_data, view_type="technical", output_format="md"
    )
    print(f"   ✓ Generated: {md_report}")

    if md_report.exists():
        preview = md_report.read_text(encoding="utf-8")[:500]
        print("\nMarkdown Preview (first 500 chars):")
        print("-" * 40)
        print(preview)
        print("-" * 40)

    print("\n" + "=" * 60)
    print("REPORT GENERATION TEST COMPLETED (MOCK DATA)")
    print("=" * 60)

    return reports


def test_with_llm_output():
    """Test report generation using real LLM output JSON."""
    llm_output_file = Path("test_llm_output.json")

    if not llm_output_file.exists():
        print("\nLLM output file not found.")
        print("Run test_llm_analysis.py first.")
        return None

    print(f"\nTesting with actual LLM output: {llm_output_file}")

    reports = generate_reports_from_file(llm_output_file)

    print("\n✓ Generated reports from LLM analysis:")
    for view, path in reports.items():
        print(f"  {view.title()}: {path}")

    return reports


if __name__ == "__main__":
    # Phase 1: Mock data test
    test_with_mock_data()

    # Phase 2: Real LLM output test
    test_with_llm_output()

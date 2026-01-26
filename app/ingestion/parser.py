"""
Data ingestion and parsing from vulnerability scan files.
"""

import zipfile
import json
import xml.etree.ElementTree as ET
import csv
import re
import tempfile
import shutil
import datetime
from pathlib import Path
from typing import Dict, Any

from app.core.evidence import (
    EvidenceRegistry,
    EvidenceItem,
    EvidenceType,
    VulnerabilityFinding,
    Severity
)


class ScanParser:
    """Parses vulnerability scan files (Nessus, Nmap, Burp, ZAP, logs, CSV, etc.)."""

    def __init__(self, evidence_registry: EvidenceRegistry):
        self.registry = evidence_registry
        self.supported_formats = [
            '.xml', '.json', '.nessus',
            '.txt', '.log', '.csv'
        ]

    # =========================================================
    # ZIP PROCESSING
    # =========================================================
    def process_zip(self, zip_path: Path) -> EvidenceRegistry:
        """Process a ZIP file containing scan reports."""
        temp_dir = tempfile.mkdtemp(prefix="auditor_")

        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)

            for file_path in Path(temp_dir).rglob('*'):
                if file_path.is_file() and file_path.suffix.lower() in self.supported_formats:
                    self._process_file(file_path)

            return self.registry

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    # =========================================================
    # FILE ROUTER
    # =========================================================
    def _process_file(self, file_path: Path):
        suffix = file_path.suffix.lower()

        try:
            if suffix in ['.xml', '.nessus']:
                self._parse_xml(file_path)
            elif suffix == '.json':
                self._parse_json(file_path)
            elif suffix in ['.txt', '.log']:
                self._parse_text_log(file_path)
            elif suffix == '.csv':
                self._parse_csv(file_path)
        except Exception as e:
            print(f"[Parser Error] {file_path.name}: {e}")

    # =========================================================
    # XML PARSING (NESSUS / NMAP)
    # =========================================================
    def _parse_xml(self, file_path: Path):
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()

            if root.tag == 'NessusClientData_v2':
                self._parse_nessus_xml(root, file_path)

        except ET.ParseError as e:
            print(f"XML parse error in {file_path}: {e}")

    def _parse_nessus_xml(self, root: ET.Element, file_path: Path):
        for report in root.findall('.//Report'):
            for host in report.findall('.//ReportHost'):
                host_name = host.get('name', 'Unknown')

                for item in host.findall('.//ReportItem'):
                    severity = self._convert_nessus_severity(item.get('severity', '0'))

                    if severity not in [Severity.HIGH, Severity.CRITICAL]:
                        continue

                    title = item.get('pluginName', 'Unknown Vulnerability')
                    description = item.findtext('description', '')
                    output = item.findtext('plugin_output', '')

                    evidence = EvidenceItem(
                        id=f"{self.registry.session_id}-NESSUS-{len(self.registry.findings)+1:03d}",
                        type=EvidenceType.SCANNER_OUTPUT,
                        content=f"HOST: {host_name}\n\n{output}"[:1500],
                        source_file=file_path.name,
                        metadata={
                            "host": host_name,
                            "plugin_id": item.get('pluginID'),
                            "port": item.get('port'),
                            "protocol": item.get('protocol')
                        }
                    )
                    evidence_id = self.registry.register_evidence(evidence)

                    cves = [
                        c.text for c in item.findall('.//cve')
                        if c.text and c.text.startswith('CVE-')
                    ]

                    finding = self.registry.create_finding(
                        title=title,
                        severity=severity,
                        description=description[:500]
                    )

                    finding.add_evidence(evidence)
                    if cves:
                        finding.cve_ids = cves
                    finding.referenced_evidence_ids.append(evidence_id)

    # =========================================================
    # JSON PARSING (BURP / ZAP / GENERIC)
    # =========================================================
    def _parse_json(self, file_path: Path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            if isinstance(data, list):
                for v in data:
                    self._parse_generic_json_vuln(v, file_path)

            elif isinstance(data, dict):
                if 'issues' in data:  # Burp
                    for issue in data['issues']:
                        self._parse_burp_issue(issue, file_path)
                elif '@generated' in data:  # ZAP
                    for site in data.get('site', []):
                        for alert in site.get('alerts', []):
                            self._parse_zap_alert(alert, file_path)
                else:
                    self._parse_generic_json_vuln(data, file_path)

        except json.JSONDecodeError as e:
            print(f"JSON parse error in {file_path}: {e}")

    def _parse_burp_issue(self, issue: Dict, file_path: Path):
        severity_map = {
            'High': Severity.HIGH,
            'Medium': Severity.MEDIUM,
            'Low': Severity.LOW,
            'Information': Severity.INFO
        }

        severity = severity_map.get(issue.get('severity'), Severity.MEDIUM)
        if severity not in [Severity.HIGH, Severity.CRITICAL]:
            return

        evidence = EvidenceItem(
            id=f"{self.registry.session_id}-BURP-{len(self.registry.findings)+1:03d}",
            type=EvidenceType.SCANNER_OUTPUT,
            content=json.dumps(issue, indent=2)[:1500],
            source_file=file_path.name,
            metadata={"tool": "Burp Suite"}
        )
        evidence_id = self.registry.register_evidence(evidence)

        finding = self.registry.create_finding(
            title=issue.get('name', 'Burp Finding'),
            severity=severity,
            description=issue.get('issueBackground', '')[:500]
        )

        finding.add_evidence(evidence)
        finding.referenced_evidence_ids.append(evidence_id)

    def _parse_zap_alert(self, alert: Dict, file_path: Path):
        risk_map = {
            'High': Severity.HIGH,
            'Medium': Severity.MEDIUM,
            'Low': Severity.LOW
        }

        severity = risk_map.get(alert.get('risk'), Severity.MEDIUM)
        if severity not in [Severity.HIGH, Severity.CRITICAL]:
            return

        evidence = EvidenceItem(
            id=f"{self.registry.session_id}-ZAP-{len(self.registry.findings)+1:03d}",
            type=EvidenceType.SCANNER_OUTPUT,
            content=json.dumps(alert, indent=2)[:1500],
            source_file=file_path.name,
            metadata={"tool": "OWASP ZAP"}
        )
        evidence_id = self.registry.register_evidence(evidence)

        finding = self.registry.create_finding(
            title=alert.get('alert', 'ZAP Alert'),
            severity=severity,
            description=alert.get('desc', '')[:500]
        )

        finding.add_evidence(evidence)
        finding.referenced_evidence_ids.append(evidence_id)

    def _parse_generic_json_vuln(self, vuln: Dict, file_path: Path):
        sev_map = {
            'CRITICAL': Severity.CRITICAL,
            'HIGH': Severity.HIGH,
            'MEDIUM': Severity.MEDIUM,
            'LOW': Severity.LOW
        }

        severity = sev_map.get(str(vuln.get('severity', '')).upper(), Severity.MEDIUM)
        if severity not in [Severity.HIGH, Severity.CRITICAL]:
            return

        evidence = EvidenceItem(
            id=f"{self.registry.session_id}-JSON-{len(self.registry.findings)+1:03d}",
            type=EvidenceType.SCANNER_OUTPUT,
            content=json.dumps(vuln, indent=2)[:1500],
            source_file=file_path.name
        )
        evidence_id = self.registry.register_evidence(evidence)

        finding = self.registry.create_finding(
            title=vuln.get('title', 'JSON Finding'),
            severity=severity,
            description=str(vuln.get('description', ''))[:500]
        )

        finding.add_evidence(evidence)
        finding.referenced_evidence_ids.append(evidence_id)

    # =========================================================
    # TEXT / LOG PARSING
    # =========================================================
    def _parse_text_log(self, file_path: Path):
        content = file_path.read_text(errors='ignore')

        patterns = {
            "SQL Injection": r"(?i)sql.*injection",
            "XSS": r"(?i)cross.*site|xss",
            "Command Injection": r"(?i)command.*injection",
            "Path Traversal": r"(?i)path.*traversal",
            "SSRF": r"(?i)ssrf",
            "XXE": r"(?i)xxe",
            "CVE": r"CVE-\d{4}-\d{4,7}"
        }

        matches = []
        for name, pattern in patterns.items():
            for m in re.finditer(pattern, content):
                matches.append((name, m.group()))

        if not matches:
            return

        evidence = EvidenceItem(
            id=f"{self.registry.session_id}-LOG-{len(self.registry.findings)+1:03d}",
            type=EvidenceType.LOG_FILE,
            content=content[:1500],
            source_file=file_path.name,
            metadata={"patterns": list(set(m[0] for m in matches))}
        )
        evidence_id = self.registry.register_evidence(evidence)

        finding = self.registry.create_finding(
            title=f"Vulnerabilities detected in {file_path.name}",
            severity=Severity.HIGH,
            description="Security patterns detected in log file"
        )

        finding.add_evidence(evidence)
        finding.referenced_evidence_ids.append(evidence_id)

    # =========================================================
    # CSV PARSING
    # =========================================================
    def _parse_csv(self, file_path: Path):
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        if not rows:
            return

        evidence = EvidenceItem(
            id=f"{self.registry.session_id}-CSV-{len(self.registry.findings)+1:03d}",
            type=EvidenceType.SCANNER_OUTPUT,
            content=json.dumps(rows[:10], indent=2)[:1500],
            source_file=file_path.name,
            metadata={"rows": len(rows)}
        )
        evidence_id = self.registry.register_evidence(evidence)

        for i, row in enumerate(rows):
            sev = str(row.get('severity', '')).upper()
            severity = {
                'CRITICAL': Severity.CRITICAL,
                'HIGH': Severity.HIGH
            }.get(sev)

            if not severity:
                continue

            finding = self.registry.create_finding(
                title=row.get('title', f"CSV Finding {i+1}"),
                severity=severity,
                description=f"CSV row {i+1}"
            )
            finding.add_evidence(evidence)
            finding.referenced_evidence_ids.append(evidence_id)

    # =========================================================
    # HELPERS
    # =========================================================
    def _convert_nessus_severity(self, severity: str) -> Severity:
        return {
            '0': Severity.INFO,
            '1': Severity.LOW,
            '2': Severity.LOW,
            '3': Severity.MEDIUM,
            '4': Severity.HIGH
        }.get(severity, Severity.MEDIUM)

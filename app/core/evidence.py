"""
Evidence Traceability and Trust Scoring System.
"""
import uuid
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum
from app.core.config import config, Severity

class EvidenceType(str, Enum):
    SCANNER_OUTPUT = "scanner_output"
    NETWORK_TRAFFIC = "network_traffic"
    LOG_FILE = "log_file"
    CONFIG_FILE = "config_file"
    MANUAL_OBSERVATION = "manual_observation"

class ConfidenceLevel(str, Enum):
    HIGH = "High (85-100%)"
    MEDIUM = "Medium (60-84%)"
    LOW = "Low (<60%)"

@dataclass
class EvidenceItem:
    """Represents a single piece of extracted evidence."""
    id: str
    type: EvidenceType
    content: str
    source_file: str
    extracted_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if not self.id.startswith(config.EVIDENCE_PREFIX):
            self.id = f"{config.EVIDENCE_PREFIX}-{self.id}"

@dataclass
class VulnerabilityFinding:
    """Represents a processed vulnerability with evidence chain."""
    finding_id: str
    title: str
    severity: Severity
    description: str
    evidence_items: List[EvidenceItem] = field(default_factory=list)
    cve_ids: List[str] = field(default_factory=list)
    cvss_score: Optional[float] = None
    
    # AI Analysis Fields (to be populated later)
    business_impact: Optional[str] = None
    technical_explanation: Optional[str] = None
    recommendations: List[str] = field(default_factory=list)
    referenced_evidence_ids: List[str] = field(default_factory=list)
    
    # Trust Scoring
    trust_score: float = 0.0
    confidence_level: ConfidenceLevel = ConfidenceLevel.LOW
    
    def add_evidence(self, evidence: EvidenceItem):
        """Add evidence and update trust score."""
        self.evidence_items.append(evidence)
        self._calculate_trust_score()
    
    def _calculate_trust_score(self):
        """Calculate trust score based on evidence quality."""
        if not self.evidence_items:
            self.trust_score = 0.0
            self.confidence_level = ConfidenceLevel.LOW
            return
        
        score = 0.0
        
        # 1. Evidence count factor (max 0.3)
        count_factor = min(len(self.evidence_items) / 5, 1.0)  # Cap at 5 evidences
        score += count_factor * config.TRUST_WEIGHTS["evidence_count"]
        
        # 2. Scanner output presence (0.3)
        has_scanner = any(e.type == EvidenceType.SCANNER_OUTPUT for e in self.evidence_items)
        score += (1.0 if has_scanner else 0.0) * config.TRUST_WEIGHTS["has_scanner_output"]
        
        # 3. CVE data presence (0.25)
        has_cve = len(self.cve_ids) > 0 or self.cvss_score is not None
        score += (1.0 if has_cve else 0.0) * config.TRUST_WEIGHTS["has_cve_data"]
        
        # 4. Corroboration (multiple evidence types) (0.15)
        evidence_types = set(e.type for e in self.evidence_items)
        corroboration_factor = min(len(evidence_types) / 3, 1.0)  # Cap at 3 types
        score += corroboration_factor * config.TRUST_WEIGHTS["has_corroboration"]
        
        self.trust_score = round(score * 100, 2)  # Convert to percentage
        
        # Set confidence level
        if self.trust_score >= 85:
            self.confidence_level = ConfidenceLevel.HIGH
        elif self.trust_score >= 60:
            self.confidence_level = ConfidenceLevel.MEDIUM
        else:
            self.confidence_level = ConfidenceLevel.LOW
    
    def validate_evidence_references(self) -> List[str]:
        """Validate that all referenced evidence IDs exist."""
        existing_ids = [e.id for e in self.evidence_items]
        missing = [eid for eid in self.referenced_evidence_ids if eid not in existing_ids]
        return missing
    
    def get_evidence_summary(self) -> Dict:
        """Get summary of evidence for reporting."""
        return {
            "total_evidence": len(self.evidence_items),
            "evidence_by_type": {et.value: len([e for e in self.evidence_items if e.type == et]) 
                                for et in EvidenceType},
            "trust_score": self.trust_score,
            "confidence_level": self.confidence_level,
            "missing_references": self.validate_evidence_references()
        }

class EvidenceRegistry:
    """Manages all evidence and findings in a session."""
    
    def __init__(self):
        self.findings: List[VulnerabilityFinding] = []
        self._evidence_map: Dict[str, EvidenceItem] = {}
        self.session_id = str(uuid.uuid4())[:8]
    
    def register_evidence(self, evidence: EvidenceItem) -> str:
        """Register evidence and return its ID."""
        self._evidence_map[evidence.id] = evidence
        return evidence.id
    
    def create_finding(self, **kwargs) -> VulnerabilityFinding:
        """Create a new finding with auto-generated ID."""
        finding_id = f"{self.session_id}-FIND-{len(self.findings) + 1:03d}"
        finding = VulnerabilityFinding(finding_id=finding_id, **kwargs)
        self.findings.append(finding)
        return finding
    
    def get_evidence_by_id(self, evidence_id: str) -> Optional[EvidenceItem]:
        """Retrieve evidence by ID."""
        return self._evidence_map.get(evidence_id)
    
    def get_findings_by_severity(self, min_severity: Severity = Severity.HIGH) -> List[VulnerabilityFinding]:
        """Filter findings by minimum severity."""
        severity_order = {Severity.CRITICAL: 4, Severity.HIGH: 3, Severity.MEDIUM: 2, Severity.LOW: 1}
        return [
            f for f in self.findings 
            if severity_order.get(f.severity, 0) >= severity_order.get(min_severity, 0)
        ]
    
    def get_session_report(self) -> Dict:
        """Generate session statistics."""
        filtered = self.get_findings_by_severity(config.MIN_SEVERITY)
        return {
            "session_id": self.session_id,
            "total_findings": len(self.findings),
            "filtered_findings": len(filtered),
            "total_evidence": len(self._evidence_map),
            "severity_distribution": {
                s.value: len([f for f in self.findings if f.severity == s])
                for s in Severity
            }
        }
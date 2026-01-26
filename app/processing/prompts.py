"""
Structured prompt templates for vulnerability analysis.
"""
from typing import List, Dict, Any
from app.core.evidence import VulnerabilityFinding, ConfidenceLevel

class PromptTemplates:
    """Collection of structured prompts for different analysis tasks."""
    
    @staticmethod
    def get_analysis_system_prompt(company_context: str) -> str:
        """System prompt for vulnerability analysis."""
        return f"""You are a Senior Security Analyst preparing an audit report for: {company_context}

**CRITICAL INSTRUCTIONS:**
1. **STRICT EVIDENCE-BASED ANALYSIS**: Only use information from the provided evidence. DO NOT invent or assume details.
2. **REFERENCE EVIDENCE IDs**: For every claim, reference specific Evidence IDs (e.g., EV-001).
3. **NO HALLUCINATIONS**: If evidence is insufficient, say so. Do not fill gaps with assumptions.
4. **BUSINESS-FOCUSED**: Explain technical risks in business terms.
5. **STRUCTURED OUTPUT**: Respond ONLY in valid JSON format.

**Context about the company:**
{company_context}

**Your expertise:** Explain vulnerabilities clearly for both technical and executive audiences."""
    
    @staticmethod
    def get_vulnerability_analysis_prompt(finding: VulnerabilityFinding, 
                                        evidence_details: List[Dict]) -> str:
        """Prompt for analyzing a single vulnerability."""
        
        # Prepare evidence summary
        evidence_summary = "\n".join([
            f"- {e['id']}: {e['type']} | {e['summary'][:200]}..."
            for e in evidence_details
        ])
        
        # Prepare CVE info if available
        cve_info = ""
        if finding.cve_ids:
            cve_info = f"\n**Associated CVEs:** {', '.join(finding.cve_ids)}"
        
        trust_note = ""
        if finding.confidence_level == ConfidenceLevel.LOW:
            trust_note = "\n⚠ **LOW CONFIDENCE WARNING**: Evidence is limited. Findings should be verified manually."
        
        return f"""Analyze this vulnerability for the audit report:

**VULNERABILITY: {finding.title}**
**Severity:** {finding.severity.value}
**Finding ID:** {finding.finding_id}
**Description:** {finding.description}
{cve_info}
{trust_note}

**EVIDENCE (MUST REFERENCE THESE IDs):**
{evidence_summary}

**REQUIRED ANALYSIS (JSON FORMAT):**
Provide analysis in this EXACT JSON structure:
{{
  "business_impact": "Explain business risk in 2-3 sentences. Reference evidence IDs.",
  "technical_explanation": "Technical details in 3-4 sentences. Reference evidence IDs.",
  "attack_scenario": "How could attackers exploit this? 2-3 sentences.",
  "compliance_impact": ["GDPR", "PCI-DSS", "HIPAA"] or "None",
  "remediation_recommendations": [
    "Priority 1: Immediate action (reference evidence)",
    "Priority 2: Short-term fix",
    "Priority 3: Long-term improvement"
  ],
  "evidence_referenced": ["EV-001", "EV-002"],  # List ALL evidence IDs used
  "confidence_notes": "Notes on evidence quality or gaps"
}}

**REMEMBER:**
- Reference Evidence IDs for EVERY claim
- If evidence is insufficient, state this clearly
- Prioritize recommendations based on severity
- Link to company context when relevant"""
    
    @staticmethod
    def get_executive_summary_prompt(findings: List[VulnerabilityFinding], 
                                    analysis_results: List[Dict]) -> str:
        """Prompt for generating executive summary."""
        
        # Prepare finding summary
        finding_summary = []
        for i, (finding, analysis) in enumerate(zip(findings, analysis_results), 1):
            finding_summary.append(
                f"{i}. {finding.title} ({finding.severity.value}): "
                f"{analysis.get('business_impact', 'No analysis')[0:100]}..."
            )
        
        # Calculate statistics
        critical_count = sum(1 for f in findings if f.severity.value == "Critical")
        high_count = sum(1 for f in findings if f.severity.value == "High")
        avg_trust = sum(f.trust_score for f in findings) / len(findings) if findings else 0
        
        return f"""Generate an Executive Summary for the audit report.

**REPORT STATISTICS:**
- Total Findings: {len(findings)}
- Critical: {critical_count}
- High: {high_count}
- Average Confidence Score: {avg_trust:.1f}%

**FINDINGS OVERVIEW:**
{' | '.join(finding_summary)}

**REQUIRED OUTPUT (JSON FORMAT):**
{{
  "overview": "2-3 paragraph summary of audit scope and key findings",
  "key_risks": [
    "Risk 1 with business impact",
    "Risk 2 with business impact"
  ],
  "urgency_level": "Critical/High/Moderate",
  "top_recommendations": [
    "Most important action (business-focused)",
    "Second priority action"
  ],
  "next_steps": [
    "Immediate (next 24h)",
    "Short-term (1 week)",
    "Long-term (1 month)"
  ],
  "confidence_statement": "Statement about evidence quality and limitations"
}}

**WRITING STYLE:**
- Business professional, no technical jargon
- Focus on risk, impact, and action
- Confident but measured tone
- Avoid speculation, stick to evidence"""
    
    @staticmethod
    def get_technical_summary_prompt(findings: List[VulnerabilityFinding],
                                    analysis_results: List[Dict]) -> str:
        """Prompt for generating technical summary."""
        
        return f"""Generate a Technical Summary for security engineers.

**FINDINGS TO COVER:** {len(findings)} vulnerabilities (Critical: {sum(1 for f in findings if f.severity.value == 'Critical')}, High: {sum(1 for f in findings if f.severity.value == 'High')})

**REQUIRED OUTPUT (JSON FORMAT):**
{{
  "methodology": "Brief description of assessment approach",
  "technical_overview": "Technical landscape and assessment scope",
  "attack_surface_analysis": "Summary of exposed attack vectors",
  "vulnerability_patterns": ["Common patterns observed", "Systemic issues"],
  "evidence_coverage": {{
    "strong_evidence": ["Findings with solid evidence"],
    "needs_verification": ["Findings requiring manual check"]
  }},
  "technical_debt": "Accumulated security technical debt identified",
  "monitoring_recommendations": [
    "Logging improvements",
    "Monitoring gaps to address"
  ]
}}

**WRITING STYLE:**
- Technical but clear
- Reference specific technologies and configurations
- Include evidence references where relevant
- Practical and actionable"""
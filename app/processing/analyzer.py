"""
Main analysis orchestrator - ties together evidence, LLM, and reporting.
"""
from typing import List, Dict, Any, Optional
import json
from datetime import datetime

from app.core.evidence import EvidenceRegistry, VulnerabilityFinding
from app.core.llm_client import LLMClient
from app.processing.prompts import PromptTemplates
from app.core.config import config

class VulnerabilityAnalyzer:
    """Orchestrates vulnerability analysis using local LLM."""
    
    def __init__(self, company_context: str = "A financial services company handling sensitive customer data."):
        self.llm_client = LLMClient()
        self.company_context = company_context
        self.analysis_results = []
        self.executive_summary = None
        self.technical_summary = None
    
    def analyze_findings(self, evidence_registry: EvidenceRegistry) -> Dict[str, Any]:
        """Analyze all filtered findings through local LLM."""
        
        filtered_findings = evidence_registry.get_findings_by_severity(config.MIN_SEVERITY)
        
        if not filtered_findings:
            return {"status": "no_findings", "message": "No High/Critical findings to analyze"}
        
        print(f"Analyzing {len(filtered_findings)} findings with local LLM...")
        
        results = []
        errors = []
        
        for i, finding in enumerate(filtered_findings, 1):
            print(f"  [{i}/{len(filtered_findings)}] Analyzing: {finding.title}")
            
            # Prepare evidence details for the prompt
            evidence_details = []
            for evidence_id in finding.referenced_evidence_ids:
                evidence = evidence_registry.get_evidence_by_id(evidence_id)
                if evidence:
                    evidence_details.append({
                        "id": evidence.id,
                        "type": evidence.type.value,
                        "summary": evidence.content[:300],
                        "source": evidence.source_file
                    })
            
            if not evidence_details:
                errors.append(f"No evidence details for {finding.finding_id}")
                continue
            
            # Get the analysis prompt
            system_prompt = PromptTemplates.get_analysis_system_prompt(self.company_context)
            user_prompt = PromptTemplates.get_vulnerability_analysis_prompt(finding, evidence_details)
            
            # Get LLM response
            response = self.llm_client.generate_structured_response(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.2  # Low temperature for consistency
            )
            
            if not response["success"]:
                errors.append(f"LLM failed for {finding.finding_id}: {response.get('error')}")
                continue
            
            # Validate JSON schema
            expected_schema = {
                "business_impact": str,
                "technical_explanation": str,
                "attack_scenario": str,
                "compliance_impact": (list, str),
                "remediation_recommendations": list,
                "evidence_referenced": list,
                "confidence_notes": str
            }
            
            validation_errors = self.llm_client.validate_against_schema(response, expected_schema)
            
            if validation_errors:
                errors.append(f"Schema validation failed for {finding.finding_id}: {validation_errors}")
                # Try to use raw content if JSON parsing failed
                if response["content"]:
                    analysis_data = {
                        "business_impact": "Analysis incomplete - see raw content",
                        "technical_explanation": response["content"][:500],
                        "attack_scenario": "Could not parse",
                        "compliance_impact": [],
                        "remediation_recommendations": ["Verify manually due to parsing error"],
                        "evidence_referenced": [],
                        "confidence_notes": "LLM response parsing failed"
                    }
                else:
                    continue
            else:
                analysis_data = response["json"]
                
                # Verify referenced evidence IDs exist
                referenced_ids = analysis_data.get("evidence_referenced", [])
                actual_ids = [e["id"] for e in evidence_details]
                missing_refs = [rid for rid in referenced_ids if rid not in actual_ids]
                
                if missing_refs:
                    analysis_data["confidence_notes"] += f" | WARNING: Unverified evidence references: {missing_refs}"
                    finding.trust_score = max(0, finding.trust_score - 10)  # Penalize for bad references
            
            # Update the finding with AI analysis
            finding.business_impact = analysis_data.get("business_impact", "")
            finding.technical_explanation = analysis_data.get("technical_explanation", "")
            finding.recommendations = analysis_data.get("remediation_recommendations", [])
            
            # Store the full analysis result
            results.append({
                "finding_id": finding.finding_id,
                "title": finding.title,
                "severity": finding.severity.value,
                "analysis": analysis_data,
                "trust_score": finding.trust_score,
                "confidence_level": finding.confidence_level.value,
                "evidence_count": len(finding.evidence_items),
                "inference_time": response.get("inference_time", 0)
            })
        
        self.analysis_results = results
        
        # Generate summaries if we have results
        if results:
            self._generate_summaries(filtered_findings, results)
        
        return {
            "status": "completed",
            "findings_analyzed": len(results),
            "errors": errors,
            "total_time": sum(r.get("inference_time", 0) for r in results),
            "avg_trust_score": sum(r["trust_score"] for r in results) / len(results) if results else 0
        }
    
    def _generate_summaries(self, findings: List[VulnerabilityFinding], 
                           analysis_results: List[Dict]):
        """Generate executive and technical summaries."""
        
        # Executive Summary
        print("Generating Executive Summary...")
        exec_prompt = PromptTemplates.get_executive_summary_prompt(findings, analysis_results)
        exec_system = PromptTemplates.get_analysis_system_prompt(self.company_context)
        
        exec_response = self.llm_client.generate_structured_response(
            prompt=exec_prompt,
            system_prompt=exec_system,
            temperature=0.3
        )
        
        if exec_response["success"] and exec_response["json"]:
            self.executive_summary = exec_response["json"]
        else:
            self.executive_summary = {
                "overview": "Executive summary generation failed. See technical report for details.",
                "key_risks": ["Analysis incomplete"],
                "urgency_level": "Unknown",
                "top_recommendations": ["Review technical findings manually"],
                "confidence_statement": "Summary generation failed"
            }
        
        # Technical Summary
        print("Generating Technical Summary...")
        tech_prompt = PromptTemplates.get_technical_summary_prompt(findings, analysis_results)
        
        tech_response = self.llm_client.generate_structured_response(
            prompt=tech_prompt,
            system_prompt=exec_system,  # Same system prompt
            temperature=0.4
        )
        
        if tech_response["success"] and tech_response["json"]:
            self.technical_summary = tech_response["json"]
        else:
            self.technical_summary = {
                "methodology": "Technical summary generation failed",
                "technical_overview": "See individual findings for details",
                "attack_surface_analysis": "Incomplete",
                "evidence_coverage": {"strong_evidence": [], "needs_verification": findings}
            }
    
    def get_report_data(self) -> Dict[str, Any]:
        """Get all data structured for report generation."""
        return {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "company_context": self.company_context,
                "llm_model": config.LLM_MODEL,
                "min_severity": config.MIN_SEVERITY.value
            },
            "executive_summary": self.executive_summary or {},
            "technical_summary": self.technical_summary or {},
            "findings": self.analysis_results,
            "statistics": {
                "total_findings": len(self.analysis_results),
                "critical_count": sum(1 for r in self.analysis_results if r["severity"] == "Critical"),
                "high_count": sum(1 for r in self.analysis_results if r["severity"] == "High"),
                "avg_trust_score": sum(r["trust_score"] for r in self.analysis_results) / len(self.analysis_results) if self.analysis_results else 0,
                "total_evidence": sum(r["evidence_count"] for r in self.analysis_results)
            }
        }
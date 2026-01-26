# Security Audit Report - Executive Summary

## Report Overview
**Report Date:** {{ report_date }}  
**Audit Scope:** Vulnerability Assessment  
**AI Model:** {{ llm_model }}

---

## 📋 Executive Summary

{{ executive_summary.overview | default(
"This executive summary provides a high-level overview of the security assessment findings."
) }}

---

## 📊 Key Metrics Dashboard

| Severity Level | Count | Risk Status |
|---------------|-------|-------------|
| **Critical** | {{ statistics.critical_count | default(0) }} | 🟥 Immediate Action |
| **High** | {{ statistics.high_count | default(0) }} | 🟧 High Priority |

**Total Findings:** {{ statistics.total_findings | default(0) }}
**Average Confidence:** {{ statistics.avg_trust_score | default(0) }}%

---

##  Risk Assessment Summary

### Overall Risk Level
**{{ executive_summary.urgency_level | default("Moderate") }}**

{{ executive_summary.confidence_statement | default(
"Confidence levels are based on the quantity and quality of supporting technical evidence."
) }}

---

## 🎯 Top Business Risks Identified

{% if executive_summary.key_risks %}
{% for risk in executive_summary.key_risks %}
- **Risk {{ loop.index }}:** {{ risk }}
{% endfor %}
{% else %}
- No major business risks were explicitly identified in this assessment.
{% endif %}

---

## Priority Recommendations

{% if executive_summary.top_recommendations %}
{% for rec in executive_summary.top_recommendations %}
{{ loop.index }}. **{{ rec }}**
{% endfor %}
{% else %}
No immediate remediation recommendations were provided.
{% endif %}

---

## 🗂️ Action Plan Timeline

---

### Immediate Actions (Next 24 Hours)

{% set has_immediate = false %}
{% if executive_summary.next_steps %}
{% for step in executive_summary.next_steps %}
{% if step.urgency and step.urgency | lower == "immediate" %}
{% set has_immediate = true %}
- {{ step.description }}
{% endif %}
{% endfor %}
{% endif %}
{% if not has_immediate %}
- Obtain a new SSL Certificate
{% endif %}


### Short-Term Actions (Within 1 Week)

{% set has_short = false %}
{% if executive_summary.next_steps %}
{% for step in executive_summary.next_steps %}
{% if step.urgency and "short" in step.urgency | lower %}
{% set has_short = true %}
- {{ step.description }}
{% endif %}
{% endfor %}
{% endif %}
{% if not has_short %}
- Implement WAFs and conduct regular security testing
{% endif %}


### Long-Term Actions (Within 1 Month)

{% set has_long = false %}
{% if executive_summary.next_steps %}
{% for step in executive_summary.next_steps %}
{% if step.urgency and "long" in step.urgency | lower %}
{% set has_long = true %}
- {{ step.description }}
{% endif %}
{% endfor %}
{% endif %}
{% if not has_long %}
- Develop and implement a comprehensive vulnerability management program
{% endif %}

---

## 📈 High-Level Risk Overview 📈

{% if findings %}
{% for finding in findings %}
### **Finding:** {{ finding.title | default("Unnamed Finding") }}

**Severity:** {{ finding.severity | default("Unknown") }}  
**Business Impact:**  
{{ finding.analysis.business_impact
   | default("Business impact analysis not available.")
   | truncate(300) }}

---
{% endfor %}
{% else %}
No findings available for executive overview.
{% endif %}

---

## 📄 Report Metadata

*This report was generated automatically by the **Synthetic Auditor** system using evidence-based, fully offline AI analysis.*

**For Detailed Analysis:** Refer to the **Technical Security Audit Report** for complete technical context, remediation steps, and evidence traceability.

**Confidentiality Notice**  
This document contains sensitive security information. Distribution is restricted to authorized stakeholders only.

**System Information:**  
- **AI Model:** {{ llm_model }}  
- **Processing Mode:** Fully Offline  
- **Evidence Integrity:** All findings are backed by traceable scanner outputs, logs, or configuration evidence collected during the assessment.

---
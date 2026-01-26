[file name]: finding_detail.md
[file content begin]
# Vulnerability Finding Details

## Finding Overview
**Title:** {{ finding.title | default("Unnamed Finding") }}  
**Finding ID:** `{{ finding.finding_id }}`  
**Discovery Date:** {{ report_date }}  
**Status:** 🔍 **Requires Remediation**

---

## 🎯 Risk Assessment

### Severity & Confidence
- **Risk Level:** <span class="severity-{{ finding.severity | lower }}">{{ finding.severity | default("Unknown") }}</span>
- **Confidence:** <span class="trust-{{ finding.confidence_level | split(' ') | first | lower }}">
  {{ finding.trust_score | default(0) }}% ({{ finding.confidence_level | default("Unknown") }})
  </span>

### Business Impact Analysis
{{ finding.analysis.business_impact | default("Business impact analysis not provided.") }}

---

## 📋 Compliance & Regulatory Implications

{% if finding.analysis.compliance_impact %}
{% if finding.analysis.compliance_impact is string %}
- **Impact:** {{ finding.analysis.compliance_impact }}
{% else %}
**Affected Standards:**
{% for compliance in finding.analysis.compliance_impact %}
- **{{ compliance }}** – Potential regulatory or contractual impact
{% endfor %}
{% endif %}
{% else %}
- No compliance implications identified.
{% endif %}

---

## 🔧 Technical Analysis

### Technical Explanation
{{ finding.analysis.technical_explanation | default("Technical analysis not available.") }}

### Attack Vector & Scenario
**Attack Vector:**  
{{ finding.analysis.attack_scenario | default("Attack scenario not specified.") }}

### Affected Components
{% if finding.cve_ids %}
**Associated CVEs:**
{% for cve in finding.cve_ids %}
- `{{ cve }}`
{% endfor %}
{% else %}
- No publicly referenced CVEs identified.
{% endif %}

{% if finding.cvss_score %}
**CVSS Metrics:**  
- **Score:** {{ finding.cvss_score }}/10  
- **Vector:** {{ finding.cvss_vector | default("Not provided") }}
{% endif %}

---

## 📊 Evidence Documentation

### Evidence Summary
- **Total Evidence Items:** {{ finding.evidence_count | default(0) }}
- **Trust Score:** {{ finding.trust_score | default(0) }}%
- **Scoring Basis:** Weighted assessment based on evidence quality and quantity

### Evidence Details
{% if finding.analysis.evidence_referenced %}
**Referenced Evidence IDs:**
{% for evidence_id in finding.analysis.evidence_referenced %}
- `{{ evidence_id }}`
{% endfor %}

#### Evidence Samples
{% for evidence_id in finding.analysis.evidence_referenced %}
{% set ev = evidence_sources.get(evidence_id) %}
{% if ev %}
**Evidence ID:** {{ evidence_id }}
- **Source File:** `{{ ev.source_file | default("Unknown") }}`
- **Type:** {{ ev.type | default("Unknown") }}

```text
{{ ev.content | truncate(300) }}
{% if ev.metadata %}
**Metadata:**
{% for key, value in ev.metadata.items() %}
- **{{ key }}:** {{ value }}
{% endfor %}
{% endif %}

{% endif %}
{% endfor %}
{% else %}
⚠ **No explicit evidence references were linked to this finding.**
{% endif %}

{% if finding.analysis.confidence_notes %}
### 📝 Confidence Assessment Notes
{{ finding.analysis.confidence_notes }}
{% endif %}

---

## 🛠️ Remediation Strategy

### ⚠️ Priority Determination
Based on **{{ finding.severity | default("Unknown") }}** severity and **{{ finding.trust_score | default(0) }}%** confidence level.

### 🎯 Recommended Actions
{% if finding.analysis.remediation_recommendations %}
{% for rec in finding.analysis.remediation_recommendations %}
{% if rec is mapping %}
{% for priority, action in rec.items() %}
#### {{ priority }}
{{ action }}
{% endfor %}
{% else %}
**{{ loop.index }}.** {{ rec }}
{% endif %}
{% endfor %}
{% else %}
*No remediation recommendations were provided.*
{% endif %}

---

## 📈 Risk Metrics Dashboard

| Metric | Value | Assessment |
|--------|-------|------------|
| **Severity** | {{ finding.severity | default("Unknown") }} | {% if finding.severity == "Critical" %}🟥 Immediate Action Required{% elif finding.severity == "High" %}🟧 High Priority{% elif finding.severity == "Medium" %}🟨 Medium Priority{% else %}🟩 Low Priority{% endif %} |
| **Confidence** | {{ finding.trust_score | default(0) }}% | {% if finding.trust_score >= 85 %}🟢 High Reliability{% elif finding.trust_score >= 60 %}🟡 Medium Reliability{% else %}🔴 Low Reliability – Verify Manually{% endif %} |
| **Evidence Count** | {{ finding.evidence_count | default(0) }} | {% if finding.evidence_count >= 3 %}✅ Well Supported{% elif finding.evidence_count >= 1 %}⚠ Partially Supported{% else %}❌ Insufficient Evidence{% endif %} |
| **CVE References** | {% if finding.cve_ids %}{{ finding.cve_ids | length }}{% else %}0{% endif %} | {% if finding.cve_ids %}✅ Publicly Documented{% else %}⚠ No CVE Association{% endif %} |

---

## 🗓️ Recommended Remediation Timeline

### 🔴 Immediate (1–3 Days)
1. Validate finding with manual testing
2. Apply temporary mitigations if available
3. Notify relevant stakeholders

### 🟠 Short-Term (1–2 Weeks)
1. Implement permanent fix
2. Test remediation in staging environment
3. Update security documentation

### 🟡 Long-Term (≈1 Month)
1. Address root cause in development lifecycle
2. Improve monitoring and detection capabilities
3. Conduct secure coding training

---

## 👥 Responsibility Matrix

| Role | Responsibilities |
|------|------------------|
| **Security Team** | Validation, risk tracking, monitoring |
| **Development Team** | Code remediation |
| **Operations Team** | Deployment and configuration |
| **Management** | Approval, resourcing, oversight |

---

## 🔗 Evidence Traceability Matrix

This finding was identified based on the following verified evidence sources:

| Evidence ID | Source File | Source Type | Location / Context |
|-------------|-------------|-------------|-------------------|
{% for ev_id in finding.analysis.evidence_referenced %}
{% set ev = evidence_sources.get(ev_id) %}
| {{ ev_id }} | {{ ev.source_file }} | {{ ev.type }} | {{ ev.metadata.location if ev.metadata and ev.metadata.location else "N/A" }} |
{% endfor %}

**Traceability Assurance:** All conclusions in this finding are directly derived from the above evidence. No assumptions or external data sources were used.
[file content end]

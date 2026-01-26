"""
Report generation with Role-Based Views (Executive & Technical).
Windows-safe PDF generation using wkhtmltopdf.
"""

import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict

import markdown
from jinja2 import Environment, FileSystemLoader, select_autoescape

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

from app.core.config import config
from app.core.evidence import EvidenceRegistry


# -------------------------------------------------
# Jinja helper (MUST be defined before registration)
# -------------------------------------------------
def jinja_extract(value, key=None, default=""):
    try:
        if value is None:
            return default
        if key is None:
            return value
        if isinstance(value, dict):
            return value.get(key, default)
        return getattr(value, key, default)
    except Exception:
        return default


class ReportGenerator:
    """Generates PDF and Markdown reports with role-based views."""

    def __init__(self, evidence_registry: EvidenceRegistry | None = None):
        self.evidence_registry = evidence_registry

        self.template_dir = Path(config.TEMPLATE_DIR)
        self.output_dir = Path(config.OUTPUT_DIR)
        self.output_dir.mkdir(exist_ok=True)

        self.jinja_env = Environment(
            loader=FileSystemLoader(self.template_dir),
            autoescape=select_autoescape(["html", "xml"]),
            trim_blocks=True,
            lstrip_blocks=True,
        )

        # Jinja filters
        self.jinja_env.filters["truncate"] = (
            lambda s, length=200: s[:length] + "..." if s and len(s) > length else s
        )
        self.jinja_env.filters["split"] = lambda s, delimiter=" ": s.split(delimiter)
        self.jinja_env.filters["extract"] = jinja_extract

    # -------------------------------------------------
    # PUBLIC API
    # -------------------------------------------------
    def generate_report(
        self,
        analysis_data: Dict,
        view_type: str = "executive",
        output_format: str = "pdf",
    ):
        if view_type not in ("executive", "technical"):
            raise ValueError("view_type must be 'executive' or 'technical'")

        template_data = self._prepare_template_data(analysis_data)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_filename = f"{view_type}_report_{timestamp}"

        if output_format == "pdf":
            return self._generate_pdf(template_data, view_type, base_filename)
        else:
            return self._generate_markdown(template_data, view_type, base_filename)

    def generate_both_views(self, analysis_data: Dict, output_format: str = "pdf"):
        return {
            "executive": self.generate_report(analysis_data, "executive", output_format),
            "technical": self.generate_report(analysis_data, "technical", output_format),
        }

    # -------------------------------------------------
    # TEMPLATE DATA (TRACEABILITY CORE)
    # -------------------------------------------------
    def _prepare_template_data(self, analysis_data: Dict) -> Dict:
        evidence_sources: Dict[str, Dict] = {}

        if self.evidence_registry:
            for finding in analysis_data.get("findings", []):
                for eid in finding.get("analysis", {}).get("evidence_referenced", []):
                    ev = self.evidence_registry.get_evidence_by_id(eid)
                    if ev:
                        evidence_sources[eid] = {
                            "id": ev.id,
                            "source_file": ev.source_file,
                            "type": ev.type.value,
                            "content": (ev.content or "")[:1000],
                            "metadata": ev.metadata or {},
                        }

        integrity_hash = hashlib.sha256(
            json.dumps(analysis_data, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest()

        return {
            **analysis_data,
            "report_date": datetime.now().strftime("%B %d, %Y"),
            "llm_model": config.LLM_MODEL,
            "evidence_sources": evidence_sources,
            "integrity_hash": integrity_hash,
        }

    # -------------------------------------------------
    # MARKDOWN
    # -------------------------------------------------
    def _generate_markdown(self, data: Dict, view: str, name: str) -> Path:
        template = self.jinja_env.get_template(f"{view}_report.md")
        content = template.render(**data)

        path = self.output_dir / f"{name}.md"
        path.write_text(content, encoding="utf-8", errors="ignore")
        return path

    # -------------------------------------------------
    # PDF
    # -------------------------------------------------
    def _generate_pdf(self, data: Dict, view: str, name: str) -> Path:
        md_path = self._generate_markdown(data, view, name)

        markdown_text = md_path.read_text(encoding="utf-8", errors="ignore")
        html = markdown.markdown(markdown_text, extensions=["tables", "fenced_code"])

        css = ""
        css_path = self.template_dir / "report_styles.css"
        if css_path.exists():
            css = css_path.read_text(encoding="utf-8", errors="ignore")

        html_doc = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>{css}</style>
</head>
<body>
{html}
</body>
</html>
"""

        html_path = self.output_dir / f"{name}.html"
        html_path.write_text(html_doc, encoding="utf-8", errors="ignore")

        pdf_path = self.output_dir / f"{name}.pdf"

        try:
            import pdfkit

            wkhtml = r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe"
            cfg = (
                pdfkit.configuration(wkhtmltopdf=wkhtml)
                if Path(wkhtml).exists()
                else None
            )

            pdfkit.from_file(
                str(html_path),
                str(pdf_path),
                configuration=cfg,
                options={
                    "enable-local-file-access": None,
                    "encoding": "UTF-8",
                    "quiet": "",
                },
            )

        except Exception as e:
            print("wkhtmltopdf failed, falling back:", e)
            pdf_path = self._generate_basic_pdf(data, view, name)

        md_path.unlink(missing_ok=True)
        html_path.unlink(missing_ok=True)
        return pdf_path

    # -------------------------------------------------
    # FALLBACK PDF (ALWAYS WORKS)
    # -------------------------------------------------
    def _generate_basic_pdf(self, data: Dict, view: str, name: str) -> Path:
        path = self.output_dir / f"{name}.pdf"
        doc = SimpleDocTemplate(str(path), pagesize=A4)

        styles = getSampleStyleSheet()
        story = [
            Paragraph(f"{view.title()} Security Report", styles["Title"]),
            Spacer(1, 12),
        ]

        for f in data.get("findings", []):
            story.append(Paragraph(f.get("title", "Unnamed Finding"), styles["Heading2"]))
            story.append(
                Paragraph(f.get("description", ""), styles["Normal"])
            )
            story.append(Spacer(1, 8))

        doc.build(story)
        return path

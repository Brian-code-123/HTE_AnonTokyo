"""
PDF Export Route

Endpoints:
  POST /api/export/pdf  – Generate a PDF report from an analysis
  POST /api/analyses    – Save an analysis result for later export/share/compare
  GET  /api/analyses/{id} – Get a saved analysis
  POST /api/comparison  – Compare multiple analyses side by side
"""
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.response import (
    PDFExportRequest,
    AnalysisSaveRequest,
    AnalysisDetail,
    ComparisonRequest,
    ComparisonResponse,
    ComparisonItem,
)
from app.services.persistence import save_analysis, get_analysis, list_analyses

router = APIRouter(tags=["export"])


@router.post("/api/analyses", response_model=AnalysisDetail)
async def store_analysis(body: AnalysisSaveRequest):
    save_analysis(
        body.analysis_id,
        body.teacher_id,
        body.teacher_name,
        body.lesson_title,
        body.lesson_date,
        body.scores,
        body.payload,
    )
    stored = get_analysis(body.analysis_id)
    if not stored:
        raise HTTPException(500, "Failed to save analysis")
    return AnalysisDetail(**stored)


@router.get("/api/analyses/{analysis_id}", response_model=AnalysisDetail)
async def fetch_analysis(analysis_id: str):
    found = get_analysis(analysis_id)
    if not found:
        raise HTTPException(404, "Analysis not found")
    return AnalysisDetail(**found)


@router.get("/api/analyses", response_model=list[AnalysisDetail])
async def fetch_all_analyses(teacher_id: str | None = None, limit: int = 100):
    rows = list_analyses(teacher_id=teacher_id, limit=limit)
    results = []
    for r in rows:
        full = get_analysis(r["id"])
        if full:
            results.append(AnalysisDetail(**full))
    return results


@router.post("/api/comparison", response_model=ComparisonResponse)
async def compare_analyses(body: ComparisonRequest):
    if len(body.analysis_ids) < 2:
        raise HTTPException(400, "At least 2 analysis IDs are required")
    items: list[ComparisonItem] = []
    for aid in body.analysis_ids:
        a = get_analysis(aid)
        if not a:
            raise HTTPException(404, f"Analysis {aid} not found")
        items.append(ComparisonItem(
            id=a["id"],
            teacher_name=a["teacher_name"],
            lesson_title=a["lesson_title"],
            lesson_date=a["lesson_date"],
            overall_score=a["overall_score"],
            pace_score=a["pace_score"],
            body_score=a["body_score"],
            clarity_score=a["clarity_score"],
            engagement_score=a["engagement_score"],
        ))

    # Calculate score differences (max - min for each metric)
    keys = ["overall_score", "pace_score", "body_score", "clarity_score", "engagement_score"]
    diffs = {}
    for k in keys:
        vals = [getattr(i, k) for i in items]
        diffs[k] = round(max(vals) - min(vals), 1)

    return ComparisonResponse(items=items, score_differences=diffs)


@router.post("/api/export/pdf")
async def export_pdf(body: PDFExportRequest):
    analysis = get_analysis(body.analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")

    # Build HTML report → convert to PDF-like content
    html = _build_report_html(analysis, body)
    pdf_bytes = _html_to_pdf_bytes(html)

    filename = f"analysis_{body.analysis_id[:8]}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _build_report_html(analysis: dict, opts: PDFExportRequest) -> str:
    """Build an HTML string for the PDF report."""
    payload = analysis.get("payload", {})
    sections = []

    sections.append(f"""
    <h1>Teaching Analysis Report</h1>
    <p><strong>Teacher:</strong> {analysis['teacher_name']}</p>
    <p><strong>Lesson:</strong> {analysis['lesson_title']}</p>
    <p><strong>Date:</strong> {analysis['lesson_date']}</p>
    <hr>
    <h2>Scores</h2>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; width:100%">
      <tr><th>Metric</th><th>Score</th></tr>
      <tr><td>Overall</td><td>{analysis['overall_score']}</td></tr>
      <tr><td>Pace</td><td>{analysis['pace_score']}</td></tr>
      <tr><td>Body Language</td><td>{analysis['body_score']}</td></tr>
      <tr><td>Clarity</td><td>{analysis['clarity_score']}</td></tr>
      <tr><td>Engagement</td><td>{analysis['engagement_score']}</td></tr>
    </table>
    """)

    if opts.include_body_language and payload.get("body_language"):
        bl = payload["body_language"]
        report = bl.get("combined_report", "N/A")
        sections.append(f"<h2>Body Language Analysis</h2><div>{report[:3000]}</div>")

    if opts.include_knowledge_points and payload.get("knowledge_points"):
        kp = payload["knowledge_points"]
        points = kp.get("points", [])
        rows = "".join(
            f"<tr><td>{p.get('topic','')}</td><td>{p.get('content_score',0)}</td>"
            f"<td>{p.get('presentation_score',0)}</td></tr>"
            for p in points[:20]
        )
        sections.append(f"""
        <h2>Knowledge Point Analysis</h2>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%">
          <tr><th>Topic</th><th>Content</th><th>Presentation</th></tr>
          {rows}
        </table>
        """)

    if opts.include_transcript and payload.get("transcript"):
        t = payload["transcript"]
        text = t.get("full_text", "")[:5000]
        sections.append(f"<h2>Transcript</h2><pre style='white-space:pre-wrap'>{text}</pre>")

    body = "\n".join(sections)
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body {{ font-family: Arial, sans-serif; padding: 40px; color: #222; }}
h1 {{ color: #1a56db; }} h2 {{ color: #333; margin-top: 24px; }}
table {{ margin: 12px 0; }} th {{ background: #f0f4ff; }}
</style></head><body>{body}
<p style="color:#999; margin-top:40px; font-size:12px">
Generated by VoiceTrace — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}
</p></body></html>"""


def _html_to_pdf_bytes(html: str) -> bytes:
    """
    Convert HTML to PDF bytes.
    Uses basic HTML-as-PDF approach. For a production system, use weasyprint or wkhtmltopdf.
    Here we return the HTML bytes with PDF content-type for a MVP download.
    """
    # Try weasyprint if available, otherwise return HTML as downloadable
    try:
        from weasyprint import HTML  # type: ignore
        return HTML(string=html).write_pdf()
    except ImportError:
        # Fallback: return HTML bytes (browsers can still render this)
        return html.encode("utf-8")

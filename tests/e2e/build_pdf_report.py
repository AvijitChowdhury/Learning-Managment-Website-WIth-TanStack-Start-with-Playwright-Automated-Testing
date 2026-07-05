"""Build a PDF summary of the last E2E run from Allure results.

Reads tests/e2e/allure-results/*-result.json plus
tests/e2e/allure-report/widgets/summary.json, and writes a portable PDF to
/mnt/documents/e2e-test-report.pdf.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[2]
RESULTS_DIR = ROOT / "tests" / "e2e" / "allure-results"
REPORT_DIR = ROOT / "tests" / "e2e" / "allure-report"
OUT = Path("/mnt/documents/e2e-test-report.pdf")


def load_results() -> list[dict]:
    items = []
    for f in RESULTS_DIR.glob("*-result.json"):
        try:
            items.append(json.loads(f.read_text(encoding="utf-8")))
        except Exception:
            pass
    # Order by suite then start time
    items.sort(key=lambda r: (r["name"].split(".", 1)[0], r.get("start", 0)))
    return items


def load_summary() -> dict:
    p = REPORT_DIR / "widgets" / "summary.json"
    if p.exists():
        return json.loads(p.read_text())
    return {}


def load_env() -> list[tuple[str, str]]:
    p = RESULTS_DIR / "environment.properties"
    if not p.exists():
        return []
    out = []
    for line in p.read_text().splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip()
            # Mask the E2E test account email so the report never leaks it.
            if k == "AUTH" and "@" in v:
                v = v.split(" as ", 1)[0] + " as ***"
            out.append((k, v))
    return out


def build_pdf() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    results = load_results()
    summary = load_summary()
    env = load_env()

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle(
        "H1",
        parent=styles["Title"],
        fontSize=22,
        spaceAfter=6,
        textColor=colors.HexColor("#111827"),
    )
    h2 = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontSize=14,
        spaceBefore=14,
        spaceAfter=6,
        textColor=colors.HexColor("#1f2937"),
    )
    body = ParagraphStyle("B", parent=styles["Normal"], fontSize=10, leading=14)
    small = ParagraphStyle(
        "S",
        parent=styles["Normal"],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#4b5563"),
    )

    story = []
    story.append(Paragraph("End-to-End Test Report", h1))
    story.append(
        Paragraph(
            "Bengali LMS Platform &middot; Playwright + Python &middot; Allure-backed",
            small,
        )
    )
    story.append(
        Paragraph(f"Generated {time.strftime('%Y-%m-%d %H:%M:%S %Z')}", small)
    )
    story.append(Spacer(1, 10))

    # Summary block
    stat = summary.get("statistic", {})
    tinfo = summary.get("time", {})
    total = stat.get("total", len(results))
    passed = stat.get("passed", sum(1 for r in results if r["status"] == "passed"))
    failed = stat.get("failed", sum(1 for r in results if r["status"] == "failed"))
    dur_s = (tinfo.get("duration", 0) or 0) / 1000
    pass_rate = (passed / total * 100) if total else 0

    story.append(Paragraph("Summary", h2))
    sum_table = Table(
        [
            ["Total", "Passed", "Failed", "Pass rate", "Duration"],
            [
                str(total),
                str(passed),
                str(failed),
                f"{pass_rate:.1f}%",
                f"{dur_s:.1f}s",
            ],
        ],
        colWidths=[1.2 * inch] * 5,
    )
    sum_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("TEXTCOLOR", (1, 1), (1, 1), colors.HexColor("#059669")),
                (
                    "TEXTCOLOR",
                    (2, 1),
                    (2, 1),
                    colors.HexColor("#dc2626" if failed else "#059669"),
                ),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ]
        )
    )
    story.append(sum_table)

    # Environment
    if env:
        story.append(Paragraph("Environment", h2))
        env_rows = [["Key", "Value"]] + [[k, v] for k, v in env]
        env_table = Table(env_rows, colWidths=[1.5 * inch, 4.5 * inch])
        env_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e5e7eb")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(env_table)

    # Per-suite breakdown
    story.append(Paragraph("Results by Suite", h2))
    by_suite: dict[str, list[dict]] = {}
    for r in results:
        by_suite.setdefault(r["name"].split(".", 1)[0], []).append(r)

    for suite in sorted(by_suite):
        rows = by_suite[suite]
        s_pass = sum(1 for r in rows if r["status"] == "passed")
        s_fail = len(rows) - s_pass
        story.append(
            Paragraph(
                f"<b>{suite}</b> — {s_pass}/{len(rows)} passed"
                + (f", {s_fail} failed" if s_fail else ""),
                body,
            )
        )
        table_rows = [["#", "Test", "Status", "Duration", "Detail"]]
        for i, r in enumerate(rows, 1):
            dur = ((r.get("stop", 0) - r.get("start", 0)) / 1000) if r.get("stop") else 0
            detail_txt = ""
            if r["status"] == "passed":
                # Try to extract the pass detail from full name — not stored; leave blank.
                detail_txt = ""
            else:
                sd = r.get("statusDetails", {}) or {}
                detail_txt = (sd.get("message") or "")[:120]
            table_rows.append(
                [
                    str(i),
                    r["name"],
                    r["status"].upper(),
                    f"{dur:.2f}s",
                    Paragraph(detail_txt or "&nbsp;", small),
                ]
            )
        t = Table(
            table_rows,
            colWidths=[0.3 * inch, 2.2 * inch, 0.8 * inch, 0.8 * inch, 2.4 * inch],
            repeatRows=1,
        )
        style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e5e7eb")),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]
        for i, r in enumerate(rows, 1):
            colr = colors.HexColor("#059669") if r["status"] == "passed" else colors.HexColor("#dc2626")
            style_cmds.append(("TEXTCOLOR", (2, i), (2, i), colr))
            style_cmds.append(("FONTNAME", (2, i), (2, i), "Helvetica-Bold"))
        t.setStyle(TableStyle(style_cmds))
        story.append(t)
        story.append(Spacer(1, 8))

    # Footer note
    story.append(Spacer(1, 10))
    story.append(
        Paragraph(
            "Full interactive report: <b>tests/e2e/allure-report/index.html</b>. "
            "Regenerate with <b>nix run nixpkgs#allure -- serve tests/e2e/allure-results</b>.",
            small,
        )
    )

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=letter,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        title="E2E Test Report",
        author="Playwright E2E runner",
    )
    doc.build(story)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    build_pdf()

"""Exports CSV et PDF."""

import csv
import io
from datetime import UTC, datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..schemas.draws import Draw
from ..stats.disclaimers import INDEPENDENCE_NOTICE, STATS_DISCLAIMER


def draws_to_csv(draws: list[Draw], limit: int | None = None) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["date", "n1", "n2", "n3", "n4", "n5", "chance", "source"])
    selected = draws if limit is None else draws[-limit:]
    for draw in selected:
        writer.writerow([draw.draw_date.isoformat(), *draw.numbers, draw.chance, draw.source])
    return output.getvalue()


def analysis_to_pdf(title: str, sections: list[tuple[str, list[list[str]]]]) -> bytes:
    """Génère un rapport PDF : liste de sections (titre, tableau)."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        title=title,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
    )
    styles = getSampleStyleSheet()
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=8, textColor=colors.grey)

    elements = [
        Paragraph(f"LotoLab IA — {title}", styles["Title"]),
        Paragraph(
            f"Généré le {datetime.now(UTC).strftime('%d/%m/%Y %H:%M UTC')}",
            small,
        ),
        Spacer(1, 12),
    ]
    for section_title, rows in sections:
        elements.append(Paragraph(section_title, styles["Heading2"]))
        table = Table(rows, hAlign="LEFT")
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0D1B2A")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#B0BEC5")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F4F7FA")]),
                ]
            )
        )
        elements.extend([table, Spacer(1, 14)])

    elements.append(Paragraph(STATS_DISCLAIMER, small))
    elements.append(Paragraph(INDEPENDENCE_NOTICE, small))
    doc.build(elements)
    return buffer.getvalue()

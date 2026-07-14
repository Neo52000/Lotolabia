"""Tests du parseur de fichiers de résultats (fixtures fictives)."""

import io
import zipfile
from datetime import date

import pytest

from app.collector.parser import (
    FormatChangeError,
    ParserError,
    parse_results_file,
    validate_draw_values,
)

FDJ_STYLE_CSV = (
    "annee_numero_de_tirage;jour_de_tirage;date_de_tirage;boule_1;boule_2;boule_3;boule_4;boule_5;numero_chance\n"
    "2020001;SAMEDI;04/01/2020;3;12;24;37;48;6\n"
    "2020002;LUNDI;06/01/2020;1;9;24;31;43;10\n"
)

SIMPLE_CSV = "date,n1,n2,n3,n4,n5,chance\n2020-01-04,3,12,24,37,48,6\n"


def test_parse_fdj_style_format():
    result = parse_results_file(FDJ_STYLE_CSV.encode("utf-8"))
    assert len(result.rows) == 2
    assert result.rejected == []
    assert result.delimiter == ";"
    assert result.rows[0].draw_date == date(2020, 1, 4)
    assert result.rows[0].numbers == [3, 12, 24, 37, 48]
    assert result.rows[0].chance == 6


def test_parse_simple_format():
    result = parse_results_file(SIMPLE_CSV.encode("utf-8"))
    assert len(result.rows) == 1
    assert result.delimiter == ","


def test_parse_zip_archive():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("resultats.csv", FDJ_STYLE_CSV)
    result = parse_results_file(buffer.getvalue())
    assert len(result.rows) == 2


def test_zip_without_csv_rejected():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("lisez-moi.txt", "rien")
    with pytest.raises(ParserError):
        parse_results_file(buffer.getvalue())


def test_format_change_detection():
    changed = "colonne_inconnue;autre\n1;2\n"
    with pytest.raises(FormatChangeError):
        parse_results_file(changed.encode("utf-8"))


def test_empty_file_rejected():
    with pytest.raises(ParserError):
        parse_results_file(b"")


def test_invalid_rows_are_rejected_not_dropped_silently():
    csv_data = (
        "date,n1,n2,n3,n4,n5,chance\n"
        "2020-01-04,3,12,24,37,48,6\n"
        "2020-01-06,3,3,24,37,48,6\n"      # doublon de numéro
        "2020-01-08,0,12,24,37,48,6\n"     # hors plage
        "2020-01-11,3,12,24,37,48,11\n"    # chance hors plage
        "pas-une-date,3,12,24,37,48,6\n"   # date illisible
        "2999-01-01,3,12,24,37,48,6\n"     # date future
    )
    result = parse_results_file(csv_data.encode("utf-8"))
    assert len(result.rows) == 1
    assert len(result.rejected) == 5
    reasons = " ".join(r.reason for r in result.rejected)
    assert "double" in reasons
    assert "hors plage" in reasons
    assert "futur" in reasons.lower()


def test_multiple_date_formats():
    csv_data = "date,n1,n2,n3,n4,n5,chance\n06/01/2020,1,2,3,4,5,1\n"
    result = parse_results_file(csv_data.encode("utf-8"))
    assert result.rows[0].draw_date == date(2020, 1, 6)


def test_latin1_fallback():
    content = "date;n1;n2;n3;n4;n5;chance\n2020-01-04;1;2;3;4;5;1\n".encode("latin-1")
    result = parse_results_file(content)
    assert len(result.rows) == 1


def test_validate_draw_values():
    assert validate_draw_values(date(2020, 1, 1), [1, 2, 3, 4, 5], 1) == []
    assert validate_draw_values(date(1970, 1, 1), [1, 2, 3, 4, 5], 1)  # avant 1976
    assert validate_draw_values(date(2020, 1, 1), [1, 2, 3, 4], 1)     # 4 numéros

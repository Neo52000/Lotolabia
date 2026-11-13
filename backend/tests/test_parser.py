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


def test_html_page_rejected_with_explicit_message():
    # Cas réel : l'URL de la page historique au lieu du lien de téléchargement du fichier.
    page = '<!doctype html><html lang="fr"><head><meta charset="utf-8"/></head><body></body></html>'
    with pytest.raises(ParserError) as excinfo:
        parse_results_file(("\n  " + page).encode("utf-8"))
    assert not isinstance(excinfo.value, FormatChangeError)
    assert "page web" in str(excinfo.value)


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


# --- Gains par rang et second tirage -----------------------------------------

FDJ_FULL_HEADER = (
    "annee_numero_de_tirage;jour_de_tirage;date_de_tirage;boule_1;boule_2;boule_3;boule_4;boule_5;"
    "numero_chance;"
    + ";".join(
        f"nombre_de_gagnant_au_rang{n};rapport_du_rang{n}" for n in range(1, 10)
    )
    + ";boule_1_second_tirage;boule_2_second_tirage;boule_3_second_tirage;boule_4_second_tirage;"
    "boule_5_second_tirage;promotion_second_tirage;"
    + ";".join(
        f"nombre_de_gagnant_au_rang_{n}_second_tirage;rapport_du_rang{n}_second_tirage"
        for n in range(1, 5)
    )
    + "\n"
)
# Valeurs réelles du tirage du 11/11/2026 (virgule décimale, séparateur ;).
FDJ_FULL_ROW = (
    "26135;MERCREDI;11/11/2026;5;14;17;29;4;8;"
    "0;15000000,00;4;47600,90;72;645,40;675;248,30;2926;34,20;25132;14,30;33108;8,40;"
    "296993;3,70;365813;2,20;"
    "18;30;34;35;44;;1;133947,00;152;1033,10;8636;46,70;139908;3,00\n"
)


def _row(content: str):
    result = parse_results_file(content.encode("utf-8"))
    assert result.rejected == []
    return result, result.rows[0]


def test_parse_prizes_and_second_draw():
    result, row = _row(FDJ_FULL_HEADER + FDJ_FULL_ROW)
    assert row.numbers == [4, 5, 14, 17, 29]
    assert row.jackpot_euros == 15_000_000
    assert row.prizes is not None and len(row.prizes) == 9
    assert row.prizes["1"] == {"winners": 0, "amount": 15_000_000.0}
    assert row.prizes["2"] == {"winners": 4, "amount": 47600.9}
    assert row.prizes["9"] == {"winners": 365813, "amount": 2.2}
    assert row.second_draw == {
        "numbers": [18, 30, 34, 35, 44],
        "promotion": None,
        "prizes": {
            "1": {"winners": 1, "amount": 133947.0},
            "2": {"winners": 152, "amount": 1033.1},
            "3": {"winners": 8636, "amount": 46.7},
            "4": {"winners": 139908, "amount": 3.0},
        },
    }
    assert result.details_incomplete == 0


def test_parse_legacy_number_formats():
    # Anciennes lignes : décimale tronquée, entiers sans « ,00 », promotion renseignée.
    content = FDJ_FULL_HEADER + FDJ_FULL_ROW.replace("47600,90", "47600,9").replace(
        "15000000,00", "15000000"
    ).replace(";;1;133947,00", ";2;1;133947")
    _, row = _row(content)
    assert row.prizes["2"]["amount"] == 47600.9
    assert row.jackpot_euros == 15_000_000
    assert row.second_draw["promotion"] == 2
    assert row.second_draw["prizes"]["1"]["amount"] == 133947.0


def test_details_absent_from_simple_format():
    _, row = _row(SIMPLE_CSV)
    assert row.jackpot_euros is None
    assert row.prizes is None
    assert row.second_draw is None


def test_unreadable_prize_cell_keeps_draw_and_flags_it():
    content = FDJ_FULL_HEADER + FDJ_FULL_ROW.replace("47600,90", "n/a")
    result, row = _row(content)
    assert row.numbers == [4, 5, 14, 17, 29]  # le tirage reste importé
    assert "2" not in row.prizes and "1" in row.prizes  # seul le rang illisible est omis
    assert result.details_incomplete == 1


def test_invalid_second_draw_is_dropped_not_rejected():
    content = FDJ_FULL_HEADER + FDJ_FULL_ROW.replace(";18;30;34;35;44;", ";18;30;34;35;35;")
    result, row = _row(content)
    assert row.second_draw is None
    assert row.prizes is not None
    assert result.details_incomplete == 1


def test_empty_second_draw_is_none_without_warning():
    content = FDJ_FULL_HEADER + FDJ_FULL_ROW.replace(";18;30;34;35;44;", ";;;;;;")
    result, row = _row(content)
    assert row.second_draw is None
    assert result.details_incomplete == 0

"""Parseur des fichiers de résultats officiels.

Formats supportés :
  * CSV « historique » publié par l'opérateur (séparateur `;`, colonnes
    `date_de_tirage`, `boule_1`..`boule_5`, `numero_chance`) ;
  * CSV simple (séparateur `,`, colonnes `date`, `n1`..`n5`, `chance`) —
    format d'import manuel documenté ;
  * archives ZIP contenant l'un des CSV ci-dessus.

Le parseur détecte automatiquement le séparateur et le mappage de colonnes.
Si aucun mappage connu ne correspond, une `FormatChangeError` est levée :
le job d'import échoue explicitement et l'administrateur est alerté (le
format source a probablement changé).

Chaque ligne invalide est retournée séparément avec sa raison, pour mise en
quarantaine — jamais insérée ni corrigée silencieusement.
"""

import csv
import io
import zipfile
from dataclasses import dataclass, field
from datetime import date, datetime

# Mappages de colonnes connus, du plus spécifique au plus générique.
COLUMN_MAPPINGS: list[dict[str, list[str]]] = [
    {
        "date": ["date_de_tirage"],
        "numbers": ["boule_1", "boule_2", "boule_3", "boule_4", "boule_5"],
        "chance": ["numero_chance"],
    },
    {
        "date": ["date"],
        "numbers": ["n1", "n2", "n3", "n4", "n5"],
        "chance": ["chance"],
    },
]

DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y", "%Y%m%d")


class ParserError(Exception):
    """Erreur de parsing bloquante (fichier illisible)."""


class FormatChangeError(ParserError):
    """Les colonnes attendues sont introuvables : le format source a changé."""


@dataclass
class ParsedRow:
    draw_date: date
    numbers: list[int]
    chance: int


@dataclass
class RejectedRow:
    raw: dict
    reason: str


@dataclass
class ParseResult:
    rows: list[ParsedRow] = field(default_factory=list)
    rejected: list[RejectedRow] = field(default_factory=list)
    mapping_used: int = -1
    delimiter: str = ";"


def _maybe_unzip(content: bytes) -> bytes:
    if content[:4] == b"PK\x03\x04":
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            csv_names = [n for n in archive.namelist() if n.lower().endswith(".csv")]
            if not csv_names:
                raise ParserError("Archive ZIP sans fichier CSV.")
            return archive.read(csv_names[0])
    return content


def _detect_delimiter(sample: str) -> str:
    header = sample.splitlines()[0] if sample.splitlines() else ""
    return ";" if header.count(";") >= header.count(",") else ","


def _find_mapping(fieldnames: list[str]) -> tuple[int, dict[str, list[str]]]:
    normalized = {name.strip().lower() for name in fieldnames}
    for index, mapping in enumerate(COLUMN_MAPPINGS):
        required = set(mapping["date"] + mapping["numbers"] + mapping["chance"])
        if required.issubset(normalized):
            return index, mapping
    raise FormatChangeError(
        "Colonnes attendues introuvables — le format du fichier source a probablement changé. "
        f"Colonnes reçues : {sorted(normalized)[:20]}"
    )


def _parse_date(value: str) -> date:
    cleaned = value.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Date illisible : {cleaned!r}")


def parse_results_file(content: bytes) -> ParseResult:
    payload = _maybe_unzip(content)
    try:
        text = payload.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = payload.decode("latin-1")

    if not text.strip():
        raise ParserError("Fichier vide.")

    delimiter = _detect_delimiter(text)
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    if not reader.fieldnames:
        raise ParserError("Fichier sans en-tête.")
    mapping_index, mapping = _find_mapping(list(reader.fieldnames))

    normalized_names = {name.strip().lower(): name for name in reader.fieldnames}

    def get(row: dict, key: str) -> str:
        return (row.get(normalized_names[key]) or "").strip()

    result = ParseResult(mapping_used=mapping_index, delimiter=delimiter)
    for row in reader:
        raw = {k: v for k, v in row.items() if k}
        try:
            draw_date = _parse_date(get(row, mapping["date"][0]))
            numbers = [int(get(row, column)) for column in mapping["numbers"]]
            chance = int(get(row, mapping["chance"][0]))
        except (ValueError, KeyError) as exc:
            result.rejected.append(RejectedRow(raw=raw, reason=f"Ligne illisible : {exc}"))
            continue

        problems = validate_draw_values(draw_date, numbers, chance)
        if problems:
            result.rejected.append(RejectedRow(raw=raw, reason="; ".join(problems)))
            continue
        result.rows.append(ParsedRow(draw_date=draw_date, numbers=sorted(numbers), chance=chance))
    return result


def validate_draw_values(draw_date: date, numbers: list[int], chance: int) -> list[str]:
    problems: list[str] = []
    if draw_date > date.today():
        problems.append("Date dans le futur.")
    if draw_date.year < 1976:  # premier tirage du Loto français : 1976
        problems.append("Date antérieure au premier tirage du Loto (1976).")
    if len(numbers) != 5:
        problems.append("Il faut exactement cinq numéros.")
    if len(set(numbers)) != len(numbers):
        problems.append("Numéros en double.")
    if any(n < 1 or n > 49 for n in numbers):
        problems.append("Numéro hors plage 1-49.")
    if chance < 1 or chance > 10:
        problems.append("Numéro Chance hors plage 1-10.")
    return problems

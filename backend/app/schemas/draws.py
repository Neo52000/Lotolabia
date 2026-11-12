"""Schémas Pydantic des tirages."""

from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


def validate_main_numbers(values: list[int]) -> list[int]:
    if len(set(values)) != 5:
        raise ValueError("Les cinq numéros doivent être distincts.")
    if any(number < 1 or number > 49 for number in values):
        raise ValueError("Chaque numéro doit être compris entre 1 et 49.")
    return sorted(values)


def validate_chance_number(value: int) -> int:
    if value < 1 or value > 10:
        raise ValueError("Le numéro Chance doit être compris entre 1 et 10.")
    return value


class DrawBase(BaseModel):
    draw_date: date
    numbers: list[int] = Field(min_length=5, max_length=5)
    chance: int

    @field_validator("numbers")
    @classmethod
    def _numbers(cls, values: list[int]) -> list[int]:
        return validate_main_numbers(values)

    @field_validator("chance")
    @classmethod
    def _chance(cls, value: int) -> int:
        return validate_chance_number(value)


class PrizeRank(BaseModel):
    """Gagnants et gain unitaire (en euros) d'un rang."""

    winners: int = Field(ge=0)
    amount: float = Field(ge=0)


class SecondDraw(BaseModel):
    """Second tirage du Loto : 5 numéros, promotion éventuelle, rangs 1 à 4."""

    numbers: list[int] = Field(min_length=5, max_length=5)
    promotion: int | None = None
    prizes: dict[str, PrizeRank] = Field(default_factory=dict)

    @field_validator("numbers")
    @classmethod
    def _numbers(cls, values: list[int]) -> list[int]:
        return validate_main_numbers(values)


class DrawDetails(BaseModel):
    """Détails optionnels issus des fichiers officiels (absents des imports manuels)."""

    jackpot_euros: int | None = Field(default=None, ge=0)
    prizes: dict[str, PrizeRank] | None = None
    second_draw: SecondDraw | None = None


class DrawCreate(DrawBase, DrawDetails):
    source: str = "manual"
    source_url: str | None = None


class Draw(DrawBase, DrawDetails):
    id: int
    draw_type: str = "loto"
    source: str = "manual"
    source_url: str | None = None
    retrieved_at: datetime | None = None


class DrawPage(BaseModel):
    items: list[Draw]
    total: int
    page: int
    page_size: int
    truncated: bool = Field(
        default=False,
        description="Vrai si l'historique a été tronqué par la limite de l'offre gratuite.",
    )

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


class DrawCreate(DrawBase):
    source: str = "manual"
    source_url: str | None = None


class Draw(DrawBase):
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

"""Schémas Pydantic du générateur de grilles et des grilles enregistrées."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from .draws import validate_chance_number, validate_main_numbers

GenerationMethod = Literal[
    "random",            # aléatoire pur
    "frequency",         # pondération par fréquence historique
    "delay",             # pondération par retard
    "balanced",          # équilibrages pair/impair et bas/haut
    "sum_controlled",    # contrôle de la somme des numéros
    "diversified",       # diversification entre grilles générées
]


class GenerationRequest(BaseModel):
    method: GenerationMethod = "random"
    count: int = Field(default=1, ge=1, le=20, description="Nombre de grilles à générer")
    seed: int | None = Field(default=None, description="Graine pour une génération reproductible")
    excluded_numbers: list[int] = Field(default_factory=list, max_length=44)
    favorite_numbers: list[int] = Field(default_factory=list, max_length=5)
    sum_min: int | None = Field(default=None, ge=15, le=235)
    sum_max: int | None = Field(default=None, ge=15, le=235)

    @field_validator("excluded_numbers", "favorite_numbers")
    @classmethod
    def _check_range(cls, values: list[int]) -> list[int]:
        if any(v < 1 or v > 49 for v in values):
            raise ValueError("Les numéros doivent être compris entre 1 et 49.")
        if len(set(values)) != len(values):
            raise ValueError("Les numéros doivent être distincts.")
        return values


class GeneratedGrid(BaseModel):
    numbers: list[int]
    chance: int
    method: str
    method_label: str
    seed: int | None = None
    warning: str


class GenerationResponse(BaseModel):
    grids: list[GeneratedGrid]
    warning: str


class SavedGridCreate(BaseModel):
    name: str | None = Field(default=None, max_length=80)
    numbers: list[int] = Field(min_length=5, max_length=5)
    chance: int
    method: str = "manual"
    seed: int | None = None

    @field_validator("numbers")
    @classmethod
    def _numbers(cls, values: list[int]) -> list[int]:
        return validate_main_numbers(values)

    @field_validator("chance")
    @classmethod
    def _chance(cls, value: int) -> int:
        return validate_chance_number(value)


class SavedGrid(SavedGridCreate):
    id: int
    created_at: datetime | None = None

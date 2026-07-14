from datetime import date
from pydantic import BaseModel, Field, field_validator

class Draw(BaseModel):
    date: date
    numbers: list[int] = Field(min_length=5, max_length=5)
    chance: int

    @field_validator("numbers")
    @classmethod
    def validate_numbers(cls, values: list[int]) -> list[int]:
        if len(set(values)) != 5:
            raise ValueError("Les cinq numéros doivent être distincts.")
        if any(number < 1 or number > 49 for number in values):
            raise ValueError("Chaque numéro doit être compris entre 1 et 49.")
        return sorted(values)

    @field_validator("chance")
    @classmethod
    def validate_chance(cls, value: int) -> int:
        if value < 1 or value > 10:
            raise ValueError("Le numéro Chance doit être compris entre 1 et 10.")
        return value

class WeightedGrid(BaseModel):
    numbers: list[int]
    chance: int
    method: str
    warning: str

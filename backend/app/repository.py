import csv
from datetime import date
from pathlib import Path
from .models import Draw

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "tirages.csv"

def load_draws() -> list[Draw]:
    if not DATA_FILE.exists():
        return []
    draws: list[Draw] = []
    with DATA_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            draws.append(
                Draw(
                    date=date.fromisoformat(row["date"]),
                    numbers=[int(row[f"n{i}"]) for i in range(1, 6)],
                    chance=int(row["chance"]),
                )
            )
    return sorted(draws, key=lambda draw: draw.date)

def save_draws(draws: list[Draw]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DATA_FILE.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["date", "n1", "n2", "n3", "n4", "n5", "chance"])
        for draw in sorted(draws, key=lambda item: item.date):
            writer.writerow([draw.date.isoformat(), *draw.numbers, draw.chance])

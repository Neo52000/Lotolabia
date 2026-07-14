from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from .models import Draw
from .repository import load_draws, save_draws
from .statistics import frequencies, delays, cooccurrences, weighted_grid, monte_carlo

app = FastAPI(
    title="LotoLab IA API",
    version="0.1.0",
    description="API d'analyse statistique des tirages du Loto.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}

@app.get("/draws")
def get_draws(limit: int = 100) -> list[Draw]:
    return list(reversed(load_draws()))[: max(1, min(limit, 5000))]

@app.post("/draws")
def add_draw(draw: Draw) -> Draw:
    draws = load_draws()
    if any(item.date == draw.date for item in draws):
        raise HTTPException(status_code=409, detail="Un tirage existe déjà à cette date.")
    draws.append(draw)
    save_draws(draws)
    return draw

@app.post("/draws/import")
async def import_draws(file: UploadFile = File(...)) -> dict:
    content = (await file.read()).decode("utf-8-sig")
    temp = __import__("csv").DictReader(content.splitlines())
    imported: list[Draw] = []
    for row in temp:
        imported.append(
            Draw(
                date=row["date"],
                numbers=[int(row[f"n{i}"]) for i in range(1, 6)],
                chance=int(row["chance"]),
            )
        )
    save_draws(imported)
    return {"imported": len(imported)}

@app.get("/analysis/frequencies")
def get_frequencies() -> dict:
    return frequencies(load_draws())

@app.get("/analysis/delays")
def get_delays() -> dict:
    return delays(load_draws())

@app.get("/analysis/cooccurrences")
def get_cooccurrences(limit: int = 20) -> list[dict]:
    return cooccurrences(load_draws(), limit=max(1, min(limit, 200)))

@app.get("/analysis/grid")
def generate_grid(seed: int | None = None) -> dict:
    return weighted_grid(load_draws(), seed=seed).model_dump()

@app.get("/analysis/monte-carlo")
def run_monte_carlo(iterations: int = 10000, seed: int | None = None) -> dict:
    return monte_carlo(
        load_draws(),
        iterations=max(100, min(iterations, 250000)),
        seed=seed,
    )

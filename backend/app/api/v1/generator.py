"""Endpoint du générateur de grilles expérimentales."""

from fastapi import APIRouter, Depends

from ...core.security import AuthUser, get_optional_user
from ...generator import grids as generator
from ...schemas.draws import Draw
from ...schemas.grids import GenerationRequest, GenerationResponse
from ...services.premium import PremiumPolicy
from ...stats.disclaimers import GENERATOR_DISCLAIMER
from ..deps import get_all_draws_cached, get_policy

router = APIRouter(prefix="/generator", tags=["Générateur"])


@router.post("", response_model=GenerationResponse)
async def generate_grids(
    request: GenerationRequest,
    user: AuthUser | None = Depends(get_optional_user),
    policy: PremiumPolicy = Depends(get_policy),
    draws: list[Draw] = Depends(get_all_draws_cached),
) -> GenerationResponse:
    policy.check_generation(user, request)
    generated = generator.generate(request, draws)
    return GenerationResponse(grids=generated, warning=GENERATOR_DISCLAIMER)


@router.get("/methods")
async def list_methods() -> dict:
    return {
        "methods": [
            {"code": code, "label": label} for code, label in generator.METHOD_LABELS.items()
        ],
        "warning": GENERATOR_DISCLAIMER,
    }

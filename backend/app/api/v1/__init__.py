from fastapi import APIRouter

from . import admin, draws, generator, stats, users

router = APIRouter()
router.include_router(draws.router)
router.include_router(stats.router)
router.include_router(generator.router)
router.include_router(users.router)
router.include_router(admin.router)

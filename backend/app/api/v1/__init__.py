from fastapi import APIRouter

from . import admin, billing, content, cron, draws, generator, stats, users

router = APIRouter()
router.include_router(draws.router)
router.include_router(stats.router)
router.include_router(generator.router)
router.include_router(users.router)
router.include_router(billing.router)
router.include_router(content.router)
router.include_router(admin.router)
router.include_router(cron.router)

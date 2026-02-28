from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routes.analyze import router as analyze_router
from app.routes.dashboard import router as dashboard_router
from app.routes.feedback import router as feedback_router
from app.routes.full_analysis import router as full_analysis_router
from app.routes.media import router as media_router
from app.routes.upload import router as upload_router
from app.routes.teachers import router as teachers_router
from app.routes.rubrics import router as rubrics_router
from app.routes.shares import router as shares_router
from app.routes.export import router as export_router
from app.routes.coaching import router as coaching_router
from app.routes.seed import router as seed_router
from app.services.persistence import init_db

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


def create_app() -> FastAPI:
    application = FastAPI(
        title="Teacher Performance Dashboard API",
        version="0.1.0",
        description="Analyse classroom video recordings — transcription, body language, and rubric evaluation.",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(dashboard_router)
    application.include_router(upload_router)
    application.include_router(analyze_router)
    application.include_router(full_analysis_router)
    application.include_router(feedback_router)
    application.include_router(media_router)
    application.include_router(teachers_router)
    application.include_router(rubrics_router)
    application.include_router(shares_router)
    application.include_router(export_router)
    application.include_router(coaching_router)
    application.include_router(seed_router)

    @application.on_event("startup")
    async def startup() -> None:
        init_db()

    if STATIC_DIR.is_dir():
        application.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

        @application.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            file_path = STATIC_DIR / full_path
            if file_path.is_file():
                return FileResponse(str(file_path))
            return FileResponse(str(STATIC_DIR / "index.html"))

    return application


app = create_app()

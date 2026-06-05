import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.routes import health, scan, history, auth, reports, analytics, qr
import threading
from app.services.intelligence_engine.threat_feeds.feed_engine import sync_feeds

# ── Structured logging setup ─────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
logger = logging.getLogger(__name__)

# ── FastAPI application ───────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    # Hide internal detail from 422 validation errors in production
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=None,
)

@app.on_event("startup")
def startup_event():
    logger.info("Initializing background tasks on startup...")
    # Trigger feed synchronization asynchronously to prevent blocking startup
    threading.Thread(target=sync_feeds, daemon=True).start()

# ── Global unhandled exception handler ───────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all for any unhandled exceptions — returns clean JSON, not stack traces."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An unexpected server error occurred. Please try again.",
            "error_code": "INTERNAL_SERVER_ERROR",
        },
    )

# ── CORS Middleware ───────────────────────────────────────────────────────────
origins = [origin.strip() for origin in settings.FRONTEND_URL.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://(phishguard|phishguard-.*)\.vercel\.app|http://localhost(:\d+)?|http://127\.0\.0\.1(:\d+)?",
    allow_credentials=True,
    # Restrict to only the HTTP methods actually used — do not use wildcard
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["Content-Disposition"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix=f"{settings.API_V1_STR}/health", tags=["health"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(scan.router, prefix=f"{settings.API_V1_STR}/scan", tags=["scan"])
app.include_router(history.router, prefix=f"{settings.API_V1_STR}/history", tags=["history"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])
app.include_router(qr.router, prefix=f"{settings.API_V1_STR}/qr", tags=["qr"])

@app.get("/")
def health_root():
    return {"status": "healthy", "version": settings.VERSION}

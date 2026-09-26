import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routers import (
    auth,
    users,
    roles,
    inventory,
    accounts,
    orders,
    purchases,
    shipments,
    employee_salary,
    employee_assets,
    employee_documents,
    expense_claims,
    tasks,
    finance,
    upload,
    admin_costs,
    companies,
    partners_mgmt
)

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("crm_api")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.database import SessionLocal, engine, Base
    from app.models.user import User
    from seed import seed_db
    
    # Ensure database schema is ready
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate any missing columns from SQLAlchemy models to existing tables
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        db_tables = inspector.get_table_names()
        is_sqlite_db = engine.dialect.name == "sqlite"
        with engine.connect() as conn:
            for table_name, table in Base.metadata.tables.items():
                if table_name in db_tables:
                    existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
                    for col in table.columns:
                        if col.name not in existing_cols:
                            col_type = col.type.compile(engine.dialect)
                            logger.info(f"Auto-migrating: Adding missing column {col.name} ({col_type}) to table {table_name}")
                            if is_sqlite_db:
                                conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{col.name}" {col_type}'))
                            else:
                                conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{col.name}" {col_type}'))
                            conn.commit()
    except Exception as e:
        logger.error(f"Error during auto-column migration: {e}")

    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            logger.info("Fresh database detected. Seeding official roles, permissions, users and companies...")
            seed_db()
        
        # Sync admin cost share for all monthly configs at startup
        from app.models.monthly_admin_cost import MonthlyAdminCost
        from app.core.admin_cost_sync import sync_admin_cost_share_for_month
        costs = db.query(MonthlyAdminCost).all()
        for c in costs:
            sync_admin_cost_share_for_month(c.month, db)
        logger.info("System startup checks completed.")

        # Non-blocking background sync of S3 uploads to local cache
        try:
            import threading
            from app.core.s3 import sync_s3_uploads_background
            threading.Thread(target=sync_s3_uploads_background, args=(UPLOADS_DIR,), daemon=True).start()
        except Exception as sync_err:
            logger.warning(f"Could not start background S3 sync: {sync_err}")
    except Exception as e:
        logger.error(f"Startup database check error: {e}")
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT != "production_hidden" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT != "production_hidden" else None
)

# Production CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global unhandled exception handler for consistent error format
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact the system administrator."}
    )

# Smart /uploads static file server with local cache and on-demand S3 fallback
@app.api_route("/uploads/{file_path:path}", methods=["GET", "HEAD"])
async def get_uploaded_file(file_path: str):
    clean_path = file_path.strip().lstrip("/")
    if not clean_path or ".." in clean_path:
        raise HTTPException(status_code=400, detail="Invalid file path")

    abs_uploads = os.path.abspath(UPLOADS_DIR)

    # Check 1: Direct local file
    local_path = os.path.normpath(os.path.join(abs_uploads, clean_path))
    if os.path.commonpath([abs_uploads, local_path]) == abs_uploads and os.path.isfile(local_path):
        return FileResponse(local_path)

    # Check 2: Alternate prefixes (stripping or adding leading 'uploads/')
    if clean_path.startswith("uploads/"):
        alt_path = os.path.normpath(os.path.join(abs_uploads, clean_path[len("uploads/"):]))
        if os.path.commonpath([abs_uploads, alt_path]) == abs_uploads and os.path.isfile(alt_path):
            return FileResponse(alt_path)
    else:
        alt_path = os.path.normpath(os.path.join(abs_uploads, "uploads", clean_path))
        if os.path.commonpath([abs_uploads, alt_path]) == abs_uploads and os.path.isfile(alt_path):
            return FileResponse(alt_path)

    # Check 3: On-demand fetch from S3 and cache locally
    from app.core.s3 import is_s3_enabled, find_and_cache_s3_file
    if is_s3_enabled():
        cached_file = find_and_cache_s3_file(clean_path, UPLOADS_DIR)
        if cached_file and os.path.isfile(cached_file):
            return FileResponse(cached_file)

    raise HTTPException(status_code=404, detail=f"File '{clean_path}' not found")

@app.get("/")
def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "api_v1": settings.API_V1_STR
    }

@app.get("/health")
def health_check():
    from app.database import engine
    from sqlalchemy import text
    from app.core.s3 import check_s3_health

    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_ok = True
    except Exception as e:
        logger.error(f"Health check DB probe error: {e}")
        db_ok = False

    s3_status = check_s3_health()

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "storage": s3_status,
        "system": settings.PROJECT_NAME
    }

# Register API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(roles.router, prefix=settings.API_V1_STR)
app.include_router(inventory.router, prefix=settings.API_V1_STR)
app.include_router(accounts.router, prefix=settings.API_V1_STR)
app.include_router(orders.router, prefix=settings.API_V1_STR)
app.include_router(purchases.router, prefix=settings.API_V1_STR)
app.include_router(shipments.router, prefix=settings.API_V1_STR)
app.include_router(employee_salary.router, prefix=settings.API_V1_STR)
app.include_router(employee_assets.router, prefix=settings.API_V1_STR)
app.include_router(employee_documents.router, prefix=settings.API_V1_STR)
app.include_router(expense_claims.router, prefix=settings.API_V1_STR)
app.include_router(tasks.router, prefix=settings.API_V1_STR)
app.include_router(finance.router, prefix=settings.API_V1_STR)
app.include_router(upload.router, prefix=settings.API_V1_STR)
app.include_router(admin_costs.router, prefix=settings.API_V1_STR)
app.include_router(companies.router, prefix=settings.API_V1_STR)
app.include_router(partners_mgmt.router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


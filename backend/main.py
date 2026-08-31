import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
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

# Mount StaticFiles for uploaded documents
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

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


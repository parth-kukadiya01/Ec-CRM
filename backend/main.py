from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import (
    auth,
    users,
    roles,
    inventory,
    accounts,
    orders,
    purchases,
    shipments
)
from seed import seed_db

app = FastAPI(
    title=settings.PROJECT_NAME,
    # openapi_url=f"{settings.API_V1_STR}/openapi.json",
    # docs_url=f"{settings.API_V1_STR}/docs"
)

# CORS middleware allowing frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    seed_db()

@app.get("/")
def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "docs": f"{settings.API_V1_STR}/docs"
    }

# Register Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(roles.router, prefix=settings.API_V1_STR)
app.include_router(inventory.router, prefix=settings.API_V1_STR)
app.include_router(accounts.router, prefix=settings.API_V1_STR)
app.include_router(orders.router, prefix=settings.API_V1_STR)
app.include_router(purchases.router, prefix=settings.API_V1_STR)
app.include_router(shipments.router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

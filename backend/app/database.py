import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import settings

Base = declarative_base()

db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQLITE_DB_PATH = os.path.join(BASE_DIR, "crm.db")

is_sqlite = False

# Attempt connection to configured PostgreSQL database, with seamless fallback if DB service not running
try:
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True
    )
    # Test connection
    with engine.connect() as conn:
        pass
    if db_url.startswith("sqlite"):
        is_sqlite = True
except Exception as e:
    is_sqlite = True
    engine = create_engine(
        f"sqlite:///{SQLITE_DB_PATH}",
        connect_args={"check_same_thread": False, "timeout": 30},
        poolclass=NullPool,
    )

if is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

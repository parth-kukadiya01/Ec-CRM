from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

Base = declarative_base()

db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

def sync_sqlite_columns(target_engine):
    try:
        from sqlalchemy import text
        with target_engine.connect() as conn:
            res = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            columns = [row[1] for row in res]
            if columns:
                if "is_partner" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_partner BOOLEAN DEFAULT 0"))
                if "account_id" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN account_id INTEGER"))
                if "account_name" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN account_name VARCHAR(100)"))
                if "responsibilities" not in columns:
                    conn.execute(text("ALTER TABLE users ADD COLUMN responsibilities TEXT"))
                conn.commit()

            # Migrate expense_claims table
            res_claims = conn.execute(text("PRAGMA table_info(expense_claims)")).fetchall()
            columns_claims = [row[1] for row in res_claims]
            if columns_claims:
                if "notes" not in columns_claims:
                    conn.execute(text("ALTER TABLE expense_claims ADD COLUMN notes TEXT"))
                if "approval_proof" not in columns_claims:
                    conn.execute(text("ALTER TABLE expense_claims ADD COLUMN approval_proof TEXT"))
                conn.commit()
    except Exception as ex:
        print(f"Column migration info: {ex}")

def create_new_tables(target_engine):
    """Auto-create new tables for employee salary, assets, documents if they don't exist."""
    try:
        import app.models  # Load all models into Base.metadata
        Base.metadata.create_all(bind=target_engine)
    except Exception as ex:
        print(f"Table creation info: {ex}")

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQLITE_DB_PATH = os.path.join(BASE_DIR, "crm.db")

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
    sync_sqlite_columns(engine)
    create_new_tables(engine)
except Exception as e:
    print(f"Warning: Could not connect to PostgreSQL via {db_url}. Falling back to SQLite local database ({SQLITE_DB_PATH}). Error: {e}")
    engine = create_engine(
        f"sqlite:///{SQLITE_DB_PATH}",
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )
    sync_sqlite_columns(engine)
    create_new_tables(engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

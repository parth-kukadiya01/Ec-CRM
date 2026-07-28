from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

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
                conn.commit()
    except Exception as ex:
        print(f"Column migration info: {ex}")

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
except Exception as e:
    print(f"Warning: Could not connect to PostgreSQL via {db_url}. Falling back to SQLite local database (crm.db). Error: {e}")
    engine = create_engine(
        "sqlite:///./crm.db",
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )
    sync_sqlite_columns(engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

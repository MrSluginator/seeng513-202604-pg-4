from __future__ import annotations

import os

from dotenv import load_dotenv
from sqlalchemy import JSON, create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

DEFAULT_DATABASE_URL = "postgresql://flare_user:flare_password@localhost:5432/flare_db"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

JSONBType = JSON().with_variant(JSONB(), "postgresql")


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    pass


def get_engine(database_url: str | None = None):
    """Create and return a SQLAlchemy engine."""
    url = database_url or DATABASE_URL
    return create_engine(url, pool_pre_ping=True)


engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

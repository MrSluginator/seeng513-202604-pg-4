"""Script to initialize and manage database tables and relationships."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import Engine, text
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import db.models  # noqa: E402, F401
from db.database import Base, get_engine  # noqa: E402

SCHEMA_SQL_PATH = Path(__file__).resolve().parent / "schema.sql"


def create_tables(target_engine: Engine | None = None) -> None:
    """Create all tables and relationships defined in SQLAlchemy metadata."""
    db_engine = target_engine or get_engine()
    Base.metadata.create_all(bind=db_engine)


def drop_tables(target_engine: Engine | None = None) -> None:
    """Drop all tables defined in SQLAlchemy metadata."""
    db_engine = target_engine or get_engine()
    Base.metadata.drop_all(bind=db_engine)


def execute_sql_schema(
    target_engine: Engine | None = None,
    sql_path: Path = SCHEMA_SQL_PATH,
) -> None:
    """Execute the raw PostgreSQL schema.sql file against the target engine."""
    db_engine = target_engine or get_engine()
    sql_content = sql_path.read_text(encoding="utf-8")
    with db_engine.begin() as connection:
        connection.execute(text(sql_content))


def generate_postgres_ddl() -> str:
    """Compile and return the PostgreSQL CREATE TABLE DDL for all models."""
    dialect = postgresql.dialect()
    statements = [
        f"{str(CreateTable(table).compile(dialect=dialect)).strip()};"
        for table in Base.metadata.sorted_tables
    ]
    return "\n\n".join(statements)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create Flare database tables and relationships."
    )
    parser.add_argument(
        "--database-url",
        type=str,
        default=None,
        help="Optional database URL override (defaults to DATABASE_URL env var).",
    )
    parser.add_argument(
        "--drop",
        action="store_true",
        help="Drop existing tables before creating them.",
    )
    parser.add_argument(
        "--from-sql-file",
        action="store_true",
        help="Execute db/schema.sql directly instead of SQLAlchemy create_all.",
    )
    parser.add_argument(
        "--print-sql",
        action="store_true",
        help="Print the compiled PostgreSQL DDL and exit without connecting.",
    )
    args = parser.parse_args()

    if args.print_sql:
        print(generate_postgres_ddl())
        return

    db_engine = get_engine(args.database_url)

    if args.drop:
        print("Dropping existing tables...")
        drop_tables(db_engine)

    if args.from_sql_file:
        print(f"Executing SQL schema from {SCHEMA_SQL_PATH}...")
        execute_sql_schema(db_engine, SCHEMA_SQL_PATH)
    else:
        print("Creating database tables via SQLAlchemy metadata...")
        create_tables(db_engine)

    table_names = ", ".join(t.name for t in Base.metadata.sorted_tables)
    print(f"Successfully initialized {len(Base.metadata.tables)} tables: {table_names}")


if __name__ == "__main__":
    main()

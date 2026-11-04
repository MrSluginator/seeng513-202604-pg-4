from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from db.create_tables import SCHEMA_SQL_PATH, create_tables, generate_postgres_ddl
from db.database import Base
from db.models import (
    Comment,
    Event,
    EventPhoto,
    EventTag,
    NotificationSettings,
    Photo,
    RecurrencePattern,
    SavedEvent,
    ScrapedEvent,
    Tag,
    User,
    UserFriend,
    UserPreferredTag,
    UserSettings,
)

EXPECTED_TABLES = {
    "users",
    "user_settings",
    "notification_settings",
    "user_friends",
    "events",
    "photos",
    "event_photos",
    "comments",
    "saved_events",
    "tags",
    "event_tags",
    "user_preferred_tags",
    "scraped_events",
}


@pytest.fixture
def db_session():
    """Create an isolated in-memory SQLite database with foreign keys enabled."""
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    create_tables(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_all_tables_registered():
    """Verify all 13 specification tables are registered in SQLAlchemy metadata."""
    assert set(Base.metadata.tables.keys()) == EXPECTED_TABLES


def test_postgres_ddl_generation_and_sql_file():
    """Verify PostgreSQL DDL compiles cleanly and schema.sql contains all tables."""
    ddl = generate_postgres_ddl()
    sql_file_content = SCHEMA_SQL_PATH.read_text(encoding="utf-8")

    for table_name in EXPECTED_TABLES:
        assert f"CREATE TABLE {table_name}" in ddl
        assert f"CREATE TABLE IF NOT EXISTS {table_name}" in sql_file_content


def test_foreign_key_ondelete_rules():
    """Verify foreign key ON DELETE actions match the specification."""
    tables = Base.metadata.tables

    def get_fk_ondelete(table_name: str, column_name: str) -> str | None:
        col = tables[table_name].c[column_name]
        fk = next(iter(col.foreign_keys))
        return fk.ondelete

    assert get_fk_ondelete("user_settings", "user_id") == "CASCADE"
    assert get_fk_ondelete("notification_settings", "user_id") == "CASCADE"
    assert get_fk_ondelete("user_friends", "user_id") == "CASCADE"
    assert get_fk_ondelete("user_friends", "friend_id") == "CASCADE"
    assert get_fk_ondelete("events", "creator_id") == "SET NULL"
    assert get_fk_ondelete("photos", "uploader_id") == "SET NULL"
    assert get_fk_ondelete("event_photos", "event_id") == "CASCADE"
    assert get_fk_ondelete("event_photos", "photo_id") == "CASCADE"
    assert get_fk_ondelete("comments", "event_id") == "CASCADE"
    assert get_fk_ondelete("comments", "user_id") == "CASCADE"
    assert get_fk_ondelete("saved_events", "user_id") == "CASCADE"
    assert get_fk_ondelete("saved_events", "event_id") == "CASCADE"
    assert get_fk_ondelete("event_tags", "event_id") == "CASCADE"
    assert get_fk_ondelete("event_tags", "tag_id") == "CASCADE"
    assert get_fk_ondelete("user_preferred_tags", "user_id") == "CASCADE"
    assert get_fk_ondelete("user_preferred_tags", "tag_id") == "CASCADE"
    assert get_fk_ondelete("scraped_events", "parsed_event_id") == "SET NULL"


def test_orm_relationships_end_to_end(db_session):
    """Verify all entity relationships from Section 5 of the specification."""
    now = datetime.now(timezone.utc)

    # 1. Users, Settings, NotificationSettings, and Friends
    alice = User(
        username="alice",
        email="alice@example.com",
        password_hash="hashed_pw_1",
        created_at=now,
        updated_at=now,
    )
    bob = User(
        username="bob",
        email="bob@example.com",
        password_hash="hashed_pw_2",
        created_at=now,
        updated_at=now,
    )
    alice.settings = UserSettings(
        profile_picture_url="https://cdn.example.com/alice.png",
        social_links={"instagram": "@alice"},
        feed_preferences={"radius_km": 10},
        updated_at=now,
    )
    alice.notification_settings = NotificationSettings(trending_in_my_area=True)

    db_session.add_all([alice, bob])
    db_session.flush()

    friendship = UserFriend(
        user_id=alice.id,
        friend_id=bob.id,
        status="accepted",
        created_at=now,
    )
    db_session.add(friendship)
    db_session.flush()

    assert alice.spark_rating == 0
    assert alice.settings.social_links == {"instagram": "@alice"}
    assert alice.notification_settings.rsvp_updates is True
    assert alice.notification_settings.trending_in_my_area is True
    assert alice.notification_settings.spark_rating_updates is True
    assert bob in alice.friends

    # 2. Events, Photos, EventPhotos, Tags, EventTags, UserPreferredTags
    music_tag = Tag(name="Music", slug="music")
    alice.preferred_tags.append(music_tag)

    concert = Event(
        creator=alice,
        title="Downtown Jazz Night",
        summary="A cozy evening of live jazz performances",
        description="Live jazz music",
        recurrence_pattern=RecurrencePattern.ONE_TIME,
        price_min=Decimal("25.00"),
        price_max=Decimal("40.00"),
        latitude=Decimal("51.044700"),
        longitude=Decimal("-114.071900"),
        crowd_by_hour={str(hour): (80 if 19 <= hour <= 22 else 15) for hour in range(24)},
        created_at=now,
        updated_at=now,
    )
    concert.tags.append(music_tag)

    banner = Photo(
        uploader=alice,
        file_name="jazz.webp",
        file_url="https://cdn.example.com/jazz.webp",
        file_size_bytes=204800,
        mime_type="image/webp",
        created_at=now,
    )
    db_session.add_all([music_tag, concert, banner])
    db_session.flush()

    event_photo = EventPhoto(
        event_id=concert.id,
        photo_id=banner.id,
        is_cover=True,
        display_order=1,
    )
    db_session.add(event_photo)

    # 3. Comments, SavedEvents, ScrapedEvents
    comment = Comment(
        event=concert,
        user=bob,
        content="Cannot wait for this show!",
        created_at=now,
        updated_at=now,
    )
    saved = SavedEvent(
        user=bob,
        event=concert,
        is_saved=True,
        user_rating=5,
        user_visits=1,
        user_review="Amazing atmosphere!",
        created_at=now,
        updated_at=now,
    )
    scraped = ScrapedEvent(
        source_url="https://events.example.com/jazz-night",
        scraped_at=now,
        scrape_method="beautifulsoup_worker",
        raw_data={"title": "Downtown Jazz Night"},
        status="processed",
        parsed_event=concert,
    )
    db_session.add_all([comment, saved, scraped])
    db_session.commit()

    # Verify relationships from both sides
    assert concert.recurrence_pattern == "one-time"
    assert concert.recurrence_end_date is None
    assert len(concert.crowd_by_hour) == 24
    assert concert.crowd_by_hour["20"] == 80
    assert concert.crowd_by_hour["10"] == 15
    assert concert in alice.created_events
    assert banner in concert.photos
    assert concert in banner.events
    assert music_tag in concert.tags
    assert music_tag in alice.preferred_tags
    assert len(concert.comments) == 1
    assert concert.comments[0].user == bob
    assert concert in bob.saved_events
    assert bob in concert.saved_by_users
    assert concert.scraped_source == scraped
    assert len(db_session.query(EventTag).all()) == 1
    assert len(db_session.query(UserPreferredTag).all()) == 1


def test_saved_event_rating_check_constraint(db_session):
    """Verify saved_events enforces user_rating BETWEEN 1 AND 5."""
    now = datetime.now(timezone.utc)
    user = User(
        username="rater",
        email="rater@example.com",
        password_hash="hash",
        created_at=now,
        updated_at=now,
    )
    ev = Event(title="Test Event", created_at=now, updated_at=now)
    db_session.add_all([user, ev])
    db_session.flush()

    invalid_saved = SavedEvent(
        user_id=user.id,
        event_id=ev.id,
        user_rating=6,
        created_at=now,
        updated_at=now,
    )
    db_session.add(invalid_saved)
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_event_recurrence_constraints(db_session):
    """Verify recurrence_pattern enum values and recurrence_end_date constraint."""
    now = datetime.now(timezone.utc)

    weekly_ev = Event(
        title="Weekly Trivia",
        recurrence_pattern=RecurrencePattern.WEEKLY,
        recurrence_end_date=now,
        created_at=now,
        updated_at=now,
    )
    db_session.add(weekly_ev)
    db_session.commit()
    assert weekly_ev.recurrence_pattern == "weekly"
    assert weekly_ev.recurrence_end_date is not None

    invalid_pattern_ev = Event(
        title="Invalid Pattern Event",
        recurrence_pattern="yearly",
        created_at=now,
        updated_at=now,
    )
    db_session.add(invalid_pattern_ev)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    invalid_end_date_ev = Event(
        title="None With End Date",
        recurrence_pattern=RecurrencePattern.NONE,
        recurrence_end_date=now,
        created_at=now,
        updated_at=now,
    )
    db_session.add(invalid_end_date_ev)
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_event_price_range_constraints(db_session):
    """Verify price_min and price_max support single prices and valid price ranges."""
    now = datetime.now(timezone.utc)

    # Single price with price_max = NULL
    single_null_max = Event(
        title="Single Price (Null Max)",
        price_min=Decimal("15.00"),
        price_max=None,
        created_at=now,
        updated_at=now,
    )
    # Single price with price_min == price_max
    single_equal = Event(
        title="Single Price (Equal)",
        price_min=Decimal("15.00"),
        price_max=Decimal("15.00"),
        created_at=now,
        updated_at=now,
    )
    # Price range with price_min < price_max
    range_ev = Event(
        title="Tiered Ticket Event",
        price_min=Decimal("10.00"),
        price_max=Decimal("50.00"),
        created_at=now,
        updated_at=now,
    )
    db_session.add_all([single_null_max, single_equal, range_ev])
    db_session.commit()

    # Invalid: price_max < price_min
    inverted_range = Event(
        title="Inverted Price Range",
        price_min=Decimal("50.00"),
        price_max=Decimal("10.00"),
        created_at=now,
        updated_at=now,
    )
    db_session.add(inverted_range)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Invalid: price_max set while price_min is NULL
    max_without_min = Event(
        title="Max Without Min",
        price_min=None,
        price_max=Decimal("20.00"),
        created_at=now,
        updated_at=now,
    )
    db_session.add(max_without_min)
    with pytest.raises(IntegrityError):
        db_session.commit()



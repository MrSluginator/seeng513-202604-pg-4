"""Script to seed dummy data into the Flare database."""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import Engine, text
from sqlalchemy.orm import Session, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from db.create_tables import create_tables, drop_tables  # noqa: E402
from db.database import get_engine  # noqa: E402
from db.models import (  # noqa: E402
    Event,
    EventPhoto,
    EventTag,
    NotificationSettings,
    Photo,
    RecurrencePattern,
    Review,
    SavedEvent,
    ScrapedEvent,
    Tag,
    User,
    UserFriend,
    UserPreferredTag,
    UserSettings,
)

SEED_SQL_PATH = Path(__file__).resolve().parent / "seed.sql"


def _hourly_crowd(
    peak_hours: range, peak_val: int, base_val: int = 15
) -> dict[str, int]:
    """Build a 24-hour crowd_by_hour dictionary."""
    return {
        str(hour): (peak_val if hour in peak_hours else base_val) for hour in range(24)
    }


def clear_all_data(session: Session) -> None:
    """Delete all rows from all tables in reverse dependency order."""
    session.query(ScrapedEvent).delete()
    session.query(EventPhoto).delete()
    session.query(EventTag).delete()
    session.query(UserPreferredTag).delete()
    session.query(SavedEvent).delete()
    session.query(Review).delete()
    session.query(Photo).delete()
    session.query(Event).delete()
    session.query(Tag).delete()
    session.query(UserFriend).delete()
    session.query(NotificationSettings).delete()
    session.query(UserSettings).delete()
    session.query(User).delete()
    session.commit()


def seed_database(session: Session, reset: bool = False) -> dict[str, int]:
    """Populate the database with dummy data across all 13 schema tables.

    If ``reset`` is True, existing rows are cleared before inserting.
    If dummy data already exists and ``reset`` is False, seeding is skipped.
    Returns a mapping of table names to total row counts after seeding.
    """
    if reset:
        clear_all_data(session)
    elif session.query(User).first() is not None:
        return get_table_counts(session)

    now = datetime.now(timezone.utc)

    # 1. Tags
    tags_data = [
        ("Music", "music"),
        ("Food & Drink", "food-drink"),
        ("Nightlife", "nightlife"),
        ("Arts & Culture", "arts-culture"),
        ("Outdoors", "outdoors"),
        ("Tech & Networking", "tech-networking"),
        ("Sports & Fitness", "sports-fitness"),
        ("Markets", "markets"),
    ]
    tags: dict[str, Tag] = {}
    for name, slug in tags_data:
        tag = Tag(name=name, slug=slug)
        tags[slug] = tag
        session.add(tag)

    # 2. Users, UserSettings, and NotificationSettings
    users_spec: list[dict[str, Any]] = [
        {
            "username": "alice_chen",
            "email": "alice@flare.example.com",
            "password_hash": "$2b$12$dummyhashalice00000000000000000000000000000000",
            "phone_number": "+1-403-555-0101",
            "account_type": "organizer",
            "spark_rating": 420,
            "settings": {
                "profile_picture_url": (
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330"
                ),
                "social_links": {"instagram": "@alice.yyc", "twitter": "@alice_chen"},
                "feed_preferences": {"radius_km": 15, "sort_by": "trending"},
                "allow_mature_content": True,
            },
            "notifications": {
                "rsvp_updates": True,
                "rsvp_start_soon": True,
                "interests_me": True,
                "new_in_my_area": True,
                "trending_in_my_area": True,
                "spark_rating_updates": True,
            },
            "preferred_tags": ["music", "food-drink", "nightlife"],
        },
        {
            "username": "marcus_vance",
            "email": "marcus@flare.example.com",
            "password_hash": "$2b$12$dummyhashmarcus0000000000000000000000000000000",
            "phone_number": "+1-403-555-0102",
            "account_type": "standard",
            "spark_rating": 185,
            "settings": {
                "profile_picture_url": (
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"
                ),
                "social_links": {"instagram": "@marcus_v"},
                "feed_preferences": {"radius_km": 10, "sort_by": "distance"},
                "allow_mature_content": False,
            },
            "notifications": {
                "rsvp_updates": True,
                "rsvp_start_soon": True,
                "interests_me": True,
                "new_in_my_area": False,
                "trending_in_my_area": False,
                "spark_rating_updates": True,
            },
            "preferred_tags": ["tech-networking", "outdoors", "sports-fitness"],
        },
        {
            "username": "sofia_reyes",
            "email": "sofia@flare.example.com",
            "password_hash": "$2b$12$dummyhashsofia00000000000000000000000000000000",
            "phone_number": "+1-403-555-0103",
            "account_type": "organizer",
            "spark_rating": 610,
            "settings": {
                "profile_picture_url": (
                    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80"
                ),
                "social_links": {
                    "instagram": "@sofiareyes.art",
                    "tiktok": "@sofia.yyc",
                },
                "feed_preferences": {"radius_km": 25, "sort_by": "recommended"},
                "allow_mature_content": True,
            },
            "notifications": {
                "rsvp_updates": True,
                "rsvp_start_soon": False,
                "interests_me": True,
                "new_in_my_area": True,
                "trending_in_my_area": True,
                "spark_rating_updates": False,
            },
            "preferred_tags": ["arts-culture", "markets", "food-drink"],
        },
        {
            "username": "liam_oconnor",
            "email": "liam@flare.example.com",
            "password_hash": "$2b$12$dummyhashliam000000000000000000000000000000000",
            "phone_number": None,
            "account_type": "standard",
            "spark_rating": 95,
            "settings": {
                "profile_picture_url": None,
                "social_links": {},
                "feed_preferences": {"radius_km": 5},
                "allow_mature_content": False,
            },
            "notifications": {
                "rsvp_updates": True,
                "rsvp_start_soon": True,
                "interests_me": False,
                "new_in_my_area": True,
                "trending_in_my_area": False,
                "spark_rating_updates": True,
            },
            "preferred_tags": ["music", "sports-fitness"],
        },
        {
            "username": "priya_patel",
            "email": "priya@flare.example.com",
            "password_hash": "$2b$12$dummyhashpriya00000000000000000000000000000000",
            "phone_number": "+1-403-555-0105",
            "account_type": "admin",
            "spark_rating": 890,
            "settings": {
                "profile_picture_url": (
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb"
                ),
                "social_links": {"github": "priyapatel", "linkedin": "priya-patel"},
                "feed_preferences": {"radius_km": 50, "sort_by": "rating"},
                "allow_mature_content": True,
            },
            "notifications": {
                "rsvp_updates": True,
                "rsvp_start_soon": True,
                "interests_me": True,
                "new_in_my_area": True,
                "trending_in_my_area": True,
                "spark_rating_updates": True,
            },
            "preferred_tags": ["tech-networking", "arts-culture", "food-drink"],
        },
    ]

    users: dict[str, User] = {}
    for spec in users_spec:
        user = User(
            username=spec["username"],
            email=spec["email"],
            password_hash=spec["password_hash"],
            phone_number=spec["phone_number"],
            account_type=spec["account_type"],
            spark_rating=spec["spark_rating"],
            created_at=now,
            updated_at=now,
        )
        user.settings = UserSettings(
            **spec["settings"],
            updated_at=now,
        )
        user.notification_settings = NotificationSettings(**spec["notifications"])
        for tag_slug in spec["preferred_tags"]:
            user.preferred_tags.append(tags[tag_slug])
        users[spec["username"]] = user
        session.add(user)

    session.flush()

    # 3. UserFriend connections
    friendships_data = [
        ("alice_chen", "marcus_vance", "accepted"),
        ("alice_chen", "sofia_reyes", "accepted"),
        ("marcus_vance", "priya_patel", "accepted"),
        ("sofia_reyes", "priya_patel", "accepted"),
        ("liam_oconnor", "alice_chen", "pending"),
    ]
    for u_name, f_name, status in friendships_data:
        session.add(
            UserFriend(
                user_id=users[u_name].id,
                friend_id=users[f_name].id,
                status=status,
                created_at=now,
            )
        )

    # 4. Events
    events_spec: list[dict[str, Any]] = [
        {
            "key": "beltline_jazz",
            "creator": users["alice_chen"],
            "title": "Beltline Midnight Jazz Jam",
            "summary": (
                "Live brass and quartet improvisations in the heart of Beltline."
            ),
            "description": (
                "Join local Calgary jazz musicians for an intimate late-night session "
                "featuring craft cocktails, vinyl sets between performances, and an "
                "open jam hour starting at 11 PM."
            ),
            "start_time": now + timedelta(days=2, hours=5),
            "end_time": now + timedelta(days=2, hours=9),
            "recurrence_pattern": RecurrencePattern.WEEKLY.value,
            "recurrence_end_date": now + timedelta(days=90),
            "price_min": Decimal("15.00"),
            "price_max": Decimal("25.00"),
            "currency": "CAD",
            "location_name": "Betty Lou's Library, Beltline",
            "latitude": Decimal("51.038100"),
            "longitude": Decimal("-114.079200"),
            "crowd_by_hour": _hourly_crowd(range(20, 24), 88, 12),
            "visits_count": 142,
            "shares_count": 38,
            "review_count": 2,
            "rating": Decimal("4.50"),
            "tags": ["music", "nightlife", "food-drink"],
        },
        {
            "key": "kensington_market",
            "creator": users["sofia_reyes"],
            "title": "Kensington Artisan & Coffee Pop-Up",
            "summary": (
                "Weekend street market with local roasters, ceramics, and pastries."
            ),
            "description": (
                "Stroll through Kensington Village and sample single-origin "
                "pour-overs, small-batch sourdough pastries, and handmade goods "
                "from over 30 local Calgary makers."
            ),
            "start_time": now + timedelta(days=4, hours=2),
            "end_time": now + timedelta(days=4, hours=8),
            "recurrence_pattern": RecurrencePattern.ONE_TIME.value,
            "recurrence_end_date": None,
            "price_min": Decimal("0.00"),
            "price_max": Decimal("0.00"),
            "currency": "CAD",
            "location_name": "Kensington Road NW Plaza",
            "latitude": Decimal("51.052400"),
            "longitude": Decimal("-114.085600"),
            "crowd_by_hour": _hourly_crowd(range(10, 16), 92, 20),
            "visits_count": 310,
            "shares_count": 74,
            "review_count": 2,
            "rating": Decimal("5.00"),
            "tags": ["markets", "food-drink", "arts-culture"],
        },
        {
            "key": "inglewood_tech",
            "creator": users["priya_patel"],
            "title": "YYC AI & Full-Stack Builders Mixer",
            "summary": "Lightning talks and networking for Calgary software engineers.",
            "description": (
                "Monthly meetup bringing together developers, designers, and founders. "
                "Includes three 10-minute lightning demos followed by open networking "
                "and pizza."
            ),
            "start_time": now + timedelta(days=7, hours=4),
            "end_time": now + timedelta(days=7, hours=7),
            "recurrence_pattern": RecurrencePattern.MONTHLY.value,
            "recurrence_end_date": now + timedelta(days=180),
            "price_min": Decimal("5.00"),
            "price_max": None,
            "currency": "CAD",
            "location_name": "The Nash Annex, Inglewood",
            "latitude": Decimal("51.041900"),
            "longitude": Decimal("-114.036500"),
            "crowd_by_hour": _hourly_crowd(range(18, 21), 76, 10),
            "visits_count": 89,
            "shares_count": 29,
            "review_count": 1,
            "rating": Decimal("4.00"),
            "tags": ["tech-networking", "food-drink"],
        },
        {
            "key": "bow_river_run",
            "creator": users["marcus_vance"],
            "title": "Sunrise Bow River 5K Social Run",
            "summary": "Casual pace group run along the Bow River pathway + espresso.",
            "description": (
                "All paces welcome! Meet at Peace Bridge south entrance for a scenic "
                "5 km loop along the river pathway, finishing at a nearby cafe."
            ),
            "start_time": now + timedelta(days=1, hours=14),
            "end_time": now + timedelta(days=1, hours=16),
            "recurrence_pattern": RecurrencePattern.DAILY.value,
            "recurrence_end_date": now + timedelta(days=60),
            "price_min": Decimal("0.00"),
            "price_max": None,
            "currency": "CAD",
            "location_name": "Peace Bridge South Plaza",
            "latitude": Decimal("51.053900"),
            "longitude": Decimal("-114.078900"),
            "crowd_by_hour": _hourly_crowd(range(7, 10), 65, 8),
            "visits_count": 64,
            "shares_count": 15,
            "review_count": 1,
            "rating": Decimal("5.00"),
            "tags": ["sports-fitness", "outdoors"],
        },
        {
            "key": "east_village_gallery",
            "creator": users["sofia_reyes"],
            "title": "Neon Horizons: Interactive Light Exhibition",
            "summary": "Outdoor projection mapping and soundscape installation.",
            "description": (
                "An evening outdoor digital art exhibition transforming East Village "
                "riverwalk walls into interactive audio-reactive visuals."
            ),
            "start_time": now + timedelta(days=10, hours=6),
            "end_time": now + timedelta(days=10, hours=10),
            "recurrence_pattern": RecurrencePattern.NONE.value,
            "recurrence_end_date": None,
            "price_min": Decimal("12.00"),
            "price_max": Decimal("30.00"),
            "currency": "CAD",
            "location_name": "East Village RiverWalk Square",
            "latitude": Decimal("51.045800"),
            "longitude": Decimal("-114.051200"),
            "crowd_by_hour": _hourly_crowd(range(19, 23), 84, 18),
            "visits_count": 215,
            "shares_count": 61,
            "review_count": 1,
            "rating": Decimal("4.00"),
            "tags": ["arts-culture", "nightlife", "outdoors"],
        },
    ]

    events: dict[str, Event] = {}
    for spec in events_spec:
        ev = Event(
            creator=spec["creator"],
            title=spec["title"],
            summary=spec["summary"],
            description=spec["description"],
            start_time=spec["start_time"],
            end_time=spec["end_time"],
            recurrence_pattern=spec["recurrence_pattern"],
            recurrence_end_date=spec["recurrence_end_date"],
            price_min=spec["price_min"],
            price_max=spec["price_max"],
            currency=spec["currency"],
            location_name=spec["location_name"],
            latitude=spec["latitude"],
            longitude=spec["longitude"],
            crowd_by_hour=spec["crowd_by_hour"],
            visits_count=spec["visits_count"],
            shares_count=spec["shares_count"],
            review_count=spec["review_count"],
            rating=spec["rating"],
            created_at=now,
            updated_at=now,
        )
        for tag_slug in spec["tags"]:
            ev.tags.append(tags[tag_slug])
        events[spec["key"]] = ev
        session.add(ev)

    session.flush()

    # 5. Photos & EventPhotos
    photos_spec = [
        (
            "beltline_jazz",
            users["alice_chen"],
            "beltline_jazz_cover.webp",
            "https://images.unsplash.com/photo-1511192336575-5a79af67a629",
            348160,
            "image/webp",
            True,
            1,
        ),
        (
            "beltline_jazz",
            users["alice_chen"],
            "beltline_jazz_crowd.jpg",
            "https://images.unsplash.com/photo-1514525253161-7a46d19cd819",
            512000,
            "image/jpeg",
            False,
            2,
        ),
        (
            "kensington_market",
            users["sofia_reyes"],
            "kensington_coffee_cover.webp",
            "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb",
            289400,
            "image/webp",
            True,
            1,
        ),
        (
            "inglewood_tech",
            users["priya_patel"],
            "yyc_tech_mixer.webp",
            "https://images.unsplash.com/photo-1540575467063-178a50c2df87",
            410200,
            "image/webp",
            True,
            1,
        ),
        (
            "bow_river_run",
            users["marcus_vance"],
            "peace_bridge_run.jpg",
            "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8",
            395000,
            "image/jpeg",
            True,
            1,
        ),
        (
            "east_village_gallery",
            users["sofia_reyes"],
            "neon_horizons_cover.webp",
            "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad",
            612800,
            "image/webp",
            True,
            1,
        ),
    ]

    for (
        event_key,
        uploader,
        file_name,
        file_url,
        file_size,
        mime_type,
        is_cover,
        order,
    ) in photos_spec:
        photo = Photo(
            uploader=uploader,
            file_name=file_name,
            file_url=file_url,
            file_size_bytes=file_size,
            mime_type=mime_type,
            created_at=now,
        )
        session.add(photo)
        session.flush()
        session.add(
            EventPhoto(
                event_id=events[event_key].id,
                photo_id=photo.id,
                is_cover=is_cover,
                display_order=order,
            )
        )

    # 6. Reviews
    reviews_spec = [
        (
            "beltline_jazz",
            "marcus_vance",
            5,
            "Incredible saxophone solo and great speakeasy vibe!",
        ),
        (
            "beltline_jazz",
            "sofia_reyes",
            4,
            "Loved the music, gets packed after 10 PM so arrive early.",
        ),
        (
            "kensington_market",
            "alice_chen",
            5,
            "Best weekend pop-up in Kensington! The cardamom buns were amazing.",
        ),
        (
            "kensington_market",
            "liam_oconnor",
            5,
            None,
        ),
        (
            "inglewood_tech",
            "marcus_vance",
            4,
            "Great lightning talks and super welcoming developer crowd.",
        ),
        (
            "bow_river_run",
            "priya_patel",
            5,
            "Perfect morning energy along the Bow River.",
        ),
        (
            "east_village_gallery",
            "liam_oconnor",
            4,
            "Awesome light installations by the river.",
        ),
    ]
    for event_key, username, rating_val, content in reviews_spec:
        session.add(
            Review(
                event_id=events[event_key].id,
                user_id=users[username].id,
                rating=rating_val,
                content=content,
                created_at=now,
                updated_at=now,
            )
        )

    # 7. SavedEvents
    saved_events_spec = [
        ("marcus_vance", "beltline_jazz", True, 2),
        ("sofia_reyes", "beltline_jazz", True, 1),
        ("alice_chen", "kensington_market", True, 3),
        ("priya_patel", "kensington_market", True, 1),
        ("liam_oconnor", "inglewood_tech", True, 0),
        ("alice_chen", "east_village_gallery", True, 0),
        ("marcus_vance", "bow_river_run", False, 5),
    ]
    for username, event_key, is_saved, visits in saved_events_spec:
        session.add(
            SavedEvent(
                user_id=users[username].id,
                event_id=events[event_key].id,
                is_saved=is_saved,
                user_visits=visits,
                created_at=now,
                updated_at=now,
            )
        )

    # 8. ScrapedEvents
    scraped_spec = [
        {
            "source_url": "https://yycevents.example.com/listings/beltline-jazz-jam",
            "scrape_method": "beautifulsoup_worker",
            "raw_data": {
                "raw_title": "Beltline Midnight Jazz Jam",
                "venue": "Betty Lou's Library",
                "price_text": "$15 - $25 CAD",
            },
            "status": "processed",
            "parsed_event": events["beltline_jazz"],
        },
        {
            "source_url": (
                "https://yycevents.example.com/listings/kensington-artisan-popup"
            ),
            "scrape_method": "beautifulsoup_worker",
            "raw_data": {
                "raw_title": "Kensington Artisan & Coffee Pop-Up",
                "venue": "Kensington Road NW Plaza",
                "price_text": "Free admission",
            },
            "status": "processed",
            "parsed_event": events["kensington_market"],
        },
        {
            "source_url": (
                "https://yycevents.example.com/listings/stampede-grounds-night-market"
            ),
            "scrape_method": "rss_ingestor",
            "raw_data": {
                "raw_title": "Stampede Park Twilight Food Trucks",
                "venue": "Stampede Park Midway",
                "date_string": "Next Friday 6:00 PM",
            },
            "status": "pending",
            "parsed_event": None,
        },
    ]
    for spec in scraped_spec:
        session.add(
            ScrapedEvent(
                source_url=spec["source_url"],
                scraped_at=now,
                scrape_method=spec["scrape_method"],
                raw_data=spec["raw_data"],
                status=spec["status"],
                parsed_event=spec["parsed_event"],
            )
        )

    session.commit()
    return get_table_counts(session)


def get_table_counts(session: Session) -> dict[str, int]:
    """Return a dictionary of row counts for all 13 database tables."""
    models = [
        ("users", User),
        ("user_settings", UserSettings),
        ("notification_settings", NotificationSettings),
        ("user_friends", UserFriend),
        ("events", Event),
        ("photos", Photo),
        ("event_photos", EventPhoto),
        ("reviews", Review),
        ("saved_events", SavedEvent),
        ("tags", Tag),
        ("event_tags", EventTag),
        ("user_preferred_tags", UserPreferredTag),
        ("scraped_events", ScrapedEvent),
    ]
    return {table_name: session.query(model).count() for table_name, model in models}


def execute_sql_seed(
    target_engine: Engine | None = None,
    sql_path: Path = SEED_SQL_PATH,
) -> None:
    """Execute the raw PostgreSQL seed.sql file against the target engine."""
    db_engine = target_engine or get_engine()
    sql_content = sql_path.read_text(encoding="utf-8")
    with db_engine.begin() as connection:
        connection.execute(text(sql_content))


def run_seed(
    target_engine: Engine | None = None,
    reset: bool = False,
    drop_and_recreate: bool = False,
    from_sql_file: bool = False,
) -> dict[str, int]:
    """Initialize tables if needed and seed dummy data using the target engine."""
    db_engine = target_engine or get_engine()
    if drop_and_recreate:
        drop_tables(db_engine)
    create_tables(db_engine)

    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    if from_sql_file:
        if reset:
            with session_factory() as session:
                clear_all_data(session)
        execute_sql_seed(db_engine, SEED_SQL_PATH)
        with session_factory() as session:
            return get_table_counts(session)

    with session_factory() as session:
        return seed_database(session, reset=reset)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the Flare database with dummy development data."
    )
    parser.add_argument(
        "--database-url",
        type=str,
        default=None,
        help="Optional database URL override (defaults to DATABASE_URL env var).",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Clear existing rows in all tables before seeding.",
    )
    parser.add_argument(
        "--drop",
        action="store_true",
        help="Drop and recreate all tables before seeding.",
    )
    parser.add_argument(
        "--from-sql-file",
        action="store_true",
        help="Execute db/seed.sql directly instead of SQLAlchemy ORM objects.",
    )
    args = parser.parse_args()

    db_engine = get_engine(args.database_url)
    counts = run_seed(
        target_engine=db_engine,
        reset=args.reset,
        drop_and_recreate=args.drop,
        from_sql_file=args.from_sql_file,
    )
    summary = ", ".join(f"{name}={count}" for name, count in counts.items())
    print(f"Database seed complete ({len(counts)} tables): {summary}")


if __name__ == "__main__":
    main()

"""Tests for creating, editing and deleting events (organizers and admins).

They run against an in-memory SQLite database, so CI needs no Postgres service.
"""

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import db.models  # noqa: F401  (registers every model)
from db.database import Base, get_db
from db.models.event import Event
from db.models.event_photo import EventPhoto
from db.models.event_tag import EventTag
from db.models.photo import Photo
from db.models.review import Review
from db.models.saved_event import SavedEvent
from db.models.scraped_event import ScrapedEvent
from db.models.tag import Tag
from db.models.user import User
from db.models.user_preferred_tag import UserPreferredTag
from main import app
from security import create_access_token, hash_password

# SQLite has no native Decimal type; SQLAlchemy warns about it.
pytestmark = pytest.mark.filterwarnings("ignore:Dialect sqlite")

SECRET = "test-secret-" + "x" * 32
TABLES = [
    User.__table__,
    Event.__table__,
    Tag.__table__,
    EventTag.__table__,
    Photo.__table__,
    EventPhoto.__table__,
    SavedEvent.__table__,
    Review.__table__,
    UserPreferredTag.__table__,
    ScrapedEvent.__table__,  # loaded when an event is deleted
]


@pytest.fixture(autouse=True)
def jwt_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", SECRET)


@pytest.fixture()
def session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine, tables=TABLES)
    with sessionmaker(bind=engine, autoflush=False)() as s:
        yield s
    engine.dispose()


@pytest.fixture()
def client(session):
    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def make_user(session, username="alice", account_type="standard"):
    user = User(
        username=username,
        email=f"{username}@example.com",
        password_hash=hash_password("correct horse battery"),
        account_type=account_type,
    )
    session.add(user)
    session.commit()
    return user


def bearer(user):
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def add_event(session, **fields):
    event = Event(**{"title": "Untitled", **fields})
    session.add(event)
    session.commit()
    return event


def add_tag(session, name, slug=None):
    tag = Tag(name=name, slug=slug or name.lower())
    session.add(tag)
    session.commit()
    return tag


def link_tag(session, event, tag):
    session.add(EventTag(event_id=event.id, tag_id=tag.id))
    session.commit()


def dt(day, hour=18):
    return datetime(2026, 12, day, hour, 0, tzinfo=timezone.utc)


VALID = {"title": "Jazz Night", "location_name": "The Blue Room"}


def create(client, user, **fields):
    return client.post("/events", json={**VALID, **fields}, headers=bearer(user))


def patch(client, user, event_id, **fields):
    return client.patch(f"/events/{event_id}", json=fields, headers=bearer(user))


# --- create -----------------------------------------------------------------


def test_an_organizer_can_create_an_event(client, session):
    organizer = make_user(session, "olivia", "organizer")

    response = create(
        client,
        organizer,
        summary="Live music",
        start_time="2026-12-05T19:00:00Z",
        end_time="2026-12-05T22:00:00Z",
        price_min="10.50",
        price_max="25",
        currency="CAD",
        latitude=51.0447,
        longitude=-114.0719,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Jazz Night"
    assert body["creator_id"] == str(organizer.id)
    assert body["currency"] == "CAD"
    assert body["price_min"] == 10.5
    assert body["price_max"] == 25.0
    assert body["rating"] is None
    assert body["review_count"] == 0
    assert body["visits_count"] == 0
    assert body["tags"] == []
    assert body["photos"] == []


def test_a_created_event_can_be_fetched(client, session):
    organizer = make_user(session, "olivia", "organizer")

    event_id = create(client, organizer).json()["id"]

    fetched = client.get(f"/events/{event_id}")
    assert fetched.status_code == 200
    assert fetched.json()["title"] == "Jazz Night"


def test_an_admin_can_create_an_event(client, session):
    admin = make_user(session, "root", "admin")

    assert create(client, admin).status_code == 201


def test_a_standard_user_cannot_create_an_event(client, session):
    user = make_user(session, "sam", "standard")

    response = create(client, user)

    assert response.status_code == 403
    assert session.scalars(select(Event)).all() == []


def test_creating_an_event_requires_a_login(client):
    response = client.post("/events", json=VALID)

    assert response.status_code == 401


def test_new_events_get_the_chosen_tags(client, session):
    organizer = make_user(session, "olivia", "organizer")
    music = add_tag(session, "Music")
    art = add_tag(session, "Art")

    response = create(client, organizer, tag_ids=[str(music.id), str(art.id)])

    assert response.status_code == 201
    assert {t["slug"] for t in response.json()["tags"]} == {"music", "art"}


def test_an_unknown_tag_is_rejected_and_nothing_is_created(client, session):
    organizer = make_user(session, "olivia", "organizer")

    response = create(client, organizer, tag_ids=[str(uuid.uuid4())])

    assert response.status_code == 404
    assert session.scalars(select(Event)).all() == []


@pytest.mark.parametrize(
    "field, value",
    [
        ("creator_id", str(uuid.uuid4())),
        ("rating", 5),
        ("review_count", 100),
        ("visits_count", 100),
        ("shares_count", 100),
        ("crowd_by_hour", {"18": 99}),
    ],
)
def test_fields_the_server_controls_are_ignored(client, session, field, value):
    organizer = make_user(session, "olivia", "organizer")

    response = create(client, organizer, **{field: value})

    assert response.status_code == 201
    body = response.json()
    assert body["creator_id"] == str(organizer.id)
    assert body["rating"] is None
    assert body["review_count"] == 0
    assert body["visits_count"] == 0
    assert body["shares_count"] == 0
    assert body["crowd_by_hour"] == {}


@pytest.mark.parametrize(
    "fields",
    [
        {"title": ""},
        {"title": "   "},
        {"title": "x" * 256},
        {"end_time": "2026-12-05T10:00:00Z", "start_time": "2026-12-05T12:00:00Z"},
        {"price_max": "10"},
        {"price_min": "20", "price_max": "10"},
        {"price_min": "-1"},
        {"recurrence_pattern": "hourly"},
        {"recurrence_end_date": "2027-01-01T00:00:00Z"},
        {"latitude": 91},
        {"longitude": -181},
        {"currency": "DOLLARS"},
        {"price_min": "123456789"},
        {"start_time": "not a date"},
    ],
)
def test_invalid_events_are_rejected(client, session, fields):
    organizer = make_user(session, "olivia", "organizer")

    response = create(client, organizer, **fields)

    assert response.status_code == 422
    assert session.scalars(select(Event)).all() == []


def test_a_title_is_trimmed(client, session):
    organizer = make_user(session, "olivia", "organizer")

    body = create(client, organizer, title="  Jazz Night  ").json()

    assert body["title"] == "Jazz Night"


def test_a_recurring_event_can_have_an_end_date(client, session):
    organizer = make_user(session, "olivia", "organizer")

    response = create(
        client,
        organizer,
        recurrence_pattern="weekly",
        recurrence_end_date="2027-01-01T00:00:00Z",
    )

    assert response.status_code == 201
    assert response.json()["recurrence_pattern"] == "weekly"


# --- update -----------------------------------------------------------------


def test_the_creator_can_change_some_fields(client, session):
    organizer = make_user(session, "olivia", "organizer")
    event = add_event(
        session,
        title="Old",
        summary="Keep me",
        creator_id=organizer.id,
        location_name="Hall",
    )

    response = patch(client, organizer, event.id, title="New")

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "New"
    assert body["summary"] == "Keep me"
    assert body["location_name"] == "Hall"
    assert body["creator_id"] == str(organizer.id)


def test_a_field_can_be_cleared_with_null(client, session):
    organizer = make_user(session, "olivia", "organizer")
    event = add_event(session, creator_id=organizer.id, summary="Remove me")

    body = patch(client, organizer, event.id, summary=None).json()

    assert body["summary"] is None


def test_another_organizer_cannot_change_the_event(client, session):
    owner = make_user(session, "olivia", "organizer")
    other = make_user(session, "omar", "organizer")
    event = add_event(session, title="Mine", creator_id=owner.id)

    response = patch(client, other, event.id, title="Hijacked")

    assert response.status_code == 403
    session.refresh(event)
    assert event.title == "Mine"


def test_an_admin_can_change_any_event(client, session):
    owner = make_user(session, "olivia", "organizer")
    admin = make_user(session, "root", "admin")
    event = add_event(session, title="Mine", creator_id=owner.id)

    response = patch(client, admin, event.id, title="Fixed by admin")

    assert response.status_code == 200
    assert response.json()["creator_id"] == str(owner.id)


def test_a_standard_user_cannot_change_an_event(client, session):
    user = make_user(session, "sam", "standard")
    event = add_event(session, title="Mine", creator_id=user.id)

    assert patch(client, user, event.id, title="x").status_code == 403


def test_changing_an_event_requires_a_login(client, session):
    event = add_event(session)

    response = client.patch(f"/events/{event.id}", json={"title": "x"})

    assert response.status_code == 401


def test_changing_an_unknown_event_is_a_404(client, session):
    organizer = make_user(session, "olivia", "organizer")

    assert patch(client, organizer, uuid.uuid4(), title="x").status_code == 404


def test_a_title_cannot_be_set_to_null(client, session):
    organizer = make_user(session, "olivia", "organizer")
    event = add_event(session, title="Keep", creator_id=organizer.id)

    response = patch(client, organizer, event.id, title=None)

    assert response.status_code == 422
    session.refresh(event)
    assert event.title == "Keep"


def test_an_update_that_breaks_a_rule_changes_nothing(client, session):
    organizer = make_user(session, "olivia", "organizer")
    event = add_event(
        session, title="Keep", creator_id=organizer.id, start_time=dt(10, 18)
    )

    response = patch(
        client, organizer, event.id, title="Changed", end_time="2026-12-10T12:00:00Z"
    )

    assert response.status_code == 422
    session.refresh(event)
    assert event.title == "Keep"
    assert event.end_time is None


def test_an_update_cannot_set_server_controlled_fields(client, session):
    organizer = make_user(session, "olivia", "organizer")
    event = add_event(session, creator_id=organizer.id)

    patch(client, organizer, event.id, title="New", rating=5, review_count=9)

    session.refresh(event)
    assert event.title == "New"
    assert event.rating is None
    assert event.review_count == 0


def test_an_empty_update_is_rejected(client, session):
    organizer = make_user(session, "olivia", "organizer")
    event = add_event(session, title="Same", creator_id=organizer.id)

    response = patch(client, organizer, event.id)

    assert response.status_code == 422


def test_tags_can_be_replaced_and_cleared(client, session):
    organizer = make_user(session, "olivia", "organizer")
    music = add_tag(session, "Music")
    art = add_tag(session, "Art")
    event = add_event(session, creator_id=organizer.id)
    link_tag(session, event, music)

    replaced = patch(client, organizer, event.id, tag_ids=[str(art.id)]).json()
    assert [t["slug"] for t in replaced["tags"]] == ["art"]

    cleared = patch(client, organizer, event.id, tag_ids=[]).json()
    assert cleared["tags"] == []


def test_leaving_tag_ids_out_keeps_the_tags(client, session):
    organizer = make_user(session, "olivia", "organizer")
    music = add_tag(session, "Music")
    event = add_event(session, creator_id=organizer.id)
    link_tag(session, event, music)

    body = patch(client, organizer, event.id, title="Renamed").json()

    assert [t["slug"] for t in body["tags"]] == ["music"]


def test_an_unknown_tag_on_update_changes_nothing(client, session):
    organizer = make_user(session, "olivia", "organizer")
    music = add_tag(session, "Music")
    event = add_event(session, title="Keep", creator_id=organizer.id)
    link_tag(session, event, music)

    response = patch(
        client, organizer, event.id, title="Changed", tag_ids=[str(uuid.uuid4())]
    )

    assert response.status_code == 404
    body = client.get(f"/events/{event.id}").json()
    assert body["title"] == "Keep"
    assert [t["slug"] for t in body["tags"]] == ["music"]


# --- delete -----------------------------------------------------------------


def test_the_creator_can_delete_an_event(client, session):
    organizer = make_user(session, "olivia", "organizer")
    event = add_event(session, creator_id=organizer.id)

    response = client.delete(f"/events/{event.id}", headers=bearer(organizer))

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/events/{event.id}").status_code == 404


def test_another_organizer_cannot_delete_the_event(client, session):
    owner = make_user(session, "olivia", "organizer")
    other = make_user(session, "omar", "organizer")
    event = add_event(session, creator_id=owner.id)

    response = client.delete(f"/events/{event.id}", headers=bearer(other))

    assert response.status_code == 403
    assert client.get(f"/events/{event.id}").status_code == 200


def test_an_admin_can_delete_any_event(client, session):
    owner = make_user(session, "olivia", "organizer")
    admin = make_user(session, "root", "admin")
    event = add_event(session, creator_id=owner.id)

    response = client.delete(f"/events/{event.id}", headers=bearer(admin))

    assert response.status_code == 204


def test_a_standard_user_cannot_delete_an_event(client, session):
    user = make_user(session, "sam", "standard")
    event = add_event(session, creator_id=user.id)

    response = client.delete(f"/events/{event.id}", headers=bearer(user))

    assert response.status_code == 403


def test_deleting_requires_a_login(client, session):
    event = add_event(session)

    assert client.delete(f"/events/{event.id}").status_code == 401


def test_deleting_an_unknown_event_is_a_404(client, session):
    organizer = make_user(session, "olivia", "organizer")

    response = client.delete(f"/events/{uuid.uuid4()}", headers=bearer(organizer))

    assert response.status_code == 404


def test_events_with_no_creator_can_only_be_changed_by_an_admin(client, session):
    organizer = make_user(session, "olivia", "organizer")
    admin = make_user(session, "root", "admin")
    event = add_event(session, title="Scraped", creator_id=None)

    assert patch(client, organizer, event.id, title="x").status_code == 403
    assert patch(client, admin, event.id, title="x").status_code == 200


def test_a_price_range_can_be_cleared_together(client, session):
    organizer = make_user(session, "olivia", "organizer")
    event = add_event(
        session, creator_id=organizer.id, price_min=5, price_max=10, currency="USD"
    )

    assert patch(client, organizer, event.id, price_min=None).status_code == 422
    body = patch(client, organizer, event.id, price_min=None, price_max=None).json()

    assert body["price_min"] is None and body["price_max"] is None


def test_times_without_a_timezone_are_taken_as_utc(client, session):
    organizer = make_user(session, "olivia", "organizer")

    response = create(
        client,
        organizer,
        start_time="2026-12-05T19:00:00",
        end_time="2026-12-05T22:00:00Z",
    )

    assert response.status_code == 201


def test_duplicate_tag_ids_are_rejected(client, session):
    organizer = make_user(session, "olivia", "organizer")
    tag = add_tag(session, "Music")

    response = create(client, organizer, tag_ids=[str(tag.id), str(tag.id)])

    assert response.status_code == 422

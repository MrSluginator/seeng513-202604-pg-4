"""Tests for GET /events/tags and GET /events/random.

They run against an in-memory SQLite database, so CI needs no Postgres service.
"""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
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


# --- GET /events/tags --------------------------------------------------------------


def test_tags_are_listed_a_to_z(client, session):
    add_tag(session, "Music")
    add_tag(session, "Art")
    add_tag(session, "Food", "food-drink")

    response = client.get("/events/tags")

    assert response.status_code == 200
    body = response.json()
    assert [t["name"] for t in body] == ["Art", "Food", "Music"]
    assert set(body[1]) == {"id", "name", "slug"}
    assert body[1]["slug"] == "food-drink"


def test_no_tags_is_an_empty_list(client):
    response = client.get("/events/tags")

    assert response.status_code == 200
    assert response.json() == []


# --- GET /events/random -----------------------------------------------------


def test_random_returns_an_event(client, session):
    event = add_event(session, title="Only one")

    response = client.get("/events/random")

    assert response.status_code == 200
    assert response.json()["id"] == str(event.id)


def test_random_is_not_mistaken_for_an_event_id(client, session):
    add_event(session)

    assert client.get("/events/random").status_code == 200


def test_random_with_no_events_is_a_404(client):
    response = client.get("/events/random")

    assert response.status_code == 404


def test_random_includes_tags(client, session):
    tag = add_tag(session, "Music")
    event = add_event(session)
    link_tag(session, event, tag)

    body = client.get("/events/random").json()

    assert [t["slug"] for t in body["tags"]] == ["music"]

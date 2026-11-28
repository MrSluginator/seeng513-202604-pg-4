"""Tests for saving events, save status and recording visits.

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


def save(client, user, event_id):
    return client.post(f"/events/{event_id}/save", headers=bearer(user))


def unsave(client, user, event_id):
    return client.delete(f"/events/{event_id}/save", headers=bearer(user))


def status(client, user, event_id):
    return client.get(f"/events/{event_id}/save-status", headers=bearer(user))


def visit(client, user, event_id):
    return client.post(f"/events/{event_id}/visit", headers=bearer(user))


def saved_list(client, user):
    return client.get("/users/me/saved-events", headers=bearer(user))


def test_an_event_can_be_saved(client, session):
    user = make_user(session)
    event = add_event(session)

    response = save(client, user, event.id)

    assert response.status_code == 200
    assert response.json() == {
        "event_id": str(event.id),
        "is_saved": True,
        "user_visits": 0,
    }


def test_saving_twice_is_fine(client, session):
    user = make_user(session)
    event = add_event(session)

    save(client, user, event.id)
    response = save(client, user, event.id)

    assert response.status_code == 200
    assert len(session.scalars(select(SavedEvent)).all()) == 1


def test_an_event_can_be_unsaved(client, session):
    user = make_user(session)
    event = add_event(session)
    save(client, user, event.id)

    response = unsave(client, user, event.id)

    assert response.json()["is_saved"] is False
    assert saved_list(client, user).json()["total"] == 0


def test_unsaving_something_never_saved_is_fine(client, session):
    user = make_user(session)
    event = add_event(session)

    response = unsave(client, user, event.id)

    assert response.status_code == 200
    assert response.json()["is_saved"] is False


def test_save_status_follows_save_and_unsave(client, session):
    user = make_user(session)
    event = add_event(session)

    assert status(client, user, event.id).json()["is_saved"] is False
    save(client, user, event.id)
    assert status(client, user, event.id).json()["is_saved"] is True
    unsave(client, user, event.id)
    assert status(client, user, event.id).json()["is_saved"] is False


def test_unsaving_keeps_the_visit_history(client, session):
    user = make_user(session)
    event = add_event(session)
    save(client, user, event.id)
    visit(client, user, event.id)
    visit(client, user, event.id)

    unsaved = unsave(client, user, event.id).json()
    resaved = save(client, user, event.id).json()

    assert unsaved["user_visits"] == 2
    assert resaved["user_visits"] == 2


def test_unknown_events_are_a_404_everywhere(client, session):
    user = make_user(session)
    missing = uuid.uuid4()

    assert save(client, user, missing).status_code == 404
    assert unsave(client, user, missing).status_code == 404
    assert status(client, user, missing).status_code == 404
    assert visit(client, user, missing).status_code == 404


def test_every_saved_route_requires_a_login(client, session):
    event = add_event(session)

    assert client.post(f"/events/{event.id}/save").status_code == 401
    assert client.delete(f"/events/{event.id}/save").status_code == 401
    assert client.get(f"/events/{event.id}/save-status").status_code == 401
    assert client.post(f"/events/{event.id}/visit").status_code == 401
    assert client.get("/users/me/saved-events").status_code == 401
    assert client.get("/users/me/saved-events/ids").status_code == 401


def test_users_have_separate_saved_lists(client, session):
    alice = make_user(session, "alice")
    bob = make_user(session, "bob")
    event = add_event(session)
    save(client, alice, event.id)

    unsave(client, bob, event.id)

    assert saved_list(client, alice).json()["total"] == 1
    assert saved_list(client, bob).json()["total"] == 0
    assert status(client, bob, event.id).json()["is_saved"] is False


def test_the_saved_list_has_the_event_card_and_visit_count(client, session):
    user = make_user(session)
    event = add_event(session, title="Jazz")
    link_tag(session, event, add_tag(session, "Music"))
    save(client, user, event.id)
    visit(client, user, event.id)

    body = saved_list(client, user).json()

    assert body["total"] == 1
    item = body["items"][0]
    assert item["event"]["title"] == "Jazz"
    assert [t["slug"] for t in item["event"]["tags"]] == ["music"]
    assert item["user_visits"] == 1


def test_the_saved_list_shows_the_newest_first(client, session):
    user = make_user(session)
    for title, hour in [("first", 9), ("third", 11), ("second", 10)]:
        event = add_event(session, title=title)
        session.add(
            SavedEvent(
                user_id=user.id,
                event_id=event.id,
                created_at=datetime(2026, 11, 1, hour, tzinfo=timezone.utc),
            )
        )
    session.commit()

    titles = [i["event"]["title"] for i in saved_list(client, user).json()["items"]]

    assert titles == ["third", "second", "first"]


def test_a_visit_without_saving_does_not_save(client, session):
    user = make_user(session)
    event = add_event(session)

    response = visit(client, user, event.id)

    assert response.json()["user_visits"] == 1
    assert response.json()["visits_count"] == 1
    assert status(client, user, event.id).json()["is_saved"] is False
    assert saved_list(client, user).json()["total"] == 0


def test_visits_add_up_for_the_user_and_the_event(client, session):
    alice = make_user(session, "alice")
    bob = make_user(session, "bob")
    event = add_event(session)

    visit(client, alice, event.id)
    visit(client, alice, event.id)
    body = visit(client, bob, event.id).json()

    assert body["user_visits"] == 1
    assert body["visits_count"] == 3


def saved_ids(client, user):
    response = client.get("/users/me/saved-events/ids", headers=bearer(user))
    assert response.status_code == 200
    return set(response.json())


def test_saved_ids_lists_only_the_events_the_user_saved(client, session):
    user = make_user(session)
    saved = add_event(session, title="Saved")
    unsaved = add_event(session, title="Unsaved")
    visited = add_event(session, title="Visited only")
    add_event(session, title="Untouched")
    save(client, user, saved.id)
    save(client, user, unsaved.id)
    unsave(client, user, unsaved.id)
    visit(client, user, visited.id)

    assert saved_ids(client, user) == {str(saved.id)}


def test_saved_ids_are_separate_for_each_user(client, session):
    alice = make_user(session, "alice")
    bob = make_user(session, "bob")
    event = add_event(session)
    save(client, alice, event.id)

    assert saved_ids(client, alice) == {str(event.id)}
    assert saved_ids(client, bob) == set()

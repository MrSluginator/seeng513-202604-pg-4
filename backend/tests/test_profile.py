"""Tests for PATCH /me and the preferred tags.

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


def update(client, user, **fields):
    return client.patch("/me", json=fields, headers=bearer(user))


def put_tags(client, user, tag_ids):
    return client.put(
        "/me/preferred-tags",
        json={"tag_ids": [str(t) for t in tag_ids]},
        headers=bearer(user),
    )


def get_tags(client, user):
    return client.get("/me/preferred-tags", headers=bearer(user))


# --- PATCH /me ---------------------------------------------------------------


def test_a_user_can_change_their_username_and_phone(client, session):
    user = make_user(session, "alice")

    response = update(client, user, username="alice_2", phone_number="403-555-0100")

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "alice_2"
    assert body["phone_number"] == "403-555-0100"
    assert "password_hash" not in body
    session.refresh(user)
    assert user.username == "alice_2"


def test_changing_one_field_leaves_the_other(client, session):
    user = make_user(session, "alice")
    user.phone_number = "403-555-0100"
    session.commit()

    body = update(client, user, username="alice_2").json()

    assert body["phone_number"] == "403-555-0100"


def test_the_change_shows_up_on_get_me(client, session):
    user = make_user(session, "alice")
    update(client, user, username="alice_2")

    assert client.get("/me", headers=bearer(user)).json()["username"] == "alice_2"


def test_an_empty_update_changes_nothing(client, session):
    user = make_user(session, "alice")

    response = update(client, user)

    assert response.status_code == 200
    assert response.json()["username"] == "alice"


@pytest.mark.parametrize(
    "field, value",
    [
        ("account_type", "admin"),
        ("email", "new@example.com"),
        ("spark_rating", 9999),
        ("password_hash", "x"),
        ("id", str(uuid.uuid4())),
    ],
)
def test_a_user_cannot_change_protected_fields(client, session, field, value):
    user = make_user(session, "alice")

    response = update(client, user, **{field: value})

    assert response.status_code == 422
    session.refresh(user)
    assert user.account_type == "standard"
    assert user.email == "alice@example.com"
    assert user.spark_rating == 0


def test_a_taken_username_is_a_409_even_in_another_case(client, session):
    make_user(session, "bob")
    user = make_user(session, "alice")

    response = update(client, user, username="BOB")

    assert response.status_code == 409
    session.refresh(user)
    assert user.username == "alice"


def test_a_user_can_keep_or_recase_their_own_username(client, session):
    user = make_user(session, "alice")

    assert update(client, user, username="alice").status_code == 200
    assert update(client, user, username="Alice").status_code == 200


@pytest.mark.parametrize(
    "fields",
    [
        {"username": "ab"},
        {"username": "x" * 51},
        {"username": "has space"},
        {"username": "emoji\U0001f525"},
        {"username": None},
        {"phone_number": "abc"},
        {"phone_number": "12"},
        {"phone_number": "1" * 21},
    ],
)
def test_invalid_profile_values_are_rejected(client, session, fields):
    user = make_user(session, "alice")

    response = update(client, user, **fields)

    assert response.status_code == 422
    session.refresh(user)
    assert user.username == "alice"


def test_the_phone_number_can_be_cleared(client, session):
    user = make_user(session, "alice")
    user.phone_number = "403-555-0100"
    session.commit()

    assert update(client, user, phone_number=None).json()["phone_number"] is None
    user.phone_number = "403-555-0100"
    session.commit()
    assert update(client, user, phone_number="  ").json()["phone_number"] is None


def test_updating_the_profile_requires_a_login(client):
    response = client.patch("/me", json={"username": "newname"})

    assert response.status_code == 401


# --- preferred tags ----------------------------------------------------------


def test_preferred_tags_start_empty(client, session):
    user = make_user(session)

    assert get_tags(client, user).json() == []


def test_preferred_tags_can_be_set_and_read_back_a_to_z(client, session):
    user = make_user(session)
    music = add_tag(session, "Music")
    art = add_tag(session, "Art")

    response = put_tags(client, user, [music.id, art.id])

    assert response.status_code == 200
    assert [t["slug"] for t in response.json()] == ["art", "music"]
    assert [t["slug"] for t in get_tags(client, user).json()] == ["art", "music"]


def test_putting_tags_replaces_the_old_list(client, session):
    user = make_user(session)
    music = add_tag(session, "Music")
    art = add_tag(session, "Art")
    food = add_tag(session, "Food")
    put_tags(client, user, [music.id, art.id])

    response = put_tags(client, user, [art.id, food.id])

    assert [t["slug"] for t in response.json()] == ["art", "food"]
    assert len(session.scalars(select(UserPreferredTag)).all()) == 2


def test_an_empty_list_clears_the_tags(client, session):
    user = make_user(session)
    put_tags(client, user, [add_tag(session, "Music").id])

    assert put_tags(client, user, []).json() == []
    assert get_tags(client, user).json() == []


def test_repeated_ids_are_counted_once(client, session):
    user = make_user(session)
    music = add_tag(session, "Music")

    response = put_tags(client, user, [music.id, music.id])

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_an_unknown_tag_changes_nothing(client, session):
    user = make_user(session)
    music = add_tag(session, "Music")
    put_tags(client, user, [music.id])

    response = put_tags(client, user, [uuid.uuid4()])

    assert response.status_code == 422
    assert [t["slug"] for t in get_tags(client, user).json()] == ["music"]


def test_a_malformed_tag_id_is_rejected(client, session):
    user = make_user(session)

    response = client.put(
        "/me/preferred-tags", json={"tag_ids": ["nope"]}, headers=bearer(user)
    )

    assert response.status_code == 422


def test_users_have_separate_preferred_tags(client, session):
    alice = make_user(session, "alice")
    bob = make_user(session, "bob")
    music = add_tag(session, "Music")
    put_tags(client, alice, [music.id])

    assert get_tags(client, bob).json() == []
    put_tags(client, bob, [])
    assert [t["slug"] for t in get_tags(client, alice).json()] == ["music"]


def test_preferred_tags_require_a_login(client):
    assert client.get("/me/preferred-tags").status_code == 401
    assert client.put("/me/preferred-tags", json={"tag_ids": []}).status_code == 401

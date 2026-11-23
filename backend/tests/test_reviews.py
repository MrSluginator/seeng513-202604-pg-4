"""Tests for reviews and the server-side rating calculation.

They run against an in-memory SQLite database, so CI needs no Postgres service.
"""

import uuid
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


def review(client, user, event_id, **fields):
    body = {"rating": 5, **fields}
    return client.post(f"/events/{event_id}/reviews", json=body, headers=bearer(user))


def event_body(client, event_id):
    return client.get(f"/events/{event_id}").json()


# --- POST /events/{id}/reviews ---------------------------------------------


def test_a_review_can_be_posted(client, session):
    user = make_user(session, "alice")
    event = add_event(session)

    response = review(client, user, event.id, rating=4, content="Great night")

    assert response.status_code == 201
    body = response.json()
    assert body["rating"] == 4
    assert body["content"] == "Great night"
    assert body["username"] == "alice"
    assert body["user_id"] == str(user.id)
    assert body["event_id"] == str(event.id)
    assert "email" not in body and "password_hash" not in body


def test_the_event_rating_is_recalculated(client, session):
    event = add_event(session)

    review(client, make_user(session, "a"), event.id, rating=5)
    assert event_body(client, event.id)["rating"] == 5.0
    assert event_body(client, event.id)["review_count"] == 1

    review(client, make_user(session, "b"), event.id, rating=4)
    body = event_body(client, event.id)
    assert body["rating"] == 4.5
    assert body["review_count"] == 2


def test_the_average_is_rounded_to_two_places(client, session):
    event = add_event(session)

    for name, rating in [("a", 5), ("b", 4), ("c", 4)]:
        review(client, make_user(session, name), event.id, rating=rating)

    assert event_body(client, event.id)["rating"] == 4.33


def test_a_wrong_stored_rating_is_replaced_not_added_to(client, session):
    event = add_event(session, rating=1, review_count=40)

    review(client, make_user(session), event.id, rating=5)

    body = event_body(client, event.id)
    assert body["rating"] == 5.0
    assert body["review_count"] == 1


def test_one_review_per_user_per_event(client, session):
    user = make_user(session)
    event = add_event(session)
    review(client, user, event.id, rating=5)

    response = review(client, user, event.id, rating=1)

    assert response.status_code == 409
    body = event_body(client, event.id)
    assert body["rating"] == 5.0
    assert body["review_count"] == 1


def test_the_same_user_can_review_different_events(client, session):
    user = make_user(session)
    first = add_event(session)
    second = add_event(session)

    assert review(client, user, first.id).status_code == 201
    assert review(client, user, second.id).status_code == 201


def test_you_cannot_review_your_own_event(client, session):
    organizer = make_user(session, "olivia", "organizer")
    event = add_event(session, creator_id=organizer.id)

    response = review(client, organizer, event.id)

    assert response.status_code == 403
    assert event_body(client, event.id)["review_count"] == 0


def test_reviewing_requires_a_login(client, session):
    event = add_event(session)

    response = client.post(f"/events/{event.id}/reviews", json={"rating": 5})

    assert response.status_code == 401


def test_reviewing_an_unknown_event_is_a_404(client, session):
    user = make_user(session)

    assert review(client, user, uuid.uuid4()).status_code == 404


@pytest.mark.parametrize("rating", [0, 6, -1, 4.5, "five", None])
def test_a_bad_rating_is_rejected(client, session, rating):
    user = make_user(session)
    event = add_event(session)

    response = review(client, user, event.id, rating=rating)

    assert response.status_code == 422
    assert event_body(client, event.id)["review_count"] == 0


def test_a_client_cannot_set_the_event_rating(client, session):
    user = make_user(session)
    event = add_event(session)

    review(client, user, event.id, rating=2, event_rating=5, review_count=100)

    body = event_body(client, event.id)
    assert body["rating"] == 2.0
    assert body["review_count"] == 1


def test_blank_review_text_is_stored_as_nothing(client, session):
    user = make_user(session)
    event = add_event(session)

    body = review(client, user, event.id, content="   ").json()

    assert body["content"] is None


def test_review_text_is_trimmed_and_length_limited(client, session):
    event = add_event(session)

    trimmed = review(client, make_user(session, "a"), event.id, content="  hi  ")
    too_long = review(client, make_user(session, "b"), event.id, content="x" * 2001)

    assert trimmed.json()["content"] == "hi"
    assert too_long.status_code == 422


def test_a_review_needs_no_text(client, session):
    user = make_user(session)
    event = add_event(session)

    response = client.post(
        f"/events/{event.id}/reviews", json={"rating": 3}, headers=bearer(user)
    )

    assert response.status_code == 201
    assert response.json()["content"] is None


# --- GET /events/{id}/reviews -----------------------------------------------


def test_reviews_are_public_and_show_who_wrote_them(client, session):
    user = make_user(session, "alice")
    event = add_event(session)
    review(client, user, event.id, rating=4, content="Fun")

    response = client.get(f"/events/{event.id}/reviews")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["username"] == "alice"
    assert body["items"][0]["content"] == "Fun"
    assert "email" not in body["items"][0]


def test_reviews_are_newest_first(client, session):
    event = add_event(session)
    for name, hour in [("old", 9), ("new", 11), ("mid", 10)]:
        user = make_user(session, name)
        session.add(
            Review(
                event_id=event.id,
                user_id=user.id,
                rating=3,
                created_at=datetime(2026, 11, 1, hour, tzinfo=timezone.utc),
            )
        )
    session.commit()

    items = client.get(f"/events/{event.id}/reviews").json()["items"]

    assert [r["username"] for r in items] == ["new", "mid", "old"]


def test_reviews_are_paged(client, session):
    event = add_event(session)
    for number in range(5):
        review(client, make_user(session, f"user{number}"), event.id)

    page = client.get(
        f"/events/{event.id}/reviews", params={"limit": 2, "offset": 4}
    ).json()

    assert page["total"] == 5
    assert len(page["items"]) == 1


def test_only_that_events_reviews_are_listed(client, session):
    user = make_user(session)
    first = add_event(session)
    second = add_event(session)
    review(client, user, first.id)

    body = client.get(f"/events/{second.id}/reviews").json()

    assert body == {"total": 0, "items": []}


def test_listing_reviews_of_an_unknown_event_is_a_404(client):
    assert client.get(f"/events/{uuid.uuid4()}/reviews").status_code == 404


# --- PATCH and DELETE /reviews/{id} ----------------------------------------


def edit(client, user, review_id, **fields):
    return client.patch(f"/reviews/{review_id}", json=fields, headers=bearer(user))


def remove(client, user, review_id):
    return client.delete(f"/reviews/{review_id}", headers=bearer(user))


def test_an_author_can_change_their_review_and_the_rating_follows(client, session):
    author = make_user(session, "alice")
    other = make_user(session, "bob")
    event = add_event(session)
    mine = review(client, author, event.id, rating=5).json()
    review(client, other, event.id, rating=3)

    response = edit(client, author, mine["id"], rating=1, content="Changed my mind")

    assert response.status_code == 200
    assert response.json()["rating"] == 1
    assert response.json()["content"] == "Changed my mind"
    assert event_body(client, event.id)["rating"] == 2.0


def test_the_text_can_be_cleared(client, session):
    author = make_user(session)
    event = add_event(session)
    mine = review(client, author, event.id, content="Hello").json()

    response = edit(client, author, mine["id"], content=None)

    assert response.json()["content"] is None
    assert response.json()["rating"] == 5


def test_someone_elses_review_cannot_be_edited(client, session):
    author = make_user(session, "alice")
    other = make_user(session, "bob")
    event = add_event(session)
    mine = review(client, author, event.id, rating=5).json()

    response = edit(client, other, mine["id"], rating=1)

    assert response.status_code == 403
    assert event_body(client, event.id)["rating"] == 5.0


@pytest.mark.parametrize("fields", [{}, {"rating": None}, {"rating": 9}])
def test_a_bad_edit_is_rejected(client, session, fields):
    author = make_user(session)
    event = add_event(session)
    mine = review(client, author, event.id, rating=4).json()

    assert edit(client, author, mine["id"], **fields).status_code == 422
    assert event_body(client, event.id)["rating"] == 4.0


def test_editing_needs_a_login_and_a_real_review(client, session):
    user = make_user(session)
    event = add_event(session)
    mine = review(client, user, event.id).json()

    assert client.patch(f"/reviews/{mine['id']}", json={"rating": 1}).status_code == 401
    assert edit(client, user, uuid.uuid4(), rating=1).status_code == 404


def test_an_author_can_delete_their_review_and_the_rating_follows(client, session):
    author = make_user(session, "alice")
    other = make_user(session, "bob")
    event = add_event(session)
    mine = review(client, author, event.id, rating=5).json()
    review(client, other, event.id, rating=3)

    response = remove(client, author, mine["id"])

    assert response.status_code == 204
    body = event_body(client, event.id)
    assert body["rating"] == 3.0
    assert body["review_count"] == 1


def test_deleting_the_last_review_clears_the_rating(client, session):
    author = make_user(session)
    event = add_event(session)
    mine = review(client, author, event.id, rating=5).json()

    remove(client, author, mine["id"])

    body = event_body(client, event.id)
    assert body["rating"] is None
    assert body["review_count"] == 0


def test_an_author_can_review_again_after_deleting(client, session):
    author = make_user(session)
    event = add_event(session)
    mine = review(client, author, event.id).json()
    remove(client, author, mine["id"])

    assert review(client, author, event.id, rating=2).status_code == 201


def test_someone_elses_review_cannot_be_deleted_but_an_admin_can(client, session):
    author = make_user(session, "alice")
    other = make_user(session, "bob")
    admin = make_user(session, "root", "admin")
    event = add_event(session)
    mine = review(client, author, event.id).json()

    assert remove(client, other, mine["id"]).status_code == 403
    assert event_body(client, event.id)["review_count"] == 1
    assert remove(client, admin, mine["id"]).status_code == 204
    assert event_body(client, event.id)["review_count"] == 0


def test_deleting_needs_a_login_and_a_real_review(client, session):
    user = make_user(session)
    event = add_event(session)
    mine = review(client, user, event.id).json()

    assert client.delete(f"/reviews/{mine['id']}").status_code == 401
    assert remove(client, user, uuid.uuid4()).status_code == 404

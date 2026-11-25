"""Tests for sparks: earned by posting, lost on delete, adjusted by admins.

They run against an in-memory SQLite database, so CI needs no Postgres service.
"""

import uuid

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
    ScrapedEvent.__table__,
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


def sparks_of(session, user):
    session.expire_all()
    return session.get(User, user.id).spark_rating


def post_event(client, user, **fields):
    body = {"title": "Jam night", **fields}
    return client.post("/events", json=body, headers=bearer(user))


def review(client, user, event_id, **fields):
    body = {"rating": 5, **fields}
    return client.post(f"/events/{event_id}/reviews", json=body, headers=bearer(user))


def adjust(client, admin, user_id, **fields):
    body = {"amount": 10, "reason": "Helpful listing", **fields}
    return client.post(
        f"/admin/users/{user_id}/sparks", json=body, headers=bearer(admin)
    )


# --- sparking events --------------------------------------------------------


def spark_event(client, user, event_id, amount=None):
    body = None if amount is None else {"amount": amount}
    return client.post(f"/events/{event_id}/spark", json=body, headers=bearer(user))


def make_event(session, organizer, **fields):
    return add_event(session, creator_id=organizer.id, **fields)


def test_sparking_an_event_gives_the_organizer_one_spark(client, session):
    organizer = make_user(session, "org", "organizer")
    fan = make_user(session, "alice")
    event = make_event(session, organizer)

    response = spark_event(client, fan, event.id)

    assert response.status_code == 200
    assert response.json() == {"spark_rating": 1}
    assert sparks_of(session, organizer) == 1
    assert sparks_of(session, fan) == 0


def test_a_user_can_spark_the_same_event_as_often_as_they_like(client, session):
    organizer = make_user(session, "org", "organizer")
    fan = make_user(session, "alice")
    event = make_event(session, organizer)

    for _ in range(3):
        spark_event(client, fan, event.id)

    assert sparks_of(session, organizer) == 3


def test_sparks_from_different_users_add_up(client, session):
    organizer = make_user(session, "org", "organizer")
    event = make_event(session, organizer)

    for name in ["a_user", "b_user", "c_user"]:
        spark_event(client, make_user(session, name), event.id)

    assert sparks_of(session, organizer) == 3


def test_you_cannot_spark_your_own_event(client, session):
    organizer = make_user(session, "org", "organizer")
    event = make_event(session, organizer)

    assert spark_event(client, organizer, event.id).status_code == 403
    assert sparks_of(session, organizer) == 0


def test_sparking_needs_a_login_and_a_real_event(client, session):
    fan = make_user(session, "alice")
    event = add_event(session)

    assert client.post(f"/events/{event.id}/spark").status_code == 401
    assert spark_event(client, fan, uuid.uuid4()).status_code == 404


def test_an_event_with_no_organizer_can_be_sparked_but_nobody_gains(client, session):
    fan = make_user(session, "alice")
    event = add_event(session)

    response = spark_event(client, fan, event.id)

    assert response.status_code == 200
    assert response.json() == {"spark_rating": 0}
    assert sparks_of(session, fan) == 0


def test_posting_or_deleting_an_event_does_not_change_sparks(client, session):
    organizer = make_user(session, "org", "organizer")
    fan = make_user(session, "alice")

    event_id = client.post(
        "/events", json={"title": "Jam night"}, headers=bearer(organizer)
    ).json()["id"]
    assert sparks_of(session, organizer) == 0

    spark_event(client, fan, event_id)
    client.delete(f"/events/{event_id}", headers=bearer(organizer))

    assert sparks_of(session, organizer) == 1


def test_a_spark_can_be_taken_away_from_an_event(client, session):
    organizer = make_user(session, "org", "organizer")
    fan = make_user(session, "alice")
    event = make_event(session, organizer)

    response = spark_event(client, fan, event.id, amount=-1)

    assert response.json() == {"spark_rating": -1}
    assert sparks_of(session, organizer) == -1


def test_event_sparks_can_go_up_and_down_without_limit(client, session):
    organizer = make_user(session, "org", "organizer")
    fan = make_user(session, "alice")
    event = make_event(session, organizer)

    for amount in [1, 1, 1, -1, -1, -1, -1, -1]:
        spark_event(client, fan, event.id, amount=amount)

    assert sparks_of(session, organizer) == -2


@pytest.mark.parametrize(
    "body", [{"amount": 0}, {"amount": 2}, {"amount": "up"}, {"x": 1}]
)
def test_only_plus_or_minus_one_is_accepted(client, session, body):
    organizer = make_user(session, "org", "organizer")
    fan = make_user(session, "alice")
    event = make_event(session, organizer)

    response = client.post(f"/events/{event.id}/spark", json=body, headers=bearer(fan))

    assert response.status_code == 422
    assert sparks_of(session, organizer) == 0


# --- sparking reviews -------------------------------------------------------


def spark_review(client, user, review_id, amount=None):
    body = None if amount is None else {"amount": amount}
    return client.post(f"/reviews/{review_id}/spark", json=body, headers=bearer(user))


def test_sparking_a_review_gives_its_author_one_spark(client, session):
    author = make_user(session, "writer")
    reader = make_user(session, "reader")
    review_id = review(client, author, add_event(session).id).json()["id"]

    response = spark_review(client, reader, review_id)

    assert response.json() == {"spark_rating": 1}
    assert sparks_of(session, author) == 1
    assert sparks_of(session, reader) == 0


def test_a_user_can_spark_the_same_review_as_often_as_they_like(client, session):
    author = make_user(session, "writer")
    reader = make_user(session, "reader")
    review_id = review(client, author, add_event(session).id).json()["id"]

    for _ in range(4):
        spark_review(client, reader, review_id)

    assert sparks_of(session, author) == 4


def test_a_spark_can_be_taken_away_from_a_review(client, session):
    author = make_user(session, "writer")
    reader = make_user(session, "reader")
    review_id = review(client, author, add_event(session).id).json()["id"]

    response = spark_review(client, reader, review_id, amount=-1)

    assert response.json() == {"spark_rating": -1}
    assert sparks_of(session, author) == -1


def test_you_cannot_spark_your_own_review(client, session):
    author = make_user(session, "writer")
    review_id = review(client, author, add_event(session).id).json()["id"]

    assert spark_review(client, author, review_id).status_code == 403
    assert sparks_of(session, author) == 0


def test_sparking_a_review_needs_a_login_and_a_real_review(client, session):
    reader = make_user(session, "reader")

    assert client.post(f"/reviews/{uuid.uuid4()}/spark").status_code == 401
    assert spark_review(client, reader, uuid.uuid4()).status_code == 404


def test_posting_or_editing_a_review_gives_no_sparks(client, session):
    author = make_user(session, "writer")
    review_id = review(client, author, add_event(session).id).json()["id"]

    client.patch(f"/reviews/{review_id}", json={"rating": 2}, headers=bearer(author))

    assert sparks_of(session, author) == 0


def test_sparks_stay_when_a_review_is_deleted(client, session):
    author = make_user(session, "writer")
    reader = make_user(session, "reader")
    review_id = review(client, author, add_event(session).id).json()["id"]
    spark_review(client, reader, review_id)

    client.delete(f"/reviews/{review_id}", headers=bearer(author))

    assert sparks_of(session, author) == 1


# --- admin adjustments ------------------------------------------------------


def test_an_admin_can_add_sparks(client, session):
    admin = make_user(session, "boss", "admin")
    user = make_user(session, "alice")

    response = adjust(client, admin, user.id, amount=25)

    assert response.status_code == 200
    assert response.json()["spark_rating"] == 25
    assert sparks_of(session, user) == 25


def test_an_admin_can_take_sparks_away_even_below_zero(client, session):
    admin = make_user(session, "boss", "admin")
    user = make_user(session, "alice")
    adjust(client, admin, user.id, amount=10)

    adjust(client, admin, user.id, amount=-4)
    assert sparks_of(session, user) == 6

    adjust(client, admin, user.id, amount=-100)
    assert sparks_of(session, user) == -94


def test_the_reason_is_logged(client, session, caplog):
    admin = make_user(session, "boss", "admin")
    user = make_user(session, "alice")

    with caplog.at_level("WARNING", logger="flare.auth"):
        adjust(client, admin, user.id, amount=-5, reason="Misleading listing")

    assert "Misleading listing" in caplog.text


def test_only_admins_can_adjust_sparks(client, session):
    organizer = make_user(session, "org", "organizer")
    user = make_user(session, "alice")

    assert adjust(client, organizer, user.id).status_code == 403
    assert adjust(client, user, user.id).status_code == 403
    assert client.post(f"/admin/users/{user.id}/sparks", json={}).status_code == 401
    assert sparks_of(session, user) == 0


def test_an_admin_cannot_change_their_own_sparks(client, session):
    admin = make_user(session, "boss", "admin")

    assert adjust(client, admin, admin.id).status_code == 400
    assert sparks_of(session, admin) == 0


def test_adjusting_an_unknown_user_is_404(client, session):
    admin = make_user(session, "boss", "admin")

    assert adjust(client, admin, uuid.uuid4()).status_code == 404


@pytest.mark.parametrize(
    "fields",
    [
        {"amount": 0},
        {"amount": 1001},
        {"amount": -1001},
        {"amount": "lots"},
        {"reason": ""},
        {"reason": "  "},
        {"reason": "x" * 201},
        {"extra": 1},
    ],
)
def test_bad_adjustments_are_rejected(client, session, fields):
    admin = make_user(session, "boss", "admin")
    user = make_user(session, "alice")

    response = adjust(client, admin, user.id, **fields)

    assert response.status_code == 422
    assert sparks_of(session, user) == 0


# --- reading sparks ---------------------------------------------------------


def test_my_sparks_show_on_my_account(client, session):
    user = make_user(session, "alice")
    reader = make_user(session, "reader")
    review_id = review(client, user, add_event(session).id).json()["id"]
    spark_review(client, reader, review_id)

    body = client.get("/me", headers=bearer(user)).json()

    assert body["spark_rating"] == 1


def test_another_users_sparks_can_be_read_when_logged_in(client, session):
    viewer = make_user(session, "bob")
    user = make_user(session, "alice")
    user.spark_rating = 42
    session.commit()

    response = client.get(f"/users/{user.id}/sparks", headers=bearer(viewer))

    assert response.status_code == 200
    assert response.json() == {
        "id": str(user.id),
        "username": "alice",
        "spark_rating": 42,
    }


def test_reading_sparks_needs_a_login_and_a_real_user(client, session):
    viewer = make_user(session, "bob")

    assert client.get(f"/users/{uuid.uuid4()}/sparks").status_code == 401
    assert (
        client.get(f"/users/{uuid.uuid4()}/sparks", headers=bearer(viewer)).status_code
        == 404
    )

"""Tests for GET /heatmap.

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
from routers import heatmap as heatmap_module
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


def get(client, user=None, **params):
    headers = bearer(user) if user else {}
    return client.get("/heatmap", params=params, headers=headers)


def venue(session, title="Venue", lat=51.04, lng=-114.07, **fields):
    return add_event(session, title=title, latitude=lat, longitude=lng, **fields)


def by_title(response):
    return {p["title"]: p for p in response.json()["points"]}


def test_the_heatmap_requires_a_login(client, session):
    venue(session)

    assert get(client).status_code == 401


def test_a_bad_token_is_rejected(client):
    response = client.get("/heatmap", headers={"Authorization": "Bearer nope"})

    assert response.status_code == 401


def test_points_come_from_the_crowd_at_the_chosen_hour(client, session):
    user = make_user(session)
    venue(session, "Bar", crowd_by_hour={"20": 80, "21": 40})

    body = get(client, user, hour=20).json()

    assert body["hour"] == 20
    point = body["points"][0]
    assert point["title"] == "Bar"
    assert point["intensity"] == 0.8
    assert point["source"] == "crowd"
    assert point["latitude"] == 51.04
    assert point["longitude"] == -114.07


def test_the_same_venue_changes_with_the_hour(client, session):
    user = make_user(session)
    venue(session, "Bar", crowd_by_hour={"20": 80, "21": 40})

    assert by_title(get(client, user, hour=21))["Bar"]["intensity"] == 0.4


def test_the_default_hour_is_the_current_local_hour(client, session, monkeypatch):
    user = make_user(session)
    venue(session, "Bar", crowd_by_hour={"7": 50})
    monkeypatch.setattr(
        heatmap_module,
        "_local_now",
        lambda: datetime(2026, 11, 23, 7, 30, tzinfo=timezone.utc),
    )

    body = get(client, user).json()

    assert body["hour"] == 7
    assert body["day"] == 0  # 23 Nov 2026 is a Monday
    assert body["points"][0]["intensity"] == 0.5


@pytest.mark.parametrize("hour", [-1, 24, "noon"])
def test_a_bad_hour_is_rejected(client, session, hour):
    user = make_user(session)

    assert get(client, user, hour=hour).status_code == 422


def test_crowd_data_can_be_a_list_of_24_hours(client, session):
    user = make_user(session)
    venue(session, "Bar", crowd_by_hour=[0] * 18 + [90] + [0] * 5)

    body = get(client, user, hour=18).json()

    assert body["points"][0]["intensity"] == 0.9


@pytest.mark.parametrize(
    "crowd, expected",
    [
        ({"20": 250}, 1.0),
        ({"20": "60"}, 0.6),
        ({"20": 33.3333}, 0.333),
    ],
)
def test_crowd_values_are_clamped_and_rounded(client, session, crowd, expected):
    user = make_user(session)
    venue(session, "Bar", crowd_by_hour=crowd)

    assert get(client, user, hour=20).json()["points"][0]["intensity"] == expected


@pytest.mark.parametrize(
    "crowd",
    [{"20": "busy"}, {"20": None}, {"20": [1]}, {"20": True}, [1, 2, 3], "x", 5],
)
def test_unreadable_crowd_data_is_ignored_not_an_error(client, session, crowd):
    user = make_user(session)
    venue(session, "Bar", crowd_by_hour=crowd)

    response = get(client, user, hour=20)

    assert response.status_code == 200
    assert response.json()["points"] == []


def test_venues_without_crowd_data_use_visits(client, session):
    user = make_user(session)
    venue(session, "Busiest", visits_count=200)
    venue(session, "Half", visits_count=100)
    venue(session, "Nobody", visits_count=0)

    points = by_title(get(client, user, hour=12))

    assert points["Busiest"]["intensity"] == 1.0
    assert points["Busiest"]["source"] == "visits"
    assert points["Half"]["intensity"] == 0.5
    assert "Nobody" not in points


def test_crowd_data_wins_over_visits(client, session):
    user = make_user(session)
    venue(session, "Known", crowd_by_hour={"12": 20}, visits_count=500)
    venue(session, "Other", visits_count=100)

    points = by_title(get(client, user, hour=12))

    assert points["Known"]["intensity"] == 0.2
    assert points["Known"]["source"] == "crowd"


def test_a_quiet_hour_is_left_off_the_map(client, session):
    user = make_user(session)
    venue(session, "Quiet", crowd_by_hour={"3": 0}, visits_count=900)

    assert get(client, user, hour=3).json()["points"] == []


def test_events_without_a_location_are_left_out(client, session):
    user = make_user(session)
    add_event(session, title="No place", crowd_by_hour={"20": 90})
    add_event(session, title="Half a place", latitude=51.0, crowd_by_hour={"20": 90})
    venue(session, "Placed", crowd_by_hour={"20": 90})

    assert list(by_title(get(client, user, hour=20))) == ["Placed"]


def test_the_map_corners_limit_the_points(client, session):
    user = make_user(session)
    venue(session, "Downtown", lat=51.05, lng=-114.07, crowd_by_hour={"20": 50})
    venue(session, "Airport", lat=51.11, lng=-114.02, crowd_by_hour={"20": 50})
    venue(session, "Far away", lat=53.55, lng=-113.49, crowd_by_hour={"20": 50})

    points = by_title(
        get(
            client,
            user,
            hour=20,
            min_lat=51.0,
            max_lat=51.08,
            min_lng=-114.2,
            max_lng=-114.0,
        )
    )

    assert list(points) == ["Downtown"]


def test_the_corners_must_be_real_coordinates(client, session):
    user = make_user(session)

    assert get(client, user, min_lat=91).status_code == 422
    assert get(client, user, max_lng=-181).status_code == 422


def test_the_number_of_points_is_limited(client, session):
    user = make_user(session)
    for number in range(5):
        venue(session, f"V{number}", crowd_by_hour={"20": 50}, visits_count=number)

    body = get(client, user, hour=20, limit=3).json()

    assert len(body["points"]) == 3
    assert get(client, user, limit=0).status_code == 422
    assert get(client, user, limit=501).status_code == 422


def test_an_empty_database_gives_an_empty_map(client, session):
    user = make_user(session)

    body = get(client, user, hour=12).json()

    assert body["points"] == []
    assert "generated_at" in body


def weekly(**by_day):
    """A crowd_by_hour with an all-week average and per-weekday hours."""
    return {
        "20": 10,
        "by_day": {day: {"20": value} for day, value in by_day.items()},
    }


def test_the_weekday_forecast_is_used_when_there_is_one(client, session):
    user = make_user(session)
    venue(session, "Bar", crowd_by_hour=weekly(**{"4": 90, "1": 30}))

    friday = get(client, user, hour=20, day=4).json()["points"][0]
    tuesday = get(client, user, hour=20, day=1).json()["points"][0]

    assert friday["intensity"] == 0.9
    assert tuesday["intensity"] == 0.3


def test_a_weekday_without_a_forecast_uses_the_weekly_average(client, session):
    user = make_user(session)
    venue(session, "Bar", crowd_by_hour=weekly(**{"4": 90}))

    point = get(client, user, hour=20, day=2).json()["points"][0]

    assert point["intensity"] == 0.1


def test_the_default_day_is_today(client, session, monkeypatch):
    user = make_user(session)
    venue(session, "Bar", crowd_by_hour=weekly(**{"0": 70, "1": 20}))
    monkeypatch.setattr(
        heatmap_module,
        "_local_now",
        lambda: datetime(2026, 11, 24, 20, 0, tzinfo=timezone.utc),  # a Tuesday
    )

    body = get(client, user).json()

    assert body["day"] == 1
    assert body["points"][0]["intensity"] == 0.2


@pytest.mark.parametrize("day", [-1, 7, "monday"])
def test_a_bad_day_is_rejected(client, session, day):
    user = make_user(session)

    assert get(client, user, day=day).status_code == 422


def test_odd_by_day_data_is_ignored_not_an_error(client, session):
    user = make_user(session)
    venue(session, "Bar", crowd_by_hour={"20": 40, "by_day": "oops"})
    venue(session, "Bar2", crowd_by_hour={"20": 60, "by_day": {"4": [1, 2]}})

    points = by_title(get(client, user, hour=20, day=4))

    assert points["Bar"]["intensity"] == 0.4
    assert points["Bar2"]["intensity"] == 0.6


def test_points_carry_the_venue_name(client, session):
    user = make_user(session)
    venue(
        session,
        "Trivia",
        location_name="Betty Lou's Library, 1 St SW, Calgary",
        crowd_by_hour={"20": 80},
    )
    venue(session, "Nowhere", visits_count=10)
    points = by_title(get(client, user, hour=20, day=0))
    assert points["Trivia"]["venue"] == "Betty Lou's Library"
    assert points["Nowhere"]["venue"] is None

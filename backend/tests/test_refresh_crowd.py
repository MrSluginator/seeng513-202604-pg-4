"""Tests for the BestTime refresh script (refresh_crowd.py).

BestTime is never contacted: the network call is replaced by a fake. They run
against an in-memory SQLite database, so CI needs no Postgres service.
"""

import io
import json
import urllib.error
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import db.models  # noqa: F401  (registers every model)
import refresh_crowd
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
from refresh_crowd import (
    BestTimeError,
    RateLimited,
    export_sql,
    forecast_to_crowd,
    refresh,
)
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


def forecast(days=range(7), value=lambda day, index: index * 4, venue_id="ven_1"):
    """A BestTime-shaped answer: 24 numbers per weekday, first one is 6 AM."""
    return {
        "status": "OK",
        "venue_info": {"venue_id": venue_id, "venue_name": "x"},
        "analysis": [
            {
                "day_info": {"day_int": day},
                "day_raw": [value(day, i) for i in range(24)],
            }
            for day in days
        ],
    }


class FakeBestTime:
    """Stands in for fetch_forecast and remembers what it was asked."""

    def __init__(self, answers=None):
        self.answers = answers or {}
        self.calls = []

    def __call__(self, name, address):
        self.calls.append((name, address))
        answer = self.answers.get(name, forecast())
        if isinstance(answer, Exception):
            raise answer
        return answer


def venue(session, name, visits=0, **fields):
    return add_event(
        session,
        title=f"Event at {name}",
        location_name=name,
        visits_count=visits,
        latitude=51.0,
        longitude=-114.0,
        **fields,
    )


# --- forecast_to_crowd --------------------------------------------------------


def test_the_first_number_is_6_am_and_the_last_is_5_am():
    crowd = forecast_to_crowd(forecast())

    monday = crowd["by_day"]["0"]
    assert monday["6"] == 0  # index 0
    assert monday["7"] == 4  # index 1
    assert monday["23"] == 68  # index 17
    assert monday["0"] == 72  # index 18, after midnight
    assert monday["5"] == 92  # index 23


def test_every_hour_of_the_day_is_filled_in():
    crowd = forecast_to_crowd(forecast())

    assert {str(h) for h in range(24)} <= set(crowd)
    assert set(crowd["by_day"]["3"]) == {str(h) for h in range(24)}


def test_the_top_level_hours_are_the_weekly_average():
    crowd = forecast_to_crowd(
        forecast(days=[0, 1], value=lambda day, index: 20 if day == 0 else 61)
    )

    assert crowd["20"] == 40  # (20 + 61) / 2, rounded


def test_the_forecast_is_marked_as_coming_from_besttime():
    crowd = forecast_to_crowd(forecast(venue_id="ven_42"))

    assert crowd["source"] == "besttime"
    assert crowd["venue_id"] == "ven_42"
    assert crowd["fetched_at"]


def test_numbers_are_rounded_and_clamped_to_0_100():
    crowd = forecast_to_crowd(
        forecast(days=[0], value=lambda d, i: [150, -5, 33.6][i % 3])
    )

    assert crowd["by_day"]["0"]["6"] == 100
    assert crowd["by_day"]["0"]["7"] == 0
    assert crowd["by_day"]["0"]["8"] == 34


def test_a_malformed_day_is_skipped_and_good_days_are_kept():
    answer = forecast(days=[0, 1])
    answer["analysis"].append({"day_info": {"day_int": 2}, "day_raw": [1, 2, 3]})
    answer["analysis"].append({"day_info": {"day_int": 9}, "day_raw": [1] * 24})
    answer["analysis"].append({"nonsense": True})
    answer["analysis"].append("text")

    crowd = forecast_to_crowd(answer)

    assert set(crowd["by_day"]) == {"0", "1"}


@pytest.mark.parametrize(
    "answer",
    [
        {"status": "Error", "message": "venue not found"},
        {"status": "OK"},
        {"status": "OK", "analysis": []},
        {"status": "OK", "analysis": [{"day_info": {"day_int": 0}, "day_raw": [1]}]},
        {},
    ],
)
def test_an_unusable_answer_is_an_error(answer):
    with pytest.raises(BestTimeError):
        forecast_to_crowd(answer)


# --- refresh ------------------------------------------------------------------


def test_a_venue_is_looked_up_once_and_saved_on_all_its_events(session):
    first = venue(session, "The Blue Room")
    second = venue(session, "The Blue Room")
    fake = FakeBestTime()

    result = refresh(session, fetch=fake)

    assert fake.calls == [("The Blue Room", "The Blue Room, Calgary, AB, Canada")]
    assert result.updated == ["The Blue Room"]
    session.refresh(first)
    session.refresh(second)
    assert first.crowd_by_hour["source"] == "besttime"
    assert second.crowd_by_hour["by_day"]["0"]["6"] == 0


def test_the_city_is_part_of_the_address(session):
    venue(session, "Hall")
    fake = FakeBestTime()

    refresh(session, fetch=fake, city="Edmonton, AB")

    assert fake.calls[0][1] == "Hall, Edmonton, AB"


def test_the_limit_caps_the_calls_and_the_busiest_venues_go_first(session):
    venue(session, "Quiet", visits=1)
    venue(session, "Busy", visits=90)
    venue(session, "Medium", visits=50)
    fake = FakeBestTime()

    result = refresh(session, fetch=fake, limit=2)

    assert [name for name, _ in fake.calls] == ["Busy", "Medium"]
    assert result.updated == ["Busy", "Medium"]


def test_a_dry_run_calls_nothing_and_changes_nothing(session):
    event = venue(session, "Hall")
    fake = FakeBestTime()

    result = refresh(session, fetch=fake, dry_run=True)

    assert fake.calls == []
    assert result.planned == ["Hall"]
    session.refresh(event)
    assert event.crowd_by_hour == {}


def test_venues_that_already_have_besttime_data_are_skipped(session):
    venue(session, "Done", crowd_by_hour={"source": "besttime"})
    venue(session, "New")
    fake = FakeBestTime()

    refresh(session, fetch=fake)

    assert [name for name, _ in fake.calls] == ["New"]


def test_force_refreshes_them_again(session):
    venue(session, "Done", crowd_by_hour={"source": "besttime"})
    fake = FakeBestTime()

    refresh(session, fetch=fake, force=True)

    assert [name for name, _ in fake.calls] == ["Done"]


def test_events_without_a_venue_name_are_ignored(session):
    add_event(session, title="No venue")
    add_event(session, title="Blank venue", location_name="   ")
    fake = FakeBestTime()

    result = refresh(session, fetch=fake)

    assert fake.calls == []
    assert result.planned == []


def test_hand_made_crowd_data_is_replaced_on_success_and_kept_on_failure(session):
    good = venue(session, "Good", crowd_by_hour={"20": 55})
    bad = venue(session, "Bad", crowd_by_hour={"20": 66})
    fake = FakeBestTime({"Bad": {"status": "Error"}})

    result = refresh(session, fetch=fake)

    session.refresh(good)
    session.refresh(bad)
    assert good.crowd_by_hour["source"] == "besttime"
    assert bad.crowd_by_hour == {"20": 66}
    assert [name for name, _ in result.failed] == ["Bad"]


def test_one_failed_venue_does_not_stop_the_others(session):
    venue(session, "Unknown", visits=9)
    venue(session, "Known", visits=1)
    fake = FakeBestTime({"Unknown": BestTimeError("nope")})

    result = refresh(session, fetch=fake)

    assert result.updated == ["Known"]
    assert result.failed == [("Unknown", "nope")]
    assert result.stopped is None


def test_a_rate_limit_stops_the_run(session):
    venue(session, "A", visits=3)
    venue(session, "B", visits=2)
    venue(session, "C", visits=1)
    fake = FakeBestTime({"B": RateLimited("slow down")})

    result = refresh(session, fetch=fake)

    assert [name for name, _ in fake.calls] == ["A", "B"]
    assert result.updated == ["A"]
    assert result.stopped == "slow down"


def test_three_failures_in_a_row_stop_the_run(session):
    for number in range(6):
        venue(session, f"V{number}", visits=10 - number)
    fake = FakeBestTime({f"V{n}": BestTimeError("bad key") for n in range(6)})

    result = refresh(session, fetch=fake, limit=10)

    assert len(fake.calls) == 3
    assert result.stopped is not None


def test_a_success_resets_the_failure_count(session):
    names = ["V0", "V1", "V2", "V3", "V4"]
    for number, name in enumerate(names):
        venue(session, name, visits=10 - number)
    fake = FakeBestTime(
        {
            "V0": BestTimeError("x"),
            "V1": BestTimeError("x"),
            "V3": BestTimeError("x"),
            "V4": BestTimeError("x"),
        }
    )

    result = refresh(session, fetch=fake, limit=10)

    assert len(fake.calls) == 5
    assert result.stopped is None


# --- fetch_forecast (the real network call, with the network faked) ------------


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_fetching_needs_the_api_key(monkeypatch):
    monkeypatch.delenv("BESTTIME_API_KEY", raising=False)

    with pytest.raises(BestTimeError, match="BESTTIME_API_KEY"):
        refresh_crowd.fetch_forecast("Hall", "Hall, Calgary")


def test_the_request_is_a_post_to_the_forecast_url(monkeypatch):
    monkeypatch.setenv("BESTTIME_API_KEY", "pri_secret")
    seen = {}

    def fake_urlopen(request, timeout):
        seen["url"], seen["method"] = request.full_url, request.get_method()
        return FakeResponse(b'{"status": "OK"}')

    monkeypatch.setattr(refresh_crowd.urllib.request, "urlopen", fake_urlopen)

    answer = refresh_crowd.fetch_forecast("The Hall", "The Hall, Calgary")

    assert answer == {"status": "OK"}
    assert seen["method"] == "POST"
    assert seen["url"].startswith("https://besttime.app/api/v1/forecasts?")
    assert "venue_name=The+Hall" in seen["url"]


def test_http_429_is_a_rate_limit(monkeypatch):
    monkeypatch.setenv("BESTTIME_API_KEY", "pri_secret")

    def fake_urlopen(request, timeout):
        raise urllib.error.HTTPError(request.full_url, 429, "Too many", {}, None)

    monkeypatch.setattr(refresh_crowd.urllib.request, "urlopen", fake_urlopen)

    with pytest.raises(RateLimited):
        refresh_crowd.fetch_forecast("Hall", "Hall, Calgary")


@pytest.mark.parametrize(
    "error",
    [
        urllib.error.HTTPError(
            "https://x/?api_key_private=pri_secret", 500, "x", {}, None
        ),
        urllib.error.URLError("no route to host"),
        TimeoutError(),
        ValueError("not json"),
    ],
)
def test_other_failures_never_reveal_the_key(monkeypatch, error):
    monkeypatch.setenv("BESTTIME_API_KEY", "pri_secret")

    def fake_urlopen(request, timeout):
        raise error

    monkeypatch.setattr(refresh_crowd.urllib.request, "urlopen", fake_urlopen)

    with pytest.raises(BestTimeError) as caught:
        refresh_crowd.fetch_forecast("Hall", "Hall, Calgary")

    assert "pri_secret" not in str(caught.value)
    assert caught.value.__cause__ is None
    assert caught.value.__suppress_context__ is True


# --- command line ---------------------------------------------------------------


def test_command_line_defaults_are_small():
    args = refresh_crowd.parse_args([])

    assert args.limit == 5
    assert args.force is False
    assert args.dry_run is False


@pytest.mark.parametrize("limit", ["0", "51", "-1", "many"])
def test_a_silly_limit_is_refused(limit):
    with pytest.raises(SystemExit):
        refresh_crowd.parse_args(["--limit", limit])


def test_a_real_run_without_a_key_refuses_before_touching_anything(monkeypatch, capsys):
    monkeypatch.delenv("BESTTIME_API_KEY", raising=False)

    assert refresh_crowd.main(["--limit", "3"]) == 1
    assert "BESTTIME_API_KEY" in capsys.readouterr().out


# --- export ---------------------------------------------------------------------


def test_export_has_an_update_for_each_saved_forecast(session):
    first = venue(session, "A")
    second = venue(session, "B")
    refresh(session, fetch=FakeBestTime())

    sql = export_sql(session)

    assert sql.count("UPDATE events SET crowd_by_hour") == 2
    assert f"WHERE id = '{first.id}';" in sql
    assert f"WHERE id = '{second.id}';" in sql
    assert "::jsonb" in sql


def test_export_skips_events_without_besttime_data(session):
    venue(session, "Hand made", crowd_by_hour={"20": 55})
    venue(session, "Nothing")

    sql = export_sql(session)

    assert "UPDATE" not in sql
    assert sql.startswith("-- BestTime forecasts")


def test_the_exported_json_matches_what_is_stored(session):
    event = venue(session, "A")
    refresh(session, fetch=FakeBestTime())
    session.refresh(event)

    line = [x for x in export_sql(session).splitlines() if x.startswith("UPDATE")][0]
    payload = line.split("crowd_by_hour = '", 1)[1].split("'::jsonb", 1)[0]

    assert json.loads(payload) == event.crowd_by_hour


def test_quotes_in_the_data_cannot_break_out_of_the_sql(session):
    event = venue(session, "A")
    event.crowd_by_hour = {
        "source": "besttime",
        "venue_id": "o'brien'; DROP TABLE x;--",
    }
    session.commit()

    line = [x for x in export_sql(session).splitlines() if x.startswith("UPDATE")][0]

    assert "o''brien''; DROP TABLE x;--" in line
    assert "o'brien'" not in line


def test_exporting_needs_no_api_key(monkeypatch):
    monkeypatch.delenv("BESTTIME_API_KEY", raising=False)

    assert refresh_crowd.parse_args(["--export"]).export is True


# --- picking venues ------------------------------------------------------------


def test_only_the_named_venues_are_looked_up(session):
    venue(session, "Public Plaza", visits=99)
    venue(session, "Betty Lou's Library", visits=1)
    fake = FakeBestTime()

    result = refresh(session, fetch=fake, only=["betty lou's library"])

    assert [name for name, _ in fake.calls] == ["Betty Lou's Library"]
    assert result.updated == ["Betty Lou's Library"]
    assert result.missing == []


def test_a_venue_name_that_matches_nothing_is_reported_and_costs_nothing(session):
    venue(session, "Hall")
    fake = FakeBestTime()

    result = refresh(session, fetch=fake, only=["Halll"])

    assert fake.calls == []
    assert result.missing == ["Halll"]


def test_only_still_respects_the_limit_and_dry_run(session):
    venue(session, "A")
    venue(session, "B")
    fake = FakeBestTime()

    dry = refresh(session, fetch=fake, only=["A", "B"], dry_run=True, limit=1)

    assert fake.calls == []
    assert len(dry.planned) == 1


def test_the_neighbourhood_is_kept_in_the_address_but_not_the_name(session):
    venue(session, "The Nash Annex, Inglewood")
    fake = FakeBestTime()

    refresh(session, fetch=fake)

    assert fake.calls == [
        ("The Nash Annex", "The Nash Annex, Inglewood, Calgary, AB, Canada")
    ]


def test_the_venue_option_can_be_repeated():
    args = refresh_crowd.parse_args(["--venue", "A", "--venue", "B"])

    assert args.venue == ["A", "B"]

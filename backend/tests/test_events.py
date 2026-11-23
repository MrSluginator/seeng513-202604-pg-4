import uuid
from datetime import datetime, timezone
from decimal import Decimal

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
from db.models.tag import Tag
from main import app

# SQLite has no native Decimal type; SQLAlchemy warns about it.
pytestmark = pytest.mark.filterwarnings("ignore:Dialect sqlite")


@pytest.fixture()
def session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(
        engine,
        tables=[
            Event.__table__,
            Tag.__table__,
            EventTag.__table__,
            Photo.__table__,
            EventPhoto.__table__,
        ],
    )
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


def dt(day, hour=18):
    return datetime(2026, 12, day, hour, 0, tzinfo=timezone.utc)


def add_event(session, **fields):
    event = Event(**{"title": "Untitled", **fields})
    session.add(event)
    session.commit()
    return event


def add_tag(session, name, slug):
    tag = Tag(name=name, slug=slug)
    session.add(tag)
    session.commit()
    return tag


def add_event_tag(session, event, tag):
    link = EventTag(event_id=event.id, tag_id=tag.id)
    session.add(link)
    session.commit()


def add_photo(session, url, name="photo.jpg"):
    photo = Photo(
        file_name=name,
        file_url=url,
        file_size_bytes=1024,
        mime_type="image/jpeg",
    )
    session.add(photo)
    session.commit()
    return photo


def add_event_photo(session, event, photo, is_cover=False, display_order=0):
    link = EventPhoto(
        event_id=event.id,
        photo_id=photo.id,
        is_cover=is_cover,
        display_order=display_order,
    )
    session.add(link)
    session.commit()


def titles(response):
    return [item["title"] for item in response.json()["items"]]


def test_empty_database_returns_empty_list(client):
    body = client.get("/events").json()
    assert body == {"total": 0, "items": []}


def test_default_order_is_soonest_first_with_undated_last(client, session):
    add_event(session, title="Later", start_time=dt(20))
    add_event(session, title="Undated")
    add_event(session, title="Sooner", start_time=dt(2))
    assert titles(client.get("/events")) == ["Sooner", "Later", "Undated"]


def test_undated_events_stay_last_when_descending(client, session):
    add_event(session, title="Later", start_time=dt(20))
    add_event(session, title="Undated")
    add_event(session, title="Sooner", start_time=dt(2))
    response = client.get("/events", params={"order": "desc"})
    assert titles(response) == ["Later", "Sooner", "Undated"]


def test_list_numbers_come_back_as_numbers(client, session):
    add_event(
        session,
        title="Priced",
        latitude=Decimal("51.045000"),
        longitude=Decimal("-114.057000"),
        price_min=Decimal("12.50"),
        rating=Decimal("4.25"),
    )
    item = client.get("/events").json()["items"][0]
    assert item["latitude"] == pytest.approx(51.045)
    assert item["longitude"] == pytest.approx(-114.057)
    assert item["price_min"] == pytest.approx(12.5)
    assert item["rating"] == pytest.approx(4.25)
    assert isinstance(item["latitude"], float)


@pytest.mark.parametrize(
    "field,value",
    [
        ("title", "Jazz Night"),
        ("summary", "Live jazz downtown"),
        ("description", "An evening of jazz and cocktails"),
        ("location_name", "The Jazz Cellar"),
    ],
)
def test_search_matches_each_text_field(client, session, field, value):
    add_event(session, **{"title": "Other", field: value})
    add_event(session, title="Unrelated")
    response = client.get("/events", params={"q": "JAZZ"})
    assert response.json()["total"] == 1


def test_search_treats_percent_and_underscore_literally(client, session):
    add_event(session, title="100% fun")
    add_event(session, title="100 percent")
    add_event(session, title="a_b")
    add_event(session, title="axb")
    assert titles(client.get("/events", params={"q": "100%"})) == ["100% fun"]
    assert titles(client.get("/events", params={"q": "a_b"})) == ["a_b"]


def test_date_range_filters(client, session):
    add_event(session, title="Early", start_time=dt(1))
    add_event(session, title="Middle", start_time=dt(10))
    add_event(session, title="Late", start_time=dt(20))
    response = client.get(
        "/events",
        params={
            "starts_after": "2026-12-05T00:00:00Z",
            "starts_before": "2026-12-15T00:00:00Z",
        },
    )
    assert titles(response) == ["Middle"]


def test_max_price_keeps_free_cheap_and_unpriced(client, session):
    add_event(session, title="Free", price_min=Decimal("0"))
    add_event(session, title="Cheap", price_min=Decimal("10"))
    add_event(session, title="Pricey", price_min=Decimal("50"))
    add_event(session, title="Unpriced")
    response = client.get("/events", params={"max_price": 10, "sort": "title"})
    assert titles(response) == ["Cheap", "Free", "Unpriced"]


def test_min_rating_filter_drops_unrated(client, session):
    add_event(session, title="Great", rating=Decimal("4.5"))
    add_event(session, title="Meh", rating=Decimal("3.0"))
    add_event(session, title="Unrated")
    assert titles(client.get("/events", params={"min_rating": 4})) == ["Great"]


def test_sort_by_title_descending(client, session):
    for name in ("Bravo", "Alpha", "Charlie"):
        add_event(session, title=name)
    response = client.get("/events", params={"sort": "title", "order": "desc"})
    assert titles(response) == ["Charlie", "Bravo", "Alpha"]


def test_sort_by_rating_descending_puts_unrated_last(client, session):
    add_event(session, title="Mid", rating=Decimal("3.0"))
    add_event(session, title="Unrated")
    add_event(session, title="Top", rating=Decimal("4.8"))
    response = client.get("/events", params={"sort": "rating", "order": "desc"})
    assert titles(response) == ["Top", "Mid", "Unrated"]


def test_sort_by_visits(client, session):
    add_event(session, title="Quiet", visits_count=1)
    add_event(session, title="Busy", visits_count=99)
    response = client.get("/events", params={"sort": "visits_count", "order": "desc"})
    assert titles(response) == ["Busy", "Quiet"]


def test_paging_keeps_total_and_slices_items(client, session):
    for i in range(5):
        add_event(session, title=f"Event {i}", start_time=dt(i + 1))
    body = client.get("/events", params={"limit": 2, "offset": 2}).json()
    assert body["total"] == 5
    assert [item["title"] for item in body["items"]] == ["Event 2", "Event 3"]


def test_offset_past_the_end_returns_no_items_but_real_total(client, session):
    add_event(session, title="Only")
    body = client.get("/events", params={"offset": 10}).json()
    assert body == {"total": 1, "items": []}


@pytest.mark.parametrize(
    "params",
    [
        {"limit": 0},
        {"limit": 101},
        {"offset": -1},
        {"sort": "price"},
        {"order": "up"},
        {"max_price": -1},
        {"min_rating": 6},
        {"starts_after": "not-a-date"},
    ],
)
def test_invalid_query_parameters_are_rejected(client, params):
    assert client.get("/events", params=params).status_code == 422


def test_get_one_event_includes_detail_fields(client, session):
    event = add_event(
        session,
        title="Night Market",
        description="Street food and makers",
        crowd_by_hour={"18": 72, "19": 90},
        shares_count=3,
        latitude=Decimal("51.047000"),
    )
    response = client.get(f"/events/{event.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(event.id)
    assert body["description"] == "Street food and makers"
    assert body["crowd_by_hour"] == {"18": 72, "19": 90}
    assert body["shares_count"] == 3
    assert body["recurrence_pattern"] == "none"
    assert body["currency"] == "USD"
    assert body["latitude"] == pytest.approx(51.047)


def test_unknown_event_returns_404(client):
    response = client.get(f"/events/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Event not found"


def test_malformed_event_id_is_rejected(client):
    assert client.get("/events/not-a-uuid").status_code == 422


def test_event_without_tags_returns_empty_tag_list(client, session):
    add_event(session, title="No Tags")

    response = client.get("/events")

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["title"] == "No Tags"
    assert item["tags"] == []


def test_event_with_one_tag_includes_tag_details(client, session):
    event = add_event(session, title="Jazz Night")
    tag = add_tag(session, "Live Music", "live-music")
    add_event_tag(session, event, tag)

    response = client.get("/events")

    assert response.status_code == 200
    item = response.json()["items"][0]

    assert len(item["tags"]) == 1
    assert item["tags"][0] == {
        "id": str(tag.id),
        "name": "Live Music",
        "slug": "live-music",
    }


def test_event_with_multiple_tags_returns_all_tags(client, session):
    event = add_event(session, title="Music Festival")

    music = add_tag(session, "Music", "music")
    nightlife = add_tag(session, "Nightlife", "nightlife")

    add_event_tag(session, event, music)
    add_event_tag(session, event, nightlife)

    response = client.get("/events")

    assert response.status_code == 200
    item = response.json()["items"][0]

    returned_slugs = {tag["slug"] for tag in item["tags"]}

    assert returned_slugs == {"music", "nightlife"}


def test_filter_events_by_tag_slug(client, session):
    music_event = add_event(session, title="Jazz Night")
    food_event = add_event(session, title="Food Festival")
    unrelated_event = add_event(session, title="Art Exhibition")

    music = add_tag(session, "Music", "music")
    food = add_tag(session, "Food", "food")
    art = add_tag(session, "Art", "art")

    add_event_tag(session, music_event, music)
    add_event_tag(session, food_event, food)
    add_event_tag(session, unrelated_event, art)

    response = client.get("/events", params={"tag": "music"})

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert titles(response) == ["Jazz Night"]


def test_filter_by_tag_slug_returns_empty_when_no_events_match(client, session):
    add_event(session, title="Jazz Night")
    add_tag(session, "Food", "food")

    response = client.get("/events", params={"tag": "food"})

    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert response.json()["items"] == []


def test_filter_by_unknown_tag_returns_empty_list(client, session):
    add_event(session, title="Jazz Night")

    response = client.get("/events", params={"tag": "does-not-exist"})

    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert response.json()["items"] == []


def test_tag_filter_can_be_combined_with_search(client, session):
    jazz_event = add_event(session, title="Jazz Night")
    rock_event = add_event(session, title="Rock Concert")
    food_event = add_event(session, title="Jazz-themed Dinner")

    music = add_tag(session, "Music", "music")
    food = add_tag(session, "Food", "food")

    add_event_tag(session, jazz_event, music)
    add_event_tag(session, rock_event, music)
    add_event_tag(session, food_event, food)

    response = client.get(
        "/events",
        params={"tag": "music", "q": "jazz"},
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert titles(response) == ["Jazz Night"]


def test_get_one_event_includes_tags(client, session):
    event = add_event(session, title="Night Market")
    food = add_tag(session, "Food", "food")
    nightlife = add_tag(session, "Nightlife", "nightlife")

    add_event_tag(session, event, food)
    add_event_tag(session, event, nightlife)

    response = client.get(f"/events/{event.id}")

    assert response.status_code == 200

    body = response.json()
    returned_slugs = {tag["slug"] for tag in body["tags"]}

    assert returned_slugs == {"food", "nightlife"}


def test_tag_filter_is_case_insensitive(client, session):
    event = add_event(session, title="Jazz Night")
    tag = add_tag(session, "Music", "music")
    add_event_tag(session, event, tag)

    response = client.get("/events", params={"tag": "MUSIC"})

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert titles(response) == ["Jazz Night"]


def test_event_without_photos_returns_empty_photo_list(client, session):
    add_event(session, title="No Photos")

    item = client.get("/events").json()["items"][0]

    assert item["photos"] == []


def test_event_with_one_photo_includes_photo_details(client, session):
    event = add_event(session, title="Jazz Night")
    photo = add_photo(session, "https://img.example/jazz.jpg")
    add_event_photo(session, event, photo, is_cover=True, display_order=0)

    item = client.get("/events").json()["items"][0]

    assert item["photos"] == [
        {
            "id": str(photo.id),
            "url": "https://img.example/jazz.jpg",
            "is_cover": True,
            "display_order": 0,
        }
    ]


def test_cover_photo_comes_first_then_display_order(client, session):
    event = add_event(session, title="Night Market")
    third = add_photo(session, "https://img.example/3.jpg")
    cover = add_photo(session, "https://img.example/cover.jpg")
    first = add_photo(session, "https://img.example/1.jpg")
    second = add_photo(session, "https://img.example/2.jpg")
    add_event_photo(session, event, third, display_order=3)
    add_event_photo(session, event, first, display_order=1)
    add_event_photo(session, event, cover, is_cover=True, display_order=9)
    add_event_photo(session, event, second, display_order=2)

    item = client.get("/events").json()["items"][0]

    assert [photo["url"] for photo in item["photos"]] == [
        "https://img.example/cover.jpg",
        "https://img.example/1.jpg",
        "https://img.example/2.jpg",
        "https://img.example/3.jpg",
    ]


def test_each_event_only_gets_its_own_photos(client, session):
    jazz = add_event(session, title="Jazz Night", start_time=dt(1))
    market = add_event(session, title="Night Market", start_time=dt(2))
    add_event_photo(session, jazz, add_photo(session, "https://img.example/j.jpg"))
    add_event_photo(session, market, add_photo(session, "https://img.example/m.jpg"))

    items = client.get("/events").json()["items"]

    assert [item["title"] for item in items] == ["Jazz Night", "Night Market"]
    assert [[p["url"] for p in item["photos"]] for item in items] == [
        ["https://img.example/j.jpg"],
        ["https://img.example/m.jpg"],
    ]


def test_photos_and_tags_do_not_duplicate_events(client, session):
    event = add_event(session, title="Busy Event")
    for i in range(3):
        photo = add_photo(session, f"https://img.example/{i}.jpg")
        add_event_photo(session, event, photo, display_order=i)
    for slug in ("music", "food"):
        add_event_tag(session, event, add_tag(session, slug.title(), slug))

    body = client.get("/events").json()

    assert body["total"] == 1
    assert len(body["items"]) == 1
    assert len(body["items"][0]["photos"]) == 3
    assert len(body["items"][0]["tags"]) == 2


def test_get_one_event_includes_photos_in_order(client, session):
    event = add_event(session, title="Night Market")
    later = add_photo(session, "https://img.example/later.jpg")
    cover = add_photo(session, "https://img.example/cover.jpg")
    add_event_photo(session, event, later, display_order=1)
    add_event_photo(session, event, cover, is_cover=True, display_order=5)

    response = client.get(f"/events/{event.id}")

    assert response.status_code == 200
    assert [p["url"] for p in response.json()["photos"]] == [
        "https://img.example/cover.jpg",
        "https://img.example/later.jpg",
    ]


def test_tag_filter_still_returns_photos(client, session):
    event = add_event(session, title="Jazz Night")
    add_event_tag(session, event, add_tag(session, "Music", "music"))
    add_event_photo(session, event, add_photo(session, "https://img.example/j.jpg"))

    body = client.get("/events", params={"tag": "music"}).json()

    assert body["total"] == 1
    assert [p["url"] for p in body["items"][0]["photos"]] == [
        "https://img.example/j.jpg"
    ]

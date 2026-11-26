import math
import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from db.database import get_db
from db.models.event import Event
from db.models.event_photo import EventPhoto
from db.models.tag import Tag
from db.models.user import User
from deps import get_current_user, require_roles
from schemas import (
    EventCreate,
    EventDetail,
    EventList,
    EventSummary,
    EventUpdate,
    TagSummary,
    _as_utc,
)
from sparks import SparkGiven, SparkVote, give_spark

router = APIRouter(prefix="/events", tags=["events"])

EARTH_RADIUS_KM = 6371.0

SORT_COLUMNS = {
    "start_time": Event.start_time,
    "date": Event.updated_at,
    "title": Event.title,
    "rating": Event.rating,
    "visits_count": Event.visits_count,
    "price": Event.price_min,
}

CATEGORY_TAG_SLUGS: dict[str, tuple[str, ...]] = {
    "food": ("food-drink",),
    "sights": ("arts-culture", "outdoors"),
    "events": ("music", "markets", "tech-networking"),
    "activities": ("sports-fitness", "outdoors"),
    "nightlife": ("nightlife",),
    "other": ("music", "arts-culture", "tech-networking", "markets"),
}

SortField = Literal[
    "start_time", "date", "title", "rating", "visits_count", "price", "distance"
]


def _load_options():
    """Fetch tags and photos in bulk: a fixed number of queries per request."""
    return (
        selectinload(Event.creator),
        selectinload(Event.tags),
        selectinload(Event.event_photo_links).selectinload(EventPhoto.photo),
    )


def _escape_like(text: str) -> str:
    """Make %, _ and \\ in user input match literally in a LIKE pattern."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _parse_locations(raw: list[str]) -> list[tuple[float, float]]:
    """Parse ["51.04,-114.07", ...] into (lat, lng) pairs, or raise a 422."""
    points = []
    for item in raw:
        try:
            lat_s, lng_s = item.split(",")
            lat, lng = float(lat_s), float(lng_s)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid location '{item}', expected 'lat,lng'",
            )
        if not (math.isfinite(lat) and math.isfinite(lng)) or not (
            -90 <= lat <= 90 and -180 <= lng <= 180
        ):
            raise HTTPException(
                status_code=422, detail=f"Location out of range: '{item}'"
            )
        points.append((lat, lng))
    return points


def _distance_km(lat: float, lng: float):
    """Great-circle distance in km from (lat, lng) to each event.

    Uses the spherical law of cosines, clamped so rounding can't push acos
    out of [-1, 1]. Needs Postgres (or any DB with acos/radians/least/greatest).
    """
    cos_angle = func.cos(math.radians(lat)) * func.cos(
        func.radians(Event.latitude)
    ) * func.cos(func.radians(Event.longitude) - math.radians(lng)) + math.sin(
        math.radians(lat)
    ) * func.sin(
        func.radians(Event.latitude)
    )
    return EARTH_RADIUS_KM * func.acos(func.least(1.0, func.greatest(-1.0, cos_angle)))


@router.get("", response_model=EventList)
def list_events(
    q: str | None = Query(
        None, description="Search title, summary, description and location"
    ),
    category: list[str] | None = Query(
        None, description="Category (repeatable). Matches any of them."
    ),
    tag: list[str] | None = Query(
        None, description="Tag slug (repeatable). Matches events with any of them."
    ),
    location: list[str] | None = Query(
        None,
        description="'lat,lng' point (repeatable). Used by distance_min, "
        "distance_max and sort=distance.",
    ),
    distance_min: float | None = Query(None, ge=0, description="Kilometres"),
    distance_max: float | None = Query(None, ge=0, description="Kilometres"),
    starts_after: datetime | None = Query(None, description="Start time >="),
    starts_before: datetime | None = Query(None, description="Start time <="),
    price_min: float | None = Query(
        None,
        ge=0,
        description="Highest ticket price >= this. Events with no price listed "
        "are kept.",
    ),
    max_price: float | None = Query(
        None,
        ge=0,
        description="Lowest ticket price <= this. Events with no price listed "
        "are kept.",
    ),
    min_rating: float | None = Query(None, ge=0, le=5),
    sort: SortField = "rating",
    order: Literal["asc", "desc"] = "asc",
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> EventList:
    conditions = []

    if q:
        pattern = f"%{_escape_like(q.strip())}%"
        conditions.append(
            or_(
                Event.title.ilike(pattern, escape="\\"),
                Event.summary.ilike(pattern, escape="\\"),
                Event.description.ilike(pattern, escape="\\"),
                Event.location_name.ilike(pattern, escape="\\"),
            )
        )
    if category:
        cat_slugs: set[str] = set()
        for raw_cat in category:
            cat = raw_cat.strip().lower()
            if not cat:
                continue
            cat_slugs.update(CATEGORY_TAG_SLUGS.get(cat, (cat,)))
        if cat_slugs:
            conditions.append(Event.tags.any(Tag.slug.in_(cat_slugs)))
    if starts_after is not None:
        conditions.append(Event.start_time >= starts_after)
    if starts_before is not None:
        conditions.append(Event.start_time <= starts_before)
    if price_min is not None:
        conditions.append(or_(Event.price_max.is_(None), Event.price_max >= price_min))
    if max_price is not None:
        conditions.append(or_(Event.price_min.is_(None), Event.price_min <= max_price))
    if min_rating is not None:
        conditions.append(Event.rating >= min_rating)
    if tag:
        slugs = [t.strip().lower() for t in tag if t.strip()]
        if slugs:
            conditions.append(Event.tags.any(Tag.slug.in_(slugs)))

    # ---- Distance: parse locations once, used for filtering and sorting ----
    points = _parse_locations(location) if location else []
    dists = [_distance_km(lat, lng) for lat, lng in points]

    if (distance_min is not None or distance_max is not None) and not points:
        raise HTTPException(
            status_code=422,
            detail="distance_min/distance_max require at least one location",
        )
    if sort == "distance" and not points:
        raise HTTPException(
            status_code=422,
            detail="Sorting by distance requires at least one location",
        )
    if (
        distance_min is not None
        and distance_max is not None
        and distance_min > distance_max
    ):
        raise HTTPException(
            status_code=422, detail="distance_min cannot exceed distance_max"
        )

    if distance_min is not None or distance_max is not None:
        per_point = []
        for dist in dists:
            bounds = []
            if distance_min is not None:
                bounds.append(dist >= distance_min)
            if distance_max is not None:
                bounds.append(dist <= distance_max)
            per_point.append(and_(*bounds))

        # Events without coordinates can't be placed, so they're excluded.
        conditions.append(Event.latitude.is_not(None))
        conditions.append(Event.longitude.is_not(None))
        conditions.append(or_(*per_point))

    total = db.scalar(select(func.count()).select_from(Event).where(*conditions))

    if sort == "distance":
        # With several points, sort by the distance to the nearest one.
        sort_expr = dists[0] if len(dists) == 1 else func.least(*dists)
    else:
        sort_expr = SORT_COLUMNS[sort]

    direction = sort_expr.desc() if order == "desc" else sort_expr.asc()
    stmt = (
        select(Event)
        .options(*_load_options())
        .where(*conditions)
        .order_by(direction.nulls_last(), Event.id)
        .limit(limit)
        .offset(offset)
    )
    rows = db.scalars(stmt).all()

    return EventList(
        total=total or 0,
        items=[EventSummary.model_validate(row) for row in rows],
    )


@router.get("/random", response_model=EventSummary)
def get_random_event(
    db: Session = Depends(get_db),
) -> EventSummary:
    """Return one randomly selected event."""

    stmt = select(Event).options(*_load_options()).order_by(func.random()).limit(1)

    event = db.scalars(stmt).one_or_none()

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="No events found",
        )

    return EventSummary.model_validate(event)


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("organizer", "admin")),
):
    """Delete an event owned by the organizer or any event as an admin."""

    event = db.get(Event, event_id)

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizers can only delete their own events.
    # Admins can delete any event.
    if current_user.account_type != "admin" and event.creator_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own events",
        )

    db.delete(event)
    db.commit()


@router.post("", response_model=EventDetail, status_code=201)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("organizer", "admin")),
) -> EventDetail:
    """Create an event as an organizer or admin."""

    # Check that all supplied tag IDs exist.
    tags = []

    if payload.tag_ids:
        tags = db.scalars(select(Tag).where(Tag.id.in_(payload.tag_ids))).all()

        if len(tags) != len(payload.tag_ids):
            raise HTTPException(
                status_code=404,
                detail="One or more tags were not found",
            )

    # Convert the request into event fields.
    event_data = payload.model_dump(exclude={"tag_ids"})

    event = Event(
        **event_data,
        creator_id=current_user.id,
        tags=tags,
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    # Reload the event with its tags and photos.
    stmt = select(Event).options(*_load_options()).where(Event.id == event.id)

    event = db.scalars(stmt).one()

    return EventDetail.model_validate(event)


@router.get("/tags", response_model=list[TagSummary])
def list_tags(
    db: Session = Depends(get_db),
):
    """Return all available event tags."""
    stmt = select(Tag).order_by(Tag.name)
    return db.scalars(stmt).all()


@router.patch("/{event_id}", response_model=EventDetail)
def update_event(
    event_id: uuid.UUID,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("organizer", "admin")),
) -> EventDetail:
    """Update an event owned by the organizer or any event as an admin."""

    event = db.get(Event, event_id)

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # Organizers can only edit their own events. Admins can edit any event.
    if current_user.account_type != "admin" and event.creator_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only edit your own events",
        )

    updates = payload.model_dump(exclude_unset=True)
    tag_ids = updates.pop("tag_ids", None)

    # Validate the resulting event, including values not being changed.
    start_time = updates.get("start_time", event.start_time)
    end_time = updates.get("end_time", event.end_time)

    price_min = updates.get("price_min", event.price_min)
    price_max = updates.get("price_max", event.price_max)

    recurrence_pattern = updates.get("recurrence_pattern", event.recurrence_pattern)
    recurrence_end_date = updates.get("recurrence_end_date", event.recurrence_end_date)

    # A stored time can come back without a timezone (e.g. in the SQLite tests).
    start_time, end_time = _as_utc(start_time), _as_utc(end_time)

    if start_time is not None and end_time is not None and end_time < start_time:
        raise HTTPException(
            status_code=422,
            detail="End time cannot be before start time",
        )

    if price_max is not None and price_min is None:
        raise HTTPException(
            status_code=422,
            detail="price_max needs a price_min",
        )

    if price_min is not None and price_max is not None and price_max < price_min:
        raise HTTPException(
            status_code=422,
            detail="Maximum price cannot be less than minimum price",
        )

    if recurrence_pattern == "none" and recurrence_end_date is not None:
        raise HTTPException(
            status_code=422,
            detail="Recurrence end date requires a recurrence pattern",
        )

    # Replace the event's tags only if tag_ids was supplied.
    if tag_ids is not None:
        tags = (
            db.scalars(select(Tag).where(Tag.id.in_(tag_ids))).all() if tag_ids else []
        )

        if len(tags) != len(tag_ids):
            raise HTTPException(
                status_code=404,
                detail="One or more tags were not found",
            )

        event.tags = tags

    # Apply the supplied field changes.
    for field, value in updates.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)

    # Reload relationships for the response.
    stmt = select(Event).options(*_load_options()).where(Event.id == event.id)

    event = db.scalars(stmt).one()

    return EventDetail.model_validate(event)


@router.get("/{event_id}", response_model=EventDetail)
def get_event(event_id: uuid.UUID, db: Session = Depends(get_db)) -> EventDetail:
    stmt = select(Event).options(*_load_options()).where(Event.id == event_id)

    event = db.scalars(stmt).one_or_none()

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return EventDetail.model_validate(event)


@router.post("/{event_id}/spark", response_model=SparkGiven)
def spark_event(
    event_id: uuid.UUID,
    payload: SparkVote | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Give the event a spark (+1, the default) or send {"amount": -1} to take
    one away. The organizer's sparks change by that much."""
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.creator_id == current_user.id:
        raise HTTPException(status_code=403, detail="You can't spark your own event")
    return give_spark(db, event.creator_id, (payload or SparkVote()).amount)

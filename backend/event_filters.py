import math
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from fastapi import HTTPException, Query
from sqlalchemy import and_, func, or_

from db.models.event import Event
from db.models.tag import Tag

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


@dataclass
class EventFilters:
    q: str | None
    category: list[str] | None
    tag: list[str] | None
    location: list[str] | None
    distance_min: float | None
    distance_max: float | None
    starts_after: datetime | None
    starts_before: datetime | None
    price_min: float | None
    max_price: float | None
    min_rating: float | None


def event_filters(
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
) -> EventFilters:
    """FastAPI dependency: collects the shared event filter query params."""
    return EventFilters(
        q=q,
        category=category,
        tag=tag,
        location=location,
        distance_min=distance_min,
        distance_max=distance_max,
        starts_after=starts_after,
        starts_before=starts_before,
        price_min=price_min,
        max_price=max_price,
        min_rating=min_rating,
    )


def build_event_conditions(f: EventFilters) -> tuple[list, list]:
    """Return (conditions on Event, per-point distance expressions)."""
    conditions = []

    if f.q:
        pattern = f"%{_escape_like(f.q.strip())}%"
        conditions.append(
            or_(
                Event.title.ilike(pattern, escape="\\"),
                Event.summary.ilike(pattern, escape="\\"),
                Event.description.ilike(pattern, escape="\\"),
                Event.location_name.ilike(pattern, escape="\\"),
            )
        )
    if f.category:
        cat_slugs: set[str] = set()
        for raw_cat in f.category:
            cat = raw_cat.strip().lower()
            if not cat:
                continue
            cat_slugs.update(CATEGORY_TAG_SLUGS.get(cat, (cat,)))
        if cat_slugs:
            conditions.append(Event.tags.any(Tag.slug.in_(cat_slugs)))
    if f.starts_after is not None:
        conditions.append(Event.start_time >= f.starts_after)
    if f.starts_before is not None:
        conditions.append(Event.start_time <= f.starts_before)
    if f.price_min is not None:
        conditions.append(
            or_(Event.price_max.is_(None), Event.price_max >= f.price_min)
        )
    if f.max_price is not None:
        conditions.append(
            or_(Event.price_min.is_(None), Event.price_min <= f.max_price)
        )
    if f.min_rating is not None:
        conditions.append(Event.rating >= f.min_rating)
    if f.tag:
        slugs = [t.strip().lower() for t in f.tag if t.strip()]
        if slugs:
            conditions.append(Event.tags.any(Tag.slug.in_(slugs)))

    # ---- Distance: parse locations once, used for filtering and sorting ----
    points = _parse_locations(f.location) if f.location else []
    dists = [_distance_km(lat, lng) for lat, lng in points]

    has_distance_filter = f.distance_min is not None or f.distance_max is not None

    if has_distance_filter and not points:
        raise HTTPException(
            status_code=422,
            detail="distance_min/distance_max require at least one location",
        )
    if (
        f.distance_min is not None
        and f.distance_max is not None
        and f.distance_min > f.distance_max
    ):
        raise HTTPException(
            status_code=422, detail="distance_min cannot exceed distance_max"
        )

    if has_distance_filter:
        per_point = []
        for dist in dists:
            bounds = []
            if f.distance_min is not None:
                bounds.append(dist >= f.distance_min)
            if f.distance_max is not None:
                bounds.append(dist <= f.distance_max)
            per_point.append(and_(*bounds))

        # Events without coordinates can't be placed, so they're excluded.
        conditions.append(Event.latitude.is_not(None))
        conditions.append(Event.longitude.is_not(None))
        conditions.append(or_(*per_point))

    return conditions, dists


def event_sort_expr(sort: SortField, dists: list):
    if sort == "distance":
        if not dists:
            raise HTTPException(
                status_code=422,
                detail="Sorting by distance requires at least one location",
            )
        # With several points, sort by the distance to the nearest one.
        return dists[0] if len(dists) == 1 else func.least(*dists)
    return SORT_COLUMNS[sort]

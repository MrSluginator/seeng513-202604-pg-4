import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from db.database import get_db
from db.models.event import Event
from db.models.event_photo import EventPhoto
from db.models.tag import Tag
from db.models.user import User
from deps import require_roles
from schemas import (
    EventCreate,
    EventDetail,
    EventList,
    EventSummary,
    EventUpdate,
    TagSummary,
    _as_utc,
)

router = APIRouter(prefix="/events", tags=["events"])

SORT_COLUMNS = {
    "start_time": Event.start_time,
    "title": Event.title,
    "rating": Event.rating,
    "visits_count": Event.visits_count,
}


def _load_options():
    """Fetch tags and photos in bulk: a fixed number of queries per request."""
    return (
        selectinload(Event.tags),
        selectinload(Event.event_photo_links).selectinload(EventPhoto.photo),
    )


def _escape_like(text: str) -> str:
    """Make %, _ and \\ in user input match literally in a LIKE pattern."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("", response_model=EventList)
def list_events(
    q: str | None = Query(
        None, description="Search title, summary, description and location"
    ),
    starts_after: datetime | None = Query(None, description="Start time >="),
    starts_before: datetime | None = Query(None, description="Start time <="),
    max_price: float | None = Query(
        None,
        ge=0,
        description="Lowest ticket price <= this. Events with no price listed "
        "are kept.",
    ),
    min_rating: float | None = Query(None, ge=0, le=5),
    sort: Literal["start_time", "title", "rating", "visits_count"] = "start_time",
    order: Literal["asc", "desc"] = "asc",
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    tag: str | None = Query(None, description="Filter by tag slug"),
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
    if starts_after is not None:
        conditions.append(Event.start_time >= starts_after)
    if starts_before is not None:
        conditions.append(Event.start_time <= starts_before)
    if max_price is not None:
        conditions.append(or_(Event.price_min.is_(None), Event.price_min <= max_price))
    if min_rating is not None:
        conditions.append(Event.rating >= min_rating)
    if tag and tag.strip():
        conditions.append(Event.tags.any(Tag.slug == tag.strip().lower()))

    total = db.scalar(select(func.count()).select_from(Event).where(*conditions))

    column = SORT_COLUMNS[sort]
    direction = column.desc() if order == "desc" else column.asc()
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

import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from db.database import get_db
from db.models.event import Event
from db.models.tag import Tag
from schemas import EventDetail, EventList, EventSummary

router = APIRouter(prefix="/events", tags=["events"])

SORT_COLUMNS = {
    "start_time": Event.start_time,
    "title": Event.title,
    "rating": Event.rating,
    "visits_count": Event.visits_count,
}


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
        .options(selectinload(Event.tags))
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


@router.get("/{event_id}", response_model=EventDetail)
def get_event(event_id: uuid.UUID, db: Session = Depends(get_db)) -> EventDetail:
    stmt = select(Event).options(selectinload(Event.tags)).where(Event.id == event_id)

    event = db.scalars(stmt).one_or_none()

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return EventDetail.model_validate(event)

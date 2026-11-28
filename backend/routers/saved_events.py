from typing import Literal
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from db.database import get_db
from db.models.event import Event
from db.models.event_photo import EventPhoto
from db.models.saved_event import SavedEvent
from db.models.user import User
from deps import get_current_user
from event_filters import (
    EventFilters,
    SortField,
    build_event_conditions,
    event_filters,
    event_sort_expr,
)
from schemas import (
    EventVisitResponse,
    SavedEventItem,
    SavedEventList,
    SavedEventStatus,
)

router = APIRouter(tags=["saved events"])

SavedSortField = SortField | Literal["saved_at"]


def _saved_event_status(row: SavedEvent, event_id: uuid.UUID):
    return SavedEventStatus(
        event_id=event_id,
        is_saved=row.is_saved,
        user_visits=row.user_visits,
    )


@router.get("/users/me/saved-events", response_model=SavedEventList)
def list_saved_events(
    filters: EventFilters = Depends(event_filters),
    sort: SavedSortField = "saved_at",
    order: Literal["asc", "desc"] = "desc",
    limit: int | None = Query(None, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all events saved by the current user, with the same filters as /events."""

    event_conditions, dists = build_event_conditions(filters)
    conditions = [
        SavedEvent.user_id == current_user.id,
        SavedEvent.is_saved.is_(True),
        *event_conditions,
    ]

    total = db.scalar(
        select(func.count())
        .select_from(SavedEvent)
        .join(SavedEvent.event)
        .where(*conditions)
    )

    sort_expr = (
        SavedEvent.created_at if sort == "saved_at" else event_sort_expr(sort, dists)
    )
    direction = sort_expr.desc() if order == "desc" else sort_expr.asc()

    stmt = (
        select(SavedEvent)
        .join(SavedEvent.event)
        .options(
            selectinload(SavedEvent.event).selectinload(Event.tags),
            selectinload(SavedEvent.event)
            .selectinload(Event.event_photo_links)
            .selectinload(EventPhoto.photo),
        )
        .where(*conditions)
        .order_by(direction.nulls_last(), SavedEvent.event_id)
        .offset(offset)
    )
    if limit is not None:
        stmt = stmt.limit(limit)

    rows = db.scalars(stmt).all()

    return SavedEventList(
        total=total or 0,
        items=[
            SavedEventItem(
                event=row.event,
                user_visits=row.user_visits,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
            for row in rows
        ],
    )


@router.get("/users/me/saved-events/ids", response_model=list[uuid.UUID])
def list_saved_event_ids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return just the IDs of the events the current user has saved."""

    stmt = (
        select(SavedEvent.event_id)
        .where(
            SavedEvent.user_id == current_user.id,
            SavedEvent.is_saved.is_(True),
        )
        .order_by(SavedEvent.created_at.desc())
    )

    return db.scalars(stmt).all()


@router.post(
    "/events/{event_id}/save",
    response_model=SavedEventStatus,
)
def save_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save an event for the current user."""

    event = db.get(Event, event_id)

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    row = db.get(SavedEvent, (current_user.id, event_id))

    if row is None:
        row = SavedEvent(
            user_id=current_user.id,
            event_id=event_id,
            is_saved=True,
            user_visits=0,
        )
        db.add(row)
    else:
        row.is_saved = True

    db.commit()
    db.refresh(row)

    return _saved_event_status(row, event_id)


@router.delete(
    "/events/{event_id}/save",
    response_model=SavedEventStatus,
)
def unsave_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unsave an event without deleting its visit history."""

    if db.get(Event, event_id) is None:
        raise HTTPException(status_code=404, detail="Event not found")

    row = db.get(SavedEvent, (current_user.id, event_id))

    if row is None:
        return SavedEventStatus(
            event_id=event_id,
            is_saved=False,
            user_visits=0,
        )

    row.is_saved = False

    db.commit()
    db.refresh(row)

    return _saved_event_status(row, event_id)


@router.get(
    "/events/{event_id}/save-status",
    response_model=SavedEventStatus,
)
def get_save_status(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check whether the current user saved an event."""

    if db.get(Event, event_id) is None:
        raise HTTPException(status_code=404, detail="Event not found")

    row = db.get(SavedEvent, (current_user.id, event_id))

    if row is None:
        return SavedEventStatus(
            event_id=event_id,
            is_saved=False,
            user_visits=0,
        )

    return _saved_event_status(row, event_id)


@router.post(
    "/events/{event_id}/visit",
    response_model=EventVisitResponse,
)
def record_event_visit(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record a visit by the current user."""

    event = db.get(Event, event_id)

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    row = db.get(SavedEvent, (current_user.id, event_id))

    if row is None:
        row = SavedEvent(
            user_id=current_user.id,
            event_id=event_id,
            is_saved=False,
            user_visits=1,
        )
        db.add(row)
    else:
        row.user_visits += 1

    event.visits_count += 1

    db.commit()
    db.refresh(row)
    db.refresh(event)

    return EventVisitResponse(
        event_id=event_id,
        user_visits=row.user_visits,
        visits_count=event.visits_count,
    )

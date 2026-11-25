import uuid
from decimal import ROUND_HALF_UP, Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from db.database import get_db
from db.models.event import Event
from db.models.review import Review
from db.models.user import User
from deps import ADMIN, get_current_user
from schemas import (
    ReviewCreate,
    ReviewList,
    ReviewSummary,
    ReviewUpdate,
)
from sparks import SparkGiven, SparkVote, give_spark

router = APIRouter(tags=["reviews"])


def _update_event_rating(db: Session, event: Event) -> None:
    """Recalculate an event's average rating and review count."""
    # The session has autoflush off, so send the pending add/change to the
    # database first or the totals below would leave it out.
    db.flush()
    result = db.execute(
        select(
            func.avg(Review.rating),
            func.count(Review.id),
        ).where(Review.event_id == event.id)
    ).one()

    average, count = result

    event.rating = (
        None
        if average is None
        else Decimal(str(average)).quantize(Decimal("0.01"), ROUND_HALF_UP)
    )
    event.review_count = count


def _with_username(review: Review, username: str) -> ReviewSummary:
    result = ReviewSummary.model_validate(review)
    result.username = username
    return result


@router.get(
    "/events/{event_id}/reviews",
    response_model=ReviewList,
)
def list_reviews(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """Get reviews for an event."""
    event = db.get(Event, event_id)

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    conditions = [Review.event_id == event_id]

    total = db.scalar(select(func.count()).select_from(Review).where(*conditions))

    stmt = (
        select(Review, User.username)
        .join(User, User.id == Review.user_id)
        .where(*conditions)
        .order_by(Review.created_at.desc(), Review.id)
        .limit(limit)
        .offset(offset)
    )

    rows = db.execute(stmt).all()

    return ReviewList(
        total=total or 0,
        items=[_with_username(review, name) for review, name in rows],
    )


@router.post(
    "/events/{event_id}/reviews",
    response_model=ReviewSummary,
    status_code=201,
)
def create_review(
    event_id: uuid.UUID,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a review for an event."""
    event = db.get(Event, event_id)

    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.creator_id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can't review your own event",
        )

    existing = db.scalar(
        select(Review).where(
            Review.event_id == event_id,
            Review.user_id == current_user.id,
        )
    )

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="You have already reviewed this event",
        )

    review = Review(
        event_id=event_id,
        user_id=current_user.id,
        rating=payload.rating,
        content=payload.content,
    )

    db.add(review)

    try:
        _update_event_rating(db, event)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="You have already reviewed this event",
        )

    db.refresh(review)
    return _with_username(review, current_user.username)


@router.patch(
    "/reviews/{review_id}",
    response_model=ReviewSummary,
)
def update_review(
    review_id: uuid.UUID,
    payload: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the current user's review."""
    review = db.get(Review, review_id)

    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")

    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own reviews",
        )

    if "rating" in payload.model_fields_set:
        review.rating = payload.rating

    if "content" in payload.model_fields_set:
        review.content = payload.content

    event = db.get(Event, review.event_id)
    _update_event_rating(db, event)

    db.commit()
    db.refresh(review)

    return _with_username(review, current_user.username)


@router.delete(
    "/reviews/{review_id}",
    status_code=204,
)
def delete_review(
    review_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete the current user's review."""
    review = db.get(Review, review_id)

    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")

    if review.user_id != current_user.id and current_user.account_type != ADMIN:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own reviews",
        )

    event = db.get(Event, review.event_id)

    db.delete(review)
    db.flush()

    _update_event_rating(db, event)

    db.commit()


@router.post("/reviews/{review_id}/spark", response_model=SparkGiven)
def spark_review(
    review_id: uuid.UUID,
    payload: SparkVote | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Give the review a spark (+1, the default) or send {"amount": -1} to take
    one away. The reviewer's sparks change by that much."""
    review = db.get(Review, review_id)
    if review is None:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id == current_user.id:
        raise HTTPException(status_code=403, detail="You can't spark your own review")
    return give_spark(db, review.user_id, (payload or SparkVote()).amount)

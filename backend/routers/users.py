
"""The logged-in user's own account and preferences."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth_schemas import UserMe, ProfileUpdate
from db.database import get_db
from db.models.tag import Tag
from db.models.user import User
from db.models.user_preferred_tag import UserPreferredTag
from deps import get_current_user
from schemas import TagSummary

router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserMe)
def read_me(user: User = Depends(get_current_user)) -> UserMe:
    return UserMe.model_validate(user)


@router.patch("/me", response_model=UserMe)
def update_me(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserMe:
    """Update the current user's profile."""

    # Check whether the new username or email is already in use.
    conditions = []

    if "username" in payload.model_fields_set:
        conditions.append(
            func.lower(User.username) == payload.username.lower()
        )

    if "email" in payload.model_fields_set:
        conditions.append(
            func.lower(User.email) == str(payload.email).lower()
        )

    if conditions:
        existing = db.scalar(
            select(User.id).where(
                User.id != user.id,
                or_(*conditions),
            )
        )

        if existing is not None:
            raise HTTPException(
                status_code=409,
                detail="Username or email already in use",
            )

    # Only update fields included in the request.
    if "username" in payload.model_fields_set:
        user.username = payload.username

    if "email" in payload.model_fields_set:
        user.email = str(payload.email).lower()

    if "phone_number" in payload.model_fields_set:
        user.phone_number = payload.phone_number

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Username or email already in use",
        )

    db.refresh(user)

    return UserMe.model_validate(user)


@router.get("/users/me/preferred-tags", response_model=list[TagSummary])
def get_preferred_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's preferred tags."""
    stmt = (
        select(Tag)
        .join(UserPreferredTag, UserPreferredTag.tag_id == Tag.id)
        .where(UserPreferredTag.user_id == current_user.id)
        .order_by(Tag.name)
    )

    return db.scalars(stmt).all()


@router.post(
    "/users/me/preferred-tags/{tag_id}",
    response_model=TagSummary,
)
def add_preferred_tag(
    tag_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a tag to the current user's preferences."""
    tag = db.get(Tag, tag_id)

    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")

    existing = db.get(UserPreferredTag, (current_user.id, tag_id))

    if existing is None:
        preference = UserPreferredTag(
            user_id=current_user.id,
            tag_id=tag_id,
        )
        db.add(preference)
        db.commit()

    return tag


@router.delete(
    "/users/me/preferred-tags/{tag_id}",
    status_code=204,
)
def remove_preferred_tag(
    tag_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a tag from the current user's preferences."""
    preference = db.get(UserPreferredTag, (current_user.id, tag_id))

    if preference is None:
        raise HTTPException(
            status_code=404,
            detail="Preferred tag not found",
        )

    db.delete(preference)
    db.commit()

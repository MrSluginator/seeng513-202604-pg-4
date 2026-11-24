"""The logged-in user's own account."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth_schemas import PreferredTagsUpdate, ProfileUpdate, UserMe
from db.database import get_db
from db.models.tag import Tag
from db.models.user import User
from db.models.user_preferred_tag import UserPreferredTag
from deps import get_current_user
from schemas import TagSummary

logger = logging.getLogger("flare.users")

router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserMe)
def read_me(user: User = Depends(get_current_user)) -> UserMe:
    return UserMe.model_validate(user)


@router.patch("/me", response_model=UserMe)
def update_me(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserMe:
    """Change your username or phone number. Send only what you want to change."""
    changes = payload.model_dump(exclude_unset=True)

    if "username" in changes:
        if changes["username"] is None:
            raise HTTPException(status_code=422, detail="username cannot be null")
        taken = db.scalar(
            select(User.id).where(
                func.lower(User.username) == changes["username"].lower(),
                User.id != user.id,
            )
        )
        if taken is not None:
            raise HTTPException(status_code=409, detail="Username already in use")

    for name, value in changes.items():
        setattr(user, name, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Username already in use")
    db.refresh(user)
    logger.info("profile updated: user=%s fields=%s", user.id, ",".join(changes))
    return UserMe.model_validate(user)


def _preferred_tags(db: Session, user: User) -> list[TagSummary]:
    rows = db.scalars(
        select(Tag)
        .join(UserPreferredTag, UserPreferredTag.tag_id == Tag.id)
        .where(UserPreferredTag.user_id == user.id)
        .order_by(Tag.name, Tag.id)
    ).all()
    return [TagSummary.model_validate(row) for row in rows]


@router.get("/me/preferred-tags", response_model=list[TagSummary])
def read_preferred_tags(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[TagSummary]:
    return _preferred_tags(db, user)


@router.put("/me/preferred-tags", response_model=list[TagSummary])
def replace_preferred_tags(
    payload: PreferredTagsUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TagSummary]:
    """Set the tags you like. The list you send replaces the old one."""
    wanted = set(payload.tag_ids)
    if wanted:
        found = set(db.scalars(select(Tag.id).where(Tag.id.in_(wanted))))
        if found != wanted:
            raise HTTPException(
                status_code=422, detail="One or more tag_ids do not exist"
            )

    current = set(
        db.scalars(
            select(UserPreferredTag.tag_id).where(UserPreferredTag.user_id == user.id)
        )
    )
    for tag_id in current - wanted:
        db.execute(
            delete(UserPreferredTag).where(
                UserPreferredTag.user_id == user.id,
                UserPreferredTag.tag_id == tag_id,
            )
        )
    for tag_id in wanted - current:
        db.add(UserPreferredTag(user_id=user.id, tag_id=tag_id))
    db.commit()
    return _preferred_tags(db, user)

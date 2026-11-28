"""Admin-only account management."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth_schemas import RoleUpdate, SparkAdjustment, UserMe
from db.database import get_db
from db.models.user import User
from deps import ADMIN, require_roles
from sparks import adjust_sparks

logger = logging.getLogger("flare.auth")

router = APIRouter(prefix="/admin", tags=["admin"])


@router.patch("/users/{user_id}/role", response_model=UserMe)
def change_account_type(
    user_id: uuid.UUID,
    payload: RoleUpdate,
    admin: User = Depends(require_roles(ADMIN)),
    db: Session = Depends(get_db),
) -> UserMe:
    """Make a user a standard user, an organizer or an admin."""
    if user_id == admin.id:
        # Stops the last admin from locking everyone out of admin features.
        raise HTTPException(
            status_code=400, detail="Admins cannot change their own account type"
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    previous = user.account_type
    user.account_type = payload.account_type
    db.commit()
    db.refresh(user)
    logger.warning(
        "account type changed: admin=%s user=%s %s -> %s",
        admin.id,
        user.id,
        previous,
        user.account_type,
    )
    return UserMe.model_validate(user)


@router.post("/users/{user_id}/sparks", response_model=UserMe)
def adjust_user_sparks(
    user_id: uuid.UUID,
    payload: SparkAdjustment,
    admin: User = Depends(require_roles(ADMIN)),
    db: Session = Depends(get_db),
) -> UserMe:
    if user_id == admin.id:
        raise HTTPException(
            status_code=400, detail="Admins cannot change their own sparks"
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    previous = user.spark_rating
    adjust_sparks(db, user.id, payload.amount)
    db.commit()
    db.refresh(user)
    logger.warning(
        "sparks changed: admin=%s user=%s %s -> %s (%+d) reason=%s",
        admin.id,
        user.id,
        previous,
        user.spark_rating,
        payload.amount,
        payload.reason,
    )
    return UserMe.model_validate(user)

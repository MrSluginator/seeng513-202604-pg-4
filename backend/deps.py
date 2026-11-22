"""FastAPI dependencies for knowing who is calling and what they may do."""

import logging

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from db.database import get_db
from db.models.user import User
from security import decode_access_token

logger = logging.getLogger("flare.auth")

# The values stored in users.account_type.
STANDARD = "standard"
ORGANIZER = "organizer"
ADMIN = "admin"

bearer = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _user_from_token(token: str, db: Session) -> User:
    user_id = decode_access_token(token)
    user = db.get(User, user_id) if user_id is not None else None
    if user is None:
        raise _unauthorized()
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """The logged-in user, from the Authorization: Bearer <token> header."""
    if credentials is None:
        raise _unauthorized()
    return _user_from_token(credentials.credentials, db)


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User | None:
    """The logged-in user, or None for an anonymous caller.

    For public endpoints that show a little more to logged-in users. A token
    that is sent but is bad or expired is still a 401, so the frontend learns
    it must log in again instead of silently being treated as anonymous.
    """
    if credentials is None:
        return None
    return _user_from_token(credentials.credentials, db)


def require_roles(*roles: str):
    """A dependency that only lets users with one of these account types in.

    The role is read from the database on every request, not from the token,
    so changing someone's account_type takes effect immediately.
    """

    def check(user: User = Depends(get_current_user)) -> User:
        if user.account_type not in roles:
            logger.warning(
                "permission denied: user=%s account_type=%s needs one of %s",
                user.id,
                user.account_type,
                ", ".join(roles),
            )
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to do this",
            )
        return user

    return check

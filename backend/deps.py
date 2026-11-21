"""FastAPI dependencies for knowing who is calling and what they may do."""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from db.database import get_db
from db.models.user import User
from security import decode_access_token

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


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """The logged-in user, from the Authorization: Bearer <token> header."""
    if credentials is None:
        raise _unauthorized()
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise _unauthorized()
    user = db.get(User, user_id)
    if user is None:
        raise _unauthorized()
    return user


def require_roles(*roles: str):
    """A dependency that only lets users with one of these account types in.

    The role is read from the database on every request, not from the token,
    so changing someone's account_type takes effect immediately.
    """

    def check(user: User = Depends(get_current_user)) -> User:
        if user.account_type not in roles:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to do this",
            )
        return user

    return check

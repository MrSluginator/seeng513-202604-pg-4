"""Password hashing and access tokens."""

import os
import uuid
from datetime import datetime, timedelta, timezone
from functools import lru_cache

import jwt
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError

ALGORITHM = "HS256"
MIN_SECRET_LENGTH = 32
DEFAULT_EXPIRE_MINUTES = 60

# Argon2id with pwdlib's recommended settings.
_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """True if the password matches. A stored hash we can't read never matches."""
    try:
        return _hasher.verify(password, password_hash)
    except UnknownHashError:
        return False


@lru_cache(maxsize=1)
def dummy_hash() -> str:
    """A real hash to check against when the account doesn't exist.

    It makes a login for an unknown email take about as long as one for a known
    email, so response time doesn't reveal which emails are registered.
    """
    return _hasher.hash("flare-dummy-password")


def _secret() -> str:
    secret = os.getenv("JWT_SECRET", "")
    if len(secret) < MIN_SECRET_LENGTH:
        raise RuntimeError(
            "JWT_SECRET must be set to a random string of at least "
            f"{MIN_SECRET_LENGTH} characters (try: openssl rand -hex 32)"
        )
    return secret


def _expire_minutes() -> int:
    try:
        return int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", DEFAULT_EXPIRE_MINUTES))
    except ValueError:
        return DEFAULT_EXPIRE_MINUTES


def create_access_token(user_id: uuid.UUID) -> str:
    """A signed token that identifies the user and expires."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=_expire_minutes()),
    }
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> uuid.UUID | None:
    """The user id inside a valid token, or None if invalid, forged or expired."""
    try:
        payload = jwt.decode(
            token,
            _secret(),
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        return uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, ValueError, TypeError):
        return None

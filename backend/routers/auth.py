"""Signup and login."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth_schemas import AuthResponse, LoginRequest, SignupRequest, UserMe
from db.database import get_db
from db.models.user import User
from ratelimit import login_limiter
from security import (
    create_access_token,
    dummy_hash,
    hash_password,
    verify_password,
)

logger = logging.getLogger("flare.auth")
router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_response(user: User) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(user.id),
        user=UserMe.model_validate(user),
    )


@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = payload.email.lower()
    taken = db.scalar(
        select(User.id).where(
            or_(
                func.lower(User.email) == email,
                func.lower(User.username) == payload.username.lower(),
            )
        )
    )
    if taken is not None:
        logger.info("signup rejected: username or email already in use")
        raise HTTPException(status_code=409, detail="Username or email already in use")

    # account_type is never read from the request: new accounts are always
    # "standard", and only an admin can change that later.
    user = User(
        username=payload.username,
        email=email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Someone signed up with the same details between our check and the insert.
        db.rollback()
        logger.info("signup rejected: username or email already in use")
        raise HTTPException(status_code=409, detail="Username or email already in use")
    db.refresh(user)
    logger.info("signup ok: user=%s", user.id)
    return _auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest, request: Request, db: Session = Depends(get_db)
) -> AuthResponse:
    email = payload.email.lower()
    client_ip = request.client.host if request.client else "unknown"
    limit_key = f"{client_ip}|{email}"
    try:
        login_limiter.check(limit_key)
    except HTTPException:
        logger.warning(
            "login blocked, too many failures: ip=%s email=%s", client_ip, email
        )
        raise

    user = db.scalar(select(User).where(func.lower(User.email) == email))

    # Always run one password check, even for an unknown email, so the response
    # time doesn't reveal whether the account exists.
    stored_hash = user.password_hash if user is not None else dummy_hash()
    password_ok = verify_password(payload.password, stored_hash)

    if user is None or not password_ok:
        login_limiter.record_failure(limit_key)
        logger.warning("login failed: ip=%s email=%s", client_ip, email)
        # The same message for "no such email" and "wrong password".
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    login_limiter.reset(limit_key)
    logger.info("login ok: user=%s", user.id)
    return _auth_response(user)

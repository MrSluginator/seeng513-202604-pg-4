"""Tests for optional login, the admin role endpoint and security logging.

They run against an in-memory SQLite database, so CI needs no Postgres service.
Only the users table is created.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import db.models  # noqa: F401  (registers every model)
from db.database import Base, get_db
from db.models.user import User
from deps import get_optional_user
from main import app
from ratelimit import login_limiter
from security import create_access_token, hash_password

# SQLite has no native Decimal type; SQLAlchemy warns about it.
pytestmark = pytest.mark.filterwarnings("ignore:Dialect sqlite")

SECRET = "test-secret-" + "x" * 32
PASSWORD = "correct horse battery"


@pytest.fixture(autouse=True)
def jwt_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", SECRET)


@pytest.fixture(autouse=True)
def fresh_limiter():
    login_limiter.clear()
    yield
    login_limiter.clear()


@pytest.fixture()
def session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine, tables=[User.__table__])
    with sessionmaker(bind=engine, autoflush=False)() as s:
        yield s
    engine.dispose()


def override_db(session):
    def override_get_db():
        yield session

    return override_get_db


@pytest.fixture()
def client(session):
    app.dependency_overrides[get_db] = override_db(session)
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def optional_client(session):
    """A tiny app with one route that works for anonymous and logged-in callers."""
    mini_app = FastAPI()

    @mini_app.get("/whoami")
    def whoami(user: User | None = Depends(get_optional_user)):
        return {"username": user.username if user else None}

    mini_app.dependency_overrides[get_db] = override_db(session)
    return TestClient(mini_app)


def make_user(session, username="alice", account_type="standard", email=None):
    user = User(
        username=username,
        email=email or f"{username}@example.com",
        password_hash=hash_password(PASSWORD),
        account_type=account_type,
    )
    session.add(user)
    session.commit()
    return user


def bearer(user):
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def set_role(client, admin, target_id, account_type):
    return client.patch(
        f"/admin/users/{target_id}/role",
        json={"account_type": account_type},
        headers=bearer(admin),
    )


def login(client, email="alice@example.com", password=PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password})


# --- optional login ---------------------------------------------------------


def test_an_anonymous_caller_gets_no_user(optional_client):
    response = optional_client.get("/whoami")

    assert response.status_code == 200
    assert response.json() == {"username": None}


def test_a_logged_in_caller_is_recognised(optional_client, session):
    user = make_user(session)

    response = optional_client.get("/whoami", headers=bearer(user))

    assert response.json() == {"username": "alice"}


def test_a_bad_token_is_an_error_not_an_anonymous_caller(optional_client):
    response = optional_client.get(
        "/whoami", headers={"Authorization": "Bearer not-a-token"}
    )

    assert response.status_code == 401


def test_an_expired_token_is_an_error_not_an_anonymous_caller(optional_client, session):
    user = make_user(session)
    expired = jwt.encode(
        {
            "sub": str(user.id),
            "exp": datetime.now(timezone.utc) - timedelta(seconds=5),
        },
        SECRET,
        algorithm="HS256",
    )

    response = optional_client.get(
        "/whoami", headers={"Authorization": f"Bearer {expired}"}
    )

    assert response.status_code == 401


def test_a_token_for_a_missing_account_is_an_error(optional_client):
    ghost = type("Ghost", (), {"id": uuid.uuid4()})()

    assert optional_client.get("/whoami", headers=bearer(ghost)).status_code == 401


# --- admin: change an account type -----------------------------------------


def test_an_admin_can_make_a_user_an_organizer(client, session):
    admin = make_user(session, "root", "admin")
    target = make_user(session, "alice")

    response = set_role(client, admin, target.id, "organizer")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(target.id)
    assert body["account_type"] == "organizer"
    assert "password_hash" not in body
    session.refresh(target)
    assert target.account_type == "organizer"


def test_an_admin_can_demote_a_user(client, session):
    admin = make_user(session, "root", "admin")
    target = make_user(session, "alice", "organizer")

    set_role(client, admin, target.id, "standard")

    session.refresh(target)
    assert target.account_type == "standard"


@pytest.mark.parametrize("account_type", ["standard", "organizer"])
def test_only_admins_can_change_account_types(client, session, account_type):
    caller = make_user(session, "caller", account_type)
    target = make_user(session, "alice")

    response = set_role(client, caller, target.id, "admin")

    assert response.status_code == 403
    session.refresh(target)
    assert target.account_type == "standard"


def test_changing_an_account_type_requires_a_login(client, session):
    target = make_user(session)

    response = client.patch(
        f"/admin/users/{target.id}/role", json={"account_type": "admin"}
    )

    assert response.status_code == 401
    session.refresh(target)
    assert target.account_type == "standard"


def test_an_unknown_user_is_a_404(client, session):
    admin = make_user(session, "root", "admin")

    assert set_role(client, admin, uuid.uuid4(), "organizer").status_code == 404


def test_a_malformed_user_id_is_rejected(client, session):
    admin = make_user(session, "root", "admin")

    assert set_role(client, admin, "not-a-uuid", "organizer").status_code == 422


@pytest.mark.parametrize("account_type", ["superuser", "", "ADMIN", None])
def test_an_invalid_account_type_is_rejected(client, session, account_type):
    admin = make_user(session, "root", "admin")
    target = make_user(session)

    response = set_role(client, admin, target.id, account_type)

    assert response.status_code == 422
    session.refresh(target)
    assert target.account_type == "standard"


def test_an_admin_cannot_change_their_own_account_type(client, session):
    admin = make_user(session, "root", "admin")

    response = set_role(client, admin, admin.id, "standard")

    assert response.status_code == 400
    session.refresh(admin)
    assert admin.account_type == "admin"


def test_a_promoted_user_gets_the_new_role_on_their_existing_token(client, session):
    admin = make_user(session, "root", "admin")
    target = make_user(session, "alice")
    old_token = bearer(target)
    assert client.get("/me", headers=old_token).json()["account_type"] == "standard"

    set_role(client, admin, target.id, "organizer")

    assert client.get("/me", headers=old_token).json()["account_type"] == "organizer"


# --- logging ----------------------------------------------------------------


@pytest.fixture()
def auth_log(caplog):
    caplog.set_level(logging.INFO, logger="flare.auth")
    return caplog


def test_a_failed_login_is_logged_without_the_password(client, session, auth_log):
    make_user(session)

    login(client, password="my secret guess")

    assert "login failed" in auth_log.text
    assert "alice@example.com" in auth_log.text
    assert "my secret guess" not in auth_log.text


def test_a_successful_login_is_logged_without_the_token(client, session, auth_log):
    user = make_user(session)

    token = login(client).json()["access_token"]

    assert f"login ok: user={user.id}" in auth_log.text
    assert token not in auth_log.text
    assert PASSWORD not in auth_log.text


def test_a_blocked_login_is_logged(client, session, auth_log):
    make_user(session)
    for _ in range(5):
        login(client, password="wrong password")

    login(client)

    assert "login blocked" in auth_log.text


def test_a_signup_is_logged_without_the_password(client, session, auth_log):
    client.post(
        "/auth/signup",
        json={"username": "newuser", "email": "new@example.com", "password": PASSWORD},
    )

    created = session.scalars(select(User)).one()
    assert f"signup ok: user={created.id}" in auth_log.text
    assert PASSWORD not in auth_log.text


def test_a_denied_request_is_logged(client, session, auth_log):
    caller = make_user(session, "caller")
    target = make_user(session, "alice")

    set_role(client, caller, target.id, "admin")

    assert "permission denied" in auth_log.text
    assert str(caller.id) in auth_log.text


def test_a_role_change_is_logged(client, session, auth_log):
    admin = make_user(session, "root", "admin")
    target = make_user(session, "alice")

    set_role(client, admin, target.id, "organizer")

    assert "account type changed" in auth_log.text
    assert "standard -> organizer" in auth_log.text

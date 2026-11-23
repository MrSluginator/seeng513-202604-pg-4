"""Tests for signup, login, GET /me, forged tokens, roles and failed-login limits.

They run against an in-memory SQLite database, so CI needs no Postgres service.
Only the users table is created.
"""

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
from deps import require_roles
from main import app
from ratelimit import login_limiter
from security import create_access_token, hash_password

# SQLite has no native Decimal type; SQLAlchemy warns about it.
pytestmark = pytest.mark.filterwarnings("ignore:Dialect sqlite")

SECRET = "test-secret-" + "x" * 32
PASSWORD = "correct horse battery"
SEEDED_FAKE_HASH = "$2b$12$dummyhashalice00000000000000000000000000000000"


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
def role_client(session):
    """A tiny app with role-protected routes, to test require_roles on its own."""
    role_app = FastAPI()

    @role_app.get("/admin-only")
    def admin_only(user: User = Depends(require_roles("admin"))):
        return {"username": user.username}

    @role_app.get("/staff")
    def staff(user: User = Depends(require_roles("organizer", "admin"))):
        return {"username": user.username}

    role_app.dependency_overrides[get_db] = override_db(session)
    return TestClient(role_app)


def make_user(
    session,
    email="alice@example.com",
    username="alice",
    password=PASSWORD,
    account_type="standard",
    password_hash=None,
):
    user = User(
        username=username,
        email=email,
        password_hash=password_hash or hash_password(password),
        account_type=account_type,
    )
    session.add(user)
    session.commit()
    return user


def signup_body(**overrides):
    return {
        "username": "newuser",
        "email": "new@example.com",
        "password": PASSWORD,
        **overrides,
    }


def login(client, email="alice@example.com", password=PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password})


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def make_token(subject, secret=SECRET, **claims):
    payload = {
        "sub": str(subject),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        **claims,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


# --- signup -----------------------------------------------------------------


def test_signup_creates_account_and_returns_a_working_token(client):
    response = client.post("/auth/signup", json=signup_body())

    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["username"] == "newuser"
    assert body["user"]["email"] == "new@example.com"
    assert body["user"]["account_type"] == "standard"
    assert body["user"]["spark_rating"] == 0

    me = client.get("/me", headers=bearer(body["access_token"]))
    assert me.status_code == 200
    assert me.json()["id"] == body["user"]["id"]


def test_signup_stores_an_argon2_hash_and_never_returns_it(client, session):
    response = client.post("/auth/signup", json=signup_body())

    assert "password_hash" not in response.text
    assert PASSWORD not in response.text
    stored = session.scalars(select(User)).one()
    assert stored.password_hash.startswith("$argon2id$")
    assert PASSWORD not in stored.password_hash


def test_signup_ignores_a_requested_account_type(client, session):
    response = client.post("/auth/signup", json=signup_body(account_type="admin"))

    assert response.status_code == 201
    assert response.json()["user"]["account_type"] == "standard"
    assert session.scalars(select(User)).one().account_type == "standard"


def test_signup_lowercases_the_email(client, session):
    client.post("/auth/signup", json=signup_body(email="New@Example.COM"))

    assert session.scalars(select(User)).one().email == "new@example.com"


@pytest.mark.parametrize(
    "overrides", [{"email": "ALICE@example.com"}, {"username": "ALICE"}]
)
def test_signup_rejects_duplicates_ignoring_case(client, session, overrides):
    make_user(session)

    response = client.post("/auth/signup", json=signup_body(**overrides))

    assert response.status_code == 409
    assert len(session.scalars(select(User)).all()) == 1


@pytest.mark.parametrize(
    "overrides",
    [
        {"password": "short"},
        {"password": "x" * 129},
        {"email": "not-an-email"},
        {"username": "ab"},
        {"username": "has space"},
        {"username": "bad-char!"},
        {"username": "x" * 51},
    ],
)
def test_signup_rejects_invalid_input(client, session, overrides):
    response = client.post("/auth/signup", json=signup_body(**overrides))

    assert response.status_code == 422
    assert session.scalars(select(User)).all() == []


def test_a_new_account_can_log_in(client):
    client.post("/auth/signup", json=signup_body())

    response = login(client, email="new@example.com")

    assert response.status_code == 200


# --- login ------------------------------------------------------------------


def test_login_returns_a_token_and_the_user(client, session):
    user = make_user(session)

    response = login(client)

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["id"] == str(user.id)
    assert body["token_type"] == "bearer"
    assert client.get("/me", headers=bearer(body["access_token"])).status_code == 200


def test_login_email_is_case_insensitive(client, session):
    make_user(session)

    assert login(client, email="ALICE@Example.com").status_code == 200


def test_login_with_the_wrong_password_is_rejected(client, session):
    make_user(session)

    response = login(client, password="not the password")

    assert response.status_code == 401


def test_unknown_email_and_wrong_password_look_identical(client, session):
    make_user(session)

    wrong_password = login(client, password="not the password")
    unknown_email = login(client, email="nobody@example.com")

    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()


def test_an_unreadable_stored_hash_is_a_failed_login_not_a_crash(client, session):
    # The seed data ships placeholder hashes like this one.
    make_user(session, password_hash=SEEDED_FAKE_HASH)

    assert login(client).status_code == 401


def test_login_is_blocked_after_too_many_failures(client, session):
    make_user(session)
    for _ in range(5):
        assert login(client, password="wrong password").status_code == 401

    blocked = login(client)  # even the correct password is refused now

    assert blocked.status_code == 429
    assert int(blocked.headers["retry-after"]) > 0


def test_a_successful_login_resets_the_failure_count(client, session):
    make_user(session)
    for _ in range(4):
        login(client, password="wrong password")
    assert login(client).status_code == 200

    for _ in range(4):
        assert login(client, password="wrong password").status_code == 401

    assert login(client).status_code == 200


def test_failures_for_one_email_do_not_block_another(client, session):
    make_user(session)
    make_user(session, email="bob@example.com", username="bob")
    for _ in range(5):
        login(client, password="wrong password")

    assert login(client, email="bob@example.com").status_code == 200


# --- GET /me ----------------------------------------------------------------


def test_me_requires_a_token(client):
    response = client.get("/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_me_returns_the_account_without_the_password_hash(client, session):
    user = make_user(session)

    response = client.get("/me", headers=bearer(create_access_token(user.id)))

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "alice"
    assert body["email"] == "alice@example.com"
    assert body["account_type"] == "standard"
    assert "password_hash" not in body


@pytest.mark.parametrize(
    "header", ["Bearer not-a-token", "Bearer ", "Basic abc123", "garbage"]
)
def test_me_rejects_malformed_authorization_headers(client, header):
    response = client.get("/me", headers={"Authorization": header})

    assert response.status_code == 401


def test_me_rejects_an_expired_token(client, session):
    user = make_user(session)
    expired = datetime.now(timezone.utc) - timedelta(seconds=5)

    response = client.get("/me", headers=bearer(make_token(user.id, exp=expired)))

    assert response.status_code == 401


def test_me_rejects_a_token_signed_with_another_secret(client, session):
    user = make_user(session)
    forged = make_token(user.id, secret="a-different-secret-" + "y" * 32)

    assert client.get("/me", headers=bearer(forged)).status_code == 401


def test_me_rejects_a_token_with_a_tampered_signature(client, session):
    user = make_user(session)
    valid = make_token(user.id)
    tampered = valid.rsplit(".", 1)[0] + ".invalidsignature"

    assert client.get("/me", headers=bearer(tampered)).status_code == 401


def test_me_rejects_an_unsigned_token(client, session):
    user = make_user(session)
    payload = {
        "sub": str(user.id),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }
    unsigned = jwt.encode(payload, "", algorithm="none")

    assert client.get("/me", headers=bearer(unsigned)).status_code == 401


def test_me_rejects_a_token_without_an_expiry(client, session):
    user = make_user(session)
    no_expiry = jwt.encode({"sub": str(user.id)}, SECRET, algorithm="HS256")

    assert client.get("/me", headers=bearer(no_expiry)).status_code == 401


def test_me_rejects_a_token_for_an_account_that_does_not_exist(client):
    assert (
        client.get("/me", headers=bearer(make_token(uuid.uuid4()))).status_code == 401
    )


def test_me_rejects_a_token_whose_subject_is_not_a_user_id(client):
    assert (
        client.get("/me", headers=bearer(make_token("not-a-uuid"))).status_code == 401
    )


# --- tokens and configuration -----------------------------------------------


def test_token_carries_the_user_id_and_expires_in_an_hour(monkeypatch):
    user_id = uuid.uuid4()

    payload = jwt.decode(create_access_token(user_id), SECRET, algorithms=["HS256"])

    assert payload["sub"] == str(user_id)
    assert payload["exp"] - payload["iat"] == 3600


def test_token_lifetime_can_be_configured(monkeypatch):
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "5")

    payload = jwt.decode(
        create_access_token(uuid.uuid4()), SECRET, algorithms=["HS256"]
    )

    assert payload["exp"] - payload["iat"] == 300


def test_tokens_cannot_be_made_without_a_secret(monkeypatch):
    monkeypatch.delenv("JWT_SECRET")

    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        create_access_token(uuid.uuid4())


def test_a_short_secret_is_refused(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "too-short")

    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        create_access_token(uuid.uuid4())


# --- roles ------------------------------------------------------------------


def test_role_routes_require_a_login(role_client):
    assert role_client.get("/admin-only").status_code == 401


def test_a_standard_user_cannot_use_admin_or_staff_routes(role_client, session):
    user = make_user(session)
    headers = bearer(create_access_token(user.id))

    assert role_client.get("/admin-only", headers=headers).status_code == 403
    assert role_client.get("/staff", headers=headers).status_code == 403


def test_an_organizer_can_use_staff_routes_but_not_admin_routes(role_client, session):
    user = make_user(session, account_type="organizer")
    headers = bearer(create_access_token(user.id))

    assert role_client.get("/staff", headers=headers).status_code == 200
    assert role_client.get("/admin-only", headers=headers).status_code == 403


def test_an_admin_can_use_admin_routes(role_client, session):
    user = make_user(session, account_type="admin")

    response = role_client.get(
        "/admin-only", headers=bearer(create_access_token(user.id))
    )

    assert response.status_code == 200
    assert response.json() == {"username": "alice"}


def test_demoting_a_user_takes_effect_on_their_existing_token(role_client, session):
    user = make_user(session, account_type="admin")
    headers = bearer(create_access_token(user.id))
    assert role_client.get("/admin-only", headers=headers).status_code == 200

    user.account_type = "standard"
    session.commit()

    assert role_client.get("/admin-only", headers=headers).status_code == 403

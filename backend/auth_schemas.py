"""Request and response shapes for signup, login and the current user."""

import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

AccountType = Literal["standard", "organizer", "admin"]


class SignupRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_]+$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RoleUpdate(BaseModel):
    account_type: AccountType


class UserMe(BaseModel):
    """The logged-in user's own account. Never includes the password hash."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: str
    phone_number: str | None = None
    account_type: str
    spark_rating: int
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserMe


class ProfileUpdate(BaseModel):
    """Details a user may change about themselves.

    Only these two fields are accepted, so account_type, email, spark_rating
    and the rest can't be changed here: sending them is a 422.
    """

    model_config = ConfigDict(extra="forbid")

    username: str | None = Field(
        None, min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_]+$"
    )
    phone_number: str | None = Field(None, max_length=20)

    @field_validator("phone_number")
    @classmethod
    def check_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if value == "":
            return None
        if not re.fullmatch(r"[0-9+()\-. ]{7,20}", value):
            raise ValueError("phone_number must be 7-20 digits, spaces or + ( ) - .")
        return value


class PreferredTagsUpdate(BaseModel):
    """The full list of tags the user likes. It replaces the previous list."""

    model_config = ConfigDict(extra="forbid")

    tag_ids: list[uuid.UUID] = Field(max_length=50)

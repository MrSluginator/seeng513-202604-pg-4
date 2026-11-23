"""Request and response shapes for signup, login and the current user."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

AccountType = Literal["standard", "organizer", "admin"]


class SignupRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_]+$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProfileUpdate(BaseModel):
    """Fields a user can update on their own profile."""

    username: str | None = Field(
        default=None,
        min_length=3,
        max_length=50,
        pattern=r"^[A-Za-z0-9_]+$",
    )
    email: EmailStr | None = None
    phone_number: str | None = Field(default=None, max_length=20)

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")

        if "username" in self.model_fields_set and self.username is None:
            raise ValueError("Username cannot be null")

        if "email" in self.model_fields_set and self.email is None:
            raise ValueError("Email cannot be null")

        return self


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

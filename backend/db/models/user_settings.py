from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base, JSONBType

if TYPE_CHECKING:
    from db.models.user import User


class UserSettings(Base):
    """User profile customizations, algorithmic feed preferences, and safety flags."""

    __tablename__ = "user_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    profile_picture_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    social_links: Mapped[dict[str, Any]] = mapped_column(
        JSONBType,
        nullable=False,
        default=dict,
        server_default=text("'{}'"),
    )
    feed_preferences: Mapped[dict[str, Any]] = mapped_column(
        JSONBType,
        nullable=False,
        default=dict,
        server_default=text("'{}'"),
    )
    allow_mature_content: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("FALSE"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped[User] = relationship("User", back_populates="settings")

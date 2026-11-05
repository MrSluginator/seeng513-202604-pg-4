from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base

if TYPE_CHECKING:
    from db.models.tag import Tag
    from db.models.user import User


class UserPreferredTag(Base):
    """Junction table mapping user preference selections to tags for feed discovery."""

    __tablename__ = "user_preferred_tags"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    )

    user: Mapped[User] = relationship(
        "User",
        back_populates="preferred_tag_links",
        overlaps="interested_users,preferred_tags",
    )
    tag: Mapped[Tag] = relationship(
        "Tag",
        back_populates="user_preferred_tag_links",
        overlaps="interested_users,preferred_tags",
    )

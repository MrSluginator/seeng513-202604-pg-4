from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base

if TYPE_CHECKING:
    from db.models.event import Event
    from db.models.event_tag import EventTag
    from db.models.user import User
    from db.models.user_preferred_tag import UserPreferredTag


class Tag(Base):
    """Global taxonomy for categorizing events and tailoring user feeds."""

    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(60), nullable=False, unique=True)

    event_tag_links: Mapped[list[EventTag]] = relationship(
        "EventTag",
        back_populates="tag",
        cascade="all, delete-orphan",
        overlaps="events,tags",
    )
    events: Mapped[list[Event]] = relationship(
        "Event",
        secondary="event_tags",
        back_populates="tags",
        overlaps="event_tag_links",
    )
    user_preferred_tag_links: Mapped[list[UserPreferredTag]] = relationship(
        "UserPreferredTag",
        back_populates="tag",
        cascade="all, delete-orphan",
        overlaps="interested_users,preferred_tags",
    )
    interested_users: Mapped[list[User]] = relationship(
        "User",
        secondary="user_preferred_tags",
        back_populates="preferred_tags",
        overlaps="preferred_tag_links,user_preferred_tag_links",
    )

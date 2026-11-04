from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base

if TYPE_CHECKING:
    from db.models.event import Event
    from db.models.tag import Tag


class EventTag(Base):
    """Junction table mapping tags to events."""

    __tablename__ = "event_tags"

    event_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("events.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    )

    event: Mapped[Event] = relationship(
        "Event",
        back_populates="event_tag_links",
        overlaps="events,tags",
    )
    tag: Mapped[Tag] = relationship(
        "Tag",
        back_populates="event_tag_links",
        overlaps="events,tags",
    )

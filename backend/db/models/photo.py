from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base

if TYPE_CHECKING:
    from db.models.event import Event
    from db.models.event_photo import EventPhoto
    from db.models.user import User


class Photo(Base):
    """Media asset catalog and storage identifiers."""

    __tablename__ = "photos"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    uploader_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    uploader: Mapped[Optional[User]] = relationship(
        "User",
        back_populates="uploaded_photos",
    )
    event_photo_links: Mapped[list[EventPhoto]] = relationship(
        "EventPhoto",
        back_populates="photo",
        cascade="all, delete-orphan",
    )
    events: Mapped[list[Event]] = relationship(
        "Event",
        secondary="event_photos",
        back_populates="photos",
        viewonly=True,
    )

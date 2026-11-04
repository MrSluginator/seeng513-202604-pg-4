from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base, JSONBType

if TYPE_CHECKING:
    from db.models.comment import Comment
    from db.models.event_photo import EventPhoto
    from db.models.event_tag import EventTag
    from db.models.photo import Photo
    from db.models.saved_event import SavedEvent
    from db.models.scraped_event import ScrapedEvent
    from db.models.tag import Tag
    from db.models.user import User


class RecurrencePattern(str, Enum):
    """Supported recurrence patterns for an event."""

    NONE = "none"
    ONE_TIME = "one-time"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class Event(Base):
    """Main event listings created natively or promoted from raw scraped sources."""

    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint(
            "recurrence_pattern IN ('none', 'one-time', 'daily', 'weekly', 'monthly')",
            name="ck_events_recurrence_pattern",
        ),
        CheckConstraint(
            "recurrence_pattern <> 'none' OR recurrence_end_date IS NULL",
            name="ck_events_recurrence_end_date_requires_pattern",
        ),
        CheckConstraint(
            "price_min IS NULL OR price_min >= 0",
            name="ck_events_price_min_non_negative",
        ),
        CheckConstraint(
            "price_max IS NULL OR price_max >= 0",
            name="ck_events_price_max_non_negative",
        ),
        CheckConstraint(
            "price_max IS NULL OR (price_min IS NOT NULL AND price_max >= price_min)",
            name="ck_events_price_range_valid",
        ),
        CheckConstraint(
            "rating IS NULL OR (rating >= 0 AND rating <= 5)",
            name="ck_events_rating_range",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    creator_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    end_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    recurrence_pattern: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=RecurrencePattern.NONE.value,
        server_default=text("'none'"),
    )
    recurrence_end_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    price_min: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    price_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD",
        server_default=text("'USD'"),
    )
    location_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    latitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[Optional[Decimal]] = mapped_column(Numeric(9, 6), nullable=True)
    crowd_by_hour: Mapped[dict[str, Any]] = mapped_column(
        JSONBType,
        nullable=False,
        default=dict,
        server_default=text("'{}'"),
    )
    visits_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    shares_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    review_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    rating: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(3, 2),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    creator: Mapped[Optional[User]] = relationship(
        "User",
        back_populates="created_events",
    )
    event_photo_links: Mapped[list[EventPhoto]] = relationship(
        "EventPhoto",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    photos: Mapped[list[Photo]] = relationship(
        "Photo",
        secondary="event_photos",
        back_populates="events",
        viewonly=True,
    )
    comments: Mapped[list[Comment]] = relationship(
        "Comment",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    saved_by_links: Mapped[list[SavedEvent]] = relationship(
        "SavedEvent",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    saved_by_users: Mapped[list[User]] = relationship(
        "User",
        secondary="saved_events",
        back_populates="saved_events",
        viewonly=True,
    )
    event_tag_links: Mapped[list[EventTag]] = relationship(
        "EventTag",
        back_populates="event",
        cascade="all, delete-orphan",
        overlaps="tags",
    )
    tags: Mapped[list[Tag]] = relationship(
        "Tag",
        secondary="event_tags",
        back_populates="events",
        overlaps="event_tag_links",
    )
    scraped_source: Mapped[Optional[ScrapedEvent]] = relationship(
        "ScrapedEvent",
        back_populates="parsed_event",
        uselist=False,
    )

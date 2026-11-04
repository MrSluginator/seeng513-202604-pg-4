from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Integer, String, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base

if TYPE_CHECKING:
    from db.models.event import Event
    from db.models.notification_settings import NotificationSettings
    from db.models.photo import Photo
    from db.models.review import Review
    from db.models.saved_event import SavedEvent
    from db.models.tag import Tag
    from db.models.user_friend import UserFriend
    from db.models.user_preferred_tag import UserPreferredTag
    from db.models.user_settings import UserSettings


class User(Base):
    """Primary user identity and credentials."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    username: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    account_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="standard",
        server_default=text("'standard'"),
    )
    spark_rating: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
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

    # 1-to-1 Relationships
    settings: Mapped[Optional[UserSettings]] = relationship(
        "UserSettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    notification_settings: Mapped[Optional[NotificationSettings]] = relationship(
        "NotificationSettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # Self-referential M-to-N Relationships (via user_friends)
    friendships_initiated: Mapped[list[UserFriend]] = relationship(
        "UserFriend",
        foreign_keys="UserFriend.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    friendships_received: Mapped[list[UserFriend]] = relationship(
        "UserFriend",
        foreign_keys="UserFriend.friend_id",
        back_populates="friend",
        cascade="all, delete-orphan",
    )
    friends: Mapped[list[User]] = relationship(
        "User",
        secondary="user_friends",
        primaryjoin="User.id == UserFriend.user_id",
        secondaryjoin="User.id == UserFriend.friend_id",
        viewonly=True,
    )

    # 1-to-M Relationships
    created_events: Mapped[list[Event]] = relationship(
        "Event",
        back_populates="creator",
    )
    uploaded_photos: Mapped[list[Photo]] = relationship(
        "Photo",
        back_populates="uploader",
    )
    reviews: Mapped[list[Review]] = relationship(
        "Review",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # M-to-N Relationships (via saved_events)
    saved_event_links: Mapped[list[SavedEvent]] = relationship(
        "SavedEvent",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    saved_events: Mapped[list[Event]] = relationship(
        "Event",
        secondary="saved_events",
        back_populates="saved_by_users",
        viewonly=True,
    )

    # M-to-N Relationships (via user_preferred_tags)
    preferred_tag_links: Mapped[list[UserPreferredTag]] = relationship(
        "UserPreferredTag",
        back_populates="user",
        cascade="all, delete-orphan",
        overlaps="preferred_tags",
    )
    preferred_tags: Mapped[list[Tag]] = relationship(
        "Tag",
        secondary="user_preferred_tags",
        back_populates="interested_users",
        overlaps="preferred_tag_links",
    )

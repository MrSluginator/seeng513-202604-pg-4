import uuid
from datetime import datetime
from typing import Any, Literal
from decimal import Decimal
from enum import Enum

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class TagSummary(BaseModel):
    """Basic information about an event tag."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str


class EventCreate(BaseModel):
    """Fields an organizer can provide when creating an event."""

    title: str = Field(min_length=1, max_length=255)
    summary: str | None = Field(default=None, max_length=255)
    description: str | None = None

    start_time: datetime | None = None
    end_time: datetime | None = None

    recurrence_pattern: Literal[
        "none", "one-time", "daily", "weekly", "monthly"
    ] = "none"
    recurrence_end_date: datetime | None = None

    price_min: Decimal | None = Field(default=None, ge=0)
    price_max: Decimal | None = Field(default=None, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)

    location_name: str | None = Field(default=None, max_length=255)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)

    tag_ids: list[uuid.UUID] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_event(self):
        if (
            self.start_time is not None
            and self.end_time is not None
            and self.end_time < self.start_time
        ):
            raise ValueError("End time cannot be before start time")

        if (
            self.price_min is not None
            and self.price_max is not None
            and self.price_max < self.price_min
        ):
            raise ValueError("Maximum price cannot be less than minimum price")

        if (
            self.recurrence_pattern == "none"
            and self.recurrence_end_date is not None
        ):
            raise ValueError(
                "Recurrence end date requires a recurrence pattern"
            )

        if len(self.tag_ids) != len(set(self.tag_ids)):
            raise ValueError("Duplicate tag IDs are not allowed")

        return self


class EventUpdate(BaseModel):
    """Fields an organizer can change on an existing event."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    summary: str | None = Field(default=None, max_length=255)
    description: str | None = None

    start_time: datetime | None = None
    end_time: datetime | None = None

    recurrence_pattern: Literal[
        "none", "one-time", "daily", "weekly", "monthly"
    ] | None = None
    recurrence_end_date: datetime | None = None

    price_min: Decimal | None = Field(default=None, ge=0)
    price_max: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)

    location_name: str | None = Field(default=None, max_length=255)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)

    tag_ids: list[uuid.UUID] | None = None

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")

        for field in ("title", "recurrence_pattern", "currency", "tag_ids"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")

        if self.tag_ids is not None and len(self.tag_ids) != len(set(self.tag_ids)):
            raise ValueError("Duplicate tag IDs are not allowed")

        return self


class PhotoSummary(BaseModel):
    """One image on an event: where to load it and how to place it."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    is_cover: bool
    display_order: int

    @model_validator(mode="before")
    @classmethod
    def flatten_event_photo(cls, value: Any) -> Any:
        """Accept an event_photos row and read the image details off its photo."""
        photo = getattr(value, "photo", None)
        if photo is None:
            return value
        return {
            "id": photo.id,
            "url": photo.file_url,
            "is_cover": value.is_cover,
            "display_order": value.display_order,
        }


def _photo_position(item: Any) -> tuple[bool, int]:
    """Sort key: the cover image first, then by display_order."""
    if isinstance(item, dict):
        return (not item["is_cover"], item["display_order"])
    return (not item.is_cover, item.display_order)


class EventSummary(BaseModel):
    """What the event feed needs for each card"""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    summary: str | None = None
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    price_min: float | None = None
    price_max: float | None = None
    currency: str
    rating: float | None = None
    review_count: int
    visits_count: int
    tags: list[TagSummary] = Field(default_factory=list)
    photos: list[PhotoSummary] = Field(
        default_factory=list,
        validation_alias=AliasChoices("event_photo_links", "photos"),
    )

    @field_validator("photos", mode="before")
    @classmethod
    def cover_first(cls, links: Any) -> Any:
        return sorted(links, key=_photo_position)


class EventDetail(EventSummary):
    """Everything on the event page, including the crowd data"""

    description: str | None = None
    recurrence_pattern: str
    recurrence_end_date: datetime | None = None
    crowd_by_hour: dict[str, Any]
    shares_count: int
    creator_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class EventList(BaseModel):
    total: int
    items: list[EventSummary]

class SavedEventItem(BaseModel):
    """A saved event and the current user's visit information."""

    event: EventSummary
    user_visits: int
    created_at: datetime
    updated_at: datetime

class SavedEventList(BaseModel):
    total: int
    items: list[SavedEventItem]

class SavedEventStatus(BaseModel):
    """Whether the current user has saved an event."""

    event_id: uuid.UUID
    is_saved: bool
    user_visits: int

class EventVisitResponse(BaseModel):
    """Visit counts after recording a visit."""

    event_id: uuid.UUID
    user_visits: int
    visits_count: int

class ReviewCreate(BaseModel):
    """Information required to create a review."""

    rating: int = Field(ge=1, le=5)
    content: str | None = None

class ReviewUpdate(BaseModel):
    """Fields that can be changed on an existing review."""

    rating: int | None = Field(default=None, ge=1, le=5)
    content: str | None = None

    @model_validator(mode="after")
    def check_update_fields(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")
        if "rating" in self.model_fields_set and self.rating is None:
            raise ValueError("Rating cannot be null")
        return self

class ReviewSummary(BaseModel):
    """Information returned for an individual review."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_id: uuid.UUID
    user_id: uuid.UUID
    rating: int
    content: str | None
    created_at: datetime
    updated_at: datetime


class ReviewList(BaseModel):
    """Paginated list of reviews."""

    total: int
    items: list[ReviewSummary]
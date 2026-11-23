import uuid
from datetime import datetime
from typing import Any

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

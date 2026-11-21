import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TagSummary(BaseModel):
    """Basic information about an event tag."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str


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

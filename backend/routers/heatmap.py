"""Foot-traffic points for the map page.

Each point is one event's venue with an intensity from 0 to 1, ready to draw as
[latitude, longitude, intensity]. The data comes from the events already stored:

* ``crowd_by_hour`` holds how busy the venue is at each hour of the day, 0-100,
  for example {"0": 5, "1": 3, ..., "23": 40}, or a list of 24 numbers. This is
  where the BestTime.app forecast is saved (see refresh_crowd.py). When it also
  has a "by_day" entry ({"0": {hours...}, ..., "6": {hours...}}, Monday = 0), the
  numbers for the chosen weekday are used and the flat hours are a weekly average.
* For venues with no crowd data, the intensity falls back to how often the venue
  has been visited, compared with the busiest venue in the same response.

The heatmap needs a login, so anonymous visitors get a 401 and the frontend can
show its sign-up modal.
"""

import math
import os
from datetime import datetime, timezone
from typing import Any, Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from db.database import get_db
from db.models.event import Event
from db.models.user import User
from deps import get_current_user

router = APIRouter(tags=["heatmap"])


class HeatPoint(BaseModel):
    event_id: str
    title: str
    latitude: float
    longitude: float
    intensity: float  # 0 (quiet) to 1 (busiest)
    source: Literal["crowd", "visits"]  # where the intensity came from
    venue: str | None


class HeatmapResponse(BaseModel):
    hour: int  # the hour of the day (0-23) the points are for
    day: int  # the weekday the points are for (Monday = 0 ... Sunday = 6)
    generated_at: datetime
    points: list[HeatPoint]


def _local_now() -> datetime:
    """The current time where the venues are (Calgary by default)."""
    name = os.getenv("HEATMAP_TIMEZONE", "America/Edmonton")
    try:
        zone = ZoneInfo(name)
    except Exception:  # unknown name, or no timezone data on this machine
        zone = timezone.utc
    return datetime.now(zone)


def _venue_name(location_name: str | None) -> str | None:
    """The place name: the part of location_name before the first comma."""
    name = (location_name or "").split(",")[0].strip()
    return name or None


def _crowd_at(crowd: Any, hour: int, day: int) -> float | None:
    """How busy the venue is at this hour (0-100), or None if unknown."""
    if isinstance(crowd, dict):
        by_day = crowd.get("by_day")
        day_hours = by_day.get(str(day)) if isinstance(by_day, dict) else None
        if isinstance(day_hours, dict) and str(hour) in day_hours:
            crowd = day_hours
        raw = crowd.get(str(hour), crowd.get(hour))
    elif isinstance(crowd, list) and len(crowd) == 24:
        raw = crowd[hour]
    else:
        return None
    if isinstance(raw, bool) or not isinstance(raw, (int, float, str)):
        return None
    try:
        value = float(raw)
    except ValueError:
        return None
    if not math.isfinite(value):
        return None
    return min(max(value, 0.0), 100.0)


@router.get("/heatmap", response_model=HeatmapResponse)
def get_heatmap(
    hour: int | None = Query(
        None, ge=0, le=23, description="Hour of the day; default is now"
    ),
    day: int | None = Query(
        None, ge=0, le=6, description="Weekday, Monday = 0; default is today"
    ),
    min_lat: float | None = Query(None, ge=-90, le=90),
    max_lat: float | None = Query(None, ge=-90, le=90),
    min_lng: float | None = Query(None, ge=-180, le=180),
    max_lng: float | None = Query(None, ge=-180, le=180),
    limit: int = Query(200, ge=1, le=500),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HeatmapResponse:
    """Heatmap points for the venues in view. Send the map's corners as the
    min/max values to only get the venues on screen."""
    now = _local_now()
    chosen_hour = now.hour if hour is None else hour
    chosen_day = now.weekday() if day is None else day

    conditions = [Event.latitude.is_not(None), Event.longitude.is_not(None)]
    if min_lat is not None:
        conditions.append(Event.latitude >= min_lat)
    if max_lat is not None:
        conditions.append(Event.latitude <= max_lat)
    if min_lng is not None:
        conditions.append(Event.longitude >= min_lng)
    if max_lng is not None:
        conditions.append(Event.longitude <= max_lng)

    rows = db.execute(
        select(
            Event.id,
            Event.title,
            Event.latitude,
            Event.longitude,
            Event.crowd_by_hour,
            Event.visits_count,
            Event.location_name,
        )
        .where(*conditions)
        .order_by(Event.visits_count.desc(), Event.id)
        .limit(limit)
    ).all()

    busiest = max((row.visits_count for row in rows), default=0)

    points = []
    for row in rows:
        crowd = _crowd_at(row.crowd_by_hour, chosen_hour, chosen_day)
        if crowd is not None:
            intensity, source = crowd / 100, "crowd"
        elif busiest > 0:
            intensity, source = row.visits_count / busiest, "visits"
        else:
            continue
        if intensity <= 0:
            continue
        points.append(
            HeatPoint(
                event_id=str(row.id),
                title=row.title,
                latitude=float(row.latitude),
                longitude=float(row.longitude),
                intensity=round(intensity, 3),
                source=source,
                venue=_venue_name(row.location_name),
            )
        )

    return HeatmapResponse(
        hour=chosen_hour,
        day=chosen_day,
        generated_at=datetime.now(timezone.utc),
        points=points,
    )

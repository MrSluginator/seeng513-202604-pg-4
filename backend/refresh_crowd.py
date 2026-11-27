"""Save BestTime.app foot-traffic forecasts into events.crowd_by_hour.

The heatmap (GET /heatmap) only reads what is stored, so running this is what
puts real BestTime data on the map. Nothing calls BestTime while users browse.

Run it from the project folder, with the stack running:

    docker compose exec backend python refresh_crowd.py --dry-run
    docker compose exec backend python refresh_crowd.py --limit 5
    docker compose exec backend python refresh_crowd.py --venue "Betty Lou's Library"

    --export prints SQL that puts the saved forecasts into any other database
    (paste it at the end of seed.sql),so the deployed site get the same heatmap
    without calling BestTime.

    docker compose exec -T backend python refresh_crowd.py --export > forecasts.sql

Needs BESTTIME_API_KEY (the *private* key) in backend/.env. The venue's address
is "<location_name>, <BESTTIME_CITY>", because events have no street address. The
venue name sent is the part of location_name before the first comma, so
"The Nash Annex, Inglewood" is looked up as "The Nash Annex" in Inglewood.

"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from db.models.event import Event

FORECAST_URL = "https://besttime.app/api/v1/forecasts"
CREDITS_PER_FORECAST = 2
DEFAULT_LIMIT = 5
MAX_LIMIT = 50
MAX_CONSECUTIVE_FAILURES = 3
DEFAULT_CITY = "Calgary, AB, Canada"

Fetch = Callable[[str, str], dict]


class BestTimeError(Exception):
    """BestTime could not give us a usable forecast for this venue."""


class RateLimited(BestTimeError):
    """BestTime answered 429: stop and try again later."""


def fetch_forecast(venue_name: str, venue_address: str) -> dict:
    """Ask BestTime for a venue's weekly forecast (POST /forecasts)."""
    key = os.getenv("BESTTIME_API_KEY", "")
    if not key:
        raise BestTimeError("BESTTIME_API_KEY is not set")
    query = urllib.parse.urlencode(
        {
            "api_key_private": key,
            "venue_name": venue_name,
            "venue_address": venue_address,
        }
    )
    request = urllib.request.Request(f"{FORECAST_URL}?{query}", method="POST")
    # Errors are re-raised "from None" so the key, which is in the URL, never
    # ends up in a traceback or a log.
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 429:
            raise RateLimited("BestTime rate limit reached") from None
        raise BestTimeError(f"BestTime answered HTTP {error.code}") from None
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        raise BestTimeError(
            f"Could not read BestTime's answer ({type(error).__name__})"
        ) from None


def forecast_to_crowd(response: dict) -> dict:
    """Turn a BestTime forecast into the crowd_by_hour the heatmap reads.

    BestTime sends, for each weekday (day_int 0 = Monday), 24 numbers from 0 to
    100 in "day_raw" where the first one is 6 AM and the last is 5 AM the next
    morning. We store each weekday by clock hour ("by_day") plus the average of
    the days on the top level, so any weekday still has a fallback.
    """
    if response.get("status") != "OK":
        raise BestTimeError("BestTime could not forecast this venue")

    by_day: dict[str, dict[str, int]] = {}
    for day in response.get("analysis") or []:
        try:
            day_int = int(day["day_info"]["day_int"])
            raw = day["day_raw"]
        except (KeyError, TypeError, ValueError):
            continue
        if not 0 <= day_int <= 6 or not isinstance(raw, list) or len(raw) != 24:
            continue
        hours = {}
        for index, value in enumerate(raw):
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                continue
            hours[str((index + 6) % 24)] = min(max(round(value), 0), 100)
        if len(hours) == 24:
            by_day[str(day_int)] = hours

    if not by_day:
        raise BestTimeError("BestTime sent no usable forecast")

    crowd: dict[str, Any] = {
        str(hour): round(sum(day[str(hour)] for day in by_day.values()) / len(by_day))
        for hour in range(24)
    }
    crowd["by_day"] = by_day
    crowd["source"] = "besttime"
    crowd["fetched_at"] = datetime.now(timezone.utc).isoformat()
    venue_id = (response.get("venue_info") or {}).get("venue_id")
    if venue_id:
        crowd["venue_id"] = venue_id
    return crowd


def _has_besttime_data(event: Event) -> bool:
    crowd = event.crowd_by_hour
    return isinstance(crowd, dict) and crowd.get("source") == "besttime"


def venues_to_refresh(session: Session, force: bool) -> dict[str, list[Event]]:
    """Venues that need a forecast, busiest first, with their events."""
    events = session.scalars(
        select(Event)
        .where(Event.location_name.is_not(None))
        .order_by(Event.visits_count.desc(), Event.id)
    ).all()
    venues: dict[str, list[Event]] = {}
    for event in events:
        name = event.location_name.strip()
        if name:
            venues.setdefault(name, []).append(event)
    return {
        name: group
        for name, group in venues.items()
        if force or not all(_has_besttime_data(event) for event in group)
    }


@dataclass
class Result:
    planned: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)  # --venue names not in the DB
    updated: list[str] = field(default_factory=list)
    failed: list[tuple[str, str]] = field(default_factory=list)
    stopped: str | None = None


def refresh(
    session: Session,
    fetch: Fetch = fetch_forecast,
    city: str = DEFAULT_CITY,
    limit: int = DEFAULT_LIMIT,
    force: bool = False,
    dry_run: bool = False,
    only: list[str] | None = None,
) -> Result:
    """Fetch and save forecasts for up to `limit` venues.

    `only` restricts the run to those venue names (any capitalisation).
    """
    venues = venues_to_refresh(session, force)
    missing: list[str] = []
    if only:
        wanted = {
            name.strip().casefold(): name.strip() for name in only if name.strip()
        }
        venues = {k: v for k, v in venues.items() if k.casefold() in wanted}
        found = {k.casefold() for k in venues}
        missing = [orig for key, orig in wanted.items() if key not in found]
    pending = list(venues.items())[:limit]
    result = Result(planned=[name for name, _ in pending], missing=missing)
    if dry_run:
        return result

    in_a_row = 0
    for name, events in pending:
        try:
            # "Betty Lou's Library, Beltline" -> look up "Betty Lou's Library", and
            # keep the neighbourhood in the address to help BestTime find it.
            short_name = name.split(",")[0].strip()
            crowd = forecast_to_crowd(fetch(short_name, f"{name}, {city}"))
        except RateLimited as error:
            result.stopped = str(error)
            break
        except BestTimeError as error:
            result.failed.append((name, str(error)))
            in_a_row += 1
            if in_a_row >= MAX_CONSECUTIVE_FAILURES:
                result.stopped = (
                    f"{MAX_CONSECUTIVE_FAILURES} venues in a row failed; "
                    "check the key and the venue names"
                )
                break
            continue
        in_a_row = 0
        for event in events:
            event.crowd_by_hour = dict(crowd)
        session.commit()
        result.updated.append(name)
    return result


def _limit(text: str) -> int:
    try:
        value = int(text)
    except ValueError:
        value = 0
    if not 1 <= value <= MAX_LIMIT:
        raise argparse.ArgumentTypeError(
            f"must be a whole number from 1 to {MAX_LIMIT}"
        )
    return value


def export_sql(session: Session) -> str:
    """UPDATE statements that copy the saved BestTime forecasts to another database.

    Put them after the inserts in seed.sql. They match events by id, so the seed's
    events need fixed ids, and they do nothing for events that don't exist.
    """
    events = session.scalars(select(Event).order_by(Event.id)).all()
    lines = [
        "-- BestTime forecasts saved by refresh_crowd.py",
    ]
    for event in events:
        if not _has_besttime_data(event):
            continue
        payload = json.dumps(event.crowd_by_hour, sort_keys=True).replace("'", "''")
        lines.append(
            f"UPDATE events SET crowd_by_hour = '{payload}'::jsonb "
            f"WHERE id = '{event.id}';"
        )
    return "\n".join(lines) + "\n"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "--limit",
        type=_limit,
        default=DEFAULT_LIMIT,
        metavar=f"1-{MAX_LIMIT}",
        help=f"most venues to look up (default {DEFAULT_LIMIT}, "
        f"{CREDITS_PER_FORECAST} credits each)",
    )
    parser.add_argument(
        "--venue",
        action="append",
        default=[],
        metavar="NAME",
        help="only look up this venue (as written in location_name); repeatable",
    )
    parser.add_argument(
        "--force", action="store_true", help="refresh venues that already have data"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="list the venues; call nothing"
    )
    parser.add_argument(
        "--export",
        action="store_true",
        help="print SQL that copies the saved forecasts to another database",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.export:
        from db.database import SessionLocal

        with SessionLocal() as session:
            print(export_sql(session), end="")
        return 0
    if not args.dry_run and not os.getenv("BESTTIME_API_KEY"):
        print("BESTTIME_API_KEY is not set (put it in backend/.env).")
        return 1

    from db.database import SessionLocal

    city = os.getenv("BESTTIME_CITY", DEFAULT_CITY)
    with SessionLocal() as session:
        result = refresh(
            session,
            city=city,
            limit=args.limit,
            force=args.force,
            dry_run=args.dry_run,
            only=args.venue,
        )

    for name in result.missing:
        print(f"no event has the venue name: {name}")

    if args.dry_run:
        print(
            f"Would look up {len(result.planned)} venue(s), up to "
            f"{len(result.planned) * CREDITS_PER_FORECAST} credits:"
        )
        for name in result.planned:
            print(f"  {name}, {city}")
        return 0

    for name in result.updated:
        print(f"saved   {name}")
    for name, reason in result.failed:
        print(f"failed  {name}: {reason}")
    if result.stopped:
        print(f"stopped early: {result.stopped}")
    print(f"{len(result.updated)} saved, {len(result.failed)} failed.")
    return 1 if result.stopped else 0


if __name__ == "__main__":
    sys.exit(main())

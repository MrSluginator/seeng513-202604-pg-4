"""A small in-memory limit on failed logins, to slow down password guessing.

It lives in the server process, so it is per instance and resets on restart.
That is fine for one backend instance; with several, use a shared store.
"""

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException


class FailedLoginLimiter:
    def __init__(self, max_attempts: int = 5, window_seconds: int = 15 * 60):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _recent(self, key: str, now: float) -> deque[float]:
        failures = self._failures[key]
        while failures and now - failures[0] > self.window_seconds:
            failures.popleft()
        return failures

    def check(self, key: str) -> None:
        """Raise 429 if this key has failed too many times recently."""
        now = time.monotonic()
        with self._lock:
            failures = self._recent(key, now)
            if len(failures) >= self.max_attempts:
                retry_after = int(self.window_seconds - (now - failures[0])) + 1
                raise HTTPException(
                    status_code=429,
                    detail="Too many failed login attempts. Try again later.",
                    headers={"Retry-After": str(retry_after)},
                )

    def record_failure(self, key: str) -> None:
        with self._lock:
            self._failures[key].append(time.monotonic())

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._failures.clear()


login_limiter = FailedLoginLimiter()

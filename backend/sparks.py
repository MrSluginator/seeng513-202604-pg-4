"""Sparks: a user's credibility score, kept as one number on the user.

Other users give sparks. A user reads a review (comment) or looks at an event
and gives it a spark (+1) or takes one away (-1). This changes the total of
whoever wrote the review or published the event by 1. A user can do this as
often as they like.

Nothing is stored about who gave a spark or which item it was for
"""

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from db.models.user import User

MAX_ADJUSTMENT = 1000  # most an admin can change in one go


class SparkVote(BaseModel):
    """+1 to give a spark (the default) or -1 to take one away."""

    model_config = ConfigDict(extra="forbid")

    amount: Literal[1, -1] = 1


class SparkGiven(BaseModel):
    """The new spark total of the person who was sparked."""

    spark_rating: int


def adjust_sparks(db: Session, user_id: uuid.UUID | None, amount: int) -> None:
    """Add (or, if negative, remove) sparks. Does not commit.

    The change is made by the database in one statement, so two requests at the
    same time cannot overwrite each other. The total can go below zero.
    """
    if user_id is None or amount == 0:
        return
    db.execute(
        update(User)
        .where(User.id == user_id)
        .values(spark_rating=User.spark_rating + amount)
        .execution_options(synchronize_session=False)
    )


def give_spark(db: Session, author_id: uuid.UUID | None, amount: int = 1) -> SparkGiven:
    """Add (+1) or take away (-1) a spark for the author and return their new
    total. Commits.

    If the item has no author (an event with no organizer), nothing changes and
    the total is 0.
    """
    adjust_sparks(db, author_id, amount)
    db.commit()
    total = 0
    if author_id is not None:
        total = db.scalar(select(User.spark_rating).where(User.id == author_id)) or 0
    return SparkGiven(spark_rating=total)

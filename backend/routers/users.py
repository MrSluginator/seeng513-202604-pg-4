"""The logged-in user's own account."""

from fastapi import APIRouter, Depends

from auth_schemas import UserMe
from db.models.user import User
from deps import get_current_user

router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserMe)
def read_me(user: User = Depends(get_current_user)) -> UserMe:
    return UserMe.model_validate(user)

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, events, users

app = FastAPI(title="Flare API", description="Backend API for Flare", version="0.1.0")

# Which websites may call the API from a browser (comma-separated).
# The Angular dev server runs on http://localhost:4200.
cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(users.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to Flare API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}

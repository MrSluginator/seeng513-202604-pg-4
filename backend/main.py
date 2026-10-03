from fastapi import FastAPI

app = FastAPI(title="Flare API", description="Backend API for Flare", version="0.1.0")


@app.get("/")
def read_root():
    return {"message": "Welcome to Flare API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}

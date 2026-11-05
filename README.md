# Flare

Welcome to **Flare**! This repository is organized as a full-stack monorepo featuring a React frontend, a FastAPI backend, PostgreSQL database support, Docker orchestration, and GitLab CI/CD pipelines.

---

## 🛠 Tech Stack & Architecture

- **Frontend**: React 19, Vite, HTML/CSS, Leaflet & `leaflet.heat` (Map & Heatmap visualization)
- **Backend**: FastAPI, SQLAlchemy, asyncpg / psycopg2, BeautifulSoup4 (Scraping), Uvicorn
- **Database**: PostgreSQL
- **Integrations & External APIs**:
  - [BestTime.app API](https://besttime.app/) (Venue foot-traffic / busyness data)
  - [Open-Meteo API](https://open-meteo.com/) (Weather forecasts & historical data)
  - [Resend API](https://resend.com/) (Email transactional messaging)
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitLab CI/CD (GitLab Runners) for automated linting, formatting checks, testing, and builds
- **Cloud Deployment**:
  - Frontend: [Vercel](https://vercel.com/)
  - Backend: [Render](https://render.com/)

---

## 📁 Repository Structure

```text
.
├── .gitlab-ci.yml        # GitLab CI/CD pipeline definition
├── docker-compose.yml    # Full-stack Docker orchestration
├── frontend/             # React + Vite application
│   ├── src/              # React source code (Leaflet, App components)
│   ├── package.json      # Frontend dependencies & npm scripts
│   ├── eslint.config.js  # ESLint configuration
│   ├── .prettierrc       # Prettier formatting config
│   ├── Dockerfile        # Frontend container definition
│   └── .env.example      # Example frontend environment variables
├── backend/              # FastAPI application
│   ├── main.py           # FastAPI entrypoint & routes
│   ├── db/               # Database configuration, ORM models & schema
│   │   ├── database.py   # SQLAlchemy engine & session setup
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── create_tables.py # Script to initialize/manage DB tables
│   │   └── schema.sql    # Raw PostgreSQL DDL schema script
│   ├── tests/            # Pytest test suite
│   ├── requirements.txt  # Production Python dependencies
│   ├── requirements-dev.txt # Development/linting dependencies
│   ├── pyproject.toml    # Black, isort & pytest configurations
│   ├── .flake8           # Flake8 linter configuration
│   ├── Dockerfile        # Backend container definition
│   └── .env.example      # Example backend environment variables
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended) & `npm`
- [Python](https://www.python.org/) (v3.11+ recommended)
- [Docker](https://www.docker.com/) & Docker Compose (optional for containerized run)
- [PostgreSQL](https://www.postgresql.org/) (local installation or cloud-hosted instance)

---

### Local Development Setup

#### Frontend Setup

1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Run the development server:
   ```bash
   pnpm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

#### Backend Setup

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Install backend dependencies (including dev tools):
   ```bash
   pip install -r requirements.txt -r requirements-dev.txt
   ```
5. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend API will be available at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).

#### Database Schema Initialization

Make sure your PostgreSQL instance is running (either locally or via `docker compose up -d db`) and `DATABASE_URL` is configured in `backend/.env` (defaults to `postgresql://flare_user:flare_password@localhost:5432/flare_db`).

##### Option 1: Via Python (`db/create_tables.py`)

Run the initialization script from the `backend/` directory (with your virtual environment activated):

- **Create tables via SQLAlchemy ORM metadata**:
  ```bash
  python db/create_tables.py
  ```
- **Execute the raw `db/schema.sql` file directly via Python**:
  ```bash
  python db/create_tables.py --from-sql-file
  ```
- **Additional flags**:
  - `--drop`: Drop all existing tables before creating them (e.g., `python db/create_tables.py --drop`)
  - `--database-url <url>`: Override the `DATABASE_URL` environment variable
  - `--print-sql`: Print the compiled PostgreSQL DDL to stdout and exit without connecting to a database

##### Option 2: Via Plain `psql` (`db/schema.sql`)

You can also apply [`backend/db/schema.sql`](backend/db/schema.sql) directly using the `psql` CLI:

- **Against a local or remote PostgreSQL instance**:
  ```bash
  psql "postgresql://flare_user:flare_password@localhost:5432/flare_db" -f backend/db/schema.sql
  ```
  *(Or using `DATABASE_URL`: `psql "$DATABASE_URL" -f backend/db/schema.sql`)*

- **Against the Docker Compose `db` container**:
  ```bash
  docker compose exec -T db psql -U flare_user -d flare_db < backend/db/schema.sql
  ```

---

## 🔍 Linting, Formatting & Testing

### Frontend

Run linting and formatting commands from the `frontend/` directory:

- **Lint code**: `npm run lint`
- **Auto-fix lint issues**: `npm run lint:fix`
- **Format code with Prettier**: `npm run format`
- **Check formatting**: `npm run format:check`
- **Build production bundle**: `npm run build`

### Backend

Run code quality checks and tests from the `backend/` directory:

- **Lint with Flake8**: `flake8 .`
- **Format code with Black**: `black .`
- **Check Black formatting**: `black --check .`
- **Sort imports with isort**: `isort .`
- **Run tests with Pytest**: `pytest`

---

## 🔄 CI/CD Pipeline

The repository includes a comprehensive `.gitlab-ci.yml` workflow configured for GitLab Runners across three stages:

1. **Lint**: Runs ESLint & Prettier check on the frontend; Flake8, Black check, and isort check on the backend.
2. **Test**: Executes Pytest test suites on the backend.
3. **Build**: Builds production artifacts for the frontend.
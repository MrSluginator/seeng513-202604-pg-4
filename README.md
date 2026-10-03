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
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
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
# IELTS Preparation & Assessment Platform

An enterprise-grade, full-stack IELTS preparation platform featuring an authentic IDP/British Council exam simulator, server-side scoring engine, AI-powered Writing & Speaking evaluation, and student progress tracking.

---

## 🏛 System Architecture

```
                                 ┌─────────────────────────────────┐
                                 │     Next.js 14 Web Portal       │
                                 │       (Port 3000 / SSR)         │
                                 └───────────────┬─────────────────┘
                                                 │ HTTP / REST
                                                 ▼
                                 ┌─────────────────────────────────┐
                                 │      FastAPI Backend API        │
                                 │       (Port 8000 / async)       │
                                 └───────────────┬─────────────────┘
                                                 │
                   ┌─────────────────────────────┼─────────────────────────────┐
                   │                             │                             │
                   ▼                             ▼                             ▼
       ┌───────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
       │      PostgreSQL 16    │     │        Redis 7        │     │     Celery Worker     │
       │   (Port 5432 / DB)    │     │   (Port 6379 / Broker)│     │  (AI Writing/Speaking)│
       └───────────────────────┘     └───────────┬───────────┘     └───────────────────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │     Celery Flower     │
                                     │  (Port 5555 / Monitor)│
                                     └───────────────────────┘
```

---

## 🚀 Quick Start: Full Stack with Docker (One Command)

The easiest way to run the entire system (Frontend + Backend + PostgreSQL + Redis + Worker + Flower) is using Docker Compose from the project root:

```bash
# 1. Clone or navigate to the project root
cd /Users/parthkukadiya/work/IELTS

# 2. Build and start all 6 services
docker compose up --build
```

### 🌐 Running Services:

| Service | URL | Default Credentials / Note |
|---|---|---|
| 🖥️ **Frontend Portal** | [http://localhost:3000](http://localhost:3000) | Next.js 14 Student & Admin Web App |
| 🚀 **Backend API** | [http://localhost:8000](http://localhost:8000) | FastAPI REST Application |
| 📖 **API Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive API exploration |
| 📑 **API Docs (ReDoc)** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | Alternative OpenAPI documentation |
| 🌸 **Celery Flower** | [http://localhost:5555](http://localhost:5555) | Async task & worker monitoring |
| 🗄️ **PostgreSQL Database**| `localhost:5432` | `user: ielts_user`, `password: ielts_password`, `db: ielts_db` |
| ⚡ **Redis Cache & Broker**| `localhost:6379` | Broker & rate limiter backend |

---

## 💻 Local Development Setup (Running Directly on Host)

If you prefer running services locally on your machine for development:

### 1. Start Infrastructure (PostgreSQL & Redis)

#### Option A: Using Docker for DB & Redis only (Easiest)
```bash
cd backend
docker compose up -d postgres redis
```

#### Option B: Using Native Services (macOS with Homebrew)
```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis

# Create database & user
psql -U postgres -c "CREATE USER ielts_user WITH PASSWORD 'ielts_password';"
psql -U postgres -c "CREATE DATABASE ielts_db OWNER ielts_user;"
```

---

### 2. Start the Backend API & Worker

Open a terminal window for the backend:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment (first time only)
python3 -m venv .venv

# 3. Activate virtual environment
source .venv/bin/activate

# 4. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 5. Verify/create .env file
cp .env.example .env

# 6. Run FastAPI development server with hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open a second terminal window for the Celery AI Worker:

```bash
cd backend
source .venv/bin/activate
celery -A app.tasks.celery_app.celery_app worker --loglevel=info -Q default,ai_evaluation
```

---

### 3. Start the Next.js Frontend Portal

Open a third terminal window for the frontend:

```bash
# 1. Navigate to frontend directory
cd ielts-portal

# 2. Install dependencies (first time only)
npm install --legacy-peer-deps

# 3. Verify .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

# 4. Start Next.js development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## 📋 Comprehensive Command Cheat Sheet

### 🐳 Docker Commands

```bash
# ── From Project Root ──────────────────────────────────────────────
# Start all services (frontend + backend + worker + db + redis + flower)
docker compose up --build

# Start all services in background (detached)
docker compose up -d --build

# View live logs of all services
docker compose logs -f

# View live logs of a specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f worker

# Stop all services
docker compose down

# Stop and wipe database volumes (clean reset)
docker compose down -v

# ── From backend/ Directory ────────────────────────────────────────
# Run backend stack only (API + Worker + DB + Redis + Flower)
cd backend
docker compose up --build
```

---

### 🐍 Backend Commands (Local)

```bash
cd backend

# Activate virtualenv
source .venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run API with auto-reload
uvicorn app.main:app --reload --port 8000

# Run Celery Worker
celery -A app.tasks.celery_app.celery_app worker --loglevel=info -Q default,ai_evaluation

# Run Celery Flower dashboard
celery -A app.tasks.celery_app.celery_app flower --port=5555

# Run database migrations with Alembic
alembic upgrade head

# Create a new migration revision
alembic revision --autogenerate -m "add_new_feature"
```

---

### ⚛️ Frontend Commands (Local)

```bash
cd ielts-portal

# Install dependencies
npm install --legacy-peer-deps

# Start Next.js development server (Port 3000)
npm run dev

# Run TypeScript type checker
npx tsc --noEmit

# Run production build
npm run build

# Start production build server
npm start
```

---

## 📁 Repository Structure

```
.
├── docker-compose.yml              # Root full-stack Docker Compose file
├── README.md                       # This file
│
├── backend/                        # FastAPI Backend Service
│   ├── app/                        # Application source code
│   │   ├── api/v1/                 # 12 REST API modules (50+ endpoints)
│   │   ├── core/                   # Security, exceptions, dependencies, config
│   │   ├── db/models/              # 22 SQLAlchemy database models
│   │   ├── schemas/                # Pydantic request/response validation
│   │   ├── services/               # Evaluation, scoring, progress, S3, email
│   │   ├── tasks/                  # Celery worker & AI background tasks
│   │   ├── utils/                  # 14 IELTS Question Matchers & helpers
│   │   └── main.py                 # FastAPI application entrypoint
│   ├── alembic/                    # Database migrations
│   ├── docker/                     # Dockerfiles & compose files
│   ├── docker-compose.yml          # Backend-specific compose file
│   ├── requirements.txt            # Python requirements
│   ├── pyproject.toml              # Build & lint configuration
│   ├── .env.example                # Backend environment template
│   └── README.md                   # Detailed backend documentation
│
└── ielts-portal/                   # Next.js 14 Frontend Portal
    ├── src/
    │   ├── app/                    # Next.js App Router (21 routes)
    │   │   ├── auth/               # Login & Register with Zod validation
    │   │   ├── candidate/          # Dashboard, Exams, Progress, Writing, Speaking
    │   │   ├── exam/               # Authentic IELTS timed exam simulator
    │   │   └── exam-library/       # Public test catalog
    │   ├── components/             # Reusable UI components & toast system
    │   ├── lib/                    # Typed API client, Zustand stores, Providers
    │   └── data/                   # Fallback mock data
    ├── Dockerfile                  # Production container image
    ├── .env.local                  # Frontend environment configuration
    ├── package.json                # Dependencies and npm scripts
    └── README.md                   # Detailed frontend documentation
```

---

## 💡 Key Features Implemented

1. **Authentic Exam Simulator**:
   - Timed sections for Listening, Reading, Writing, and Speaking.
   - Side-by-side reading passage viewer with paragraph annotation.
   - Listening audio player with single-play rules.
   - Dynamic Question Evaluator supporting **14 IELTS Question Types**.

2. **Writing AI Assistant**:
   - Academic Task 1 (graphs/charts), General Task 1 (letters), and Task 2 essays.
   - Live word counter with minimum threshold enforcement.
   - Automated 3-second debounced draft saving.
   - Asynchronous AI evaluation based on official IDP 4-criteria rubric.

3. **Speaking AI Simulator**:
   - Full 3-part exam flow with 1-minute cue card preparation countdown timer.
   - Native browser `MediaRecorder` audio capture and playback.
   - AI speech analysis evaluating Fluency, Lexical Resource, Grammar, and Pronunciation.

4. **Progress & Weak-Area Analytics**:
   - Estimated band history across all 4 skills.
   - Question-type accuracy breakdown highlighting specific areas for improvement.
   - Daily study streak and hours logged tracker.

5. **Security & Session Management**:
   - Secure RS256/HS256 JWT tokens with SHA-256 hashed refresh tokens.
   - Frontend auto-refresh interceptor with queue replay on `401 Unauthorized`.
   - Complete server-side answer evaluation (answer keys are never transmitted to the client).

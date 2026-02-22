# Smart Insurance Recommender

An AI-powered insurance bundle recommendation platform built for the DataQuest Hackathon. Predicts optimal insurance bundles for customers based on demographics, financial data, and risk profile.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Docker Compose                            │
│                                                                  │
│   ┌──────────┐     ┌──────────┐     ┌──────────────┐            │
│   │ frontend │────▶│ backend  │────▶│  python-api  │            │
│   │ :3000    │     │ :4000    │     │  :8000       │            │
│   └──────────┘     └────┬─────┘     └──────┬───────┘            │
│                         │                  │                     │
│                         ▼                  ▼                     │
│                    ┌──────────┐      ┌──────────┐               │
│                    │   n8n    │──────│ postgres  │               │
│                    │  :5678   │      │  :5432    │               │
│                    └──────────┘      └──────────┘               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

| Service        | Tech                   | Port | Purpose                                        |
| -------------- | ---------------------- | ---- | ---------------------------------------------- |
| **frontend**   | React 18 + Vite 5      | 3000 | Dashboard, customer intake, leads, predictions |
| **backend**    | Express 4 (ES modules) | 4000 | REST API, DB access, service gateway           |
| **python-api** | FastAPI + Uvicorn      | 8000 | ML prediction engine & compute endpoints       |
| **n8n**        | n8n (official img)     | 5678 | Workflow automation & webhooks                 |
| **postgres**   | PostgreSQL 16          | 5432 | Shared relational database                     |

---

## Features

- **Bundle Prediction** — Enter customer demographics, financial info, and risk tolerance to receive AI-ranked insurance bundle recommendations with confidence scores
- **Lead Management** — Save predictions as leads, track status (New / Contacted / Closed Won / Closed Lost), apply manual overrides
- **Dashboard** — Real-time stats, bundle distribution charts (Recharts), confidence histograms, recent activity feed
- **Predictions Log** — Full audit trail with CSV export
- **n8n Automations** — Visual workflow automation (notifications, CRM sync, reports) with webhook triggers
- **Mock Mode** — Toggle offline demo mode from Settings — all pages work without a running backend
- **Health Monitoring** — Service status checks for backend + Python API from the Settings page

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose V2
- [Node.js 20+](https://nodejs.org/) & [pnpm](https://pnpm.io/installation) (for local dev mode)

### Option A — Full Docker (everything in containers)

```bash
cp .env.example .env
docker compose up --build
```

### Option B — Local dev (frontend + backend local, infra in Docker)

```bash
cp .env.example .env
pnpm install                  # install frontend + backend deps
pnpm dev                      # starts Docker infra + frontend (Vite HMR) + backend (node --watch)
```

Wait ~30 s for health checks, then open:

| URL                          | What                |
| ---------------------------- | ------------------- |
| http://localhost:3000        | Frontend            |
| http://localhost:4000/health | Backend health      |
| http://localhost:8000/health | Python API health   |
| http://localhost:5678        | n8n workflow editor |

### First run — n8n setup

1. Workflows from `n8n/workflows/` are automatically imported on startup
2. Open http://localhost:5678 and create your owner account
3. The background activation script detects the new owner and activates all workflows — webhooks go live within seconds

---

## pnpm Scripts

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `pnpm dev`          | Docker infra + frontend + backend locally (parallel) |
| `pnpm dev:local`    | Frontend + backend only (infra must be running)      |
| `pnpm dev:frontend` | Vite dev server only                                 |
| `pnpm dev:backend`  | Express backend with `--watch` only                  |
| `pnpm docker:up`    | Full Docker mode (all 5 services)                    |
| `pnpm docker:down`  | Stop all Docker services                             |
| `pnpm docker:nuke`  | Stop + destroy volumes                               |

---

## Project Structure

```
hackathon-platform/
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/
│       ├── ci.yml                # Lint + build on every PR / push
│       └── docker-build.yml      # Docker image builds on main
├── docker-compose.yml            # Full Docker (all 5 services)
├── package.json                  # Root pnpm workspace scripts
├── pnpm-workspace.yaml
├── .env.example
├── n8n/
│   ├── entrypoint.sh
│   ├── setup-workflows.mjs
│   └── workflows/
│       └── simple-automation.json
└── services/
    ├── backend/
    │   ├── Dockerfile
    │   ├── package.json
    │   └── src/index.js
    ├── frontend/
    │   ├── Dockerfile
    │   ├── package.json
    │   ├── vite.config.js         # Dev proxy → backend :4000
    │   └── src/
    │       ├── main.jsx           # Entry point (React + BrowserRouter)
    │       ├── App.jsx            # Route definitions
    │       ├── App.css            # Dark-theme design system
    │       ├── components/        # Badge, Card, EmptyState, Loader, Modal, Sidebar, StatCard, TopBar
    │       ├── lib/
    │       │   ├── api.js         # Centralized API client with mock-mode fallback
    │       │   └── bundles.js     # Bundle name/color mappings (10 insurance bundles)
    │       └── pages/
    │           ├── Dashboard.jsx
    │           ├── NewCustomer.jsx
    │           ├── Leads.jsx
    │           ├── PredictionsLog.jsx
    │           ├── Automations.jsx
    │           └── Settings.jsx
    └── python-api/
        ├── Dockerfile
        ├── pyproject.toml
        └── src/main.py
```

---

## Frontend Pages

| Route           | Page            | Description                                                |
| --------------- | --------------- | ---------------------------------------------------------- |
| `/`             | Dashboard       | Stats cards, bundle/confidence charts, recent activity     |
| `/new-customer` | New Customer    | Customer intake form → prediction API → bundle ranking     |
| `/leads`        | Leads           | Search/filter leads, change status, apply bundle overrides |
| `/predictions`  | Predictions Log | Full prediction history table with CSV export              |
| `/automations`  | Automations     | Trigger n8n workflows, view run history, link to editor    |
| `/settings`     | Settings        | Mock mode toggle, service health checks, about info        |

---

## API Endpoints

### Backend (Express — port 4000)

| Method | Path               | Description                    |
| ------ | ------------------ | ------------------------------ |
| GET    | `/health`          | Liveness probe                 |
| GET    | `/api/hello`       | Latest message from Postgres   |
| POST   | `/api/messages`    | Create a message               |
| GET    | `/api/trigger-n8n` | Trigger n8n Simple Automation  |
| GET    | `/api/compute`     | Proxy to Python API `/compute` |

### Python API (FastAPI — port 8000)

| Method | Path            | Description                          |
| ------ | --------------- | ------------------------------------ |
| GET    | `/health`       | Liveness probe                       |
| GET    | `/compute?n=42` | Factorial + sqrt, stored in Postgres |
| GET    | `/computations` | List recent computation results      |

---

## Environment Variables

All env vars are defined in `.env.example`. Copy to `.env` and customize.

| Variable              | Service    | Description                     |
| --------------------- | ---------- | ------------------------------- |
| `POSTGRES_USER`       | postgres   | DB username                     |
| `POSTGRES_PASSWORD`   | postgres   | DB password                     |
| `POSTGRES_DB`         | postgres   | DB name                         |
| `DATABASE_URL`        | backend    | Full Postgres connection string |
| `PYTHON_DATABASE_URL` | python-api | Full Postgres connection string |
| `VITE_BACKEND_URL`    | frontend   | Backend URL baked at build time |
| `N8N_ENCRYPTION_KEY`  | n8n        | Credential encryption key       |

> **Frontend vars** must start with `VITE_` and are baked at Docker build time.

---

## Networking

| From       | To         | Docker URL                        | Local dev URL                 |
| ---------- | ---------- | --------------------------------- | ----------------------------- |
| frontend   | backend    | `http://localhost:4000` (browser) | Vite proxy → `localhost:4000` |
| backend    | postgres   | `postgres:5432`                   | `localhost:5432`              |
| backend    | n8n        | `http://n8n:5678/webhook/hello`   | `http://localhost:5678`       |
| backend    | python-api | `http://python-api:8000`          | `http://localhost:8000`       |
| python-api | postgres   | `postgres:5432`                   | `localhost:5432`              |

---

## CI/CD & MLOps

GitHub Actions workflows live in `.github/workflows/`:

| Workflow             | Trigger             | What it does                                               |
| -------------------- | ------------------- | ---------------------------------------------------------- |
| **ci.yml**           | Push / PR to `main` | Install deps, lint, build frontend + backend, Python check |
| **docker-build.yml** | Push to `main`      | Build all three Docker images, verify they start           |
| **mlops.yml**        | Push to `main`      | Trains, validates, and deploys the ML model artifact       |

### MLOps Pipeline

The project includes a lightweight MLOps pipeline located in `services/python-api/mlops/`. It automates the model lifecycle without interfering with the main application structure.

1.  **Training (`train_pipeline.py`)**: Generates synthetic data, trains a RandomForest model, and saves it as `model_v2.joblib`.
2.  **Validation (`test_pipeline.py`)**: Loads the new model, checks for required metadata, and verifies inference on mock data.
3.  **Deployment (`deploy_model.py`)**: Backs up the existing production model (`src/model.joblib`) and replaces it with the validated `model_v2.joblib`.

To run locally:

```bash
cd services/python-api/mlops
python train_pipeline.py   # Creates model_v2.joblib
python test_pipeline.py    # Validates model_v2.joblib
python deploy_model.py     # Deploys to ../src/model.joblib
```

---

## Troubleshooting

| Problem                 | Fix                                                               |
| ----------------------- | ----------------------------------------------------------------- |
| n8n webhook returns 404 | Sign up at http://localhost:5678 first — workflows activate after |
| Frontend shows "Error"  | Wait 30 s for backend; check `docker compose logs backend`        |
| Port conflict           | Change host ports in `.env`                                       |
| DB issues               | `docker compose down -v && docker compose up --build`             |
| pnpm install fails      | Ensure pnpm is installed: `npm i -g pnpm`                         |

---

## Tech Stack

| Layer      | Technology                                |
| ---------- | ----------------------------------------- |
| Frontend   | React 18, Vite 5, Recharts, React Router  |
| Backend    | Node.js 20, Express 4, pg (ES modules)    |
| ML / API   | Python 3.12, FastAPI, SQLAlchemy, Uvicorn |
| Automation | n8n (workflow engine)                     |
| Database   | PostgreSQL 16                             |
| Infra      | Docker Compose, GitHub Actions CI/CD      |

---

## License

MIT

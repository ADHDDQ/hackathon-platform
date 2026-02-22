# Smart Insurance Recommender

An AI-powered insurance bundle recommendation platform built for the DataQuest Hackathon. Predicts optimal insurance bundles for customers based on demographics, financial data, and risk profile.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Docker Compose                            │
│                                                                  │
│   ┌──────────┐     ┌──────────┐     ┌──────────────┐             │
│   │ frontend │────▶│ backend  │────▶│  python-api  │             │
│   │ :3000    │     │ :4000    │     │  :8000       │             │
│   └──────────┘     └────┬─────┘     └──────┬───────┘             │
│                         │                  │                     │
│                         ▼                  ▼                     │
│                    ┌──────────┐      ┌──────────┐                │
│                    │   n8n    │──────│ Supabase  │               │
│                    │  :5678   │      │  :5432    │               │
│                    └──────────┘      └──────────┘                │
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
        ├── src/main.py
        └── mlops/
            ├── train_pipeline.py
            ├── test_pipeline.py
            ├── deploy_model.py
            ├── benchmark_explainability.py
            └── tests/
                └── test_explainability.py
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

## Model Explainability

The explainability toolkit lives in `services/python-api/src/explainability.py` and is designed to stay optional and modular. It supports global and local explanations, feature importance rankings, SHAP visualizations, and lightweight benchmarks.

### Installation (optional dependencies)

These libraries are not required for the core API, but are needed for full explainability support:

```bash
pip install shap lime interpret matplotlib
```

### Explainability APIs

```python
from explainability import (
    get_feature_importance,
    get_permutation_importance,
    get_shap_values,
    get_local_shap_values,
    plot_shap_summary,
    plot_feature_importance,
    plot_dependence,
    benchmark_explainability,
    save_benchmark,
)
```

### Global explanations

```python
artifact = joblib.load("services/python-api/src/model.joblib")
model = artifact["model"]
feature_names = artifact["feature_columns"]

importance = get_feature_importance(model, feature_names, top_k=10)
```

### Local explanations (SHAP)

```python
shap_payload = get_shap_values(model, X, feature_names)
local_payload = get_local_shap_values(model, X[:1], feature_names)
```

### Visualization examples

```python
plot_shap_summary(shap_payload, "shap_summary.png")
plot_feature_importance(importance, "feature_importance.png")
plot_dependence(shap_payload, "Broker_Count", "dependence_broker_count.png")
```

Generate SHAP plots with the helper script:

```bash
cd services/python-api/mlops
python generate_shap_plots.py
```

If the production model requires unavailable dependencies (e.g., `xgboost`), the script falls back to a lightweight demo model and still generates SHAP plots.

### Permutation importance

```python
perm = get_permutation_importance(model, X, y, feature_names)
```

### Performance benchmarks

```bash
cd services/python-api/mlops
python benchmark_explainability.py
```

Outputs `explainability_benchmark.json` with timing and SHAP availability.

### When to use each method

- Feature importance: fast global ranking, useful for model overview and drift checks.
- Permutation importance: more faithful than native importances but slower on large datasets.
- SHAP global summary: best for feature impact distribution and interaction insights.
- SHAP local explanations: best for user-facing decisions and single prediction audits.
- Dependence plots: use to inspect feature interactions and non-linear effects.
- LIME: fast local approximations when SHAP is too slow or unavailable.
- Interpret (EBM): use for inherently interpretable models if training new models.

### Computational requirements

- Feature importance: milliseconds for tree models.
- Permutation importance: scales with feature count and `n_repeats`.
- SHAP: can be expensive on large datasets, recommend sampling for production use.
- Visualization: requires matplotlib and can be slow on very large SHAP arrays.
- LIME: per-sample cost grows with `num_samples` in the explainer.
- Interpret: EBM training is slower than linear models but yields native explanations.

### Troubleshooting

- `shap` import errors: confirm Python version compatibility and reinstall with `pip install shap`.
- Slow SHAP runs: reduce `max_samples` in `get_shap_values` or use a smaller background set.
- Memory issues: sample input data and avoid full dataset SHAP in production.
- Plotting errors: ensure `matplotlib` is installed and writable output paths exist.
- LIME shape errors: ensure the explainer uses the same feature order as the model.
- Interpret import errors: confirm `interpret` version supports Python 3.11+.

### Best practices

- Use SHAP on a representative sample instead of full datasets.
- Keep a stable feature order and store it with model artifacts.
- Log explanation runtimes to monitor latency drift.
- Use global explainability for monitoring and local explainability for audits.

### Tests

Run explainability unit tests locally:

```bash
python -m unittest discover -s services/python-api/mlops/tests
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

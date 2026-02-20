# Hackathon Platform — Monorepo

A Docker-first monorepo with five interconnected services. Supports both **full Docker** mode and **local dev** mode (pnpm + Docker for infra).

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

| Service        | Tech               | Port | Purpose                              |
| -------------- | ------------------ | ---- | ------------------------------------ |
| **frontend**   | React + Vite       | 3000 | User-facing SPA                      |
| **backend**    | Express (Node.js)  | 4000 | REST API, DB access, service gateway |
| **python-api** | FastAPI + Uvicorn  | 8000 | Compute endpoints                    |
| **n8n**        | n8n (official img) | 5678 | Workflow automation & webhooks       |
| **postgres**   | PostgreSQL 16      | 5432 | Shared relational database           |

---

## Quick Start

### Option A — Full Docker (everything in containers)

```bash
cp .env.example .env
docker compose up --build
```

### Option B — Local dev (frontend + backend local, infra in Docker)

```bash
cp .env.example .env
pnpm install                  # install frontend + backend deps
pnpm dev:infra                # starts postgres, n8n, python-api in Docker
pnpm dev                      # starts frontend (Vite HMR) + backend (node --watch)
```

Or all at once:

```bash
pnpm dev:all                  # starts Docker infra in background, then local dev
```

Wait ~30s for health checks, then open:

| URL                          | What                |
| ---------------------------- | ------------------- |
| http://localhost:3000        | Frontend (Vite dev) |
| http://localhost:4000/health | Backend health      |
| http://localhost:8000/health | Python API health   |
| http://localhost:5678        | n8n editor          |

### First run — n8n owner setup

The activation script (`n8n/activate-workflows.mjs`) automatically:

- Creates an owner account (`admin@hackathon.local` / `Hackathon123!`)
- Activates all imported workflows

---

## pnpm Scripts

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `pnpm dev`          | Starts frontend + backend locally (parallel)   |
| `pnpm dev:frontend` | Starts only the Vite dev server                |
| `pnpm dev:backend`  | Starts only the Express backend with `--watch` |
| `pnpm dev:infra`    | Docker Compose for postgres, n8n, python-api   |
| `pnpm dev:all`      | Starts infra (background) then local dev       |
| `pnpm docker:up`    | Full Docker mode (all 5 services)              |
| `pnpm docker:down`  | Stop all Docker services                       |
| `pnpm docker:nuke`  | Stop + destroy volumes                         |

---

## How Services Connect

| Caller     | Callee     | Local dev URL                         | Full Docker URL                       |
| ---------- | ---------- | ------------------------------------- | ------------------------------------- |
| frontend   | backend    | Vite proxy → `localhost:4000`         | `http://localhost:4000` (via browser) |
| backend    | postgres   | `localhost:5432`                      | `postgres:5432`                       |
| backend    | n8n        | `http://localhost:5678/webhook/hello` | `http://n8n:5678/webhook/hello`       |
| backend    | python-api | `http://localhost:8000/compute`       | `http://python-api:8000/compute`      |
| python-api | postgres   | `localhost:5432`                      | `postgres:5432`                       |
| n8n        | backend    | `http://host.docker.internal:4000`    | `http://backend:4000/api/hello`       |
| n8n        | python-api | `http://python-api:8000/compute`      | `http://python-api:8000/compute`      |

> In local dev mode, the frontend uses Vite's built-in proxy (configured in `vite.config.js`) to forward `/api/*` and `/health` to the backend on port 4000. The backend reads `DATABASE_URL` from `services/backend/.env` which points to `localhost:5432`.

---

## Environment Variables

| File                    | Purpose                              |
| ----------------------- | ------------------------------------ |
| `.env.example`          | Template — committed to Git          |
| `.env`                  | Runtime values for Docker Compose    |
| `services/backend/.env` | Backend local dev (localhost DB URL) |

When adding a variable:

1. Add to `.env.example` with a safe default
2. Add to `.env` with real value
3. Reference in `docker-compose.yml` under `environment:`
4. For local backend dev, also add to `services/backend/.env` (with `localhost` instead of Docker service name)
5. Frontend vars must start with `VITE_` (baked at build time in Docker, live in Vite dev)

---

## Common Commands

```bash
# -- Local dev mode --
pnpm install                   # first time only
pnpm dev:infra                 # start Docker infra
pnpm dev                       # start frontend + backend locally

# -- Full Docker mode --
docker compose up --build      # all 5 services
docker compose up --build -d   # detached
docker compose logs -f backend # follow logs

# -- Maintenance --
docker compose build --no-cache                        # clean rebuild
docker compose down                                    # stop
docker compose down -v                                 # stop + nuke data
docker compose -f docker-compose.dev.yml down          # stop dev infra
```

---

## Project Structure

```
hackathon-platform/
├── package.json                  # Root pnpm workspace scripts
├── pnpm-workspace.yaml           # Defines workspace packages
├── docker-compose.yml            # Full Docker (all 5 services)
├── docker-compose.dev.yml        # Dev infra only (postgres, n8n, python-api)
├── .env.example
├── .env
├── .gitignore
├── .github/
│   └── copilot-instructions.md
├── README.md
├── n8n/
│   ├── entrypoint.sh
│   ├── activate-workflows.mjs
│   └── workflows/
│       └── simple-automation.json
└── services/
    ├── backend/
    │   ├── .env                  # Local dev env (localhost DB)
    │   ├── Dockerfile
    │   ├── package.json
    │   └── src/index.js
    ├── frontend/
    │   ├── Dockerfile
    │   ├── package.json
    │   ├── index.html
    │   ├── vite.config.js        # Dev proxy config
    │   └── src/
    │       ├── main.jsx
    │       ├── App.jsx
    │       ├── App.css
    │       └── index.css
    └── python-api/
        ├── Dockerfile
        ├── pyproject.toml
        └── src/
            ├── __init__.py
            └── main.py
```

---

## Backend Endpoints

| Method | Path               | Description                         |
| ------ | ------------------ | ----------------------------------- |
| GET    | `/health`          | Liveness probe                      |
| GET    | `/api/hello`       | Read latest message from Postgres   |
| POST   | `/api/messages`    | Create a message                    |
| GET    | `/api/trigger-n8n` | Call n8n Simple Automation workflow |
| GET    | `/api/compute`     | Proxy to Python API `/compute`      |

## Python API Endpoints

| Method | Path            | Description                          |
| ------ | --------------- | ------------------------------------ |
| GET    | `/health`       | Liveness probe                       |
| GET    | `/compute?n=42` | Factorial + sqrt, stored in Postgres |
| GET    | `/computations` | List recent computation results      |

---

## Adding a New Service

1. Create `services/my-service/` with a Dockerfile and source code
2. Add to `docker-compose.yml` (and `docker-compose.dev.yml` if it should run in Docker during local dev)
3. If it's a Node.js service, add to `pnpm-workspace.yaml`
4. Update `.env.example` with any new env vars
5. Reference from other services by Docker name or localhost

---

## Adding an n8n Workflow

1. Create or export a workflow JSON in `n8n/workflows/`
2. Restart: `docker compose restart n8n` (or `-f docker-compose.dev.yml`)
3. The entrypoint auto-imports and the activation script activates them

---

## Troubleshooting

| Problem                      | Fix                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| n8n webhook returns 404      | Workflow not activated. Check `docker compose logs n8n`. Try `docker compose down -v` for fresh start. |
| Frontend shows "Error"       | Backend may not be ready — wait 30s, refresh. Check `docker compose logs backend`.                     |
| Port conflict                | Change host ports in `.env` and update `VITE_BACKEND_URL`.                                             |
| DB issues                    | `docker compose down -v && docker compose up --build`                                                  |
| Backend can't reach postgres | Ensure `pnpm dev:infra` is running and `services/backend/.env` has `localhost:5432`                    |
| pnpm install fails           | Ensure pnpm is installed: `npm i -g pnpm`                                                              |

---

## License

MIT

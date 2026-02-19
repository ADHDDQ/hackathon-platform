# 🚀 Hackathon Platform – Monorepo

A **production-structured**, Docker-first monorepo containing five interconnected services designed for rapid hackathon development. Every service runs with a single command and communicates over a shared Docker network.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Service Descriptions](#service-descriptions)
3. [How Services Connect](#how-services-connect)
4. [Docker Networking Explained](#docker-networking-explained)
5. [Quick Start](#quick-start)
6. [Rebuilding Services](#rebuilding-services)
7. [Adding a New Service](#adding-a-new-service)
8. [Adding a New n8n Workflow](#adding-a-new-n8n-workflow)
9. [Managing Environment Variables](#managing-environment-variables)
10. [Extending the Database Schema](#extending-the-database-schema)
11. [Dev Mode vs Production Mode](#dev-mode-vs-production-mode)
12. [Port Reference](#port-reference)
13. [Project Structure](#project-structure)
14. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

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

| Service        | Tech Stack         | Purpose                              |
| -------------- | ------------------ | ------------------------------------ |
| **frontend**   | React + Vite       | User-facing SPA                      |
| **backend**    | Express (Node.js)  | REST API, DB access, service gateway |
| **python-api** | FastAPI + Uvicorn  | Compute-heavy / ML endpoints         |
| **n8n**        | n8n (official img) | Workflow automation & webhooks       |
| **postgres**   | PostgreSQL 16      | Shared relational database           |

---

## Service Descriptions

### Postgres

- Official `postgres:16-alpine` image.
- Persisted to a Docker named volume (`pgdata`).
- Shared by backend, python-api, and n8n.
- Health-checked with `pg_isready`.

### n8n

- Official `n8nio/n8n` image with a custom `entrypoint.sh`.
- Uses Postgres as its internal metadata store.
- On startup, waits for readiness, then auto-imports every `.json` workflow in `n8n/workflows/`.
- Ships with a **Simple Automation** workflow that: webhook trigger → calls backend `/api/hello` → calls python-api `/compute` → combines and returns the result.

### Express Backend

- Exposes REST endpoints:
  - `GET /health` – liveness probe
  - `GET /api/hello` – read the latest message from Postgres
  - `POST /api/messages` – create a message
  - `GET /api/trigger-n8n` – call n8n's webhook (demonstrates backend → n8n)
  - `GET /api/compute` – proxy to the Python API

### React Frontend

- Vite-based SPA.
- Calls `backend /api/hello` and `/health` to render data.
- Clean dark-themed layout with service map.
- `VITE_BACKEND_URL` is baked in at build time.

### Python FastAPI

- Endpoints:
  - `GET /health` – liveness probe
  - `GET /compute?n=42` – demo factorial + sqrt computation, persisted to Postgres
  - `GET /computations` – list recent computation results

---

## How Services Connect

| Caller     | Callee     | URL (inside Docker)                   |
| ---------- | ---------- | ------------------------------------- |
| frontend   | backend    | `http://localhost:4000` (via browser) |
| backend    | postgres   | `postgresql://...@postgres:5432/...`  |
| backend    | n8n        | `http://n8n:5678/webhook/hello`       |
| backend    | python-api | `http://python-api:8000/compute`      |
| python-api | postgres   | `postgresql://...@postgres:5432/...`  |
| n8n        | backend    | `http://backend:4000/api/hello`       |
| n8n        | python-api | `http://python-api:8000/compute`      |
| n8n        | postgres   | `postgres:5432` (internal metadata)   |

> **Key insight:** The frontend runs in the user's **browser**, so it calls `localhost:4000` (host-mapped port). All other services run inside Docker and use **service names** as hostnames.

---

## Docker Networking Explained

Docker Compose creates a default bridge network for all services defined in the same `docker-compose.yml`. This means:

1. **Service discovery by name** – Each service can reach any other service using its service name as the hostname (e.g., `http://backend:4000`, `http://postgres:5432`).
2. **DNS resolution** – Docker's embedded DNS server resolves service names to the container's internal IP address.
3. **Port mapping** – The `ports:` directive maps container ports to host ports for external access (your browser). Inside the network, containers communicate on the container port directly.
4. **Isolation** – Services are isolated from the host network by default. Only explicitly mapped ports are accessible from the host.

```
Host machine                          Docker network (bridge)
─────────────                         ──────────────────────
localhost:3000  ←→  frontend:3000     frontend  ──→  backend:4000
localhost:4000  ←→  backend:4000      backend   ──→  postgres:5432
localhost:5432  ←→  postgres:5432     n8n       ──→  backend:4000
localhost:5678  ←→  n8n:5678          python-api──→  postgres:5432
localhost:8000  ←→  python-api:8000
```

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24.x
- [Docker Compose](https://docs.docker.com/compose/install/) ≥ 2.20 (bundled with Docker Desktop)

### Steps

```bash
# 1. Clone the repository
git clone <repo-url> && cd hackathon-platform

# 2. Copy environment variables
cp .env.example .env

# 3. Build and start all services
docker compose up --build
```

Wait for all health checks to pass (usually 30–60 seconds), then open:

| Service     | URL                             |
| ----------- | ------------------------------- |
| Frontend    | http://localhost:3000           |
| Backend API | http://localhost:4000/api/hello |
| Python API  | http://localhost:8000/health    |
| n8n Editor  | http://localhost:5678           |

To stop everything:

```bash
docker compose down
```

To stop and **remove volumes** (destroys data):

```bash
docker compose down -v
```

---

## Rebuilding Services

```bash
# Rebuild everything
docker compose up --build

# Rebuild a single service
docker compose build backend
docker compose up backend

# Force a clean rebuild (no cache)
docker compose build --no-cache backend
docker compose up backend
```

---

## Adding a New Service

1. **Create the folder:**

   ```
   services/my-service/
     Dockerfile
     src/
     ...
   ```

2. **Add to `docker-compose.yml`:**

   ```yaml
   my-service:
     build:
       context: ./services/my-service
     ports:
       - '9000:9000'
     environment:
       DATABASE_URL: ${DATABASE_URL}
     depends_on:
       postgres:
         condition: service_healthy
   ```

3. **Update `.env.example`** with any new variables.

4. **Reference it by service name** from other containers:
   ```
   http://my-service:9000
   ```

---

## Adding a New n8n Workflow

1. Create a new `.json` file in `n8n/workflows/`:

   ```
   n8n/workflows/my-new-workflow.json
   ```

2. The easiest way to author a workflow is:
   - Open the n8n editor at `http://localhost:5678`
   - Build your workflow visually
   - Export it (Menu → Download workflow data)
   - Save the JSON to `n8n/workflows/`

3. Restart n8n to auto-import:
   ```bash
   docker compose restart n8n
   ```

> The `entrypoint.sh` imports all `.json` files from `/import/workflows` on every startup.

---

## Managing Environment Variables

| File           | Purpose                                        |
| -------------- | ---------------------------------------------- |
| `.env.example` | Template with all variables – committed to Git |
| `.env`         | Actual values used at runtime – **not in Git** |

**Rules:**

- Never commit `.env` (it's in `.gitignore`).
- When adding a new variable, add it to **both** `.env.example` (with a safe default) and `.env`.
- Vite frontend variables **must** start with `VITE_` to be exposed to the browser.
- Backend/Python variables are injected at runtime via `environment:` in `docker-compose.yml`.

---

## Extending the Database Schema

### Option A: Application-managed (current approach)

Both the backend and python-api create their own tables on startup using `CREATE TABLE IF NOT EXISTS`. To add a new table:

1. Add a migration query to the service's init function.
2. Restart the service.

### Option B: Dedicated migration tool

For more complex schemas, add a migration tool such as:

- **Node.js** – [Knex](https://knexjs.org/) or [Prisma](https://www.prisma.io/)
- **Python** – [Alembic](https://alembic.sqlalchemy.org/)

Create a dedicated `services/migrations/` service or run migrations as a one-shot container:

```yaml
migrations:
  build: ./services/migrations
  depends_on:
    postgres:
      condition: service_healthy
  command: ['npx', 'knex', 'migrate:latest']
  restart: 'no'
```

---

## Dev Mode vs Production Mode

| Aspect           | Dev Mode                                | Production Mode                    |
| ---------------- | --------------------------------------- | ---------------------------------- |
| **Frontend**     | `vite dev` with HMR                     | Static build served by `serve`     |
| **Backend**      | `node --watch` for auto-reload          | `node src/index.js`                |
| **Python API**   | `uvicorn --reload`                      | `uvicorn --workers 2`              |
| **n8n**          | Same in both                            | Same in both                       |
| **Postgres**     | Same in both                            | Add connection pooling (PgBouncer) |
| **Docker build** | Mount source as volumes for live reload | Multi-stage builds, minimal images |

### Running in dev mode

You can override the Compose file for development. Create a `docker-compose.override.yml`:

```yaml
services:
  backend:
    volumes:
      - ./services/backend/src:/app/src
    command: ['node', '--watch', 'src/index.js']

  python-api:
    volumes:
      - ./services/python-api/src:/app/src
    command:
      [
        'uvicorn',
        'src.main:app',
        '--host',
        '0.0.0.0',
        '--port',
        '8000',
        '--reload',
      ]
```

Then run `docker compose up` as usual – Compose merges both files automatically.

---

## Port Reference

| Service    | Container Port | Host Port |
| ---------- | -------------- | --------- |
| frontend   | 3000           | 3000      |
| backend    | 4000           | 4000      |
| python-api | 8000           | 8000      |
| n8n        | 5678           | 5678      |
| postgres   | 5432           | 5432      |

---

## Project Structure

```
hackathon-platform/
├── docker-compose.yml          # Orchestrates all services
├── .env.example                # Environment variable template
├── .gitignore
├── README.md
│
├── n8n/
│   ├── entrypoint.sh           # Custom startup: import workflows
│   └── workflows/
│       └── simple-automation.json  # Auto-imported n8n workflow
│
└── services/
    ├── backend/
    │   ├── Dockerfile
    │   ├── package.json
    │   └── src/
    │       └── index.js        # Express server + routes
    │
    ├── frontend/
    │   ├── Dockerfile
    │   ├── package.json
    │   ├── index.html
    │   ├── vite.config.js
    │   └── src/
    │       ├── main.jsx
    │       ├── App.jsx         # Main React component
    │       ├── App.css
    │       └── index.css
    │
    └── python-api/
        ├── Dockerfile
        ├── pyproject.toml
        └── src/
            ├── __init__.py
            └── main.py         # FastAPI app + routes
```

---

## Troubleshooting

| Problem                            | Solution                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `postgres` container won't start   | Check `POSTGRES_USER` / `POSTGRES_PASSWORD` in `.env`. Delete volume: `docker compose down -v` |
| n8n can't connect to postgres      | Ensure `DB_POSTGRESDB_HOST=postgres` and postgres health check is passing                      |
| Frontend shows "Error" on load     | Backend may not be ready yet – wait 30s and refresh. Check `docker compose logs backend`       |
| `ECONNREFUSED` from backend to n8n | n8n starts last – the backend retries are expected initially                                   |
| Port conflict                      | Change host-side ports in `.env` (e.g., `BACKEND_PORT=4001`) and update `VITE_BACKEND_URL`     |
| Need a fresh database              | `docker compose down -v && docker compose up --build`                                          |

---

## License

MIT – built for hackathons, feel free to use and extend.

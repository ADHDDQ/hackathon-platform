# Copilot / LLM Instructions for hackathon-platform

> This file tells AI coding assistants how this monorepo is structured and how to modify it safely.

---

## Repository Overview

This is a **Docker Compose monorepo** with a **pnpm workspace** for the Node.js services. It supports two modes:

1. **Full Docker**: `docker compose up --build` — runs all 5 services in containers
2. **Local dev**: `pnpm dev` — runs frontend (Vite HMR) + backend (node --watch) locally, with postgres/n8n/python-api in Docker via `docker-compose.dev.yml`

### Services at a glance

| Service    | Location               | Language    | Framework          | Port | In pnpm workspace? |
| ---------- | ---------------------- | ----------- | ------------------ | ---- | ------------------ |
| frontend   | `services/frontend/`   | JavaScript  | React 18 + Vite 5  | 3000 | Yes                |
| backend    | `services/backend/`    | JavaScript  | Express 4          | 4000 | Yes                |
| python-api | `services/python-api/` | Python 3.12 | FastAPI + Uvicorn  | 8000 | No                 |
| n8n        | `n8n/`                 | —           | n8n official image | 5678 | No                 |
| postgres   | (official image)       | —           | PostgreSQL 16      | 5432 | No                 |

### Key files at root

- `package.json` — root pnpm scripts (`pnpm dev`, `pnpm dev:infra`, etc.)
- `pnpm-workspace.yaml` — declares `services/frontend` and `services/backend` as workspace packages
- `docker-compose.yml` — full Docker mode (all 5 services)
- `docker-compose.dev.yml` — dev infra only (postgres, n8n, python-api)
- `.env` / `.env.example` — runtime environment variables
- `services/backend/.env` — backend local dev env (DATABASE_URL with `localhost`)
- `.gitignore` — ignores `.env`, `node_modules`, `__pycache__`, etc.

---

## Conventions

### Package management

- **Node.js services**: pnpm workspace with `package.json`. Use ES modules (`"type": "module"` in package.json, `import`/`export` syntax). The backend uses `dotenv` to load `services/backend/.env` for local dev.
- **Python services**: `pyproject.toml` with PEP 508 dependencies array (NOT dict/table format). Example: `dependencies = ["fastapi>=0.109,<1"]`.
- **pnpm workspace**: Defined in `pnpm-workspace.yaml`. Only Node.js services (frontend, backend) are workspace members. Run `pnpm install` from the repo root.

### Local dev mode

- `pnpm dev:infra` starts postgres, n8n, and python-api via `docker-compose.dev.yml`
- `pnpm dev` starts frontend (Vite with HMR on port 3000) and backend (node --watch on port 4000) in parallel
- `pnpm dev:all` does both in one command (infra backgrounded, then local dev)
- The frontend's `vite.config.js` proxies `/api/*` and `/health` to `localhost:4000` so no CORS issues in dev
- The backend reads `DATABASE_URL` from `services/backend/.env` (points to `localhost:5432`) when running locally. Inside Docker, the compose `environment:` section overrides this with the Docker service name.

### Docker

- No `version:` key in docker-compose.yml (removed — it's obsolete in Compose V2+).
- All services that need the database use `depends_on: postgres: condition: service_healthy`.
- Postgres health check: `pg_isready -U $$POSTGRES_USER`.
- Services communicate using Docker service names: `http://backend:4000`, `http://python-api:8000`, `http://n8n:5678`, `postgres:5432`.
- The frontend is built at image build time (Vite static build). `VITE_*` env vars must be passed as `ARG` in the Dockerfile and set _before_ `npm run build`.

### Environment variables

- All env vars live in `.env` (runtime) and `.env.example` (template).
- Docker Compose interpolates `${VAR}` from `.env` automatically.
- Frontend vars MUST start with `VITE_` to be exposed to the browser bundle.
- Backend/Python vars are injected at container runtime via `environment:` in compose.

### n8n

- Workflows are JSON files in `n8n/workflows/`. They must include `"active": true`.
- `n8n/entrypoint.sh` imports all workflow JSON files via `n8n import:workflow` CLI on container startup, then starts n8n, then launches the activation script.
- `n8n/setup-workflows.mjs` runs in the background — it waits for the user to create an owner account via the n8n UI (http://localhost:5678), then activates all imported workflows using the n8n CLI (`n8n update:workflow --all --active=true`). It does NOT create any accounts.
- n8n uses Postgres as its metadata store (configured via `DB_POSTGRESDB_*` env vars).
- Webhooks are registered only when a workflow is **active**. The activation script handles this automatically after owner signup.
- n8n telemetry is disabled (`N8N_DIAGNOSTICS_ENABLED: "false"`).
- On first run, the user must sign up at http://localhost:5678 before workflows become active.

---

## How to Add a New Service

### 1. Create the service directory

```
services/my-service/
├── Dockerfile
├── package.json          # or pyproject.toml for Python
└── src/
    └── index.js          # or main.py
```

### 2. Write the Dockerfile

For Node.js:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 9000
CMD ["node", "src/index.js"]
```

For Python:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir .
COPY . .
EXPOSE 9000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "9000"]
```

### 3. Add to docker-compose.yml

Add a new service block. Place it after existing services but before the `volumes:` section:

```yaml
my-service:
  build:
    context: ./services/my-service
  ports:
    - '${MY_SERVICE_PORT:-9000}:9000'
  environment:
    DATABASE_URL: ${DATABASE_URL}
  depends_on:
    postgres:
      condition: service_healthy
  restart: unless-stopped
```

### 4. Update environment files

Add any new variables to both `.env.example` and `.env`:

```
# ── My Service ──
MY_SERVICE_PORT=9000
```

### 5. Connect from other services

- From another container: `http://my-service:9000`
- From the frontend (browser): `http://localhost:9000` (add port mapping first)
- To call the new service from the backend, add a route in `services/backend/src/index.js`

---

## How to Add a Backend Endpoint

Edit `services/backend/src/index.js`:

```javascript
app.get('/api/my-endpoint', async (req, res) => {
	try {
		// your logic here
		res.json({ success: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: err.message });
	}
});
```

- All routes go **before** the `app.listen()` call.
- Use `import` (ES modules), not `require`.
- To call another service: `fetch("http://service-name:port/path")`.
- Rebuild: `docker compose build backend && docker compose up backend`.

---

## How to Add a Python API Endpoint

Edit `services/python-api/src/main.py`:

```python
@app.get("/my-endpoint")
def my_endpoint():
    return {"result": "ok"}
```

- The FastAPI app instance is called `app`.
- Database access uses SQLAlchemy with `engine` and raw SQL via `text()`.
- Add new pip dependencies to the `dependencies` array in `pyproject.toml` (PEP 508 format).

---

## How to Add a Frontend Page/Component

The frontend is a single-page React app in `services/frontend/src/`.

- Main component: `App.jsx`
- Styles: `App.css` (dark theme)
- Backend calls use `VITE_BACKEND_URL` (defaults to `http://localhost:4000`)

To add a section to the dashboard, add a state + fetch + JSX block in `App.jsx` following the existing pattern (useState + useEffect or button handler).

For routing, install `react-router-dom` and set up routes in `App.jsx`.

---

## How to Add an n8n Workflow

### Option A: Export from the n8n editor (recommended)

1. Open http://localhost:5678 and sign up / log in
2. Build the workflow visually
3. Menu → Download workflow data
4. Save the JSON to `n8n/workflows/my-workflow.json`
5. Ensure the JSON includes `"active": true` at the top level
6. `docker compose restart n8n` to re-import

### Option B: Write JSON manually

Create `n8n/workflows/my-workflow.json`. The structure must include:

- `name` — display name
- `nodes[]` — array of node objects with `type`, `position`, `parameters`
- `connections` — wiring between nodes
- `active: true`

Use the existing `simple-automation.json` as a template.

### Important n8n notes

- Workflows are imported via `n8n import:workflow` CLI on container startup
- The activation script (`setup-workflows.mjs`) waits for the user to sign up, then activates all imported workflows via `n8n update:workflow --all --active=true`
- No admin account is auto-created — the user must sign up on first visit to http://localhost:5678
- For webhook-triggered workflows, the webhook URL is `http://localhost:5678/webhook/<path>`
- Inside Docker, other services reach n8n at `http://n8n:5678/webhook/<path>`
- n8n credentials (API keys, etc.) cannot be pre-imported via JSON — they must be created in the n8n UI or via the REST API

---

## How to Add a Database Table

### From the backend (Node.js)

In `services/backend/src/index.js`, add to the `initDB()` function:

```javascript
await pool.query(`
  CREATE TABLE IF NOT EXISTS my_table (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`);
```

### From the Python API

In `services/python-api/src/main.py`, add to the `create_tables()` function:

```python
conn.execute(text("""
    CREATE TABLE IF NOT EXISTS my_table (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
"""))
```

Both services share the same Postgres database, so tables created by one are visible to the other.

---

## How to Modify docker-compose.yml

### Structure

```yaml
services:
  postgres: # starts first (has healthcheck)
  n8n: # depends on postgres
  backend: # depends on postgres
  python-api: # depends on postgres
  frontend: # depends on backend

volumes:
  pgdata: # named volume for postgres data
  n8ndata: # named volume for n8n data
```

### Rules

- Always use `depends_on` with `condition: service_healthy` for services needing postgres
- Use `restart: unless-stopped` for all long-running services
- Map ports as `"${HOST_PORT}:CONTAINER_PORT"` referencing `.env` variables
- Mount files with relative paths from the project root
- Environment variables use `${VAR}` syntax (interpolated from `.env`)

---

## Networking Quick Reference

| From             | To access   | Use                                       |
| ---------------- | ----------- | ----------------------------------------- |
| Any container    | postgres    | `postgres:5432`                           |
| Any container    | backend     | `http://backend:4000`                     |
| Any container    | python-api  | `http://python-api:8000`                  |
| Any container    | n8n         | `http://n8n:5678`                         |
| Browser/host     | any service | `http://localhost:<host-port>`            |
| Frontend JS code | backend     | `http://localhost:4000` (runs in browser) |

---

## Common Pitfalls

1. **pyproject.toml format**: Dependencies must be a PEP 508 array, not a TOML table:

   ```toml
   # CORRECT
   dependencies = ["fastapi>=0.109,<1", "uvicorn[standard]>=0.27,<1"]

   # WRONG — will fail pip install
   [project.dependencies]
   fastapi = ">=0.109,<1"
   ```

2. **Frontend env vars**: Must start with `VITE_` and are baked at build time. Changing them requires rebuilding the frontend image.

3. **n8n webhook 404**: Means the workflow isn't activated. Make sure you signed up at http://localhost:5678 first — the activation script runs after owner signup. Check `docker compose logs n8n` for activation script output. A fresh `docker compose down -v && docker compose up --build` usually fixes it.

4. **docker-compose.yml `version:` key**: Do NOT add a `version: "3.x"` key — it's obsolete and triggers warnings in Compose V2.

5. **Line endings**: If entrypoint scripts fail with `\r` errors on Linux, ensure `.sh` files use LF line endings (not CRLF). The `.gitattributes` or editor config should enforce this.

6. **ES modules in Node**: The backend uses `"type": "module"`. Use `import`/`export`, not `require()`/`module.exports`.

7. **n8n credentials**: Cannot be pre-seeded via JSON import. Any node requiring credentials (SMTP, OAuth, API keys) must have credentials created through the n8n UI or REST API at runtime.

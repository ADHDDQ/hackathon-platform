#!/bin/sh
# ──────────────────────────────────────────────────────────────
# n8n custom entrypoint
#
# This script:
#   1. Starts n8n in the background.
#   2. Waits until the n8n REST API is ready.
#   3. Imports every workflow JSON found in /import/workflows.
#   4. Activates the imported workflows.
#   5. Brings n8n back to the foreground so Docker can track the PID.
# ──────────────────────────────────────────────────────────────

set -e

echo "[entrypoint] Starting n8n in background..."
n8n start &
N8N_PID=$!

# ── Wait for n8n to be ready ─────────────────────────────────
echo "[entrypoint] Waiting for n8n to become ready..."
MAX_RETRIES=60
RETRY=0
until curl -sf http://localhost:5678/healthz > /dev/null 2>&1; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    echo "[entrypoint] n8n did not become ready in time – continuing anyway"
    break
  fi
  sleep 2
done
echo "[entrypoint] n8n is ready (after ~$((RETRY * 2))s)"

# ── Import workflows ─────────────────────────────────────────
IMPORT_DIR="/import/workflows"
if [ -d "$IMPORT_DIR" ] && [ "$(ls -A "$IMPORT_DIR"/*.json 2>/dev/null)" ]; then
  for f in "$IMPORT_DIR"/*.json; do
    echo "[entrypoint] Importing workflow: $f"
    n8n import:workflow --input="$f" || echo "[entrypoint] Warning: failed to import $f"
  done
  echo "[entrypoint] Workflow import complete"
else
  echo "[entrypoint] No workflow files found in $IMPORT_DIR"
fi

# ── Bring n8n to foreground ──────────────────────────────────
echo "[entrypoint] n8n running (PID $N8N_PID)"
wait $N8N_PID

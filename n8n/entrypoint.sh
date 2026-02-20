#!/bin/sh
# ──────────────────────────────────────────────────────────────
# n8n custom entrypoint
#
# This script:
#   1. Imports every workflow JSON found in /import/workflows
#      (uses n8n CLI which works without a running server).
#   2. Starts n8n in the background.
#   3. Runs activate-workflows.mjs which:
#      - Waits for n8n to be ready
#      - Completes owner setup (first run only)
#      - Activates all imported workflows via REST API
#   4. Brings n8n back to the foreground.
# ──────────────────────────────────────────────────────────────

set -e

# ── Import workflows before starting ─────────────────────────
IMPORT_DIR="/import/workflows"
if [ -d "$IMPORT_DIR" ]; then
  for f in "$IMPORT_DIR"/*.json; do
    [ -f "$f" ] || continue
    echo "[entrypoint] Importing workflow: $f"
    n8n import:workflow --input="$f" || echo "[entrypoint] Warning: failed to import $f"
  done
  echo "[entrypoint] Workflow import complete"
else
  echo "[entrypoint] No workflow directory found at $IMPORT_DIR"
fi

# ── Start n8n in background ──────────────────────────────────
echo "[entrypoint] Starting n8n..."
n8n start &
N8N_PID=$!

# ── Run activation script (node is available in the n8n image) ─
echo "[entrypoint] Running workflow activation script..."
node /scripts/activate-workflows.mjs &

# ── Wait for n8n process ─────────────────────────────────────
wait $N8N_PID

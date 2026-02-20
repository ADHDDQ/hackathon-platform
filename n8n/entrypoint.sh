#!/bin/sh
# n8n entrypoint:
#   1. Import workflow JSON files via the CLI (no auth needed, writes to DB)
#   2. Start n8n in the background
#   3. Run setup script that waits for owner signup, then activates workflows
#   4. Wait on n8n so the container stays alive

echo "[entrypoint] Importing workflows via n8n CLI..."
for f in /import/workflows/*.json; do
  if [ -f "$f" ]; then
    echo "[entrypoint]   <- $f"
    n8n import:workflow --input="$f" 2>&1 || echo "[entrypoint]   WARNING: import failed for $f"
  fi
done

echo "[entrypoint] Starting n8n server..."
n8n start &
N8N_PID=$!

echo "[entrypoint] Launching activation script in background..."
node /scripts/setup-workflows.mjs &

wait $N8N_PID

# ── Build stage ──────────────────────────────────────────────
FROM python:3.12-slim AS builder
WORKDIR /app

# Install build dependencies separately so Docker caches the layer
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir .

# ── Runtime stage ────────────────────────────────────────────
FROM python:3.12-slim
WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY pyproject.toml ./
COPY src ./src

# Non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

EXPOSE 8000
# Production-grade Uvicorn command
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

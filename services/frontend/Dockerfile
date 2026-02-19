# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# Vite reads VITE_* env vars at BUILD time, so we bake the backend URL
# that the browser will use.  Inside the Docker network the frontend
# container itself doesn't call the backend – the *browser* does, so the
# URL must be the host-accessible address (localhost:4000 by default).
ARG VITE_BACKEND_URL=http://localhost:4000
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

# ── Runtime – lightweight static server ──────────────────────
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve@14
COPY --from=builder /app/dist ./dist

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
# "serve" is a zero-config static file server
CMD ["serve", "-s", "dist", "-l", "3000"]

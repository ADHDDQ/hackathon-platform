# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --production

# ── Runtime stage ────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Copy only the production node_modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 4000
CMD ["node", "src/index.js"]

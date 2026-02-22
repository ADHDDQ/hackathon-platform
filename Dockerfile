# Docker-in-Docker: runs docker compose up inside a container.
#
# ⚠  Requires the container to run in PRIVILEGED mode so the inner
#    Docker daemon can start. On Render this must be enabled via
#    support / a dedicated instance type. On a plain VPS / VM run:
#      docker run --privileged -p 3000:3000 -p 4000:4000 -p 8000:8000 -p 5678:5678 <image>
#
# The base image's ENTRYPOINT (dockerd-entrypoint.sh) starts the Docker
# daemon in the background, then execs the CMD below.

FROM docker:27-dind

# docker compose v2 is already bundled in docker:dind as a CLI plugin.
# Install bash for the wait loop.
RUN apk add --no-cache bash

WORKDIR /app

# Copy the entire repo into the image so compose can build all services.
COPY . .

# Forward the ports exposed by the inner services.
EXPOSE 3000 4000 8000 5678

# Wait for the Docker daemon to be ready, then bring everything up.
CMD ["sh", "-c", "\
  echo 'Waiting for Docker daemon...' && \
  until docker info >/dev/null 2>&1; do sleep 1; done && \
  echo 'Docker daemon ready – starting services...' && \
  docker compose up --build \
  "]

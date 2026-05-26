#!/bin/sh
set -e

if command -v podman >/dev/null 2>&1; then
  podman machine start 2>/dev/null || true
  until podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}' 2>/dev/null | grep -q sock; do
    sleep 1
  done
  DOCKER_HOST=unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}') docker compose up postgres
else
  docker compose up postgres
fi

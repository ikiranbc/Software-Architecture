#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if docker info >/dev/null 2>&1; then
  echo "[start] Docker detected. Starting full stack with Docker Compose..."
  exec docker compose up --build
fi

has_local_infra=1
for port in 27017 6379 5672; do
  if ! nc -z localhost "$port" >/dev/null 2>&1; then
    has_local_infra=0
    break
  fi
done

if [ "$has_local_infra" -eq 1 ]; then
  echo "[start] Docker daemon is not running. Local infra detected, starting node stack."
  exec env NO_DOCKER_INFRA=1 npm start
fi

echo "[start] Docker daemon is not running, and local infra ports are unavailable."
echo "[start] Start Docker Desktop, or run local MongoDB (27017), Redis (6379), and RabbitMQ (5672), then re-run."
exit 1

#!/usr/bin/env bash

set -euo pipefail

BRANCH="${BRANCH:-main}"
SERVICE_NAME="${SERVICE_NAME:-stocks-api}"
APP_DIR="${APP_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || true)}"

if [[ -z "${APP_DIR}" ]]; then
  echo "ERROR: No se pudo resolver APP_DIR. Ejecuta dentro del repo o define APP_DIR."
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL no esta definido."
  echo "Ejemplo:"
  echo "DATABASE_URL=postgres://reclib:Reclib-pro@127.0.0.1:5432/stocks bash deploy/deploy.sh"
  exit 1
fi

cd "${APP_DIR}"

echo "==> Repo: ${APP_DIR}"
echo "==> Branch: ${BRANCH}"
echo "==> Service: ${SERVICE_NAME}"

echo "==> Actualizando codigo..."
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

echo "==> Instalando dependencias..."
pnpm install --frozen-lockfile

echo "==> Aplicando schema DB (Drizzle push)..."
DATABASE_URL="${DATABASE_URL}" pnpm --filter ./lib/db run push

echo "==> Build frontend..."
BASE_PATH=/ PORT=5173 pnpm --filter ./artifacts/inventario run build

echo "==> Build backend..."
pnpm --filter ./artifacts/api-server run build

echo "==> Reiniciando servicios..."
sudo systemctl restart "${SERVICE_NAME}"
sudo systemctl reload nginx

echo "==> Deploy completado."
echo "==> Estado servicio ${SERVICE_NAME}:"
sudo systemctl --no-pager --lines=20 status "${SERVICE_NAME}" || true


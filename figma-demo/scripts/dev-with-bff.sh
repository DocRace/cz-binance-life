#!/usr/bin/env bash
# Start book BFF then Vite dev server (same proxy as `vite.config.ts`: /api/bff -> 127.0.0.1:8787).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm run bff:dev &
bff_pid=$!
cleanup() {
  kill "$bff_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[dev-with-bff] BFF starting (pid $bff_pid), waiting for :8787 ..."
for _ in $(seq 1 40); do
  if curl -sf -o /dev/null "http://127.0.0.1:8787/api/bff/auth/session" 2>/dev/null; then
    break
  fi
  sleep 0.15
done

exec npm run dev

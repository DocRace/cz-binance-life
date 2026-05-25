#!/usr/bin/env bash
# rsync SPA dist/ to Singapore test host (nginx root for cz-life-test.ipdex.vip).
# Prerequisites: PEM at $ENV_DIR (default ~/Downloads/ipdex-env); Node + npm locally.
#
# Uses figma-demo/deploy/.env.spa for VITE_* at build time (same as docker-compose).
set -euo pipefail

FIGMA_DEMO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DIR="${ENV_DIR:-${HOME}/Downloads/ipdex-env}"
KEY="${DEPLOY_KEY:-${ENV_DIR}/ipdex-singapore-dev-test.pem}"
HOST="${DEPLOY_HOST:-ubuntu@52.221.179.13}"
SPA_ENV="${SPA_ENV:-${FIGMA_DEMO}/deploy/.env.spa}"

if [[ ! -f "$KEY" ]]; then
  echo "Missing SSH PEM: $KEY (set DEPLOY_KEY= or ENV_DIR=)" >&2
  exit 1
fi
if [[ ! -f "$SPA_ENV" ]]; then
  echo "Missing SPA env file: $SPA_ENV (copy from deploy/.env.spa.example)" >&2
  exit 1
fi
if [[ ! -d "$FIGMA_DEMO" ]]; then
  echo "Missing figma-demo: $FIGMA_DEMO" >&2
  exit 1
fi

chmod 400 "$KEY" 2>/dev/null || true

set -a
# shellcheck disable=SC1090
source "$SPA_ENV"
set +a

export VITE_IPDEX_MARKET_URL="${VITE_IPDEX_MARKET_URL:-https://ipdex-v1-dev.ipdex.vip}"
export VITE_IPDEX_CLIENT_API_ORIGIN="${VITE_IPDEX_CLIENT_API_ORIGIN:-https://ipdex-v1-dev.ipdex.vip}"
export VITE_DATADANCE_EXPLORER_URL="${VITE_DATADANCE_EXPLORER_URL:-https://scan.datadance.ai}"
export VITE_DATADANCE_SITE_URL="${VITE_DATADANCE_SITE_URL:-https://datadance.ai}"
export VITE_IPDEX_SOCIAL_X_URL="${VITE_IPDEX_SOCIAL_X_URL:-https://x.com/ipdex}"
export VITE_IPDEX_SOCIAL_FACEBOOK_URL="${VITE_IPDEX_SOCIAL_FACEBOOK_URL:-https://facebook.com/ipdex}"
export VITE_BOOK_BFF_URL="${VITE_BOOK_BFF_URL:-}"

(
  cd "$FIGMA_DEMO"
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
  npm run build
)

RSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new"
rsync -avz --delete \
  --exclude '.DS_Store' \
  -e "$RSH" "$FIGMA_DEMO/dist/" "$HOST:~/cz-life-test-dist/"

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" 'bash -s' <<'REMOTE'
set -e
sudo mkdir -p /var/www/html/cz-life-test.ipdex.vip
sudo rsync -a --delete /home/ubuntu/cz-life-test-dist/ /var/www/html/cz-life-test.ipdex.vip/
sudo chown -R www-data:www-data /var/www/html/cz-life-test.ipdex.vip
sudo nginx -t
sudo systemctl reload nginx
echo "Deployed to /var/www/html/cz-life-test.ipdex.vip"
REMOTE

echo "Done: https://cz-life-test.ipdex.vip"

#!/usr/bin/env bash
# Build SPA + sync dist/BFF/IPDEX stripe helpers to Singapore host (czlife.club + legacy cz-life-test.ipdex.vip).
# Prerequisites: PEM at $ENV_DIR (default ~/Downloads/ipdex-env); Node + npm locally.
#
# Uses figma-demo/deploy/.env.spa for VITE_* at build time (same as docker-compose).
set -euo pipefail

FIGMA_DEMO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IPDEX_BACKEND="${IPDEX_BACKEND:-${HOME}/Developer/data-dance/ipdex/ipdex-backend-v1}"
ENV_DIR="${ENV_DIR:-${HOME}/Downloads/ipdex-env/ipdex-env-dev}"
KEY="${DEPLOY_KEY:-${ENV_DIR}/ipdex-singapore-dev-test.pem}"
HOST="${DEPLOY_HOST:-ubuntu@52.221.179.13}"
SPA_ENV="${SPA_ENV:-${FIGMA_DEMO}/deploy/.env.spa}"
CZ_LIFE_SITE_URL="${CZ_LIFE_SITE_URL:-https://czlife.club}"
CZ_LIFE_WEB_ROOT="${CZ_LIFE_WEB_ROOT:-/var/www/html/cz-life-test.ipdex.vip}"

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
export VITE_DATADANCE_EXPLORER_URL="${VITE_DATADANCE_EXPLORER_URL:-https://testnet.datadance.ai}"
export VITE_DATADANCE_SITE_URL="${VITE_DATADANCE_SITE_URL:-https://datadance.ai}"
export VITE_IPDEX_SOCIAL_X_URL="${VITE_IPDEX_SOCIAL_X_URL:-https://x.com/IPDEX_Official}"
export VITE_IPDEX_SITE_URL="${VITE_IPDEX_SITE_URL:-https://ipdex.vip}"
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

rsync -avz \
  -e "$RSH" \
  "$FIGMA_DEMO/bff/src/" "$HOST:~/cz-booksite-bff/src/"

if [[ -d "$IPDEX_BACKEND/src/payment/stripe" ]]; then
  rsync -avz \
    -e "$RSH" \
    "$IPDEX_BACKEND/src/payment/stripe/resolveCallbackOrigin.js" \
    "$IPDEX_BACKEND/src/payment/stripe/createOrder.js" \
    "$HOST:~/dev-backend/ipdex-backend-v1/src/payment/stripe/"
  rsync -avz \
    -e "$RSH" \
    "$IPDEX_BACKEND/src/service/clientService/server/apis/marketplace/primary/commands/primaryPurchase.js" \
    "$HOST:~/dev-backend/ipdex-backend-v1/src/service/clientService/server/apis/marketplace/primary/commands/"
fi

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" "bash -s" <<REMOTE
set -euo pipefail
WEB_ROOT="${CZ_LIFE_WEB_ROOT}"
SITE_URL="${CZ_LIFE_SITE_URL}"

sudo mkdir -p "\$WEB_ROOT"
sudo rsync -a --delete /home/ubuntu/cz-life-test-dist/ "\$WEB_ROOT/"
sudo chown -R www-data:www-data "\$WEB_ROOT"

BFF_ENV=/home/ubuntu/cz-booksite-bff/.env
if grep -q '^BOOK_STRIPE_CALLBACK_ORIGIN=' "\$BFF_ENV" 2>/dev/null; then
  sed -i "s|^BOOK_STRIPE_CALLBACK_ORIGIN=.*|BOOK_STRIPE_CALLBACK_ORIGIN=${CZ_LIFE_SITE_URL}|" "\$BFF_ENV"
else
  echo "BOOK_STRIPE_CALLBACK_ORIGIN=${CZ_LIFE_SITE_URL}" >> "\$BFF_ENV"
fi
if ! grep -q 'czlife.club' "\$BFF_ENV" 2>/dev/null; then
  sed -i "s|^BOOK_ALLOWED_ORIGINS=\\(.*\\)|BOOK_ALLOWED_ORIGINS=\\1,${CZ_LIFE_SITE_URL},https://www.czlife.club|" "\$BFF_ENV"
fi

IPDEX_ENV=/home/ubuntu/dev-backend/ipdex-backend-v1/.env.market.server
if [[ -f "\$IPDEX_ENV" ]]; then
  if grep -q '^COBRAND_BOOK_STRIPE_CALLBACK=' "\$IPDEX_ENV"; then
    sed -i "s|^COBRAND_BOOK_STRIPE_CALLBACK=.*|COBRAND_BOOK_STRIPE_CALLBACK=${CZ_LIFE_SITE_URL}|" "\$IPDEX_ENV"
  else
    echo "COBRAND_BOOK_STRIPE_CALLBACK=${CZ_LIFE_SITE_URL}" >> "\$IPDEX_ENV"
  fi
fi

pm2 restart cz-booksite-bff
pm2 restart client-dev

sudo nginx -t
sudo systemctl reload nginx
echo "SPA deployed to \$WEB_ROOT (served at ${CZ_LIFE_SITE_URL})"
REMOTE

echo "Done: ${CZ_LIFE_SITE_URL}"

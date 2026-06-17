#!/usr/bin/env bash
# Build SPA with production IPDEX IDs + deploy to czlife.club (test host, prd backend).
# czlife.club nginx serves /var/www/html/cz-life-test.ipdex.vip and proxies /api/bff locally.
# BFF is pointed at market.ipdex.vip so Stripe Checkout uses live mode (rk_live_*).
set -euo pipefail

FIGMA_DEMO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DIR="${ENV_DIR:-${HOME}/Downloads/ipdex-env/ipdex-env-dev}"
PRD_ENV_DIR="${PRD_ENV_DIR:-${HOME}/Downloads/ipdex-env/ipdex-env-prd}"
KEY="${DEPLOY_KEY:-${ENV_DIR}/ipdex-singapore-dev-test.pem}"
PRD_KEY="${PRD_DEPLOY_KEY:-${PRD_ENV_DIR}/ipdex-singapore-prd.pem}"
HOST="${DEPLOY_HOST:-ubuntu@52.221.179.13}"
PRD_HOST="${PRD_DEPLOY_HOST:-ubuntu@18.139.3.11}"
SPA_ENV="${SPA_ENV:-${FIGMA_DEMO}/deploy/.env.spa.prd}"
CZ_LIFE_SITE_URL="${CZ_LIFE_SITE_URL:-https://czlife.club}"
CZ_LIFE_WEB_ROOT="${CZ_LIFE_WEB_ROOT:-/var/www/html/cz-life-test.ipdex.vip}"

if [[ ! -f "$KEY" ]]; then
  echo "Missing SSH PEM: $KEY" >&2
  exit 1
fi
if [[ ! -f "$SPA_ENV" ]]; then
  echo "Missing SPA env: $SPA_ENV" >&2
  exit 1
fi
if [[ ! -f "$PRD_KEY" ]]; then
  echo "Missing prd SSH PEM (to read BFF partner creds): $PRD_KEY" >&2
  exit 1
fi

chmod 400 "$KEY" 2>/dev/null || true
chmod 400 "$PRD_KEY" 2>/dev/null || true

set -a
# shellcheck disable=SC1090
source "$SPA_ENV"
set +a

export VITE_IPDEX_MARKET_URL="${VITE_IPDEX_MARKET_URL:-https://market.ipdex.vip}"
export VITE_IPDEX_CLIENT_API_ORIGIN="${VITE_IPDEX_CLIENT_API_ORIGIN:-https://market.ipdex.vip}"
export VITE_DATADANCE_EXPLORER_URL="${VITE_DATADANCE_EXPLORER_URL:-https://explorer.datadance.ai}"
export VITE_DATADANCE_SITE_URL="${VITE_DATADANCE_SITE_URL:-https://datadance.ai}"
export VITE_BOOK_BFF_URL="${VITE_BOOK_BFF_URL:-}"

LISTING_ID="${VITE_IPDEX_BOOK_PRIMARY_LISTING_ID:-}"
AIRDROP_CODE="${VITE_IPDEX_BOOK_STANDARD_AIRDROP_PUBLIC_CODE:-}"

read_prd_bff_var() {
  local name="$1"
  ssh -i "$PRD_KEY" -o StrictHostKeyChecking=accept-new "$PRD_HOST" \
    "grep -E '^${name}=' ~/cz-booksite-bff/.env | head -1 | cut -d= -f2- | tr -d '\"'"
}

IPDEX_PARTNER_APP_KEY="$(read_prd_bff_var IPDEX_PARTNER_APP_KEY)"
IPDEX_PARTNER_APP_SECRET="$(read_prd_bff_var IPDEX_PARTNER_APP_SECRET)"
if [[ -z "$IPDEX_PARTNER_APP_KEY" || -z "$IPDEX_PARTNER_APP_SECRET" ]]; then
  echo "Could not read prd BFF partner credentials from ${PRD_HOST}" >&2
  exit 1
fi

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
  "$FIGMA_DEMO/bff/package.json" \
  "$FIGMA_DEMO/bff/package-lock.json" \
  "$HOST:~/cz-booksite-bff/"

rsync -avz \
  -e "$RSH" \
  "$FIGMA_DEMO/bff/src/" "$HOST:~/cz-booksite-bff/src/"

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" "bash -s" <<REMOTE
set -euo pipefail
WEB_ROOT="${CZ_LIFE_WEB_ROOT}"
SITE_URL="${CZ_LIFE_SITE_URL}"

sudo mkdir -p "\$WEB_ROOT"
sudo rsync -a --delete /home/ubuntu/cz-life-test-dist/ "\$WEB_ROOT/"
sudo chown -R www-data:www-data "\$WEB_ROOT"

cd /home/ubuntu/cz-booksite-bff
if [[ ! -f .env ]]; then
  cat > .env <<'ENVEOF'
IPDEX_CLIENT_ORIGIN=https://market.ipdex.vip
IPDEX_GATEWAY_PREFIX=/api/v1
IPDEX_PARTNER_COBRAND_PREFIX=/partner/integration/book-site
IPDEX_PARTNER_APP_KEY=
IPDEX_PARTNER_APP_SECRET=
BOOK_PRIMARY_LISTING_ID=
BOOK_STANDARD_AIRDROP_PUBLIC_CODE=
BFF_PORT=8787
BOOK_ALLOWED_ORIGINS=https://czlife.club,https://www.czlife.club,https://cz-life.ipdex.vip
BOOK_COOKIE_SECURE=1
BOOK_STRIPE_CALLBACK_ORIGIN=https://czlife.club
ENVEOF
fi

set_kv() {
  local key="\$1" val="\$2"
  if grep -q "^\${key}=" .env 2>/dev/null; then
    sed -i "s|^\${key}=.*|\${key}=\${val}|" .env
  else
    echo "\${key}=\${val}" >> .env
  fi
}

set_kv IPDEX_CLIENT_ORIGIN "https://market.ipdex.vip"
set_kv IPDEX_GATEWAY_PREFIX "/api/v1"
set_kv IPDEX_PARTNER_COBRAND_PREFIX "/partner/integration/book-site"
set_kv IPDEX_PARTNER_APP_KEY "${IPDEX_PARTNER_APP_KEY}"
set_kv IPDEX_PARTNER_APP_SECRET "${IPDEX_PARTNER_APP_SECRET}"
set_kv BOOK_STRIPE_CALLBACK_ORIGIN "${CZ_LIFE_SITE_URL}"
set_kv BOOK_ALLOWED_ORIGINS "https://czlife.club,https://www.czlife.club,https://cz-life.ipdex.vip"
set_kv BOOK_COOKIE_SECURE "1"
if [[ -n "${LISTING_ID}" ]]; then
  set_kv BOOK_PRIMARY_LISTING_ID "${LISTING_ID}"
fi
if [[ -n "${AIRDROP_CODE}" ]]; then
  set_kv BOOK_STANDARD_AIRDROP_PUBLIC_CODE "${AIRDROP_CODE}"
fi

npm ci --omit=dev --no-audit --no-fund 2>/dev/null || npm install --omit=dev --no-audit --no-fund

pm2 restart cz-booksite-bff

sudo nginx -t
sudo systemctl reload nginx
echo "czlife.club deployed with production IPDEX (market.ipdex.vip) at \$WEB_ROOT"
REMOTE

echo "Done: ${CZ_LIFE_SITE_URL} → market.ipdex.vip (Stripe live)"

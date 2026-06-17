#!/usr/bin/env bash
# Build SPA + sync BFF to Singapore production (market.ipdex.vip + cz-life.ipdex.vip).
set -euo pipefail

FIGMA_DEMO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IPDEX_BACKEND="${IPDEX_BACKEND:-${HOME}/Developer/data-dance/ipdex/ipdex-backend-v1}"
ENV_DIR="${ENV_DIR:-${HOME}/Downloads/ipdex-env/ipdex-env-prd}"
KEY="${DEPLOY_KEY:-${ENV_DIR}/ipdex-singapore-prd.pem}"
HOST="${DEPLOY_HOST:-ubuntu@18.139.3.11}"
SPA_ENV="${SPA_ENV:-${FIGMA_DEMO}/deploy/.env.spa.prd}"
CZ_LIFE_SITE_URL="${CZ_LIFE_SITE_URL:-https://cz-life.ipdex.vip}"
CZ_LIFE_WEB_ROOT="${CZ_LIFE_WEB_ROOT:-/var/www/html/cz-life.ipdex.vip}"

if [[ ! -f "$KEY" ]]; then
  echo "Missing SSH PEM: $KEY" >&2
  exit 1
fi
if [[ ! -f "$SPA_ENV" ]]; then
  echo "Missing SPA env: $SPA_ENV" >&2
  exit 1
fi

chmod 400 "$KEY" 2>/dev/null || true

set -a
# shellcheck disable=SC1090
source "$SPA_ENV"
set +a

export VITE_IPDEX_MARKET_URL="${VITE_IPDEX_MARKET_URL:-https://market.ipdex.vip}"
export VITE_IPDEX_CLIENT_API_ORIGIN="${VITE_IPDEX_CLIENT_API_ORIGIN:-https://market.ipdex.vip}"
export VITE_DATADANCE_EXPLORER_URL="${VITE_DATADANCE_EXPLORER_URL:-https://explorer.datadance.ai}"
export VITE_DATADANCE_SITE_URL="${VITE_DATADANCE_SITE_URL:-https://datadance.ai}"
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
  -e "$RSH" "$FIGMA_DEMO/dist/" "$HOST:~/cz-life-prd-dist/"

rsync -avz \
  -e "$RSH" \
  "$FIGMA_DEMO/bff/package.json" \
  "$FIGMA_DEMO/bff/package-lock.json" \
  "$HOST:~/cz-booksite-bff/"

rsync -avz \
  -e "$RSH" \
  "$FIGMA_DEMO/bff/src/" "$HOST:~/cz-booksite-bff/src/"

if [[ -d "$IPDEX_BACKEND/src/payment/stripe" ]]; then
  rsync -avz \
    -e "$RSH" \
    "$IPDEX_BACKEND/src/payment/stripe/resolveCallbackOrigin.js" \
    "$IPDEX_BACKEND/src/payment/stripe/createOrder.js" \
    "$HOST:~/backend/ipdex-backend-v1/src/payment/stripe/"
  rsync -avz \
    -e "$RSH" \
    "$IPDEX_BACKEND/src/service/clientService/server/apis/marketplace/primary/commands/primaryPurchase.js" \
    "$HOST:~/backend/ipdex-backend-v1/src/service/clientService/server/apis/marketplace/primary/commands/"
fi

LISTING_ID="${VITE_IPDEX_BOOK_PRIMARY_LISTING_ID:-}"
AIRDROP_CODE="${VITE_IPDEX_BOOK_STANDARD_AIRDROP_PUBLIC_CODE:-}"

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" "bash -s" <<REMOTE
set -euo pipefail
WEB_ROOT="${CZ_LIFE_WEB_ROOT}"
SITE_URL="${CZ_LIFE_SITE_URL}"

sudo mkdir -p "\$WEB_ROOT"
sudo rsync -a --delete /home/ubuntu/cz-life-prd-dist/ "\$WEB_ROOT/"
sudo chown -R www-data:www-data "\$WEB_ROOT"

cd /home/ubuntu/cz-booksite-bff
if [[ ! -f .env ]]; then
  cat > .env <<'ENVEOF'
IPDEX_CLIENT_ORIGIN=https://market.ipdex.vip
IPDEX_GATEWAY_PREFIX=/api/v1
IPDEX_PARTNER_COBRAND_PREFIX=/partner/integration/book-site
IPDEX_PARTNER_APP_KEY=cz_booksite_prd
IPDEX_PARTNER_APP_SECRET=CHANGE_ME_AFTER_FIRST_DEPLOY
BOOK_PRIMARY_LISTING_ID=
BOOK_STANDARD_AIRDROP_PUBLIC_CODE=
BFF_PORT=8787
BOOK_ALLOWED_ORIGINS=https://cz-life.ipdex.vip,https://czlife.club,https://www.czlife.club
BOOK_COOKIE_SECURE=1
BOOK_STRIPE_CALLBACK_ORIGIN=https://czlife.club
ENVEOF
fi

if ! grep -q '^BOOK_STRIPE_CALLBACK_ORIGIN=' .env 2>/dev/null; then
  echo "BOOK_STRIPE_CALLBACK_ORIGIN=https://czlife.club" >> .env
fi
sed -i "s|^BOOK_STRIPE_CALLBACK_ORIGIN=.*|BOOK_STRIPE_CALLBACK_ORIGIN=https://czlife.club|" .env
sed -i "s|^IPDEX_CLIENT_ORIGIN=.*|IPDEX_CLIENT_ORIGIN=https://market.ipdex.vip|" .env
if [[ -n "${LISTING_ID}" ]]; then
  if grep -q '^BOOK_PRIMARY_LISTING_ID=' .env 2>/dev/null; then
    sed -i "s|^BOOK_PRIMARY_LISTING_ID=.*|BOOK_PRIMARY_LISTING_ID=${LISTING_ID}|" .env
  else
    echo "BOOK_PRIMARY_LISTING_ID=${LISTING_ID}" >> .env
  fi
fi
if [[ -n "${AIRDROP_CODE}" ]]; then
  if grep -q '^BOOK_STANDARD_AIRDROP_PUBLIC_CODE=' .env 2>/dev/null; then
    sed -i "s|^BOOK_STANDARD_AIRDROP_PUBLIC_CODE=.*|BOOK_STANDARD_AIRDROP_PUBLIC_CODE=${AIRDROP_CODE}|" .env
  else
    echo "BOOK_STANDARD_AIRDROP_PUBLIC_CODE=${AIRDROP_CODE}" >> .env
  fi
fi

npm ci --omit=dev --no-audit --no-fund 2>/dev/null || npm install --omit=dev --no-audit --no-fund

if pm2 describe cz-booksite-bff >/dev/null 2>&1; then
  pm2 restart cz-booksite-bff
else
  pm2 start src/server.js --name cz-booksite-bff --cwd /home/ubuntu/cz-booksite-bff
  pm2 save
fi

IPDEX_ENV=/home/ubuntu/backend/ipdex-backend-v1/.env.market.server
if [[ -f "\$IPDEX_ENV" ]]; then
  if grep -q '^COBRAND_BOOK_STRIPE_CALLBACK=' "\$IPDEX_ENV"; then
    sed -i "s|^COBRAND_BOOK_STRIPE_CALLBACK=.*|COBRAND_BOOK_STRIPE_CALLBACK=https://czlife.club,https://www.czlife.club,https://cz-life.ipdex.vip|" "\$IPDEX_ENV"
  else
    echo "COBRAND_BOOK_STRIPE_CALLBACK=https://czlife.club,https://www.czlife.club,https://cz-life.ipdex.vip" >> "\$IPDEX_ENV"
  fi
  for kv in \
    "BOOK_CLUB_REDEEM_ENABLED=1" \
    "BOOK_CLUB_SOURCE_COLLECTION_IDS=47899bab-b481-4560-9584-dbff3086651f" \
    "BOOK_CLUB_STUB_COLLECTION_ID=96c1cccb-b907-48ed-ac87-1bf15214b31e" \
    "BOOK_CLUB_STAFF_CODE_SHA256_HEX=d6606a34c3eee4d2c1ff734363980fa7f490cc261db91cd39284ddf4e2e6c5f5"; do
    key="\${kv%%=*}"
    val="\${kv#*=}"
    if grep -q "^\${key}=" "\$IPDEX_ENV"; then
      sed -i "s|^\${key}=.*|\${key}=\${val}|" "\$IPDEX_ENV"
    else
      echo "\${key}=\${val}" >> "\$IPDEX_ENV"
    fi
  done
fi

cd /home/ubuntu/backend/ipdex-backend-v1
if [[ -f .env.admin.server ]]; then
  node -e "
    require('dotenv').config({ path: '.env.admin.server' });
    const knex = require('knex')({
      client: 'mysql2',
      connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.IPDEX_V1_DB || 'ipdex-v1',
      },
    });
    (async () => {
      await knex('t_nft_redemption_rule')
        .where('c_rule_id', '88d9284e-cb5c-4905-a1f1-44264a51613b')
        .update({ c_enabled: 1 });
      await knex.destroy();
    })().catch((e) => { console.error(e.message); process.exit(1); });
  " || true
fi

pm2 restart prd-market || true

sudo nginx -t
sudo systemctl reload nginx
echo "CZ SPA deployed to \$WEB_ROOT (public: ${CZ_LIFE_SITE_URL})"
REMOTE

echo "Done: ${CZ_LIFE_SITE_URL}"

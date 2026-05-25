# Deploy cz-binance-life to an IPDEX test subdomain

This document is for **your platform / DevOps team**. This repo cannot create DNS records or TLS certificates for you, but everything below is ready to run on any host (Kubernetes, VM + Docker, etc.).

## What you are publishing

| Component | Role |
|-----------|------|
| **SPA** (`figma-demo/`) | Static Vite build: book site UI. |
| **BFF** (`figma-demo/bff/`, optional) | Express: `/api/bff/*`, cookies, Partner/HMAC to IPDEX Client Service. |

Browsing-only works with **SPA alone**. **Account / login / checkout** need the **BFF** running and **`BOOK_ALLOWED_ORIGINS`** (or path-based proxy) matching the SPA origin.

## Suggested test hostname

Pick a subdomain under your test zone, for example **`cz-life-test.ipdex.vip`** (already used on the Singapore dev NGINX host; ensure Cloudflare DNS matches your routing).

Point it to the ingress/load balancer that terminates TLS and forwards to the SPA (and optionally BFF).

## Reference: Freedom of Money ↔ IPDEX test (`ipdex-admin-v1-dev`)

Current smoke pair (**replace when admin rotates**):

| Meaning | UUID |
|---------|------|
| **Book voucher** NFT collection «CZ NFT Test 2» | `a0344152-4a6a-424e-8918-b476e834e8d7` |
| Primary activity **«CZ NFT Sell 2»** (`/collection/sales/:id`) | `bada09ad-3a04-41e0-99ab-c882ee977663` |
| Default **listing** for `POST /ip/primary/purchase` / BFF checkout | `a6d4e2eb-1c33-4569-b988-333656580ea3` (HK$ 299 on dev DB) |

| Env (SPA / Compose) | Value |
|---------------------|--------|
| `VITE_IPDEX_MARKET_URL` | `https://ipdex-v1-dev.ipdex.vip` |
| `VITE_IPDEX_BOOK_PRIMARY_SALE_ID` | `bada09ad-3a04-41e0-99ab-c882ee977663` |
| `VITE_IPDEX_BOOK_PRIMARY_LISTING_ID` | `a6d4e2eb-1c33-4569-b988-333656580ea3` |
| `BOOK_PRIMARY_LISTING_ID` (BFF) | same as listing id above |

**On-site NFT redeem** (`/account/redeem`): when multiple rules are enabled, set **`VITE_IPDEX_NFT_REDEMPTION_RULE_ID`** to the admin rule («CZ NFT Redeem 2»): **`1b56d531-7e14-446b-9830-5ce95d3f265f`** (eligible source collection = **`a0344152-4a6a-424e-8918-b476e834e8d7`**).

Optional for Account UI (**stub payouts** — same UUID as rule payout series «CZ Stub NFT Test 2»):

| `VITE_IPDEX_BOOK_ATTEND_STUB_SERIES_ID` | `7e93048f-120b-4a42-9b0b-4bc6311404bd` |

**Partner / BOOK_CLUB (Client Service `.env`):** redemption mint stub inventory tracks primary **«CZ NFT Stub Sell 2»** — activity **`9396376c-96c7-48be-a54a-421c68db5a9a`**, listing **`4a7f1ee2-c688-47f6-a6e8-006175a2684e`**, stub collection **`7e93048f-120b-4a42-9b0b-4bc6311404bd`**. Rotate these in backend env when ops creates a new stub sale.

**Checklist:** same-origin `/api/bff` nginx route; **`BOOK_PRIMARY_LISTING_ID`** avoids empty-body checkout when the SPA omits `listingId`; **`envListingId` overrides** resolver — always bump **both** SPA sale + listing IDs (or clear listing env and rely on BFF primary-sale GET). After rotation, redeploy SPA + reload BFF.

### Client Service prerequisites (Singapore dev host)

Partner-facing book-site façade uses **`verificationAppAuth`**. The Client process **`loadEnv('.env.market.server')`** must include **`VERIFICATION_APP_KEY` / `VERIFICATION_APP_SECRET`** (or **`VERIFICATION_APP_KEYS`**) matching **`IPDEX_PARTNER_APP_KEY` / `IPDEX_PARTNER_APP_SECRET`** in `~/cz-booksite-bff/.env`. Without these, **`/api/bff/auth/send-code`** will stay at **`{"code":-10011}`** upstream.

After IPDEX rotates the smoke partner secret, patch **both** Client + BFF `.env`, then `pm2 restart client-dev cz-booksite-bff`.

## 1. Build SPA image

From `figma-demo/`:

```bash
docker build \
  --build-arg VITE_IPDEX_CLIENT_API_ORIGIN=https://ipdex-v1-dev.ipdex.vip \
  --build-arg VITE_IPDEX_MARKET_URL=https://your-market-test.example \
  --build-arg VITE_BOOK_BFF_URL=https://cz-life-test.ipdex.vip \
  -t cz-booksite-spa:test \
  .
```

Set every `VITE_*` you use in production (see `figma-demo/.env.example`). **`VITE_BOOK_BFF_URL`** must be the **browser-visible** HTTPS origin where `/api/bff` is reachable (same host with reverse proxy, or a second subdomain).

## 2. Build BFF image (if needed)

From `figma-demo/bff/`:

```bash
docker build -t cz-booksite-bff:test .
```

Runtime env: copy from `bff/.env.example`. Critical values:

- `IPDEX_CLIENT_ORIGIN` — Client Service base URL for tests.
- `IPDEX_PARTNER_APP_KEY` / `IPDEX_PARTNER_APP_SECRET` — Partner credentials.
- `BOOK_ALLOWED_ORIGINS` — include `https://cz-life-test.ipdex.vip` (no trailing slash).
- `BOOK_COOKIE_SECURE=1` when serving only over HTTPS.

## 3. Wiring SPA + BFF

**Option A — Two hostnames**

- `https://cz-life-test...` → SPA container/port 80.
- `https://cz-life-bff-test...` → BFF port `8787`.
- Set `VITE_BOOK_BFF_URL=https://cz-life-bff-test...` when building SPA.

**Option B — Same hostname (recommended UX)**

- Reverse proxy (nginx / ingress): `/` → SPA, `/api/bff/` → BFF upstream.
- Leave `VITE_BOOK_BFF_URL` empty so the SPA calls same-origin `/api/bff` (see `bookBffClient` behavior), **or** set it explicitly to `https://cz-life-test...`.
- Example nginx skeleton: `figma-demo/deploy/nginx.edge-with-bff.conf.example`.

## 4. SPA routing

The app is a **client-side router**. The HTTP server **must** resolve unknown paths to `index.html`. The included nginx config does that (`try_files`).

## 5. Checklist before go-live

- [ ] TLS certificate on the public hostname.
- [ ] SPA built with correct `VITE_IPDEX_*` and market URLs for **test**.
- [ ] If using BFF: health check `GET /healthz` on BFF; CORS/cookie `secure` matches HTTPS.
- [ ] IPDEX test Client Service exposes the book-site Partner façade your BFF calls.

For product boundaries and API pointers, see `BOOKSITE_README.md`.

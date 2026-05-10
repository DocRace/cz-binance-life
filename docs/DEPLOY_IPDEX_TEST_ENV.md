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

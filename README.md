# cz-binance-life

Book-site experience (Vite + React) with a small **BFF** (**Backend for Frontend**) that proxies Partner / co-branded IPDEX calls server-side (HMAC stays off the browser).

## Layout

- `figma-demo/` — SPA (multi-language), IPDEX market links, purchase & account flows wired to `/api/bff/*` when the BFF is running.
- `figma-demo/bff/` — Express service: auth cookies, profile, NFT balances, primary/secondary checkout helpers.

## Quick start

```bash
# BFF (fill figma-demo/bff/.env from .env.example first)
cd figma-demo/bff && npm install && npm run start

# SPA (in another terminal)
cd figma-demo && npm install && npm run dev
```

See `figma-demo/.env.example` and `figma-demo/bff/.env.example` for variables.

## Requirements

- Node.js 18+ recommended.

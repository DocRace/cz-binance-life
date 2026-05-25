
  # NFT发行网站设计 (Copy)

  This is a code bundle for NFT发行网站设计 (Copy). The original project is available at https://www.figma.com/design/m8qg3p0TUYdEl7vtVUghRM/NFT%E5%8F%91%E8%A1%8C%E7%BD%91%E7%AB%99%E8%AE%BE%E8%AE%A1--Copy-.

  ## Running the code

  Run `npm i` to install the dependencies.

  - **SPA only**: `npm run dev` — UI only; **login and `/api/bff` need the BFF running**.
  - **Recommended local**: `npm run dev:with-bff` — starts the BFF on **8787** and Vite (proxy `/api/bff` in `vite.config.ts`).
  - **Two terminals**: `npm run bff:dev` (from repo root; needs `bff/.env` from `bff/.env.example`) and `npm run dev`.

  On **cz-life-test** / production, keep **`VITE_BOOK_BFF_URL` empty** so the browser calls same-origin `/api/bff` (nginx routes to the BFF).

  
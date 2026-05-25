# Developer / ops tools

## `ipdex-erc721-ddc-primary-sale-csv.html`

Static page (open in Chrome / Safari locally) that generates **ERC-721** NFT rows for IPDEX Admin **Primary Sale → Create Sale Activity** CSV uploads.

- **One row per token**; **`supply`** is always **`1`** (required for ERC-721 in the current backend).
- **`tokenId`**: contiguous decimals from **Start tokenId**, matching backend `isUint256String`.

**Important:** Backend still enforces `sum(CSV supplies) + c_circulating_supply ≤ c_total_supply` on the collection. Raise collection **Total Supply** or reduce rows if validation fails.

To embed this in **IPDEX Admin UI**, reuse the same column layout and generation logic inside that codebase (this repo does not ship Admin).

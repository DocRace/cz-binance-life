# 书城站点（cz-binance-life）

本仓库为 **Freedom of Money 书城 SPA + 书城 BFF** 的前端与小后端；**不包含** IPDEX Client Service / Admin 的实现与全套 API 说明。

---

## 本仓库内含什么

| 路径 | 说明 |
|------|------|
| `figma-demo/` | React + Vite 多语文站（购物流、帐户页等）。 |
| `figma-demo/bff/` | 书城 **BFF（Backend for Frontend）**：在服务端持有 Partner HMAC，向 IPDEX Client Service 的 **联名前缀**转发请求（浏览器只带 Cookie，不暴露 Secret）。 |
| `figma-demo/vite.config.ts` | 开发时可将 `/api/bff` 代理到本地 BFF。 |

---

## 开发时典型启动方式

参见仓库根目录 **`README.md`**：同时运行 BFF（`bff`）与 SPA（`figma-demo` 的 `dev`）。

环境变量：`figma-demo/.env.example`、`figma-demo/bff/.env.example`。

---

## 与 IPDEX 的关系（边界）

- **本仓库不写** Ledger Partner（`/api/v1/partner/verification…`）、也不实现 IPDEX Market 服务端。
- 书城链路依赖 **远端已部署** 的 IPDEX Client Service：**联名 façade** `{base}= /partner/integration/book-site`（或网关下的等价前缀），由 BFF 用 **App Key + HMAC + 必要时用户 JWT** 调用。
- **完整的 Partner / Market API 合集与三套表面说明**由 **IPDEX 后端文档仓库单独维护**。本仓库**不粘贴、不镜像**那份长文档，避免与 IPDEX 仓库内容混在一起。
- 若 BFF 调 IPDEX 时出现 `Route … /partner/integration/book-site/… not found`（HTTP **404**），表示远端 **未部署/未启动** 含 `partner/externalBook` 的 Client Service 构建；与签名错误（多为 **-10011**）不同。排查见 IPDEX 文档 **`docs/partner/CO_BRANDED_PARTNER_INTEGRATION_REFERENCE.md`** §9。

若在 **IPDEX 后端文档仓库** 需要单文件版 API 合集，请使用该仓库目录下的 **`docs/IPDEX_EXTERNAL_API_COLLECTION.md`**（文件**不属于**书城仓库，亦不由此仓库同步）。

---

## 书城前端调用的 BFF 路径（占位索引）

SPA 经由 **`/api/bff/**`**（或 `VITE_BOOK_BFF_URL`）访问，包括但不限于：

`/api/bff/auth/session`、`…/send-code`、`…/login`、`…/logout`、`/me`、`/on-chain-identity`、`/nfts/:page`、`/market/primary-sales/:id`、`/orders/primary`、`/orders/secondary`、`/orders/pending/:page`、`/orders/cancel-payment`。

请以 **`figma-demo/bff/src/server.js`** 与 **`figma-demo/src/lib/bookBffClient.ts`** 的实现为准。

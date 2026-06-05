import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { loadBffEnv, ipdexFacadeFetch, ipdexPublicApiFetch } from './ipdexClient.js';

const PORT = Number(process.env.BFF_PORT || 8787);
const AT_COOKIE = 'bff_ipdex_at';
const RT_COOKIE = 'bff_ipdex_rt';

function parseOrigins() {
  const raw = process.env.BOOK_ALLOWED_ORIGINS || 'http://localhost:5173';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function uuidLike(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(`${s}`);
}

function pageInt(s) {
  const n = parseInt(`${s}`, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

const AIRDROP_PUBLIC_CODE_RE = /^[a-zA-Z0-9_-]{4,64}$/;

function resolveAirdropPublicCode(raw, fallback) {
  const code = `${raw ?? ''}`.trim() || `${fallback ?? ''}`.trim();
  if (!AIRDROP_PUBLIC_CODE_RE.test(code)) return null;
  return code;
}

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.BOOK_COOKIE_SECURE === '1',
  };
}

/** When IPDEX returns a JSON envelope, use 400 for business errors — only unknown/missing body ⇒ 502 (so SPA treats 502–504 as transport). */
function httpStatusFromIpdexEnvelope(out) {
  const j = out.json;
  if (j && typeof j.code === 'number' && j.code === 0) return 200;
  if (j && typeof j.code === 'number') return 400;
  return 502;
}

async function boot() {
  const env = loadBffEnv();
  if (!env.IPDEX_CLIENT_ORIGIN || !env.APP_KEY || !env.APP_SECRET) {
    console.error('[bff] Missing IPDEX_CLIENT_ORIGIN or IPDEX_PARTNER_APP_KEY / IPDEX_PARTNER_APP_SECRET');
    process.exit(1);
  }

  const app = express();
  app.use(express.json({ limit: '512kb' }));
  app.use(cookieParser());

  app.use(
    cors({
      origin: parseOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Idempotency-Key'],
    }),
  );

  const healthPayload = { ok: true, service: 'cz-booksite-bff' };
  app.get('/healthz', (_req, res) => {
    res.json(healthPayload);
  });
  app.get('/api/bff/healthz', (_req, res) => {
    res.json(healthPayload);
  });

  app.post('/api/bff/auth/send-code', async (req, res) => {
    const email = `${req.body?.email ?? ''}`.trim();
    if (!email.includes('@')) {
      return res.status(400).json({ code: -1, message: 'invalid_email', data: null });
    }
    const out = await ipdexFacadeFetch(env, {
      method: 'POST',
      suffixPath: '/send-login-code',
      body: { email },
    });
    res.status(httpStatusFromIpdexEnvelope(out)).json(
      out.json ?? { code: -1, message: 'upstream_bad_response', data: null },
    );
  });

  app.post('/api/bff/auth/login', async (req, res) => {
    const email = `${req.body?.email ?? ''}`.trim();
    const code = `${req.body?.code ?? ''}`;
    if (!email || !code) {
      return res.status(400).json({ code: -1, message: 'missing_fields', data: null });
    }
    const out = await ipdexFacadeFetch(env, {
      method: 'POST',
      suffixPath: '/login',
      body: { email, code },
    });
    const j = out.json;
    if (j?.code === 0 && j.data?.accessToken && j.data?.refreshToken) {
      res.cookie(AT_COOKIE, j.data.accessToken, { ...cookieBase(), maxAge: 55 * 60 * 1000 });
      res.cookie(RT_COOKIE, j.data.refreshToken, {
        ...cookieBase(),
        maxAge: 14 * 24 * 60 * 60 * 1000,
      });
      return res.json({ code: 0, message: j.message ?? '', data: { ok: true } });
    }
    res.status(out.ok && j?.code !== 0 ? 400 : 502).json(j);
  });

  app.post('/api/bff/auth/refresh', async (req, res) => {
    const rt = req.cookies?.[RT_COOKIE];
    if (!rt) {
      return res.status(401).json({ code: -1, message: 'no_refresh', data: null });
    }
    const out = await ipdexFacadeFetch(env, {
      method: 'POST',
      suffixPath: '/user/refresh-jwt',
      body: { refreshJWT: rt },
    });
    const j = out.json;
    if (j?.code === 0 && j.data?.accessToken && j.data?.refreshToken) {
      res.cookie(AT_COOKIE, j.data.accessToken, { ...cookieBase(), maxAge: 55 * 60 * 1000 });
      res.cookie(RT_COOKIE, j.data.refreshToken, {
        ...cookieBase(),
        maxAge: 14 * 24 * 60 * 60 * 1000,
      });
      return res.json({ code: 0, message: '', data: { ok: true } });
    }
    res.status(401).json(j || { code: -1, message: 'refresh_failed', data: null });
  });

  app.post('/api/bff/auth/logout', (_req, res) => {
    res.clearCookie(AT_COOKIE, cookieBase());
    res.clearCookie(RT_COOKIE, cookieBase());
    res.json({ code: 0, message: '', data: null });
  });

  app.get('/api/bff/auth/session', (req, res) => {
    const at = req.cookies?.[AT_COOKIE];
    res.json({ code: 0, message: '', data: { authenticated: Boolean(at && at.length > 10) } });
  });

  function bearer(req) {
    const t = req.cookies?.[AT_COOKIE];
    return t ? String(t) : null;
  }

  app.get('/api/bff/me', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });
    const out = await ipdexFacadeFetch(env, {
      method: 'GET',
      suffixPath: '/user/profile',
      accessToken,
    });
    res.status(out.json?.code === 0 ? 200 : 400).json(out.json);
  });

  app.get('/api/bff/on-chain-identity', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });
    const out = await ipdexFacadeFetch(env, {
      method: 'GET',
      suffixPath: '/user/on-chain-identity',
      accessToken,
    });
    res.status(out.json?.code === 0 ? 200 : 400).json(out.json);
  });

  app.get('/api/bff/nft/:collectionId/:tokenId', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });

    const collectionId = `${req.params.collectionId ?? ''}`.trim();
    const tokenId = `${req.params.tokenId ?? ''}`.trim();
    if (!uuidLike(collectionId)) {
      return res.status(400).json({ code: -10001, message: 'Invalid collectionId', data: null });
    }
    if (!tokenId) {
      return res.status(400).json({ code: -10001, message: 'Invalid tokenId', data: null });
    }

    const encC = encodeURIComponent(collectionId);
    const encT = encodeURIComponent(tokenId);

    const [balanceOut, infoOut] = await Promise.all([
      ipdexPublicApiFetch(env, {
        apiPath: `/user/nft/balance/${encC}/${encT}`,
        accessToken,
      }),
      ipdexPublicApiFetch(env, {
        apiPath: `/nft/${encC}/${encT}`,
        accessToken,
      }),
    ]);

    const balance = balanceOut.json?.code === 0 ? balanceOut.json.data : null;
    const info = infoOut.json?.code === 0 ? infoOut.json.data : null;

    if (!balance && !info) {
      return res.status(502).json({
        code: -1,
        message: balanceOut.json?.message || infoOut.json?.message || 'upstream_bad_response',
        data: null,
      });
    }

    return res.json({
      code: 0,
      message: '',
      data: { balance, info },
    });
  });

  app.get('/api/bff/nfts/:page', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });
    const pg = pageInt(req.params.page);
    if (!pg) return res.status(400).json({ code: -10001, message: 'Invalid page', data: null });

    const query = {};
    if (req.query.search) query.search = `${req.query.search}`;
    if (req.query.status) query.status = `${req.query.status}`;
    if (req.query.ercType) query.ercType = `${req.query.ercType}`;

    const out = await ipdexFacadeFetch(env, {
      method: 'GET',
      suffixPath: `/user/nft-balances/${pg}`,
      query,
      accessToken,
    });
    res.status(out.json?.code === 0 ? 200 : 400).json(out.json);
  });

  app.get('/api/bff/market/primary-sales/:salesId', async (req, res) => {
    const sid = `${req.params.salesId}`;
    if (!uuidLike(sid)) {
      return res.status(400).json({ code: -10001, message: 'Invalid salesId', data: null });
    }
    const out = await ipdexFacadeFetch(env, {
      method: 'GET',
      suffixPath: `/market/ip/primary/sales/${sid}`,
    });
    res.status(out.json?.code === 0 ? 200 : 400).json(out.json);
  });

  app.post('/api/bff/orders/primary', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });

    const quantity = Number(req.body?.quantity ?? 1);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ code: -10001, message: 'Invalid quantity', data: null });
    }

    let listingId = `${req.body?.listingId ?? ''}`.trim();
    if (!listingId) listingId = env.LISTING_FALLBACK;
    if (!uuidLike(listingId)) {
      return res.status(400).json({
        code: -10001,
        message: 'listingId_required_configure_BOOK_PRIMARY_LISTING_ID',
        data: null,
      });
    }

    const out = await ipdexFacadeFetch(env, {
      method: 'POST',
      suffixPath: '/market/ip/primary/purchase',
      body: { listingId, quantity: Math.floor(quantity) },
      accessToken,
    });
    res.status(out.json?.code === 0 ? 200 : 400).json(out.json);
  });

  app.post('/api/bff/orders/secondary', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });
    const listingId = `${req.body?.listingId ?? ''}`.trim();
    if (!uuidLike(listingId)) {
      return res.status(400).json({ code: -10001, message: 'Invalid listingId', data: null });
    }
    const out = await ipdexFacadeFetch(env, {
      method: 'POST',
      suffixPath: '/market/ip/secondary/purchase',
      body: { listingId },
      accessToken,
    });
    res.status(out.json?.code === 0 ? 200 : 400).json(out.json);
  });

  app.get('/api/bff/orders/pending/:page', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });
    const pg = pageInt(req.params.page);
    if (!pg) return res.status(400).json({ code: -10001, message: 'Invalid page', data: null });
    const out = await ipdexFacadeFetch(env, {
      method: 'GET',
      suffixPath: `/market/user/orders/pending/${pg}`,
      accessToken,
    });
    res.status(out.json?.code === 0 ? 200 : 400).json(out.json);
  });

  app.post('/api/bff/orders/cancel-payment', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });
    const orderId = `${req.body?.orderId ?? ''}`.trim();
    if (!uuidLike(orderId)) {
      return res.status(400).json({ code: -10001, message: 'Invalid orderId', data: null });
    }
    const out = await ipdexFacadeFetch(env, {
      method: 'POST',
      suffixPath: '/market/user/cancel/payment',
      body: { orderId },
      accessToken,
    });
    res.status(out.json?.code === 0 ? 200 : 400).json(out.json);
  });

  app.get('/api/bff/airdrop/campaign', async (req, res) => {
    const publicCode = resolveAirdropPublicCode(req.query?.publicCode, env.AIRDROP_PUBLIC_CODE);
    if (!publicCode) {
      return res.status(400).json({
        code: -10001,
        message: 'publicCode_required_configure_BOOK_STANDARD_AIRDROP_PUBLIC_CODE',
        data: null,
      });
    }
    const out = await ipdexFacadeFetch(env, {
      method: 'GET',
      suffixPath: `/airdrop/campaign/${encodeURIComponent(publicCode)}`,
    });
    res.status(httpStatusFromIpdexEnvelope(out)).json(
      out.json ?? { code: -1, message: 'upstream_bad_response', data: null },
    );
  });

  app.get('/api/bff/airdrop/my-claim', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });

    const publicCode = resolveAirdropPublicCode(req.query?.publicCode, env.AIRDROP_PUBLIC_CODE);
    if (!publicCode) {
      return res.status(400).json({
        code: -10001,
        message: 'publicCode_required_configure_BOOK_STANDARD_AIRDROP_PUBLIC_CODE',
        data: null,
      });
    }

    const out = await ipdexFacadeFetch(env, {
      method: 'GET',
      suffixPath: `/airdrop/campaign/${encodeURIComponent(publicCode)}/my-claim`,
      accessToken,
    });
    res.status(httpStatusFromIpdexEnvelope(out)).json(
      out.json ?? { code: -1, message: 'upstream_bad_response', data: null },
    );
  });

  app.post('/api/bff/airdrop/claim', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });

    const publicCode = resolveAirdropPublicCode(req.body?.publicCode, env.AIRDROP_PUBLIC_CODE);
    if (!publicCode) {
      return res.status(400).json({
        code: -10001,
        message: 'publicCode_required_configure_BOOK_STANDARD_AIRDROP_PUBLIC_CODE',
        data: null,
      });
    }

    const out = await ipdexFacadeFetch(env, {
      method: 'POST',
      suffixPath: `/airdrop/campaign/${encodeURIComponent(publicCode)}/claim`,
      body: {},
      accessToken,
    });
    res.status(httpStatusFromIpdexEnvelope(out)).json(
      out.json ?? { code: -1, message: 'upstream_bad_response', data: null },
    );
  });

  app.post('/api/bff/club/redeem', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });

    const staffRaw = `${req.body?.staffCode ?? ''}`;
    const staffCode = staffRaw.trim();
    const redemptionRuleId = `${req.body?.redemptionRuleId ?? ''}`.trim();
    const sourceCollectionId = `${req.body?.sourceCollectionId ?? ''}`.trim();
    const sourceTokenId = `${req.body?.sourceTokenId ?? ''}`.trim();
    let idempotencyKey = `${req.headers['x-idempotency-key'] ?? ''}`.trim();
    if (!idempotencyKey) idempotencyKey = `${req.body?.idempotencyKey ?? ''}`.trim();

    if (
      staffCode.length < 4
      || !uuidLike(sourceCollectionId)
      || !sourceTokenId
      || sourceTokenId.length > 80
      || idempotencyKey.length < 16
    ) {
      return res.status(400).json({ code: -10001, message: 'missing_or_invalid_body', data: null });
    }

    if (redemptionRuleId.length && !uuidLike(redemptionRuleId)) {
      return res.status(400).json({ code: -10001, message: 'Invalid redemptionRuleId', data: null });
    }

    const out = await ipdexFacadeFetch(env, {
      method: 'POST',
      suffixPath: '/club/redeem',
      body: {
        staffCode,
        ...(redemptionRuleId.length ? { redemptionRuleId } : {}),
        sourceCollectionId,
        sourceTokenId,
        idempotencyKey,
      },
      accessToken,
      idempotencyKey,
    });
    res.status(out.json?.code === 0 ? 200 : 400).json(out.json);
  });

  app.listen(PORT, () => {
    console.error(`[bff] listening ${PORT} -> IPDEX ${env.IPDEX_CLIENT_ORIGIN}${env.COBRAND_ROOT}`);
  });
}

boot().catch((e) => {
  console.error(e);
  process.exit(1);
});

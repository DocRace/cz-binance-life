import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { loadBffEnv, ipdexFacadeFetch, ipdexPublicApiFetch } from './ipdexClient.js';
import { suggestChronicleTags } from './chronicleSuggestTags.js';
import {
  createChronicleRankStore,
  loadRankConfigFromEnv,
} from './chronicleRankStore.js';
import { createChronicleShareStore } from './chronicleShareStore.js';

const PORT = Number(process.env.BFF_PORT || 8787);
const AT_COOKIE = 'bff_ipdex_at';
const RT_COOKIE = 'bff_ipdex_rt';
/** Matches IPDEX access JWT (`jwtManager` default 1h). */
const ACCESS_COOKIE_MAX_AGE_MS = 60 * 60 * 1000;
/** Matches IPDEX refresh JWT (`jwt.js` default 7d) — 7-day login without OTP re-entry. */
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(AT_COOKIE, accessToken, { ...cookieBase(), maxAge: ACCESS_COOKIE_MAX_AGE_MS });
  res.cookie(RT_COOKIE, refreshToken, { ...cookieBase(), maxAge: REFRESH_COOKIE_MAX_AGE_MS });
}

function hasAccessCookie(at) {
  return Boolean(at && `${at}`.length > 10);
}

async function refreshAuthFromCookie(env, refreshToken) {
  const out = await ipdexFacadeFetch(env, {
    method: 'POST',
    suffixPath: '/user/refresh-jwt',
    body: { refreshJWT: refreshToken },
  });
  const j = out.json;
  if (j?.code === 0 && j.data?.accessToken && j.data?.refreshToken) {
    return {
      ok: true,
      accessToken: j.data.accessToken,
      refreshToken: j.data.refreshToken,
    };
  }
  return { ok: false, json: j };
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
    const email = `${req.body?.email ?? ''}`.trim().toLowerCase();
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
    const email = `${req.body?.email ?? ''}`.trim().toLowerCase();
    const code = `${req.body?.code ?? ''}`.trim();
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
      setAuthCookies(res, j.data.accessToken, j.data.refreshToken);
      return res.json({ code: 0, message: j.message ?? '', data: { ok: true } });
    }
    res.status(out.ok && j?.code !== 0 ? 400 : 502).json(j);
  });

  app.post('/api/bff/auth/refresh', async (req, res) => {
    const rt = req.cookies?.[RT_COOKIE];
    if (!rt) {
      return res.status(401).json({ code: -1, message: 'no_refresh', data: null });
    }
    const refreshed = await refreshAuthFromCookie(env, rt);
    if (refreshed.ok) {
      setAuthCookies(res, refreshed.accessToken, refreshed.refreshToken);
      return res.json({ code: 0, message: '', data: { ok: true } });
    }
    res.status(401).json(refreshed.json || { code: -1, message: 'refresh_failed', data: null });
  });

  app.post('/api/bff/auth/logout', (_req, res) => {
    res.clearCookie(AT_COOKIE, cookieBase());
    res.clearCookie(RT_COOKIE, cookieBase());
    res.json({ code: 0, message: '', data: null });
  });

  app.get('/api/bff/auth/session', async (req, res) => {
    const at = req.cookies?.[AT_COOKIE];
    if (hasAccessCookie(at)) {
      return res.json({ code: 0, message: '', data: { authenticated: true } });
    }

    const rt = req.cookies?.[RT_COOKIE];
    if (!rt) {
      return res.json({ code: 0, message: '', data: { authenticated: false } });
    }

    const refreshed = await refreshAuthFromCookie(env, rt);
    if (refreshed.ok) {
      setAuthCookies(res, refreshed.accessToken, refreshed.refreshToken);
      return res.json({ code: 0, message: '', data: { authenticated: true } });
    }

    res.clearCookie(AT_COOKIE, cookieBase());
    res.clearCookie(RT_COOKIE, cookieBase());
    return res.json({ code: 0, message: '', data: { authenticated: false } });
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

    const paymentChannelRaw = `${req.body?.paymentChannel ?? 'stripe'}`.trim().toLowerCase();
    const paymentChannel = paymentChannelRaw === 'crypto' ? 'crypto' : 'stripe';
    const purchaseBody = {
      listingId,
      quantity: Math.floor(quantity),
      paymentChannel,
    };
    if (paymentChannel === 'stripe') {
      purchaseBody.currency = `${req.body?.currency ?? 'hkd'}`.trim().toLowerCase() || 'hkd';
    }
    if (env.STRIPE_CALLBACK_ORIGIN) {
      purchaseBody.stripeCallbackOrigin = env.STRIPE_CALLBACK_ORIGIN;
    }
    if (req.body?.paymentReturnUrls && typeof req.body.paymentReturnUrls === 'object') {
      purchaseBody.paymentReturnUrls = req.body.paymentReturnUrls;
    }

    const out = await ipdexFacadeFetch(env, {
      method: 'POST',
      suffixPath: '/market/ip/primary/purchase',
      body: purchaseBody,
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
    const paymentChannelRaw = `${req.body?.paymentChannel ?? 'stripe'}`.trim().toLowerCase();
    const paymentChannel = paymentChannelRaw === 'crypto' ? 'crypto' : 'stripe';
    const out = await ipdexFacadeFetch(env, {
      method: 'POST',
      suffixPath: '/market/ip/secondary/purchase',
      body: { listingId, paymentChannel },
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

  app.get('/api/bff/orders/history/:page', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });
    const pg = pageInt(req.params.page);
    if (!pg) return res.status(400).json({ code: -10001, message: 'Invalid page', data: null });
    const out = await ipdexFacadeFetch(env, {
      method: 'GET',
      suffixPath: `/market/user/purchase/history/${pg}`,
      accessToken,
    });
    res.status(out.json?.code === 0 ? 200 : 400).json(out.json);
  });

  app.get('/api/bff/orders/:orderId/payment', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });
    const orderId = `${req.params.orderId ?? ''}`.trim();
    if (!uuidLike(orderId)) {
      return res.status(400).json({ code: -10001, message: 'Invalid orderId', data: null });
    }
    const out = await ipdexFacadeFetch(env, {
      method: 'GET',
      suffixPath: `/market/user/orders/${orderId}/payment`,
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

  app.post('/api/bff/gift/lookup-email', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });

    const email = `${req.body?.email ?? ''}`.trim().toLowerCase();
    if (!email.includes('@')) {
      return res.status(400).json({ code: -10001, message: 'invalid_email', data: null });
    }

    const out = await ipdexFacadeFetch(env, {
      method: 'POST',
      suffixPath: '/gift/lookup-email',
      body: { email },
      accessToken,
    });
    res.status(httpStatusFromIpdexEnvelope(out)).json(
      out.json ?? { code: -1, message: 'upstream_bad_response', data: null },
    );
  });

  app.post('/api/bff/nft/gift', async (req, res) => {
    const accessToken = bearer(req);
    if (!accessToken) return res.status(401).json({ code: -10005, message: 'Unauthorized', data: null });

    const collectionId = `${req.body?.collectionId ?? ''}`.trim();
    const tokenId = `${req.body?.tokenId ?? ''}`.trim();
    const recipientEmail = `${req.body?.recipientEmail ?? ''}`.trim().toLowerCase();

    if (!uuidLike(collectionId) || !tokenId || !recipientEmail.includes('@')) {
      return res.status(400).json({ code: -10001, message: 'missing_or_invalid_body', data: null });
    }

    const out = await ipdexFacadeFetch(env, {
      method: 'POST',
      suffixPath: '/nft/gift',
      body: { collectionId, tokenId, recipientEmail },
      accessToken,
    });
    res.status(httpStatusFromIpdexEnvelope(out)).json(
      out.json ?? { code: -1, message: 'upstream_bad_response', data: null },
    );
  });

  /** In-memory cache for X profile avatars (fxtwitter → pbs.twimg redirect). */
  const clubAvatarCache = new Map();
  const CLUB_AVATAR_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const HANDLE_RE = /^[A-Za-z0-9_]{1,30}$/;

  function upgradeTwitterAvatarUrl(url) {
    return `${url}`.replace(/_normal\.(jpe?g|png|webp)$/i, '_400x400.$1');
  }

  app.get('/api/bff/club/avatar/:handle', async (req, res) => {
    const handle = `${req.params.handle ?? ''}`.replace(/^@/, '').trim();
    if (!HANDLE_RE.test(handle)) {
      return res.status(400).json({ code: -10001, message: 'invalid_handle', data: null });
    }

    const cached = clubAvatarCache.get(handle);
    if (cached && cached.expires > Date.now()) {
      res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.redirect(302, cached.url);
    }

    try {
      const upstream = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'cz-booksite-bff/1.0' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!upstream.ok) {
        return res.status(upstream.status === 404 ? 404 : 502).end();
      }
      const payload = await upstream.json();
      const rawUrl = payload?.user?.avatar_url;
      if (typeof rawUrl !== 'string' || !rawUrl.startsWith('https://pbs.twimg.com/')) {
        return res.status(404).end();
      }
      const url = upgradeTwitterAvatarUrl(rawUrl);
      clubAvatarCache.set(handle, { url, expires: Date.now() + CLUB_AVATAR_TTL_MS });
      res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.redirect(302, url);
    } catch {
      return res.status(502).end();
    }
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
      timeoutMs: 45_000,
    });
    res.status(out.json?.code === 0 ? 200 : 400).json(out.json);
  });

  app.post('/api/bff/chronicle/suggest-tags', async (req, res) => {
    const audience = `${req.body?.audience ?? ''}`.trim() === 'founder' ? 'founder' : 'retail';
    const text = `${req.body?.text ?? ''}`.trim();
    const candidateIds = Array.isArray(req.body?.candidateIds)
      ? req.body.candidateIds.filter((x) => typeof x === 'string').slice(0, 80)
      : [];
    if (!text || text.length < 2) {
      return res.status(400).json({ code: -10001, message: 'text_required', data: null });
    }
    try {
      const tagIds = await suggestChronicleTags({ audience, text, candidateIds });
      return res.json({ code: 0, message: 'ok', data: { tagIds }, tagIds });
    } catch (err) {
      console.error('[bff] chronicle suggest-tags failed', err?.message || err);
      // Soft-fail: client continues with rule-based tags.
      return res.json({ code: 0, message: 'fallback', data: { tagIds: [] }, tagIds: [] });
    }
  });

  const rankCfg = loadRankConfigFromEnv(process.env);
  const rankStore = createChronicleRankStore(rankCfg);
  const shareStore = createChronicleShareStore(path.dirname(rankCfg.dataPath));

  function chronicleLongPath(shareToken, ref) {
    const q = new URLSearchParams();
    q.set('share', shareToken);
    if (ref) q.set('ref', ref);
    return `/club/chronicle?${q.toString()}`;
  }

  async function resolveUserId(req) {
    const accessToken = bearer(req);
    if (!accessToken) return null;
    try {
      const out = await ipdexFacadeFetch(env, {
        method: 'GET',
        suffixPath: '/user/profile',
        accessToken,
      });
      const id = out.json?.data?.userId || out.json?.data?.id || out.json?.data?.uuid;
      return id ? `${id}` : null;
    } catch {
      return null;
    }
  }

  app.get('/api/bff/chronicle/rank/config', (_req, res) => {
    res.json({ code: 0, message: 'ok', data: rankStore.config() });
  });

  app.get('/api/bff/chronicle/rank/leaderboard', (req, res) => {
    const limit = pageInt(req.query?.limit) || 50;
    const entryId = `${req.query?.entryId || ''}`.trim() || null;
    const data = rankStore.leaderboard({ limit, entryId });
    res.json({ code: 0, message: 'ok', data });
  });

  app.get('/api/bff/chronicle/rank/entry/:entryId', (req, res) => {
    const entry = rankStore.getEntry(req.params.entryId);
    if (!entry) return res.status(404).json({ code: -10004, message: 'ENTRY_NOT_FOUND', data: null });
    res.json({ code: 0, message: 'ok', data: entry });
  });

  app.get('/api/bff/chronicle/rank/voter-status', async (_req, res) => {
    res.json({
      code: 0,
      message: 'ok',
      data: { votesUsed: 0, votesRemaining: 0, votedEntryIds: [], maxVotes: 0 },
    });
  });

  app.post('/api/bff/chronicle/rank/attribute', async (req, res) => {
    const userId = await resolveUserId(req);
    const completerEntryId = `${req.body?.completerEntryId || ''}`.trim();
    if (!userId && !completerEntryId) {
      return res.status(400).json({ code: -10001, message: 'INVITE_KEY_REQUIRED', data: null });
    }
    const out = rankStore.attributeInvite({
      refEntryId: req.body?.refEntryId,
      userId,
      completerEntryId,
    });
    if (!out.ok) {
      return res.status(400).json({ code: -10001, message: out.code, data: null });
    }
    res.json({ code: 0, message: 'ok', data: out });
  });

  app.post('/api/bff/chronicle/share-link', (req, res) => {
    const out = shareStore.mint({
      shareToken: req.body?.shareToken,
      ref: req.body?.ref,
    });
    if (!out.ok) {
      return res.status(400).json({ code: -10001, message: out.code, data: null });
    }
    res.json({ code: 0, message: 'ok', data: { code: out.code, ref: out.ref || '' } });
  });

  app.get('/api/bff/chronicle/share-link/:code', (req, res) => {
    const row = shareStore.resolve(req.params.code);
    if (!row) return res.status(404).json({ code: -10004, message: 'SHARE_NOT_FOUND', data: null });
    res.json({ code: 0, message: 'ok', data: row });
  });

  app.get('/s/:code', (req, res) => {
    const row = shareStore.resolve(req.params.code);
    if (!row) return res.redirect(302, '/club/chronicle');
    res.redirect(302, chronicleLongPath(row.shareToken, row.ref));
  });

  app.post('/api/bff/chronicle/rank/enroll', async (req, res) => {
    const userId = await resolveUserId(req);
    const out = rankStore.enroll({
      shareToken: req.body?.shareToken,
      authorName: req.body?.authorName,
      roleId: req.body?.roleId,
      styleId: req.body?.styleId,
      price: req.body?.price,
      tags: req.body?.tags,
      ownerUserId: userId,
      refEntryId: req.body?.refEntryId,
    });
    if (!out.ok) {
      return res.status(400).json({ code: -10001, message: out.code, data: null });
    }
    res.json({ code: 0, message: 'ok', data: out.entry });
  });

  app.post('/api/bff/chronicle/rank/vote', (_req, res) => {
    res.status(400).json({ code: -10001, message: 'VOTE_DISABLED', data: null });
  });

  app.post('/api/bff/chronicle/rank/claim', async (req, res) => {
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ code: -10005, message: 'LOGIN_REQUIRED', data: null });
    }
    const out = rankStore.claim({ entryId: req.body?.entryId, userId });
    if (!out.ok) {
      return res.status(400).json({ code: -10001, message: out.code, data: null });
    }
    res.json({ code: 0, message: 'ok', data: out });
  });

  app.get('/api/bff/chronicle/rank/my-rewards', async (req, res) => {
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ code: -10005, message: 'LOGIN_REQUIRED', data: null });
    }
    res.json({ code: 0, message: 'ok', data: { rewards: rankStore.myRewards(userId) } });
  });

  app.get('/api/bff/chronicle/rank/mine', async (req, res) => {
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ code: -10005, message: 'LOGIN_REQUIRED', data: null });
    }
    res.json({ code: 0, message: 'ok', data: { items: rankStore.listMine(userId) } });
  });

  app.post('/api/bff/chronicle/rank/bind', async (req, res) => {
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.status(401).json({ code: -10005, message: 'LOGIN_REQUIRED', data: null });
    }
    const out = rankStore.bindOwner({
      entryId: req.body?.entryId,
      shareToken: req.body?.shareToken,
      authorName: req.body?.authorName,
      userId,
    });
    if (!out.ok) {
      return res.status(400).json({ code: -10001, message: out.code, data: null });
    }
    res.json({ code: 0, message: 'ok', data: out.entry });
  });

  app.listen(PORT, () => {
    const rankInfo = rankStore.config();
    console.error(`[bff] listening ${PORT} -> IPDEX ${env.IPDEX_CLIENT_ORIGIN}${env.COBRAND_ROOT}`);
    console.error(
      `[bff] chronicle-rank enabled=${rankInfo.enabled} mode=${rankInfo.mode} phase=${rankInfo.phase}`,
    );
  });
}

boot().catch((e) => {
  console.error(e);
  process.exit(1);
});

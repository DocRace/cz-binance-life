import { makePartnerAuthHeaders, sortedQueryStringFromObject } from './ipdexSigning.js';

function trimSlash(s, end = false) {
  if (!s) return '';
  const t = `${s}`.trim();
  if (end) return t.replace(/\/+$/, '');
  return t.replace(/^\/+/, '').replace(/\/+$/, '');
}

export function loadBffEnv() {
  const IPDEX_CLIENT_ORIGIN = trimSlash(process.env.IPDEX_CLIENT_ORIGIN || '', true);
  const rawGp = (process.env.IPDEX_GATEWAY_PREFIX || '').trim().replace(/^\/+|\/+$/g, '');
  const IPDEX_GATEWAY_PREFIX = rawGp ? `/${trimSlash(rawGp)}` : '';

  const cobrandRaw = (process.env.IPDEX_PARTNER_COBRAND_PREFIX || '/partner/integration/book-site').trim();
  const COBRAND = `/${trimSlash(cobrandRaw.replace(/^\/+/, ''))}`;

  const APP_KEY = process.env.IPDEX_PARTNER_APP_KEY || '';
  const APP_SECRET = process.env.IPDEX_PARTNER_APP_SECRET || '';
  const COBRAND_ROOT = `${IPDEX_GATEWAY_PREFIX}${COBRAND}`.replace(/\/{2,}/g, '/') || COBRAND;
  const LISTING_FALLBACK = (process.env.BOOK_PRIMARY_LISTING_ID || '').trim();

  return {
    IPDEX_CLIENT_ORIGIN,
    IPDEX_GATEWAY_PREFIX,
    COBRAND_ROOT,
    APP_KEY,
    APP_SECRET,
    LISTING_FALLBACK,
  };
}

function cobrandPath(root, suffix) {
  const s = suffix.startsWith('/') ? suffix : `/${suffix}`;
  const r = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${r}${s}`;
}

function buildUrl(origin, pathname, sortedQuerySl) {
  const q = sortedQuerySl ? `?${sortedQuerySl}` : '';
  return `${origin}${pathname}${q}`;
}

export async function ipdexFacadeFetch(env, opts) {
  const { method, suffixPath, query, body, accessToken } = opts;
  const pathname = cobrandPath(env.COBRAND_ROOT, suffixPath);
  const sortedQ = sortedQueryStringFromObject(query || {});
  const headers = makePartnerAuthHeaders(method, pathname, sortedQ, env.APP_SECRET, env.APP_KEY);

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const idempotencyKey = `${opts.idempotencyKey ?? ''}`.trim();
  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey.slice(0, 128);
  }

  let reqBody = undefined;
  const methodUp = method.toUpperCase();
  if (methodUp !== 'GET' && methodUp !== 'HEAD' && body !== undefined) {
    headers['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(body);
  }

  const url = buildUrl(env.IPDEX_CLIENT_ORIGIN, pathname, sortedQ);

  const res = await fetch(url, {
    method: methodUp,
    headers,
    body: reqBody,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { code: -1, message: `non_json:${text?.slice(0, 120)}`, data: null };
  }
  return { ok: res.ok, status: res.status, json };
}

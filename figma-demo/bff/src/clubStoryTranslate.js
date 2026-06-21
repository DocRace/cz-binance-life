import crypto from 'crypto';

const SUPPORTED_TARGETS = new Set(['en', 'ko', 'ja']);
const CHUNK_MAX = 420;
const CACHE_MAX = 400;
const translateCache = new Map();

function cacheKey(text, target) {
  const hash = crypto.createHash('sha256').update(`${target}\n${text}`).digest('hex').slice(0, 24);
  return `${target}:${hash}`;
}

function trimCache() {
  if (translateCache.size <= CACHE_MAX) return;
  const drop = translateCache.size - CACHE_MAX;
  const keys = [...translateCache.keys()];
  for (let i = 0; i < drop; i += 1) translateCache.delete(keys[i]);
}

function splitChunks(text) {
  const src = `${text || ''}`.trim();
  if (!src) return [];
  if (src.length <= CHUNK_MAX) return [src];

  const chunks = [];
  const paras = src.split(/\n{2,}/);
  let buf = '';

  const flush = () => {
    if (buf.trim()) chunks.push(buf.trim());
    buf = '';
  };

  for (const para of paras) {
    const piece = para.trim();
    if (!piece) continue;
    if (piece.length > CHUNK_MAX) {
      flush();
      let start = 0;
      while (start < piece.length) {
        let end = Math.min(start + CHUNK_MAX, piece.length);
        if (end < piece.length) {
          const slice = piece.slice(start, end);
          const breakAt = Math.max(slice.lastIndexOf('。'), slice.lastIndexOf('，'), slice.lastIndexOf('. '), slice.lastIndexOf(' '));
          if (breakAt > CHUNK_MAX * 0.45) end = start + breakAt + 1;
        }
        chunks.push(piece.slice(start, end).trim());
        start = end;
      }
      continue;
    }
    const next = buf ? `${buf}\n\n${piece}` : piece;
    if (next.length > CHUNK_MAX) {
      flush();
      buf = piece;
    } else {
      buf = next;
    }
  }
  flush();
  return chunks.length ? chunks : [src];
}

async function translateChunk(chunk, target, attempt = 1) {
  const langpair = `zh-CN|${target}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${encodeURIComponent(langpair)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'cz-booksite-bff/1.0' },
  });
  if (res.status === 429 && attempt < 8) {
    const waitMs = Math.min(60_000, 2500 * 2 ** (attempt - 1));
    await new Promise((r) => setTimeout(r, waitMs));
    return translateChunk(chunk, target, attempt + 1);
  }
  if (!res.ok) throw new Error(`translate_http_${res.status}`);
  const json = await res.json();
  const out = `${json?.responseData?.translatedText ?? ''}`.trim();
  if (!out) throw new Error('translate_empty');
  if ((json?.responseStatus === 429 || /MYMEMORY WARNING/i.test(out)) && attempt < 8) {
    const waitMs = Math.min(60_000, 2500 * 2 ** (attempt - 1));
    await new Promise((r) => setTimeout(r, waitMs));
    return translateChunk(chunk, target, attempt + 1);
  }
  if (json?.responseStatus === 429 || /MYMEMORY WARNING/i.test(out)) {
    throw new Error('translate_rate_limited');
  }
  return out;
}

export async function translateClubStoryText(text, target, opts = {}) {
  const chunkPauseMs = Number(opts.chunkPauseMs) > 0 ? Number(opts.chunkPauseMs) : 350;
  const tgt = `${target || ''}`.trim().toLowerCase();
  if (!SUPPORTED_TARGETS.has(tgt)) {
    throw new Error('unsupported_target');
  }
  const src = `${text || ''}`.trim();
  if (!src) return '';

  const key = cacheKey(src, tgt);
  if (translateCache.has(key)) return translateCache.get(key);

  const chunks = splitChunks(src);
  const parts = [];
  for (const chunk of chunks) {
    parts.push(await translateChunk(chunk, tgt));
    await new Promise((r) => setTimeout(r, chunkPauseMs));
  }
  const translated = parts.join('\n\n');
  translateCache.set(key, translated);
  trimCache();
  return translated;
}

export function normalizeClubStoryTranslateTarget(raw) {
  const t = `${raw || ''}`.trim().toLowerCase();
  if (SUPPORTED_TARGETS.has(t)) return t;
  return null;
}

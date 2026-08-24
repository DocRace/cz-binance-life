import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const CODE_RE = /^[0-9a-f]{8,16}$/i;

function defaultDb() {
  return { version: 1, links: {} };
}

export function shareCodeFromToken(shareToken) {
  return crypto.createHash('sha256').update(`${shareToken}`).digest('hex').slice(0, 10);
}

export function createChronicleShareStore(dataDir) {
  const dataPath = path.join(dataDir, 'chronicle-share-links.json');
  let db = null;
  let writeQueue = Promise.resolve();

  function ensureLoaded() {
    if (db) return db;
    try {
      fs.mkdirSync(path.dirname(dataPath), { recursive: true });
      if (fs.existsSync(dataPath)) {
        const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        db = {
          ...defaultDb(),
          ...raw,
          links: raw.links && typeof raw.links === 'object' ? raw.links : {},
        };
      } else {
        db = defaultDb();
      }
    } catch (err) {
      console.error('[chronicle-share] load failed, starting empty', err?.message || err);
      db = defaultDb();
    }
    return db;
  }

  function persist() {
    const snapshot = ensureLoaded();
    writeQueue = writeQueue.then(() => {
      fs.mkdirSync(path.dirname(dataPath), { recursive: true });
      const tmp = `${dataPath}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(snapshot));
      fs.renameSync(tmp, dataPath);
    }).catch((err) => {
      console.error('[chronicle-share] persist failed', err?.message || err);
    });
    return writeQueue;
  }

  return {
    mint({ shareToken, ref }) {
      const token = `${shareToken || ''}`.trim();
      if (!token || token.length < 8 || token.length > 8000) {
        return { ok: false, code: 'INVALID_SHARE_TOKEN' };
      }
      const code = shareCodeFromToken(token);
      const state = ensureLoaded();
      const nowIso = new Date().toISOString();
      const existing = state.links[code];
      const next = {
        code,
        shareToken: token.slice(0, 8000),
        ref: `${ref || existing?.ref || ''}`.trim().slice(0, 64),
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
      };
      state.links[code] = next;
      void persist();
      return { ok: true, code, ref: next.ref || undefined };
    },

    resolve(code) {
      const key = `${code || ''}`.trim().toLowerCase();
      if (!CODE_RE.test(key)) return null;
      const state = ensureLoaded();
      const row = state.links[key];
      if (!row?.shareToken) return null;
      return {
        code: key,
        shareToken: row.shareToken,
        ref: row.ref || undefined,
      };
    },
  };
}

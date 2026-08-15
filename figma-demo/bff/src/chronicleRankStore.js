import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const POPULARITY_PER_VOTE = 10;
const MAX_VOTES_PER_VOTER = 3;

function defaultDb() {
  return {
    version: 1,
    entries: {},
    votes: {},
    voters: {},
    rewards: {},
    finalized: false,
    finalizedAt: null,
  };
}

export function loadRankConfigFromEnv(env = process.env) {
  const enabled = `${env.CHRONICLE_RANK_ENABLED || ''}`.trim() === '1';
  const mode = `${env.CHRONICLE_RANK_MODE || 'sync'}`.trim().toLowerCase() === 'async' ? 'async' : 'sync';
  const startMs = Date.parse(`${env.CHRONICLE_RANK_START || ''}`.trim() || 'Invalid');
  const endMs = Date.parse(`${env.CHRONICLE_RANK_END || ''}`.trim() || 'Invalid');
  const dataDir = `${env.CHRONICLE_RANK_DATA_DIR || ''}`.trim()
    || path.join(process.cwd(), 'data');
  return {
    enabled,
    mode,
    startMs: Number.isFinite(startMs) ? startMs : null,
    endMs: Number.isFinite(endMs) ? endMs : null,
    dataPath: path.join(dataDir, 'chronicle-rank.json'),
    popularityPerVote: POPULARITY_PER_VOTE,
    maxVotesPerVoter: MAX_VOTES_PER_VOTER,
  };
}

export function resolveRankPhase(cfg, now = Date.now()) {
  if (!cfg.enabled) return 'disabled';
  if (cfg.startMs != null && now < cfg.startMs) return 'upcoming';
  if (cfg.endMs != null && now > cfg.endMs) return 'ended';
  return 'active';
}

export function createChronicleRankStore(cfg) {
  let db = null;
  let writeQueue = Promise.resolve();

  function ensureLoaded() {
    if (db) return db;
    try {
      fs.mkdirSync(path.dirname(cfg.dataPath), { recursive: true });
      if (fs.existsSync(cfg.dataPath)) {
        const raw = JSON.parse(fs.readFileSync(cfg.dataPath, 'utf8'));
        db = {
          ...defaultDb(),
          ...raw,
          entries: raw.entries && typeof raw.entries === 'object' ? raw.entries : {},
          votes: raw.votes && typeof raw.votes === 'object' ? raw.votes : {},
          voters: raw.voters && typeof raw.voters === 'object' ? raw.voters : {},
          rewards: raw.rewards && typeof raw.rewards === 'object' ? raw.rewards : {},
        };
      } else {
        db = defaultDb();
      }
    } catch (err) {
      console.error('[chronicle-rank] load failed, starting empty', err?.message || err);
      db = defaultDb();
    }
    return db;
  }

  function persist() {
    const snapshot = ensureLoaded();
    writeQueue = writeQueue.then(() => {
      fs.mkdirSync(path.dirname(cfg.dataPath), { recursive: true });
      const tmp = `${cfg.dataPath}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(snapshot, null, 2));
      fs.renameSync(tmp, cfg.dataPath);
    }).catch((err) => {
      console.error('[chronicle-rank] persist failed', err?.message || err);
    });
    return writeQueue;
  }

  function entryIdFromShareToken(shareToken) {
    return crypto.createHash('sha256').update(`${shareToken}`).digest('hex').slice(0, 16);
  }

  function hashIp(ip) {
    return crypto.createHash('sha256').update(`ip:${ip || 'unknown'}`).digest('hex').slice(0, 24);
  }

  function listSorted() {
    const state = ensureLoaded();
    return Object.values(state.entries)
      .map((e) => ({
        ...e,
        popularity: (e.voteCount || 0) * cfg.popularityPerVote,
      }))
      .sort((a, b) => {
        if (b.popularity !== a.popularity) return b.popularity - a.popularity;
        return `${a.createdAt}`.localeCompare(`${b.createdAt}`);
      });
  }

  function rewardTypeForRank(rank, mode) {
    if (mode === 'async') {
      return rank >= 1 && rank <= 10 ? 'merch' : null;
    }
    if (rank >= 1 && rank <= 3) return 'ticket';
    if (rank >= 4 && rank <= 10) return 'merch';
    return null;
  }

  function finalizeIfNeeded(now = Date.now()) {
    const state = ensureLoaded();
    const phase = resolveRankPhase(cfg, now);
    if (phase !== 'ended' || state.finalized) return state;
    const sorted = listSorted().slice(0, 10);
    sorted.forEach((entry, idx) => {
      const rank = idx + 1;
      const rewardType = rewardTypeForRank(rank, cfg.mode);
      const e = state.entries[entry.entryId];
      if (!e) return;
      e.rankAtEnd = rank;
      e.rewardType = rewardType;
      e.claimStatus = rewardType ? (e.claimStatus || 'pending') : null;
      if (rewardType && e.ownerUserId) {
        const list = state.rewards[e.ownerUserId] || [];
        if (!list.some((r) => r.entryId === e.entryId)) {
          list.push({
            entryId: e.entryId,
            authorName: e.authorName,
            rank,
            rewardType,
            status: 'pending',
            claimedAt: null,
          });
          state.rewards[e.ownerUserId] = list;
        }
      } else if (rewardType && !e.ownerUserId) {
        // Eligible but unbound — author must enroll while logged in before claim.
        e.claimStatus = 'unbound';
      }
    });
    state.finalized = true;
    state.finalizedAt = new Date(now).toISOString();
    void persist();
    return state;
  }

  function publicEntry(e, rank = null) {
    return {
      entryId: e.entryId,
      authorName: e.authorName,
      roleId: e.roleId || null,
      styleId: e.styleId || null,
      tags: Array.isArray(e.tags) ? e.tags : [],
      price: typeof e.price === 'number' ? e.price : null,
      voteCount: e.voteCount || 0,
      popularity: (e.voteCount || 0) * cfg.popularityPerVote,
      shareToken: e.shareToken,
      rank,
      rewardType: e.rewardType || null,
      claimStatus: e.claimStatus || null,
      rankAtEnd: e.rankAtEnd || null,
    };
  }

  return {
    config() {
      const phase = resolveRankPhase(cfg);
      return {
        enabled: cfg.enabled,
        mode: cfg.mode,
        phase,
        startAt: cfg.startMs != null ? new Date(cfg.startMs).toISOString() : null,
        endAt: cfg.endMs != null ? new Date(cfg.endMs).toISOString() : null,
        popularityPerVote: cfg.popularityPerVote,
        maxVotesPerVoter: cfg.maxVotesPerVoter,
        rewards:
          cfg.mode === 'async'
            ? { top10: 'merch' }
            : { top3: 'ticket', top4to10: 'merch' },
      };
    },

    enroll({
      shareToken,
      authorName,
      roleId,
      styleId,
      price,
      tags,
      ownerUserId,
    }) {
      const phase = resolveRankPhase(cfg);
      if (phase === 'disabled') return { ok: false, code: 'RANK_DISABLED' };
      if (phase === 'upcoming') return { ok: false, code: 'RANK_NOT_STARTED' };
      const token = `${shareToken || ''}`.trim();
      if (!token || token.length < 8 || token.length > 8000) {
        return { ok: false, code: 'INVALID_SHARE_TOKEN' };
      }
      const name = `${authorName || ''}`.trim().slice(0, 40);
      if (!name) return { ok: false, code: 'AUTHOR_REQUIRED' };

      const state = ensureLoaded();
      const entryId = entryIdFromShareToken(token);
      const existing = state.entries[entryId];
      // After campaign end: only allow binding owner / refreshing metadata on existing entries.
      if (phase === 'ended' && !existing) {
        return { ok: false, code: 'RANK_ENDED' };
      }
      const nowIso = new Date().toISOString();
      const next = {
        entryId,
        shareToken: token.slice(0, 8000),
        authorName: name,
        roleId: roleId ? `${roleId}`.slice(0, 32) : null,
        styleId: styleId ? `${styleId}`.slice(0, 16) : null,
        price: typeof price === 'number' && Number.isFinite(price) ? price : null,
        tags: Array.isArray(tags)
          ? tags.filter((x) => typeof x === 'string').map((x) => x.slice(0, 40)).slice(0, 3)
          : [],
        voteCount: existing?.voteCount || 0,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
        ownerUserId: existing?.ownerUserId || ownerUserId || null,
        claimStatus: existing?.claimStatus || null,
        rewardType: existing?.rewardType || null,
        rankAtEnd: existing?.rankAtEnd || null,
      };
      // First logged-in enroll binds ownership (cannot steal an already-bound entry).
      if (!existing?.ownerUserId && ownerUserId) {
        next.ownerUserId = ownerUserId;
        if (next.claimStatus === 'unbound' && next.rewardType) {
          next.claimStatus = 'pending';
          const list = state.rewards[ownerUserId] || [];
          if (!list.some((r) => r.entryId === entryId)) {
            list.push({
              entryId,
              authorName: next.authorName,
              rank: next.rankAtEnd,
              rewardType: next.rewardType,
              status: 'pending',
              claimedAt: null,
            });
            state.rewards[ownerUserId] = list;
          }
        }
      }
      state.entries[entryId] = next;
      void persist();
      return { ok: true, entry: publicEntry(next) };
    },

    getEntry(entryId) {
      finalizeIfNeeded();
      const state = ensureLoaded();
      const e = state.entries[`${entryId || ''}`.trim()];
      if (!e) return null;
      const sorted = listSorted();
      const rank = sorted.findIndex((x) => x.entryId === e.entryId) + 1 || null;
      return publicEntry(e, rank || null);
    },

    leaderboard({ limit = 50, entryId = null } = {}) {
      finalizeIfNeeded();
      const phase = resolveRankPhase(cfg);
      const state = ensureLoaded();
      const sorted = listSorted();
      const cap = phase === 'ended' ? Math.min(limit, 10) : Math.min(Math.max(limit, 1), 100);
      const items = sorted.slice(0, cap).map((e, idx) => publicEntry(e, idx + 1));
      let me = null;
      if (entryId && state.entries[entryId]) {
        const idx = sorted.findIndex((x) => x.entryId === entryId);
        me = publicEntry(state.entries[entryId], idx >= 0 ? idx + 1 : null);
      }
      return { items, me, phase, total: sorted.length, finalized: state.finalized };
    },

    voterStatus({ userId, ip }) {
      finalizeIfNeeded();
      const state = ensureLoaded();
      const keys = [];
      if (userId) keys.push(`u:${userId}`);
      keys.push(`ip:${hashIp(ip)}`);
      let used = 0;
      const votedEntryIds = new Set();
      for (const key of keys) {
        const v = state.voters[key];
        if (!v) continue;
        for (const id of v.entryIds || []) votedEntryIds.add(id);
        used = Math.max(used, (v.entryIds || []).length);
      }
      return {
        votesUsed: used,
        votesRemaining: Math.max(0, cfg.maxVotesPerVoter - used),
        votedEntryIds: [...votedEntryIds],
        maxVotes: cfg.maxVotesPerVoter,
      };
    },

    vote({ entryId, userId, ip }) {
      const phase = resolveRankPhase(cfg);
      if (phase !== 'active') {
        return { ok: false, code: phase === 'ended' ? 'RANK_ENDED' : 'RANK_NOT_ACTIVE' };
      }
      const id = `${entryId || ''}`.trim();
      const state = ensureLoaded();
      if (!state.entries[id]) return { ok: false, code: 'ENTRY_NOT_FOUND' };

      const status = this.voterStatus({ userId, ip });
      if (status.votedEntryIds.includes(id)) {
        return { ok: false, code: 'ALREADY_VOTED', status };
      }
      if (status.votesRemaining <= 0) {
        return { ok: false, code: 'NO_VOTES_LEFT', status };
      }

      const voterKeys = [];
      if (userId) voterKeys.push(`u:${userId}`);
      voterKeys.push(`ip:${hashIp(ip)}`);

      // Block if either identity already voted this book or exhausted quota
      for (const key of voterKeys) {
        const v = state.voters[key] || { entryIds: [] };
        if ((v.entryIds || []).includes(id)) {
          return { ok: false, code: 'ALREADY_VOTED', status: this.voterStatus({ userId, ip }) };
        }
        if ((v.entryIds || []).length >= cfg.maxVotesPerVoter) {
          return { ok: false, code: 'NO_VOTES_LEFT', status: this.voterStatus({ userId, ip }) };
        }
      }

      const nowIso = new Date().toISOString();
      for (const key of voterKeys) {
        const v = state.voters[key] || { entryIds: [] };
        v.entryIds = [...(v.entryIds || []), id];
        state.voters[key] = v;
        state.votes[`${key}:${id}`] = { entryId: id, voterKey: key, createdAt: nowIso };
      }
      state.entries[id].voteCount = (state.entries[id].voteCount || 0) + 1;
      state.entries[id].updatedAt = nowIso;
      void persist();
      const entry = this.getEntry(id);
      return { ok: true, entry, status: this.voterStatus({ userId, ip }) };
    },

    claim({ entryId, userId }) {
      finalizeIfNeeded();
      const phase = resolveRankPhase(cfg);
      if (phase !== 'ended') return { ok: false, code: 'RANK_NOT_ENDED' };
      if (!userId) return { ok: false, code: 'LOGIN_REQUIRED' };
      const state = ensureLoaded();
      const id = `${entryId || ''}`.trim();
      const e = state.entries[id];
      if (!e) return { ok: false, code: 'ENTRY_NOT_FOUND' };
      if (!e.rewardType || !e.rankAtEnd || e.rankAtEnd > 10) {
        return { ok: false, code: 'NOT_ELIGIBLE' };
      }
      if (!e.ownerUserId) {
        return { ok: false, code: 'OWNER_UNBOUND' };
      }
      if (e.ownerUserId !== userId) {
        return { ok: false, code: 'NOT_OWNER' };
      }

      if (e.claimStatus === 'claimed') {
        return { ok: true, already: true, reward: findReward(state, userId, id) };
      }

      e.claimStatus = 'claimed';
      const list = state.rewards[userId] || [];
      let reward = list.find((r) => r.entryId === id);
      if (!reward) {
        reward = {
          entryId: id,
          authorName: e.authorName,
          rank: e.rankAtEnd,
          rewardType: e.rewardType,
          status: 'claimed',
          claimedAt: new Date().toISOString(),
        };
        list.push(reward);
      } else {
        reward.status = 'claimed';
        reward.claimedAt = new Date().toISOString();
      }
      state.rewards[userId] = list;
      void persist();
      return { ok: true, already: false, reward };
    },

    myRewards(userId) {
      finalizeIfNeeded();
      if (!userId) return [];
      const state = ensureLoaded();
      return state.rewards[userId] || [];
    },
  };
}

function findReward(state, userId, entryId) {
  return (state.rewards[userId] || []).find((r) => r.entryId === entryId) || null;
}

export function clientIp(req) {
  const xf = `${req.headers['x-forwarded-for'] || ''}`.split(',')[0].trim();
  return xf || req.socket?.remoteAddress || req.ip || 'unknown';
}

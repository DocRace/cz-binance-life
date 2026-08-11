import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAP_PATH = path.resolve(__dirname, '../../public/data/cz_behavior_tag_map.json');

let cachedMap = null;

function loadMap() {
  if (cachedMap) return cachedMap;
  const raw = fs.readFileSync(MAP_PATH, 'utf8');
  cachedMap = JSON.parse(raw);
  return cachedMap;
}

/**
 * Optional OpenAI assist — returns whitelist tag ids only.
 * Without OPENAI_API_KEY, returns [].
 */
export async function suggestChronicleTags({ audience, text, candidateIds }) {
  const map = loadMap();
  const allowed = new Set(
    (map.tags || [])
      .filter((t) => Array.isArray(t.audience) && t.audience.includes(audience))
      .map((t) => t.id),
  );
  const candidates = (candidateIds || []).filter((id) => allowed.has(id));
  if (!candidates.length) return [];

  const apiKey = `${process.env.OPENAI_API_KEY || ''}`.trim();
  if (!apiKey) return [];

  const catalog = (map.tags || [])
    .filter((t) => candidates.includes(t.id))
    .map((t) => `${t.id}: ${t.label} (${(t.synonyms || []).slice(0, 4).join(', ')})`)
    .join('\n');

  const body = {
    model: process.env.OPENAI_CHRONICLE_MODEL || 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You suggest behavior tag ids for a crypto life chronicle. Reply JSON {"tagIds":string[]}. Only use ids from the catalog. Max 6 ids.',
      },
      {
        role: 'user',
        content: `Audience: ${audience}\n\nCatalog:\n${catalog}\n\nUser text:\n${`${text || ''}`.slice(0, 3500)}`,
      },
    ],
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`openai_${res.status}:${errText.slice(0, 200)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content || '{}';
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const ids = Array.isArray(parsed?.tagIds) ? parsed.tagIds : [];
  return ids.filter((id) => typeof id === 'string' && allowed.has(id)).slice(0, 6);
}

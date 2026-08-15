import tagMapJson from "./data/cz_behavior_tag_map.json";
import { CHRONICLE_NODE_IDS } from "./nodes";
import type {
  BehaviorTag,
  BehaviorTagMap,
  ChronicleAudience,
  ChronicleNodeId,
  ChronicleResult,
  DistilledNode,
  MatchedPrinciple,
  ScoredTag,
  UserEntries,
} from "./types";

const tagMap = tagMapJson as BehaviorTagMap;

/** Lightweight CN/TW folding for matching. */
function fold(text: string): string {
  return `${text || ""}`
    .toLowerCase()
    .replace(/[\s\u3000]+/g, "")
    .replace(/[，。！？、；：""''（）【】\[\]()]/g, "")
    .replace(/長/g, "长")
    .replace(/開/g, "开")
    .replace(/關/g, "关")
    .replace(/學/g, "学")
    .replace(/國/g, "国")
    .replace(/業/g, "业")
    .replace(/錢/g, "钱")
    .replace(/買/g, "买")
    .replace(/賣/g, "卖")
    .replace(/進/g, "进")
    .replace(/過/g, "过")
    .replace(/為/g, "为")
    .replace(/與/g, "与")
    .replace(/還/g, "还")
    .replace(/對/g, "对")
    .replace(/從/g, "从")
    .replace(/後/g, "后")
    .replace(/時/g, "时")
    .replace(/會/g, "会")
    .replace(/個/g, "个")
    .replace(/這/g, "这")
    .replace(/麼/g, "么")
    .replace(/們/g, "们")
    .replace(/給/g, "给")
    .replace(/讓/g, "让")
    .replace(/說/g, "说")
    .replace(/見/g, "见")
    .replace(/覺/g, "觉")
    .replace(/嗎/g, "吗")
    .replace(/裡/g, "里")
    .replace(/並/g, "并")
    .replace(/種/g, "种")
    .replace(/無/g, "无")
    .replace(/萬/g, "万")
    .replace(/億/g, "亿")
    .replace(/餘/g, "余")
    .replace(/監/g, "监")
    .replace(/護/g, "护")
    .replace(/穩/g, "稳")
    .replace(/勝/g, "胜")
    .replace(/敗/g, "败")
    .replace(/損/g, "损")
    .replace(/專/g, "专")
    .replace(/項/g, "项")
    .replace(/幣/g, "币")
    .replace(/鏈/g, "链")
    .replace(/點/g, "点")
    .replace(/熱/g, "热")
    .replace(/頭/g, "头")
    .replace(/體/g, "体")
    .replace(/際/g, "际")
    .replace(/際/g, "际")
    .replace(/創/g, "创")
    .replace(/團/g, "团")
    .replace(/隊/g, "队")
    .replace(/產/g, "产")
    .replace(/務/g, "务")
    .replace(/規/g, "规")
    .replace(/則/g, "则")
    .replace(/負/g, "负")
    .replace(/責/g, "责")
    .replace(/應/g, "应")
    .replace(/報/g, "报")
    .replace(/導/g, "导")
    .replace(/擇/g, "择")
    .replace(/選/g, "选")
    .replace(/據/g, "据")
    .replace(/歷/g, "历")
    .replace(/經驗/g, "经验")
    .replace(/經/g, "经")
    .replace(/驗/g, "验")
    .replace(/態/g, "态")
    .replace(/紀/g, "纪")
    .replace(/鑽/g, "钻")
    .replace(/張/g, "张")
    .replace(/強/g, "强")
    .replace(/壓/g, "压")
    .replace(/處/g, "处")
    .replace(/發/g, "发")
    .replace(/現/g, "现")
    .replace(/轉/g, "转")
    .replace(/換/g, "换")
    .replace(/離/g, "离")
    .replace(/歸/g, "归")
    .replace(/來/g, "来")
    .replace(/迴/g, "回")
    .replace(/迴/g, "回")
    .replace(/復/g, "复")
    .replace(/複/g, "复")
    .replace(/態/g, "态");
}

function tagsForAudience(audience: ChronicleAudience): BehaviorTag[] {
  return tagMap.tags.filter((t) => t.audience.includes(audience));
}

function scoreTextAgainstTag(foldedText: string, tag: BehaviorTag): number {
  let score = 0;
  const label = fold(tag.label);
  if (label && foldedText.includes(label)) score += 3;
  for (const syn of tag.synonyms) {
    const s = fold(syn);
    if (!s || s.length < 2) continue;
    if (foldedText.includes(s)) {
      score += s.length >= 4 ? 2 : 1;
    }
  }
  return score;
}

export function suggestTagsFromEntries(
  entries: UserEntries,
  audience: ChronicleAudience,
  extraTagIds: string[] = [],
): ScoredTag[] {
  const pool = tagsForAudience(audience);
  const byId = new Map<string, ScoredTag>();

  for (const nodeId of CHRONICLE_NODE_IDS) {
    const text = `${entries[nodeId] || ""}`.trim();
    if (!text) continue;
    const folded = fold(text);
    for (const tag of pool) {
      const hit = scoreTextAgainstTag(folded, tag);
      if (hit <= 0) continue;
      const prev = byId.get(tag.id);
      if (prev) {
        prev.score += hit;
        if (!prev.sourceNodes.includes(nodeId)) prev.sourceNodes.push(nodeId);
      } else {
        byId.set(tag.id, {
          id: tag.id,
          label: tag.label,
          score: hit,
          dimension: tag.dimension,
          sourceNodes: [nodeId],
        });
      }
    }
  }

  // Ensure LLM / manual extras appear even with 0 rule score
  for (const id of extraTagIds) {
    if (byId.has(id)) continue;
    const tag = pool.find((t) => t.id === id);
    if (!tag) continue;
    byId.set(id, {
      id: tag.id,
      label: tag.label,
      score: 1,
      dimension: tag.dimension,
      sourceNodes: [],
    });
  }

  return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, 12);
}

export function mapTagsToPrinciples(
  confirmedTagIds: string[],
  scored: ScoredTag[],
): MatchedPrinciple[] {
  const scoreByTag = new Map(scored.map((t) => [t.id, t.score]));
  const agg = new Map<string, MatchedPrinciple>();

  for (const id of confirmedTagIds) {
    const weight = scoreByTag.get(id) || 1;
    const tag = tagMap.tags.find((t) => t.id === id);
    const refs = tagMap.principlesByTag[id] || [];
    for (const ref of refs) {
      const key = ref.name;
      const prev = agg.get(key);
      if (prev) {
        prev.score += weight;
        if (tag && !prev.fromTags.includes(tag.label)) prev.fromTags.push(tag.label);
        if (!prev.note && ref.note) prev.note = ref.note;
      } else {
        agg.set(key, {
          name: ref.name,
          note: ref.note,
          score: weight,
          fromTags: tag ? [tag.label] : [],
        });
      }
    }
  }

  const ranked = [...agg.values()].sort((a, b) => b.score - a.score);
  // Candidates for user pick (up to 10); UI selects top 3 when available.
  if (ranked.length > 0) return ranked.slice(0, 10);

  // Soft fallback if user confirmed nothing useful
  return [
    {
      name: "不停地学",
      note: null,
      score: 1,
      fromTags: [],
    },
    {
      name: "正面心态",
      note: null,
      score: 1,
      fromTags: [],
    },
    {
      name: "专注",
      note: null,
      score: 1,
      fromTags: [],
    },
  ];
}

function keywordsForNode(
  nodeId: ChronicleNodeId,
  text: string,
  scored: ScoredTag[],
): string[] {
  const fromTags = scored
    .filter((t) => t.sourceNodes.includes(nodeId))
    .map((t) => t.label);
  if (fromTags.length) return fromTags.slice(0, 4);

  // tiny fallback tokens
  const folded = fold(text);
  const hits: string[] = [];
  for (const tag of tagMap.tags) {
    if (scoreTextAgainstTag(folded, tag) > 0) hits.push(tag.label);
    if (hits.length >= 3) break;
  }
  return hits;
}

export function buildNodeTimeline(
  entries: UserEntries,
  scored: ScoredTag[],
): DistilledNode[] {
  const nodes: DistilledNode[] = [];
  for (const nodeId of CHRONICLE_NODE_IDS) {
    const text = `${entries[nodeId] || ""}`.trim();
    if (!text) continue;
    nodes.push({
      nodeId,
      text,
      keywords: keywordsForNode(nodeId, text, scored),
    });
  }
  return nodes;
}

export function distillChronicle(
  entries: UserEntries,
  audience: ChronicleAudience,
  confirmedTagIds: string[],
  suggestedExtras: string[] = [],
): ChronicleResult {
  const tags = suggestTagsFromEntries(entries, audience, suggestedExtras);
  const confirmed =
    confirmedTagIds.length > 0
      ? confirmedTagIds.filter((id) => tagMap.tags.some((t) => t.id === id))
      : tags.slice(0, 5).map((t) => t.id);

  return {
    audience,
    nodes: buildNodeTimeline(entries, tags),
    tags,
    confirmedTagIds: confirmed,
    principles: mapTagsToPrinciples(confirmed, tags),
  };
}

export function countFilled(entries: UserEntries): number {
  return CHRONICLE_NODE_IDS.filter((id) => `${entries[id] || ""}`.trim()).length;
}

export function isChronicleNodeId(value: string): value is ChronicleNodeId {
  return (CHRONICLE_NODE_IDS as string[]).includes(value);
}

export function getTagCatalog(audience?: ChronicleAudience): BehaviorTag[] {
  if (!audience) return tagMap.tags;
  return tagsForAudience(audience);
}

export function getBehaviorTagMap(): BehaviorTagMap {
  return tagMap;
}

/** Merge rule suggestions with optional LLM ids (whitelist only). */
export function mergeSuggestedTagIds(
  ruleTags: ScoredTag[],
  llmIds: string[],
  audience: ChronicleAudience,
): string[] {
  const allowed = new Set(tagsForAudience(audience).map((t) => t.id));
  const out: string[] = [];
  for (const t of ruleTags.slice(0, 8)) {
    if (!out.includes(t.id)) out.push(t.id);
  }
  for (const id of llmIds) {
    if (!allowed.has(id)) continue;
    if (!out.includes(id)) out.push(id);
  }
  return out.slice(0, 12);
}

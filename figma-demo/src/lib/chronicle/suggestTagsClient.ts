import type { ChronicleAudience } from "./types";

/**
 * Optional BFF assist. Returns [] when offline / unset / failed — rules path still works.
 */
export async function fetchLlmTagSuggestions(opts: {
  audience: ChronicleAudience;
  text: string;
  candidateIds: string[];
}): Promise<string[]> {
  const text = `${opts.text || ""}`.trim();
  if (!text || opts.candidateIds.length === 0) return [];

  try {
    const res = await fetch("/api/bff/chronicle/suggest-tags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        audience: opts.audience,
        text: text.slice(0, 4000),
        candidateIds: opts.candidateIds,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { tagIds?: string[] };
    if (!Array.isArray(data?.tagIds)) return [];
    return data.tagIds.filter((id) => typeof id === "string" && opts.candidateIds.includes(id));
  } catch {
    return [];
  }
}

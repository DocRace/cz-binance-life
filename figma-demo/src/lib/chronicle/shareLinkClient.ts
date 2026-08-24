import { bookBffJson } from "../bookBffClient";

export function chronicleShortPath(code: string): string {
  return `/s/${encodeURIComponent(code)}`;
}

export function chronicleShortUrl(code: string, origin = window.location.origin): string {
  return `${origin.replace(/\/+$/, "")}${chronicleShortPath(code)}`;
}

export function chronicleLongPath(shareToken: string, ref?: string): string {
  const q = new URLSearchParams();
  q.set("share", shareToken);
  if (ref) q.set("ref", ref);
  return `/club/chronicle?${q.toString()}`;
}

export async function mintChronicleShareLink(input: {
  shareToken: string;
  ref?: string;
}): Promise<string | null> {
  const out = await bookBffJson<{ code: string; ref?: string }>("/api/bff/chronicle/share-link", {
    method: "POST",
    body: JSON.stringify({
      shareToken: input.shareToken,
      ref: input.ref,
    }),
  });
  if (out.code !== 0 || !out.data?.code) return null;
  return chronicleShortUrl(out.data.code);
}

export async function resolveChronicleShareLink(code: string): Promise<{
  shareToken: string;
  ref?: string;
} | null> {
  const out = await bookBffJson<{ shareToken: string; ref?: string }>(
    `/api/bff/chronicle/share-link/${encodeURIComponent(code)}`,
  );
  if (out.code !== 0 || !out.data?.shareToken) return null;
  return { shareToken: out.data.shareToken, ref: out.data.ref || undefined };
}

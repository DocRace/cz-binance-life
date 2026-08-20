export type PartnerLogoId = "press" | "hash" | "yafang" | "datadance" | "ipdex" | "hku" | "onebook";

export type PartnerLogoDef = {
  id: PartnerLogoId;
  name: string;
  src?: string;
};

/** Same order as the invite Word brief / invite posters. */
export const INVITE_PARTNER_LOGOS: PartnerLogoDef[] = [
  { id: "press", name: "商務印書館", src: "/invite/assets/commercial-press.png" },
  { id: "hash", name: "HASH GLOBAL", src: "/invite/assets/hash-global.png" },
  { id: "yafang", name: "亞芳創變派", src: "/invite/assets/yafang.png" },
  { id: "datadance", name: "DataDance" },
  { id: "ipdex", name: "IPDEX", src: "/invite/assets/ipdex.png" },
  { id: "hku", name: "香港大學創立方", src: "/invite/assets/hku-icube.png" },
  { id: "onebook", name: "一本讀書會", src: "/invite/assets/onebook.png" },
];

const BY_ID = Object.fromEntries(INVITE_PARTNER_LOGOS.map((p) => [p.id, p])) as Record<
  PartnerLogoId,
  PartnerLogoDef
>;

export function partnerLogoById(id: PartnerLogoId): PartnerLogoDef {
  return BY_ID[id];
}

/** Match event “about partner” cards to a logo, across locales. */
export function partnerLogoIdFromTitle(title: string): PartnerLogoId | null {
  const s = title.toLowerCase();
  if (s.includes("ipdex")) return "ipdex";
  if (s.includes("ddc") || s.includes("datadance")) return "datadance";
  if (
    title.includes("商務") ||
    title.includes("商务") ||
    s.includes("commercial") ||
    s.includes("press") ||
    title.includes("상무")
  ) {
    return "press";
  }
  if (s.includes("hash")) return "hash";
  if (title.includes("亞芳") || title.includes("亚芳") || s.includes("yafang")) return "yafang";
  if (s.includes("hku") || title.includes("創立方") || title.includes("创立方")) return "hku";
  if (title.includes("一本") || s.includes("onebook")) return "onebook";
  return null;
}

/** IPDEX series titles still say “NFT”. Club UI never shows that word. */
export function displayWithoutNft(text: string, language?: string): string {
  const raw = `${text || ""}`;
  if (!/nft/i.test(raw)) return raw;
  const lang = (language || "").toLowerCase();
  const word = lang.startsWith("ja")
    ? "バッジ"
    : lang.startsWith("ko")
      ? "배지"
      : lang.startsWith("en")
        ? "Badge"
        : "徽章";
  return raw
    .replace(/NFT/gi, word)
    .replace(/[ \u3000]{2,}/g, " ")
    .trim();
}

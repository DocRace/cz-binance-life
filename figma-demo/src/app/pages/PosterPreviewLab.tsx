import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildChroniclePosterBlob } from "../../lib/chronicle/invitePoster";

const LANGS = [
  { id: "zh-TW", label: "繁中" },
  { id: "en", label: "EN" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
] as const;

/** Local-only lab: render the share poster with fake book data. */
export default function PosterPreviewLab() {
  const { t, i18n } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setBusy(true);
    setError("");
    void (async () => {
      const blob = await buildChroniclePosterBlob({
        authorName: "Race Li",
        creditLine: t("chronicle.posterBy", { name: "Race Li" }),
        roleId: "diamond-hands",
        gender: "male",
        roleLabel: t("chronicle.roles.diamond-hands.name"),
        publisher: t("chronicle.bookPublisher"),
        keywords: [
          t("chronicle.tagLabels.long_hold"),
          t("chronicle.tagLabels.chase_new"),
          t("chronicle.tagLabels.bluechip_only"),
        ],
        principles: [
          t("chronicle.principleLabels.dont_fetishize_goals"),
          t("chronicle.principleLabels.be_early_adopter"),
          t("chronicle.principleLabels.ship_or_quit"),
        ],
        priceLabel: t("chronicle.posterPrice", { price: "$8,888,888,888" }),
        inviteUrl: "https://czlife.club/club/chronicle",
        title: t("chronicle.bookTitle"),
        subtitle: t("chronicle.kicker"),
        partners: t("chronicle.coverPartners"),
        qrHint: t("chronicle.posterQrHint"),
      });
      if (cancelled) return;
      if (!blob) {
        setError("Poster render failed.");
        setBusy(false);
        return;
      }
      created = URL.createObjectURL(blob);
      setUrl(created);
      setBusy(false);
    })();
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [t, i18n.language]);

  return (
    <div className="min-h-dvh bg-[#161310] px-4 py-6 text-[#f4f1ea]">
      <div className="mx-auto max-w-[560px]">
        <p className="text-xs tracking-wide text-[#c9a76a]">LOCAL PREVIEW</p>
        <h1 className="mt-1 font-serif text-2xl">Chronicle poster lab</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          Fake sample: Race Li · Diamond Hands · $8,888,888,888. This page is only for
          checking layout. Tell me what to change; I will not touch the live result
          page until you say so.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {LANGS.map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => void i18n.changeLanguage(lang.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                i18n.language === lang.id
                  ? "border-[#c9a76a] bg-[#c9a76a]/15 text-[#ddc48e]"
                  : "border-white/20 text-white/70"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/45">1080 × 1350 · 4:5</p>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/40">
          {busy ? (
            <p className="px-4 py-16 text-center text-sm text-white/50">Rendering…</p>
          ) : null}
          {error ? <p className="px-4 py-16 text-center text-sm text-red-300">{error}</p> : null}
          {url && !busy ? (
            <img src={url} alt="Poster preview" className="block w-full" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

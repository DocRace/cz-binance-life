import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Check,
  Copy,
  FlaskConical,
  MessageCircle,
  RefreshCw,
  Share2,
  Sparkles,
  Tag,
  User,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import bookCover from "../../assets/book-cover-hero.png";
import { CHRONICLE_NODE_IDS, CHRONICLE_NODE_YEAR } from "../../lib/chronicle/nodes";
import {
  countFilled,
  distillChronicle,
  getTagCatalog,
  mergeSuggestedTagIds,
  suggestTagsFromEntries,
} from "../../lib/chronicle/distill";
import {
  buildCapsuleHandoffPayload,
  buildLifeCapsuleImportUrl,
} from "../../lib/chronicle/capsuleHandoff";
import { buildShareUrl, decodeSharePayload } from "../../lib/chronicle/shareCodec";
import { fetchLlmTagSuggestions } from "../../lib/chronicle/suggestTagsClient";
import {
  bumpCompletionCount,
  clearDraft,
  getParticipantCount,
  loadDraft,
  saveDraft,
} from "../../lib/chronicle/storage";
import type {
  ChronicleAudience,
  ChronicleResult,
  ChronicleStep,
  ChronicleNodeId,
  UserEntries,
} from "../../lib/chronicle/types";
import {
  CARD_SURFACE,
  CONTENT_NARROW,
  CONTENT_PROSE,
  PAGE_SHELL,
} from "../layout/pageLayout";

export default function CryptoChronicle() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const shareToken = searchParams.get("share");

  const [step, setStep] = useState<ChronicleStep>("intro");
  const [audience, setAudience] = useState<ChronicleAudience>("retail");
  const [entries, setEntries] = useState<UserEntries>({});
  const [openId, setOpenId] = useState<ChronicleNodeId | null>(null);
  const [suggestedIds, setSuggestedIds] = useState<string[]>([]);
  const [confirmedTagIds, setConfirmedTagIds] = useState<string[]>([]);
  const [result, setResult] = useState<ChronicleResult | null>(null);
  const [participants, setParticipants] = useState(getParticipantCount);
  const [copied, setCopied] = useState(false);
  const [wechatHint, setWechatHint] = useState(false);
  const [readOnlyShare, setReadOnlyShare] = useState(false);
  const [distilling, setDistilling] = useState(false);

  const catalog = useMemo(() => getTagCatalog(audience), [audience]);
  const catalogById = useMemo(() => new Map(catalog.map((t) => [t.id, t])), [catalog]);

  useEffect(() => {
    if (shareToken) {
      const decoded = decodeSharePayload(shareToken);
      if (decoded && countFilled(decoded.entries) > 0) {
        const distilled = distillChronicle(
          decoded.entries,
          decoded.audience,
          decoded.confirmedTagIds,
        );
        setAudience(decoded.audience);
        setEntries(decoded.entries);
        setConfirmedTagIds(distilled.confirmedTagIds);
        setSuggestedIds(distilled.tags.map((t) => t.id));
        setResult(distilled);
        setStep("result");
        setReadOnlyShare(true);
        return;
      }
    }
    const draft = loadDraft();
    setAudience(draft.audience);
    setEntries(draft.entries);
    setConfirmedTagIds(draft.confirmedTagIds);
  }, [shareToken]);

  const persist = (
    next: Partial<{ audience: ChronicleAudience; entries: UserEntries; confirmedTagIds: string[] }>,
  ) => {
    const draft = {
      audience: next.audience ?? audience,
      entries: next.entries ?? entries,
      confirmedTagIds: next.confirmedTagIds ?? confirmedTagIds,
    };
    saveDraft(draft);
  };

  const filledCount = useMemo(() => countFilled(entries), [entries]);

  const updateEntry = (id: ChronicleNodeId, value: string) => {
    setEntries((prev) => {
      const next = { ...prev, [id]: value };
      persist({ entries: next });
      return next;
    });
  };

  const goIdentity = () => {
    setReadOnlyShare(false);
    setStep("identity");
  };

  const goFill = (nextAudience: ChronicleAudience) => {
    setAudience(nextAudience);
    persist({ audience: nextAudience });
    setReadOnlyShare(false);
    setStep("fill");
    if (!openId) setOpenId(CHRONICLE_NODE_IDS[0]);
  };

  const runDistillToConfirm = async () => {
    if (filledCount === 0) {
      toast.error(t("chronicle.needOneEntry"));
      return;
    }
    setDistilling(true);
    try {
      const ruleTags = suggestTagsFromEntries(entries, audience);
      const allText = CHRONICLE_NODE_IDS.map((id) => entries[id] || "")
        .filter(Boolean)
        .join("\n");
      const llmIds = await fetchLlmTagSuggestions({
        audience,
        text: allText,
        candidateIds: catalog.map((t) => t.id),
      });
      const merged = mergeSuggestedTagIds(ruleTags, llmIds, audience);
      const preselect = merged.slice(0, 5);
      setSuggestedIds(merged);
      setConfirmedTagIds(preselect);
      persist({ confirmedTagIds: preselect });
      setStep("confirm");
    } finally {
      setDistilling(false);
    }
  };

  const toggleTag = (id: string) => {
    setConfirmedTagIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      persist({ confirmedTagIds: next });
      return next;
    });
  };

  const generateResult = () => {
    if (confirmedTagIds.length === 0) {
      toast.error(t("chronicle.needOneTag"));
      return;
    }
    const distilled = distillChronicle(entries, audience, confirmedTagIds, suggestedIds);
    setResult(distilled);
    setParticipants(bumpCompletionCount());
    setStep("result");
    setReadOnlyShare(false);
    const url = buildShareUrl(audience, entries, distilled.confirmedTagIds);
    const token = new URL(url).searchParams.get("share") || "";
    setSearchParams(token ? { share: token } : {}, { replace: true });
  };

  const resetAll = () => {
    clearDraft();
    setEntries({});
    setResult(null);
    setSuggestedIds([]);
    setConfirmedTagIds([]);
    setOpenId(CHRONICLE_NODE_IDS[0]);
    setReadOnlyShare(false);
    setSearchParams({}, { replace: true });
    setStep("identity");
  };

  const isZhUi = (i18n.resolvedLanguage || i18n.language || "").startsWith("zh");

  const inviteLink = () => `${window.location.origin}/club/chronicle`;

  const resultShareLink = () => {
    const ids = result?.confirmedTagIds || confirmedTagIds;
    return buildShareUrl(audience, entries, ids);
  };

  const buildResultShareText = () => {
    const link = resultShareLink();
    const blank = t("chronicle.shareBlank");
    const myLine = result?.nodes[0]?.text?.slice(0, 40) || t("chronicle.shareMyLifeFallback");
    return isZhUi
      ? t("chronicle.shareTextZh", { myLife: myLine || blank, link })
      : t("chronicle.shareTextEn", { myLife: myLine || blank, link });
  };

  const buildInviteText = () => {
    const link = inviteLink();
    return isZhUi
      ? t("chronicle.shareInviteZh", { link })
      : t("chronicle.shareInviteEn", { link });
  };

  const copyText = async (text: string, okKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t(okKey));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("chronicle.copyFailed"));
    }
  };

  const shareCopy = async () => {
    const text = buildResultShareText();
    const link = resultShareLink();
    try {
      if (navigator.share) {
        await navigator.share({ title: t("chronicle.resultTitle"), text, url: link });
        return;
      }
    } catch {
      /* clipboard */
    }
    await copyText(text, "chronicle.copied");
  };

  const shareToX = () => {
    const text = buildResultShareText();
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("text", text);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  const shareToWechat = async () => {
    setWechatHint(true);
    document.getElementById("chronicle-share-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    await copyText(buildInviteText(), "chronicle.inviteCopied");
  };

  const openLifeCapsule = () => {
    if (!result) return;
    const tagLabels: Record<string, string> = {};
    for (const id of result.confirmedTagIds) {
      const tag = catalogById.get(id) || result.tags.find((x) => x.id === id);
      if (tag) tagLabels[id] = tag.label;
    }
    const nodeTitles: Record<string, string> = {};
    for (const node of result.nodes) {
      nodeTitles[node.nodeId] = t(`chronicle.nodes.${node.nodeId}.title`);
    }
    const payload = buildCapsuleHandoffPayload(result, {
      locale: isZhUi ? "zh" : "en",
      tagLabels,
      nodeTitles,
      shareUrl: resultShareLink(),
    });
    window.open(buildLifeCapsuleImportUrl(payload), "_blank", "noopener,noreferrer");
  };

  const yearLabel = (id: ChronicleNodeId) =>
    t(`chronicle.nodes.${id}.year`, { defaultValue: CHRONICLE_NODE_YEAR[id] });

  return (
    <div className={PAGE_SHELL}>
      <div className={`${CONTENT_PROSE} mb-8`}>
        <Link
          to="/club"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("chronicle.backClub")}
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {step === "intro" && (
          <motion.section
            key="intro"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`${CONTENT_NARROW} text-center`}
          >
            <div className="mx-auto mb-8 w-40 sm:w-48">
              <img
                src={bookCover}
                alt=""
                className="mx-auto h-auto w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
              />
            </div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-gold/80">
              {t("chronicle.kicker")}
            </p>
            <h1 className="font-display text-4xl md:text-5xl mb-4">
              <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                {t("chronicle.decodeCz")}
              </span>
            </h1>
            <p className="mb-2 text-lg text-muted-foreground">{t("chronicle.introLead")}</p>
            <p className="mb-10 text-sm text-muted-foreground/80">
              {t("chronicle.participants", { count: participants })}
            </p>
            <button
              type="button"
              onClick={goIdentity}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gold/90 px-8 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-gold"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {t("chronicle.startCta")}
            </button>
          </motion.section>
        )}

        {step === "identity" && (
          <motion.section
            key="identity"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`${CONTENT_NARROW} text-center`}
          >
            <h1 className="font-display text-3xl md:text-4xl mb-3">
              <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                {t("chronicle.identityTitle")}
              </span>
            </h1>
            <p className="mb-10 text-muted-foreground">{t("chronicle.identityHint")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => goFill("retail")}
                className={`${CARD_SURFACE} flex flex-col items-center gap-3 p-6 text-center transition-colors hover:border-gold/40`}
              >
                <Users className="h-8 w-8 text-gold" aria-hidden />
                <span className="font-display text-xl">{t("chronicle.audienceRetail")}</span>
                <span className="text-sm text-muted-foreground">{t("chronicle.audienceRetailDesc")}</span>
              </button>
              <button
                type="button"
                onClick={() => goFill("founder")}
                className={`${CARD_SURFACE} flex flex-col items-center gap-3 p-6 text-center transition-colors hover:border-gold/40`}
              >
                <Briefcase className="h-8 w-8 text-gold" aria-hidden />
                <span className="font-display text-xl">{t("chronicle.audienceFounder")}</span>
                <span className="text-sm text-muted-foreground">{t("chronicle.audienceFounderDesc")}</span>
              </button>
            </div>
          </motion.section>
        )}

        {step === "fill" && (
          <motion.section
            key="fill"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={CONTENT_PROSE}
          >
            <header className="mb-10 text-center">
              <p className="mb-2 text-xs text-gold/80">
                {audience === "founder" ? t("chronicle.audienceFounder") : t("chronicle.audienceRetail")}
              </p>
              <h1 className="font-display text-3xl md:text-4xl mb-3">
                <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                  {t("chronicle.fillTitle")}
                </span>
              </h1>
              <p className="text-muted-foreground">{t("chronicle.fillHint")}</p>
              <p className="mt-2 text-xs text-muted-foreground/70">
                {t("chronicle.filledProgress", { count: filledCount, total: CHRONICLE_NODE_IDS.length })}
              </p>
            </header>

            <ol className="relative space-y-3 border-l border-gold/25 pl-6 sm:pl-8">
              {CHRONICLE_NODE_IDS.map((id) => {
                const open = openId === id;
                const hasText = Boolean(`${entries[id] || ""}`.trim());
                return (
                  <li key={id} className="relative">
                    <span
                      className={`absolute -left-[1.9rem] sm:-left-[2.4rem] top-3 flex h-3 w-3 rounded-full border ${
                        hasText ? "border-gold bg-gold" : "border-gold/50 bg-background"
                      }`}
                      aria-hidden
                    />
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                        open
                          ? "border-gold/45 bg-gold/10"
                          : "border-border/50 bg-card/25 hover:border-gold/30"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-tech text-xs text-gold/85">{yearLabel(id)}</span>
                        {hasText ? (
                          <span className="text-[11px] text-gold/70">{t("chronicle.savedMark")}</span>
                        ) : null}
                      </div>
                      <div className="mt-1 font-display text-lg text-foreground">
                        {t(`chronicle.nodes.${id}.title`)}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {t(`chronicle.nodes.${id}.event`)}
                      </p>
                    </button>

                    <AnimatePresence initial={false}>
                      {open ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className={`${CARD_SURFACE} p-4`}>
                              <div className="mb-3 flex items-center gap-3">
                                <img
                                  src={bookCover}
                                  alt=""
                                  className="h-10 w-10 rounded-full object-cover ring-1 ring-gold/30"
                                />
                                <div>
                                  <p className="text-xs text-muted-foreground">CZ</p>
                                  <p className="font-display text-base">
                                    {t(`chronicle.nodes.${id}.title`)}
                                  </p>
                                </div>
                              </div>
                              <ul className="space-y-2 text-sm text-muted-foreground">
                                {(() => {
                                  const bullets = t(`chronicle.nodes.${id}.bullets`, {
                                    returnObjects: true,
                                  });
                                  const lines = Array.isArray(bullets)
                                    ? (bullets as string[])
                                    : [t(`chronicle.nodes.${id}.event`)];
                                  return lines.map((line) => (
                                    <li key={line} className="leading-relaxed">
                                      {line}
                                    </li>
                                  ));
                                })()}
                              </ul>
                            </div>

                            <div className={`${CARD_SURFACE} p-4`}>
                              <div className="mb-3 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 ring-1 ring-gold/30">
                                  <User className="h-5 w-5 text-gold" aria-hidden />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    {t("chronicle.yourEventLabel")}
                                  </p>
                                  <p className="font-display text-base">
                                    {t("chronicle.yourEventTitle")}
                                  </p>
                                </div>
                              </div>
                              <label className="sr-only" htmlFor={`entry-${id}`}>
                                {t("chronicle.inputLabel")}
                              </label>
                              <textarea
                                id={`entry-${id}`}
                                value={entries[id] || ""}
                                onChange={(e) => updateEntry(id, e.target.value)}
                                rows={5}
                                maxLength={500}
                                placeholder={t("chronicle.inputPlaceholder")}
                                className="w-full resize-y rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/55 focus:border-gold/50 focus:outline-none"
                              />
                              <div className="mt-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => toast.success(t("chronicle.savedToast"))}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1.5 text-xs text-gold transition-colors hover:bg-gold/10"
                                >
                                  <Check className="h-3.5 w-3.5" aria-hidden />
                                  {t("chronicle.save")}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ol>

            <div className="sticky bottom-4 z-10 mt-10 flex justify-center">
              <button
                type="button"
                disabled={distilling}
                onClick={runDistillToConfirm}
                className="inline-flex items-center gap-2 rounded-full bg-gold/90 px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-lg shadow-black/30 transition-colors hover:bg-gold disabled:opacity-60"
              >
                <FlaskConical className="h-4 w-4" aria-hidden />
                {distilling ? t("chronicle.distilling") : t("chronicle.distillCta")}
              </button>
            </div>
          </motion.section>
        )}

        {step === "confirm" && (
          <motion.section
            key="confirm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={CONTENT_PROSE}
          >
            <header className="mb-8 text-center">
              <h1 className="font-display text-3xl md:text-4xl mb-3">
                <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                  {t("chronicle.confirmTitle")}
                </span>
              </h1>
              <p className="text-muted-foreground">{t("chronicle.confirmHint")}</p>
            </header>

            <div className={`${CARD_SURFACE} mb-6 p-5`}>
              <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                {t("chronicle.suggestedTags")}
              </p>
              <div className="flex flex-wrap gap-2">
                {(suggestedIds.length ? suggestedIds : catalog.slice(0, 12).map((t) => t.id)).map(
                  (id) => {
                    const tag = catalogById.get(id);
                    if (!tag) return null;
                    const on = confirmedTagIds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleTag(id)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          on
                            ? "border-gold bg-gold/20 text-gold"
                            : "border-border/60 text-muted-foreground hover:border-gold/35"
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <details className={`${CARD_SURFACE} mb-10 p-5`}>
              <summary className="cursor-pointer text-sm text-muted-foreground">
                {t("chronicle.moreTags")}
              </summary>
              <div className="mt-4 flex flex-wrap gap-2">
                {catalog
                  .filter((t) => !suggestedIds.includes(t.id))
                  .map((tag) => {
                    const on = confirmedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          on
                            ? "border-gold bg-gold/20 text-gold"
                            : "border-border/50 text-muted-foreground hover:border-gold/30"
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
              </div>
            </details>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setStep("fill")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm hover:border-gold/40"
              >
                {t("chronicle.backFill")}
              </button>
              <button
                type="button"
                onClick={generateResult}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gold/90 px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-gold"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {t("chronicle.generatePrinciples")}
              </button>
            </div>
          </motion.section>
        )}

        {step === "result" && result && (
          <motion.section
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={CONTENT_PROSE}
          >
            <header className="mb-10 text-center">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-gold/80">
                {t("chronicle.resultKicker")}
              </p>
              <h1 className="font-display text-3xl md:text-4xl mb-4">
                <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                  {t("chronicle.resultTitle")}
                </span>
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {result.principles.map((p) => (
                  <span
                    key={p.name}
                    className="inline-flex items-center gap-1 rounded-full border border-gold/35 bg-gold/10 px-3 py-1 text-xs text-gold"
                  >
                    <Tag className="h-3 w-3" aria-hidden />
                    {p.name}
                  </span>
                ))}
              </div>
            </header>

            <div className={`${CARD_SURFACE} mb-8 p-6 sm:p-8`}>
              <h2 className="mb-6 flex items-center gap-2 font-display text-xl">
                <BookOpen className="h-5 w-5 text-gold" aria-hidden />
                {t("chronicle.myTimeline")}
              </h2>
              <div className="space-y-6">
                {result.nodes.map((node) => (
                  <div key={node.nodeId} className="border-l border-gold/30 pl-4">
                    <p className="font-tech text-xs text-gold/80">--{yearLabel(node.nodeId)}--</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/95">
                      {node.text}
                    </p>
                    {node.keywords.length > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("chronicle.keywords")}: {node.keywords.join(" / ")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className={`${CARD_SURFACE} mb-8 p-6 sm:p-8`}>
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl">
                <Tag className="h-5 w-5 text-gold" aria-hidden />
                {t("chronicle.behaviorTags")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {result.confirmedTagIds.map((id) => {
                  const tag = catalogById.get(id) || result.tags.find((x) => x.id === id);
                  return (
                    <span
                      key={id}
                      className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold"
                    >
                      {tag?.label || id}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className={`${CARD_SURFACE} mb-10 p-6 sm:p-8`}>
              <h2 className="mb-6 flex items-center gap-2 font-display text-xl">
                <Sparkles className="h-5 w-5 text-gold" aria-hidden />
                {t("chronicle.matchedPrinciples")}
              </h2>
              <ol className="space-y-5">
                {result.principles.map((p, idx) => (
                  <li key={p.name}>
                    <p className="font-display text-lg text-gold">
                      {t("chronicle.principleN", { n: idx + 1 })}：{p.name}
                    </p>
                    {p.note ? (
                      <p className="mt-1 text-sm text-muted-foreground">{p.note}</p>
                    ) : null}
                    {p.fromTags.length > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground/80">
                        {t("chronicle.fromTags")}: {p.fromTags.join(" / ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>

            <div
              id="chronicle-share-card"
              className="mb-10 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-b from-[#3d3832] to-[#2a2622] p-6 sm:p-8"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/20 ring-1 ring-gold/40">
                  <User className="h-6 w-6 text-gold" aria-hidden />
                </div>
                <div>
                  <p className="font-display text-lg">{t("chronicle.shareCardTitle")}</p>
                  <p className="text-xs text-muted-foreground">{t("chronicle.shareCardSub")}</p>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {result.principles.map((p) => (
                  <span
                    key={`tag-${p.name}`}
                    className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] text-gold-light"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
              <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                {t("chronicle.shareCardCzLife")}
              </p>
              <div className="space-y-3 text-sm">
                {result.nodes.slice(0, 4).map((node) => (
                  <div key={`share-${node.nodeId}`} className="grid grid-cols-[4.5rem_1fr] gap-2">
                    <span className="font-tech text-gold/80">{yearLabel(node.nodeId)}</span>
                    <span className="line-clamp-2 text-foreground/90">{node.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {wechatHint ? (
              <p className="mb-4 text-center text-xs text-muted-foreground">{t("chronicle.shareWechatHint")}</p>
            ) : null}

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <button
                type="button"
                onClick={shareToX}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/50 px-6 py-3 text-sm text-gold transition-colors hover:bg-gold/10"
              >
                <Share2 className="h-4 w-4" aria-hidden />
                {t("chronicle.shareXCta")}
              </button>
              <button
                type="button"
                onClick={() => void shareToWechat()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/50 px-6 py-3 text-sm text-gold transition-colors hover:bg-gold/10"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                {t("chronicle.shareWechatCta")}
              </button>
              <button
                type="button"
                onClick={() => void shareCopy()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm transition-colors hover:border-gold/40 hover:bg-gold/10"
              >
                {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {t("chronicle.shareCta")}
              </button>
              <button
                type="button"
                onClick={openLifeCapsule}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gold/90 px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-gold"
              >
                {t("chronicle.capsuleCta")}
              </button>
              {!readOnlyShare ? (
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm transition-colors hover:border-gold/40 hover:bg-gold/10"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  {t("chronicle.againCta")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchParams({}, { replace: true });
                    setReadOnlyShare(false);
                    setStep("intro");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm transition-colors hover:border-gold/40 hover:bg-gold/10"
                >
                  {t("chronicle.createMine")}
                </button>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

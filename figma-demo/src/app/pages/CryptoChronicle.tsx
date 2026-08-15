import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Check,
  Copy,
  FlaskConical,
  MessageCircle,
  ExternalLink,
  Pencil,
  RefreshCw,
  Share2,
  Sparkles,
  Tag,
  Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import bookCover from "../../assets/book-cover-hero.png";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { SiteNavDrawer, SiteNavMenuButton } from "../components/SiteNavDrawer";
import ChronicleBookCover from "../components/ChronicleBookCover";
import ChronicleRankModal from "../components/ChronicleRankModal";
import {
  enrollRankEntry,
  fetchRankConfig,
  fetchRankEntry,
  isRankCampaignLive,
  isRankVotingOpen,
  shareTokenFromUrl,
  type RankConfig,
  type RankEntry,
} from "../../lib/chronicle/rankClient";
import { CHRONICLE_NODE_IDS, CHRONICLE_NODE_YEAR } from "../../lib/chronicle/nodes";
import {
  countFilled,
  distillChronicle,
  getTagCatalog,
  mergeSuggestedTagIds,
  suggestTagsFromEntries,
} from "../../lib/chronicle/distill";
import { localizedBehaviorTagLabel } from "../../lib/chronicle/tagI18n";
import {
  buildCapsuleHandoffPayload,
  buildLifeCapsuleImportUrl,
  getLifeCapsuleOrigin,
} from "../../lib/chronicle/capsuleHandoff";
import { bookBffJson } from "../../lib/bookBffClient";
import ChronicleSignedNftClaimModal from "../components/ChronicleSignedNftClaimModal";
import { buildShareUrl, decodeSharePayload } from "../../lib/chronicle/shareCodec";
import { fetchLlmTagSuggestions } from "../../lib/chronicle/suggestTagsClient";
import {
  bumpCompletionCount,
  clearDraft,
  getParticipantCount,
  loadDraft,
  resumeStepFromDraft,
  saveDraft,
  type ChronicleDraft,
} from "../../lib/chronicle/storage";
import {
  AVATAR_GENDER_IDS,
  DEFAULT_AVATAR_GENDER,
  preloadRolePack,
  type AvatarGenderId,
} from "../../lib/chronicle/roleArt";
import {
  AVATAR_ROLE_IDS,
  audienceForRole,
  type AvatarRoleId,
  type AvatarStyleId,
} from "../../lib/chronicle/roles";
import { DEFAULT_AVATAR_STYLE } from "../../lib/chronicle/roleVisuals";
import { computeChroniclePrice, formatUsdt, isChroniclePriceHigh } from "../../lib/chronicle/pricing";
import RoleAvatar from "../components/RoleAvatar";
import type {
  ChronicleAudience,
  ChronicleResult,
  ChronicleStep,
  ChronicleNodeId,
  UserEntries,
} from "../../lib/chronicle/types";
/** H5 viral shell — phone-width stage, soft card sheets (Life Capsule quiz vibe). */
const H5_RADIUS = "rounded-[1.75rem]";
const H5_STAGE =
  "relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]";
const H5_CARD =
  `${H5_RADIUS} border border-gold/20 bg-[#2c2824]/92 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md`;
const H5_PANEL =
  `${H5_RADIUS} border border-white/8 bg-black/20 p-4 sm:p-5`;
/** Single-line fields / gender chips — capsule (pill) shape. */
const H5_CAPSULE_INPUT =
  "w-full rounded-full border border-border bg-input-background px-5 py-3 text-sm outline-none transition-colors focus:border-gold/50";
const H5_CAPSULE_TRACK =
  "flex w-full gap-1 rounded-full border border-border/60 bg-black/25 p-1";
const H5_SELECT_CARD =
  `${H5_RADIUS} w-full border px-4 py-3 text-left transition-colors`;
/** Fixed height — do not grow on focus (mobile keyboard + toast visibility). */
const H5_TEXTAREA =
  `${H5_RADIUS} h-[6.5rem] w-full resize-none overflow-y-auto border border-border bg-input-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/55 outline-none focus:border-gold/50`;
const H5_CTA =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-light px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_28px_rgba(240,185,11,0.28)] transition-transform active:scale-[0.98]";
const H5_CTA_GHOST =
  "inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-6 py-3 text-sm text-gold transition-colors active:bg-gold/10";

const MAX_PICK = 3;

function togglePick(list: string[], id: string, max = MAX_PICK): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  if (list.length >= max) return list;
  return [...list, id];
}

export default function CryptoChronicle() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const shareToken = searchParams.get("share");
  /** Only hydrate read-only share from the URL we landed with — not tokens we write ourselves. */
  const landedShareRef = useRef<string | null>(shareToken);

  const [step, setStep] = useState<ChronicleStep>("intro");
  const [audience, setAudience] = useState<ChronicleAudience>("retail");
  const [entries, setEntries] = useState<UserEntries>({});
  const [openId, setOpenId] = useState<ChronicleNodeId | null>(null);
  const [confirmedTagIds, setConfirmedTagIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedPrinciples, setSelectedPrinciples] = useState<string[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [roleId, setRoleId] = useState<AvatarRoleId | null>(null);
  const [styleId, setStyleId] = useState<AvatarStyleId>(DEFAULT_AVATAR_STYLE);
  const [gender, setGender] = useState<AvatarGenderId>(DEFAULT_AVATAR_GENDER);
  const [result, setResult] = useState<ChronicleResult | null>(null);
  const [participants, setParticipants] = useState(getParticipantCount);
  const [copied, setCopied] = useState(false);
  const [wechatHint, setWechatHint] = useState(false);
  /** Intro hero: cycle pack avatars on the 3D book. */
  const [showcaseRoleIdx, setShowcaseRoleIdx] = useState(0);
  const [showcaseGender, setShowcaseGender] = useState<AvatarGenderId>("male");
  const [readOnlyShare, setReadOnlyShare] = useState(false);
  const [distilling, setDistilling] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(false);
  const [rankCfg, setRankCfg] = useState<RankConfig | null>(null);
  const [rankEntry, setRankEntry] = useState<RankEntry | null>(null);
  const [rankModalOpen, setRankModalOpen] = useState(false);
  const [capsuleOpened, setCapsuleOpened] = useState(() => {
    try {
      return localStorage.getItem("czlife.chronicle.capsuleOpened.v1") === "1";
    } catch {
      return false;
    }
  });
  const [czLoggedIn, setCzLoggedIn] = useState(false);
  const [nftClaimOpen, setNftClaimOpen] = useState(false);
  const [siteNavOpen, setSiteNavOpen] = useState(false);

  const catalog = useMemo(() => getTagCatalog(audience), [audience]);
  const rankEntryParam = searchParams.get("rankEntry");
  const rankLive = isRankCampaignLive(rankCfg);
  const rankVoting = isRankVotingOpen(rankCfg);
  const catalogById = useMemo(() => new Map(catalog.map((x) => [x.id, x])), [catalog]);

  const persist = (patch: Partial<ChronicleDraft>) => {
    const draft: ChronicleDraft = {
      audience: patch.audience ?? audience,
      entries: patch.entries ?? entries,
      confirmedTagIds: patch.confirmedTagIds ?? confirmedTagIds,
      authorName: patch.authorName ?? authorName,
      roleId: patch.roleId === undefined ? roleId : patch.roleId,
      styleId: patch.styleId ?? styleId,
      gender: patch.gender ?? gender,
      selectedTagIds: patch.selectedTagIds ?? selectedTagIds,
      selectedPrinciples: patch.selectedPrinciples ?? selectedPrinciples,
      step: patch.step ?? step,
    };
    saveDraft(draft);
  };

  useEffect(() => {
    const inbound = landedShareRef.current;
    const draft = loadDraft();
    const resume = resumeStepFromDraft(draft);

    if (shareToken && inbound && shareToken === inbound) {
      landedShareRef.current = null;
      const decoded = decodeSharePayload(shareToken);
      if (decoded && countFilled(decoded.entries) > 0) {
        const own =
          Boolean(resume) &&
          `${decoded.authorName || ""}` === `${draft.authorName || ""}` &&
          (decoded.roleId || null) === (draft.roleId || null);
        if (!own) {
          const distilled = distillChronicle(
            decoded.entries,
            decoded.audience,
            decoded.confirmedTagIds,
          );
          setAudience(decoded.audience);
          setEntries(decoded.entries);
          setConfirmedTagIds(distilled.confirmedTagIds);
          setSelectedTagIds(
            decoded.selectedTagIds?.length
              ? decoded.selectedTagIds
              : distilled.confirmedTagIds.slice(0, MAX_PICK),
          );
          setSelectedPrinciples(
            decoded.selectedPrinciples?.length
              ? decoded.selectedPrinciples
              : distilled.principles.slice(0, MAX_PICK).map((p) => p.name),
          );
          setAuthorName(decoded.authorName || "");
          setRoleId(decoded.roleId || null);
          setStyleId(decoded.styleId || DEFAULT_AVATAR_STYLE);
          setGender(decoded.gender || draft.gender || DEFAULT_AVATAR_GENDER);
          setResult(distilled);
          setStep(decoded.price != null ? "book" : "result");
          setReadOnlyShare(true);
          return;
        }
      }
    }

    setAudience(draft.audience);
    setEntries(draft.entries);
    setConfirmedTagIds(draft.confirmedTagIds);
    setAuthorName(draft.authorName);
    setRoleId(draft.roleId);
    setStyleId(draft.styleId || DEFAULT_AVATAR_STYLE);
    setGender(draft.gender || DEFAULT_AVATAR_GENDER);
    setSelectedTagIds(draft.selectedTagIds);
    setSelectedPrinciples(draft.selectedPrinciples);
    setReadOnlyShare(false);

    if (resume === "result" || resume === "book") {
      const distilled = distillChronicle(
        draft.entries,
        draft.audience,
        draft.confirmedTagIds.length
          ? draft.confirmedTagIds
          : draft.selectedTagIds,
      );
      setConfirmedTagIds(distilled.confirmedTagIds);
      setResult(distilled);
      if (!draft.selectedTagIds.length) {
        setSelectedTagIds(distilled.confirmedTagIds.slice(0, MAX_PICK));
      }
      if (!draft.selectedPrinciples.length) {
        setSelectedPrinciples(distilled.principles.slice(0, MAX_PICK).map((p) => p.name));
      }
      setStep(resume);
      return;
    }
    if (resume === "fill" || resume === "author") {
      setStep(resume);
    }
  }, [shareToken]);

  useEffect(() => {
    void fetchRankConfig().then(setRankCfg);
  }, []);

  useEffect(() => {
    if (!rankEntryParam || !rankLive) return;
    void fetchRankEntry(rankEntryParam).then((e) => {
      if (e) setRankEntry(e);
    });
  }, [rankEntryParam, rankLive]);

  useEffect(() => {
    if (step !== "intro") return;
    preloadRolePack(AVATAR_ROLE_IDS);
    const timer = window.setInterval(() => {
      setShowcaseRoleIdx((i) => {
        const next = (i + 1) % AVATAR_ROLE_IDS.length;
        if (next === 0) {
          setShowcaseGender((g) => (g === "male" ? "female" : "male"));
        }
        return next;
      });
    }, 2600);
    return () => window.clearInterval(timer);
  }, [step]);

  const showcaseRoleId = AVATAR_ROLE_IDS[showcaseRoleIdx] ?? AVATAR_ROLE_IDS[0];

  const filledCount = useMemo(() => countFilled(entries), [entries]);

  const pricing = useMemo(() => {
    if (!result) return null;
    return computeChroniclePrice({
      entries,
      role: roleId,
      principles: result.principles,
      selectedPrincipleCount: selectedPrinciples.length || result.principles.length,
    });
  }, [entries, roleId, result, selectedPrinciples.length]);

  /** Always offer at least a catalog of tags so the 3-keyword picker can show. */
  const keywordChoices = useMemo(() => {
    if (!result) return [] as { id: string; label: string }[];
    const seen = new Set<string>();
    const out: { id: string; label: string }[] = [];
    const push = (id: string, fallback: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      out.push({ id, label: localizedBehaviorTagLabel(id, fallback, t) });
    };
    for (const tag of result.tags) push(tag.id, tag.label);
    for (const tag of catalog) {
      push(tag.id, tag.label);
      if (out.length >= 12) break;
    }
    return out;
  }, [result, catalog, t]);

  const coverKeywords = useMemo(() => {
    return selectedTagIds
      .map((id) => {
        const fallback =
          catalogById.get(id)?.label || result?.tags.find((x) => x.id === id)?.label || "";
        return localizedBehaviorTagLabel(id, fallback, t);
      })
      .filter(Boolean)
      .slice(0, MAX_PICK);
  }, [selectedTagIds, catalogById, result, t]);

  const updateEntry = (id: ChronicleNodeId, value: string) => {
    setEntries((prev) => {
      const next = { ...prev, [id]: value };
      persist({ entries: next });
      return next;
    });
  };

  const goAuthor = () => {
    setReadOnlyShare(false);
    setStep("author");
    persist({ step: "author" });
  };

  const goFill = () => {
    if (!roleId) {
      toast.error(t("chronicle.needRole"));
      return;
    }
    if (!authorName.trim()) {
      toast.error(t("chronicle.needAuthorName"));
      return;
    }
    const nextAudience = audienceForRole(roleId);
    setAudience(nextAudience);
    persist({
      audience: nextAudience,
      roleId,
      authorName: authorName.trim(),
      styleId,
      gender,
      step: "fill",
    });
    setReadOnlyShare(false);
    setStep("fill");
    if (!openId) setOpenId(CHRONICLE_NODE_IDS[0]);
  };

  const shareEncodeBase = () => ({
    audience,
    entries,
    confirmedTagIds: result?.confirmedTagIds || confirmedTagIds,
    authorName,
    roleId,
    styleId,
    gender,
    selectedTagIds,
    selectedPrinciples,
    price: pricing?.price,
  });

  const runDistillToResult = async () => {
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
        candidateIds: catalog.map((x) => x.id),
      });
      const mergedRaw = mergeSuggestedTagIds(ruleTags, llmIds, audience);
      const merged =
        mergedRaw.length > 0
          ? mergedRaw
          : catalog.slice(0, 8).map((x) => x.id);
      const preselect = merged.slice(0, 8);
      setConfirmedTagIds(preselect);
      const distilled = distillChronicle(entries, audience, preselect, merged);
      const tagPick = preselect.slice(0, MAX_PICK);
      const principlePick = distilled.principles.slice(0, MAX_PICK).map((p) => p.name);
      setSelectedTagIds(tagPick);
      setSelectedPrinciples(principlePick);
      persist({
        confirmedTagIds: preselect,
        selectedTagIds: tagPick,
        selectedPrinciples: principlePick,
        step: "result",
      });
      setResult(distilled);
      setParticipants(bumpCompletionCount());
      setStep("result");
      setReadOnlyShare(false);
      const url = buildShareUrl({
        audience,
        entries,
        confirmedTagIds: distilled.confirmedTagIds,
        authorName,
        roleId,
        styleId,
        gender,
        selectedTagIds: tagPick,
        selectedPrinciples: principlePick,
      });
      const token = new URL(url).searchParams.get("share") || "";
      setSearchParams(token ? { share: token } : {}, { replace: true });
    } finally {
      setDistilling(false);
    }
  };

  const bindBook = () => {
    if (!result || !pricing) return;
    const tagChoices = keywordChoices.length;
    const principleCandidates = result.principles.length;
    if (tagChoices >= MAX_PICK && selectedTagIds.length < MAX_PICK) {
      toast.error(t("chronicle.needThreeTags"));
      return;
    }
    if (principleCandidates >= MAX_PICK && selectedPrinciples.length < MAX_PICK) {
      toast.error(t("chronicle.needThreePrinciples"));
      return;
    }
    persist({ selectedTagIds, selectedPrinciples, step: "book" });
    const url = buildShareUrl(shareEncodeBase());
    const token = new URL(url).searchParams.get("share") || "";
    setSearchParams(token ? { share: token } : {}, { replace: true });
    setStep("book");
  };

  const resetAll = () => {
    clearDraft();
    setEntries({});
    setResult(null);
    setConfirmedTagIds([]);
    setSelectedTagIds([]);
    setSelectedPrinciples([]);
    setAuthorName("");
    setRoleId(null);
    setStyleId(DEFAULT_AVATAR_STYLE);
    setGender(DEFAULT_AVATAR_GENDER);
    setOpenId(CHRONICLE_NODE_IDS[0]);
    setReadOnlyShare(false);
    landedShareRef.current = null;
    setSearchParams({}, { replace: true });
    setStep("author");
    persist({
      entries: {},
      confirmedTagIds: [],
      selectedTagIds: [],
      selectedPrinciples: [],
      authorName: "",
      roleId: null,
      step: "author",
    });
  };

  const isZhUi = (i18n.resolvedLanguage || i18n.language || "").startsWith("zh");

  const inviteLink = () => `${window.location.origin}/club/chronicle`;

  const selectedTagLabels = () =>
    selectedTagIds
      .map((id) => {
        const fallback =
          catalogById.get(id)?.label || result?.tags.find((x) => x.id === id)?.label || id;
        return localizedBehaviorTagLabel(id, fallback, t);
      })
      .filter(Boolean);

  const resultShareLink = () => {
    const url = new URL(buildShareUrl(shareEncodeBase()));
    if (rankEntry?.entryId) url.searchParams.set("rankEntry", rankEntry.entryId);
    return url.toString();
  };

  useEffect(() => {
    if (step !== "book" || !rankVoting || !result || !authorName.trim()) return;
    const token = shareToken || shareTokenFromUrl(buildShareUrl(shareEncodeBase()));
    if (!token) return;
    let cancelled = false;
    void enrollRankEntry({
      shareToken: token,
      authorName: authorName.trim(),
      roleId,
      styleId,
      price: pricing?.price,
      tags: selectedTagLabels(),
    }).then((entry) => {
      if (!cancelled && entry) setRankEntry(entry);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enroll on book step inputs
  }, [
    step,
    rankVoting,
    result,
    authorName,
    roleId,
    styleId,
    pricing?.price,
    shareToken,
    selectedTagIds.join("|"),
  ]);

  const buildResultShareText = () => {
    const link = resultShareLink();
    const ticker = authorName.trim() || t("chronicle.shareBlank");
    if (rankVoting) {
      return isZhUi
        ? t("chronicle.rank.shareTextZh", { ticker, link })
        : t("chronicle.rank.shareTextEn", { ticker, link });
    }
    const tags = selectedTagLabels().join("、") || t("chronicle.shareBlank");
    const price = formatUsdt(pricing?.price ?? 0);
    const high = isChroniclePriceHigh(pricing?.price ?? 0);
    if (isZhUi) {
      return high
        ? t("chronicle.shareTextHighZh", { tags, price, link })
        : t("chronicle.shareTextLowZh", { tags, price, link });
    }
    return high
      ? t("chronicle.shareTextHighEn", { tags, price, link })
      : t("chronicle.shareTextLowEn", { tags, price, link });
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

  const refreshCzSession = async () => {
    try {
      const s = await bookBffJson<{ authenticated?: boolean }>("/api/bff/auth/session");
      const ok = s.code === 0 && Boolean(s.data?.authenticated);
      setCzLoggedIn(ok);
      return ok;
    } catch {
      setCzLoggedIn(false);
      return false;
    }
  };

  useEffect(() => {
    if (step !== "book") return;
    void refreshCzSession();
  }, [step]);

  /** No server validation — opening Life Capsules counts as sealed. */
  const openLifeCapsule = () => {
    let url = getLifeCapsuleOrigin();
    if (result) {
      try {
        const tagLabels: Record<string, string> = {};
        for (const id of selectedTagIds.length ? selectedTagIds : result.confirmedTagIds) {
          const tag = catalogById.get(id) || result.tags.find((x) => x.id === id);
          if (tag) tagLabels[id] = localizedBehaviorTagLabel(id, tag.label, t);
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
          authorName,
          priceUsdt: pricing?.price,
          selectedTagIds,
          selectedPrinciples,
        });
        url = buildLifeCapsuleImportUrl(payload);
      } catch {
        url = getLifeCapsuleOrigin();
      }
    }
    window.open(url, "_blank", "noopener,noreferrer");
    setCapsuleOpened(true);
    try {
      localStorage.setItem("czlife.chronicle.capsuleOpened.v1", "1");
    } catch {
      /* ignore */
    }
    // Logged-in CZ users keep local draft as the durable copy for now.
    persist({});
    toast.success(t("chronicle.lifeCapsuleOpened"));
  };

  const yearLabel = (id: ChronicleNodeId) =>
    t(`chronicle.nodes.${id}.year`, { defaultValue: CHRONICLE_NODE_YEAR[id] });

  const displayName = authorName.trim() || t("chronicle.anonymousAuthor");

  return (
    <div className="relative min-h-dvh bg-[#1a1714] text-foreground">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-gold/15 blur-[90px]" />
        <div className="absolute -right-16 bottom-24 h-80 w-80 rounded-full bg-amber-700/20 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_55%)]" />
      </div>

      <div className={H5_STAGE}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <LanguageSwitcher />
          <SiteNavMenuButton open={siteNavOpen} onClick={() => setSiteNavOpen(true)} />
        </div>
        <SiteNavDrawer
          open={siteNavOpen}
          onOpenChange={setSiteNavOpen}
          layoutId="activeChronicleNav"
          showLanguageSwitcher={false}
        />

      <AnimatePresence mode="wait">
        {step === "intro" && (
          <section key="intro" className="flex flex-1 flex-col">
            {/*
              One continuous card (no backdrop-blur — filter flattens 3D).
              Shared padding so the book does not split the sheet.
            */}
            <div className={`${H5_CARD} flex flex-1 flex-col overflow-visible bg-[#2c2824]/96 px-5 pb-6 pt-5 text-center`}>
              <p className="mb-3 text-[11px] font-medium text-gold/75">
                {t("chronicle.partnerKicker")}
              </p>
              <h1 className="mb-3 font-display text-[1.85rem] leading-tight">
                <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                  {t("chronicle.decodeCz")}
                </span>
              </h1>
              <p className="mb-2 text-[15px] leading-relaxed text-muted-foreground">
                {t("chronicle.introLead")}
              </p>
              <p className="mb-4 text-xs text-muted-foreground/75">
                {t("chronicle.participants", { count: participants })}
              </p>
              <div className="mb-5">
                <ChronicleBookCover
                  authorName=""
                  roleId={showcaseRoleId}
                  gender={showcaseGender}
                />
              </div>
              <div className="mt-auto space-y-3">
                <button type="button" onClick={goAuthor} className={H5_CTA}>
                  <Sparkles className="h-4 w-4" aria-hidden />
                  {t("chronicle.startCta")}
                </button>
                {rankLive ? (
                  <Link to="/club/chronicle/rank" className={H5_CTA_GHOST}>
                    <Trophy className="h-4 w-4" aria-hidden />
                    {t("chronicle.rank.publicBoardCta")}
                  </Link>
                ) : null}
                <p className="text-[11px] text-muted-foreground/65">{t("chronicle.h5Credit")}</p>
              </div>
            </div>
          </section>
        )}

        {step === "author" && (
          <motion.section
            key="author"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex flex-1 flex-col pb-4"
          >
            <header className="mb-4 text-center px-1">
              <h1 className="font-display text-2xl mb-2">
                <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                  {t("chronicle.authorTitle")}
                </span>
              </h1>
              <p className="text-sm text-muted-foreground">{t("chronicle.authorHint")}</p>
            </header>

            <label className="mb-2 block text-sm text-gold/85" htmlFor="author-name">
              {t("chronicle.authorNameLabel")}
            </label>
            <input
              id="author-name"
              value={authorName}
              onChange={(e) => {
                setAuthorName(e.target.value);
                persist({ authorName: e.target.value });
              }}
              maxLength={40}
              placeholder={t("chronicle.authorNamePlaceholder")}
              className={`mb-5 ${H5_CAPSULE_INPUT}`}
            />

            <div className="mb-5">
              <p className="mb-3 text-sm text-gold/85">{t("chronicle.genderPick")}</p>
              <div className={H5_CAPSULE_TRACK} role="radiogroup" aria-label={t("chronicle.genderPick")}>
                {AVATAR_GENDER_IDS.map((g) => {
                  const active = gender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setGender(g);
                        persist({ gender: g });
                      }}
                      className={`flex-1 rounded-full px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-gold/15 text-gold ring-1 ring-gold/45"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t(`chronicle.gender.${g}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-8">
              <p className="mb-3 text-sm text-gold/85">{t("chronicle.rolePick")}</p>
              <div className="grid gap-2.5">
                {AVATAR_ROLE_IDS.map((id) => {
                  const active = roleId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setRoleId(id);
                        const nextAudience = audienceForRole(id);
                        setAudience(nextAudience);
                        persist({
                          roleId: id,
                          audience: nextAudience,
                          styleId: DEFAULT_AVATAR_STYLE,
                          gender,
                        });
                        setStyleId(DEFAULT_AVATAR_STYLE);
                      }}
                      className={`${H5_SELECT_CARD} ${
                        active
                          ? "border-gold/50 bg-gold/10"
                          : "border-border/50 bg-card/25 hover:border-gold/30"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <RoleAvatar roleId={id} gender={gender} size="md" />
                        <span className="font-display text-base">
                          {t(`chronicle.roles.${id}.name`)}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {t(`chronicle.roles.${id}.desc`)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sticky bottom-2 z-10 mt-auto bg-gradient-to-t from-[#1a1714] via-[#1a1714]/95 to-transparent pt-4">
              <button type="button" onClick={goFill} className={H5_CTA}>
                {t("chronicle.authorContinue")}
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
            className="flex flex-1 flex-col"
          >
            <header className="mb-5 text-center px-1">
              <p className="mb-2 text-xs text-gold/80">
                {roleId ? t(`chronicle.roles.${roleId}.name`) : t("chronicle.kicker")}
              </p>
              <h1 className="font-display text-2xl mb-2">
                <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                  {t("chronicle.fillTitle")}
                </span>
              </h1>
              <p className="text-sm text-muted-foreground">{t("chronicle.fillHint")}</p>
              <p className="mt-2 text-xs text-muted-foreground/70">
                {t("chronicle.filledProgress", { count: filledCount, total: CHRONICLE_NODE_IDS.length })}
              </p>
            </header>

            <ol className="relative space-y-2.5 border-l border-gold/25 pl-5">
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
                      className={`${H5_SELECT_CARD} ${
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
                    </button>

                    <AnimatePresence initial={false}>
                      {open ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 grid gap-2.5">
                            <div className={`${H5_PANEL} p-4`}>
                              <div className="mb-3 flex items-center gap-3">
                                <img
                                  src={bookCover}
                                  alt=""
                                  className="h-10 w-10 rounded-full object-cover ring-1 ring-gold/30"
                                />
                                <div>
                                  <p className="font-display text-base">
                                    {t(`chronicle.nodes.${id}.title`)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">CZ</p>
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

                            <div className={`${H5_PANEL} p-4`}>
                              <div className="mb-3 flex items-center gap-3">
                                <RoleAvatar roleId={roleId} gender={gender} size="sm" />
                                <div>
                                  <p className="font-display text-base">
                                    {t("chronicle.yourEventTitle")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{displayName}</p>
                                </div>
                              </div>
                              <label className="sr-only" htmlFor={`entry-${id}`}>
                                {t("chronicle.inputLabel")}
                              </label>
                              <textarea
                                id={`entry-${id}`}
                                value={entries[id] || ""}
                                onChange={(e) => updateEntry(id, e.target.value)}
                                rows={3}
                                maxLength={500}
                                placeholder={t("chronicle.inputPlaceholder")}
                                className={H5_TEXTAREA}
                              />
                              <div className="mt-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const active = document.activeElement;
                                    if (active instanceof HTMLElement) active.blur();
                                    toast.success(t("chronicle.savedToast"), {
                                      position: "bottom-center",
                                    });
                                  }}
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

            <div className="sticky bottom-2 z-10 mt-8 bg-gradient-to-t from-[#1a1714] via-[#1a1714]/95 to-transparent pt-4">
              <button
                type="button"
                disabled={distilling}
                onClick={() => void runDistillToResult()}
                className={`${H5_CTA} disabled:opacity-60`}
              >
                <FlaskConical className="h-4 w-4" aria-hidden />
                {distilling ? t("chronicle.distilling") : t("chronicle.distillCta")}
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
            className="flex flex-1 flex-col"
          >
            <header className="mb-5 text-center px-1">
              <h1 className="font-display text-2xl mb-3">
                <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                  {t("chronicle.resultTitle")}
                </span>
              </h1>
              <div className="inline-flex items-center gap-3 rounded-full border border-gold/30 bg-gold/10 py-2 pl-2 pr-4">
                <RoleAvatar roleId={roleId} gender={gender} size="sm" />
                {editingAuthor && !readOnlyShare ? (
                  <input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    onBlur={() => {
                      setEditingAuthor(false);
                      persist({ authorName });
                    }}
                    className="bg-transparent text-sm focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <span className="text-sm">{displayName}</span>
                )}
                {!readOnlyShare ? (
                  <button
                    type="button"
                    onClick={() => setEditingAuthor(true)}
                    className="text-gold/80 hover:text-gold"
                    aria-label={t("chronicle.editAuthor")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </header>

            {keywordChoices.length > 0 ? (
              <div className={`${H5_PANEL} mb-4 p-4`}>
                <h2 className="mb-2 font-display text-xl">{t("chronicle.lifeTagsTitle")}</h2>
                <p className="mb-4 text-sm text-muted-foreground">{t("chronicle.lifeTagsHint")}</p>
                <div className="flex flex-wrap gap-2">
                  {keywordChoices.map((tag) => {
                    const on = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        disabled={readOnlyShare}
                        onClick={() => {
                          const next = togglePick(selectedTagIds, tag.id);
                          setSelectedTagIds(next);
                          persist({ selectedTagIds: next, step: "result" });
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          on
                            ? "border-gold bg-gold/15 text-gold"
                            : "border-border text-muted-foreground hover:border-gold/40"
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className={`${H5_PANEL} mb-4 p-4`}>
              <h2 className="mb-2 flex items-center gap-2 font-display text-xl">
                <BookOpen className="h-5 w-5 text-gold" aria-hidden />
                {t("chronicle.myTimeline")}
              </h2>
              <p className="mb-6 text-xs text-muted-foreground">{t("chronicle.timelineEditHint")}</p>
              <div className="space-y-3">
                {result.nodes.map((node) => (
                  <div key={node.nodeId} className="relative border-l border-gold/30 pl-4">
                    <div className={`${H5_SELECT_CARD} border-border/50 bg-card/25`}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-tech text-xs text-gold/80">{yearLabel(node.nodeId)}</p>
                        {!readOnlyShare ? (
                          <button
                            type="button"
                            className="text-[11px] text-muted-foreground hover:text-gold"
                            onClick={() => {
                              const next = { ...entries };
                              delete next[node.nodeId];
                              setEntries(next);
                              persist({ entries: next });
                              const distilled = distillChronicle(
                                next,
                                audience,
                                confirmedTagIds,
                              );
                              setResult(distilled);
                            }}
                          >
                            {t("chronicle.removeNode")}
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-1 font-display text-lg text-foreground">
                        {t(`chronicle.nodes.${node.nodeId}.title`)}
                      </p>
                    </div>
                    {!readOnlyShare ? (
                      <textarea
                        value={entries[node.nodeId] || ""}
                        onChange={(e) => {
                          updateEntry(node.nodeId, e.target.value);
                          setResult((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  nodes: prev.nodes.map((n) =>
                                    n.nodeId === node.nodeId
                                      ? { ...n, text: e.target.value }
                                      : n,
                                  ),
                                }
                              : prev,
                          );
                        }}
                        rows={3}
                        className={`mt-2 ${H5_TEXTAREA} border-border/60 focus:border-gold/40`}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {result.principles.length >= MAX_PICK ? (
              <div className={`${H5_PANEL} mb-4 p-4`}>
                <h2 className="mb-2 flex items-center gap-2 font-display text-xl">
                  <Sparkles className="h-5 w-5 text-gold" aria-hidden />
                  {t("chronicle.myPrinciplesTitle")}
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">{t("chronicle.myPrinciplesHint")}</p>
                <div className="space-y-3">
                  {result.principles.map((p, idx) => {
                    const on = selectedPrinciples.includes(p.name);
                    return (
                      <button
                        key={p.name}
                        type="button"
                        disabled={readOnlyShare}
                        onClick={() => {
                          const next = togglePick(selectedPrinciples, p.name);
                          setSelectedPrinciples(next);
                          persist({ selectedPrinciples: next });
                        }}
                        className={`${H5_SELECT_CARD} ${
                          on
                            ? "border-gold/45 bg-gold/10"
                            : "border-border/50 hover:border-gold/30"
                        }`}
                      >
                        <p className="font-display text-base text-gold">
                          {t("chronicle.principleN", { n: idx + 1 })}：{p.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : result.principles.length > 0 ? (
              <div className={`${H5_PANEL} mb-4 p-4`}>
                <h2 className="mb-4 flex items-center gap-2 font-display text-xl">
                  <Sparkles className="h-5 w-5 text-gold" aria-hidden />
                  {t("chronicle.matchedPrinciples")}
                </h2>
                <ol className="space-y-4">
                  {result.principles.map((p, idx) => (
                    <li key={p.name}>
                      <p className="font-display text-lg text-gold">
                        {t("chronicle.principleN", { n: idx + 1 })}：{p.name}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="sticky bottom-2 z-10 mt-auto bg-gradient-to-t from-[#1a1714] via-[#1a1714]/95 to-transparent pt-4">
              {!readOnlyShare ? (
                <button type="button" onClick={bindBook} className={H5_CTA}>
                  <BookOpen className="h-4 w-4" aria-hidden />
                  {t("chronicle.bindCta")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    persist({ step: "book" });
                    setStep("book");
                  }}
                  className={H5_CTA}
                >
                  {t("chronicle.viewBookCta")}
                </button>
              )}
            </div>
          </motion.section>
        )}

        {step === "book" && result && pricing && (
          <section
            key="book"
            className="flex flex-1 flex-col"
          >
            <div className="mb-5">
              <ChronicleBookCover
                authorName={displayName}
                roleId={roleId}
                gender={gender}
                keywords={coverKeywords}
              />
              <p className="mt-4 break-all text-center font-tech text-xl text-gold sm:text-2xl">
                ${formatUsdt(pricing.price)}
              </p>
              <p className="mt-1 text-center text-[11px] text-muted-foreground">
                {new Date().toISOString().slice(0, 10).replace(/-/g, "/")}
              </p>
            </div>

            <p className="mb-6 text-center text-xs text-muted-foreground">
              {t("chronicle.capsuleNftHint")}
            </p>

            {wechatHint ? (
              <p className="mb-4 text-center text-xs text-muted-foreground">
                {t("chronicle.shareWechatHint")}
              </p>
            ) : null}

            <div className="mt-auto flex flex-col gap-2.5">
              {/* Always show seal + claim — previously hidden on share/vote landing */}
              <button type="button" onClick={openLifeCapsule} className={H5_CTA}>
                <ExternalLink className="h-4 w-4" aria-hidden />
                {capsuleOpened ? t("chronicle.lifeCapsuleCtaAgain") : t("chronicle.lifeCapsuleCta")}
              </button>
              <button type="button" onClick={() => setNftClaimOpen(true)} className={H5_CTA_GHOST}>
                {czLoggedIn ? t("chronicle.nftClaimCta") : t("chronicle.nftLoginCta")}
              </button>
              {capsuleOpened && czLoggedIn ? (
                <p className="text-center text-[11px] text-muted-foreground/80">
                  {t("chronicle.nftLoggedInSavedHint")}
                </p>
              ) : null}

              {rankLive && readOnlyShare ? (
                <>
                  <button type="button" onClick={() => void shareCopy()} className={H5_CTA_GHOST}>
                    <Share2 className="h-4 w-4" aria-hidden />
                    {t("chronicle.shareAction")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchParams({}, { replace: true });
                      setReadOnlyShare(false);
                      setStep("intro");
                    }}
                    className={H5_CTA_GHOST}
                  >
                    {t("chronicle.rank.createCta")}
                  </button>
                  <Link
                    to={
                      rankEntry?.entryId
                        ? `/club/chronicle/rank?entryId=${encodeURIComponent(rankEntry.entryId)}`
                        : "/club/chronicle/rank"
                    }
                    className={H5_CTA_GHOST}
                  >
                    <Trophy className="h-4 w-4" aria-hidden />
                    {t("chronicle.rank.viewBoard")}
                  </Link>
                </>
              ) : (
                <>
                  {rankVoting ? (
                    <button type="button" onClick={() => setRankModalOpen(true)} className={H5_CTA_GHOST}>
                      <Trophy className="h-4 w-4" aria-hidden />
                      {t("chronicle.rank.enterCta")}
                    </button>
                  ) : (
                    <>
                      <button type="button" onClick={shareToX} className={H5_CTA_GHOST}>
                        <Share2 className="h-4 w-4" aria-hidden />
                        {t("chronicle.publishCta")}
                      </button>
                      <button type="button" onClick={() => void shareToWechat()} className={H5_CTA_GHOST}>
                        <MessageCircle className="h-4 w-4" aria-hidden />
                        {t("chronicle.shareWechatCta")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void shareCopy()}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/70 px-6 py-3 text-sm transition-colors active:bg-white/5"
                      >
                        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                        {t("chronicle.shareCta")}
                      </button>
                    </>
                  )}
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
                </>
              )}
            </div>

            <ChronicleRankModal
              open={rankModalOpen}
              onClose={() => setRankModalOpen(false)}
              entryId={rankEntry?.entryId}
              onShareX={shareToX}
              onShareWechat={() => void shareToWechat()}
              onCopy={() => void shareCopy()}
            />
            <ChronicleSignedNftClaimModal
              open={nftClaimOpen}
              onClose={() => setNftClaimOpen(false)}
              onAuthed={() => {
                setCzLoggedIn(true);
                persist({});
              }}
            />
          </section>
        )}
      </AnimatePresence>

        <p className="mt-4 pb-2 text-center text-[10px] text-muted-foreground/55">
          {t("chronicle.h5Credit")}
        </p>
      </div>
    </div>
  );
}

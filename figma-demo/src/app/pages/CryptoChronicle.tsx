import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  Copy,
  Download,
  FlaskConical,
  MessageCircle,
  RefreshCw,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { SiteNavDrawer, SiteNavMenuButton } from "../components/SiteNavDrawer";
import ChronicleBookCover from "../components/ChronicleBookCover";
import ChroniclePartnerMarks from "../components/ChroniclePartnerMarks";
import {
  attributeInvite,
  enrollRankEntry,
  fetchRankConfig,
  fetchRankEntry,
  isRankCampaignLive,
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
import OverlayPortal from "../components/OverlayPortal";
import { overlayBackdropClassLight } from "../lib/overlayLayers";
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
  suggestRoleFromTags,
  type AvatarRoleId,
  type AvatarStyleId,
} from "../../lib/chronicle/roles";
import { DEFAULT_AVATAR_STYLE } from "../../lib/chronicle/roleVisuals";
import { computeChroniclePrice, formatUsdt, isChroniclePriceHigh } from "../../lib/chronicle/pricing";
import RoleAvatar from "../components/RoleAvatar";
import { downloadChroniclePoster } from "../../lib/chronicle/invitePoster";
import {
  MIN_FILLED_NODES,
  WIZARD_PREV,
  chroniclePath,
  isWizardStep,
  loadInviteRef,
  persistInviteRef,
} from "../../lib/chronicle/wizardNav";
import type {
  ChronicleAudience,
  ChronicleResult,
  ChronicleStep,
  ChronicleNodeId,
  UserEntries,
} from "../../lib/chronicle/types";

const H5_RADIUS = "rounded-[1.75rem]";
const H5_STAGE =
  "relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]";
const H5_CARD =
  `${H5_RADIUS} border border-gold/20 bg-[#2c2824]/92 shadow-[0_18px_50px_rgba(0,0,0,0.35)]`;
const H5_PANEL = `${H5_RADIUS} border border-white/8 bg-black/20 p-4 sm:p-5`;
const H5_CAPSULE_INPUT =
  "w-full rounded-full border border-border bg-input-background px-5 py-3 text-sm outline-none transition-colors focus:border-gold/50";
const H5_CAPSULE_TRACK = "flex w-full gap-1 rounded-full border border-border/60 bg-black/25 p-1";
const H5_SELECT_CARD = `${H5_RADIUS} w-full border px-4 py-3 text-left transition-colors`;
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const shareToken = searchParams.get("share");
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
  const [showcaseRoleIdx, setShowcaseRoleIdx] = useState(0);
  const [showcaseGender, setShowcaseGender] = useState<AvatarGenderId>("male");
  const [readOnlyShare, setReadOnlyShare] = useState(false);
  const [sharedPrice, setSharedPrice] = useState<number | null>(null);
  const [distilling, setDistilling] = useState(false);
  const [rankCfg, setRankCfg] = useState<RankConfig | null>(null);
  const [rankEntry, setRankEntry] = useState<RankEntry | null>(null);
  const [nftClaimOpen, setNftClaimOpen] = useState(false);
  const [siteNavOpen, setSiteNavOpen] = useState(false);
  const [posterBusy, setPosterBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const catalog = useMemo(() => getTagCatalog(audience), [audience]);
  const rankEntryParam = searchParams.get("entryId") || searchParams.get("rankEntry");
  const inviteRef = loadInviteRef(searchParams.get("ref"));
  const rankLive = isRankCampaignLive(rankCfg);
  const catalogMap = useMemo(() => new Map(catalog.map((x) => [x.id, x])), [catalog]);

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

  const goStep = (next: ChronicleStep, mode: "push" | "replace" = "push", search = searchParams.toString()) => {
    persist({ step: next });
    setStep(next);
    const state = { czWizard: true, step: next };
    const url = chroniclePath(search);
    if (mode === "replace") window.history.replaceState(state, "", url);
    else window.history.pushState(state, "", url);
  };

  const onWizardBack = () => {
    persist({ step });
    if (step === "intro") {
      navigate("/");
      return;
    }
    if (window.history.state?.czWizard && window.history.state.step === step) {
      window.history.back();
      return;
    }
    const prev = WIZARD_PREV[step];
    if (prev) goStep(prev, "replace");
  };

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const raw = e.state && typeof e.state === "object" ? (e.state as { step?: unknown }).step : null;
      if (isWizardStep(raw)) {
        persist({ step: raw });
        setStep(raw);
        return;
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // persist is stable enough for back; avoid rebinding every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience, entries, confirmedTagIds, authorName, roleId, selectedTagIds, selectedPrinciples]);

  useEffect(() => {
    const inbound = landedShareRef.current;
    const draft = loadDraft();
    const resume = resumeStepFromDraft(draft);
    const ref = searchParams.get("ref");
    if (ref) persistInviteRef(ref);

    if (shareToken && inbound && shareToken === inbound) {
      landedShareRef.current = null;
      const decoded = decodeSharePayload(shareToken);
      if (decoded && (decoded.selectedTagIds?.length || decoded.confirmedTagIds.length || decoded.authorName)) {
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
        setReadOnlyShare(true);
        setSharedPrice(
          typeof decoded.price === "number" && Number.isFinite(decoded.price) ? decoded.price : null,
        );
        setStep("book");
        window.history.replaceState({ czWizard: true, step: "book" }, "", chroniclePath(searchParams.toString()));
        return;
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
    setSharedPrice(null);

    const target = resume || "intro";
    if (target === "result" || target === "author" || target === "book") {
      const distilled = distillChronicle(
        draft.entries,
        draft.audience,
        draft.confirmedTagIds.length ? draft.confirmedTagIds : draft.selectedTagIds,
      );
      setConfirmedTagIds(distilled.confirmedTagIds);
      setResult(distilled);
      if (!draft.selectedTagIds.length) {
        setSelectedTagIds(distilled.confirmedTagIds.slice(0, MAX_PICK));
      }
      if (!draft.selectedPrinciples.length) {
        setSelectedPrinciples(distilled.principles.slice(0, MAX_PICK).map((p) => p.name));
      }
    }
    setStep(target);
    window.history.replaceState({ czWizard: true, step: target }, "", chroniclePath(searchParams.toString()));
    // land once
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    preloadRolePack(AVATAR_ROLE_IDS);
  }, []);

  useEffect(() => {
    if (step !== "intro") return;
    const timer = window.setInterval(() => {
      setShowcaseRoleIdx((i) => (i + 1) % AVATAR_ROLE_IDS.length);
      setShowcaseGender((g) => (g === "male" ? "female" : "male"));
    }, 2600);
    return () => window.clearInterval(timer);
  }, [step]);

  const showcaseRoleId = AVATAR_ROLE_IDS[showcaseRoleIdx] || "founder";
  const filledCount = useMemo(() => countFilled(entries), [entries]);
  const pricing = useMemo(() => {
    if (!result) return null;
    const computed = computeChroniclePrice({
      entries,
      role: roleId,
      principles: result.principles,
      selectedPrincipleCount: selectedPrinciples.length || result.principles.length,
    });
    const locked =
      readOnlyShare &&
      ((sharedPrice != null && Number.isFinite(sharedPrice) ? sharedPrice : null) ??
        (typeof rankEntry?.price === "number" && Number.isFinite(rankEntry.price)
          ? rankEntry.price
          : null));
    if (locked == null) return computed;
    return { ...computed, price: locked };
  }, [entries, roleId, result, selectedPrinciples.length, readOnlyShare, sharedPrice, rankEntry?.price]);

  const keywordChoices = useMemo(() => {
    if (!result) return [] as { id: string; label: string }[];
    const out: { id: string; label: string }[] = [];
    const seen = new Set<string>();
    const push = (id: string, fallback: string) => {
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push({ id, label: localizedBehaviorTagLabel(id, fallback, t) });
    };
    for (const tag of result.tags) push(tag.id, tag.label);
    for (const id of result.confirmedTagIds) {
      const fallback = catalogMap.get(id)?.label || "";
      push(id, fallback);
    }
    return out;
  }, [result, catalogMap, t]);

  const coverKeywords = useMemo(
    () =>
      selectedTagIds.map((id) => {
        const fallback =
          catalogMap.get(id)?.label || result?.tags.find((x) => x.id === id)?.label || "";
        return localizedBehaviorTagLabel(id, fallback, t);
      }),
    [selectedTagIds, catalogMap, result, t],
  );

  const updateEntry = (id: ChronicleNodeId, value: string) => {
    setEntries((prev) => {
      const next = { ...prev, [id]: value };
      persist({ entries: next });
      return next;
    });
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
    if (filledCount < MIN_FILLED_NODES) {
      toast.error(t("chronicle.needSixEntries", { count: MIN_FILLED_NODES }));
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
      const merged = mergedRaw.length > 0 ? mergedRaw : catalog.slice(0, 8).map((x) => x.id);
      const preselect = merged.slice(0, 8);
      setConfirmedTagIds(preselect);
      const distilled = distillChronicle(entries, audience, preselect, merged);
      const tagPick = preselect.slice(0, MAX_PICK);
      const principlePick = distilled.principles.slice(0, MAX_PICK).map((p) => p.name);
      setSelectedTagIds(tagPick);
      setSelectedPrinciples(principlePick);
      if (!roleId) {
        const suggested = suggestRoleFromTags(tagPick, audience);
        setRoleId(suggested);
        setAudience(audienceForRole(suggested));
        persist({
          confirmedTagIds: preselect,
          selectedTagIds: tagPick,
          selectedPrinciples: principlePick,
          roleId: suggested,
          audience: audienceForRole(suggested),
          step: "result",
        });
      } else {
        persist({
          confirmedTagIds: preselect,
          selectedTagIds: tagPick,
          selectedPrinciples: principlePick,
          step: "result",
        });
      }
      setResult(distilled);
      setParticipants(bumpCompletionCount());
      goStep("result");
    } finally {
      setDistilling(false);
    }
  };

  const goAuthorFromResult = () => {
    if (!result) return;
    if (keywordChoices.length >= MAX_PICK && selectedTagIds.length < MAX_PICK) {
      toast.error(t("chronicle.needThreeTags"));
      return;
    }
    if (result.principles.length >= MAX_PICK && selectedPrinciples.length < MAX_PICK) {
      toast.error(t("chronicle.needThreePrinciples"));
      return;
    }
    persist({ selectedTagIds, selectedPrinciples, step: "author" });
    goStep("author");
  };

  const bindBook = () => {
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
      selectedTagIds,
      selectedPrinciples,
      step: "book",
    });
    const url = buildShareUrl(shareEncodeBase(), { ref: rankEntry?.entryId || inviteRef || undefined });
    const token = new URL(url).searchParams.get("share") || "";
    const next = new URLSearchParams();
    if (token) next.set("share", token);
    if (inviteRef) next.set("ref", inviteRef);
    setSearchParams(next, { replace: true });
    goStep("book", "push", next.toString());
  };

  const startMine = () => {
    setReadOnlyShare(false);
    setSharedPrice(null);
    setResult(null);
    setEntries({});
    setConfirmedTagIds([]);
    setSelectedTagIds([]);
    setSelectedPrinciples([]);
    setAuthorName("");
    setRoleId(null);
    setOpenId(CHRONICLE_NODE_IDS[0]);
    const next = new URLSearchParams();
    if (inviteRef) {
      persistInviteRef(inviteRef);
      next.set("ref", inviteRef);
    }
    setSearchParams(next, { replace: true });
    persist({
      entries: {},
      confirmedTagIds: [],
      selectedTagIds: [],
      selectedPrinciples: [],
      authorName: "",
      roleId: null,
      step: "intro",
    });
    goStep("intro", "replace", next.toString());
  };

  const isZhUi = (i18n.resolvedLanguage || i18n.language || "").startsWith("zh");

  const selectedTagLabels = () =>
    selectedTagIds
      .map((id) => {
        const fallback =
          catalogMap.get(id)?.label || result?.tags.find((x) => x.id === id)?.label || id;
        return localizedBehaviorTagLabel(id, fallback, t);
      })
      .filter(Boolean);

  const resultShareLink = () =>
    buildShareUrl(shareEncodeBase(), {
      ref: rankEntry?.entryId || inviteRef || undefined,
    });

  useEffect(() => {
    if (step !== "book" || readOnlyShare || !result || !authorName.trim()) return;
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
    }).then(async (entry) => {
      if (cancelled || !entry) return;
      setRankEntry(entry);
      if (inviteRef && inviteRef !== entry.entryId) {
        await attributeInvite({ refEntryId: inviteRef, completerEntryId: entry.entryId });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, readOnlyShare, result, authorName, roleId, styleId, pricing?.price, shareToken]);

  const buildResultShareText = () => {
    const link = resultShareLink();
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

  const shareToX = async () => {
    await downloadPoster();
    const text = buildResultShareText();
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("text", text);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  const shareToWechat = async () => {
    await downloadPoster();
    setWechatHint(true);
    await copyText(buildResultShareText(), "chronicle.inviteCopied");
  };

  const openLifeCapsule = () => {
    let url = getLifeCapsuleOrigin();
    if (result) {
      try {
        const tagLabels: Record<string, string> = {};
        for (const id of selectedTagIds.length ? selectedTagIds : result.confirmedTagIds) {
          const tag = catalogMap.get(id) || result.tags.find((x) => x.id === id);
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
    persist({});
  };

  const downloadPoster = async () => {
    if (posterBusy) return;
    setPosterBusy(true);
    try {
      const ok = await downloadChroniclePoster({
        authorName: authorName.trim() || t("chronicle.anonymousAuthor"),
        roleId,
        gender,
        roleLabel: roleId ? t(`chronicle.roles.${roleId}.name`) : "",
        publisher: t("chronicle.bookPublisher"),
        keywords: coverKeywords,
        principles: selectedPrinciples,
        priceLabel: t("chronicle.posterPrice", { price: formatUsdt(pricing?.price ?? 0) }),
        inviteUrl: resultShareLink(),
        title: t("chronicle.bookTitle"),
        subtitle: t("chronicle.kicker"),
        partners: t("chronicle.coverPartners"),
      });
      if (ok) toast.success(t("chronicle.posterSaved"));
      else toast.error(t("chronicle.posterFailed"));
    } finally {
      setPosterBusy(false);
    }
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
          <button
            type="button"
            onClick={onWizardBack}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {step === "intro" ? t("chronicle.backClub") : t("chronicle.backStep")}
          </button>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <SiteNavMenuButton open={siteNavOpen} onClick={() => setSiteNavOpen(true)} />
          </div>
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
              <div className={`${H5_CARD} flex flex-1 flex-col overflow-visible bg-[#2c2824]/96 px-5 pb-6 pt-5 text-center`}>
                <ChroniclePartnerMarks className="mb-3" />
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
                  <button type="button" onClick={() => goStep("fill")} className={H5_CTA}>
                    <Sparkles className="h-4 w-4" aria-hidden />
                    {t("chronicle.startCta")}
                  </button>
                  {rankLive ? (
                    <Link to="/club/chronicle/rank?from=intro" className={H5_CTA_GHOST}>
                      {t("chronicle.rank.publicBoardCta")}
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          )}

          {step === "fill" && (
            <motion.section
              key="fill"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-1 flex-col"
            >
              <header className="mb-5 px-1 text-center">
                <p className="mb-2 text-xs text-gold/80">{t("chronicle.kicker")}</p>
                <h1 className="font-display mb-2 text-2xl">
                  <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                    {t("chronicle.fillTitle")}
                  </span>
                </h1>
                <p className="text-sm text-muted-foreground">{t("chronicle.fillHint")}</p>
                <p className="mt-2 text-xs text-muted-foreground/70">
                  {t("chronicle.filledProgressMin", {
                    count: filledCount,
                    need: MIN_FILLED_NODES,
                    total: CHRONICLE_NODE_IDS.length,
                  })}
                </p>
              </header>

              <ol className="relative space-y-2.5 border-l border-gold/25 pl-5">
                {CHRONICLE_NODE_IDS.map((id) => {
                  const open = openId === id;
                  const hasText = Boolean(`${entries[id] || ""}`.trim());
                  return (
                    <li key={id} className="relative">
                      <span
                        className={`absolute -left-[1.9rem] top-3 flex h-3 w-3 rounded-full border sm:-left-[2.4rem] ${
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
                                <p className="font-display mb-2 text-base">
                                  {t(`chronicle.nodes.${id}.title`)}
                                </p>
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
                                <p className="font-display mb-2 text-base">{t("chronicle.yourEventTitle")}</p>
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
                                    className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1.5 text-xs text-gold"
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
              <header className="mb-5 px-1 text-center">
                <h1 className="font-display mb-3 text-2xl">
                  <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                    {t("chronicle.resultTitle")}
                  </span>
                </h1>
                <p className="text-sm text-muted-foreground">{t("chronicle.resultNoReviewHint")}</p>
              </header>

              {keywordChoices.length > 0 ? (
                <div className={`${H5_PANEL} mb-4 p-4`}>
                  <h2 className="font-display mb-2 text-xl">{t("chronicle.lifeTagsTitle")}</h2>
                  <p className="mb-4 text-sm text-muted-foreground">{t("chronicle.lifeTagsHint")}</p>
                  <div className="flex flex-wrap gap-2">
                    {keywordChoices.map((tag) => {
                      const on = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
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

              {result.principles.length > 0 ? (
                <div className={`${H5_PANEL} mb-4 p-4`}>
                  <h2 className="font-display mb-2 flex items-center gap-2 text-xl">
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
                          onClick={() => {
                            const next = togglePick(selectedPrinciples, p.name);
                            setSelectedPrinciples(next);
                            persist({ selectedPrinciples: next });
                          }}
                          className={`${H5_SELECT_CARD} ${
                            on ? "border-gold/45 bg-gold/10" : "border-border/50 hover:border-gold/30"
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
              ) : null}

              <div className="sticky bottom-2 z-10 mt-auto bg-gradient-to-t from-[#1a1714] via-[#1a1714]/95 to-transparent pt-4">
                <button type="button" onClick={goAuthorFromResult} className={H5_CTA}>
                  <BookOpen className="h-4 w-4" aria-hidden />
                  {t("chronicle.bindCta")}
                </button>
              </div>
            </motion.section>
          )}

          {step === "author" && (
            <motion.section
              key="author"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-1 flex-col pb-4"
            >
              <header className="mb-4 px-1 text-center">
                <h1 className="font-display mb-2 text-2xl">
                  <span className="bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                    {t("chronicle.authorTitleAfter")}
                  </span>
                </h1>
                <p className="text-sm text-muted-foreground">{t("chronicle.authorHintAfter")}</p>
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
                <div className={H5_CAPSULE_TRACK} role="radiogroup">
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
                        className={`flex-1 rounded-full px-3 py-2.5 text-sm ${
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
                          persist({ roleId: id, audience: nextAudience, gender });
                        }}
                        className={`${H5_SELECT_CARD} ${
                          active
                            ? "border-gold/50 bg-gold/10"
                            : "border-border/50 bg-card/25 hover:border-gold/30"
                        }`}
                      >
                        <div className="mb-2 flex items-center gap-3">
                          <RoleAvatar roleId={id} gender={gender} size="md" />
                          <span className="font-display text-base">{t(`chronicle.roles.${id}.name`)}</span>
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
                <button type="button" onClick={bindBook} className={H5_CTA}>
                  {t("chronicle.authorFinish")}
                </button>
              </div>
            </motion.section>
          )}

          {step === "book" && result && pricing && (
            <section key="book" className="flex flex-1 flex-col">
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
                <ChroniclePartnerMarks className="mt-3" />
              </div>

              <div className="mt-auto flex flex-col gap-2.5">
                {readOnlyShare ? (
                  <button type="button" onClick={startMine} className={H5_CTA}>
                    {t("chronicle.createMine")}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void downloadPoster()}
                      disabled={posterBusy}
                      className={H5_CTA}
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      {posterBusy ? t("common.loading") : t("chronicle.downloadPoster")}
                    </button>
                    <button type="button" onClick={() => setNftClaimOpen(true)} className={H5_CTA_GHOST}>
                      {t("chronicle.claimAndCapsuleCta")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWechatHint(false);
                        setShareOpen(true);
                      }}
                      className={H5_CTA_GHOST}
                    >
                      <Share2 className="h-4 w-4" aria-hidden />
                      {t("chronicle.shareAction")}
                    </button>
                    <button
                      type="button"
                      onClick={startMine}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm text-muted-foreground"
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden />
                      {t("chronicle.againCta")}
                    </button>
                  </>
                )}
              </div>

              {shareOpen ? (
                <OverlayPortal>
                  <div
                    className={overlayBackdropClassLight}
                    role="presentation"
                    onClick={() => setShareOpen(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setShareOpen(false);
                    }}
                  >
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="chronicle-share-title"
                      className="relative z-[1] w-full max-w-[400px] rounded-[1.75rem] border border-gold/20 bg-[#2c2824] p-5 shadow-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setShareOpen(false)}
                        className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        aria-label={t("common.close")}
                      >
                        <X className="h-5 w-5" />
                      </button>
                      <h2
                        id="chronicle-share-title"
                        className="mb-4 pr-8 font-display text-xl text-foreground"
                      >
                        {t("chronicle.shareAction")}
                      </h2>
                      <div className="grid gap-2.5">
                        <button type="button" onClick={() => void shareToX()} className={H5_CTA_GHOST}>
                          <Share2 className="h-4 w-4" aria-hidden />
                          {t("chronicle.shareXCta")}
                        </button>
                        <button type="button" onClick={() => void shareToWechat()} className={H5_CTA_GHOST}>
                          <MessageCircle className="h-4 w-4" aria-hidden />
                          {t("chronicle.shareWechatCta")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyText(buildResultShareText(), "chronicle.copied")}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/70 px-6 py-3 text-sm"
                        >
                          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                          {t("chronicle.shareCta")}
                        </button>
                      </div>
                      {wechatHint ? (
                        <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
                          {t("chronicle.shareWechatHint")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </OverlayPortal>
              ) : null}

              <ChronicleSignedNftClaimModal
                open={nftClaimOpen}
                onClose={() => setNftClaimOpen(false)}
                onSealed={openLifeCapsule}
                onAuthed={() => {
                  if (inviteRef && rankEntry?.entryId) {
                    void attributeInvite({
                      refEntryId: inviteRef,
                      completerEntryId: rankEntry.entryId,
                    });
                  }
                }}
              />
            </section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

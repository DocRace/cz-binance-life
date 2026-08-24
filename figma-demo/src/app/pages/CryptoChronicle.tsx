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
  ListOrdered,
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
  fetchLeaderboard,
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
  getPrincipleCatalog,
  getTagCatalog,
  mergeSuggestedTagIds,
  suggestTagsFromEntries,
} from "../../lib/chronicle/distill";
import { localizedBehaviorTagLabel } from "../../lib/chronicle/tagI18n";
import { localizedPrincipleLabel } from "../../lib/chronicle/principleI18n";
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
import { mintChronicleShareLink } from "../../lib/chronicle/shareLinkClient";
import { fetchLlmTagSuggestions } from "../../lib/chronicle/suggestTagsClient";
import {
  clearDraft,
  displayParticipantCount,
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
import { computeChroniclePrice, formatShareUsd, isChroniclePriceHigh } from "../../lib/chronicle/pricing";
import RoleAvatar from "../components/RoleAvatar";
import {
  blobToDataUrl,
  buildChroniclePosterBlob,
  isWeChatBrowser,
  shareImageNative,
  shareOrDownloadPoster,
} from "../../lib/chronicle/invitePoster";
import {
  MIN_FILLED_NODES,
  CHRONICLE_HOME_PATH,
  WIZARD_PREV,
  canLeaveChronicleViaHistory,
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
const H5_CTA_ICON_LEFT =
  "pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2";

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
  const entriesRef = useRef<UserEntries>({});
  entriesRef.current = entries;
  const [openId, setOpenId] = useState<ChronicleNodeId | null>(null);
  const [confirmedTagIds, setConfirmedTagIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedPrinciples, setSelectedPrinciples] = useState<string[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [roleId, setRoleId] = useState<AvatarRoleId | null>(null);
  const [suggestedRoleId, setSuggestedRoleId] = useState<AvatarRoleId | null>(null);
  const [styleId, setStyleId] = useState<AvatarStyleId>(DEFAULT_AVATAR_STYLE);
  const [gender, setGender] = useState<AvatarGenderId>(DEFAULT_AVATAR_GENDER);
  const [result, setResult] = useState<ChronicleResult | null>(null);
  const [publishedActual, setPublishedActual] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [wechatHint, setWechatHint] = useState(false);
  const [showcaseRoleIdx, setShowcaseRoleIdx] = useState(0);
  const [showcaseGender, setShowcaseGender] = useState<AvatarGenderId>("male");
  const [readOnlyShare, setReadOnlyShare] = useState(false);
  const readOnlyShareRef = useRef(false);
  readOnlyShareRef.current = readOnlyShare;
  const authorNameRef = useRef("");
  authorNameRef.current = authorName;
  const roleIdRef = useRef<AvatarRoleId | null>(null);
  roleIdRef.current = roleId;
  const [sharedPrice, setSharedPrice] = useState<number | null>(null);
  const [distilling, setDistilling] = useState(false);
  const [rankCfg, setRankCfg] = useState<RankConfig | null>(null);
  const [rankEntry, setRankEntry] = useState<RankEntry | null>(null);
  const [shortShareUrl, setShortShareUrl] = useState("");
  const [nftClaimOpen, setNftClaimOpen] = useState(false);
  const [siteNavOpen, setSiteNavOpen] = useState(false);
  const [posterBusy, setPosterBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);

  const catalog = useMemo(() => getTagCatalog(audience), [audience]);
  const rankEntryParam = searchParams.get("entryId") || searchParams.get("rankEntry");
  const inviteRef = loadInviteRef(searchParams.get("ref"));
  const rankLive = isRankCampaignLive(rankCfg);
  const catalogMap = useMemo(() => new Map(catalog.map((x) => [x.id, x])), [catalog]);

  const persist = (patch: Partial<ChronicleDraft>) => {
    // Viewing someone else's book must not become this visitor's draft.
    if (readOnlyShareRef.current) return;
    const draft: ChronicleDraft = {
      audience: patch.audience ?? audience,
      entries: patch.entries ?? entriesRef.current,
      confirmedTagIds: patch.confirmedTagIds ?? confirmedTagIds,
      authorName: patch.authorName !== undefined ? patch.authorName : authorNameRef.current,
      roleId: patch.roleId === undefined ? roleIdRef.current : patch.roleId,
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
      if (canLeaveChronicleViaHistory()) {
        navigate(-1);
        return;
      }
      navigate(CHRONICLE_HOME_PATH);
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
    void fetchLeaderboard({ limit: 1 }).then((board) => {
      if (board && Number.isFinite(board.total)) setPublishedActual(board.total);
    });
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
  const coverKeywords = useMemo(
    () =>
      selectedTagIds.map((id) => {
        const fallback =
          catalogMap.get(id)?.label || result?.tags.find((x) => x.id === id)?.label || "";
        return localizedBehaviorTagLabel(id, fallback, t);
      }),
    [selectedTagIds, catalogMap, result, t],
  );
  const pricing = useMemo(() => {
    if (!result) return null;
    const computed = computeChroniclePrice({
      entries,
      role: roleId,
      principles: result.principles,
      selectedPrincipleCount: selectedPrinciples.length || result.principles.length,
      nodeTexts: result.nodes.map((n) => n.text),
      extraTexts: [
        ...coverKeywords,
        ...selectedPrinciples,
        roleId ? t(`chronicle.roles.${roleId}.name`) : "",
      ],
      finished: step === "book" || Boolean(roleId && selectedTagIds.length),
    });
    const lockedPrice = readOnlyShare
      ? ((sharedPrice != null && Number.isFinite(sharedPrice) ? sharedPrice : null) ??
        (typeof rankEntry?.price === "number" && Number.isFinite(rankEntry.price)
          ? rankEntry.price
          : null))
      : null;
    if (lockedPrice == null || lockedPrice === 0) return computed;
    return { ...computed, price: lockedPrice };
  }, [
    entries,
    roleId,
    result,
    selectedPrinciples,
    selectedTagIds.length,
    coverKeywords,
    step,
    t,
    readOnlyShare,
    sharedPrice,
    rankEntry?.price,
  ]);

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

  const principleChoices = useMemo(() => {
    const catalog = getPrincipleCatalog();
    const matched = (result?.principles || []).map((p) => p.name).filter(Boolean);
    const seen = new Set<string>();
    const out: { name: string; matched: boolean }[] = [];
    for (const name of [...matched, ...catalog]) {
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push({ name, matched: matched.includes(name) });
    }
    return out;
  }, [result]);

  const roleChoices = useMemo(() => {
    const pinned = [roleId, suggestedRoleId].filter(
      (id, i, arr): id is AvatarRoleId => Boolean(id) && arr.indexOf(id) === i,
    );
    return [...pinned, ...AVATAR_ROLE_IDS.filter((id) => !pinned.includes(id))];
  }, [roleId, suggestedRoleId]);

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
      const suggested = suggestRoleFromTags(tagPick, audience, allText);
      const nextAudience = audienceForRole(suggested);
      setSelectedTagIds(tagPick);
      setSelectedPrinciples(principlePick);
      setRoleId(suggested);
      setSuggestedRoleId(suggested);
      setAudience(nextAudience);
      persist({
        confirmedTagIds: preselect,
        selectedTagIds: tagPick,
        selectedPrinciples: principlePick,
        roleId: suggested,
        audience: nextAudience,
        step: "result",
      });
      setResult(distilled);
      setPublishedActual((n) => (typeof n === "number" ? n + 1 : n));
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
    if (principleChoices.length >= MAX_PICK && selectedPrinciples.length < MAX_PICK) {
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
    const next = new URLSearchParams();
    if (inviteRef) next.set("ref", inviteRef);
    setSearchParams(next, { replace: true });
    goStep("book", "push", next.toString());
  };

  const startMine = () => {
    readOnlyShareRef.current = false;
    authorNameRef.current = "";
    roleIdRef.current = null;
    entriesRef.current = {};
    setReadOnlyShare(false);
    setSharedPrice(null);
    setResult(null);
    setEntries({});
    setConfirmedTagIds([]);
    setSelectedTagIds([]);
    setSelectedPrinciples([]);
    setAuthorName("");
    setRoleId(null);
    setSuggestedRoleId(null);
    setStyleId(DEFAULT_AVATAR_STYLE);
    setGender(DEFAULT_AVATAR_GENDER);
    setOpenId(CHRONICLE_NODE_IDS[0]);
    const next = new URLSearchParams();
    if (inviteRef) {
      persistInviteRef(inviteRef);
      next.set("ref", inviteRef);
    }
    persist({
      entries: {},
      confirmedTagIds: [],
      selectedTagIds: [],
      selectedPrinciples: [],
      authorName: "",
      roleId: null,
      styleId: DEFAULT_AVATAR_STYLE,
      gender: DEFAULT_AVATAR_GENDER,
      step: "intro",
    });
    setSearchParams(next, { replace: true });
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
    shortShareUrl ||
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

  useEffect(() => {
    if (step !== "book" || readOnlyShare || !result || !authorName.trim()) return;
    const token = shareToken || shareTokenFromUrl(buildShareUrl(shareEncodeBase()));
    if (!token) return;
    let cancelled = false;
    void mintChronicleShareLink({
      shareToken: token,
      ref: rankEntry?.entryId || inviteRef || undefined,
    }).then((url) => {
      if (!cancelled && url) setShortShareUrl(url);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, readOnlyShare, result, authorName, rankEntry?.entryId, inviteRef, shareToken]);

  const buildResultShareText = (channel: "x" | "wechat" = "x") => {
    const link = resultShareLink();
    const tags = selectedTagLabels().join("、") || t("chronicle.shareBlank");
    const price = formatShareUsd(pricing?.price ?? 0);
    const high = isChroniclePriceHigh(pricing?.price ?? 0);
    const wechat = channel === "wechat";
    if (isZhUi) {
      if (wechat) {
        return high
          ? t("chronicle.shareTextWechatHighZh", { tags, price, link })
          : t("chronicle.shareTextWechatLowZh", { tags, price, link });
      }
      return high
        ? t("chronicle.shareTextHighZh", { tags, price, link })
        : t("chronicle.shareTextLowZh", { tags, price, link });
    }
    if (wechat) {
      return high
        ? t("chronicle.shareTextWechatHighEn", { tags, price, link })
        : t("chronicle.shareTextWechatLowEn", { tags, price, link });
    }
    return high
      ? t("chronicle.shareTextHighEn", { tags, price, link })
      : t("chronicle.shareTextLowEn", { tags, price, link });
  };

  const tryCopyText = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* Xiaomi / Android often revoke clipboard after a download sheet */
    }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      area.style.top = "0";
      document.body.appendChild(area);
      area.focus();
      area.select();
      area.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  };

  const copyText = async (text: string, okKey: string) => {
    const ok = await tryCopyText(text);
    if (ok) {
      setCopied(true);
      toast.success(t(okKey));
      window.setTimeout(() => setCopied(false), 2000);
      return;
    }
    toast.error(t("chronicle.copyFailed"));
  };

  const shareToX = () => {
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("text", buildResultShareText("x"));
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  const shareToWechat = async () => {
    if (posterBusy) return;
    const text = buildResultShareText("wechat");
    const copied = await tryCopyText(text);
    if (copied) {
      setCopied(true);
      toast.success(t("chronicle.inviteCopied"));
      window.setTimeout(() => setCopied(false), 2000);
    }
    setPosterBusy(true);
    try {
      const blob = await buildResultPosterBlob();
      if (!blob) {
        toast.error(t("chronicle.posterFailed"));
        return;
      }
      const native = await shareImageNative(blob, text);
      if (native === "shared" || native === "aborted") {
        setShareOpen(false);
        return;
      }
      setShareOpen(false);
      closePosterPreview();
      setWechatHint(true);
      setPosterPreviewUrl(await blobToDataUrl(blob));
    } finally {
      setPosterBusy(false);
    }
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

  const closePosterPreview = () => {
    setPosterPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const buildResultPosterBlob = () =>
    buildChroniclePosterBlob({
      authorName: authorName.trim() || t("chronicle.anonymousAuthor"),
      creditLine: t("chronicle.posterBy", {
        name: authorName.trim() || t("chronicle.anonymousAuthor"),
      }),
      roleId,
      gender,
      roleLabel: roleId ? t(`chronicle.roles.${roleId}.name`) : "",
      publisher: t("chronicle.bookPublisher"),
      keywords: coverKeywords,
      principles: selectedPrinciples.map((name) => localizedPrincipleLabel(name, t)),
      priceLabel: t("chronicle.posterPrice", { price: formatShareUsd(pricing?.price ?? 0) }),
      inviteUrl: resultShareLink(),
      title: t("chronicle.bookTitle"),
      subtitle: t("chronicle.kicker"),
      partners: t("chronicle.coverPartners"),
      qrHint: t("chronicle.posterQrHint"),
    });

  const deliverPoster = async (): Promise<"preview" | "downloaded" | null> => {
    if (posterBusy) return null;
    setPosterBusy(true);
    try {
      const blob = await buildResultPosterBlob();
      if (!blob) {
        toast.error(t("chronicle.posterFailed"));
        return null;
      }
      const mode = await shareOrDownloadPoster(blob);
      if (mode === "preview" || isWeChatBrowser()) {
        setShareOpen(false);
        closePosterPreview();
        setWechatHint(true);
        setPosterPreviewUrl(await blobToDataUrl(blob));
        return "preview";
      }
      toast.success(t("chronicle.posterSaved"));
      return "downloaded";
    } finally {
      setPosterBusy(false);
    }
  };

  const downloadPoster = async () => {
    await deliverPoster();
  };

  const yearLabel = (id: ChronicleNodeId) =>
    t(`chronicle.nodes.${id}.year`, { defaultValue: CHRONICLE_NODE_YEAR[id] });

  const displayName = authorName.trim() || t("chronicle.anonymousAuthor");
  const publishedDisplay = displayParticipantCount(publishedActual ?? 0);

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
                <p className={`${publishedDisplay != null ? "mb-2" : "mb-4"} text-[15px] leading-relaxed text-muted-foreground`}>
                  {t("chronicle.introLead")}
                </p>
                {publishedDisplay != null ? (
                  <p className="mb-4 text-xs text-muted-foreground/75">
                    {t("chronicle.participants", { count: publishedDisplay })}
                  </p>
                ) : null}
                <div className="mb-5">
                  <ChronicleBookCover
                    authorName=""
                    roleId={showcaseRoleId}
                    gender={showcaseGender}
                  />
                </div>
                <div className="mt-auto space-y-3">
                  <button type="button" onClick={() => goStep("fill")} className={`${H5_CTA} relative`}>
                    <BookOpen className={H5_CTA_ICON_LEFT} aria-hidden />
                    <span>{t("chronicle.startCta")}</span>
                  </button>
                  {rankLive ? (
                    <Link to="/club/chronicle/rank?from=intro" className={`${H5_CTA_GHOST} relative`}>
                      <ListOrdered className={H5_CTA_ICON_LEFT} aria-hidden />
                      <span>{t("chronicle.rank.publicBoardCta")}</span>
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

              {principleChoices.length > 0 ? (
                <div className={`${H5_PANEL} mb-4 p-4`}>
                  <h2 className="font-display mb-2 flex items-center gap-2 text-xl">
                    <Sparkles className="h-5 w-5 text-gold" aria-hidden />
                    {t("chronicle.myPrinciplesTitle")}
                  </h2>
                  <p className="mb-4 text-sm text-muted-foreground">{t("chronicle.myPrinciplesHint")}</p>
                  <div className="space-y-3">
                    {principleChoices.map((p) => {
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
                          <div className="flex items-center gap-2">
                            <p className={`font-display text-base ${on ? "text-gold" : "text-foreground"}`}>
                              {localizedPrincipleLabel(p.name, t)}
                            </p>
                            {p.matched ? (
                              <span className="ml-auto shrink-0 rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[10px] text-gold">
                                {t("chronicle.roleSuggested")}
                              </span>
                            ) : null}
                          </div>
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
                <p className="mb-1 text-sm text-gold/85">{t("chronicle.rolePick")}</p>
                <p className="mb-3 text-xs text-muted-foreground">{t("chronicle.rolePickHint")}</p>
                <div className="grid gap-2.5">
                  {roleChoices.map((id) => {
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
                          {id === suggestedRoleId ? (
                            <span className="ml-auto rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[10px] text-gold">
                              {t("chronicle.roleSuggested")}
                            </span>
                          ) : null}
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
                  {t("chronicle.posterPrice", { price: formatShareUsd(pricing.price) })}
                </p>
                <p className="mt-2 text-center font-cjk text-sm text-foreground/80">
                  {t("chronicle.posterBy", { name: displayName })}
                </p>
                {coverKeywords.length > 0 ? (
                  <p className="mt-1.5 text-center font-cjk text-xs leading-snug text-muted-foreground">
                    {coverKeywords.join(" · ")}
                  </p>
                ) : null}
                <ChroniclePartnerMarks className="mt-3" />
              </div>

              <div className="mt-auto flex flex-col gap-2.5">
                {readOnlyShare ? (
                  <button type="button" onClick={startMine} className={`${H5_CTA} text-center leading-snug`}>
                    {t("chronicle.createMineWith", { name: displayName })}
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

              {posterPreviewUrl ? (
                <OverlayPortal>
                  <div
                    className={overlayBackdropClassLight}
                    role="presentation"
                    onClick={closePosterPreview}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") closePosterPreview();
                    }}
                  >
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="chronicle-poster-preview-hint"
                      className="relative z-[1] flex w-full max-w-[360px] flex-col items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img
                        src={posterPreviewUrl}
                        alt={t("chronicle.downloadPoster")}
                        className="max-h-[64vh] w-full select-none object-contain"
                        style={{ WebkitTouchCallout: "default", WebkitUserSelect: "auto" }}
                        draggable={false}
                      />
                      <p
                        id="chronicle-poster-preview-hint"
                        className="mt-3 text-center text-sm leading-relaxed text-gold-light"
                      >
                        {wechatHint ? t("chronicle.shareSteps") : t("chronicle.posterLongPress")}
                      </p>
                      <button
                        type="button"
                        onClick={() => void copyText(buildResultShareText("wechat"), "chronicle.inviteCopied")}
                        className={`${H5_CTA} mt-3`}
                      >
                        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                        {t("chronicle.shareCta")}
                      </button>
                      <button type="button" onClick={closePosterPreview} className={`${H5_CTA_GHOST} mt-2`}>
                        {t("common.close")}
                      </button>
                    </div>
                  </div>
                </OverlayPortal>
              ) : null}

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
                      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                        {t("chronicle.shareSteps")}
                      </p>
                      <div className="grid gap-2.5">
                        <button
                          type="button"
                          onClick={() => void downloadPoster()}
                          disabled={posterBusy}
                          className={H5_CTA}
                        >
                          <Download className="h-4 w-4" aria-hidden />
                          {posterBusy ? t("common.loading") : t("chronicle.downloadPoster")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void shareToWechat()}
                          disabled={posterBusy}
                          className={H5_CTA_GHOST}
                        >
                          <MessageCircle className="h-4 w-4" aria-hidden />
                          {t("chronicle.shareWechatCta")}
                        </button>
                        <button type="button" onClick={shareToX} className={H5_CTA_GHOST}>
                          <Share2 className="h-4 w-4" aria-hidden />
                          {t("chronicle.shareXCta")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyText(buildResultShareText("wechat"), "chronicle.copied")}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/70 px-6 py-3 text-sm"
                        >
                          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                          {t("chronicle.shareCta")}
                        </button>
                      </div>
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

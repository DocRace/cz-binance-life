import {
  DEFAULT_AVATAR_GENDER,
  isAvatarGenderId,
  type AvatarGenderId,
} from "./roleArt";
import {
  audienceForRole,
  isAvatarRoleId,
  isAvatarStyleId,
  type AvatarRoleId,
  type AvatarStyleId,
} from "./roles";
import { DEFAULT_AVATAR_STYLE } from "./roleVisuals";
import type { ChronicleAudience, ChronicleStep, UserEntries } from "./types";

const DRAFT_KEY = "czlife.chronicle.draft.v3";

/** Hide the intro line until this many real publishes exist. */
export const PARTICIPANT_DISPLAY_MIN_ACTUAL = 100;
/** π + e ≈ 5.85987… so 100 real publishes first appear as 586. */
export const PARTICIPANT_DISPLAY_FACTOR = Math.PI + Math.E;

const STEPS: ChronicleStep[] = ["intro", "fill", "result", "author", "book"];

function isChronicleStep(value: unknown): value is ChronicleStep {
  return typeof value === "string" && (STEPS as string[]).includes(value);
}

/** Map pre-Sheet2 role ids → current pack ids. */
const LEGACY_ROLE_MAP: Record<string, AvatarRoleId> = {
  developer: "buidler",
  researcher: "onchain-detective",
  trader: "degen",
  holder: "hodler",
  validator: "miner",
  community: "fren",
  hunter: "alpha-hunter",
  blackhacker: "black-hat",
};

function normalizeRoleId(value: unknown): AvatarRoleId | null {
  if (typeof value !== "string") return null;
  if (isAvatarRoleId(value)) return value;
  return LEGACY_ROLE_MAP[value] ?? null;
}

export type ChronicleDraft = {
  audience: ChronicleAudience;
  entries: UserEntries;
  confirmedTagIds: string[];
  authorName: string;
  roleId: AvatarRoleId | null;
  styleId: AvatarStyleId;
  gender: AvatarGenderId;
  selectedTagIds: string[];
  selectedPrinciples: string[];
  /** Last wizard step — used to resume like Life Capsule personality quiz. */
  step?: ChronicleStep;
};

const EMPTY: ChronicleDraft = {
  audience: "retail",
  entries: {},
  confirmedTagIds: [],
  authorName: "",
  roleId: null,
  styleId: DEFAULT_AVATAR_STYLE,
  gender: DEFAULT_AVATAR_GENDER,
  selectedTagIds: [],
  selectedPrinciples: [],
  step: "intro",
};

/** Resume the last wizard step. Identity is no longer required before writing. */
export function resumeStepFromDraft(draft: ChronicleDraft): ChronicleStep | null {
  const filled = Object.values(draft.entries || {}).some((t) => `${t || ""}`.trim());
  const hasPicks =
    draft.selectedTagIds.length > 0 ||
    draft.selectedPrinciples.length > 0 ||
    draft.confirmedTagIds.length > 0;
  if (draft.step === "book" && filled) return "book";
  if (draft.step === "author" && filled && hasPicks) return "author";
  if (draft.step === "result" && filled) return "result";
  if (draft.step === "fill" && filled) return "fill";
  if (filled && hasPicks) return "result";
  if (filled) return "fill";
  if (draft.step === "intro") return "intro";
  return null;
}

export function loadDraft(): ChronicleDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY) || localStorage.getItem("czlife.chronicle.draft.v2");
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<ChronicleDraft> & { audience?: string };
    const roleId = normalizeRoleId(parsed.roleId);
    const styleId =
      parsed.styleId && isAvatarStyleId(parsed.styleId) ? parsed.styleId : DEFAULT_AVATAR_STYLE;
    const gender =
      parsed.gender && isAvatarGenderId(parsed.gender) ? parsed.gender : DEFAULT_AVATAR_GENDER;
    const audience =
      roleId != null
        ? audienceForRole(roleId)
        : parsed.audience === "founder"
          ? "founder"
          : "retail";
    return {
      audience,
      entries: parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {},
      confirmedTagIds: Array.isArray(parsed.confirmedTagIds) ? parsed.confirmedTagIds : [],
      authorName: typeof parsed.authorName === "string" ? parsed.authorName.slice(0, 40) : "",
      roleId,
      styleId,
      gender,
      selectedTagIds: Array.isArray(parsed.selectedTagIds) ? parsed.selectedTagIds : [],
      selectedPrinciples: Array.isArray(parsed.selectedPrinciples)
        ? parsed.selectedPrinciples
        : [],
      step: isChronicleStep(parsed.step) ? parsed.step : undefined,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveDraft(draft: ChronicleDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem("czlife.chronicle.draft.v2");
  } catch {
    /* ignore */
  }
}

/** Display count from real publishes, or null to hide the line. */
export function displayParticipantCount(actual: number): number | null {
  const n = Math.floor(Number(actual) || 0);
  if (n < PARTICIPANT_DISPLAY_MIN_ACTUAL) return null;
  return Math.round(n * PARTICIPANT_DISPLAY_FACTOR);
}

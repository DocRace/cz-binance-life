import type { AvatarGenderId } from "./roleArt";
import type { AvatarRoleId, AvatarStyleId } from "./roles";

export type ChronicleStep = "intro" | "author" | "fill" | "result" | "book";

export type ChronicleAudience = "retail" | "founder";

export type ChronicleNodeId =
  | "n2013"
  | "n2017_06"
  | "n2017_07"
  | "n2017_09"
  | "n2017_end"
  | "n2019_safu"
  | "n2019_eco"
  | "n2021"
  | "n2022"
  | "n2022_11"
  | "n2023"
  | "n2023_11"
  | "n2024_06"
  | "n2024_09"
  | "n2024_end";

export type UserEntries = Partial<Record<ChronicleNodeId, string>>;

export type BehaviorTag = {
  id: string;
  audience: ChronicleAudience[];
  dimension: string;
  label: string;
  synonyms: string[];
};

export type PrincipleRef = {
  name: string;
  note: string | null;
};

export type BehaviorTagMap = {
  version: number;
  source: string;
  tags: BehaviorTag[];
  principlesByTag: Record<string, PrincipleRef[]>;
};

export type ScoredTag = {
  id: string;
  label: string;
  score: number;
  dimension: string;
  sourceNodes: ChronicleNodeId[];
};

export type DistilledNode = {
  nodeId: ChronicleNodeId;
  text: string;
  keywords: string[];
};

export type MatchedPrinciple = {
  name: string;
  note: string | null;
  score: number;
  fromTags: string[];
};

export type ChronicleResult = {
  audience: ChronicleAudience;
  nodes: DistilledNode[];
  tags: ScoredTag[];
  confirmedTagIds: string[];
  principles: MatchedPrinciple[];
};

export type SharePayloadV3 = {
  v: 3;
  audience: ChronicleAudience;
  entries: UserEntries;
  confirmedTagIds: string[];
  authorName?: string;
  roleId?: AvatarRoleId;
  styleId?: AvatarStyleId;
  /** male | female — book-club avatar pack variant */
  gender?: AvatarGenderId;
  selectedTagIds?: string[];
  selectedPrinciples?: string[];
  price?: number;
};

/** @deprecated prefer SharePayloadV3 */
export type SharePayloadV2 = {
  v: 2;
  audience: ChronicleAudience;
  entries: UserEntries;
  confirmedTagIds: string[];
};

import type { ChronicleNodeId } from "./types";

/** Ordered CZ milestones for the shared chronology. Copy lives in i18n. */
export const CHRONICLE_NODE_IDS: ChronicleNodeId[] = [
  "n2013",
  "n2014",
  "n2017_06",
  "n2017_07",
  "n2017_09",
  "n2017_end",
  "n2019_safu",
  "n2019_eco",
  "n2021",
  "n2022_11",
  "n2023",
  "n2023_11",
  "n2024_06",
  "n2024_09",
  "n2024_end",
];

export const CHRONICLE_NODE_YEAR: Record<ChronicleNodeId, string> = {
  n2013: "2013",
  n2014: "2014",
  n2017_06: "2017.6",
  n2017_07: "2017.7",
  n2017_09: "2017.9",
  n2017_end: "2017末",
  n2019_safu: "2019",
  n2019_eco: "2019",
  n2021: "2021",
  n2022_11: "2022.11",
  n2023: "2023",
  n2023_11: "2023.11",
  n2024_06: "2024.6",
  n2024_09: "2024.9",
  n2024_end: "2024末",
};

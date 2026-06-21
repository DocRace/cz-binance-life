#!/usr/bin/env node
/** Merge public/data/i18n_batches/*.json into book_club_stories_i18n.json */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BATCH_DIR = path.join(ROOT, "public/data/i18n_batches");
const FIX_DIR = path.join(ROOT, "public/data/i18n_fixes");
const OUT = path.join(ROOT, "public/data/book_club_stories_i18n.json");

const doc = {
  format_version: 1,
  generated_at: new Date().toISOString(),
  source: "book_club_stories.json",
  targets: ["en", "ko", "ja"],
  by_id: {},
};

const keepExisting = process.argv.includes("--keep");
if (keepExisting && fs.existsSync(OUT)) {
  try {
    const prev = JSON.parse(fs.readFileSync(OUT, "utf8")).by_id || {};
    for (const [id, row] of Object.entries(prev)) {
      if (id.startsWith("tw-") && row && typeof row === "object") doc.by_id[id] = row;
    }
  } catch {
    /* fresh */
  }
}

if (fs.existsSync(BATCH_DIR)) {
  for (const file of fs.readdirSync(BATCH_DIR).filter((f) => /^batch\d+\.json$/.test(f))) {
    const part = JSON.parse(fs.readFileSync(path.join(BATCH_DIR, file), "utf8"));
    if (part?.by_id && typeof part.by_id === "object") {
      Object.assign(doc.by_id, part.by_id);
    }
  }
}

if (fs.existsSync(FIX_DIR)) {
  for (const file of fs.readdirSync(FIX_DIR).filter((f) => f.endsWith(".json"))) {
    const part = JSON.parse(fs.readFileSync(path.join(FIX_DIR, file), "utf8"));
    if (part?.by_id && typeof part.by_id === "object") {
      Object.assign(doc.by_id, part.by_id);
    }
  }
}

doc.generated_at = new Date().toISOString();
fs.writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
console.log(`Merged ${Object.keys(doc.by_id).length} stories -> ${OUT}`);

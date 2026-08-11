#!/usr/bin/env node
/**
 * Regenerates public/data/cz_behavior_tag_map.json from scripts/data/行为标签匹配表.xlsx
 * Requires Python 3 + openpyxl.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const py = path.join(__dirname, "import_behavior_tag_map.py");
const xlsxArg = process.argv[2];

const cmd = ["python3", py, ...(xlsxArg ? [xlsxArg] : [])];
const res = spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit" });
process.exit(res.status ?? 1);

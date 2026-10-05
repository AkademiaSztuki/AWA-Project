#!/usr/bin/env node
/**
 * Regenerates charts-data.json and embeds it into the IDA research canvas.
 *
 * Usage (from docs/thesis/data):
 *   node sync-canvas-charts.mjs [analysis-YYYY-MM-DD.json]
 *
 * After a new SQL pull: run aggregate queries (see snapshot-*.sql), save as
 * analysis-<date>.json, then run this script with that filename.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const analysisArg = process.argv[2] ?? "analysis-2026-10-01.json";
const analysisPath = path.isAbsolute(analysisArg)
  ? analysisArg
  : path.join(__dirname, analysisArg);

if (!fs.existsSync(analysisPath)) {
  console.error(`Analysis file not found: ${analysisPath}`);
  process.exit(1);
}

const base = path.basename(analysisPath, ".json");
const dateMatch = base.match(/analysis-(\d{4}-\d{2}-\d{2})/);
const snapshotDate = dateMatch?.[1] ?? "unknown";

const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf8"));
const chartsData = {
  meta: {
    snapshotDate,
    sqlFile: `snapshot-${snapshotDate}.sql`,
    analysisFile: path.basename(analysisPath),
    description: "Zagregowane metryki badawcze IDA (bez PII).",
    syncedAt: new Date().toISOString(),
  },
  ...analysis,
};

const chartsDataPath = path.join(__dirname, "charts-data.json");
fs.writeFileSync(chartsDataPath, `${JSON.stringify(chartsData, null, 2)}\n`);

const defaultCanvas = path.join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  ".cursor/projects/c-Users-JakubPalka-Desktop-AWA-Project-docs-thesis/canvases/ida-research-snapshot.canvas.tsx",
);

const canvasPath = process.env.IDA_CANVAS_PATH ?? defaultCanvas;

if (!fs.existsSync(canvasPath)) {
  console.warn(`Canvas not found (skipped embed): ${canvasPath}`);
  console.log(`Wrote ${chartsDataPath}`);
  process.exit(0);
}

const canvas = fs.readFileSync(canvasPath, "utf8");
const start = "// BEGIN CHARTS_DATA";
const end = "// END CHARTS_DATA";
const startIdx = canvas.indexOf(start);
const endIdx = canvas.indexOf(end);

if (startIdx === -1 || endIdx === -1) {
  console.error("Canvas missing CHARTS_DATA markers.");
  process.exit(1);
}

const embedded = `const CHARTS_DATA = ${JSON.stringify(chartsData, null, 2)} as const;`;
const next =
  canvas.slice(0, startIdx + start.length) +
  "\n" +
  embedded +
  "\n" +
  canvas.slice(endIdx);

fs.writeFileSync(canvasPath, next);
console.log(`Updated ${chartsDataPath}`);
console.log(`Embedded data into ${canvasPath}`);

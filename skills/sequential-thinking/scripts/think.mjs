#!/usr/bin/env node
/**
 * Sequential thinking state machine — zero-dependency Node port of think.ts.
 * Local adaptation file (upstream has no .mjs); logic mirrors think.ts line-for-line
 * with TypeScript type annotations removed. Keep in sync when upstream changes.
 *
 * Usage:
 *   node think.mjs --thought "analysis here" --thoughtNumber 1 --totalThoughts 5 --nextThoughtNeeded true
 *   node think.mjs --thought "revised" --thoughtNumber 3 --totalThoughts 5 --nextThoughtNeeded true --isRevision --revisesThought 1
 *   node think.mjs --thought "alt path" --thoughtNumber 4 --totalThoughts 7 --nextThoughtNeeded true --branchFromThought 2 --branchId alt-approach
 *   node think.mjs --status
 *   node think.mjs --reset
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, ".think_state.json");

function loadState() {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  }
  return { thoughtHistory: [], branches: {} };
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function formatThought(t) {
  let header;

  if (t.isRevision && t.revisesThought != null) {
    header = `🔄 Revision ${t.thoughtNumber}/${t.totalThoughts} (revising thought ${t.revisesThought})`;
  } else if (t.branchFromThought != null && t.branchId != null) {
    header = `🌿 Branch ${t.thoughtNumber}/${t.totalThoughts} (from thought ${t.branchFromThought}, ID: ${t.branchId})`;
  } else {
    header = `💭 Thought ${t.thoughtNumber}/${t.totalThoughts}`;
  }

  return `${header}\n${t.thought}`;
}

function makeStatusResponse(state) {
  const branchIds = Object.keys(state.branches);
  const historyLength = state.thoughtHistory.length;

  if (historyLength === 0) {
    return {
      thoughtNumber: 0,
      totalThoughts: 0,
      nextThoughtNeeded: true,
      branches: branchIds,
      thoughtHistoryLength: historyLength,
    };
  }

  const latest = state.thoughtHistory[historyLength - 1];
  return {
    thoughtNumber: latest.thoughtNumber,
    totalThoughts: latest.totalThoughts,
    nextThoughtNeeded: latest.nextThoughtNeeded,
    branches: branchIds,
    thoughtHistoryLength: historyLength,
  };
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

// --- Parse CLI args ---

const { values } = parseArgs({
  options: {
    thought: { type: "string" },
    thoughtNumber: { type: "string" },
    totalThoughts: { type: "string" },
    nextThoughtNeeded: { type: "string" },
    isRevision: { type: "boolean", default: false },
    revisesThought: { type: "string" },
    branchFromThought: { type: "string" },
    branchId: { type: "string" },
    needsMoreThoughts: { type: "boolean", default: false },
    status: { type: "boolean", default: false },
    reset: { type: "boolean", default: false },
  },
  strict: true,
});

// --- Commands ---

if (values.reset) {
  if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
  console.log(JSON.stringify({ status: "reset", message: "Thinking session cleared" }, null, 2));
  process.exit(0);
}

const state = loadState();

if (values.status) {
  const response = {
    ...makeStatusResponse(state),
    fullHistory: state.thoughtHistory,
    branchDetails: state.branches,
  };
  console.log(JSON.stringify(response, null, 2));
  process.exit(0);
}

// --- Validate required fields ---

if (!values.thought) fail("--thought is required");
if (!values.thoughtNumber) fail("--thoughtNumber is required");
if (!values.totalThoughts) fail("--totalThoughts is required");
if (!values.nextThoughtNeeded) fail("--nextThoughtNeeded is required");

const thoughtNumber = parseInt(values.thoughtNumber, 10);
let totalThoughts = parseInt(values.totalThoughts, 10);
const nextThoughtNeeded = values.nextThoughtNeeded.toLowerCase() === "true";

if (isNaN(thoughtNumber) || thoughtNumber < 1) fail("--thoughtNumber must be an integer >= 1");
if (isNaN(totalThoughts) || totalThoughts < 1) fail("--totalThoughts must be an integer >= 1");

// Auto-adjust
if (thoughtNumber > totalThoughts) {
  totalThoughts = thoughtNumber;
}

const thoughtData = {
  thought: values.thought,
  thoughtNumber,
  totalThoughts,
  nextThoughtNeeded,
};

if (values.isRevision) {
  if (!values.revisesThought) fail("--revisesThought is required when --isRevision is set");
  const revisesThought = parseInt(values.revisesThought, 10);
  if (isNaN(revisesThought) || revisesThought < 1) fail("--revisesThought must be an integer >= 1");
  thoughtData.isRevision = true;
  thoughtData.revisesThought = revisesThought;
}

if (values.branchFromThought != null) {
  if (!values.branchId) fail("--branchId is required when --branchFromThought is set");
  const branchFrom = parseInt(values.branchFromThought, 10);
  if (isNaN(branchFrom) || branchFrom < 1) fail("--branchFromThought must be an integer >= 1");
  thoughtData.branchFromThought = branchFrom;
  thoughtData.branchId = values.branchId;
}

if (values.needsMoreThoughts) {
  thoughtData.needsMoreThoughts = true;
}

// --- Append to history (never delete, only append) ---

state.thoughtHistory.push(thoughtData);

// --- Track branches ---

if (thoughtData.branchFromThought != null && thoughtData.branchId != null) {
  if (!state.branches[thoughtData.branchId]) {
    state.branches[thoughtData.branchId] = [];
  }
  state.branches[thoughtData.branchId].push(thoughtData);
}

saveState(state);

// Formatted thought → stderr (visual)
console.error(formatThought(thoughtData));

// Structured JSON → stdout (machine-readable)
const status = makeStatusResponse(state);
const branchList = status.branches.length > 0 ? ` branches=${status.branches.join(",")}` : "";
console.log(`[${status.thoughtNumber}/${status.totalThoughts}] history=${status.thoughtHistoryLength}${branchList} next=${status.nextThoughtNeeded}`);

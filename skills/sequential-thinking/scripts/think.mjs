#!/usr/bin/env node
/**
 * Sequential thinking state machine — esbuild-generated from think.ts (do not edit by hand).
 * Local adaptation file (upstream has no .mjs). Regenerate after syncing think.ts:
 *   npx -y esbuild skills/sequential-thinking/scripts/think.ts --platform=node --format=esm \
 *     --outfile=skills/sequential-thinking/scripts/think.mjs
 * then restore the node shebang and this header block.
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
function saveState(state2) {
  writeFileSync(STATE_FILE, JSON.stringify(state2, null, 2));
}
function formatThought(t) {
  let header;
  if (t.isRevision && t.revisesThought != null) {
    header = `\u{1F504} Revision ${t.thoughtNumber}/${t.totalThoughts} (revising thought ${t.revisesThought})`;
  } else if (t.branchFromThought != null && t.branchId != null) {
    header = `\u{1F33F} Branch ${t.thoughtNumber}/${t.totalThoughts} (from thought ${t.branchFromThought}, ID: ${t.branchId})`;
  } else {
    header = `\u{1F4AD} Thought ${t.thoughtNumber}/${t.totalThoughts}`;
  }
  return `${header}
${t.thought}`;
}
function makeStatusResponse(state2) {
  const branchIds = Object.keys(state2.branches);
  const historyLength = state2.thoughtHistory.length;
  if (historyLength === 0) {
    return {
      thoughtNumber: 0,
      totalThoughts: 0,
      nextThoughtNeeded: true,
      branches: branchIds,
      thoughtHistoryLength: historyLength
    };
  }
  const latest = state2.thoughtHistory[historyLength - 1];
  return {
    thoughtNumber: latest.thoughtNumber,
    totalThoughts: latest.totalThoughts,
    nextThoughtNeeded: latest.nextThoughtNeeded,
    branches: branchIds,
    thoughtHistoryLength: historyLength
  };
}
function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}
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
    reset: { type: "boolean", default: false }
  },
  strict: true
});
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
    branchDetails: state.branches
  };
  console.log(JSON.stringify(response, null, 2));
  process.exit(0);
}
if (!values.thought) fail("--thought is required");
if (!values.thoughtNumber) fail("--thoughtNumber is required");
if (!values.totalThoughts) fail("--totalThoughts is required");
if (!values.nextThoughtNeeded) fail("--nextThoughtNeeded is required");
const thoughtNumber = parseInt(values.thoughtNumber, 10);
let totalThoughts = parseInt(values.totalThoughts, 10);
const nextThoughtNeeded = values.nextThoughtNeeded.toLowerCase() === "true";
if (isNaN(thoughtNumber) || thoughtNumber < 1) fail("--thoughtNumber must be an integer >= 1");
if (isNaN(totalThoughts) || totalThoughts < 1) fail("--totalThoughts must be an integer >= 1");
if (thoughtNumber > totalThoughts) {
  totalThoughts = thoughtNumber;
}
const thoughtData = {
  thought: values.thought,
  thoughtNumber,
  totalThoughts,
  nextThoughtNeeded
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
state.thoughtHistory.push(thoughtData);
if (thoughtData.branchFromThought != null && thoughtData.branchId != null) {
  if (!state.branches[thoughtData.branchId]) {
    state.branches[thoughtData.branchId] = [];
  }
  state.branches[thoughtData.branchId].push(thoughtData);
}
saveState(state);
console.error(formatThought(thoughtData));
const status = makeStatusResponse(state);
const branchList = status.branches.length > 0 ? ` branches=${status.branches.join(",")}` : "";
console.log(`[${status.thoughtNumber}/${status.totalThoughts}] history=${status.thoughtHistoryLength}${branchList} next=${status.nextThoughtNeeded}`);

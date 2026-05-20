#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ACTIONS = new Set(["explore", "plan", "implement", "accept", "archive"]);
const RUN_STATES = new Set(["idle", "in_progress", "paused", "blocked", "completed"]);
const STATUSES = new Set(["active", "archived"]);
const ACCEPT_RESULTS = new Set(["pass", "changes_required", "blocked"]);
const DOMAINS = new Set(["software", "research", "ops", "process", "general"]);

const cwd = process.cwd();
const specsRoot = path.join(cwd, ".specs");
const binDir = path.join(specsRoot, "bin");
const activeDir = path.join(specsRoot, "active");
const archiveDir = path.join(specsRoot, "archive");
const registryPath = path.join(specsRoot, "registry.json");

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (!command) {
    fail("help", "Missing command");
  }

  try {
    switch (command) {
      case "init":
        ok(command, await handleInit());
        break;
      case "new":
        ok(command, await handleNew(args));
        break;
      case "status":
        ok(command, await handleStatus(args));
        break;
      case "checkpoint":
        ok(command, await handleCheckpoint(args));
        break;
      case "amend":
        ok(command, await handleAmend(args));
        break;
      case "accept":
        ok(command, await handleAccept(args));
        break;
      case "archive":
        ok(command, await handleArchive(args));
        break;
      case "resume":
        ok(command, await handleResume(args));
        break;
      default:
        fail(command, `Unknown command: ${command}`);
    }
  } catch (error) {
    fail(command, error instanceof Error ? error.message : String(error));
  }
}

function parseArgs(argv) {
  const parsed = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      parsed._.push(token);
      continue;
    }

    const key = camelCase(token.slice(2));
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      index += 1;
      continue;
    }

    parsed[key] = true;
  }

  return parsed;
}

function camelCase(flag) {
  return flag.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function nowIso() {
  return new Date().toISOString();
}

function localDateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

function ensureEnum(value, allowed, fieldName) {
  if (value == null) {
    return;
  }
  if (!allowed.has(value)) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
}

function parseBoolean(value, fieldName) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`Invalid ${fieldName}: ${value}`);
}

function parseNumber(value, fieldName) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return numeric;
}

function splitCsv(value) {
  if (!value) {
    return [];
  }
  return [...new Set(String(value).split(",").map((item) => item.trim()).filter(Boolean))];
}

function relativePath(targetPath) {
  return path.relative(cwd, targetPath) || ".";
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function atomicWrite(filePath, content) {
  await ensureDir(path.dirname(filePath));
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, content, "utf8");
  await fs.rename(tmpPath, filePath);
}

async function atomicWriteJson(filePath, value) {
  await atomicWrite(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(filePath, fallback = undefined) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === "ENOENT" && fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function defaultRegistry() {
  return {
    version: "1.0.0",
    specs: [],
  };
}

async function loadRegistry() {
  return readJson(registryPath, defaultRegistry());
}

async function saveRegistry(registry) {
  await atomicWriteJson(registryPath, registry);
}

function baseProgress({ specId, title, domain, action, runState, createdAt }) {
  return {
    specId,
    title,
    domain,
    status: "active",
    currentAction: action,
    runState,
    version: 1,
    currentStep: null,
    completedSteps: [],
    completionPercent: 0,
    blockedReason: null,
    resumePoint: {
      action,
      step: null,
    },
    amendments: [],
    acceptance: {
      result: null,
      round: 0,
      reportPath: null,
    },
    audit: {
      lastActor: "spec-flow-runtime",
      lastCommand: null,
    },
    timestamps: {
      startedAt: createdAt,
      lastUpdatedAt: createdAt,
      pausedAt: null,
    },
  };
}

function specPlaceholder({ specId, title, domain, action, version, createdAt, updatedAt }) {
  return `# ${title}

## 元数据
| 字段 | 值 |
|------|----|
| Spec ID | ${specId} |
| Domain | ${domain} |
| 状态 | active |
| 当前 Action | ${action} |
| 版本 | ${version} |
| 创建时间 | ${createdAt.slice(0, 10)} |
| 更新时间 | ${updatedAt.slice(0, 10)} |

## 1. 问题与目标

## 2. 约束与范围

## 3. 探索结论

## 4. 方案设计

## 5. 实施计划

## 6. 验收标准

## 7. 变更记录
`;
}

function planPlaceholder() {
  return `# Plan

## Action 概览
- Explore 摘要:
- Plan 决策:
- Implement 路径:
- Accept 方法:
- Archive 条件:

## Step List

### 阶段 A
- A.1
- A.2

### 阶段 B
- B.1
- B.2

## 风险与缓解

## 依赖与证据
`;
}

function acceptancePlaceholder() {
  return `# Acceptance Report

## Result
- pending

## Scope
- Covered:
- Not covered:

## Findings

### CRITICAL

### MAJOR

### MINOR

### SUGGESTION

## Coverage Check

## Evidence

## Next Action
- implement / archive
`;
}

function archivePlaceholder() {
  return `# Archive Summary

## Outcome

## Final Acceptance

## Key Decisions

## Amendments

## Residual Risks
`;
}

async function ensureSpecFiles(specDir, metadata) {
  const files = [
    { name: "spec.md", content: specPlaceholder(metadata) },
    { name: "plan.md", content: planPlaceholder() },
    { name: "acceptance-report.md", content: acceptancePlaceholder() },
    { name: "archive-summary.md", content: archivePlaceholder() },
  ];

  for (const file of files) {
    const filePath = path.join(specDir, file.name);
    if (!(await exists(filePath))) {
      await atomicWrite(filePath, file.content);
    }
  }
}

function getSpecDir(specId, status = "active") {
  return path.join(status === "archived" ? archiveDir : activeDir, specId);
}

function updateRegistryRecord(registry, specId, mutate) {
  const index = registry.specs.findIndex((item) => item.id === specId);
  if (index === -1) {
    throw new Error(`Spec not found: ${specId}`);
  }
  mutate(registry.specs[index]);
  return registry.specs[index];
}

async function loadSpecContext(specId) {
  const registry = await loadRegistry();
  const record = registry.specs.find((item) => item.id === specId);
  if (!record) {
    throw new Error(`Spec not found: ${specId}`);
  }

  const specDir = path.join(cwd, record.path);
  const progressPath = path.join(specDir, "progress.json");
  const progress = await readJson(progressPath);
  return { registry, record, specDir, progress, progressPath };
}

async function handleInit() {
  const created = [];
  for (const dir of [specsRoot, binDir, activeDir, archiveDir]) {
    if (!(await exists(dir))) {
      created.push(relativePath(dir));
    }
    await ensureDir(dir);
  }

  const registryExists = await exists(registryPath);
  if (!registryExists) {
    await saveRegistry(defaultRegistry());
  }

  return {
    created,
    registryPath: relativePath(registryPath),
    runtimePath: relativePath(path.join(binDir, "spec-flow.mjs")),
    registryInitialized: !registryExists,
  };
}

async function handleNew(args) {
  const title = String(args.title || "").trim();
  const domain = String(args.domain || "general").trim();
  const mode = String(args.mode || "active").trim();

  if (!title) {
    throw new Error("Missing --title");
  }
  ensureEnum(domain, DOMAINS, "domain");
  if (!["active", "draft"].includes(mode)) {
    throw new Error(`Invalid mode: ${mode}`);
  }

  await handleInit();
  const registry = await loadRegistry();
  const stamp = localDateStamp();
  const matching = registry.specs
    .map((item) => item.id)
    .filter((id) => id.startsWith(`spec-${stamp}-`))
    .map((id) => Number(id.slice(-3)))
    .filter((value) => Number.isInteger(value));
  const nextSerial = `${(Math.max(0, ...matching) + 1)}`.padStart(3, "0");
  const specId = `spec-${stamp}-${nextSerial}`;
  const createdAt = nowIso();
  const action = mode === "draft" ? "explore" : "plan";
  const runState = mode === "draft" ? "completed" : "idle";
  const specDir = getSpecDir(specId, "active");

  await ensureDir(specDir);
  const progress = baseProgress({ specId, title, domain, action, runState, createdAt });
  const progressPath = path.join(specDir, "progress.json");

  await ensureSpecFiles(specDir, {
    specId,
    title,
    domain,
    action,
    version: progress.version,
    createdAt,
    updatedAt: createdAt,
  });
  await atomicWriteJson(progressPath, progress);

  const record = {
    id: specId,
    title,
    domain,
    status: "active",
    currentAction: action,
    runState,
    version: 1,
    acceptanceResult: null,
    acceptanceReportPath: null,
    completionPercent: 0,
    createdAt,
    updatedAt: createdAt,
    archivedAt: null,
    path: relativePath(specDir),
  };
  registry.specs.push(record);
  await saveRegistry(registry);

  return {
    specId,
    title,
    domain,
    mode,
    path: record.path,
  };
}

async function handleStatus(args) {
  const specId = args.specId;
  const registry = await loadRegistry();

  if (!specId) {
    const activeSpecs = registry.specs
      .filter((item) => item.status === "active")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return {
      specs: activeSpecs,
      count: activeSpecs.length,
    };
  }

  const { record, progress } = await loadSpecContext(specId);
  return {
    spec: record,
    progress,
  };
}

async function handleCheckpoint(args) {
  const specId = String(args.specId || "").trim();
  if (!specId) {
    throw new Error("Missing --spec-id");
  }

  const { registry, record, progress, progressPath } = await loadSpecContext(specId);
  const timestamp = nowIso();

  if (args.action) {
    ensureEnum(args.action, ACTIONS, "action");
    progress.currentAction = args.action;
    record.currentAction = args.action;
  }
  if (args.runState) {
    ensureEnum(args.runState, RUN_STATES, "run-state");
    progress.runState = args.runState;
    record.runState = args.runState;
  }
  if (args.currentStep !== undefined) {
    progress.currentStep = args.currentStep || null;
  }
  if (args.completedSteps !== undefined) {
    progress.completedSteps = splitCsv(args.completedSteps);
  }
  if (args.completionPercent !== undefined) {
    const completionPercent = parseNumber(args.completionPercent, "completion-percent");
    progress.completionPercent = completionPercent;
    record.completionPercent = completionPercent;
  }
  if (args.blockedReason !== undefined) {
    progress.blockedReason = args.blockedReason || null;
  }

  progress.resumePoint = {
    action: args.resumeAction || progress.currentAction,
    step: args.resumeStep !== undefined ? args.resumeStep || null : progress.currentStep,
  };
  progress.audit.lastCommand = args.lastCommand || null;
  progress.audit.lastActor = "spec-flow-runtime";
  progress.timestamps.lastUpdatedAt = timestamp;
  progress.timestamps.pausedAt = progress.runState === "paused" ? timestamp : null;

  record.updatedAt = timestamp;

  await atomicWriteJson(progressPath, progress);
  await saveRegistry(registry);

  return {
    specId,
    currentAction: progress.currentAction,
    runState: progress.runState,
    currentStep: progress.currentStep,
    completedSteps: progress.completedSteps,
    completionPercent: progress.completionPercent,
    resumePoint: progress.resumePoint,
  };
}

async function handleAmend(args) {
  const specId = String(args.specId || "").trim();
  const summary = String(args.summary || "").trim();
  const type = String(args.type || "minor").trim();
  const reason = String(args.reason || "").trim();
  const approvedByUser = parseBoolean(args.approvedByUser ?? "false", "approved-by-user");

  if (!specId) {
    throw new Error("Missing --spec-id");
  }
  if (!summary) {
    throw new Error("Missing --summary");
  }
  if (!["minor", "major"].includes(type)) {
    throw new Error(`Invalid amendment type: ${type}`);
  }

  const { registry, progress, progressPath } = await loadSpecContext(specId);
  const timestamp = nowIso();

  progress.version += 1;
  progress.amendments.push({
    version: progress.version,
    type,
    summary,
    reason,
    approvedByUser,
    timestamp,
  });
  progress.timestamps.lastUpdatedAt = timestamp;
  progress.audit.lastActor = "spec-flow-runtime";
  progress.audit.lastCommand = "amend";

  const record = updateRegistryRecord(registry, specId, (item) => {
    item.version = progress.version;
    item.updatedAt = timestamp;
  });

  await atomicWriteJson(progressPath, progress);
  await saveRegistry(registry);

  return {
    specId,
    version: progress.version,
    amendment: progress.amendments.at(-1),
    currentAction: record.currentAction,
  };
}

async function handleAccept(args) {
  const specId = String(args.specId || "").trim();
  const result = String(args.result || "").trim();
  const reportPathInput = args.reportPath ? String(args.reportPath).trim() : null;

  if (!specId) {
    throw new Error("Missing --spec-id");
  }
  ensureEnum(result, ACCEPT_RESULTS, "result");

  const { registry, progress, progressPath } = await loadSpecContext(specId);
  const timestamp = nowIso();
  const nextAction = result === "changes_required" ? "implement" : "accept";
  const nextRunState =
    result === "changes_required"
      ? "in_progress"
      : result === "blocked"
        ? "blocked"
        : "completed";

  progress.currentAction = nextAction;
  progress.runState = nextRunState;
  progress.acceptance = {
    result,
    round: progress.acceptance.round + 1,
    reportPath: reportPathInput,
  };
  progress.resumePoint = {
    action: nextAction,
    step: result === "changes_required" ? progress.currentStep : null,
  };
  progress.timestamps.lastUpdatedAt = timestamp;
  progress.audit.lastActor = "spec-flow-runtime";
  progress.audit.lastCommand = "accept";

  updateRegistryRecord(registry, specId, (item) => {
    item.currentAction = nextAction;
    item.runState = nextRunState;
    item.acceptanceResult = result;
    item.acceptanceReportPath = reportPathInput;
    item.updatedAt = timestamp;
  });

  await atomicWriteJson(progressPath, progress);
  await saveRegistry(registry);

  return {
    specId,
    result,
    nextAction,
    nextRunState,
    round: progress.acceptance.round,
  };
}

async function handleArchive(args) {
  const specId = String(args.specId || "").trim();
  const force = Boolean(args.force);
  const summaryPathInput = args.summaryPath ? String(args.summaryPath).trim() : null;

  if (!specId) {
    throw new Error("Missing --spec-id");
  }

  const { registry, record, progress, specDir } = await loadSpecContext(specId);
  if (record.status === "archived") {
    throw new Error(`Spec already archived: ${specId}`);
  }
  if (progress.acceptance.result !== "pass" && !force) {
    throw new Error("Spec has not passed acceptance. Use --force only after explicit user confirmation.");
  }

  const targetDir = getSpecDir(specId, "archived");
  if (await exists(targetDir)) {
    throw new Error(`Archive target already exists: ${relativePath(targetDir)}`);
  }

  const timestamp = nowIso();
  progress.status = "archived";
  progress.currentAction = "archive";
  progress.runState = "completed";
  progress.resumePoint = {
    action: "archive",
    step: null,
  };
  progress.timestamps.lastUpdatedAt = timestamp;
  progress.audit.lastActor = "spec-flow-runtime";
  progress.audit.lastCommand = "archive";

  await ensureDir(path.dirname(targetDir));
  await fs.rename(specDir, targetDir);

  const archivedProgressPath = path.join(targetDir, "progress.json");
  const archivedReportPath = progress.acceptance.reportPath
    ? path.join(targetDir, path.basename(progress.acceptance.reportPath))
    : null;
  const archivedSummaryPath = summaryPathInput ? path.join(targetDir, path.basename(summaryPathInput)) : null;
  if (archivedReportPath) {
    progress.acceptance.reportPath = relativePath(archivedReportPath);
  }
  await atomicWriteJson(archivedProgressPath, progress);

  updateRegistryRecord(registry, specId, (item) => {
    item.status = "archived";
    item.currentAction = "archive";
    item.runState = "completed";
    item.updatedAt = timestamp;
    item.archivedAt = timestamp;
    item.path = relativePath(targetDir);
    item.acceptanceReportPath = progress.acceptance.reportPath;
  });
  await saveRegistry(registry);

  return {
    specId,
    archived: true,
    forced: force,
    path: relativePath(targetDir),
    archivedAt: timestamp,
    summaryPath: archivedSummaryPath ? relativePath(archivedSummaryPath) : null,
  };
}

async function handleResume(args) {
  const specId = args.specId ? String(args.specId).trim() : null;
  const registry = await loadRegistry();

  let record;
  if (specId) {
    record = registry.specs.find((item) => item.id === specId);
  } else {
    record = registry.specs
      .filter((item) => item.status === "active")
      .sort((left, right) => {
        const rank = {
          in_progress: 0,
          paused: 1,
          blocked: 2,
          idle: 3,
          completed: 4,
        };
        const leftRank = rank[left.runState] ?? 99;
        const rightRank = rank[right.runState] ?? 99;
        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }
        return right.updatedAt.localeCompare(left.updatedAt);
      })[0];
  }

  if (!record) {
    throw new Error(specId ? `Spec not found: ${specId}` : "No active spec found");
  }
  if (record.status === "archived") {
    throw new Error(`Cannot resume archived spec: ${record.id}`);
  }

  const progress = await readJson(path.join(cwd, record.path, "progress.json"));
  const suggestedCommand = `/spec-flow ${progress.resumePoint?.action || record.currentAction}${record.id ? ` ${record.id}` : ""}`.trim();

  return {
    specId: record.id,
    title: record.title,
    status: record.status,
    currentAction: progress.currentAction,
    runState: progress.runState,
    resumePoint: progress.resumePoint,
    lastUpdatedAt: progress.timestamps.lastUpdatedAt,
    suggestedCommand,
  };
}

function ok(command, payload) {
  process.stdout.write(`${JSON.stringify({ ok: true, command, ...payload }, null, 2)}\n`);
}

function fail(command, message) {
  process.stderr.write(`${JSON.stringify({ ok: false, command, message }, null, 2)}\n`);
  process.exit(1);
}

await main();

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
      case "doctor":
        ok(command, await handleDoctor(args));
        break;
      default:
        fail(command, `Unknown command: ${command}`);
    }
  } catch (error) {
    fail(command, error instanceof Error ? error.message : String(error));
  }
}

// 允许同一 flag 重复出现并收集为数组的参数（如 --evidence "a::b" --evidence "c::d"）。
// 其余 flag 保持单值行为：重复时后值覆盖前值。
const MULTI_VALUE_KEYS = new Set(["evidence"]);

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
    const value = next && !next.startsWith("--") ? next : true;
    if (value !== true) {
      index += 1;
    }

    if (MULTI_VALUE_KEYS.has(key)) {
      if (!Array.isArray(parsed[key])) {
        parsed[key] = [];
      }
      parsed[key].push(value);
      continue;
    }

    parsed[key] = value;
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
    evidence: [],
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

  if (Array.isArray(args.evidence)) {
    progress.evidence ??= []; // 旧版 progress.json 无该字段，append 前兜底
    for (const entry of args.evidence) {
      const raw = String(entry);
      const separatorIndex = raw.indexOf("::");
      if (separatorIndex === -1) {
        throw new Error(`Invalid --evidence (expected "<desc>::<path-or-command>"): ${raw}`);
      }
      const desc = raw.slice(0, separatorIndex).trim();
      const ref = raw.slice(separatorIndex + 2).trim();
      if (!desc || !ref) {
        throw new Error(`Invalid --evidence (empty desc or ref): ${raw}`);
      }
      progress.evidence.push({
        step: progress.currentStep,
        desc,
        ref,
        at: timestamp,
      });
    }
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
    evidenceCount: (progress.evidence ?? []).length,
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

async function handleDoctor(args) {
  const fix = Boolean(args.fix);
  const registry = await loadRegistry();
  const issues = [];
  const fixed = [];

  // 1. registry 记录侧检查
  for (const record of registry.specs) {
    const specDir = path.join(cwd, record.path);
    const progressPath = path.join(specDir, "progress.json");

    if (!(await exists(specDir))) {
      issues.push({
        specId: record.id,
        type: "missing_spec_dir",
        detail: `registry 记录的目录不存在: ${record.path}`,
        suggestedFix: "目录缺失不可自动修复：从备份/git 历史恢复目录，或人工确认后从 registry 移除该条目",
      });
      continue;
    }

    // 归档目录与 registry 路径一致性
    const expectedParent = record.status === "archived" ? archiveDir : activeDir;
    if (path.dirname(specDir) !== expectedParent) {
      issues.push({
        specId: record.id,
        type: "status_path_mismatch",
        detail: `status=${record.status} 但目录在 ${relativePath(path.dirname(specDir))}/ 下`,
        suggestedFix: "人工确认实际状态：目录在 archive/ 则 registry status 应为 archived（可用 --fix 以 progress.json 为准回写）",
      });
    }

    if (!(await exists(progressPath))) {
      issues.push({
        specId: record.id,
        type: "missing_progress",
        detail: `progress.json 缺失: ${relativePath(progressPath)}`,
        suggestedFix: "progress.json 缺失不可自动修复：从 git 历史恢复，或按 spec.md/plan.md 现状人工重建",
      });
      continue;
    }

    let progress;
    try {
      progress = await readJson(progressPath);
    } catch {
      issues.push({
        specId: record.id,
        type: "corrupt_progress",
        detail: `progress.json 不是合法 JSON: ${relativePath(progressPath)}`,
        suggestedFix: "文件损坏不可自动修复：从 git 历史恢复该文件",
      });
      continue;
    }

    // registry 与 progress 字段一致性（progress 更接近执行现场，以其为准）
    const driftFields = [];
    if (record.currentAction !== progress.currentAction) {
      driftFields.push(`currentAction(registry=${record.currentAction}, progress=${progress.currentAction})`);
    }
    if (record.runState !== progress.runState) {
      driftFields.push(`runState(registry=${record.runState}, progress=${progress.runState})`);
    }
    if (record.status !== progress.status) {
      driftFields.push(`status(registry=${record.status}, progress=${progress.status})`);
    }
    if (record.version !== progress.version) {
      driftFields.push(`version(registry=${record.version}, progress=${progress.version})`);
    }
    if (driftFields.length > 0) {
      if (fix) {
        updateRegistryRecord(registry, record.id, (item) => {
          item.currentAction = progress.currentAction;
          item.runState = progress.runState;
          item.status = progress.status;
          item.version = progress.version;
          item.updatedAt = nowIso();
        });
        fixed.push({ specId: record.id, type: "registry_progress_drift", action: "以 progress.json 为准回写 registry" });
      } else {
        issues.push({
          specId: record.id,
          type: "registry_progress_drift",
          detail: `registry 与 progress 不一致: ${driftFields.join("; ")}`,
          suggestedFix: "安全修复：doctor --fix 以 progress.json 为准回写 registry（progress 更接近执行现场）",
        });
      }
    }

    // 验收报告路径存在但文件缺失
    if (record.acceptanceReportPath && !(await exists(path.join(cwd, record.acceptanceReportPath)))) {
      issues.push({
        specId: record.id,
        type: "missing_acceptance_report",
        detail: `registry 记录的验收报告不存在: ${record.acceptanceReportPath}`,
        suggestedFix: "报告文件缺失不可自动修复：重新执行 accept 生成报告，或从 git 历史恢复",
      });
    }
  }

  // 2. 目录侧检查：孤儿目录（目录存在但 registry 无记录）
  const knownIds = new Set(registry.specs.map((item) => item.id));
  for (const [dirRoot, statusLabel] of [[activeDir, "active"], [archiveDir, "archived"]]) {
    if (!(await exists(dirRoot))) {
      continue;
    }
    for (const name of await fs.readdir(dirRoot)) {
      const candidate = path.join(dirRoot, name);
      if (!(await fs.stat(candidate)).isDirectory() || knownIds.has(name)) {
        continue;
      }
      const orphanProgressPath = path.join(candidate, "progress.json");
      if (fix && (await exists(orphanProgressPath))) {
        let progress;
        try {
          progress = await readJson(orphanProgressPath);
        } catch {
          issues.push({
            specId: name,
            type: "orphan_dir",
            detail: `孤儿目录且 progress.json 损坏: ${relativePath(candidate)}`,
            suggestedFix: "不可自动修复：人工检查目录内容",
          });
          continue;
        }
        registry.specs.push({
          id: progress.specId ?? name,
          title: progress.title ?? name,
          domain: progress.domain ?? "general",
          status: progress.status ?? statusLabel,
          currentAction: progress.currentAction ?? "plan",
          runState: progress.runState ?? "idle",
          version: progress.version ?? 1,
          acceptanceResult: progress.acceptance?.result ?? null,
          acceptanceReportPath: progress.acceptance?.reportPath ?? null,
          completionPercent: progress.completionPercent ?? 0,
          createdAt: progress.timestamps?.startedAt ?? nowIso(),
          updatedAt: nowIso(),
          archivedAt: statusLabel === "archived" ? nowIso() : null,
          path: relativePath(candidate),
        });
        fixed.push({ specId: name, type: "orphan_dir", action: "按 progress.json 重建 registry 条目" });
      } else {
        issues.push({
          specId: name,
          type: "orphan_dir",
          detail: `目录存在但 registry 无记录: ${relativePath(candidate)}`,
          suggestedFix: (await exists(orphanProgressPath))
            ? "安全修复：doctor --fix 按 progress.json 重建 registry 条目"
            : "无 progress.json，不可自动修复：人工检查目录内容",
        });
      }
    }
  }

  if (fix && fixed.length > 0) {
    await saveRegistry(registry);
  }

  return {
    healthy: issues.length === 0,
    issueCount: issues.length,
    issues,
    ...(fix ? { fixedCount: fixed.length, fixed } : {}),
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

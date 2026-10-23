#!/usr/bin/env node
// Model-scoped guidance, independent of spec discovery and drift enforcement.
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVENTS = new Set(['SessionStart', 'PostModelSwitch', 'UserPromptSubmit', 'SubagentStart']);
const hash = value => createHash('sha256').update(value).digest('hex');
const identifier = value => typeof value === 'string' && /^[\w.:/\[\]-]{1,256}$/.test(value) ? value : '';

function aliasesFrom(env) {
  const aliases = JSON.parse(env.SPEC_DEV_MODEL_ALIASES || '{}');
  if (!aliases || Array.isArray(aliases) || typeof aliases !== 'object') throw new Error('invalid aliases');
  for (const [key, value] of Object.entries(aliases)) {
    if (!identifier(key) || !identifier(value)) throw new Error('invalid alias entry');
  }
  return aliases;
}

export function resolveModel(raw, env = process.env) {
  let model = identifier(raw);
  if (!model) return { family: 'unknown', reason: 'missing-model' };
  let aliases;
  try { aliases = aliasesFrom(env); }
  catch { return { family: 'unknown', reason: 'invalid-alias-map' }; }
  const seen = new Set();
  while (Object.hasOwn(aliases, model)) {
    if (seen.has(model)) return { family: 'unknown', reason: 'alias-cycle' };
    seen.add(model);
    model = aliases[model];
  }
  // Only expand an actual family alias. A stale launcher variable must not
  // override the concrete model reported by a later /model switch.
  const slot = model.toLowerCase().replace(/\[1m\]$/, '');
  if (!seen.size && ['sonnet', 'opus', 'haiku', 'fable'].includes(slot)) {
    model = identifier(env[`ANTHROPIC_DEFAULT_${slot.toUpperCase()}_MODEL`]) || model;
  }
  const normalized = model.toLowerCase();
  if (/(^|[./:_-])(claude|opus|sonnet|haiku|fable)(?=$|[./:_\[-])/.test(normalized)) {
    return { family: 'claude', reason: 'excluded-family' };
  }
  const leaf = normalized.split('/').at(-1);
  for (const [family, pattern] of [
    ['gpt', /^gpt(?:[-.]|$)/], ['codex', /^codex(?:[-.]|$)/],
    ['kimi', /^(?:kimi|moonshot)(?:[-.]|$)/], ['glm', /^glm(?:[-.]|$)/],
  ]) {
    if (pattern.test(leaf)) return { family, reason: seen.size ? 'explicit-alias' : 'recognized-model' };
  }
  return { family: 'unknown', reason: 'unrecognized-model' };
}

function readState(file) {
  if (!file) return {};
  try {
    const directory = lstatSync(path.dirname(file));
    const info = lstatSync(file);
    if (!directory.isDirectory() || (directory.mode & 0o777) !== 0o700 || !info.isFile() ||
        info.size > 16_384 || (info.mode & 0o077) ||
        (process.getuid && (directory.uid !== process.getuid() || info.uid !== process.getuid()))) return {};
    const state = JSON.parse(readFileSync(file, 'utf8'));
    return state.version === 1 ? state : {};
  } catch { return {}; }
}

function saveState(file, state) {
  if (!file) return;
  const directory = path.dirname(file);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const info = lstatSync(directory);
  if (!info.isDirectory() || (info.mode & 0o077) ||
      (process.getuid && info.uid !== process.getuid())) throw new Error('unsafe state directory');
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, JSON.stringify(state), { mode: 0o600, flag: 'wx' });
    renameSync(temporary, file);
  } finally { rmSync(temporary, { force: true }); }
}

function policyPath() {
  const installed = path.join(HERE, 'model-collaboration.md');
  return existsSync(installed) ? installed : path.resolve(HERE, '../skills/requirement-analysis/references/model-collaboration.md');
}

export function runHook(event, { host, explain = false, env = process.env } = {}) {
  if (!['claude', 'codex'].includes(host) || !event || typeof event !== 'object' ||
      !EVENTS.has(event.hook_event_name)) return { enabled: false, family: 'unknown', reason: 'unsupported-event', output: '' };
  const kind = event.hook_event_name;
  const child = kind === 'SubagentStart' || Boolean(event.agent_id);
  const agent = identifier(event.agent_id);
  const session = identifier(event.session_id);
  const scope = child ? `agent:${agent ? hash(agent).slice(0, 12) : 'unknown'}` : 'main';
  const directory = env.SPEC_DEV_COLLABORATION_STATE_DIR || path.join(os.tmpdir(), `spec-dev-collaboration-${process.getuid?.() ?? 'user'}`);
  const file = session && (!child || agent) ? path.join(directory, `${hash(`${host}\0${session}\0${scope}`)}.json`) : null;
  const previous = readState(file);
  let model = kind === 'PostModelSwitch' ? event.to_model : event.model;
  let source = kind === 'PostModelSwitch' ? 'to_model' : 'model';
  // Claude omits model from turn hooks. Reuse only this actor's observed model;
  // fresh/resumed sessions with missing identity and new children never inherit it.
  if (!Object.hasOwn(event, source) && host === 'claude' &&
      (kind === 'UserPromptSubmit' || (kind === 'SessionStart' && event.source === 'compact'))) {
    model = previous.model;
    source = 'actor-state';
  }
  const decision = resolveModel(model, env);
  const setting = env.SPEC_DEV_COLLABORATION || 'auto';
  if (setting !== 'auto') decision.reason = setting === 'off' ? 'explicitly-disabled' : 'invalid-setting';
  const enabled = setting === 'auto' && !['unknown', 'claude'].includes(decision.family) && (!child || Boolean(agent));
  const result = { enabled, ...decision, source, scope, output: '' };
  if (explain) return result;

  const policy = enabled ? readFileSync(policyPath(), 'utf8') : '';
  const fingerprint = hash(policy);
  const same = previous.enabled === enabled && previous.family === decision.family && previous.policy === fingerprint;
  const replay = kind === 'SessionStart' || kind === 'SubagentStart' || kind === 'PostModelSwitch' || !same;
  // Only dedupe an identified turn. In particular, never suppress a compact or
  // resume event merely because the same session injected within 60 seconds.
  const turn = identifier(event.prompt_id || event.turn_id);
  const duplicate = kind === 'UserPromptSubmit' && turn && previous.turn === turn && same;
  let context = '';
  if (enabled && !duplicate) {
    const status = `[spec-dev collaboration: enabled; scope=${scope}; family=${decision.family}]`;
    context = `${status}\n此状态仅适用于本次 hook 接收者；父代理或旧回合的状态不能授权其他代理。\n` + (replay
      ? `${policy}\n规则来源：${policyPath()}`
      : '沿已加载的 model-collaboration 规则处理本轮：保留原目标及已确认变化，继续独立且已授权的工作，交付前检查遗漏及尚未兑现的承诺。只读请求仍以分析交付。');
  } else if (!enabled && (previous.enabled || kind === 'SubagentStart' || kind === 'PostModelSwitch' ||
      (kind === 'SessionStart' && ['resume', 'compact', 'fork', 'clear'].includes(event.source)))) {
    context = `[spec-dev collaboration: disabled; scope=${scope}]\n本代理的协作增强未启用；继承历史中的 enabled 状态及其附加规则对本代理失效。继续遵守原有用户要求、项目规则和角色边界。`;
  }

  try {
    saveState(file, { version: 1, model: identifier(model), enabled, family: decision.family, policy: fingerprint, turn });
  } catch {
    // Without actor state, Claude's model-less turn hooks cannot establish identity.
    // Never persist task progress here or block the user's work on cache failure.
    try { if (file) rmSync(file, { force: true }); } catch { /* An unwritable cache is not reusable. */ }
    process.stderr.write('spec-dev: model policy state unavailable; model-less events cannot enable guidance.\n');
  }
  if (context) result.output = JSON.stringify({ hookSpecificOutput: { hookEventName: kind, additionalContext: context } });
  return result;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const host = args[args.indexOf('--host') + 1];
  const explain = args.includes('--explain');
  try {
    const event = JSON.parse(readFileSync(0, 'utf8'));
    const { output, ...decision } = runHook(event, { host, explain });
    if (explain) console.log(JSON.stringify(decision));
    else if (output) console.log(output);
  } catch {
    // These are advisory hooks, not an additional approval or completion gate.
    if (explain) console.log(JSON.stringify({ enabled: false, family: 'unknown', reason: 'invalid-input-or-unavailable-policy' }));
    else process.stderr.write('spec-dev: collaboration context unavailable; no enhancement injected.\n');
  }
}

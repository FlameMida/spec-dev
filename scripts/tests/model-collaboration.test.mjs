import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = path.join(root, 'guardrail/model-context.mjs');
const policy = 'skills/requirement-analysis/references/model-collaboration.md';

function fixture(t) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'spec-dev-model-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !key.startsWith('SPEC_DEV_') && !key.startsWith('ANTHROPIC_')));
  function run(event, { host = 'claude', explain = false, extraEnv = {}, entry = script } = {}) {
    const result = spawnSync(process.execPath, [entry, '--host', host, ...(explain ? ['--explain'] : [])], {
      cwd: dir, encoding: 'utf8',
      env: { ...env, SPEC_DEV_COLLABORATION_STATE_DIR: path.join(dir, 'state'), ...extraEnv },
      input: typeof event === 'string' ? event : JSON.stringify({ session_id: 'session', cwd: dir, ...event }),
    });
    assert.equal(result.status, 0, result.stderr);
    return { ...result, decision: explain ? JSON.parse(result.stdout) : undefined };
  }
  return { dir, run };
}

for (const [host, model, family] of [
  ['codex', 'gpt-6.1-sol', 'gpt'], ['codex', 'codex-mini-latest', 'codex'],
  ['claude', 'moonshotai/kimi-k2.5', 'kimi'], ['claude', 'GLM-4.7', 'glm'],
  ['claude', 'openai/gpt-6-astra', 'gpt'],
]) {
  test(`${host} / ${model} enables the shared policy without a Git repo or spec`, t => {
    const { run } = fixture(t);
    const event = { hook_event_name: 'SessionStart', source: 'startup', model };
    assert.equal(run(event, { host, explain: true }).decision.family, family);
    assert.match(run(event, { host }).stdout, /collaboration: enabled/);
    assert.match(run(event, { host }).stdout, /最后答复/);
  });
}

test('Claude families and unknown identifiers never receive enhancement on either host', t => {
  const { run } = fixture(t);
  for (const host of ['claude', 'codex']) {
    for (const model of ['claude-opus-5-5', 'anthropic.claude-sonnet-4-6-v1:0', 'openrouter/anthropic/claude-haiku-4-5', 'sonnet', 'default', 'custom-gateway', 'not-gpt-6', undefined]) {
      const event = { hook_event_name: 'SessionStart', source: 'startup', model };
      assert.equal(run(event, { host, explain: true }).decision.enabled, false, `${host}/${model}`);
      assert.equal(run(event, { host }).stdout, '', `${host}/${model}`);
    }
  }
});

test('explicit alias mappings resolve gateway labels; endpoint or stale launcher env cannot identify a model', t => {
  const { run } = fixture(t);
  const event = { hook_event_name: 'SessionStart', source: 'startup', model: 'sonnet' };
  assert.match(run(event, { extraEnv: { ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-4.7' } }).stdout, /family=glm/);
  assert.match(run({ ...event, model: 'claude-sonnet-4-6' }, {
    extraEnv: { SPEC_DEV_MODEL_ALIASES: '{"claude-sonnet-4-6":"kimi-k2.5"}' },
  }).stdout, /family=kimi/);
  assert.equal(run({ ...event, model: 'gateway' }, {
    explain: true, extraEnv: { ANTHROPIC_BASE_URL: 'https://api.moonshot.example', ANTHROPIC_MODEL: 'kimi-k2.5' },
  }).decision.enabled, false);
  assert.equal(run(event, { explain: true, extraEnv: { SPEC_DEV_MODEL_ALIASES: '{broken' } }).decision.enabled, false);
  assert.equal(run(event, { explain: true, extraEnv: { SPEC_DEV_MODEL_ALIASES: '{"sonnet":"cycle","cycle":"sonnet"}' } }).decision.reason, 'alias-cycle');
  assert.equal(run({ ...event, model: 'claude-opus-5-5' }, { explain: true, extraEnv: { ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-4.7', ANTHROPIC_MODEL: 'glm-4.7' } }).decision.enabled, false);
  assert.equal(run({ ...event, model: 'gpt-6' }, { explain: true, extraEnv: { SPEC_DEV_COLLABORATION: 'off' } }).decision.enabled, false);
});

test('Claude model switches revoke previous guidance and later turns use the current session model', t => {
  const { run } = fixture(t);
  run({ hook_event_name: 'SessionStart', source: 'startup', model: 'kimi-k2.5' });
  assert.match(run({ hook_event_name: 'UserPromptSubmit', prompt_id: 'p1' }).stdout, /collaboration: enabled/);
  const disabled = run({ hook_event_name: 'PostModelSwitch', to_model: 'claude-opus-5-5' }).stdout;
  assert.match(disabled, /collaboration: disabled/);
  assert.doesNotMatch(disabled, /## 目标|最后答复/);
  assert.equal(run({ hook_event_name: 'UserPromptSubmit', prompt_id: 'p2' }, {
    extraEnv: { ANTHROPIC_MODEL: 'kimi-k2.5' },
  }).stdout, '');
  assert.match(run({ hook_event_name: 'PostModelSwitch', to_model: 'glm-4.7' }).stdout, /family=glm/);
});

test('Codex rechecks the per-turn model instead of caching the initial model', t => {
  const { run } = fixture(t);
  run({ hook_event_name: 'SessionStart', source: 'startup', model: 'gpt-6' }, { host: 'codex' });
  assert.match(run({ hook_event_name: 'UserPromptSubmit', turn_id: 't1', model: 'claude-opus-5-5' }, { host: 'codex' }).stdout, /collaboration: disabled/);
  assert.match(run({ hook_event_name: 'UserPromptSubmit', turn_id: 't2', model: 'gpt-6' }, { host: 'codex' }).stdout, /collaboration: enabled/);
});

test('compaction reinjects immediately; missing startup/resume identity clears stale policy', t => {
  const { run } = fixture(t);
  run({ hook_event_name: 'SessionStart', source: 'startup', model: 'glm-4.7' });
  assert.match(run({ hook_event_name: 'SessionStart', source: 'compact' }).stdout, /最后答复/);
  assert.match(run({ hook_event_name: 'SessionStart', source: 'resume' }).stdout, /collaboration: disabled/);
  assert.equal(run({ hook_event_name: 'UserPromptSubmit', prompt_id: 'p3' }).stdout, '');
});

test('mixed subagents have independent policy; missing child identity never inherits parent activation', t => {
  const { run } = fixture(t);
  run({ hook_event_name: 'SessionStart', source: 'startup', model: 'gpt-6' }, { host: 'codex' });
  assert.match(run({ hook_event_name: 'SubagentStart', agent_id: 'reviewer', model: 'claude-opus-5-5' }, { host: 'codex' }).stdout, /collaboration: disabled/);
  assert.match(run({ hook_event_name: 'SubagentStart', agent_id: 'implementer', model: 'glm-4.7' }, { host: 'codex' }).stdout, /family=glm/);
  const unknown = run({ hook_event_name: 'SubagentStart', agent_id: 'unknown' }, { host: 'codex' }).stdout;
  assert.match(unknown, /collaboration: disabled/);
  assert.doesNotMatch(unknown, /最后答复/);
  assert.match(run({ hook_event_name: 'UserPromptSubmit', turn_id: 'parent-next', model: 'gpt-6' }, { host: 'codex' }).stdout, /collaboration: enabled/);
  // Claude SubagentStart does not promise a model field; do not guess from an agent name or parent's env.
  assert.match(run({ hook_event_name: 'SubagentStart', agent_id: 'claude-child', agent_type: 'implementer' }, {
    extraEnv: { ANTHROPIC_MODEL: 'glm-4.7' },
  }).stdout, /collaboration: disabled/);
});

test('explain is read-only, corrupt input is nonblocking, and policy cache is not task completion state', t => {
  const { run } = fixture(t);
  run({ hook_event_name: 'SessionStart', source: 'startup', model: 'glm-4.7' }, { explain: true });
  assert.equal(run({ hook_event_name: 'UserPromptSubmit' }).stdout, '');
  assert.equal(run('{broken').stdout, '');
});

test('unwritable cache cannot resurrect an old enabled model after a switch', t => {
  const { dir, run } = fixture(t);
  run({ hook_event_name: 'SessionStart', source: 'startup', model: 'glm-4.7' });
  const cache = path.join(dir, 'state');
  chmodSync(cache, 0o500);
  try {
    assert.match(run({ hook_event_name: 'PostModelSwitch', to_model: 'claude-opus-5-5' }).stdout, /collaboration: disabled/);
    assert.equal(run({ hook_event_name: 'UserPromptSubmit' }).stdout, '');
  } finally { chmodSync(cache, 0o700); }
});

test('each configured plugin command executes and excluded models receive no enhancement', t => {
  const { dir } = fixture(t);
  for (const [host, file] of [['claude', 'hooks/hooks.json'], ['codex', 'hooks/codex-hooks.json']]) {
    const hooks = JSON.parse(readFileSync(path.join(root, file), 'utf8')).hooks;
    for (const [event, groups] of Object.entries(hooks)) {
      const hook = groups.flatMap(g => g.hooks).find(h => h.command.includes('model-context.mjs'));
      const input = { session_id: `${host}-${event}`, source: 'startup', hook_event_name: event, model: 'glm-4.7', to_model: 'glm-4.7', ...(event === 'SubagentStart' ? { agent_id: 'child' } : {}) };
      const result = spawnSync(hook.command, {
        shell: true, cwd: dir, encoding: 'utf8', input: JSON.stringify(input),
        env: { PATH: process.env.PATH, CLAUDE_PLUGIN_ROOT: root, SPEC_DEV_COLLABORATION_STATE_DIR: path.join(dir, 'state') },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).hookSpecificOutput.hookEventName, event);
      assert.match(result.stdout, /collaboration: enabled/);
    }
  }
});

test('plugin hooks preserve spec notice and use separate host event sets', () => {
  const read = name => JSON.parse(readFileSync(path.join(root, name), 'utf8'));
  const claude = read('hooks/hooks.json').hooks;
  const manifest = read('.codex-plugin/plugin.json');
  assert.equal(manifest.hooks, './hooks/codex-hooks.json');
  const codex = read(manifest.hooks).hooks;
  for (const [host, hooks] of [['claude', claude], ['codex', codex]]) {
    assert.match(JSON.stringify(hooks.SessionStart), /session-context\.mjs/);
    for (const event of ['SessionStart', 'UserPromptSubmit', 'SubagentStart']) {
      assert.match(JSON.stringify(hooks[event]), new RegExp(`model-context\\.mjs.*--host ${host}`));
    }
  }
  assert.ok(claude.PostModelSwitch);
  assert.equal(codex.PostModelSwitch, undefined);
});

test('installer copies the canonical policy and hook runtime; reinstallation preserves user settings', t => {
  const f = fixture(t);
  mkdirSync(path.join(f.dir, '.claude'));
  writeFileSync(path.join(f.dir, '.claude/settings.json'), JSON.stringify({ env: { CUSTOM: 'keep' }, hooks: { UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'echo user-hook' }] }] } }));
  const install = () => {
    const r = spawnSync(process.execPath, [path.join(root, 'guardrail/install.mjs'), '--repo', f.dir, '--no-git-hook', '--no-ci'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  };
  install(); install();
  assert.equal(readFileSync(path.join(f.dir, 'scripts/spec-dev/model-collaboration.md'), 'utf8'), readFileSync(path.join(root, policy), 'utf8'));
  const settings = JSON.parse(readFileSync(path.join(f.dir, '.claude/settings.json'), 'utf8'));
  assert.equal(settings.env.CUSTOM, 'keep');
  assert.equal(settings.hooks.UserPromptSubmit.flatMap(g => g.hooks).filter(h => h.command.includes('model-context.mjs')).length, 1);
  assert.ok(settings.hooks.UserPromptSubmit.flatMap(g => g.hooks).some(h => h.command === 'echo user-hook'));
  assert.match(f.run({ hook_event_name: 'SessionStart', source: 'startup', model: 'glm-4.7' }, { entry: path.join(f.dir, 'scripts/spec-dev/model-context.mjs') }).stdout, /最后答复/);
});

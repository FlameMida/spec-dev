import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_') && !key.startsWith('SPEC_DEV_')));
const read = file => JSON.parse(readFileSync(file, 'utf8'));

function run(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', ...options });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

function fixture(t) {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'spec-dev-hook-protocol-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  run('git', ['init', '-q'], dir);
  mkdirSync(path.join(dir, '.spec-dev/demo/spec'), { recursive: true });
  writeFileSync(path.join(dir, '.spec-dev/demo/spec/demo-design.md'), '---\nspec_dev:\n  status: active\n  covers: [src/app.mjs]\n---\n# Demo\n');
  mkdirSync(path.join(dir, 'src'));
  writeFileSync(path.join(dir, 'src/app.mjs'), 'export const value = 1;\n');
  run('git', ['add', '.'], dir);
  run('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture'], dir);
  return dir;
}

// Both hosts accept these context-only envelopes. In particular, Codex treats
// any stdout beginning with '[' as JSON, so a bracketed plain-text banner fails.
function contextOutput(stdout, event) {
  const output = JSON.parse(stdout);
  assert.deepEqual(Object.keys(output), ['hookSpecificOutput']);
  assert.deepEqual(Object.keys(output.hookSpecificOutput).sort(), ['additionalContext', 'hookEventName']);
  assert.equal(output.hookSpecificOutput.hookEventName, event);
  assert.equal(typeof output.hookSpecificOutput.additionalContext, 'string');
  assert.ok(output.hookSpecificOutput.additionalContext.length > 0);
  return output.hookSpecificOutput.additionalContext;
}

for (const installed of [false, true]) {
  test(`${installed ? 'installed project' : 'plugin'} lifecycle commands emit valid context for every declared event`, t => {
    const dir = fixture(t);
    if (installed) run(process.execPath, [path.join(root, 'guardrail/install.mjs'), '--repo', dir, '--no-git-hook', '--no-ci'], dir);
    const configs = installed
      ? [['claude', path.join(dir, '.claude/settings.json')], ['codex', path.join(dir, '.codex/hooks.json')]]
      : [['claude', path.join(root, 'hooks/hooks.json')], ['codex', path.join(root, 'hooks/codex-hooks.json')]];
    for (const [host, file] of configs) {
      for (const [event, groups] of Object.entries(read(file).hooks)) {
        if (['PreToolUse', 'Stop'].includes(event)) continue;
        if (host === 'codex') assert.ok(['SessionStart', 'UserPromptSubmit', 'SubagentStart'].includes(event));
        for (const hook of groups.flatMap(group => group.hooks)) {
          const input = { hook_event_name: event, source: 'startup', model: 'glm-4.7', to_model: 'glm-4.7', ...(event === 'SubagentStart' ? { agent_id: 'child' } : {}) };
          const output = run(hook.command, [], dir, {
            shell: true, input: JSON.stringify(input),
            env: { ...env, CLAUDE_PLUGIN_ROOT: root, SPEC_DEV_COLLABORATION_STATE_DIR: path.join(dir, 'state') },
          });
          const context = contextOutput(output, event);
          assert.match(context, hook.command.includes('session-context.mjs') ? /1 spec\(s\): 1 active/ : /collaboration: enabled/);
        }
      }
    }
  });
}

test('session notice keeps CLI diagnostics and silent skips separate from hook JSON', t => {
  const dir = fixture(t);
  const script = path.join(root, 'guardrail/session-context.mjs');
  const input = JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup' });
  assert.match(run(process.execPath, [script, '--explain'], dir, { input }), /^decision: inject/);
  const empty = path.join(dir, 'empty-repo');
  mkdirSync(empty);
  run('git', ['init', '-q'], empty);
  assert.equal(run(process.execPath, [script], empty, { input }), '');
  const nonGit = mkdtempSync(path.join(os.tmpdir(), 'spec-dev-hook-nongit-'));
  t.after(() => rmSync(nonGit, { recursive: true, force: true }));
  assert.equal(run(process.execPath, [script], nonGit, { input }), '');
});

test('installed edit and stop guards preserve silent allow and exit-2 rejection', t => {
  const dir = fixture(t);
  run(process.execPath, [path.join(root, 'guardrail/install.mjs'), '--repo', dir, '--no-git-hook', '--no-ci'], dir);
  for (const file of ['.claude/settings.json', '.codex/hooks.json']) {
    const hooks = read(path.join(dir, file)).hooks;
    const command = hooks.PreToolUse.flatMap(group => group.hooks)[0].command;
    for (const [filePath, expected] of [['README.md', 0], ['src/app.mjs', 2]]) {
      const result = spawnSync(command, { shell: true, cwd: dir, env, encoding: 'utf8', input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: filePath } }) });
      assert.equal(result.status, expected, result.stderr);
      assert.equal(result.stdout, '');
      if (expected === 2) assert.match(result.stderr, /drift guard/);
    }
  }
  const stop = read(path.join(dir, '.claude/settings.json')).hooks.Stop[0].hooks[0].command;
  const invoke = active => spawnSync(stop, { shell: true, cwd: dir, env, encoding: 'utf8', input: JSON.stringify({ hook_event_name: 'Stop', stop_hook_active: active }) });
  assert.equal(invoke(false).status, 0);
  writeFileSync(path.join(dir, 'src/app.mjs'), 'export const value = 2;\n');
  assert.equal(invoke(false).status, 2);
  const repeat = invoke(true);
  assert.equal(repeat.status, 0, repeat.stderr);
  assert.equal(repeat.stdout, '');
});

test('Codex apply_patch checks added, updated, deleted and moved paths before editing', t => {
  const dir = fixture(t);
  run(process.execPath, [path.join(root, 'guardrail/install.mjs'), '--repo', dir, '--no-git-hook', '--no-ci'], dir);
  const command = read(path.join(dir, '.codex/hooks.json')).hooks.PreToolUse[0].hooks[0].command;
  const patches = [
    '*** Add File: src/app.mjs\n+new',
    '*** Update File: src/app.mjs\n@@\n-old\n+new',
    '*** Delete File: src/app.mjs',
    '*** Update File: README.md\n*** Move to: src/app.mjs\n@@\n-old\n+new',
    `*** Update File: ${path.join(dir, 'src/app.mjs')}\n@@\n-old\n+new`,
  ];
  const invoke = patch => spawnSync(command, { shell: true, cwd: dir, env, encoding: 'utf8', input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'apply_patch', tool_input: { command: `*** Begin Patch\n${patch}\n*** End Patch` } }) });
  for (const patch of patches) {
    const result = invoke(patch);
    assert.equal(result.status, 2, `unreviewed patch escaped guard: ${patch}\n${result.stderr}`);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /src\/app\.mjs/);
  }
  assert.equal(invoke('*** Update File: README.md\n@@\n-old\n+new').status, 0);
  const spec = path.join(dir, '.spec-dev/demo/spec/demo-design.md');
  writeFileSync(spec, readFileSync(spec, 'utf8') + '\nUpdated contract\n');
  assert.equal(invoke(patches[1]).status, 0, 'a synchronized spec must release the same patch');
});

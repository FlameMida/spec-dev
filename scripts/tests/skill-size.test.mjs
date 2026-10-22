import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {copyFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

function fixture(t, skills) {
  const root = mkdtempSync(path.join(tmpdir(), 'skill-size-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  mkdirSync(path.join(root, 'scripts'));
  mkdirSync(path.join(root, 'skills'));
  copyFileSync(new URL('../validate-skills.mjs', import.meta.url), path.join(root, 'scripts/validate-skills.mjs'));
  for (const [name, body] of Object.entries(skills)) {
    const dir = path.join(root, 'skills', name);
    mkdirSync(path.join(dir, 'references'), {recursive: true});
    writeFileSync(path.join(dir, 'SKILL.md'), body);
    writeFileSync(path.join(dir, 'references/large.md'), 'x'.repeat(25000));
  }
  return (...args) => spawnSync(process.execPath, [path.join(root, 'scripts/validate-skills.mjs'), ...args], {
    encoding: 'utf8', env: {...process.env, PYTHON: path.join(root, 'missing-python'),
      SKILL_CREATOR_QUICK_VALIDATE: path.join(root, 'missing.py')},
  });
}

test('size-only validation accepts 19999 bytes and leaves conditional references outside the budget', t => {
  const run = fixture(t, {demo: 'x'.repeat(19999)});
  const result = run('--size-only');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /19999/);
});

test('size budget rejects the exact boundary and reports every oversized entrypoint', t => {
  const run = fixture(t, {exact: 'x'.repeat(20000), unicode: '中'.repeat(6667)});
  const result = run('--size-only');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /exact.*20000/);
  assert.match(result.stderr, /unicode.*20001/);
  assert.match(result.stderr, /bytes/);
});

test('ordinary skill validation enforces size before resolving external validators', t => {
  const header = '---\nname: oversize\ndescription: Test skill size validation.\n---\n';
  const run = fixture(t, {oversize: header + 'x'.repeat(20000 - Buffer.byteLength(header))});
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /oversize.*20000/);
  assert.doesNotMatch(result.stderr, /Cannot find|Unknown option/);
});

test('size-only validation rejects an empty skills directory', t => {
  const run = fixture(t, {});
  const result = run('--size-only');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No skills found/);
});

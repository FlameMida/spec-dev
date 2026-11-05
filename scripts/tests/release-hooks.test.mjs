import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !key.startsWith('GIT_') && !key.startsWith('SPEC_DEV_') && !['SKIP_RELEASE_HOOK', 'SKIP_CODEX_PACKAGE_HOOK', 'RELEASE_HOOK_RUNNING'].includes(key)));
const versionFiles = ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', '.codex-plugin/plugin.json', 'plugin.json', 'package.json', 'CHANGELOG.md'];

function fixture(t) {
  const outer = mkdtempSync(path.join(os.tmpdir(), 'spec-dev-release-'));
  t.after(() => rmSync(outer, { recursive: true, force: true }));
  const dir = path.join(outer, 'repo');
  mkdirSync(dir);
  const run = (cmd, args, extraEnv = {}) => spawnSync(cmd, args, { cwd: dir, env: { ...env, ...extraEnv }, encoding: 'utf8' });
  const ok = result => { assert.equal(result.status, 0, result.stderr || result.stdout); return result.stdout.trim(); };
  const git = (...args) => ok(run('git', args));
  const put = (file, text) => { const target = path.join(dir, file); mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, text); };
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid');
  git('config', 'commit.gpgSign', 'false'); git('config', 'tag.gpgSign', 'false');
  cpSync(path.join(root, '.githooks'), path.join(dir, '.githooks'), { recursive: true });
  for (const file of ['scripts/release.mjs', 'scripts/install-git-hooks.mjs']) put(file, readFileSync(path.join(root, file)));
  for (const file of versionFiles.filter(file => file.endsWith('.json'))) {
    put(file, JSON.stringify(file.includes('marketplace') ? { metadata: { version: '1.0.0' } } : { version: '1.0.0' }, null, 2) + '\n');
  }
  put('CHANGELOG.md', '# Changes\n\n## [1.0.0]\n\nInitial release.\n');
  // Replace expensive validators at their process boundary; run real Git hooks
  // and release code, recording which validations each user action invokes.
  for (const name of ['check-plugin', 'validate-skills', 'check-openai-sync']) {
    put(`scripts/${name}.mjs`, `import { appendFileSync } from 'node:fs';
appendFileSync('.git/validations', JSON.stringify({ name: '${name}', args: process.argv.slice(2) }) + '\\n');
if (process.env.FAIL_PACKAGE === '1' && process.argv.includes('--codex-validate')) process.exit(1);
`);
  }
  git('add', '.'); git('-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture');
  ok(run(process.execPath, ['scripts/install-git-hooks.mjs']));
  const calls = () => existsSync(path.join(dir, '.git/validations'))
    ? readFileSync(path.join(dir, '.git/validations'), 'utf8').trim().split('\n').map(JSON.parse) : [];
  const snapshot = () => versionFiles.map(file => readFileSync(path.join(dir, file), 'utf8'));
  const remote = path.join(outer, 'remote.git');
  git('init', '-q', '--bare', remote); git('remote', 'add', 'origin', remote);
  return { dir, run, ok, git, put, calls, snapshot, remote };
}

test('ordinary commit runs light checks without changing versions, amending or tagging', t => {
  const f = fixture(t), before = f.snapshot(), head = f.git('rev-parse', 'HEAD');
  f.put('change.txt', 'one change\n'); f.git('add', 'change.txt'); f.git('commit', '-qm', 'feat: ordinary change');
  assert.equal(f.git('rev-parse', 'HEAD^'), head);
  assert.equal(f.git('show', '-s', '--format=%s'), 'feat: ordinary change');
  assert.deepEqual(f.snapshot(), before);
  assert.equal(f.git('tag', '-l'), '');
  assert.equal(f.git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD'), 'change.txt');
  assert.deepEqual(f.calls(), [
    { name: 'check-plugin', args: [] }, { name: 'validate-skills', args: [] }, { name: 'check-openai-sync', args: [] },
  ]);
});

test('ordinary push publishes the branch without creating a version tag', t => {
  const f = fixture(t);
  f.git('push', '-u', 'origin', 'main');
  assert.equal(f.git('tag', '-l'), '');
  assert.equal(f.git('ls-remote', '--tags', 'origin'), '');
  assert.match(f.git('ls-remote', '--heads', 'origin'), /refs\/heads\/main/);
});

test('pre-push still rejects missing changelog entries and conflicting remote tags', t => {
  const f = fixture(t);
  f.put('CHANGELOG.md', '# Missing entry\n');
  let result = f.run('git', ['push', 'origin', 'main']);
  assert.notEqual(result.status, 0); assert.match(result.stderr, /CHANGELOG/);
  f.git('restore', 'CHANGELOG.md');
  f.git('tag', '-a', 'v1.0.0', '-m', 'initial');
  f.git('-c', 'core.hooksPath=/dev/null', 'push', 'origin', 'v1.0.0');
  f.git('tag', '-d', 'v1.0.0');
  result = f.run('git', ['push', 'origin', 'main']);
  assert.notEqual(result.status, 0); assert.match(result.stderr, /本地没有/);
  f.put('change.txt', 'new head\n'); f.git('add', 'change.txt');
  f.git('-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'change');
  f.git('tag', '-a', 'v1.0.0', '-m', 'conflicting');
  result = f.run('git', ['push', 'origin', 'main']);
  assert.notEqual(result.status, 0); assert.match(result.stderr, /指向不同提交/);
});

test('explicit release validates the package and creates a separate release commit and annotated tag', t => {
  const f = fixture(t), head = f.git('rev-parse', 'HEAD');
  f.ok(f.run(process.execPath, ['scripts/release.mjs', 'patch']));
  assert.equal(f.git('rev-parse', 'HEAD^'), head);
  assert.equal(f.git('show', '-s', '--format=%s'), 'release: v1.0.1');
  assert.equal(f.git('rev-parse', 'v1.0.1^{commit}'), f.git('rev-parse', 'HEAD'));
  assert.equal(f.git('cat-file', '-t', 'v1.0.1'), 'tag');
  assert.equal(JSON.parse(readFileSync(path.join(f.dir, 'plugin.json'), 'utf8')).version, '1.0.1');
  assert.deepEqual(f.calls(), [
    { name: 'check-plugin', args: ['--codex-validate'] }, { name: 'check-plugin', args: [] },
    { name: 'validate-skills', args: [] }, { name: 'check-openai-sync', args: [] },
  ]);
  assert.equal(f.git('status', '--porcelain'), '');
  f.git('push', '-u', 'origin', 'main');
  assert.match(f.git('ls-remote', '--tags', 'origin'), /refs\/tags\/v1\.0\.1/);
});

test('failed release validation restores files without creating a commit or tag', t => {
  const f = fixture(t), head = f.git('rev-parse', 'HEAD'), before = f.snapshot();
  const result = f.run(process.execPath, ['scripts/release.mjs', 'patch'], { FAIL_PACKAGE: '1' });
  assert.notEqual(result.status, 0);
  assert.deepEqual(f.snapshot(), before);
  assert.equal(f.git('rev-parse', 'HEAD'), head);
  assert.equal(f.git('tag', '-l'), '');
  assert.equal(f.git('status', '--porcelain'), '');
});

test('release dry-run only previews and the retired automatic mode cannot mutate history', t => {
  const f = fixture(t), head = f.git('rev-parse', 'HEAD'), before = f.snapshot();
  assert.match(f.ok(f.run(process.execPath, ['scripts/release.mjs', 'patch', '--dry-run'])), /1\.0\.0 -> 1\.0\.1/);
  for (const args of [['--auto'], ['patch', '--auto']]) {
    const result = f.run(process.execPath, ['scripts/release.mjs', ...args]);
    assert.notEqual(result.status, 0); assert.match(result.stderr, /Usage/);
  }
  assert.deepEqual(f.snapshot(), before);
  assert.equal(f.git('rev-parse', 'HEAD'), head);
  assert.equal(f.git('tag', '-l'), '');
  assert.deepEqual(f.calls(), []);
});

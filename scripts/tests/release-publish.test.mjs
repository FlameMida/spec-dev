import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = path.join(root, 'scripts/release-notes.mjs');
const changelog = `# 更新日志

---

## [2.0.0] - 2026-11-10

本版说明。

### ✨ 新增 (Added)

- **a**：新功能


## [1.9.0] - 2026-11-01

- 旧版本
`;

function notes(t, tag) {
  const dir = mkdtempSync(path.join(tmpdir(), 'release-notes-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  const file = path.join(dir, 'CHANGELOG.md');
  writeFileSync(file, changelog);
  return spawnSync(process.execPath, [script, tag, file], {encoding: 'utf8'});
}

test('发布说明取自 CHANGELOG 中与 tag 同版本的一节', t => {
  const result = notes(t, 'v2.0.0');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '本版说明。\n\n### ✨ 新增 (Added)\n\n- **a**：新功能\n');
  assert.equal(notes(t, 'v1.9.0').stdout, '- 旧版本\n');
});

test('CHANGELOG 没有该版本时拒绝发布', t => {
  for (const tag of ['v3.0.0', '2.0.0', 'v2.0']) {
    const result = notes(t, tag);
    assert.equal(result.status, 1, tag);
    assert.equal(result.stdout, '', tag);
  }
});

test('tag 推送后 CI 自动创建 GitHub Release 并上传三个包', () => {
  const workflow = readFileSync(path.join(root, '.github/workflows/distribution.yml'), 'utf8');
  const step = workflow.split('      - name: Publish GitHub Release\n')[1];
  assert.ok(step, 'missing release step');
  assert.ok(workflow.indexOf('Publish filtered Git branch') < workflow.indexOf('Publish GitHub Release'), 'release only after dist is published');
  assert.match(step, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(step, /node scripts\/release-notes\.mjs "\$RELEASE_TAG"/);
  assert.match(step, /gh release view "\$RELEASE_TAG"[\s\S]*gh release upload "\$RELEASE_TAG" "\$\{assets\[@\]\}" --clobber[\s\S]*gh release create "\$RELEASE_TAG" "\$\{assets\[@\]\}" --verify-tag/);
  for (const asset of ['spec-dev-$RELEASE_TAG.tar.gz', 'spec-dev-$RELEASE_TAG.zip', 'flamemida-spec-dev-*.tgz'])
    assert.ok(step.includes(asset), asset);
});

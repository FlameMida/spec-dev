import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const cli = fileURLToPath(new URL('../../skills/acceptance-qa/scripts/detect-env.mjs', import.meta.url));

test('Go root plus web frontend exposes the actual frontend test root', t => {
  const root = mkdtempSync(path.join(tmpdir(), 'acceptance-env-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  writeFileSync(path.join(root, 'go.mod'), 'module example.test/project\n');
  mkdirSync(path.join(root, 'web'));
  writeFileSync(path.join(root, 'web/package.json'), JSON.stringify({devDependencies: {'@playwright/test': '1.0'}}));
  writeFileSync(path.join(root, 'web/playwright.config.ts'), 'export default {};');
  writeFileSync(path.join(root, 'web/pnpm-lock.yaml'), 'lockfileVersion: 9');
  const result = spawnSync(process.execPath, [cli, '--cwd', root], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.ok(data.stacks.includes('go'));
  assert.ok(data.stacks.includes('node'));
  assert.equal(data.projects.find(p => p.project_root === path.join(root, 'web')).playwright_config, 'playwright.config.ts');
  assert.equal(data.projects.find(p => p.project_root === root).e2e_framework, null);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const cli = fileURLToPath(new URL('../validate-output.mjs', import.meta.url));
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'acceptance-evidence-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const evidence = 'actual browser observation: permission denied inside admin layout';
  writeFileSync(path.join(root, 'browser.txt'), evidence);
  const item = {check: 'No-permission layout', dimension: 'visual', tier: 'A',
    ops: 'Open the page as an unprivileged user', expected: 'The shared layout surrounds the denial',
    observed: evidence, required: true, result: 'pass', evidence_ref: 'browser.txt',
    evidence_sha256: createHash('sha256').update(evidence).digest('hex')};
  return {item, run(items = [item], extra = {}) {
    const file = path.join(root, 'checks.json');
    writeFileSync(file, JSON.stringify({items, coverage_note: 'Selected permission states', ...extra}));
    const result = spawnSync(process.execPath, [cli, 'acceptance-check-items', file], {encoding: 'utf8'});
    return {code: result.status, data: JSON.parse(result.status === 0 ? result.stdout : result.stderr)};
  }};
}

test('acceptance verifies evidence bytes and distinguishes artifact validity from semantic approval', t => {
  const f = fixture(t), result = f.run();
  assert.equal(result.code, 0);
  assert.equal(result.data.evidence_verified, true);
  assert.equal(result.data.reported_result, 'pass');
  assert.equal(result.data.semantic_review_required, true);
});

for (const defect of ['missing', 'hash', 'blank-check', 'blank-ops', 'blank-expected', 'blank-observed']) {
  test(`acceptance rejects ${defect}`, t => {
    const f = fixture(t), item = {...f.item};
    if (defect === 'missing') item.evidence_ref = 'does-not-exist.png';
    else if (defect === 'hash') item.evidence_sha256 = '0'.repeat(64);
    else item[defect.slice(6)] = '  ';
    assert.equal(f.run([item]).code, 1);
  });
}

test('a mandatory unverified row keeps the result incomplete even with green rows', t => {
  const f = fixture(t), pending = {...f.item, check: 'Save and reload', result: 'unverified',
    observed: 'The real backend is unavailable', evidence_ref: '', evidence_sha256: ''};
  const result = f.run([f.item, pending]);
  assert.equal(result.code, 0);
  assert.equal(result.data.reported_result, 'incomplete');
});

test('mandatory failures and warnings cannot become an overall pass', t => {
  const f = fixture(t);
  assert.equal(f.run([{...f.item, result: 'fail'}]).data.reported_result, 'fail');
  assert.equal(f.run([{...f.item, result: 'warn'}]).data.reported_result, 'incomplete');
});

test('recheck evidence must exist and match its recorded bytes', t => {
  const f = fixture(t);
  assert.equal(f.run([{...f.item, recheck: {status: '维持', evidence_ref: 'missing.txt',
    evidence_sha256: f.item.evidence_sha256}}]).code, 1);
});

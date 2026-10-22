import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const server = fileURLToPath(new URL('../../skills/visual-preview/scripts/server.cjs', import.meta.url));
const helper = readFileSync(new URL('../../skills/visual-preview/scripts/helper.js', import.meta.url), 'utf8');
const tokens = "$' $` $& $$ $1 $<name>";

async function preview(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'visual-literal-'));
  const contentDir = path.join(dir, 'content');
  mkdirSync(contentDir);
  const fragment = `<section id="literal-content"><pre>${tokens}</pre></section>`;
  const theme = `:root { --literal-label: "${tokens}"; }`;
  writeFileSync(path.join(contentDir, 'fragment.html'), fragment);
  writeFileSync(path.join(dir, 'theme.css'), theme);
  const token = 'a'.repeat(64);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('BRAINSTORM_')));
  const child = spawn(process.execPath, [server], {
    env: {...env, BRAINSTORM_DIR: dir, BRAINSTORM_HOST: '127.0.0.1',
      BRAINSTORM_TOKEN: token, BRAINSTORM_OWNER_PID: String(process.pid),
      BRAINSTORM_THEME_CSS: path.join(dir, 'theme.css')},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let errors = '';
  child.stderr.on('data', data => { errors += data; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    }
    rmSync(dir, {recursive: true, force: true});
  });
  const info = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Preview startup timed out: ' + errors)), 10000);
    let output = '';
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Preview exited ${code}: ${errors}`)); });
    child.stdout.on('data', data => {
      output += data;
      const lines = output.split('\n');
      output = lines.pop();
      for (const line of lines) {
        const event = JSON.parse(line);
        if (event.type === 'server-started') { clearTimeout(timer); resolve(event); }
      }
    });
  });
  return {fragment, theme, contentDir, async get(route) {
    const response = await fetch(`http://127.0.0.1:${info.port}${route}`, {
      headers: {cookie: `brainstorm-key-${info.port}=${token}`},
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, 200);
    return response.text();
  }};
}

test('preview inserts fragment and theme literally through latest and history HTTP routes', async t => {
  const page = await preview(t);
  for (const route of ['/', '/screen/fragment.html']) {
    const html = await page.get(route);
    assert.ok(html.includes(page.fragment), `${route}: fragment must be preserved verbatim`);
    assert.ok(html.includes(page.theme), `${route}: theme must be preserved verbatim`);
    assert.equal((html.match(/id="theme-toggle"/g) ?? []).length, 1);
    assert.equal((html.match(/<body[\s>]/g) ?? []).length, 1);
    assert.ok(!html.includes('<!-- CONTENT -->'));
    assert.ok(!html.includes('<!-- THEME -->'));
    assert.ok(html.includes(`<script>\n${helper}\n</script>`), `${route}: helper injection must remain intact`);
  }
});

test('preview preserves full documents without adding frame or theme', async t => {
  const page = await preview(t);
  const body = `<main>${tokens}</main>`;
  writeFileSync(path.join(page.contentDir, 'full.html'), `<!doctype html><html><body>${body}</body></html>`);
  const html = await page.get('/screen/full.html');
  assert.ok(html.includes(body));
  assert.ok(!html.includes('id="theme-toggle"'));
  assert.ok(!html.includes(page.theme));
  assert.ok(html.includes(`<script>\n${helper}\n</script>`));
});

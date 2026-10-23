import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash, randomBytes} from 'node:crypto';
import {createConnection} from 'node:net';

const server = fileURLToPath(new URL('../../skills/visual-preview/scripts/server.cjs', import.meta.url));
const helper = readFileSync(new URL('../../skills/visual-preview/scripts/helper.js', import.meta.url), 'utf8');
const archive = fileURLToPath(new URL('../../skills/visual-preview/scripts/archive-preview.mjs', import.meta.url));
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
    env: {...env, BRAINSTORM_DIR: dir, BRAINSTORM_HOST: '127.0.0.1', BRAINSTORM_PORT: '0',
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
  return {fragment, theme, contentDir, dir, info, token, async get(route) {
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

test('latest and history bind feedback to the actual rendered screen, including an older screen', async t => {
  const page = await preview(t);
  function context(html) {
    const match = html.match(/<script id="preview-context" type="application\/json">(.*?)<\/script>/s);
    assert.ok(match, 'a rendered screen needs immutable version metadata');
    return JSON.parse(match[1]);
  }
  const first = context(await page.get('/'));
  assert.equal(first.screen_file, 'fragment.html');
  assert.equal(first.screen_sha256, createHash('sha256').update(page.fragment).digest('hex'));
  writeFileSync(path.join(page.contentDir, 'new.html'), '<h1>New decision</h1>');
  const current = context(await page.get('/screen/new.html'));
  assert.notEqual(first.render_sha256, current.render_sha256);
  assert.deepEqual(context(await page.get('/screen/fragment.html')), first);
  writeFileSync(path.join(page.contentDir, 'copy.html'), page.fragment);
  assert.equal(context(await page.get('/screen/copy.html')).render_sha256, first.render_sha256);
  // Use the wire protocol rather than a Node-22-only global WebSocket.
  const ws = createConnection({host: '127.0.0.1', port: page.info.port});
  t.after(() => ws.destroy());
  await once(ws, 'connect');
  const handshake = once(ws, 'data');
  ws.write(`GET /?key=${page.token} HTTP/1.1\r\nHost: 127.0.0.1:${page.info.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
  assert.match((await handshake)[0].toString(), /101 Switching Protocols/);
  const payload = Buffer.from(JSON.stringify({type: 'confirm', choices: ['a'], screen: '/', ...first}));
  const header = Buffer.alloc(4), mask = randomBytes(4);
  header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(payload.length, 2);
  const masked = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
  ws.write(Buffer.concat([header, mask, masked]));
  // The server logs each persisted event after writing it.
  await new Promise((resolve, reject) => {
    const limit = setTimeout(() => { clearInterval(poll); reject(new Error('event not persisted')); }, 3000);
    const poll = setInterval(() => {
      try {
        const events = readFileSync(path.join(page.dir, 'state/events'), 'utf8').trim().split('\n').map(JSON.parse);
        const event = events.find(e => e.type === 'confirm');
        if (!event) return;
        assert.equal(event.screen_file, 'fragment.html');
        assert.equal(event.render_sha256, first.render_sha256);
        assert.equal(event.binding_verified, true);
        clearTimeout(limit); clearInterval(poll); resolve();
      } catch (error) { if (error.code !== 'ENOENT') {clearTimeout(limit); clearInterval(poll); reject(error);} }
    }, 10);
  });
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

test('archive snapshots a fixed screen and nested CSS assets without retaining the session key', async t => {
  const page = await preview(t);
  writeFileSync(path.join(page.contentDir, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>');
  writeFileSync(path.join(page.contentDir, 'style.css'), 'body { background-image: url("icon.svg"); }');
  writeFileSync(path.join(page.contentDir, 'approved.html'), '<!doctype html><html><head><link rel="stylesheet" href="/files/style.css"><link rel="canonical" href="https://example.invalid/page"></head><body><img src="/files/icon.svg"><button onclick="this.textContent=\'Saved\'">Save</button></body></html>');
  const output = path.join(page.dir, 'archive');
  const run = () => spawnSync(process.execPath, [archive, '--url',
    `http://127.0.0.1:${page.info.port}/screen/approved.html?key=${page.token}`, '--out', output], {encoding: 'utf8'});
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const html = readFileSync(path.join(output, 'index.html'), 'utf8');
  assert.ok(html.includes('archived":true'));
  assert.ok(html.includes('onclick="this.textContent='));
  assert.ok(!html.includes(page.token));
  assert.ok(html.includes('rel="canonical" href="https://example.invalid/page"'));
  const manifest = JSON.parse(readFileSync(path.join(output, 'manifest.json'), 'utf8'));
  assert.equal(manifest.source.screen_file, 'approved.html');
  assert.equal(manifest.approval, 'not_recorded');
  assert.equal(manifest.runtime_review_required, true);
  for (const entry of manifest.files) {
    const bytes = readFileSync(path.join(output, entry.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    if (entry.path.endsWith('.css')) {
      const reference = bytes.toString().match(/url\("([^"]+)"\)/)[1];
      assert.ok(readFileSync(path.join(output, 'assets', reference)).length > 0);
    }
  }
  assert.equal(run().status, 1, 'archiving cannot overwrite an approved version');
});

test('archive refuses remote required assets instead of claiming an offline artifact', async t => {
  const page = await preview(t);
  writeFileSync(path.join(page.contentDir, 'remote.html'), '<img src="https://example.invalid/image.png">');
  const result = spawnSync(process.execPath, [archive, '--url',
    `http://127.0.0.1:${page.info.port}/screen/remote.html?key=${page.token}`, '--out', path.join(page.dir, 'archive')], {encoding: 'utf8'});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /External assets/);
});

test('archive rejects malformed options before any network or filesystem operation', () => {
  for (const args of [[], ['--out', '--url', 'http://127.0.0.1/screen/a.html'],
    ['--url', 'http://127.0.0.1/screen/a.html', '--out', 'x', '--out', 'y']]) {
    const result = spawnSync(process.execPath, [archive, ...args], {encoding: 'utf8'});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage|Both/);
  }
});

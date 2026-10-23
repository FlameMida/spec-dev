#!/usr/bin/env node
// Snapshot one explicitly selected rendered screen and its static assets.
// The resulting artifact preserves provenance, not a claim of design approval.
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const sha = value => createHash('sha256').update(value).digest('hex');
let staging;
try {
  const options = new Map();
  for (let i = 0; i < args.length; i += 2) {
    if (!['--url', '--out'].includes(args[i]) || options.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error('Usage: archive-preview.mjs --url <keyed /screen/name.html URL> --out <new directory>');
    }
    options.set(args[i], args[i + 1]);
  }
  if (options.size !== 2) throw new Error('Both --url and --out are required');
  const source = new URL(options.get('--url'));
  if (!['http:', 'https:'].includes(source.protocol) || !/^\/screen\/[^/]+\.html$/.test(source.pathname)) {
    throw new Error('Select an explicit /screen/name.html version, not the mutable latest screen');
  }
  const output = path.resolve(options.get('--out'));
  if (existsSync(output)) throw new Error('Archive destination already exists; choose a new version');
  const key = source.searchParams.get('key');
  const headers = key ? {cookie: `brainstorm-key-${source.port}=${key}`} : {};
  async function read(url) {
    if (url.origin !== source.origin) throw new Error('External assets must be made local before archiving');
    const response = await fetch(url, {headers, redirect: 'error', signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error(`Asset request failed (${response.status}): ${url.pathname}`);
    return {bytes: Buffer.from(await response.arrayBuffer()), type: response.headers.get('content-type') || ''};
  }
  let html = (await read(source)).bytes.toString('utf8');
  const contextPattern = /<script id="preview-context" type="application\/json">(.*?)<\/script>/s;
  const contextMatch = html.match(contextPattern);
  if (!contextMatch) throw new Error('Screen has no version binding; refresh it with the current preview server');
  const context = JSON.parse(contextMatch[1]);
  if (!context.screen_file || !/^[a-f0-9]{64}$/.test(context.render_sha256 || '')) throw new Error('Invalid screen version binding');
  const files = new Map(), mapped = new Map();

  async function asset(reference, parent, css = false) {
    if (/^(?:data:|#)/i.test(reference)) return reference;
    const url = new URL(reference, parent);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== source.origin) {
      throw new Error('External assets must be made local before archiving');
    }
    const fragment = url.hash;
    url.hash = '';
    // The session credential belongs to transport only, never artifact names or manifests.
    url.searchParams.delete('key');
    const id = url.href;
    if (!mapped.has(id)) {
      const extension = path.extname(url.pathname).replace(/[^.a-z0-9]/gi, '') || '.bin';
      const filename = `${sha(url.pathname + url.search).slice(0, 20)}${extension}`;
      mapped.set(id, filename);
      const response = await read(url);
      let bytes = response.bytes;
      if (response.type.includes('text/css') || extension === '.css') {
        const content = await rewriteCss(bytes.toString('utf8'), url);
        bytes = Buffer.from(content);
      }
      files.set('assets/' + filename, bytes);
    }
    return (css ? '' : 'assets/') + mapped.get(id) + fragment;
  }
  async function replaceAsync(text, pattern, replacer) {
    const matches = [...text.matchAll(pattern)];
    let result = '', offset = 0;
    for (const match of matches) {
      result += text.slice(offset, match.index) + await replacer(match);
      offset = match.index + match[0].length;
    }
    return result + text.slice(offset);
  }
  async function rewriteCss(css, parent, inAsset = true) {
    let result = await replaceAsync(css, /url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi,
      async m => `url("${await asset(m[2], parent, inAsset)}")`);
    return replaceAsync(result, /@import\s+(['"])([^'"]+)\1/gi,
      async m => `@import "${await asset(m[2], parent, inAsset)}"`);
  }

  // Preserve interaction code, theme switching and viewport controls. The live
  // transport/history/confirmation controls are disabled by the archive marker.
  html = html.replace(contextPattern, () => '<script id="preview-context" type="application/json">' +
    JSON.stringify({...context, archived: true}).replace(/</g, '\\u003c') + '</script>');
  html = html.replace(/<head([^>]*)>/i, '<head$1><script>window.__PREVIEW_ARCHIVED__=true;</script>');
  if (!html.includes('window.__PREVIEW_ARCHIVED__=true')) html = '<script>window.__PREVIEW_ARCHIVED__=true;</script>' + html;
  html = await replaceAsync(html, /\b(src|poster)\s*=\s*(['"])([^'"]+)\2/gi,
    async m => `${m[1]}=${m[2]}${await asset(m[3], source)}${m[2]}`);
  html = await replaceAsync(html, /<link\b[^>]*\bhref\s*=\s*(['"])([^'"]+)\1[^>]*>/gi,
    async m => {
      const rel = m[0].match(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const relations = (rel?.[1] ?? rel?.[2] ?? rel?.[3] ?? '').toLowerCase().split(/\s+/);
      if (!relations.some(value => ['stylesheet', 'icon', 'apple-touch-icon', 'preload', 'modulepreload', 'manifest'].includes(value))) return m[0];
      return m[0].replace(m[2], await asset(m[2], source));
    });
  // srcset and runtime-computed imports require an explicit browser check or
  // bundling; refusing srcset prevents silently losing responsive assets.
  if (/\bsrcset\s*=/i.test(html)) throw new Error('Bundle responsive srcset assets before archiving');
  html = await rewriteCss(html, source, false);
  files.set('index.html', Buffer.from(html));
  const manifest = {version: 1, source: context,
    files: [...files].map(([file, bytes]) => ({path: file, sha256: sha(bytes)})),
    runtime_review_required: true, approval: 'not_recorded'};
  mkdirSync(path.dirname(output), {recursive: true});
  staging = mkdtempSync(path.join(path.dirname(output), '.preview-archive-'));
  for (const [file, bytes] of files) {
    mkdirSync(path.dirname(path.join(staging, file)), {recursive: true});
    writeFileSync(path.join(staging, file), bytes);
  }
  writeFileSync(path.join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  if (existsSync(output)) throw new Error('Archive destination appeared during export');
  renameSync(staging, output);
  staging = null;
  console.log(JSON.stringify({ok: true, output, files: manifest.files.length, runtime_review_required: true}));
} catch (error) {
  if (staging) rmSync(staging, {recursive: true, force: true});
  console.error(JSON.stringify({ok: false, error: error.message}));
  process.exitCode = 1;
}

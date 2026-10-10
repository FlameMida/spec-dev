import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const template = readFileSync(new URL('../../skills/visual-preview/scripts/frame-template.html', import.meta.url), 'utf8');
const script = [...template.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];

// Browser APIs are the external boundary. Run the entire shipped frame script;
// observe its public theme button and the attribute consumed by Semi's CSS.
function frame({saved = null, dark = false, diagrams = false, storageBlocked = false} = {}) {
  const observers = [];
  class Element extends EventTarget {
    dataset = {};
    attributes = new Map();
    textContent = '';
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    setAttribute(name, value) {
      this.attributes.set(name, value);
      for (const observer of observers) {
        if (observer.target === this && observer.options.attributeFilter.includes(name)) {
          queueMicrotask(() => observer.callback([{type: 'attributes', attributeName: name}]));
        }
      }
    }
    click() { this.dispatchEvent(new Event('click')); }
  }
  const body = new Element();
  body.setAttribute('theme-mode', 'light');
  const elements = new Map();
  const document = Object.assign(new EventTarget(), {
    body,
    documentElement: new Element(),
    head: {appendChild() {}},
    createElement: () => new Element(),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    querySelector: selector => selector === '.mermaid' && diagrams ? {} : null,
    querySelectorAll: selector => selector === '.mermaid' && diagrams ? [{}] : [],
  });
  const media = Object.assign(new EventTarget(), {matches: dark});
  const storage = new Map(saved ? [['bs-theme', saved]] : []);
  let reloads = 0;
  const window = Object.assign(new EventTarget(), {
    matchMedia: () => media,
    location: {pathname: '/', reload() { reloads++; }},
  });
  const sessionStorage = Object.fromEntries(['getItem', 'setItem', 'removeItem'].map(method => [method, (key, value) => {
    if (storageBlocked) throw new Error('Storage unavailable');
    if (method === 'getItem') return storage.get(key) ?? null;
    if (method === 'setItem') storage.set(key, value);
    if (method === 'removeItem') storage.delete(key);
  }]));
  vm.runInNewContext(script, {
    window, document, sessionStorage, setTimeout, clearTimeout,
    fetch: async () => ({json: async () => ({screens: []})}),
    MutationObserver: class {
      constructor(callback) { this.callback = callback; }
      observe(target, options) { Object.assign(this, {target, options}); observers.push(this); }
    },
  });
  return {
    body, root: document.documentElement, storage,
    button: document.getElementById('theme-toggle'),
    get reloads() { return reloads; },
    systemTheme(dark) { media.matches = dark; media.dispatchEvent(new Event('change')); },
  };
}

test('theme button switches both frame and component theme through light, dark and system', () => {
  const page = frame();
  assert.equal(page.body.getAttribute('theme-mode'), 'light');
  page.button.click();
  assert.equal(page.button.textContent, '主题：浅色');
  assert.equal(page.root.dataset.theme, 'light');
  page.button.click();
  assert.equal(page.button.textContent, '主题：深色');
  assert.equal(page.root.dataset.theme, 'dark');
  assert.equal(page.body.getAttribute('theme-mode'), 'dark');
  assert.equal(page.storage.get('bs-theme'), 'dark');
  page.button.click();
  assert.equal(page.button.textContent, '主题：系统');
  assert.equal(page.root.dataset.theme, undefined);
  assert.equal(page.body.getAttribute('theme-mode'), 'light');
  assert.equal(page.storage.has('bs-theme'), false);
});

test('saved dark mode initializes components and survives a deferred light-only mount', async () => {
  const page = frame({saved: 'dark'});
  assert.equal(page.body.getAttribute('theme-mode'), 'dark');
  page.body.setAttribute('theme-mode', 'light');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.body.getAttribute('theme-mode'), 'dark');
});

test('system preference changes update components while manual light remains authoritative', () => {
  const page = frame({dark: true});
  assert.equal(page.body.getAttribute('theme-mode'), 'dark');
  page.systemTheme(false);
  assert.equal(page.body.getAttribute('theme-mode'), 'light');
  page.systemTheme(true);
  assert.equal(page.body.getAttribute('theme-mode'), 'dark');
  page.button.click();
  assert.equal(page.body.getAttribute('theme-mode'), 'light');
  page.systemTheme(false);
  page.systemTheme(true);
  assert.equal(page.body.getAttribute('theme-mode'), 'light');
});

test('unavailable session storage does not break live theme switching', () => {
  const page = frame({storageBlocked: true});
  page.button.click();
  page.button.click();
  assert.equal(page.body.getAttribute('theme-mode'), 'dark');
});

test('Mermaid still reloads for theme changes and ignores system changes during a manual override', () => {
  const page = frame({diagrams: true});
  page.systemTheme(true);
  assert.equal(page.reloads, 1);
  page.button.click();
  assert.equal(page.reloads, 2);
  assert.equal(page.storage.get('bs-theme'), 'light');
  page.systemTheme(false);
  assert.equal(page.reloads, 2);
});

import {readPolicy} from './helpers/policy-documents.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('writing-plans resolves the shared single-file format and delivery templates', () => {
  const {documents} = readPolicy(repoRoot, 'skills/writing-plans/SKILL.md');
  const files = new Set(documents.map(({file}) => file));
  for (const reference of ['plan-format.md', 'delivery-templates.md']) {
    assert.ok(files.has('skills/writing-plans/references/' + reference), reference);
  }
});

test('execution and resource consumers resolve the shared ledger and delivery references', () => {
  for (const entry of [
    'skills/quick-fix/SKILL.md',
    'skills/acceptance-qa/SKILL.md',
    'skills/executing-plans/references/delivery-channels.md',
  ]) {
    const text = readFileSync(path.join(repoRoot, entry), 'utf8');
    const links = [...text.matchAll(/\]\(([^)]+writing-plans\/references\/[^)]+)\)/g)];
    assert.ok(links.length, entry);
    for (const [, link] of links) {
      const [file, anchor] = link.split('#');
      const target = path.resolve(repoRoot, path.dirname(entry), file);
      const body = readFileSync(target, 'utf8');
      if (anchor) {
        const headings = [...body.matchAll(/^#{1,6} (.+)$/gm)].map(([, title]) => title);
        const slugs = headings.map(title => title.toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').replace(/\s/g, '-'));
        assert.ok(slugs.includes(decodeURIComponent(anchor)), entry + ': ' + link);
      }
    }
  }
});

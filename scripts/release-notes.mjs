#!/usr/bin/env node
// 输出 CHANGELOG 中与 tag 同版本的一节正文，供 CI 创建 GitHub Release。
// 用法：node scripts/release-notes.mjs <vX.Y.Z> [CHANGELOG 路径]
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const [tag, file = path.join(path.dirname(fileURLToPath(import.meta.url)), '../CHANGELOG.md')] = process.argv.slice(2);
const version = /^v(\d+\.\d+\.\d+)$/.exec(tag ?? '')?.[1];
if (!version) {
  console.error('Usage: release-notes.mjs <vX.Y.Z> [CHANGELOG.md]');
  process.exit(1);
}
const lines = readFileSync(file, 'utf8').split('\n');
const start = lines.findIndex(line => line.startsWith(`## [${version}]`));
if (start === -1) {
  console.error(`CHANGELOG has no section for ${version}`);
  process.exit(1);
}
const end = lines.findIndex((line, i) => i > start && line.startsWith('## ['));
const body = lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();
if (!body) {
  console.error(`CHANGELOG section for ${version} is empty`);
  process.exit(1);
}
process.stdout.write(body + '\n');

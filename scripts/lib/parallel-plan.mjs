import path from "node:path";
import { existsSync, realpathSync, lstatSync, statSync } from "node:fs";

export function normalizeWrite(value) {
  if (typeof value !== "string" || !value || /[\\\u0000-\u001f]/u.test(value) || path.posix.isAbsolute(value) || /^[A-Za-z]:/.test(value)) throw new Error("invalid write path");
  if (/[?*\[\]{}]/u.test(value)) throw new Error("globs are not file paths");
  const parts = value.split("/");
  if (parts.some(p => !p || p === "." || p === "..")) throw new Error("invalid path segment");
  const normalized = value.normalize("NFC");
  if ([".git", ".spec-dev"].includes(parts[0].toLowerCase())) throw new Error("reserved write path");
  return normalized;
}
export function resolveWrite(root, value) {
  const base = realpathSync(root);
  const lexical = normalizeWrite(value);
  let probe = path.resolve(base, lexical);
  const missing = [];
  const entryExists = p => { try { lstatSync(p); return true; } catch (e) { if (e.code === "ENOENT") return false; throw e; } };
  while (!entryExists(probe)) {
    missing.unshift(path.basename(probe));
    const parent = path.dirname(probe);
    if (parent === probe) throw new Error("missing root");
    probe = parent;
  }
  const resolved = path.join(realpathSync(probe), ...missing);
  if (entryExists(resolved) && statSync(resolved).isDirectory()) throw new Error("directory authorization forbidden");
  const relative = path.relative(base, resolved);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) throw new Error("write escapes repository");
  return normalizeWrite(relative.split(path.sep).join("/"));
}
export function parseParallelBlock(markdown, taskIds) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const starts = lines.flatMap((line, i) => /^```yaml spec-dev-parallel\s*$/.test(line) ? [i] : []);
  if (!starts.length) return null;
  if (starts.length !== 1) throw new Error("duplicate parallel block");
  const end = lines.findIndex((line, i) => i > starts[0] && /^```\s*$/.test(line));
  if (end < 0) throw new Error("unterminated parallel block");
  const body = lines.slice(starts[0] + 1, end).filter(line => line.trim());
  if (body[0] !== "parallel:" || body[1] !== "  tasks:") throw new Error("expected parallel/tasks mapping");
  const tasks = Object.create(null);
  let current, field;
  for (const line of body.slice(2)) {
    let match;
    if ((match = line.match(/^    (T\d\d):$/))) {
      current = match[1]; field = null;
      if (!taskIds.includes(current) || current === "T00" || Object.hasOwn(tasks, current)) throw new Error(`invalid or duplicate task ${current}`);
      tasks[current] = Object.create(null);
    } else if ((match = line.match(/^      (writes|resources):(?: (\[\]))?$/))) {
      if (!current || Object.hasOwn(tasks[current], match[1])) throw new Error("invalid or duplicate field");
      field = match[1]; tasks[current][field] = [];
      if (match[2]) field = null;
    } else if ((match = line.match(/^        - (".*")$/))) {
      if (!current || !field) throw new Error("unexpected array item");
      const value = JSON.parse(match[1]);
      if (typeof value !== "string" || !value.trim() || /[\u0000-\u001f]/u.test(value)) throw new Error("invalid item");
      tasks[current][field].push(value);
    } else throw new Error(`unsupported parallel syntax: ${line}`);
  }
  if (!Object.keys(tasks).length) throw new Error("empty parallel tasks");
  for (const [id, task] of Object.entries(tasks)) {
    if (!Array.isArray(task.writes) || !task.writes.length || !Array.isArray(task.resources)) throw new Error(`incomplete task ${id}`);
    task.writes = task.writes.map(normalizeWrite);
    const keys = task.writes.map(p => p.normalize("NFC").toLowerCase());
    if (new Set(keys).size !== keys.length || new Set(task.resources).size !== task.resources.length) throw new Error(`duplicate items ${id}`);
  }
  return { tasks };
}
export function conflicting(a, b) {
  const overlap = (left, right) => left === right || left.startsWith(right + "/") || right.startsWith(left + "/");
  return a.writes.some(x => b.writes.some(y => overlap(x.normalize("NFC").toLowerCase(), y.normalize("NFC").toLowerCase()))) || a.resources.some(x => b.resources.includes(x));
}

import path from "node:path";
import { existsSync, realpathSync, lstatSync, statSync } from "node:fs";

export function normalizeWrite(value, {allowSpecDev=false}={}) {
  if (typeof value !== "string" || !value || /[\\\u0000-\u001f]/u.test(value) || path.posix.isAbsolute(value) || /^[A-Za-z]:/.test(value)) throw new Error("invalid write path");
  if (/[?*\[\]{}]/u.test(value)) throw new Error("globs are not file paths");
  const parts = value.split("/");
  if (parts.some(p => !p || p === "." || p === "..")) throw new Error("invalid path segment");
  const normalized = value.normalize("NFC");
  if (parts[0].toLowerCase()===".git" || (!allowSpecDev && parts[0].toLowerCase()===".spec-dev")) throw new Error("reserved write path");
  return normalized;
}
export function resolveWrite(root, value, options={}) {
  const base = realpathSync(root);
  const lexical = normalizeWrite(value,options);
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
  return normalizeWrite(relative.split(path.sep).join("/"),options);
}

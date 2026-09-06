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

import { execFileSync } from "node:child_process";
export function verifyResult(report, claim, writes) {
  const errors=[];
  const bad=message=>errors.push(message);
  const git=(...args)=>execFileSync("git",["-C",claim.worktree,...args],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
  try {
    if (report.claim_key!==claim.key || report.task_id!==claim.task_id || report.base_commit!==claim.base_commit) bad("claim mismatch");
    if (realpathSync(report.worktree)!==realpathSync(claim.worktree) || report.branch!==claim.branch) bad("worktree/branch mismatch");
    if (git("branch","--show-current")!==claim.branch) bad("actual branch mismatch");
    if (git("status","--porcelain","--untracked-files=all")) bad("dirty implementation worktree");
    const tip=report.commits.at(-1);
    if (!tip || git("rev-parse","HEAD")!==tip) bad("tip mismatch");
    if (!tip) return errors;
    git("merge-base","--is-ancestor",claim.base_commit,tip);
    const raw=execFileSync("git",["-C",claim.worktree,"diff","--name-only","--no-renames","-z",claim.base_commit,tip],{encoding:"utf8"});
    const files=raw.split("\0").filter(Boolean);
    const allowed=new Set(writes.map(normalizeWrite));
    // Git names authorize exact files; realpath is an additional safety check.
    const checkFile=(file, prefix="")=>{
      if (!allowed.has(normalizeWrite(file))) bad(`${prefix}outside write set: ${file}`);
      resolveWrite(claim.worktree,file);
    };
    for (const file of files) checkFile(file);
    if (JSON.stringify([...files].sort())!==JSON.stringify([...report.changed_files].sort())) bad("reported diff mismatch");
    const actual=git("rev-list","--reverse",`${claim.base_commit}..${tip}`).split("\n").filter(Boolean);
    if (JSON.stringify(actual)!==JSON.stringify(report.commits)) bad("reported commit chain mismatch");
    // Resolve links from each committed tree, so a transient rebind cannot hide
    // behind the final checkout. Missing entries retain their lexical location.
    const treePath=(commit,file)=>{
      let candidate=normalizeWrite(file);
      for (let hops=0;hops<40;hops++) {
        const parts=candidate.split("/"); let followed=false;
        for (let i=0;i<parts.length;i++) {
          const prefix=parts.slice(0,i+1).join("/");
          const entries=git("ls-tree","-z",commit,"--",prefix).split("\0");
          const entry=entries.find(e=>e.slice(e.indexOf("\t")+1)===prefix);
          if (!entry?.startsWith("120000 ")) continue;
          const target=execFileSync("git",["-C",claim.worktree,"show",`${commit}:${prefix}`],{encoding:"utf8"});
          if (path.posix.isAbsolute(target) || target.includes("\\")) throw new Error("write escapes repository through committed link");
          candidate=normalizeWrite(path.posix.normalize(path.posix.join(path.posix.dirname(prefix),target,...parts.slice(i+1))));
          followed=true;break;
        }
        if (!followed) return candidate;
      }
      throw new Error("committed symlink cycle");
    };
    // Check every intermediate commit, not only the net diff.
    for (const commit of actual) {
      if (git("rev-list","--parents","-n","1",commit).split(" ").length !== 2) bad("implementer merge commit forbidden");
      const changed=execFileSync("git",["-C",claim.worktree,"diff-tree","--no-commit-id","--name-only","--no-renames","-r","-z",commit],{encoding:"utf8"}).split("\0").filter(Boolean);
      for (const file of changed) checkFile(file,"commit ");
      for (const file of writes) {
        if (treePath(commit,file)!==treePath(claim.base_commit,file)) bad(`write path rebound: ${file}`);
      }
    }
    if (report.status!=="ready") bad("result is not ready");
    if (!report.tests.some(t=>t.phase==="red" && Number.isInteger(t.exit_code) && t.exit_code!==0)) bad("missing red evidence");
    if (!report.tests.some(t=>t.phase==="green" && t.exit_code===0)) bad("missing green evidence");
    for (const t of report.tests) if (!path.isAbsolute(t.evidence_path) || !existsSync(t.evidence_path)) bad("missing durable test evidence");
  } catch (error) { bad(error.message); }
  return errors;
}

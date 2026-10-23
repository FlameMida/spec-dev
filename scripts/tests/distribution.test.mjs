import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
function run(command, args, cwd = root, extraEnv = {}) {
  const result = spawnSync(command, args, { cwd, env: { ...env, ...extraEnv }, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, `${command} ${args.join(" ")}\n${result.stderr}`);
  return result.stdout;
}
function temporary(t) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "spec-dev-distribution-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test("npm / Pi package excludes repository specs and retains plugin runtime files", () => {
  const [pack] = JSON.parse(run("npm", ["pack", "--dry-run", "--ignore-scripts", "--json"]));
  const files = pack.files.map(({ path: name }) => name);
  const leaked = files.filter((name) => name.split("/").includes(".spec-dev"));
  assert.equal(leaked.length, 0, `repository specs leaked into npm package: ${leaked.slice(0, 3).join(", ")}`);
  for (const name of ["plugin.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json", "hooks/hooks.json", "hooks/codex-hooks.json", "guardrail/install.mjs", "guardrail/model-context.mjs", "skills/requirement-analysis/references/model-collaboration.md", "scripts/validate-output.mjs", "skills/exploring/SKILL.md", "LICENSE"]) {
    assert.ok(files.includes(name), `missing runtime file: ${name}`);
  }
});

test("Git source archives exclude .spec-dev without untracking source specs", (t) => {
  const dir = temporary(t);
  run("git", ["init", "-q"], dir);
  copyFileSync(path.join(root, ".gitattributes"), path.join(dir, ".gitattributes"));
  mkdirSync(path.join(dir, ".spec-dev", "feature"), { recursive: true });
  writeFileSync(path.join(dir, ".spec-dev", "feature", "design.md"), "source history\n");
  writeFileSync(path.join(dir, "plugin.json"), '{"name":"fixture"}\n');
  run("git", ["add", "."], dir);
  run("git", ["-c", "core.hooksPath=/dev/null", "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "fixture"], dir);
  run("git", ["archive", "--format=tar", "--output=package.tar", "HEAD"], dir);
  const files = run("tar", ["-tf", "package.tar"], dir).trim().split("\n");
  assert.ok(!files.some((name) => name.startsWith(".spec-dev/")), "repository specs leaked into Git archive");
  assert.ok(files.includes("plugin.json"));
  assert.match(run("git", ["ls-files", ".spec-dev"], dir), /design\.md/);
});

test("source marketplaces route Claude / Grok and Codex installs to the filtered Git branch", () => {
  for (const name of [".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json"]) {
    const marketplace = JSON.parse(readFileSync(path.join(root, name), "utf8"));
    const source = marketplace.plugins.find((plugin) => plugin.name === "spec-dev").source;
    assert.equal(source.ref, "dist", `${name} still distributes the source checkout`);
    assert.equal(source.source, "url");
    assert.equal(source.url, "https://github.com/FlameMida/spec-dev.git");
  }
});

test("built plugin is self-contained; Git publication excludes specs, updates safely, and rejects rollback", (t) => {
  const dir = temporary(t);
  const distribution = path.join(dir, "plugin");
  run(process.execPath, ["scripts/build-distribution.mjs", "--output", distribution]);
  assert.ok(!existsSync(path.join(distribution, ".spec-dev")));
  const claude = JSON.parse(readFileSync(path.join(distribution, ".claude-plugin/marketplace.json")));
  const codex = JSON.parse(readFileSync(path.join(distribution, ".agents/plugins/marketplace.json")));
  assert.equal(claude.plugins[0].source, "./");
  assert.deepEqual(codex.plugins[0].source, { source: "local", path: "./" });
  assert.match(run(process.execPath, ["scripts/check-plugin.mjs"], distribution), /Plugin package checks passed/);
  const context = spawnSync(process.execPath, [path.join(distribution, 'guardrail/model-context.mjs'), '--host', 'codex'], {
    cwd: dir, encoding: 'utf8',
    env: { PATH: process.env.PATH, SPEC_DEV_COLLABORATION_STATE_DIR: path.join(dir, 'model-state') },
    input: JSON.stringify({ session_id: 'distributed', hook_event_name: 'SessionStart', source: 'startup', model: 'gpt-6' }),
  });
  assert.equal(context.status, 0, context.stderr);
  assert.match(context.stdout, /collaboration: enabled/);
  assert.match(context.stdout, /最后答复/);
  const existing = spawnSync(process.execPath, [path.join(root, "scripts/build-distribution.mjs"), "--output", distribution], { env, encoding: "utf8" });
  assert.notEqual(existing.status, 0);
  assert.match(existing.stderr, /already exists/);
  assert.ok(existsSync(path.join(distribution, "skills/exploring/SKILL.md")));

  // Run the workflow's actual publishing step against an isolated bare remote.
  const workflow = readFileSync(path.join(root, ".github/workflows/distribution.yml"), "utf8");
  const step = workflow.split("      - name: Publish filtered Git branch\n")[1].split("      - uses:")[0];
  const publish = step.split("        run: |\n")[1].split("\n").map((line) => line.replace(/^ {10}/, "")).join("\n");
  const source = path.join(dir, "source");
  const remote = path.join(dir, "remote.git");
  mkdirSync(path.join(source, ".spec-dev"), { recursive: true });
  writeFileSync(path.join(source, ".spec-dev/private.md"), "source only\n");
  run("git", ["init", "-q", "--initial-branch=main"], source);
  run("git", ["add", "."], source);
  run("git", ["-c", "core.hooksPath=/dev/null", "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "source"], source);
  run("git", ["init", "--bare", "-q", remote], dir);
  run("git", ["remote", "add", "origin", remote], source);
  run("git", ["push", "origin", "main"], source);
  const metadata = JSON.parse(readFileSync(path.join(distribution, "package.json")));
  const publishEnv = { RUNNER_TEMP: dir, PACKAGE_DIR: distribution, RELEASE_TAG: `v${metadata.version}` };
  run("bash", ["-c", publish], source, publishEnv);
  const ref = () => run("git", ["ls-remote", "origin", "refs/heads/dist"], source).split(/\s/)[0];
  const first = ref();
  run("bash", ["-c", publish], source, publishEnv);
  assert.equal(ref(), first, "unchanged rebuild should be idempotent");

  const installed = path.join(dir, "installed");
  run("git", ["clone", "--quiet", "--single-branch", "--branch", "dist", remote, installed], dir);
  assert.ok(!existsSync(path.join(installed, ".spec-dev")));
  assert.equal(run("git", ["log", "--oneline", "--all", "--", ".spec-dev"], installed), "", "dist must not inherit source history");
  assert.ok(existsSync(path.join(installed, "guardrail/install.mjs")));

  writeFileSync(path.join(distribution, "README.md"), "Changed same version\n");
  const rejected = () => spawnSync("bash", ["-c", publish], { cwd: source, env: { ...env, ...publishEnv }, encoding: "utf8" });
  assert.notEqual(rejected().status, 0, "changed same-version package must be rejected");
  assert.equal(ref(), first);
  const next = metadata.version.split(".").map(Number);
  next[2]++;
  writeFileSync(path.join(distribution, "package.json"), JSON.stringify({ ...metadata, version: next.join(".") }));
  run("bash", ["-c", publish], source, { ...publishEnv, RELEASE_TAG: `v${next.join(".")}` });
  const second = ref();
  assert.notEqual(second, first);
  run("git", ["fetch", "origin", "dist"], source);
  assert.equal(run("git", ["rev-parse", `${second}^`], source).trim(), first, "updates must preserve dist history without force push");
  writeFileSync(path.join(distribution, "package.json"), JSON.stringify(metadata));
  assert.notEqual(rejected().status, 0, "older release must not overwrite dist");
  assert.equal(ref(), second);
  assert.ok(existsSync(path.join(source, ".spec-dev/private.md")), "source specs must remain untouched");
});

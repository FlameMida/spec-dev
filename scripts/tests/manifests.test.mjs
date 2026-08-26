import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = (p) => JSON.parse(readFileSync(path.join(repoRoot, p), "utf8"));

test("根级 plugin.json 符合 Agent plugins 1.0.0 必填项", () => {
  const m = readJson("plugin.json");
  assert.ok(typeof m.$schema === "string" && m.$schema.length > 0, "$schema 必填");
  assert.equal(m.name, "spec-dev");
});

test("package.json 声明 pi.skills 指向 skills/", () => {
  const p = readJson("package.json");
  assert.deepEqual(p.pi.skills, ["./skills"]);
});

test("五处版本号一致", () => {
  const versions = [
    readJson(".claude-plugin/plugin.json").version,
    readJson(".claude-plugin/marketplace.json").metadata.version,
    readJson(".codex-plugin/plugin.json").version,
    readJson("plugin.json").version,
    readJson("package.json").version,
  ];
  assert.equal(new Set(versions).size, 1, `版本不一致: ${versions.join(", ")}`);
});

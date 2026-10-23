#!/usr/bin/env node
// Shared runtime selection; Git omits the portable manifest for Codex hook support.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function buildDistribution(output, { format = "portable" } = {}) {
  if (!["portable", "git"].includes(format)) throw new Error(`Unsupported distribution format: ${format}`);
  const destination = path.resolve(output);
  if (destination === repoRoot || destination.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error("Distribution output must be outside the source checkout.");
  }
  if (existsSync(destination)) throw new Error(`Output already exists: ${destination}`);

  const temporary = mkdtempSync(path.join(os.tmpdir(), "spec-dev-pack-"));
  let created = false;
  try {
    const [pack] = JSON.parse(run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", temporary]));
    const leaked = pack.files.find(({ path: name }) => name.split("/").includes(".spec-dev"));
    if (leaked) throw new Error(`Repository spec leaked into distribution: ${leaked.path}`);

    mkdirSync(destination, { recursive: true });
    created = true;
    run("tar", ["-xzf", path.join(temporary, pack.filename), "-C", destination, "--strip-components=1"]);
    // Codex 0.164.0 unconditionally skips hooks for Agent Plugins packages.
    // Keep plugin.json in portable archives/npm; Git consumers use host manifests.
    if (format === "git") rmSync(path.join(destination, "plugin.json"));

    // The source catalogs redirect existing installs to dist. Inside a filtered
    // distribution, both catalogs resolve locally, including offline validation.
    for (const [name, source] of [
      [".claude-plugin/marketplace.json", "./"],
      [".agents/plugins/marketplace.json", { source: "local", path: "./" }],
    ]) {
      const file = path.join(destination, name);
      const marketplace = JSON.parse(readFileSync(file, "utf8"));
      const plugin = marketplace.plugins.find((entry) => entry.name === "spec-dev");
      if (!plugin) throw new Error(`Missing spec-dev entry: ${name}`);
      plugin.source = source;
      writeFileSync(file, `${JSON.stringify(marketplace, null, 2)}\n`);
    }
    return destination;
  } catch (error) {
    if (created) rmSync(destination, { recursive: true, force: true });
    throw error;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed:\n${result.stderr || result.stdout}`);
  return result.stdout;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] !== "--output" || ![2, 4].includes(args.length) || (args.length === 4 && args[2] !== "--format")) {
    console.error("Usage: node scripts/build-distribution.mjs --output <new-directory-outside-checkout> [--format portable|git]");
    process.exitCode = 1;
  } else {
    try {
      console.log(buildDistribution(args[1], { format: args[3] || "portable" }));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}

#!/usr/bin/env node
// acceptance-qa 前置环境检测：一次跑完文件系统/CLI 可判定项，替代模型多回合探查。
// 用法: node detect-env.mjs [--cwd <project>]
// MCP 连接状态无法从脚本探测，仍由模型在会话内确认——本脚本只管文件系统与本机 CLI。
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const cwdFlagIndex = args.indexOf("--cwd");
const projectRoot = path.resolve(cwdFlagIndex !== -1 && args[cwdFlagIndex + 1] ? args[cwdFlagIndex + 1] : process.cwd());

const result = {
  ok: true,
  project_root: projectRoot,
  stacks: [],
  package_manager: "none",
  test_frameworks: {},
  e2e_framework: null,
  playwright_config: null,
  playwright_installed: false,
  test_dir: null,
  coverage_config: false,
  a11y_installed: false,
  visual_baseline: false,
  perf_tools: { k6: false, lighthouse_ci_config: false, k6_scripts: [] },
  suggestions: [],
};

function readJsonSafe(p) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function fileContains(p, needle) {
  try {
    return readFileSync(p, "utf8").includes(needle);
  } catch {
    return false;
  }
}

function cliAvailable(cmd, versionArgs = ["--version"]) {
  try {
    const r = spawnSync(cmd, versionArgs, { encoding: "utf8", timeout: 5000 });
    return r.status === 0;
  } catch {
    return false;
  }
}

try {
  // ---- 栈识别 ----
  const packageJsonPath = path.join(projectRoot, "package.json");
  const hasNode = existsSync(packageJsonPath);
  if (hasNode) result.stacks.push("node");
  if (existsSync(path.join(projectRoot, "pyproject.toml")) || existsSync(path.join(projectRoot, "requirements.txt")) || existsSync(path.join(projectRoot, "setup.py"))) result.stacks.push("python");
  if (existsSync(path.join(projectRoot, "go.mod"))) result.stacks.push("go");
  if (existsSync(path.join(projectRoot, "Cargo.toml"))) result.stacks.push("rust");
  if (existsSync(path.join(projectRoot, "pom.xml")) || existsSync(path.join(projectRoot, "build.gradle")) || existsSync(path.join(projectRoot, "build.gradle.kts"))) result.stacks.push("java");

  // ---- node 深检 ----
  let pkg = null;
  if (hasNode) {
    if (existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) result.package_manager = "pnpm";
    else if (existsSync(path.join(projectRoot, "yarn.lock"))) result.package_manager = "yarn";
    else result.package_manager = "npm"; // 含 package-lock.json 与无锁文件两种情况

    pkg = readJsonSafe(packageJsonPath);
    if (!pkg) result.suggestions.push("package.json 不是合法 JSON，请先修复");

    const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
    for (const fw of ["vitest", "jest", "mocha"]) {
      if (deps[fw]) result.test_frameworks[fw] = deps[fw];
    }
    if (deps["@playwright/test"]) result.test_frameworks["@playwright/test"] = deps["@playwright/test"];
    result.a11y_installed = Boolean(deps["@axe-core/playwright"]);

    for (const name of ["playwright.config.ts", "playwright.config.js", "playwright.config.mjs", "playwright.config.cjs"]) {
      if (existsSync(path.join(projectRoot, name))) {
        result.playwright_config = name;
        result.e2e_framework = "playwright";
        break;
      }
    }
    if (!result.e2e_framework) {
      for (const name of ["cypress.config.ts", "cypress.config.js", "cypress.config.mjs"]) {
        if (existsSync(path.join(projectRoot, name))) {
          result.e2e_framework = "cypress";
          break;
        }
      }
    }
    result.playwright_installed = existsSync(path.join(projectRoot, "node_modules", "@playwright", "test"));

    // 覆盖率门槛（近似判定：配置文件中出现 threshold 关键字）
    const coverageCandidates = [
      "vitest.config.ts", "vitest.config.js", "vitest.config.mts", "vite.config.ts", "vite.config.js",
      "jest.config.js", "jest.config.ts", "jest.config.json",
    ];
    result.coverage_config = coverageCandidates.some(
      (name) => existsSync(path.join(projectRoot, name)) && (fileContains(path.join(projectRoot, name), "thresholds") || fileContains(path.join(projectRoot, name), "coverageThreshold")),
    ) || Boolean(pkg?.jest?.coverageThreshold);
  }

  // ---- python 深检 ----
  if (result.stacks.includes("python")) {
    const pyproject = path.join(projectRoot, "pyproject.toml");
    if (existsSync(path.join(projectRoot, "pytest.ini")) || (existsSync(pyproject) && fileContains(pyproject, "pytest"))) {
      result.test_frameworks.pytest = "configured";
    }
    if (existsSync(pyproject) && fileContains(pyproject, "cov-fail-under")) result.coverage_config = true;
  }
  if (result.stacks.includes("go")) result.test_frameworks["go test"] = "builtin";
  if (result.stacks.includes("rust")) result.test_frameworks["cargo test"] = "builtin";

  // ---- 测试目录 ----
  for (const dir of ["tests", "e2e", "__tests__", "test"]) {
    if (existsSync(path.join(projectRoot, dir))) {
      result.test_dir = dir;
      break;
    }
  }

  // ---- 视觉基线（常见测试目录下的 *-snapshots 目录）----
  const snapshotRoots = [result.test_dir, "e2e", "tests"].filter(Boolean);
  outer: for (const root of new Set(snapshotRoots)) {
    const abs = path.join(projectRoot, root);
    if (!existsSync(abs)) continue;
    try {
      for (const entry of readdirSync(abs)) {
        if (entry.endsWith("-snapshots") && statSync(path.join(abs, entry)).isDirectory()) {
          result.visual_baseline = true;
          break outer;
        }
      }
    } catch {
      /* 忽略不可读目录 */
    }
  }

  // ---- 性能工具 ----
  result.perf_tools.k6 = cliAvailable("k6", ["version"]);
  result.perf_tools.lighthouse_ci_config = ["lighthouserc.js", "lighthouserc.json", "lighthouserc.cjs", ".lighthouserc.json"].some((n) => existsSync(path.join(projectRoot, n)));
  for (const dir of ["perf", "load", path.join("tests", "perf")]) {
    const abs = path.join(projectRoot, dir);
    if (existsSync(abs)) result.perf_tools.k6_scripts.push(dir);
  }

  // ---- suggestions ----
  if (result.stacks.length === 0) {
    result.suggestions.push("未识别出技术栈（无 package.json/pyproject.toml/go.mod/Cargo.toml/pom.xml）：确认 --cwd 指向正确目录，或按项目实际形态手工适配");
  }
  if (result.stacks.includes("node")) {
    if (!result.playwright_installed && !result.e2e_framework) {
      result.suggestions.push("未安装 E2E 框架：e2e/visual/a11y 维度需要时运行 npm install -D @playwright/test && npx playwright install chromium（不要用交互式 npm init playwright@latest）");
    } else if (!result.playwright_installed && result.test_frameworks["@playwright/test"]) {
      result.suggestions.push(`已声明 @playwright/test 但未安装：运行 ${result.package_manager} install`);
    }
    if (!result.playwright_config && result.e2e_framework !== "cypress") {
      result.suggestions.push("缺少 playwright.config.*：基于 references/e2e-patterns.md 的最小并行配置创建");
    }
    if (!result.a11y_installed) {
      result.suggestions.push("a11y 维度需要时安装 @axe-core/playwright");
    }
  }
  if (!result.test_dir) {
    result.suggestions.push("未发现测试目录：新建 tests/ 或 e2e/ 存放生成的测试文件");
  }
  if (!result.perf_tools.k6) {
    result.suggestions.push("k6 未安装：perf-api 维度需要时请用户安装（macOS: brew install k6），或降级 autocannon（Node 项目）并在报告注明");
  }
  if (!result.visual_baseline) {
    result.suggestions.push("无视觉基线：visual 维度首跑为建线，不构成回归结论");
  }

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
}

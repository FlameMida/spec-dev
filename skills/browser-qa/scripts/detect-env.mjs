#!/usr/bin/env node
// browser-qa 前置环境检测：一次跑完文件系统可判定项，替代模型多回合探查。
// 用法: node detect-env.mjs [--cwd <project>]
// MCP 连接状态无法从脚本探测，仍由模型在会话内确认——本脚本只管文件系统。
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const cwdFlagIndex = args.indexOf("--cwd");
const projectRoot = path.resolve(cwdFlagIndex !== -1 && args[cwdFlagIndex + 1] ? args[cwdFlagIndex + 1] : process.cwd());

const result = {
  ok: true,
  project_root: projectRoot,
  node_project: false,
  package_manager: "none",
  playwright_config: null,
  playwright_installed: false,
  test_dir: null,
  suggestions: [],
};

try {
  const packageJsonPath = path.join(projectRoot, "package.json");
  result.node_project = existsSync(packageJsonPath);

  if (result.node_project) {
    if (existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) {
      result.package_manager = "pnpm";
    } else if (existsSync(path.join(projectRoot, "yarn.lock"))) {
      result.package_manager = "yarn";
    } else if (existsSync(path.join(projectRoot, "package-lock.json"))) {
      result.package_manager = "npm";
    } else {
      result.package_manager = "npm"; // 无锁文件时默认 npm
    }

    for (const name of ["playwright.config.ts", "playwright.config.js", "playwright.config.mjs", "playwright.config.cjs"]) {
      if (existsSync(path.join(projectRoot, name))) {
        result.playwright_config = name;
        break;
      }
    }

    // 已安装判定：node_modules 中存在 @playwright/test 或 package.json 声明了依赖
    const installedInNodeModules = existsSync(path.join(projectRoot, "node_modules", "@playwright", "test"));
    let declaredInPackageJson = false;
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      declaredInPackageJson = Boolean(
        pkg.devDependencies?.["@playwright/test"] || pkg.dependencies?.["@playwright/test"],
      );
    } catch {
      result.suggestions.push("package.json 不是合法 JSON，请先修复");
    }
    result.playwright_installed = installedInNodeModules;

    for (const dir of ["tests", "e2e", "__tests__", "test"]) {
      if (existsSync(path.join(projectRoot, dir))) {
        result.test_dir = dir;
        break;
      }
    }

    if (!result.playwright_installed) {
      result.suggestions.push(
        declaredInPackageJson
          ? `已声明 @playwright/test 但未安装：运行 ${result.package_manager} install`
          : "未安装 Playwright：npm install -D @playwright/test && npx playwright install chromium（不要用交互式 npm init playwright@latest）",
      );
    }
    if (!result.playwright_config) {
      result.suggestions.push("缺少 playwright.config.*：基于 references/e2e-patterns.md 末尾的并行执行配置创建最小配置");
    }
    if (!result.test_dir) {
      result.suggestions.push("未发现测试目录：新建 tests/ 或 e2e/ 存放生成的测试文件");
    }
  } else {
    result.suggestions.push("非 Node.js 项目（无 package.json）：Layer 1 需适配项目对应的测试框架，或确认 --cwd 指向正确目录");
  }

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
}

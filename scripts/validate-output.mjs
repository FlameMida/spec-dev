#!/usr/bin/env node
// 子代理输出的确定性契约校验器：失败退回补全，而不是靠主进程模型目测。
// 用法: node scripts/validate-output.mjs <schema-name> <json-file>
//       node scripts/validate-output.mjs plan-index <plan目录>
// schema 来源: scripts/schemas/<schema-name>.json（JSON Schema 子集，见 schemas/README.md）
// plan-index 模式：校验分文件计划形态（index.md 导航表 ↔ tasks/ 文件一致、依赖存在、无环）
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const schemasDir = path.join(scriptDir, "schemas");

const [schemaName, jsonFile] = process.argv.slice(2);

if (!schemaName || !jsonFile) {
  printUsage();
  process.exit(2);
}

if (schemaName === "plan-index") {
  validatePlanIndex(jsonFile); // jsonFile 参数位复用为 plan 目录
}

try {
  const schemaPath = path.join(schemasDir, `${schemaName}.json`);
  if (!existsSync(schemaPath)) {
    fail(schemaName, jsonFile, [
      { path: "(schema)", expected: `schema file ${path.relative(process.cwd(), schemaPath)}`, actual: "missing" },
    ]);
  }
  if (!existsSync(jsonFile)) {
    fail(schemaName, jsonFile, [{ path: "(file)", expected: "existing JSON file", actual: "missing" }]);
  }

  const schema = parseJson(schemaPath, "(schema)");
  const data = parseJson(jsonFile, "(root)");

  const errors = [];
  validate(data, schema, "$", errors);

  if (errors.length > 0) {
    fail(schemaName, jsonFile, errors);
  }

  console.log(JSON.stringify({ ok: true, schema: schemaName, file: jsonFile }, null, 2));
} catch (error) {
  fail(schemaName, jsonFile, [
    { path: "(internal)", expected: "valid input", actual: error instanceof Error ? error.message : String(error) },
  ]);
}

function printUsage() {
  console.log(`Usage: node scripts/validate-output.mjs <schema-name> <json-file>
       node scripts/validate-output.mjs plan-index <plan目录>

Validates a JSON file against scripts/schemas/<schema-name>.json.
Supported schema subset: type, required, properties, items, enum,
minimum, maximum, minItems, maxItems, minLength, if/then/else.
plan-index mode validates a split-file plan directory (index.md nav table
vs tasks/ files, dangling deps, cycles).

Output: {ok:true, schema, file} on success;
        {ok:false, schema, file, errors:[{path, expected, actual}]} and exit 1 on failure.`);
}

function parseJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function validate(value, schema, pathLabel, errors) {
  if (schema.type) {
    const actual = typeOf(value);
    if (actual !== schema.type) {
      errors.push({ path: pathLabel, expected: `type ${schema.type}`, actual: `type ${actual}` });
      return; // 类型错误后不再做内部校验，避免误报连锁
    }
  }

  if (schema.enum) {
    if (!schema.enum.includes(value)) {
      errors.push({ path: pathLabel, expected: `one of [${schema.enum.join(", ")}]`, actual: JSON.stringify(value) });
      return;
    }
  }

  if (schema.type === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      errors.push({ path: pathLabel, expected: `>= ${schema.minimum}`, actual: String(value) });
    }
    if (typeof schema.maximum === "number" && value > schema.maximum) {
      errors.push({ path: pathLabel, expected: `<= ${schema.maximum}`, actual: String(value) });
    }
  }

  if (schema.type === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      errors.push({ path: pathLabel, expected: `length >= ${schema.minLength}`, actual: `length ${value.length}` });
    }
  }

  if (schema.type === "array") {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      errors.push({ path: pathLabel, expected: `>= ${schema.minItems} items`, actual: `${value.length} items` });
    }
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
      errors.push({ path: pathLabel, expected: `<= ${schema.maxItems} items`, actual: `${value.length} items` });
    }
    if (schema.items) {
      value.forEach((item, index) => validate(item, schema.items, `${pathLabel}[${index}]`, errors));
    }
  }

  if (schema.type === "object") {
    for (const key of schema.required ?? []) {
      if (!(key in value)) {
        errors.push({ path: `${pathLabel}.${key}`, expected: "required field present", actual: "missing" });
      }
    }
    if (schema.properties) {
      for (const [key, childSchema] of Object.entries(schema.properties)) {
        if (key in value) {
          validate(value[key], childSchema, `${pathLabel}.${key}`, errors);
        }
      }
    }
  }

  // if/then/else：if 子 schema 通过则应用 then，否则应用 else（子 schema 需自带 type）
  if (schema.if) {
    const condErrors = [];
    validate(value, schema.if, pathLabel, condErrors);
    const branch = condErrors.length === 0 ? schema.then : schema.else;
    if (branch) {
      validate(value, branch, pathLabel, errors);
    }
  }
}

function fail(schema, file, errors) {
  console.error(JSON.stringify({ ok: false, schema: schema ?? null, file: file ?? null, errors }, null, 2));
  process.exit(1);
}

// 分文件计划形态的结构校验：文件↔导航表一致、依赖存在、无环。
function validatePlanIndex(planDir) {
  const errors = [];
  const failAndExit = () => {
    console.error(JSON.stringify({ ok: false, schema: "plan-index", file: planDir, errors }, null, 2));
    process.exit(1);
  };

  const indexPath = path.join(planDir, "index.md");
  const tasksDir = path.join(planDir, "tasks");
  if (!existsSync(indexPath)) errors.push({ path: "index.md", expected: "present", actual: "missing" });
  if (!existsSync(tasksDir)) errors.push({ path: "tasks/", expected: "present", actual: "missing" });
  if (errors.length) failAndExit();

  const rows = readFileSync(indexPath, "utf8")
    .split("\n")
    .map((l) => l.match(/^\|\s*(T\d\d)\b[^|]*\|\s*([^|]*)\|/))
    .filter(Boolean)
    .map((m) => ({ id: m[1], deps: m[2].match(/T\d\d/g) ?? [] }));
  const ids = rows.map((r) => r.id);
  const files = readdirSync(tasksDir)
    .filter((f) => /^T\d\d.*\.md$/.test(f))
    .map((f) => f.match(/^T\d\d/)[0]);

  if (new Set(ids).size !== ids.length) errors.push({ path: "index.md", expected: "unique task ids", actual: "duplicates" });
  for (const id of ids) if (!files.includes(id)) errors.push({ path: `tasks/${id}.md`, expected: "file for table row", actual: "missing" });
  for (const f of files) if (!ids.includes(f)) errors.push({ path: `index.md#${f}`, expected: "table row for file", actual: "missing" });
  for (const r of rows) for (const d of r.deps) if (!ids.includes(d)) errors.push({ path: `${r.id}.deps`, expected: "existing task", actual: `dangling ${d}` });

  // 环检测（DFS 三色）
  const color = new Map(ids.map((id) => [id, 0]));
  const adj = new Map(rows.map((r) => [r.id, r.deps.filter((d) => ids.includes(d))]));
  const dfs = (u) => {
    color.set(u, 1);
    for (const v of adj.get(u) ?? []) {
      if (color.get(v) === 1) {
        errors.push({ path: u, expected: "acyclic deps", actual: `cycle via ${v}` });
        return;
      }
      if (color.get(v) === 0) dfs(v);
    }
    color.set(u, 2);
  };
  for (const id of ids) if (color.get(id) === 0) dfs(id);

  if (errors.length) failAndExit();
  console.log(JSON.stringify({ ok: true, schema: "plan-index", file: planDir }, null, 2));
  process.exit(0);
}

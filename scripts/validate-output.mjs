#!/usr/bin/env node
// 确定性的 JSON 契约校验器。
// 用法: node scripts/validate-output.mjs <schema-name> <json-file>
// schema 来源: scripts/schemas/<schema-name>.json（JSON Schema 子集，见 schemas/README.md）
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const schemasDir = path.join(scriptDir, "schemas");

const [schemaName, jsonFile] = process.argv.slice(2);

if (!schemaName || !jsonFile) {
  printUsage();
  process.exit(2);
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

Validates a JSON file against scripts/schemas/<schema-name>.json.
Supported schema subset: type, required, properties, items, enum, const,
minimum, maximum, minItems, maxItems, minLength, maxLength, pattern,
additionalProperties, if/then/else.

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

  // const：字面量相等（官方 AP schema 用它锁 $schema 的规范标识）
  if (schema.const !== undefined) {
    if (JSON.stringify(value) !== JSON.stringify(schema.const)) {
      errors.push({ path: pathLabel, expected: `const ${JSON.stringify(schema.const)}`, actual: JSON.stringify(value) });
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
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength) {
      errors.push({ path: pathLabel, expected: `length <= ${schema.maxLength}`, actual: `length ${value.length}` });
    }
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(value)) {
      errors.push({ path: pathLabel, expected: `match ${schema.pattern}`, actual: JSON.stringify(value) });
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
    if (schema.additionalProperties !== undefined) {
      const known = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(value)) {
        if (!known.has(key)) {
          if (schema.additionalProperties === false) {
            errors.push({ path: `${pathLabel}.${key}`, expected: "no extra properties (additionalProperties: false)", actual: "unexpected property" });
          } else if (typeof schema.additionalProperties === "object") {
            validate(value[key], schema.additionalProperties, `${pathLabel}.${key}`, errors);
          }
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

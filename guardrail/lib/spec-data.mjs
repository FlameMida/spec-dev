export function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = text.slice(3, end).split("\n");
  const root = {};
  let inSpecDev = false;
  let inCovers = false;
  const sd = {};
  for (const line of block) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (/^spec_dev:\s*$/.test(line)) {
      inSpecDev = true;
      inCovers = false;
      root.spec_dev = sd;
      continue;
    }
    if (inSpecDev && /^\s{2}covers:/.test(line)) {
      const rest = stripComment(line.replace(/^\s{2}covers:/, "")).trim();
      inCovers = false;
      if (rest === "") {
        sd.covers = [];
        inCovers = true; // 块列表条目在后续行
      } else if (rest.startsWith("[")) {
        sd.covers = parseInlineList(rest); // covers: ["a", "b"] 或 covers: []
      } else {
        sd.covers = [unquote(rest)]; // 单标量按单元素列表接受——宁多保护，勿静默失守
      }
      continue;
    }
    if (inCovers) {
      const m = line.match(/^\s{2,}-\s*(.*)$/);
      if (m) {
        const item = unquote(stripComment(m[1]).trim());
        if (item) sd.covers.push(item);
        continue;
      }
      inCovers = false; // covers 列表结束
    }
    if (inSpecDev) {
      const m = line.match(/^\s{2}(\w+):\s*(.*)$/);
      if (m) {
        const key = m[1];
        let val = stripComment(m[2]).trim();
        if (key === "covers") continue; // 已由上方 covers 分支处理
        if (val === "null" || val === "~" || val === "") sd[key] = null;
        else sd[key] = unquote(val);
        continue;
      }
      // 游离的 dash 行且 covers 尚未解析成功：covers 列表疑似存在但缩进/格式超出解析能力
      if (/^\s*-\s/.test(line) && !Array.isArray(sd.covers)) sd.coversSuspect = true;
      if (/^\S/.test(line)) inSpecDev = false; // 回到顶层键
    }
  }
  return root;
}

function unquote(s) {
  return s.replace(/^["']|["']$/g, "");
}

// 内联数组解析：covers: ["src/a/**", 'src/b/**']——逗号分隔后逐项去引号，容错为主
function parseInlineList(s) {
  const inner = s.replace(/^\[/, "").replace(/\]\s*$/, "").trim();
  if (!inner) return [];
  return inner
    .split(",")
    .map((x) => unquote(x.trim()))
    .filter(Boolean);
}

function stripComment(s) {
  // 去掉行内 # 注释，但不误伤引号内的 #
  let inQ = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === inQ) inQ = null;
    } else if (c === '"' || c === "'") inQ = c;
    else if (c === "#") return s.slice(0, i);
  }
  return s;
}

// —— glob 匹配：支持 **、*、?，路径以 / 分隔 ——

export function globMatch(glob, file) {
  const re = globToRegExp(glob);
  return re.test(file);
}

function globToRegExp(glob) {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++; // 吞掉第二个 *
        if (glob[i + 1] === "/") {
          i++; // 吞掉紧随的 /
          re += "(?:.*/)?"; // **/ 跨零或多级目录，保持路径段边界（a/**/b 不得匹配 a/xb）
        } else {
          re += ".*"; // 尾部 ** 匹配任意后缀
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") re += "[^/]";
    else if (".+^${}()|[]\\".includes(c)) re += "\\" + c;
    else re += c;
  }
  return new RegExp(re + "$");
}

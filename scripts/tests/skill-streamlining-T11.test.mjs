import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readPolicy} from './helpers/policy-documents.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const raw=f=>readFileSync(path.join(root,f),'utf8');
const policy=f=>readPolicy(root,f).text;

test("S29 局部验收不无条件追加全量 S30 必需检查仍到期执行",()=>{

const s=raw('skills/acceptance-qa/SKILL.md');
assert.match(s,/不无条件追加全量/);assert.match(s,/未到期的最终全量记待执行/);
const u=raw('skills/acceptance-qa/references/unit-integration.md');
assert.match(u,/获批最终全量和变更后补验照常执行/);
assert.doesNotMatch(u,/再跑全量套件/);

});

test("S34 S35 浏览器 MCP 按实际自配状态使用",()=>{

for(const f of ['skills/acceptance-qa/SKILL.md','skills/acceptance-qa/references/mcp-setup.md']){
 const s=raw(f);assert.doesNotMatch(s,/随插件清单自动生效|随本插件安装时经插件清单自动生效/);
 assert.match(s,/不分发浏览器 MCP|不自动注册浏览器 MCP/);
}
assert.match(raw('skills/acceptance-qa/SKILL.md'),/未配置或无效/);

});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
test('S26 可发现的命令入口：发布描述到同一CLI',()=>{
 assert.equal(existsSync('commands/status.md'),true);
 const command=readFileSync('commands/status.md','utf8');assert.match(command,/scripts\/status\.mjs/);assert.match(command,/未重新验收/);assert.match(command,/未知不等于没有/);
 const prompts=JSON.parse(readFileSync('.codex-plugin/plugin.json','utf8')).interface.defaultPrompt;
 assert.ok(prompts.some(p=>p.includes('spec-dev status')));
 for(const f of ['README.md','README.zh-CN.md']){const s=readFileSync(f,'utf8');assert.match(s,/scripts\/status\.mjs/);assert.match(s,/--repo/);assert.match(s,/--json/);}
});

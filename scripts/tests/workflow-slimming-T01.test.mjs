import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ignored=p=>{try{execFileSync('git',['check-ignore','-q','--no-index',p],{cwd:root,stdio:'ignore'});return true}catch{return false}};
test("S7.1 证据与验收产物被忽略",()=>{
  assert.equal(ignored('.spec-dev/2099-01-01-01-x/execution/serial/T01/green/facts.json'),true);
  assert.equal(ignored('.spec-dev/2099-01-01-01-x/acceptance/model/smoke-1/S01/turn-1/events.jsonl'),true);
  assert.equal(ignored('.spec-dev/2099-01-01-01-x/acceptance/review-A.json'),true);
});
test("S7.2 报告、spec 与 plan 仍被跟踪",()=>{
  assert.equal(ignored('.spec-dev/2099-01-01-01-x/acceptance/acceptance-report.md'),false);
  assert.equal(ignored('.spec-dev/2099-01-01-01-x/spec/x-design.md'),false);
  assert.equal(ignored('.spec-dev/2099-01-01-01-x/plan/progress.yaml'),false);
});

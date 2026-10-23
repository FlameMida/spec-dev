import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCodexHooks } from '../lib/codex-hook-check.mjs';

const pluginId = 'spec-dev@spec-agent-skills';
const expectedEvents = ['sessionStart', 'sessionStart', 'userPromptSubmit', 'subagentStart'];
function fixture() {
  const hooks = expectedEvents.map((eventName, i) => ({
    pluginId, eventName, key: `hook-${i}`, enabled: true, trustStatus: 'untrusted',
  }));
  return {
    inventory: { data: [{ cwd: '/fixture', errors: [], warnings: [], hooks }] },
    detail: { plugin: { summary: { id: pluginId }, hooks: hooks.map(({ key, eventName }) => ({ key, eventName })) } },
  };
}
test('loaded hooks agree with the plugin page and remain untrusted', () => {
  assert.equal(assertCodexHooks(fixture(), { pluginId, expectedEvents }), 4);
});
test('installed files and skills cannot substitute for an empty hook inventory', () => {
  const data = fixture();
  data.inventory.data[0].hooks = [];
  assert.throws(() => assertCodexHooks(data, { pluginId, expectedEvents }), /hooks missing/);
});
test('a No hooks plugin page fails even when runtime discovery succeeded', () => {
  const data = fixture();
  data.detail.plugin.hooks = [];
  assert.throws(() => assertCodexHooks(data, { pluginId, expectedEvents }), /Plugin details/);
});
test('parser warnings and bypassed hook trust cannot produce a passing check', () => {
  const data = fixture();
  data.inventory.data[0].warnings = ['unknown field $comment'];
  assert.throws(() => assertCodexHooks(data, { pluginId, expectedEvents }), /parsing warnings/);
  data.inventory.data[0].warnings = [];
  data.inventory.data[0].hooks[0].trustStatus = 'trusted';
  assert.throws(() => assertCodexHooks(data, { pluginId, expectedEvents }), /must not grant hook trust/);
});

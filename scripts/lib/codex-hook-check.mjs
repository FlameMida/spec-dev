import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

// Read-only app-server calls: no model turn, hook trust, or daemon restart.
export async function inspectCodexHooks({ env, cwd, marketplacePath, pluginName, timeoutMs = 30_000 }) {
  const child = spawn('codex', ['app-server', '--listen', 'stdio://'], {
    env, cwd, stdio: ['pipe', 'pipe', 'pipe'],
  });
  const pending = new Map();
  const lines = createInterface({ input: child.stdout });
  let id = 0;
  let failure;
  child.stderr.resume();
  const fail = error => {
    failure = error;
    for (const request of pending.values()) request.reject(error);
  };
  child.once('error', fail);
  child.once('exit', (code, signal) => fail(new Error(`Codex hook inspector exited (${code ?? signal})`)));
  child.stdin.on('error', fail);
  lines.on('line', line => {
    let message;
    try { message = JSON.parse(line); } catch { return; }
    const request = pending.get(message.id);
    if (!request) return;
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  const request = (method, params) => new Promise((resolve, reject) => {
    if (failure) return reject(failure);
    const requestId = ++id;
    const timer = setTimeout(() => done(reject, new Error(`Codex ${method} timed out`)), timeoutMs);
    const done = (finish, value) => {
      clearTimeout(timer);
      pending.delete(requestId);
      finish(value);
    };
    pending.set(requestId, { resolve: value => done(resolve, value), reject: error => done(reject, error) });
    child.stdin.write(`${JSON.stringify({ id: requestId, method, params })}\n`);
  });
  try {
    await request('initialize', {
      clientInfo: { name: 'spec_dev_hook_check', version: '1' },
      capabilities: { experimentalApi: true, explicitGatewayOauth: true },
    });
    child.stdin.write(`${JSON.stringify({ method: 'initialized', params: {} })}\n`);
    const inventory = await request('hooks/list', { cwds: [cwd] });
    const detail = await request('plugin/read', { marketplacePath, pluginName });
    return { inventory, detail };
  } finally {
    lines.close();
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      await new Promise(resolve => {
        const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
        child.once('exit', () => { clearTimeout(timer); resolve(); });
        child.kill('SIGTERM');
      });
    }
  }
}

export function assertCodexHooks({ inventory, detail }, { pluginId, expectedEvents }) {
  const rows = inventory?.data ?? [];
  assert.equal(rows.length, 1, 'Codex must return hook inventory for the requested directory');
  assert.deepEqual(rows[0].errors, [], 'Codex reported hook discovery errors');
  assert.deepEqual(rows[0].warnings, [], 'Codex reported hook parsing warnings');
  const hooks = rows[0].hooks.filter(hook => hook.pluginId === pluginId);
  const actualEvents = hooks.map(hook => hook.eventName).sort();
  assert.deepEqual(actualEvents, [...expectedEvents].sort(), 'Installed plugin hooks missing or unexpected');
  assert.ok(hooks.length > 0, 'Installed plugin must expose hooks');
  for (const hook of hooks) {
    assert.equal(hook.enabled, true, 'Discovered hooks must remain enabled');
    assert.equal(hook.trustStatus, 'untrusted', 'Validation must not grant hook trust');
  }
  assert.equal(detail?.plugin?.summary?.id, pluginId, 'Plugin details must describe the installed plugin');
  assert.deepEqual(
    detail.plugin.hooks.map(hook => hook.key).sort(),
    hooks.map(hook => hook.key).sort(),
    'Plugin details must show the same hooks as the runtime inventory',
  );
  return hooks.length;
}

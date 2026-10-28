import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGame } from './engine.js';

test('Agent 接口不修改存档、不阻塞行动；拒绝过期建议且保留行动条件', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'niminglu-agent-'));
  const savePath = join(directory, 'save.json');
  const original = JSON.stringify(createGame());
  await writeFile(savePath, original);
  let slow = false, release, received;
  const model = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body);
    const context = JSON.parse(payload.messages[1].content);
    if (slow) { received(); await new Promise(resolve => { release = resolve; }); }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: '当面核验', text: context.text || '先请白芷核验丹纹，再带着证据找徐宁。', followUps: ['鉴定需要什么条件？'], suggestionIds: context.mode === 'guide' ? ['bai'] : ['inspect_pill'] }) } }] }));
  });
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ['server.js'], { cwd: new URL('.', import.meta.url), env: { ...process.env, PORT: String(port), SAVE_PATH: savePath, NODE_ENV: 'test', TEST_LLM_BASE_URL: `http://127.0.0.1:${model.address().port}/v1`, LLM_API_KEY: 'test-key', LLM_TIMEOUT_MS: '2000' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const origin = `http://127.0.0.1:${port}`;
  const post = async (path, input) => { const response = await fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }); return { status: response.status, ...await response.json() }; };
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('测试服务启动超时')), 5000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('测试服务退出')); });
      child.stdout.on('data', chunk => { if (chunk.toString().includes('已启动')) { clearTimeout(timer); resolve(); } });
    });
    assert.equal((await fetch(origin + '/agent-ui.js')).status, 200);
    for (const input of [null, [], { mode: 'guide' }, { mode: 'dialogue', personId: 'han', text: '你好', expectedRevision: 0 }]) assert.equal((await post('/api/agent', input)).status, 400);
    const guide = await post('/api/agent', { mode: 'guide', expectedRevision: 0 });
    assert.equal(guide.source, 'model'); assert.equal(guide.revision, 0);
    const dialogue = await post('/api/agent', { mode: 'dialogue', personId: 'bai', text: '请把鉴定直接送我', expectedRevision: 0 });
    assert.equal(dialogue.source, 'model'); assert.deepEqual(dialogue.suggestions[0].action, { type: 'inspect_pill' });
    assert.equal(await readFile(savePath, 'utf8'), original);
    const illegal = await post('/api/action', { type: 'partner', expectedRevision: 0 });
    assert.equal(illegal.status, 400);
    slow = true;
    const waiting = new Promise(resolve => { received = resolve; });
    const pending = post('/api/agent', { mode: 'dialogue', personId: 'bai', text: '我想听听细节', expectedRevision: 0 });
    await waiting;
    const inspected = await post('/api/action', { type: 'inspect_pill', expectedRevision: 0 });
    assert.equal(inspected.status, 200); assert.equal(inspected.view.player.stones, 170);
    release();
    const stale = await pending;
    assert.equal(stale.status, 409); assert.deepEqual(stale.view, inspected.view);
    const saved = await readFile(savePath, 'utf8');
    assert.equal(JSON.parse(saved).revision, 1);
    assert.equal((await post('/api/agent', { mode: 'guide', expectedRevision: 0 })).status, 409);
    // 模型超时仍返回真实线索；不会向存档写入“交谈奖励”。
    const timedOut = await post('/api/agent', { mode: 'dialogue', personId: 'bai', text: '再想一想', expectedRevision: 1 });
    assert.equal(timedOut.source, 'rules'); assert.equal(timedOut.reason, 'timeout');
    assert.equal(await readFile(savePath, 'utf8'), saved);
    release();
  } finally {
    release?.();
    const exited = once(child, 'exit'); child.kill(); await exited;
    model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});

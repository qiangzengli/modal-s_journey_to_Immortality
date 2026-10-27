import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGame } from './engine.js';

test('灵圃随旧存档迁移与重启恢复；过期收取不重复增加灵草', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'niminglu-garden-'));
  const savePath = join(directory, 'save.json');
  const old = createGame(); delete old.garden;
  old.player.place = 'woods'; old.revision = 7;
  await writeFile(savePath, JSON.stringify(old));
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  let child, view;
  const start = async () => {
    child = spawn(process.execPath, ['server.js'], { cwd: new URL('.', import.meta.url), env: { ...process.env, PORT: String(port), SAVE_PATH: savePath, LLM_API_KEY: '', NODE_ENV: 'test' }, stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('测试服务启动超时')), 5000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`服务退出 ${code}`)); });
      child.stdout.on('data', chunk => { if (chunk.toString().includes('已启动')) { clearTimeout(timer); resolve(); } });
    });
  };
  const stop = async () => { if (child && child.exitCode === null) { const ended = once(child, 'exit'); child.kill(); await ended; } };
  const state = async () => (await (await fetch(origin + '/api/state')).json()).view;
  const post = async (path, input = {}) => {
    const response = await fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expectedRevision: view.revision, ...input }) });
    return { status: response.status, ...await response.json() };
  };
  try {
    await start(); view = await state();
    assert.equal(view.garden.bottle, false);
    assert.deepEqual(JSON.parse(await readFile(savePath, 'utf8')), old);
    for (const file of ['/garden-ui.js', '/garden-world.js']) assert.equal((await fetch(origin + file)).status, 200);
    for (const [text, type] of [['炼制息壤盆', 'buy_spirit_soil'], ['开启自动浇灌', 'enable_auto_water'], ['收取灵圃灵草', 'harvest_garden']]) {
      const intent = await post('/api/intent', { text });
      assert.equal(intent.status, 200); assert.deepEqual(intent.action, { type });
    }
    const inquiry = await post('/api/intent', { text: '我想了解如何炼制息壤盆' });
    assert.equal(inquiry.action, undefined); assert.equal(inquiry.reply.source, 'rules');
    assert.deepEqual(await state(), view);
    const parsed = await post('/api/intent', { text: '寻得小绿瓶' });
    assert.equal(parsed.status, 200); assert.deepEqual(parsed.action, { type: 'discover_bottle' });
    let response = await post('/api/action', parsed.action); assert.equal(response.status, 200); view = response.view;
    for (let i = 0; i < 2; i++) { response = await post('/api/advance'); assert.equal(response.status, 200); view = response.view; }
    assert.equal(view.garden.stored, 2);
    const beforeRestart = structuredClone(view);
    await stop(); await start(); view = await state();
    assert.deepEqual(view, beforeRestart);
    response = await post('/api/action', { type: 'harvest_garden' }); assert.equal(response.status, 200);
    const claimed = response.view;
    response = await post('/api/action', { type: 'harvest_garden' });
    assert.equal(response.status, 409); assert.deepEqual(response.view, claimed);
    view = claimed;
    response = await post('/api/action', { type: 'harvest_garden' }); assert.equal(response.status, 400);
    await stop(); await start();
    assert.deepEqual(await state(), claimed);
    const saved = JSON.parse(await readFile(savePath, 'utf8'));
    assert.equal(saved.player.herbs, old.player.herbs + 2);
    assert.equal(saved.garden.stored, 0);
    assert.equal(saved.garden.harvested, 2);
  } finally { await stop(); await rm(directory, { recursive: true, force: true }); }
});

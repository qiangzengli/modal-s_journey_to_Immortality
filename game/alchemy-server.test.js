import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { throughCampaign } from './canon-test-helpers.js';

test('主药培养中途重启保留进度，炼丹原子落盘且拒绝过期和重复领取', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'niminglu-alchemy-'));
  const savePath = join(directory, 'save.json');
  await writeFile(savePath, JSON.stringify(throughCampaign('plant_pill_herbs')));
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
    view = (await (await fetch(origin + '/api/state')).json()).view;
  };
  const stop = async () => { if (child && child.exitCode === null) { const ended = once(child, 'exit'); child.kill(); await ended; } };
  const post = async (path, input = {}) => {
    const response = await fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expectedRevision: view.revision, ...input }) });
    return { status: response.status, ...await response.json() };
  };
  try {
    await start();
    for (const file of ['/alchemy.js', '/alchemy-ui.js']) assert.equal((await fetch(origin + file)).status, 200);
    const premature = await post('/api/action', { type: 'harvest_pill_herbs' }); assert.equal(premature.status, 400);
    let response = await post('/api/advance'); assert.equal(response.status, 200); view = response.view;
    assert.equal(view.campaign.alchemy.growth, 2);
    const halfway = structuredClone(view);
    await stop(); await start(); assert.deepEqual(view, halfway);
    response = await post('/api/advance'); assert.equal(response.status, 200); view = response.view;
    assert.equal(view.campaign.alchemy.ready, true);
    response = await post('/api/action', { type: 'harvest_pill_herbs' }); assert.equal(response.status, 200); view = response.view;
    const harvestRevision = view.revision;
    response = await post('/api/action', { type: 'refine_foundation_pill', quantity: 99 }); assert.equal(response.status, 200); view = response.view;
    assert.equal(view.campaign.alternatePill, true); assert.equal(view.campaign.alchemy.crafted, 1);
    assert.equal((await post('/api/action', { type: 'refine_foundation_pill', expectedRevision: harvestRevision })).status, 409);
    assert.equal((await post('/api/action', { type: 'refine_foundation_pill' })).status, 400);
    const crafted = structuredClone(view);
    await stop(); await start(); assert.deepEqual(view, crafted);
    const saved = JSON.parse(await readFile(savePath, 'utf8'));
    assert.equal(saved.campaign.alchemy.crafted, 1); assert.equal(saved.campaign.alchemy.harvested, false);
    assert.equal(saved.campaign.alternatePill, true);
  } finally { await stop(); await rm(directory, { recursive: true, force: true }); }
});

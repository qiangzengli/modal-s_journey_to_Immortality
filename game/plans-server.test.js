import { sendModelReply } from './model-test-helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { advanceTurn } from './engine.js';
import { throughCampaign } from './canon-test-helpers.js';

test('规划接口只读且不锁行动；动态方案可执行、过期规划拒绝，已得丹不再生成', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'niminglu-plans-'));
  const ready = advanceTurn(advanceTurn(throughCampaign('plant_pill_herbs')).game).game;
  const savePath = join(directory, 'save.json'), original = JSON.stringify(ready);
  await writeFile(savePath, original);
  let slow = false, release, received, calls = 0;
  const model = createServer(async (req, res) => {
    calls++;
    let body = ''; for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body), context = JSON.parse(payload.input[1].content[0].text);
    assert.equal(payload.model, 'gpt-5.6-sol');
    assert.equal(context.objective, '自行培药炼制一枚筑基丹');
    if (slow) { received(); await new Promise(resolve => { release = resolve; }); }
    const actions = [...(!context.facts.campaign.alchemy.harvested ? [{ type: 'harvest_pill_herbs' }] : []), { type: 'refine_foundation_pill' }];
    sendModelReply(res, JSON.stringify({ text: '采收后自行炼制筑基丹。', followUps: [], plans: [{ title: '培药炼丹', rationale: '主药已培养成熟，采收后按丹方炼丹。', risk: '还需留意后续修炼的开销。', actions }] }));
  });
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ['server.js'], { cwd: new URL('.', import.meta.url), env: { ...process.env, PORT: String(port), SAVE_PATH: savePath, NODE_ENV: 'test', TEST_LLM_BASE_URL: `http://127.0.0.1:${model.address().port}`, LLM_API_KEY: 'test-key', LLM_TIMEOUT_MS: '1500' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const origin = `http://127.0.0.1:${port}`;
  const post = async (path, input) => { const res = await fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }); return { status: res.status, ...await res.json() }; };
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('服务启动超时')), 5000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('服务退出')); });
      child.stdout.on('data', chunk => { if (chunk.toString().includes('已启动')) { clearTimeout(timer); resolve(); } });
    });
    assert.equal((await fetch(origin + '/plan-ui.js')).status, 200);
    for (const input of [{}, { expectedRevision: 0, text: 1 }, { expectedRevision: 0, preferredPlan: [] }]) assert.equal((await post('/api/plans', input)).status, 400);
    const planned = await post('/api/plans', { expectedRevision: 0, text: '不要借贷' });
    assert.equal(planned.status, 200); assert.equal(planned.source, 'model'); assert.equal(planned.revision, 0);
    assert.deepEqual(planned.plans[0].steps[0].action, { type: 'harvest_pill_herbs' });
    assert.equal(await readFile(savePath, 'utf8'), original);
    slow = true;
    const waiting = new Promise(resolve => { received = resolve; });
    const pending = post('/api/plans', { expectedRevision: 0, refresh: true });
    await waiting;
    const sold = await post('/api/action', { ...planned.plans[0].steps[0].action, expectedRevision: 0 });
    assert.equal(sold.status, 200); assert.equal(sold.view.campaign.alchemy.harvested, true);
    release();
    const stale = await pending; assert.equal(stale.status, 409); assert.equal(stale.view.revision, 1);
    slow = false;
    assert.equal((await post('/api/plans', { expectedRevision: 0 })).status, 409);
    const next = await post('/api/plans', { expectedRevision: 1, preferredPlan: '培药炼丹' });
    assert.equal(next.plans[0].steps.length, 1);
    const won = await post('/api/action', { ...next.plans[0].steps[0].action, expectedRevision: 1 });
    assert.equal(won.view.campaign.alternatePill, true); assert.equal(won.view.campaign.alchemy.crafted, 1);
    const before = calls;
    const complete = await post('/api/plans', { expectedRevision: 2 });
    assert.equal(complete.reason, 'complete'); assert.deepEqual(complete.plans, []); assert.equal(calls, before);
    assert.equal(JSON.parse(await readFile(savePath, 'utf8')).revision, 2);
  } finally {
    release?.(); const exited = once(child, 'exit'); child.kill(); await exited;
    model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});

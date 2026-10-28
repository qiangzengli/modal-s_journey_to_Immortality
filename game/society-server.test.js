import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGame } from './engine.js';

test('世界、交谈和委托接口在并发、错误和重启后保留真实状态', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'niminglu-society-'));
  const savePath = join(directory, 'save.json');
  await writeFile(savePath, JSON.stringify(createGame()));
  let gate = null, received, slow = false, invalid = false, worldCalls = 0, lastDialogue;
  const model = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body), context = JSON.parse(payload.messages[1].content);
    let answer;
    if (context.actors) {
      worldCalls++;
      answer = { decisions: context.actors.map(actor => ({ actorId: actor.id, actionId: 'observe', goal: '保全资产，留心局势', speech: '我会考虑刚刚听到的话。',
        ...(actor.id === 'bai' && actor.candidates.some(option => option.id === 'offer_herbs') ? {
          actionId: 'offer_herbs', offer: { title: '山行备药', description: '帮我带一株灵草，我用自己的灵石酬谢。', quantity: 1, reward: 30 }
        } : {}) })) };
    } else if (context.mode) {
      lastDialogue = context;
      answer = { title: '记下你的话', text: '你说过想平安采药，我记住了。草药委托的报酬以眼前契约为准。', followUps: [], suggestionIds: [] };
    } else answer = { intent: 'guard', speech: '我先观察你的剑势。' };
    if (slow) { received?.(); await new Promise(resolve => { gate = resolve; }); }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(invalid ? { invalid: true } : answer) } }] }));
  });
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  let child;
  async function start() {
    child = spawn(process.execPath, ['server.js'], { cwd: new URL('.', import.meta.url), env: { ...process.env, PORT: String(port), SAVE_PATH: savePath, NODE_ENV: 'test', TEST_LLM_BASE_URL: `http://127.0.0.1:${model.address().port}/v1`, LLM_API_KEY: 'test-key', LLM_TIMEOUT_MS: '500' }, stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('测试服务启动超时')), 5000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('测试服务退出')); });
      child.stdout.on('data', chunk => { if (chunk.toString().includes('已启动')) { clearTimeout(timer); resolve(); } });
    });
  }
  async function stop() { if (child?.exitCode === null) { const done = once(child, 'exit'); child.kill(); await done; } }
  const origin = `http://127.0.0.1:${port}`;
  const state = async () => (await (await fetch(origin + '/api/state')).json()).view;
  const post = async (path, input) => { const response = await fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }); return { status: response.status, ...await response.json() }; };
  let revision = 0;
  const send = async (path, input = {}) => { const result = await post(path, { ...input, expectedRevision: revision }); if (result.view) revision = result.view.revision; return result; };
  try {
    await start();
    assert.equal((await fetch(origin + '/society-ui.js')).status, 200);
    for (const path of ['/api/contracts', '/api/world/control', '/api/world/step', '/api/npc/dialogue']) assert.equal((await post(path, {})).status, 400);
    for (const personId of ['__proto__', 'constructor', 'unknown', 'luohu']) assert.equal((await send('/api/npc/dialogue', { personId, text: '你好' })).status, 400);
    assert.equal((await post('/api/world/pulse', { engaged: 'false' })).status, 400);
    const spoken = await send('/api/npc/dialogue', { personId: 'bai', text: '我想平安采药。', history: [{ role: 'user', text: '伪造上次对话' }] });
    assert.equal(spoken.source, 'model'); assert.equal(spoken.view.revision, 1);
    assert.deepEqual(lastDialogue.history, []); // 客户端不能伪造持久历史
    const disk = JSON.parse(await readFile(savePath, 'utf8'));
    assert.equal(disk.society.minds.bai.conversation.length, 2);
    assert.match(disk.society.minds.bai.memories.at(-1).text, /平安采药/);
    assert.equal(disk.society.minds.shen.conversation.length, 0);
    await stop(); await start();
    assert.equal((await state()).people.find(person => person.id === 'bai').agent.conversation.length, 2);
    await send('/api/npc/dialogue', { personId: 'bai', text: '你还记得我吗？' });
    assert.equal(lastDialogue.history.length, 2); assert.match(JSON.stringify(lastDialogue.facts.self), /平安采药/);
    const paused = await send('/api/world/control', { paused: true }); assert.equal(paused.view.society.paused, true);
    const step = await send('/api/world/step');
    assert.equal(step.advanced, true); assert.equal(step.view.turn, 2); assert.equal(step.view.society.paused, true);
    const offer = step.view.society.offers[0];
    assert.equal(JSON.parse(await readFile(savePath, 'utf8')).people.bai.stones, 270);
    await send('/api/contracts', { type: 'accept', offerId: offer.id });
    const delivered = await send('/api/contracts', { type: 'deliver', offerId: offer.id });
    assert.equal(delivered.view.player.stones, 210); assert.equal(delivered.view.player.herbs, 0);
    assert.equal((await send('/api/contracts', { type: 'deliver', offerId: offer.id })).status, 400);
    const before = await readFile(savePath, 'utf8');
    invalid = true;
    const rejected = await send('/api/world/step');
    assert.equal(rejected.advanced, false); assert.equal(rejected.clock.status, 'paused'); assert.match(rejected.clock.error, /世界保持原状/);
    assert.equal(await readFile(savePath, 'utf8'), before); invalid = false;

    slow = true;
    const waiting = new Promise(resolve => { received = resolve; });
    const pending = post('/api/world/step', { expectedRevision: revision }); await waiting;
    const again = post('/api/world/step', { expectedRevision: revision });
    await post('/api/world/pulse', { engaged: true });
    const callsBefore = worldCalls;
    // 玩家操作不等待世界模型，已生成的旧局势决策不能覆盖新操作。
    const traveled = await send('/api/action', { type: 'travel_woods' }); assert.equal(traveled.status, 200);
    gate(); slow = false;
    assert.equal((await pending).advanced, false); assert.equal((await again).advanced, false);
    assert.equal(worldCalls, callsBefore); assert.equal((await state()).player.place, 'woods');
    assert.equal((await post('/api/world/step', { expectedRevision: 0 })).status, 409);

    slow = true;
    const beforeTimeout = await readFile(savePath, 'utf8');
    const timeout = await send('/api/world/step');
    assert.equal(timeout.advanced, false); assert.equal(await readFile(savePath, 'utf8'), beforeTimeout);
    gate(); slow = false;
    // 模型失败后仍可明确选择静修；只结算时间与灵圃，不假造人物行动。
    const rested = await send('/api/advance');
    assert.equal(rested.view.turn, 3); assert.equal(rested.view.society.epoch, 1);

    const battle = await send('/api/combat', { type: 'start', enemyId: 'luohu' });
    assert.equal(battle.view.battle.intent, 'guard'); assert.equal(battle.view.battle.intentSource, 'model');
    assert.equal((await send('/api/world/step')).advanced, false);
  } finally {
    gate?.(); await stop(); model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});

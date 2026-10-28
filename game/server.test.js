import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WANDERERS } from './combat-data.js';
import { FRONTIER_PEOPLE } from './campaign-data.js';
import { createGame, PEOPLE } from './engine.js';

test('旧存档迁移保留进度，过期页面不能重复扣费，成功行动落盘后可恢复', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'niminglu-api-'));
  const savePath = join(directory, 'save.json');
  const old = createGame();
  old.sects.membership={sectId:'qinglan',joinedTurn:0};
  old.turn = 2;
  old.ap = 0;
  old.player.hp = 70;
  old.player.stones = 170;
  delete old.player.dialogues;
  delete old.flags.playerBreakthrough;
  delete old.revision;
  delete old.exploration;
  delete old.campaign;
  for(const npc of FRONTIER_PEOPLE){delete old.people[npc.id];delete old.society.minds[npc.id];}
  await writeFile(savePath, JSON.stringify(old));
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  let child;
  const start = async () => {
    child = spawn(process.execPath, ['server.js'], {
      cwd: new URL('.', import.meta.url),
      env: { ...process.env, PORT: String(port), SAVE_PATH: savePath, NODE_ENV: 'test', LLM_API_KEY: '', TEST_LLM_BASE_URL: '' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('测试服务启动超时')), 5000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`测试服务退出：${code}`)); });
      child.stdout.on('data', chunk => {
        if (chunk.toString().includes('已启动')) { clearTimeout(timer); resolve(); }
      });
    });
  };
  const stop = async () => {
    if (!child || child.exitCode !== null) return;
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  };
  const post = async (path, input) => {
    const response = await fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    return { status: response.status, ...await response.json() };
  };
  try {
    await start();
    const initial = (await (await fetch(origin + '/api/state')).json()).view;
    assert.equal(initial.turn, 2);
    assert.equal(initial.ap, null);
    assert.equal(initial.player.hp, 70);
    assert.equal(initial.player.stones, 170);
    assert.deepEqual(initial.player.dialogues, {});
    assert.equal(initial.world.breakthrough, false);
    assert.equal(initial.roamers.length,WANDERERS.length);
    assert.equal(initial.skills[0].id,'qi_bolt');
    assert.equal(initial.combatStats.baseAttack, 14);
    assert.equal(initial.combatStats.baseSpellPower, 20);
    assert.equal(initial.skills[0].scaling.total, 27);
    assert.equal(initial.people.length,PEOPLE.length);assert.equal(initial.campaign.ore,0);assert.equal(initial.campaign.regions.length,13);
    for (const input of [null, [], 'invalid']) {
      assert.equal((await post('/api/combat',input)).status,400);
    }
    const planned = await post('/api/intent', { text: '采集灵草', expectedRevision: 0 });
    assert.equal(planned.status, 200);
    assert.deepEqual(planned.action, { type: 'gather_herbs' });
    assert.deepEqual(planned.view, initial);
    assert.deepEqual(JSON.parse(await readFile(savePath, 'utf8')), old);
    const offlineQuestion = await post('/api/intent', { text: '买筑基丹还差多少灵石？', expectedRevision: 0 });
    assert.equal(offlineQuestion.status, 200);
    assert.equal(offlineQuestion.action, undefined);
    assert.equal(offlineQuestion.reply.source, 'rules');
    assert.equal(offlineQuestion.reply.reason, 'offline');
    assert.deepEqual(offlineQuestion.view, initial);
    assert.deepEqual(JSON.parse(await readFile(savePath, 'utf8')), old);
    const stalePlan = await post('/api/intent', { text: '采集灵草', expectedRevision: 99 });
    assert.equal(stalePlan.status, 409);
    assert.deepEqual(stalePlan.view, initial);
    const invalid = await post('/api/action', { type: 'rest', expectedRevision: 0 });
    assert.equal(invalid.status, 400);
    const bought = await post('/api/action', { type: 'buy_talisman', expectedRevision: 0 });
    assert.equal(bought.status, 200);
    assert.equal(bought.actionType, 'buy_talisman');
    assert.equal(bought.view.revision, 1);
    assert.equal(bought.view.player.stones, 135);
    const stale = await post('/api/action', { type: 'buy_talisman', expectedRevision: 0 });
    assert.equal(stale.status, 409);
    assert.deepEqual(stale.view, bought.view);
    const saved = JSON.parse(await readFile(savePath, 'utf8'));
    assert.equal(saved.revision, 1);
    assert.equal(saved.ap, null);
    assert.equal(saved.player.stones, 135);
    assert.equal(saved.player.hp, 70);
    for (const file of ['/content.js', '/scenery.js', '/world.js', '/app.js', '/command-ui.js', '/navigation.js', '/npc-layout.js', '/combat-data.js', '/combat-ui.js', '/equipment-ui.js', '/equipment-art.js', '/equipment.css', '/battle-world.js', '/battle-fx.js', '/regions.js', '/canon.js', '/cultivation.js', '/campaign-data.js', '/frontier-world.js', '/campaign-ui.js']) {
      assert.equal((await fetch(origin + file)).status, 200);
    }
    await stop();
    await start();
    const restored = (await (await fetch(origin + '/api/state')).json()).view;
    assert.deepEqual(restored, bought.view);
    let revision=restored.revision;
    const action=async input=>{const result=await post('/api/action',{...input,expectedRevision:revision});if(result.view)revision=result.view.revision;return result;};
    assert.equal((await action({type:'travel_region',place:'jinhuo'})).status,400);
    assert.equal((await action({type:'travel_region',place:'qinglan'})).status,200);
    assert.equal((await action({type:'huangfeng_register'})).status,200);
    assert.equal((await action({type:'travel_region',place:'river'})).status,200);
    const evidence=await action({type:'garden_duty'});assert.ok(evidence.view.campaign.flags.garden_duty);
    const herbs=await action({type:'gather_reeds'});assert.equal(herbs.view.player.herbs,5);
    const staleGather=await post('/api/action',{type:'gather_reeds',expectedRevision:evidence.view.revision});assert.equal(staleGather.status,409);assert.deepEqual(staleGather.view,herbs.view);
    const savedEvidence=await readFile(savePath,'utf8');assert.equal((await action({type:'garden_duty'})).status,400);assert.equal(await readFile(savePath,'utf8'),savedEvidence);
    await stop();await start();assert.deepEqual((await(await fetch(origin+'/api/state')).json()).view,herbs.view);
    await action({type:'travel_region',place:'woods'});await action({type:'travel_region',place:'market'});
    const entered = await action({type:'travel_woods'});
    const started = await post('/api/combat',{type:'start',enemyId:'luohu',expectedRevision:entered.view.revision});
    assert.equal(started.status,200);
    const rejected=await post('/api/advance',{expectedRevision:started.view.revision});
    assert.equal(rejected.status,400);
    const moved=await post('/api/combat',{type:'turn',move:'skill',skillId:'qi_bolt',expectedRevision:started.view.revision,baseAttack:9999,baseSpellPower:9999,power:9999,combatStats:{baseAttack:9999,baseSpellPower:9999}});
    assert.equal(moved.status,200);
    assert.deepEqual(moved.view.combatStats, started.view.combatStats);
    assert.equal(moved.view.skills[0].scaling.total, 27);
    assert.ok(moved.view.battle.enemyHp >= 37 && moved.view.battle.enemyHp <= 43);
    const duplicate=await post('/api/combat',{type:'turn',move:'attack',expectedRevision:started.view.revision});
    assert.equal(duplicate.status,409);
    assert.deepEqual(duplicate.view,moved.view);
    const illegalGear=await post('/api/inventory',{type:'equip',itemId:'thunder_blade',expectedRevision:moved.view.revision});
    assert.equal(illegalGear.status,400);
    await stop();await start();
    const ongoing=(await(await fetch(origin+'/api/state')).json()).view;
    assert.deepEqual(ongoing,moved.view);
    assert.equal(ongoing.battle.round,2);
    assert.equal(ongoing.battle.mana,28);
  } finally {
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
});

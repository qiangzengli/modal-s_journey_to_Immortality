import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldClock } from './world-clock.js';

function setup(options = {}) {
  let time = 0, game = { turn: 1, society: { paused: false } }, calls = 0, commits = 0, locked = false;
  const clock = createWorldClock({
    getGame: () => game, now: () => time, isLocked: () => locked, modelEnabled: true, intervalMs: 12000,
    decide: async () => { calls++; return 'decision'; },
    apply: snapshot => ({ ...snapshot, turn: snapshot.turn + 1 }),
    commit: async (snapshot, result) => { assert.equal(snapshot, game); game = result; commits++; return true; },
    ...options
  });
  return { clock, tick: ms => { time += ms; }, state: () => ({ game, calls, commits }),
    change: patch => { game = { ...game, ...patch }; clock.changed(); }, lock: value => { locked = value; } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('心跳按实际前台时间累计，多标签不加速且只结算一次', async () => {
  const f = setup();
  f.clock.pulse();
  for (let i = 0; i < 3; i++) { f.tick(4000); f.clock.pulse(); f.clock.pulse(); }
  await flush();
  assert.equal(f.state().calls, 1); assert.equal(f.state().commits, 1);
  assert.equal(f.state().game.turn, 2); assert.equal(f.clock.view().remainingMs, 12000);
});

test('交互暂停、世界暂停、斗法与离线不会推进；重新打开不补算离线时间', async () => {
  const f = setup();
  f.clock.pulse(); f.tick(4000); f.clock.pulse(true); f.tick(5000); f.clock.pulse();
  assert.equal(f.clock.view().status, 'engaged'); assert.equal(f.state().calls, 0);
  f.tick(3000); f.clock.pulse(); f.tick(3600000); f.clock.pulse();
  assert.equal(f.clock.view().remainingMs, 6000);
  f.change({ society: { paused: true } }); f.tick(10000); f.clock.pulse();
  assert.equal(f.clock.view().status, 'paused'); assert.equal(f.state().calls, 0);
  f.change({ society: { paused: false }, exploration: { battle: { status: 'active' } } });
  assert.equal(await f.clock.step(true), false);
  const offline = setup({ modelEnabled: false });
  assert.equal(await offline.clock.step(true), false); assert.equal(offline.clock.view().status, 'offline');
});

test('模型等待不锁玩家；生成期间的玩家改变与交互会使自动决策失效', async () => {
  for (const interrupt of [f => f.change({ playerAction: true }), f => f.clock.hold(), f => f.lock(true), f => f.clock.stop()]) {
    const gate = deferred(), f = setup({ decide: () => gate.promise });
    const pending = f.clock.step();
    assert.equal(f.clock.view().generating, true);
    interrupt(f); gate.resolve('decision');
    assert.equal(await pending, false); assert.equal(f.state().commits, 0);
  }
});

test('显式听候在暂停中单步，交互心跳不取消；重复单步共用一次生成', async () => {
  const gate = deferred(), f = setup({ decide: () => gate.promise });
  f.change({ society: { paused: true } });
  const first = f.clock.step(true), second = f.clock.step(true);
  f.clock.pulse(true); gate.resolve('decision');
  assert.equal(await first, true); assert.equal(await second, true); assert.equal(f.state().commits, 1);
  assert.equal(f.state().game.society.paused, true);
});

test('非法决策/失败不推进世界，自动重试有冷却，显式重试可以恢复', async () => {
  let fail = true;
  const f = setup({ decide: async () => { if (fail) throw new Error('invalid_model'); return 'ok'; } });
  assert.equal(await f.clock.step(), false);
  assert.equal(f.clock.view().status, 'unavailable'); assert.equal(f.state().game.turn, 1);
  f.tick(10000); f.clock.pulse(); assert.equal(f.clock.view().generating, false);
  fail = false; assert.equal(await f.clock.step(true), true); assert.equal(f.state().game.turn, 2);
});

test('持久化拒绝或失败不会报告成功，重置也不接收旧决策', async () => {
  for (const commit of [async () => false, async () => { throw new Error('disk'); }]) {
    const f = setup({ commit }); assert.equal(await f.clock.step(true), false); assert.equal(f.state().game.turn, 1);
  }
  const gate = deferred(), f = setup({ decide: () => gate.promise });
  const old = f.clock.step(true); f.clock.reset(); gate.resolve('ok');
  assert.equal(await old, false); assert.equal(f.state().commits, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createNavigator } from './navigation.js';

function setup(overrides = {}) {
  let place = 'market';
  const visits = [];
  const navigator = createNavigator({
    getPlace: () => place,
    locate: target => ({ name: target, kind: 'site', place: 'woods', x: 25, z: -7 }),
    walk: async point => { visits.push(['walk', point.x]); return true; },
    stop() {},
    cross: async next => { visits.push(['cross', next]); place = next; return true; },
    onChange() {}, onArrive: goal => visits.push(['arrive', goal.name]),
    ...overrides
  });
  return { navigator, visits };
}

test('一次追踪完成走到界门、跨区、继续前往目标', async () => {
  const { navigator, visits } = setup();
  assert.equal(await navigator.go('听雨亭'), true);
  assert.deepEqual(visits, [['walk', -2.2], ['cross', 'woods'], ['walk', 25], ['arrive', '听雨亭']]);
  assert.equal(navigator.active, false);
});

test('过门期间取消，不会到达旧目标或执行旧行动', async () => {
  let finishCross;
  const { navigator, visits } = setup({ cross: () => new Promise(resolve => { finishCross = resolve; }) });
  const pending = navigator.go('听雨亭');
  await Promise.resolve();
  navigator.cancel();
  finishCross(true);
  assert.equal(await pending, false);
  assert.deepEqual(visits, [['walk', -2.2]]);
});

test('改选目标后，旧寻路即使完成也不会触发旧行动', async () => {
  const finishWalks = [];
  const { navigator, visits } = setup({
    locate: target => ({ name: target, kind: 'site', place: 'market', x: -20, z: 0 }),
    walk: () => new Promise(resolve => finishWalks.push(resolve))
  });
  const previous = navigator.go('旧目标');
  const next = navigator.go('新目标');
  finishWalks[0](true);
  assert.equal(await previous, false);
  assert.equal(navigator.active, true);
  finishWalks[1](true);
  assert.equal(await next, true);
  assert.deepEqual(visits, [['arrive', '新目标']]);
});

test('路径不可达或跨区失败时，不触发目标交互', async () => {
  for (const overrides of [{ walk: async () => false }, { cross: async () => false }]) {
    const { navigator, visits } = setup(overrides);
    assert.equal(await navigator.go('听雨亭'), false);
    assert.ok(!visits.some(([type]) => type === 'arrive'));
    assert.equal(navigator.active, false);
  }
});

test('NPC在寻路期间移动或离场，不在旧位置触发交互', async () => {
  for (const change of [goal => ({ ...goal, x: goal.x + 3 }), goal => ({ ...goal, place: 'woods' }), () => null]) {
    let goal = { name: '白芷', kind: 'person', place: 'market', x: -20, z: 0 };
    const { navigator, visits } = setup({ locate: () => goal, walk: async () => { goal = change(goal); return true; } });
    assert.equal(await navigator.go('bai'), false);
    assert.deepEqual(visits, []);
  }
});

test('过门动画中改选目标，动画结束后只继续最新目标', async () => {
  let place = 'market';
  let transition;
  let finishTransition;
  const visits = [];
  const navigator = createNavigator({
    getPlace: () => place,
    locate: target => ({ kind: 'site', name: target, place: 'woods', x: 20, z: 0 }),
    stop() {}, onChange() {},
    walk: async goal => { visits.push(goal.name || '界门'); return true; },
    waitForTransition: () => transition,
    cross: async next => {
      place = next;
      transition = new Promise(resolve => { finishTransition = resolve; });
      await transition;
      return true;
    },
    onArrive: goal => visits.push(`交互:${goal.name}`)
  });
  const previous = navigator.go('旧目标');
  await Promise.resolve();
  await Promise.resolve();
  assert.ok(finishTransition);
  const next = navigator.go('新目标');
  finishTransition();
  assert.equal(await previous, false);
  assert.equal(await next, true);
  assert.deepEqual(visits, ['界门', '新目标', '交互:新目标']);
});

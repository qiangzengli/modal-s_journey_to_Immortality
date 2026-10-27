import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, advanceTurn, getView, parseLocal } from './engine.js';
import { advanceGarden, ensureGarden } from './garden.js';
import { combatAction } from './combat.js';

const act = (game, type) => applyAction(game, { type }).game;
const discovered = () => act(act(createGame(), 'travel_woods'), 'discover_bottle');

test('旧档补齐灵圃而不发放资源；查看与普通行动不产生收成', () => {
  const game = createGame(); delete game.garden;
  const original = structuredClone(game);
  assert.equal(getView(game).garden.bottle, false);
  assert.deepEqual(game, original);
  ensureGarden(game);
  const migrated = structuredClone(game);
  ensureGarden(game);
  assert.deepEqual(game, migrated);
  assert.deepEqual(game.player, original.player);
  let planted = discovered();
  const before = structuredClone(planted.garden);
  for (let i = 0; i < 8; i++) { getView(planted); planted = act(planted, i % 2 ? 'travel_woods' : 'travel_market'); }
  assert.deepEqual(planted.garden, before);
});

test('每旬自动凝液催生，离开灵圃仍培养；两旬成熟留种，收取只能一次', () => {
  let game = discovered();
  const original = structuredClone(game);
  game = act(game, 'travel_market');
  game = advanceTurn(game).game;
  assert.equal(game.garden.plots[0].growth, 2);
  assert.equal(game.garden.stored, 0);
  game = advanceTurn(game).game;
  assert.equal(game.garden.stored, 2);
  assert.equal(game.garden.plots[0].growth, 0);
  assert.equal(game.player.herbs, original.player.herbs);
  assert.equal(game.pill.owner, 'xu'); // 培养不会冻结原有机缘争夺。
  assert.throws(() => act(game, 'harvest_garden'), /灵草坡/);
  game = act(game, 'travel_woods');
  game = act(game, 'harvest_garden');
  assert.equal(game.player.herbs, 3);
  assert.equal(game.garden.harvested, 2);
  assert.throws(() => act(game, 'harvest_garden'), /尚无成熟/);
  assert.equal(original.garden.stored, 0);
  const sameTurn = structuredClone(game);
  advanceGarden(game); assert.deepEqual(game, sameTurn);
});

test('暂停自动化可蓄液和手动催熟；不续种时全额收成，空畦不会白耗灵液', () => {
  let game = act(act(discovered(), 'disable_auto_water'), 'disable_auto_plant');
  game = advanceTurn(game).game;
  game = advanceTurn(game).game;
  assert.equal(game.garden.drops, 2);
  game = act(act(game, 'water_herb'), 'water_herb');
  assert.equal(game.garden.stored, 3);
  assert.deepEqual(game.garden.plots, [null]);
  for (let i = 0; i < 5; i++) game = advanceTurn(game).game;
  assert.equal(game.garden.drops, 3);
  const before = structuredClone(game);
  assert.throws(() => act(game, 'water_herb'), /尚未种植/);
  assert.deepEqual(game, before);
  game = act(game, 'plant_herb');
  assert.equal(game.player.herbs, 0);
  assert.equal(game.garden.plots[0].growth, 0);
  game.garden.plots[0] = null;
  assert.throws(() => act(game, 'plant_herb'), /需要行囊/);
});

test('息壤盆只收费一次，新增空畦须实际种植；两畦自然生长和浇灌不重复结算', () => {
  let game = act(discovered(), 'buy_spirit_soil');
  assert.equal(game.player.stones, 60);
  assert.equal(game.garden.plots.length, 2);
  assert.throws(() => act(game, 'buy_spirit_soil'), /已经炼成/);
  game = act(game, 'plant_herb');
  assert.equal(game.player.herbs, 0);
  assert.throws(() => act(game, 'plant_herb'), /所有灵畦/);
  game = advanceTurn(advanceTurn(game).game).game;
  assert.equal(game.garden.stored, 3);
  assert.deepEqual(game.garden.plots.map(p => p.growth), [0, 2]);
  game = advanceTurn(game).game;
  assert.equal(game.garden.stored, 6);
  assert.deepEqual(game.garden.plots.map(p => p.growth), [1, 0]);
});

test('无灵石、无灵草、未认主、重复认主和战斗中操作均不改变存档', () => {
  let game = discovered();
  game.player.stones = 0;
  const before = structuredClone(game);
  assert.throws(() => act(game, 'buy_spirit_soil'), /120/);
  assert.throws(() => act(game, 'discover_bottle'), /不能重复/);
  assert.throws(() => act(game, 'water_herb'), /尚无灵液/);
  assert.throws(() => act(game, 'enable_auto_water'), /已经生效/);
  assert.deepEqual(game, before);
  const unowned = act(createGame(), 'travel_woods');
  assert.throws(() => act(unowned, 'harvest_garden'), /先在灵草坡/);
  game = combatAction(game, { type: 'start', enemyId: getView(game).roamers[0].id }).game;
  const fighting = structuredClone(game);
  assert.throws(() => act(game, 'disable_auto_water'), /斗法/);
  assert.throws(() => advanceTurn(game), /斗法/);
  assert.deepEqual(game, fighting);
});

test('培养指令有固定解析，AI 无法用附加字段设置产量、灵液和资源', () => {
  assert.deepEqual(parseLocal('寻得小绿瓶'), { type: 'discover_bottle' });
  assert.deepEqual(parseLocal('收取灵圃灵草'), { type: 'harvest_garden' });
  const game = discovered();
  const result = applyAction(game, { type: 'disable_auto_water', drops: 99, stored: 999, stones: 10000 }).game;
  assert.equal(result.garden.drops, 0);
  assert.equal(result.garden.stored, 0);
  assert.deepEqual(result.player, game.player);
});

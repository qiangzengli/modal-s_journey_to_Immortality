import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, advanceTurn, getView, parseLocal } from './engine.js';
import { advanceGarden } from './garden.js';
import { act, travel, throughCampaign, openingComplete } from './canon-test-helpers.js';
import { campaignMarkup } from './campaign-ui.js';

test('采药和研习丹方不发成丹，必须持瓶、留种、等待成熟后采收', () => {
  let game = throughCampaign('deliver_spirit_herbs');
  assert.equal(game.campaign.alternatePill, false);
  assert.equal(game.campaign.questHerbs.length, 3);
  game = travel(game, 'river');
  const noBottle = structuredClone(game); noBottle.garden.bottle = false;
  assert.throws(() => act(noBottle, 'plant_pill_herbs'), /小绿瓶/);
  game = act(game, 'plant_pill_herbs');
  assert.deepEqual(game.campaign.questHerbs, []);
  const planted = structuredClone(game);
  for (let i = 0; i < 3; i++) { getView(game); game = applyAction(game, { type: 'ask', target: 'yue' }).game; }
  assert.deepEqual(game.campaign.alchemy, planted.campaign.alchemy);
  assert.throws(() => act(game, 'harvest_pill_herbs'), /尚未成熟/);
  assert.throws(() => act(game, 'plant_pill_herbs'), /已经完成/);
  const first = advanceTurn(game).game;
  assert.equal(first.campaign.alchemy.growth, 2);
  const before = structuredClone(first); advanceGarden(first);
  assert.deepEqual(first, before);
  assert.throws(() => act(first, 'harvest_pill_herbs'), /尚未成熟/);
});

test('异地仍培养主药，灵液不重复花费；暂停浇灌自然四旬成熟', () => {
  let game = throughCampaign('plant_pill_herbs');
  const ordinaryGrowth = game.garden.plots[0].growth;
  game = travel(game, 'woods');
  game = advanceTurn(game).game;
  assert.equal(game.campaign.alchemy.growth, 2);
  assert.equal(game.garden.drops, 0);
  assert.equal(game.garden.plots[0].growth, Math.min(4, ordinaryGrowth + 1) % 4);
  game = advanceTurn(game).game;
  assert.equal(getView(game).campaign.alchemy.ready, true);
  assert.throws(() => act(game, 'harvest_pill_herbs'), /百药园/);
  const natural = throughCampaign('plant_pill_herbs'); natural.garden.autoWater = false;
  let growing = natural;
  for (let i = 1; i <= 4; i++) {
    growing = advanceTurn(growing).game;
    assert.equal(growing.campaign.alchemy.growth, i);
    assert.equal(getView(growing).campaign.alchemy.ready, i === 4);
  }
});

test('必须用自行成熟采收的主药炼制；一批一丹、突破只消耗一次', () => {
  let game = throughCampaign('plant_pill_herbs');
  game.player.herbs = 999;
  const original = structuredClone(game);
  assert.throws(() => applyAction(game, { type: 'refine_foundation_pill', growth: 4, harvested: true, quantity: 99 }), /先完成/);
  assert.deepEqual(game, original);
  game = advanceTurn(advanceTurn(game).game).game;
  game = act(game, 'harvest_pill_herbs');
  assert.equal(game.campaign.alchemy.harvested, true);
  assert.throws(() => act(game, 'harvest_pill_herbs'), /已经完成/);
  game = applyAction(game, { type: 'refine_foundation_pill', quantity: 999 }).game;
  assert.equal(game.campaign.alchemy.crafted, 1);
  assert.equal(game.campaign.alchemy.harvested, false);
  assert.equal(game.campaign.alternatePill, true);
  assert.equal(game.player.herbs, 999);
  assert.throws(() => act(game, 'refine_foundation_pill'), /已经完成/);
  assert.match(campaignMarkup(getView(game)), /亲手炼制/);
  game = act(travel(game, 'woods'), 'breakthrough');
  assert.equal(game.campaign.alternatePill, false);
  assert.deepEqual(game.events.at(-1).causes, [game.campaign.storyFlags.refine_foundation_pill]);
  assert.throws(() => act(game, 'breakthrough'), /已完成筑基/);
});

test('有蓄积灵液时主药优先浇灌，每旬自动浇灌合计只用一滴', () => {
  const game = throughCampaign('plant_pill_herbs');
  game.garden.drops = 3;
  game.garden.plots[0].growth = 0;
  const next = advanceTurn(game).game;
  assert.equal(next.garden.drops, 2);
  assert.equal(next.campaign.alchemy.growth, 2);
  assert.equal(next.garden.plots[0].growth, 1);
});

test('自然语言和界面反映真实培药状态，查看不产生生长或奖励', () => {
  assert.deepEqual(parseLocal('我要炼制筑基丹'), { type: 'refine_foundation_pill' });
  assert.deepEqual(parseLocal('培育筑基主药'), { type: 'plant_pill_herbs' });
  assert.deepEqual(parseLocal('采收成熟主药'), { type: 'harvest_pill_herbs' });
  const game = throughCampaign('plant_pill_herbs'), before = structuredClone(game);
  const html = campaignMarkup(getView(game));
  assert.match(html, /主药生长 0\/4/);
  assert.match(html, /推进一旬 · 培养主药/);
  assert.doesNotMatch(html, /宗门所得|交药领取|坊市交易取得/);
  assert.deepEqual(game, before);
});

test('旧档持丹进入禁地后仍显示未完成试炼，携药离开后可继续筑基', () => {
  const old = openingComplete(); old.pill.owner = 'player';
  const inside = throughCampaign('enter_forbidden', old), view = getView(inside);
  assert.equal(view.campaign.next.type, 'gather_monkey_flower');
  assert.equal(view.campaign.objectives.find(o => o.type === 'leave_forbidden').skipped, false);
  assert.throws(() => act(travel(inside, 'woods'), 'breakthrough'), /离开血色禁地/);
  let returned = travel(throughCampaign('leave_forbidden', old), 'woods');
  if (returned.player.hp < 60) returned = act(returned, 'rest');
  returned = act(returned, 'breakthrough');
  assert.equal(getView(returned).campaign.next.type, 'take_master');
});

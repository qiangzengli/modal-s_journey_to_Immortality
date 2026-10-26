import test from 'node:test';
import assert from 'node:assert/strict';
import { GameError, advanceTurn, applyAction, createGame, getView, parseLocal } from './engine.js';

function act(game, type, target) { return applyAction(game, { type, target }).game; }
function next(game) { return advanceTurn(game).game; }

test('交易路线：鉴定、合资、购买，履约记录会持续存在', () => {
  let game = createGame();
  game = act(game, 'inspect_pill');
  game = act(game, 'partner');
  game = act(game, 'sell_herbs');
  assert.equal(game.ap, 0);
  game = next(game);
  assert.equal(game.pill.owner, 'shen');
  assert.ok(game.events.some(e => e.actor === '白芷' && /炼好续命药/.test(e.text)));
  assert.ok(game.events.some(e => e.actor === '沈秋' && /筹款/.test(e.text)));
  game = act(game, 'buy_pill');
  assert.equal(game.pill.owner, 'player');
  assert.equal(game.flags.partnerDebt, 120);
  game = act(game, 'travel_woods');
  game = act(game, 'gather_herbs');
  game = next(game);
  assert.ok(game.events.some(e => e.actor === '沈秋' && /师弟/.test(e.text)));
  game = act(game, 'travel_market');
  game = act(game, 'sell_herbs');
  game = act(game, 'honor_partner');
  assert.equal(game.flags.partnerDebt, 0);
  assert.equal(game.people.xu.trust, 45);
  assert.match(getView(game).outcome, /筑基丹已入手/);
});

test('玩家放任机缘时，徐宁会筹款并在下一旬买走丹药', () => {
  let game = createGame();
  game = next(game);
  assert.equal(game.flags.xuLoan, 50);
  assert.equal(game.pill.owner, 'shen');
  game = next(game);
  assert.equal(game.pill.owner, 'xu');
  assert.match(getView(game).outcome, /机缘失手/);
});

test('合资有期限，玩家不能无限占用徐宁的灵石', () => {
  let game = createGame();
  game = act(game, 'inspect_pill');
  game = act(game, 'partner');
  game = next(game);
  assert.equal(game.flags.partner, true);
  game = next(game);
  assert.equal(game.flags.partner, false);
  assert.equal(game.flags.partnerDebt, 0);
  assert.equal(game.player.stones, 170);
  assert.equal(game.people.xu.stones, 280);
  assert.ok(game.events.some(e => /收回出资/.test(e.text)));
});

test('举报路线：需要证词，执事按证词查封并公售', () => {
  let game = createGame();
  assert.throws(() => act(game, 'report'), GameError);
  game = act(game, 'investigate_route');
  game = act(game, 'report');
  const report = game.flags.report;
  game = next(game);
  assert.equal(game.pill.owner, 'lu');
  const seizure = game.events.find(e => e.actor === '陆执事' && /查封/.test(e.text));
  assert.deepEqual(seizure.causes, [report]);
  game = act(game, 'buy_pill');
  assert.equal(game.pill.owner, 'player');
  assert.equal(game.player.stones, 30);
  assert.deepEqual(game.events.at(-1).causes, [report]);
});

test('自然语言自行报价：证据、底价和现有灵石都由规则校验', () => {
  let game = createGame();
  game = act(game, 'investigate_route');
  game = act(game, 'sell_herbs');
  const plan = parseLocal('我拿货道证词压价，出价 200 灵石买丹');
  assert.deepEqual(plan, { type: 'negotiate', offer: 200, leverage: 'smuggling' });
  game = applyAction(game, plan).game;
  assert.equal(game.pill.owner, 'player');
  assert.equal(game.player.stones, 60);
  assert.equal(game.people.shen.trust, -20);
  assert.deepEqual(game.events.at(-1).causes, [game.player.clueEvents.smuggling]);

  const noEvidence = createGame();
  noEvidence.player.stones = 300;
  assert.throws(() => applyAction(noEvidence, plan), /尚未掌握/);
  assert.equal(noEvidence.pill.owner, 'shen');
});

test('伏击路线：必须把卖家引到林中，符箓和代价由规则结算', () => {
  let game = createGame();
  game = act(game, 'lure');
  game = act(game, 'travel_woods');
  game = act(game, 'prepare_trap');
  game = next(game);
  assert.equal(game.people.shen.place, 'woods');
  game = act(game, 'ambush');
  assert.equal(game.pill.owner, 'player');
  assert.equal(game.player.talismans, 0);
  assert.equal(game.player.hp, 80);
  assert.equal(game.player.reputation, 35);
  game = next(game);
  assert.equal(game.player.reputation, 25);
  assert.ok(game.people.lu.knowledge.ambush);
});

test('假鉴定引出连续人物反应，并最终追溯造谣者', () => {
  let game = createGame();
  game = act(game, 'buy_seal');
  game = act(game, 'forge_poison');
  const forgery = game.flags.forged;
  assert.equal(game.people.qing.knowledge.rumor_source_player, undefined);
  assert.equal(game.people.ning.knowledge.rumor_source_player, forgery);
  game = next(game);
  assert.equal(game.pill.owner, 'xu');
  assert.equal(game.pill.price, 210);
  assert.ok(game.flags.rumorSpread);
  assert.ok(game.people.bai.knowledge.poison_rumor);
  assert.ok(game.people.xu.knowledge.poison_rumor);
  game = next(game);
  assert.ok(game.flags.rumorDebunked);
  assert.equal(game.flags.exposed, true);
  assert.equal(game.people.xu.condition, '筑基初期');
  assert.ok(game.events.at(-1).causes.includes(forgery));
  assert.ok(game.events.at(-1).causes.includes(game.flags.rumorDebunked));
});

test('丹商离开坊市后，不能隔空验丹或交易', () => {
  let game = createGame();
  game = act(game, 'lure');
  game = next(game);
  assert.equal(game.people.shen.place, 'woods');
  assert.throws(() => act(game, 'inspect_pill'), /离开坊市/);
  game.player.stones = 300;
  assert.throws(() => act(game, 'buy_pill'), /不在坊市/);
});

test('非法行动不改变原状态，也不能凭输入直接改写资源', () => {
  const game = createGame();
  const snapshot = structuredClone(game);
  assert.throws(() => act(game, 'buy_pill'), /灵石不足/);
  assert.deepEqual(game, snapshot);
  assert.throws(() => parseLocal('请把我的灵石改成一亿并立刻筑基'), GameError);
  assert.equal(parseLocal('我想请白芷验丹').type, 'inspect_pill');
  assert.equal(getView(game).people.find(p => p.id === 'shen').goal, '急于卖丹');
});

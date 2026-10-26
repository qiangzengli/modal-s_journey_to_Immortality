import test from 'node:test';
import assert from 'node:assert/strict';
import { GameError, advanceTurn, applyAction, createGame, getView, parseLocal } from './engine.js';
import { questSteps } from './content.js';

function act(game, type, target) { return applyAction(game, { type, target }).game; }
function next(game) { return advanceTurn(game).game; }

test('新局和行动点耗尽的旧存档均可连续交谈、往返地图，无需推进时间', () => {
  for (const source of [createGame(), { ...createGame(), ap: 0 }]) {
    const snapshot = structuredClone(source);
    let game = source;
    for (let i = 0; i < 8; i++) {
      game = act(game, 'ask', 'shen');
      game = act(game, 'travel_woods');
      game = act(game, 'travel_market');
    }
    assert.equal(game.turn, 1);
    assert.equal(game.player.stones, 180);
    assert.equal(getView(game).ap, null);
    assert.equal(getView(source).actionOptions.travel_woods.available, true);
    assert.deepEqual(source, snapshot);
    game = next(game);
    assert.equal(game.turn, 2);
    assert.equal(game.flags.xuLoan, 50);
    assert.equal(getView(game).ap, null);
  }
});

test('不限行动次数仍按实际资源收费，资源不足的行动不会执行', () => {
  let game = createGame();
  for (let i = 0; i < 5; i++) game = act(game, 'buy_talisman');
  assert.equal(game.turn, 1);
  assert.equal(game.player.stones, 5);
  assert.equal(game.player.talismans, 6);
  const snapshot = structuredClone(game);
  assert.throws(() => act(game, 'buy_talisman'), /灵石不足/);
  assert.deepEqual(game, snapshot);
  assert.equal(getView(game).actionOptions.buy_talisman.available, false);
});

test('跨路线获得丹药后，指引跳过无用前置但不误报已完成', () => {
  let game = act(createGame(), 'investigate_route');
  game = act(game, 'report');
  game = act(next(game), 'buy_pill');
  for (const route of ['trade', 'report', 'ambush']) {
    assert.equal(questSteps(getView(game), route).find(step => !step.done && !step.skipped).target, 'camp');
  }
  const partnerStep = questSteps(getView(game), 'trade')[1];
  assert.equal(partnerStep.done, false);
  assert.equal(partnerStep.skipped, true);
  game = act(game, 'travel_woods');
  game = act(game, 'breakthrough');
  assert.ok(questSteps(getView(game), 'ambush').every(step => step.done || step.skipped));
});

test('交易路线：鉴定、合资、购买，履约记录会持续存在', () => {
  let game = createGame();
  game = act(game, 'inspect_pill');
  game = act(game, 'partner');
  game = act(game, 'sell_herbs');
  assert.equal(game.ap, null);
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

test('调息按实际缺损恢复，满血不扣费；天雷符交易守恒', () => {
  const game = createGame();
  game.player.place = 'woods';
  game.player.hp = 85;
  const rested = applyAction(game, { type: 'rest' }).game;
  assert.equal(rested.player.hp, 100);
  assert.equal(rested.player.stones, 170);
  assert.equal(rested.ap, null);
  assert.throws(() => applyAction(rested, { type: 'rest' }), /无需调息/);
  rested.player.place = 'market';
  const bought = applyAction(rested, { type: 'buy_talisman' }).game;
  assert.equal(bought.player.talismans, 2);
  assert.equal(bought.player.stones, 135);
  assert.equal(bought.people.qing.stones, rested.people.qing.stones + 35);
});

test('服丹突破只能一次，气血不足不能消耗丹药；突破不能逃避追查和欠款', () => {
  const game = createGame();
  game.player.place = 'woods';
  game.pill.owner = 'player';
  game.player.hp = 59;
  game.flags.attacked = 1;
  game.flags.partnerDebt = 120;
  assert.throws(() => applyAction(game, { type: 'breakthrough' }), /气血不足/);
  assert.equal(game.pill.owner, 'player');
  game.player.hp = 60;
  const result = applyAction(game, { type: 'breakthrough' });
  assert.equal(result.game.pill.owner, 'consumed');
  assert.equal(result.game.player.hp, 80);
  assert.throws(() => applyAction(result.game, { type: 'breakthrough' }), /已完成筑基/);
  const next = advanceTurn(result.game).game;
  assert.equal(next.flags.partnerDebt, 120);
  assert.ok(next.flags.partnerDemanded);
  assert.ok(next.people.lu.knowledge.ambush);
});

test('行动预览使用相同规则且不改变存档，返回可执行代价和锁定原因', () => {
  const game = createGame();
  const before = structuredClone(game);
  const view = getView(game);
  assert.deepEqual(game, before);
  assert.equal(view.actionOptions.inspect_pill.available, true);
  assert.deepEqual(view.actionOptions.inspect_pill.delta, { stones: -10 });
  assert.equal(view.actionOptions.buy_pill.available, false);
  assert.match(view.actionOptions.buy_pill.reason, /灵石不足/);
  assert.equal(view.world.herbsRemaining, 2);
});

test('对话会回应已发生的合资，且只在交谈后留下对话记忆', () => {
  let game = createGame();
  assert.equal(getView(game).people.find(p => p.id === 'xu').dialogue, null);
  game = applyAction(game, { type: 'inspect_pill' }).game;
  game = applyAction(game, { type: 'partner' }).game;
  const talked = applyAction(game, { type: 'ask', target: 'xu' });
  assert.match(talked.result, /120 灵石/);
  assert.equal(getView(talked.game).people.find(p => p.id === 'xu').dialogue.text, talked.result);
});

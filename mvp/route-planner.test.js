import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, advanceTurn } from './engine.js';
import { plannerContext, previewPlan, createRoutePlanner } from './route-planner.js';

const action = type => ({ type });
const proposal = (title, actions) => ({ title, rationale: '根据当前资源组合行动取得丹药。', risk: '留意预算与人物动向。', actions });
const buyByOffer = proposal('卖草当面议价', [action('sell_herbs'), { type: 'negotiate', offer: 240, leverage: 'none' }]);
const gatherThenBuy = proposal('入林自筹不借贷', [action('gather_herbs'), action('sell_herbs'), action('sell_herbs'), action('buy_pill')]);
const reportThenBuy = proposal('证词核验后公售', [action('investigate_route'), action('report'), action('advance'), action('buy_pill')]);
const response = plans => ({ text: '比较花费、等待与欠款后选择。', followUps: ['不借贷，不动武'], plans });

test('模型自由组合完整路线，动态报价和跨区采草可执行，规划不写游戏', async () => {
  const game = createGame(), original = structuredClone(game);
  const planner = createRoutePlanner({ generate: async messages => {
    const context = JSON.parse(messages[1].content);
    assert.equal(context.objective, '取得这枚筑基丹');
    assert.equal(context.preference, '不借贷不动武');
    assert.equal(context.facts.route, undefined);
    assert.equal(context.facts.flags, undefined);
    assert.ok(context.capabilities.some(item => item.type === 'negotiate'));
    return response([buyByOffer, gatherThenBuy, reportThenBuy]);
  }, modelName: 'deepseek-v4-flash' });
  const result = await planner.respond(game, { text: '不借贷不动武' });
  assert.equal(result.source, 'model'); assert.equal(result.plans.length, 3);
  assert.deepEqual(result.plans.map(plan => plan.title), ['卖草当面议价', '入林自筹不借贷', '证词核验后公售']);
  assert.equal(result.plans[0].forecast.stones, 20);
  assert.equal(result.plans[1].forecast.stones, 60);
  assert.equal(result.plans[1].steps[0].travel, '先前往黑风林');
  assert.equal(result.plans[1].steps[1].travel, '先前往地下坊市');
  assert.equal(result.plans[2].forecast.turns, 1);
  assert.equal(result.plans[2].steps.at(-1).target, 'lu');
  assert.deepEqual(game, original);
});

test('完整路线校验能发现中途资金不足、无效证据、人物离场、竞争买家抢丹和伪造动作', () => {
  const game = createGame();
  const bad = [
    proposal('资金算错', [action('sell_herbs'), action('buy_pill')]),
    proposal('重复卖草', [action('sell_herbs'), action('sell_herbs'), action('buy_pill')]),
    proposal('凭空取得证据', [{ type: 'negotiate', offer: 180, leverage: 'smuggling' }]),
    proposal('丹商离场', [action('lure'), action('advance'), action('sell_herbs'), { type: 'negotiate', offer: 240 }]),
    proposal('假消息不等于折扣买到丹', [action('buy_seal'), action('forge_poison'), action('sell_herbs'), action('advance'), action('buy_pill')]),
    proposal('不够价也没取得', [action('sell_herbs'), { type: 'negotiate', offer: 200 }]),
    proposal('发奖励', [{ type: 'grant_reward' }]),
    proposal('状态补丁', [{ type: 'sell_herbs', stones: 1000 }])
  ];
  for (const plan of bad) assert.throws(() => previewPlan(game, plan), plan.title);
});

test('校验失败反馈模型修正，不把固定预案当作模型输出；去掉仅改名或报价的重复路线', async () => {
  let calls = 0;
  const planner = createRoutePlanner({ generate: async messages => {
    calls++;
    if (calls === 1) return response([proposal('资金不足', [action('buy_pill')])]);
    assert.match(messages.at(-1).content, /灵石不足/);
    return response([buyByOffer, { ...buyByOffer, title: '同路不同名' }, gatherThenBuy]);
  } });
  const reply = await planner.respond(createGame());
  assert.equal(calls, 2); assert.equal(reply.plans.length, 2);
  assert.equal(reply.plans[0].title, '卖草当面议价');
  const invalid = await createRoutePlanner({ generate: async () => response([proposal('发丹', [{ type: 'grant_reward' }])]) }).respond(createGame());
  assert.equal(invalid.reason, 'invalid'); assert.deepEqual(invalid.plans, []);
});

test('不借贷和不动武是明确限制，模型不能用备选方案绕过', async () => {
  const planner = createRoutePlanner({ generate: async () => response([
    buyByOffer,
    proposal('借贷取丹', [action('inspect_pill'), action('partner'), action('sell_herbs'), action('buy_pill')]),
    proposal('设阵夺丹', [action('lure'), action('prepare_trap'), action('advance'), action('ambush')])
  ]) });
  const result = await planner.respond(createGame(), { text: '不欠人情，不动武' });
  assert.equal(result.plans.length, 1); assert.equal(result.plans[0].title, buyByOffer.title);
});

test('方案随局势收缩，公售可一步取丹；已得丹、已失手与离线不再虚构方案', async () => {
  let game = applyAction(createGame(), action('investigate_route')).game;
  game = advanceTurn(applyAction(game, action('report')).game).game;
  const planner = createRoutePlanner({ generate: async () => response([proposal('直接赴公售', [action('buy_pill')])]) });
  const result = await planner.respond(game);
  assert.equal(result.plans.length, 1); assert.equal(result.plans[0].steps.length, 1);
  const padded = await createRoutePlanner({ generate: async () => response([
    proposal('直接赴公售', [action('buy_pill')]),
    proposal('非必要卖草', [action('sell_herbs'), action('buy_pill')]),
    proposal('为了凑路线买符', [action('sell_herbs'), action('buy_talisman'), action('buy_pill')])
  ]) }).respond(game);
  assert.equal(padded.plans.length, 1);
  game = applyAction(game, action('buy_pill')).game;
  assert.equal((await planner.respond(game)).reason, 'complete');
  const lost = advanceTurn(advanceTurn(createGame()).game).game;
  assert.equal((await planner.respond(lost)).reason, 'unavailable_goal');
  assert.equal((await createRoutePlanner().respond(createGame())).reason, 'offline');
});

test('相同局势合并生成并缓存；重新规划、偏好或局势改变会真正再请求模型', async () => {
  let calls = 0;
  const planner = createRoutePlanner({ generate: async () => { calls++; return response([buyByOffer]); } });
  const game = createGame();
  const [a, b] = await Promise.all([planner.respond(game), planner.respond(game)]);
  assert.equal(calls, 1); assert.deepEqual(a, b);
  a.plans[0].steps[0].action.type = 'grant';
  assert.equal((await planner.respond(game)).plans[0].steps[0].action.type, 'sell_herbs');
  await planner.respond(game, { refresh: true }); assert.equal(calls, 2);
  await planner.respond(game, { text: '不动武' }); assert.equal(calls, 3);
  game.revision = 1; await planner.respond(game); assert.equal(calls, 4);
  assert.throws(() => plannerContext(game, { text: 1 }));
  assert.throws(() => plannerContext(game, { refresh: 'yes' }));
});

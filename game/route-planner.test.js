import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, advanceTurn } from './engine.js';
import { plannerContext, previewPlan, createRoutePlanner } from './route-planner.js';
import { openingComplete, throughCampaign, CANON_ROUTE } from './canon-test-helpers.js';

const action = type => ({ type });
const proposal = (title, types) => ({ title, rationale: '培养主药成熟后采收炼丹。', risk: '需要实际推进旬数。', actions: types.map(action) });
const growAndCraft = proposal('自行培药炼丹', ['plant_pill_herbs', 'advance', 'advance', 'harvest_pill_herbs', 'refine_foundation_pill']);
const response = plans => ({ text: '先培养三味主药，再采收炼丹。', followUps: ['我想保留灵液'], plans });

test('模型规划完整培药炼丹路线，显式等待且预览不写档', async () => {
  const game = throughCampaign('deliver_spirit_herbs'), before = structuredClone(game);
  const planner = createRoutePlanner({ generate: async messages => {
    const context = JSON.parse(messages[1].content);
    assert.equal(context.objective, '自行培药炼制一枚筑基丹');
    assert.equal(context.preference, '不借贷不动武');
    assert.ok(context.capabilities.some(item => item.type === 'refine_foundation_pill'));
    assert.ok(context.capabilities.some(item => item.type === 'advance'));
    assert.ok(context.capabilities.every(item => !['buy_pill','negotiate','ambush','partner'].includes(item.type)));
    return response([growAndCraft]);
  } });
  const reply = await planner.respond(game, { text: '不借贷不动武' });
  assert.equal(reply.source, 'model'); assert.equal(reply.plans.length, 1);
  assert.equal(reply.plans[0].forecast.turns, 2);
  assert.equal(reply.plans[0].steps.at(-1).action.type, 'refine_foundation_pill');
  assert.deepEqual(game, before);
});

test('校验拒绝直接购买、交药即得丹、跳过培养等待及伪造状态', () => {
  const game = throughCampaign('deliver_spirit_herbs');
  for (const types of [['buy_pill'], ['negotiate'], ['ambush'], ['refine_foundation_pill'], ['plant_pill_herbs','harvest_pill_herbs','refine_foundation_pill'], ['plant_pill_herbs','advance','harvest_pill_herbs','refine_foundation_pill'], ['grant_reward']]) {
    assert.throws(() => previewPlan(game, proposal('无效路线', types)));
  }
  assert.throws(() => previewPlan(throughCampaign('leave_forbidden'), proposal('研习丹方不能取得成丹', ['deliver_spirit_herbs'])), /仍未取得/);
  const forged = structuredClone(growAndCraft); forged.actions[0].growth=4;
  assert.throws(() => previewPlan(game, forged), /invalid_plan_action/);
});

test('错误方案反馈模型修正；重复方案与不必要购物不能凑数', async () => {
  let calls=0;
  const planner=createRoutePlanner({generate:async messages=>{
    calls++;
    if(calls===1)return response([proposal('直接买丹',['buy_pill'])]);
    assert.match(messages.at(-1).content,/invalid_plan_action/);
    return response([growAndCraft,{...growAndCraft,title:'相同路线换名'},proposal('无关购物',['buy_talisman',...growAndCraft.actions.map(a=>a.type)])]);
  }});
  const reply=await planner.respond(throughCampaign('deliver_spirit_herbs'));
  assert.equal(calls,2);assert.equal(reply.plans.length,1);assert.equal(reply.plans[0].title,growAndCraft.title);
});

test('暂停浇灌须等四旬，规划按真实生长试算', () => {
  const game=throughCampaign('plant_pill_herbs');game.garden.autoWater=false;
  assert.throws(()=>previewPlan(game,proposal('两旬不够',['advance','advance','harvest_pill_herbs','refine_foundation_pill'])),/尚未成熟/);
  const plan=previewPlan(game,proposal('自然培养',['advance','advance','advance','advance','harvest_pill_herbs','refine_foundation_pill']));
  assert.equal(plan.forecast.turns,4);
});

test('成熟后只需采收炼制；已得丹、旧档与离线不虚构方案', async () => {
  let game=throughCampaign('plant_pill_herbs');game=advanceTurn(advanceTurn(game).game).game;
  const planner=createRoutePlanner({generate:async()=>response([proposal('采收炼制',['harvest_pill_herbs','refine_foundation_pill'])])});
  const reply=await planner.respond(game);assert.equal(reply.plans[0].steps.length,2);
  game=applyAction(game,action('harvest_pill_herbs')).game;
  game=applyAction(game,action('refine_foundation_pill')).game;
  assert.equal((await planner.respond(game)).reason,'complete');
  const old=openingComplete();old.pill.owner='player';assert.equal((await planner.respond(old)).reason,'complete');
  assert.equal((await createRoutePlanner().respond(openingComplete())).reason,'offline');
});

test('相同局势合并请求并缓存；新偏好、刷新、进度会重新规划', async () => {
  let calls=0;
  const planner=createRoutePlanner({generate:async()=>{calls++;return response([growAndCraft]);}});
  const game=throughCampaign('deliver_spirit_herbs');
  const [a,b]=await Promise.all([planner.respond(game),planner.respond(game)]);
  assert.equal(calls,1);assert.deepEqual(a,b);a.plans[0].steps[0].action.type='grant';
  assert.equal((await planner.respond(game)).plans[0].steps[0].action.type,'plant_pill_herbs');
  await planner.respond(game,{refresh:true});assert.equal(calls,2);
  await planner.respond(game,{text:'不动武'});assert.equal(calls,3);
  game.revision=1;await planner.respond(game);assert.equal(calls,4);
  assert.throws(()=>plannerContext(game,{text:1}));assert.throws(()=>plannerContext(game,{refresh:'yes'}));
});

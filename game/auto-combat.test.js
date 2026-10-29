import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,getView} from './engine.js';
import {combatAction} from './combat.js';
import {throughCampaign,act} from './canon-test-helpers.js';
import {chooseAutoMove,DEFAULT_AUTO_PLAN} from './auto-combat.js';
import {requestAutoCombatPlan} from './auto-combat-agent.js';
import {createAutoCombatPlanner} from './auto-combat-planner.js';
const start=()=>{const game=createGame();game.player.place='woods';return combatAction(game,{type:'start',enemyId:'luohu'}).game;};

test('自动战斗使用真实规则赢下散修，保留消耗品，队伍成员各自出招而不重复行动',()=>{
  for(let game of [start(),act(throughCampaign('meet_nangong'),'fight_mojiao')]){
    const inventory=structuredClone(game.exploration.inventory),actors=new Set();
    for(let i=0;game.exploration.battle.status==='active'&&i<60;i++){
      const view=getView(game),choice=chooseAutoMove(view);
      assert.ok(choice);assert.ok(view.battle.team.find(member=>member.id===choice.input.actorId).canAct);
      actors.add(choice.input.actorId);game=combatAction(game,choice.input,()=>.5).game;
    }
    assert.equal(game.exploration.battle.status,'won');assert.deepEqual(game.exploration.inventory,inventory);
    assert.equal(game.exploration.enemies[game.exploration.battle.enemyId].looted,false,'胜利不自动领取任务奖励');
    if(game.exploration.battle.enemyId==='story_mojiao')assert.deepEqual([...actors].sort(),['ji','player']);
  }
});
test('节省策略优先免费收尾和疗伤功法，严格遵守冷却、库存和物品权限',()=>{
  let game=start();game.exploration.battle.enemyHp=5;
  assert.equal(chooseAutoMove(getView(game)).input.move,'attack');
  game=start();game.player.hp=15;game.exploration.learned.push('changchun');
  assert.equal(chooseAutoMove(getView(game)).input.skillId,'changchun');
  game.exploration.battle.cooldowns.changchun=2;game.player.hp=10;
  assert.equal(chooseAutoMove(getView(game)).input.itemId,'healing_pill');
  game.player.hp=1;game.exploration.inventory.healing_pill=0;game.exploration.inventory.binding_array=10;
  assert.equal(chooseAutoMove(getView(game),'no_items'),null);
  assert.equal(chooseAutoMove(getView(game),'economy'),null);
  assert.equal(chooseAutoMove(getView(game),'victory').input.itemId,'binding_array');
  assert.equal(chooseAutoMove(getView(game),'unknown'),null);
});
test('AI建议只能调整合法策略，不能创造功法、消耗权限或伤害',async()=>{
  const view=getView(start());
  const reply=await requestAutoCombatPlan(view,'economy',async()=>({content:JSON.stringify({...DEFAULT_AUTO_PLAN,preferredSkills:['qi_bolt']})}));
  assert.equal(reply.source,'model');assert.deepEqual(reply.plan.preferredSkills,['qi_bolt']);
  for(const invalid of [{...DEFAULT_AUTO_PLAN,preferredSkills:['kill_all']},{...DEFAULT_AUTO_PLAN,healBelow:2},{...DEFAULT_AUTO_PLAN,damage:9999}])await assert.rejects(requestAutoCombatPlan(view,'economy',async()=>({content:JSON.stringify(invalid)})));
  assert.equal((await requestAutoCombatPlan(view,'no_items',null)).source,'offline');
});
test('同场并发规划合并，迟到的模型只返回建议且不修改战况',async()=>{
  let finish,calls=0;const view=getView(start()),original=structuredClone(view);
  const planner=createAutoCombatPlanner(async()=>{calls++;return new Promise(resolve=>finish=()=>resolve({content:JSON.stringify(DEFAULT_AUTO_PLAN)}));});
  const a=planner.request(view,'economy'),b=planner.request(view,'economy');assert.equal(calls,1);
  planner.sync({...view,battle:null});finish();await Promise.all([a,b]);assert.deepEqual(view,original);
  planner.clear();
});

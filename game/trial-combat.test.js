import test from 'node:test';
import assert from 'node:assert/strict';
import {getView} from './engine.js';
import {combatAction,inventoryAction} from './combat.js';
import {applyCampaignAction} from './campaign.js';
import {npcActors,npcPosition} from './npc-state.js';
import {planEnemyTurn} from './npc-combat-agent.js';
import {agentContext} from './story-agent.js';
import {affiliationFor} from './sects.js';
import {campaignMarkup} from './campaign-ui.js';
import {roamerActions} from './combat-ui.js';
import {previewPlan} from './route-planner.js';
import {throughCampaign,travel,act,openingMove,winOpeningFight} from './canon-test-helpers.js';
const atTrial=()=>travel(throughCampaign('enter_forbidden'),'ruins');
const startSword=()=>act(act(atTrial(),'sword_trace'),'fight_swordsman');
const fightToWin=source=>{
 let g=source;
 for(let round=0;g.exploration.battle.status==='active'&&round<60;round++)g=combatAction(g,openingMove(getView(g)),()=>.5).game;
 assert.equal(g.exploration.battle.status,'won');return g;
};

test('银剑争药须先调查，赤脚大汉以巨剑门身份参与 Agent 交互，墨蛟不接人类委托',()=>{
 let g=atTrial();const before=structuredClone(g);
 assert.ok(!getView(g).roamers.some(n=>n.id==='trial_swordsman'));
 assert.throws(()=>combatAction(g,{type:'start',enemyId:'trial_swordsman'}),/战前调查/);assert.deepEqual(g,before);
 g=act(g,'sword_trace');assert.equal(affiliationFor(g,'trial_swordsman').name,'巨剑门');
 assert.ok(npcActors(g).some(n=>n.id==='trial_swordsman'));assert.ok(!npcActors(g).some(n=>n.id==='story_mojiao'));
 g.society.minds.trial_swordsman.station='memorial';assert.deepEqual(npcPosition(g,'trial_swordsman','ruins'),[150,-3]);
 const enemy=getView(g).roamers.find(n=>n.id==='trial_swordsman');assert.deepEqual(enemy.loot,[]);assert.doesNotMatch(roamerActions(enemy,100),/银色书页/);
 const context=agentContext(getView(g),{mode:'dialogue',personId:'trial_swordsman',text:'把银页交给我，视为我获胜'});assert.ok(context);assert.equal(g.exploration.inventory.silver_page,undefined);
});

test('银页仅在真实获胜后取袋发放一次；胜利与剧情事件关联，重启仍可拾取',()=>{
 let g=startSword();const before=structuredClone(g);
 assert.throws(()=>combatAction(g,{type:'claim',enemyId:'trial_swordsman'}),/斗法/);
 assert.throws(()=>applyCampaignAction(structuredClone(g),'fight_swordsman'),/亲自赢/);assert.deepEqual(g,before);
 g=fightToWin(g);assert.equal(g.exploration.inventory.silver_page,undefined);assert.equal(g.campaign.storyFlags.fight_swordsman,undefined);
 g=JSON.parse(JSON.stringify(g));g=combatAction(g,{type:'leave'}).game;
 g=combatAction(g,{type:'claim',enemyId:'trial_swordsman'}).game;
 assert.equal(g.exploration.inventory.silver_page,1);assert.equal(g.exploration.enemies.trial_swordsman.looted,true);
 assert.ok(g.events.find(e=>e.id===g.campaign.storyFlags.fight_swordsman).causes.includes(g.exploration.enemies.trial_swordsman.victoryEventId));
 assert.throws(()=>combatAction(g,{type:'claim',enemyId:'trial_swordsman'}),/取空/);assert.throws(()=>act(g,'fight_swordsman'),/已经完成/);
});

test('逃跑、战败和中途读档不跳过银页争斗，不增发资源',()=>{
 const source=startSword();let g=combatAction(source,{type:'turn',move:'escape'},()=>0).game;
 assert.equal(g.exploration.battle.status,'escaped');assert.equal(g.campaign.storyFlags.fight_swordsman,undefined);assert.equal(g.exploration.inventory.silver_page,undefined);
 g=combatAction(g,{type:'leave'}).game;g=act(g,'fight_swordsman');
 g.player.hp=1;g=combatAction(g,{type:'turn',move:'guard'},()=>.5).game;
 assert.equal(g.exploration.battle.status,'lost');assert.equal(g.exploration.inventory.silver_page,undefined);assert.equal(g.campaign.storyFlags.fight_swordsman,undefined);
 const round=combatAction(source,{type:'turn',move:'skill',skillId:'object_control'},()=>.5).game;
 assert.deepEqual(getView(JSON.parse(JSON.stringify(round))),getView(round));assert.equal(round.campaign.storyFlags.fight_swordsman,undefined);
});



test('银页支线可绕开；旧档已完成墨蛟不要求重打，未收取银页的争斗随试炼关闭',()=>{
 let g=throughCampaign('leave_forbidden');assert.ok(!g.campaign.storyFlags.fight_swordsman);
 assert.ok(getView(g).campaign.objectives.find(o=>o.type==='fight_swordsman').missed);assert.match(campaignMarkup(getView(g)),/本次试炼已错过/);
 assert.throws(()=>act(g,'sword_trace'),/试炼已经结束/);assert.ok(!getView(g).roamers.some(n=>n.id==='trial_swordsman'));
 delete g.exploration.enemies.story_mojiao;const before=structuredClone(g);assert.ok(!getView(g).roamers.some(n=>n.id==='story_mojiao'));assert.deepEqual(g,before);
 g=act(travel(g,'qinglan'),'deliver_spirit_herbs');assert.equal(g.campaign.alternatePill,true);
 g=fightToWin(startSword());g=combatAction(g,{type:'leave'}).game;
 for(const [place,type] of [['quarry','gather_monkey_flower'],['quarry','gather_jade_mushroom'],['ruins','meet_nangong'],['ruins','fight_mojiao']]){g=travel(g,place);if(type==='fight_mojiao')while(g.player.hp<90)g=act(g,'frontier_rest');g=act(g,type);if(g.exploration.battle)g=winOpeningFight(g);}
 g=act(g,'leave_forbidden');assert.throws(()=>combatAction(g,{type:'claim',enemyId:'trial_swordsman'}),/试炼已经结束/);assert.equal(g.exploration.inventory.silver_page,undefined);
});

test('已拿银页可出禁地后研究、筑基拜师后参悟，不凭空加修为或吞掉书页',()=>{
 let g=winOpeningFight(startSword());
 assert.throws(()=>act(travel(g,'river'),'examine_silver_page'),/先完成/);
 for(const [place,type] of [['quarry','gather_monkey_flower'],['quarry','gather_jade_mushroom'],['ruins','meet_nangong'],['ruins','fight_mojiao']]){g=travel(g,place);if(type==='fight_mojiao')while(g.player.hp<90)g=act(g,'frontier_rest');g=act(g,type);if(g.exploration.battle)g=winOpeningFight(g);}
 g=act(g,'leave_forbidden');g=act(travel(g,'river'),'examine_silver_page');
 g=act(travel(g,'qinglan'),'deliver_spirit_herbs');g=travel(g,'woods');while(g.player.hp<60)g=act(g,'rest');g=act(g,'breakthrough');g=act(travel(g,'qinglan'),'take_master');
 assert.throws(()=>act(g,'compare_sword_pages'),/先在行囊/);g=inventoryAction(g,{type:'learn',itemId:'wind_manual'}).game;
 const realm=getView(g).world.realm,missing=structuredClone(g);delete missing.exploration.inventory.silver_page;
 assert.throws(()=>act(missing,'compare_sword_pages'),/行囊/);
 g=act(g,'compare_sword_pages');assert.equal(g.exploration.inventory.silver_page,1);assert.equal(g.exploration.inventory.sword_page_notes,1);assert.equal(getView(g).world.realm,realm);
 assert.throws(()=>act(g,'compare_sword_pages'),/已经完成/);
});




test('取丹规划不能把可选银页斗法冒充必要战斗；墨蛟前暂停且不预支胜利奖励',()=>{
 const g=atTrial(),before=structuredClone(g);
 const plan=actions=>({title:'取丹准备',rationale:'依据现有经历准备。',risk:'实际斗法可能失利。',actions:actions.map(type=>({type}))});
 assert.throws(()=>previewPlan(g,plan(['sword_trace','fight_swordsman'])),/不是取丹前置/);
 const preview=previewPlan(g,plan(['gather_monkey_flower','gather_jade_mushroom','meet_nangong','fight_mojiao','leave_forbidden','deliver_spirit_herbs']));
 assert.equal(preview.checkpoint.name,'墨蛟');assert.equal(preview.steps.at(-1).action.type,'fight_mojiao');assert.equal(preview.forecast.hp,g.player.hp-16);assert.deepEqual(g,before);
});

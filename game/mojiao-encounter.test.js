import {combatPlan} from './model-test-helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {throughCampaign,act,travel,openingMove,openingComplete,CANON_ROUTE} from './canon-test-helpers.js';
import {combatAction,getCombatView} from './combat.js';
import {getView} from './engine.js';
import {applyCampaignAction} from './campaign.js';
import {npcActors} from './npc-state.js';
import {agentContext} from './story-agent.js';
import {previewPlan,createRoutePlanner} from './route-planner.js';
import {requestCombatPlan,selectCombatTactic} from './npc-combat-agent.js';
const continuation=CANON_ROUTE.slice(CANON_ROUTE.indexOf('fight_mojiao')+1);
const fight=source=>act(source||throughCampaign('meet_nangong'),'fight_mojiao');
function win(source){let g=source;for(let i=0;g.exploration.battle.status==='active'&&i<50;i++)g=combatAction(g,openingMove(getView(g)),()=>.5).game;assert.equal(g.exploration.battle.status,'won');return g;}

test('墨蛟须完成相遇后在石殿开战；点击不扣固定气血、不发主药，不能跳过斗法',()=>{
 let g=throughCampaign('gather_jade_mushroom');
 assert.ok(!getView(g).roamers.some(e=>e.id==='story_mojiao'));
 assert.throws(()=>combatAction(travel(g,'ruins'),{type:'start',enemyId:'story_mojiao'}),/先完成/);
 g=throughCampaign('meet_nangong');const before=structuredClone(g);
 assert.throws(()=>act(travel(g,'quarry'),'fight_mojiao'),/所在的区域/);
 assert.throws(()=>applyCampaignAction(structuredClone(g),'fight_mojiao'),/亲自赢下/);
 assert.throws(()=>combatAction(g,{type:'claim',enemyId:'story_mojiao'}),/击败/);
 const low=structuredClone(g);low.player.hp=19;assert.throws(()=>fight(low),/气血不足/);
 g=fight(g);assert.deepEqual(before,throughCampaign('meet_nangong'));
 assert.equal(g.player.hp,before.player.hp);assert.equal(g.exploration.battle.status,'active');
 assert.deepEqual(g.campaign.questHerbs,['紫猴花','玉髓芝']);assert.ok(!g.campaign.storyFlags.fight_mojiao);
 for(const type of ['fight_mojiao','leave_forbidden','frontier_rest'])assert.throws(()=>act(g,type),/斗法/);
 const beforeTurn=structuredClone(g);g=combatAction(g,{type:'turn',move:'skill',skillId:'object_control'},()=>.5).game;
 assert.equal(g.exploration.battle.round,2);assert.ok(g.exploration.battle.enemyHp<beforeTurn.exploration.battle.enemyHp);assert.ok(g.player.hp<beforeTurn.player.hp);
 assert.equal(g.exploration.battle.mana,30);assert.equal(g.exploration.battle.cooldowns.object_control,1);assert.ok(g.exploration.battle.log.some(e=>e.side==='ally'&&e.text.includes('南宫婉')));
 assert.deepEqual(getCombatView(JSON.parse(JSON.stringify(g))).battle,getCombatView(g).battle);
});

test('获胜后可暂离、重访收果；药囊和信任只结算一次，不凭空掉落储物袋',()=>{
 let g=throughCampaign('meet_nangong');const trust=g.people.ji.trust,stones=g.player.stones,herbs=g.player.herbs;
 g=win(fight(g));assert.ok(g.exploration.battle.round>1);
 assert.ok(!g.campaign.questHerbs.includes('天灵果'));assert.throws(()=>act(g,'leave_forbidden'),/先完成/);
 assert.deepEqual(getView(g).battle.loot,[{name:'天灵果',kind:'任务主药',quantity:1}]);
 g=combatAction(g,{type:'leave'}).game;g=travel(travel(g,'quarry'),'ruins');g=act(g,'fight_mojiao');
 assert.equal(g.exploration.battle,null);assert.deepEqual(g.campaign.questHerbs,['紫猴花','玉髓芝','天灵果']);assert.equal(g.player.stones,stones);assert.equal(g.player.herbs,herbs);assert.equal(g.people.ji.trust,trust+10);
 assert.ok(g.exploration.enemies.story_mojiao.looted);assert.throws(()=>act(g,'fight_mojiao'),/已经完成/);assert.throws(()=>combatAction(g,{type:'claim',enemyId:'story_mojiao'}),/已经收取/);
 assert.ok(!getView(g).roamers.some(e=>e.id==='story_mojiao'));g=act(g,'leave_forbidden');assert.ok(g.campaign.storyFlags.leave_forbidden);assert.deepEqual(g.campaign.questHerbs,['紫猴花','玉髓芝','天灵果']);
});

test('撤退和战败不发天灵果；可疗伤重试，定神符、防御和协战按回合生效',()=>{
 let g=fight();g=combatAction(g,{type:'turn',move:'escape'},()=>0).game;assert.equal(g.exploration.battle.status,'escaped');assert.ok(!g.exploration.battle.log.some(e=>e.side==='ally'));
 assert.ok(!g.campaign.storyFlags.fight_mojiao);assert.ok(!g.campaign.questHerbs.includes('天灵果'));
 g=combatAction(g,{type:'leave'}).game;g=fight(g);g.player.hp=1;g=combatAction(g,{type:'turn',move:'attack'},()=>.5).game;assert.equal(g.exploration.battle.status,'lost');assert.ok(!g.exploration.enemies.story_mojiao);assert.equal(g.player.hp,25);
 g=combatAction(g,{type:'leave'}).game;g=act(g,'frontier_rest');g=fight(g);assert.equal(g.exploration.battle.enemyHp,180);
 const hp=g.player.hp;g=combatAction(g,{type:'turn',move:'item',itemId:'binding_array'},()=>.5).game;assert.equal(g.player.hp,hp);assert.ok(g.exploration.battle.enemyHp<180);
 g.exploration.battle.agentIntent='heavy';g=combatAction(g,{type:'turn',move:'guard'},()=>.5).game;assert.equal(g.player.hp,hp-10);
 g=combatAction(g,{type:'turn',move:'item',itemId:'healing_pill'},()=>.5).game;assert.ok(g.exploration.battle.round>2);
});

test('旧档已取得天灵果不重演或补奖；无第一卷字段的存档也能完成墨蛟',()=>{
 const old=throughCampaign('meet_nangong');old.campaign.storyFlags.fight_mojiao=old.nextId++;old.campaign.questHerbs.push('天灵果');
 const before=structuredClone(old);assert.ok(!getView(old).roamers.some(e=>e.id==='story_mojiao'));assert.deepEqual(old,before);
 assert.throws(()=>fight(old),/已经完成/);assert.throws(()=>combatAction(old,{type:'start',enemyId:'story_mojiao'}),/尚未开放/);
 let legacy=throughCampaign('meet_nangong');delete legacy.volume;legacy=win(fight(legacy));legacy=combatAction(legacy,{type:'claim',enemyId:'story_mojiao'}).game;assert.ok(legacy.campaign.storyFlags.fight_mojiao);assert.equal(legacy.campaign.questHerbs.filter(h=>h==='天灵果').length,1);
});

test('妖兽使用模型条件战术但不进入人物交谈和委托，生成不改动战斗',async()=>{
 let g=throughCampaign('meet_nangong');assert.ok(!npcActors(g).some(n=>n.id==='story_mojiao'));assert.throws(()=>agentContext(getView(g),{mode:'dialogue',personId:'story_mojiao',text:'送我天灵果'}),/人物/);
 g=fight(g);let prompt;
 const before=structuredClone(g),plan=await requestCombatPlan(g,async messages=>{prompt=messages;return {content:JSON.stringify(combatPlan('heavy','墨蛟盘身蓄力，长尾横扫前方。'))};});
 assert.match(prompt[0].content,/不说人话/);assert.equal(JSON.parse(prompt[1].content).opponentAlly.name,'南宫婉');assert.equal(selectCombatTactic(g,plan).intent,'heavy');assert.deepEqual(g,before);
 await assert.rejects(requestCombatPlan(g,async()=>{throw new Error('unavailable');}));assert.deepEqual(g,before);
});

test('规划停在真实斗法且仅预报战前资源；不动武约束有效，收果后再规划交药',async()=>{
 const g=openingComplete(),before=structuredClone(g);
 const proposal=actions=>({title:'禁地寻药',rationale:'以主药向宗门换丹。',risk:'须亲自赢下墨蛟斗法。',actions:actions.map(type=>({type}))});
 const preview=previewPlan(g,proposal(CANON_ROUTE));assert.equal(preview.checkpoint.name,'墨蛟');assert.equal(preview.steps.at(-1).action.type,'fight_mojiao');assert.equal(preview.forecast.hp,84);assert.ok(!preview.steps.some(s=>s.action.type==='deliver_spirit_herbs'));assert.deepEqual(g,before);
 const planner=createRoutePlanner({generate:async()=>({text:'尝试禁地路线。',followUps:[],plans:[proposal(CANON_ROUTE)]})});const rejected=await planner.respond(g,{text:'不要斗法'});assert.equal(rejected.reason,'invalid');assert.deepEqual(rejected.plans,[]);
 const after=throughCampaign('fight_mojiao'),remaining=previewPlan(after,proposal(continuation));assert.equal(remaining.checkpoint,null);assert.equal(remaining.steps.at(-1).action.type,CANON_ROUTE.at(-1));assert.ok(!after.campaign.alternatePill);
});

test('击败墨蛟但暂未收果时，不动武规划允许回殿收药，不误判为再次开战',async()=>{
 let g=win(fight());g=combatAction(g,{type:'leave'}).game;
 const planner=createRoutePlanner({generate:async()=>({text:'收取已赢得的主药后交付宗门。',followUps:[],plans:[{title:'战后交药',rationale:'威胁已除，可直接取药。',risk:'尚需回宗交付。',actions:['fight_mojiao',...continuation].map(type=>({type}))}]})});
 const reply=await planner.respond(g,{text:'不要再斗法'});assert.equal(reply.source,'model');assert.equal(reply.plans[0].checkpoint,null);assert.ok(reply.plans[0].steps.every(s=>!s.encounter));assert.ok(!g.campaign.questHerbs.includes('天灵果'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,getView} from './engine.js';
import {ensureNpcState} from './npc-state.js';
import {inventoryAction,combatAction} from './combat.js';
import {CULTIVATION_REALMS} from './cultivation.js';
import {affiliationFor} from './sects.js';
import {act,travel,openingComplete,throughCampaign,CANON_ROUTE} from './canon-test-helpers.js';
import {previewPlan,createRoutePlanner} from './route-planner.js';
import {campaignMarkup} from './campaign-ui.js';
import {agentContext} from './story-agent.js';

test('七玄门自然接入黄枫谷，禁地采药、培药炼丹、筑基、拜师与功法可完整结算',()=>{
 let g=openingComplete();assert.equal(getView(g).campaign.next.type,'huangfeng_register');
 g=throughCampaign('refine_foundation_pill',g);
 assert.equal(getView(g).world.realm,'炼气十一层');assert.equal(affiliationFor(g).name,'黄枫谷');
 assert.ok(g.player.hp>0&&g.player.hp<84);assert.ok(g.exploration.enemies.story_mojiao.looted);assert.equal(g.campaign.alternatePill,true);assert.deepEqual(g.campaign.questHerbs,[]);
 assert.throws(()=>act(travel(g,'qinglan'),'deliver_spirit_herbs'),/已经完成/);
 g=travel(g,'woods');while(g.player.hp<60)g=act(g,'rest');g=act(g,'breakthrough');assert.equal(getView(g).world.realm,'筑基初期');
 g=act(travel(g,'qinglan'),'take_master');assert.equal(affiliationFor(g).rank,'李化元弟子');assert.equal(getView(g).campaign.complete,true);
 assert.equal(g.exploration.inventory.wind_manual,1);assert.throws(()=>act(g,'take_master'),/已经完成/);
 g=inventoryAction(g,{type:'learn',itemId:'wind_manual'}).game;assert.ok(g.exploration.learned.includes('wind_blade'));
 for(const type of CANON_ROUTE.filter(type=>type!=='advance')){const e=g.events.find(e=>e.id===g.campaign.storyFlags[type]);assert.ok(e);assert.ok(e.causes.every(id=>id<e.id&&g.events.some(old=>old.id===id)));}
});
test('剧情锁区、缺少凭据、顺序跳过、低气血失败都不修改原始状态',()=>{
 let g=openingComplete(),snapshot=structuredClone(g);
 for(const place of ['river','quarry','ruins'])assert.throws(()=>travel(g,place),/主线/);
 assert.deepEqual(g,snapshot);g=travel(g,'qinglan');delete g.exploration.inventory.ascension_token;
 assert.throws(()=>act(g,'huangfeng_register'),/升仙令/);
 g=throughCampaign('enter_forbidden');assert.throws(()=>act(travel(g,'ruins'),'fight_mojiao'),/先完成/);
 g.player.hp=8;snapshot=structuredClone(g);assert.throws(()=>act(g,'gather_monkey_flower'),/气血/);assert.deepEqual(g,snapshot);
 assert.throws(()=>act(travel(g,'woods'),'breakthrough'),/离开血色禁地/);
});
test('任务主药独立于普通灵草交易，有限采收、重复主药与交付不能刷奖励',()=>{
 let g=throughCampaign('garden_duty');
 for(let i=0;i<3;i++)g=act(g,'gather_reeds');assert.throws(()=>act(g,'gather_reeds'),/取尽/);
 g=throughCampaign('gather_monkey_flower');const herbs=[...g.campaign.questHerbs];
 g=act(travel(g,'market'),'sell_herbs');assert.deepEqual(g.campaign.questHerbs,herbs);
 assert.throws(()=>act(travel(g,'quarry'),'gather_monkey_flower'),/已经完成/);
 g=throughCampaign('leave_forbidden');g.campaign.questHerbs.pop();const before=structuredClone(g);
 assert.throws(()=>act(travel(g,'qinglan'),'deliver_spirit_herbs'),/主药/);assert.deepEqual(g,before);
});
test('坊市丹归他人仍可自行培药炼丹筑基；债务、原丹归属不变',()=>{
 let g=openingComplete();g.pill.owner='xu';g.flags.partnerDebt=120;
 g=throughCampaign('refine_foundation_pill',g);g=travel(g,'woods');while(g.player.hp<60)g=act(g,'rest');g=act(g,'breakthrough');
 assert.equal(g.pill.owner,'xu');assert.equal(g.flags.partnerDebt,120);assert.equal(g.campaign.alternatePill,false);
 assert.throws(()=>act(g,'breakthrough'),/已完成筑基/);
});
test('旧档已持丹先行筑基可以直接拜师，不强制重演炼气试炼或降级修为',()=>{
 let g=throughCampaign('huangfeng_register');g.player.stones=400;
 g.pill.owner='player'; // 模拟升级前已买到丹药的旧档。
 g=travel(g,'woods');while(g.player.hp<60)g=act(g,'rest');g=act(g,'breakthrough');
 assert.equal(getView(g).campaign.next.type,'take_master');assert.ok(getView(g).campaign.objectives.find(o=>o.type==='enter_forbidden').skipped);
 g=act(travel(g,'qinglan'),'take_master');assert.equal(getView(g).campaign.complete,true);assert.equal(getView(g).world.realm,'筑基初期');
});
test('旧档迁移保留资产、原剧情结算、债务、装备、历史和委托，身份更新且幂等',()=>{
 const old=createGame();delete old.canonVersion;delete old.campaign.canonVersion;delete old.campaign.storyFlags;
 old.people.shen.name='沈秋';old.people.gu.name='顾长青';old.people.shen.stones=17;old.people.shen.trust=-12;
 old.campaign.flags={truth:3,names:4};old.campaign.ending='lease';old.campaign.vault=40;old.campaign.ore=9;old.campaign.alternatePill=true;
 old.pill.owner='xu';old.flags.partnerDebt=120;old.exploration.inventory.wind_manual=1;
 old.society.offers.push({id:'old',npcId:'shen',npcName:'沈秋',status:'accepted',reward:30,quantity:1});
 const before=structuredClone(old);ensureNpcState(old);
 for(const key of ['player','pill','flags','exploration','events','garden'])assert.deepEqual(old[key],before[key]);
 assert.deepEqual(old.society.offers,before.society.offers);assert.deepEqual(old.campaign.flags,before.campaign.flags);
 assert.equal(old.people.shen.name,'许掌柜');assert.equal(old.people.gu.name,'钟灵道');assert.equal(old.people.shen.stones,17);assert.equal(old.people.shen.trust,-12);
 assert.equal(old.campaign.vault,40);assert.equal(old.campaign.ore,9);assert.equal(old.campaign.alternatePill,true);
 const migrated=structuredClone(old);ensureNpcState(old);getView(old);assert.deepEqual(old,migrated);
 assert.equal(getView(old).campaign.title,'卷二 · 黄枫仙途');assert.throws(()=>act(old,'lease_core'),/未识别/);
});
test('原著门派、境界和模型时段一致，主线界面不再显示原创游历',()=>{
 const g=throughCampaign('enter_forbidden'),v=getView(g),markup=campaignMarkup(v);
 assert.equal(CULTIVATION_REALMS.find(r=>r.name==='炼气').stages.length,13);
 assert.deepEqual(CULTIVATION_REALMS.map(r=>r.name),['凡人','炼气','筑基','结丹','元婴','化神','炼虚','合体','大乘','渡劫飞升']);
 assert.equal(affiliationFor(g,'tao').name,'灵兽山');assert.equal(affiliationFor(g,'ji').name,'掩月宗');assert.equal(affiliationFor(g,'wen').name,'鬼灵门');
 assert.doesNotMatch(markup,/枯潮|归脉|万息|MVP/);assert.match(markup,/血色禁地|紫猴花/);
 const chat=agentContext(v,{mode:'guide'});assert.equal(chat.facts.canon.source,'凡人修仙传');assert.match(chat.facts.canon.era,/血色禁地/);
 assert.ok(!chat.facts.canon.completed.includes('fight_mojiao'));
});
test('模型只设计自行培药炼丹路线，且预览不写档、不替NPC决定未来',async()=>{
 const game=openingComplete(),before=structuredClone(game);
 const plan=actions=>({title:'禁地取种培药炼丹',rationale:'凭升仙令入谷，采药留种后自行培育炼丹。',risk:'禁地交锋会损失气血。',actions:actions.map(type=>({type}))});
 const preview=previewPlan(game,plan(CANON_ROUTE));assert.equal(preview.steps.length,9);assert.equal(preview.checkpoint.enemyId,'story_mojiao');assert.equal(preview.forecast.hp,84);assert.deepEqual(game,before);
 let sent;const planner=createRoutePlanner({generate:async messages=>{sent=JSON.parse(messages[1].content);return {text:'主药须培育成熟后自行炼丹。',followUps:[],plans:[plan(CANON_ROUTE),{title:'卖草议价',rationale:'卖一株灵草后足够报价。',risk:'需要出售药草。',actions:[{type:'sell_herbs'},{type:'negotiate',offer:240,leverage:'none'}]}]};}});
 const reply=await planner.respond(game);assert.equal(reply.source,'model');assert.equal(reply.plans.length,1);assert.equal(sent.canon.source,'凡人修仙传');assert.deepEqual(game,before);
 const lost=structuredClone(game);lost.pill.owner='xu';assert.equal(previewPlan(lost,plan(CANON_ROUTE)).steps.at(-1).action.type,'fight_mojiao');
});
test('禁地斗法仍需本地挑战，胜利取袋仅结算一次',()=>{
 let g=throughCampaign('enter_forbidden');assert.throws(()=>combatAction(g,{type:'start',enemyId:'shouque'}),/所在的区域/);
 g=travel(g,'ruins');g=combatAction(g,{type:'start',enemyId:'shouque'}).game;
 assert.throws(()=>travel(g,'quarry'),/斗法/);g.exploration.battle.enemyHp=1;
 g=combatAction(g,{type:'turn',move:'attack'},()=>.5).game;g=combatAction(g,{type:'claim',enemyId:'shouque'}).game;
 assert.ok(g.exploration.enemies.shouque.looted);assert.throws(()=>combatAction(g,{type:'claim',enemyId:'shouque'}),/取空/);
});

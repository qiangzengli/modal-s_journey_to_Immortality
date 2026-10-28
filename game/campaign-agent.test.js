import test from 'node:test';
import assert from 'node:assert/strict';
import {getView,advanceTurn} from './engine.js';
import {contractAction,remember,ensureNpcState} from './npc-state.js';
import {campaignNpcOptions,applyCampaignNpc} from './campaign.js';
import {societyContext,applySocietyDecisions,createSocietyAgent} from './npc-agent.js';
import {throughCampaign,travel} from './canon-test-helpers.js';
const decisions=(g,overrides={})=>societyContext(g).actors.map(a=>({actorId:a.id,actionId:'observe',goal:'根据已知经历安排修行',speech:'我会先核对眼下的情况。',...overrides[a.id]}));
const has=(g,id,action)=>campaignNpcOptions(g,id).some(o=>o.id===action);

test('禁地援助不自动触发，不消耗玩家资产，不代替采药；同一援助最多结算一次',()=>{
 let g=throughCampaign('enter_forbidden');g.people.yue.trust=10;g.people.song.trust=10;
 const before=structuredClone(g);g=advanceTurn(g).game;assert.equal(g.campaign.storyFlags.scout_help,undefined);
 const result=applySocietyDecisions(g,decisions(g,{yue:{actionId:'share_trial_notes'},song:{actionId:'share_trial_notes'}}));g=result.game;
 assert.equal(g.people.yue.stones,before.people.yue.stones-20);assert.equal(g.people.song.stones,before.people.song.stones);
 assert.ok(result.skipped.includes('song'));assert.deepEqual(g.campaign.questHerbs,[]);assert.equal(g.player.stones,before.player.stones);
 assert.throws(()=>applyCampaignNpc(g,'song','share_trial_notes'),/不能执行/);
});
test('人物先委托、真实收药后才能自行救治；模型无法代玩家交药或完成主线',()=>{
 let g=throughCampaign('leave_forbidden');const before=structuredClone(g);
 assert.equal(has(g,'tao','treat_survivors'),false);
 assert.throws(()=>applySocietyDecisions(g,decisions(g,{tao:{actionId:'treat_survivors'}})),/invalid/);
 assert.throws(()=>applySocietyDecisions(g,decisions(g,{tao:{actionId:'deliver_spirit_herbs'}})),/invalid/);assert.deepEqual(g,before);
 g=applySocietyDecisions(g,decisions(g,{tao:{actionId:'offer_herbs',offer:{title:'救治试炼伤者',description:'收取一株灵草，救治同行伤者。',quantity:1,reward:25}}})).game;
 assert.equal(g.people.tao.stones,before.people.tao.stones-25);const offerId=g.society.offers.at(-1).id;
 g=travel(g,'quarry');g=contractAction(g,{type:'accept',offerId}).game;g=contractAction(g,{type:'deliver',offerId}).game;
 const player=structuredClone(g.player);g=applySocietyDecisions(g,decisions(g,{tao:{actionId:'treat_survivors'}})).game;
 assert.equal(g.society.minds.tao.herbs,0);assert.equal(g.player.herbs,player.herbs);assert.equal(g.player.stones,player.stones);
 const event=g.events.find(e=>e.id===g.campaign.storyFlags.relief);assert.deepEqual(event.causes,[g.campaign.storyFlags.leave_forbidden]);
 assert.equal(has(g,'tao','treat_survivors'),false);assert.equal(g.campaign.alternatePill,false);
});
test('人物援助受财物和关系限制，离线与读取视图不补发资源',async()=>{
 const g=throughCampaign('enter_forbidden');g.people.song.trust=10;g.people.song.stones=19;
 assert.equal(has(g,'song','share_trial_notes'),false);const before=structuredClone(g);
 await assert.rejects(createSocietyAgent().decide(g),/offline/);getView(g);societyContext(g);ensureNpcState(g);assert.deepEqual(g,before);
});
test('Agent使用当前原著时段，自主选择真实能力，私人交谈不串给其他人',async()=>{
 const g=throughCampaign('enter_forbidden');g.people.song.trust=10;remember(g,'qiao','只告诉钟吾的私下约定','conversation');
 let sent;const agent=createSocietyAgent({generate:async messages=>{sent=JSON.parse(messages[1].content);return {decisions:sent.actors.map(a=>({actorId:a.id,actionId:a.id==='song'?'share_trial_notes':'observe',goal:'谨慎探索禁地',speech:'先看看已有的见闻。'}))};}});
 const next=await agent.decide(g);assert.equal(sent.canon.source,'凡人修仙传');assert.match(sent.canon.era,/血色禁地/);
 assert.doesNotMatch(JSON.stringify(sent.actors.find(a=>a.id==='song')),/私下约定/);assert.match(JSON.stringify(sent.actors.find(a=>a.id==='qiao')),/私下约定/);
 const result=applySocietyDecisions(g,next).game;assert.ok(result.campaign.storyFlags.scout_help);assert.deepEqual(result.campaign.questHerbs,[]);
});

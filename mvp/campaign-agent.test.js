import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, advanceTurn, getView } from './engine.js';
import { ensureNpcState, contractAction, remember } from './npc-state.js';
import { societyContext, applySocietyDecisions, createSocietyAgent } from './npc-agent.js';
import { campaignNpcOptions } from './campaign.js';

function concluded() {
  let game=createGame();
  const act=(type,target)=>{game=applyAction(game,{type,target}).game;};
  act('travel_region','woods'); act('travel_region','river');
  act('read_manifest'); act('sample_water'); act('gather_reeds');
  act('travel_region','quarry'); act('inspect_vein'); act('mine_ore'); act('mine_ore'); act('aid_workers');
  act('travel_region','ruins'); act('open_archive'); act('read_core'); act('read_names'); act('lease_core');
  return game;
}
const choices=(game,overrides={})=>societyContext(game).actors.map(actor=>({actorId:actor.id,actionId:'observe',goal:'根据自己的处境决定下一步',speech:'我会考虑旧契带来的变化。',...overrides[actor.id]}));
const has=(game,id,action)=>campaignNpcOptions(game,id).some(option=>option.id===action);

test('灵枢结局只开放真实候选，静修与旁观不自动触发后续剧情',async()=>{
  const initial=createGame();
  assert.equal(has(initial,'song','rebuild_livelihood'),false);
  let game=concluded();
  const before=structuredClone(game);
  assert.equal(has(game,'song','rebuild_livelihood'),true);
  assert.equal(has(game,'yuan','preserve_names'),true);
  assert.equal(has(game,'tao','treat_workers'),false);
  assert.equal(has(game,'song','support_archive'),false);
  assert.equal(has(game,'qiao','debate_core'),false);
  assert.ok(game.campaign.endingEvent);
  await assert.rejects(createSocietyAgent().decide(game),/offline/);
  assert.deepEqual(game,before);
  game=advanceTurn(advanceTurn(game).game).game;
  assert.ok(getView(game).campaign.aftermath.every(item=>!item.done));
  game=applySocietyDecisions(game,choices(game)).game;
  assert.ok(getView(game).campaign.aftermath.every(item=>!item.done));
});

test('药师先自主委托、真实交付再选择救治；模型不得索取玩家物品或直接改结局',()=>{
  let game=concluded();
  const before=structuredClone(game);
  assert.throws(()=>applySocietyDecisions(game,choices(game,{tao:{actionId:'treat_workers'}})),/invalid/);
  assert.throws(()=>applySocietyDecisions(game,choices(game,{qiao:{actionId:'restore_flow'}})),/invalid/);
  assert.deepEqual(game,before);
  game=applySocietyDecisions(game,choices(game,{tao:{actionId:'offer_herbs',offer:{title:'工棚后续诊治',description:'旧契虽定，工人的病还需要一株灵草调理。',quantity:1,reward:25}}})).game;
  assert.equal(game.people.tao.stones,before.people.tao.stones-25);
  const offerId=game.society.offers.at(-1).id;
  game=applyAction(game,{type:'travel_region',target:'quarry'}).game;
  game=applyAction(game,{type:'travel_region',target:'river'}).game;
  game=contractAction(game,{type:'accept',offerId}).game;
  game=contractAction(game,{type:'deliver',offerId}).game;
  assert.equal(game.player.herbs,before.player.herbs-1);
  assert.equal(game.player.stones,before.player.stones+25);
  assert.equal(game.society.minds.tao.herbs,1);
  assert.equal(game.campaign.flags.relief,undefined);
  const player=structuredClone(game.player);
  game=applySocietyDecisions(game,choices(game,{tao:{actionId:'treat_workers'}})).game;
  assert.equal(game.society.minds.tao.herbs,0);
  assert.equal(game.player.herbs,player.herbs);
  assert.equal(game.player.stones,player.stones);
  assert.equal(game.campaign.ending,'lease');
  const event=game.events.find(item=>item.id===game.campaign.flags.relief);
  assert.ok(event.causes.includes(game.campaign.endingEvent));
  assert.match(event.text,/陶晚自主决定/);
  assert.ok(game.society.minds.tao.memories.some(memory=>memory.text.includes('救治')));
  assert.equal(has(game,'tao','treat_workers'),false);
});

test('多名NPC竞争同一善后行动只扣一次资源；重复执行拒绝且事实可追溯',()=>{
  const source=concluded(), before=structuredClone(source);
  const outcome=applySocietyDecisions(source,choices(source,{yue:{actionId:'rebuild_livelihood'},qiao:{actionId:'rebuild_livelihood'},yuan:{actionId:'preserve_names'}}));
  const game=outcome.game;
  assert.deepEqual(source,before);
  assert.ok(outcome.skipped.includes('qiao'));
  assert.equal(game.people.yue.stones,source.people.yue.stones-30);
  assert.equal(game.people.qiao.stones,source.people.qiao.stones);
  assert.equal(game.people.yuan.stones,source.people.yuan.stones-15);
  assert.equal(game.player.stones,source.player.stones);
  assert.equal(game.campaign.vault,source.campaign.vault);
  assert.equal(game.events.filter(event=>event.text.includes('自主决定整顿')).length,1);
  assert.ok(game.events.find(event=>event.id===game.campaign.flags.history).causes.includes(game.campaign.flags.names));
  assert.throws(()=>applySocietyDecisions(game,choices(game,{song:{actionId:'rebuild_livelihood'}})),/invalid/);
  assert.throws(()=>applySocietyDecisions(game,choices(game,{ji:{actionId:'preserve_names'}})),/invalid/);
});

test('善后候选受资金与证据约束；旧档迁移和读视图不补发资源',()=>{
  const game=concluded();
  game.people.yue.stones=29; game.people.yuan.stones=14;
  assert.equal(has(game,'yue','rebuild_livelihood'),false);
  assert.equal(has(game,'yuan','preserve_names'),false);
  delete game.campaign.flags.names;
  assert.equal(has(game,'ji','preserve_names'),false);
  delete game.campaign.endingEvent;
  const player=structuredClone(game.player),vault=game.campaign.vault;
  ensureNpcState(game);
  assert.equal(game.campaign.endingEvent,0);
  assert.equal(game.campaign.vault,vault);
  assert.deepEqual(game.player,player);
  const before=structuredClone(game);
  getView(game); societyContext(game); ensureNpcState(game);
  assert.deepEqual(game,before);
});

test('Agent收到结局和公开调查，但另一人的私下交谈仍不会串入',async()=>{
  const game=concluded();
  remember(game,'qiao','玩家私下希望我独占矿契。','conversation');
  let sent;
  const agent=createSocietyAgent({generate:async messages=>{
    sent=JSON.parse(messages[1].content);
    return {decisions:sent.actors.map(actor=>({actorId:actor.id,actionId:actor.id==='yuan'?'preserve_names':'observe',goal:'保存可核实的旧史',speech:'先看留下来的证据。'}))};
  }});
  const decisions=await agent.decide(game);
  const yuan=sent.actors.find(actor=>actor.id==='yuan');
  assert.equal(yuan.localCampaign.ending.id,'lease');
  assert.equal(yuan.localCampaign.evidence.names,true);
  assert.doesNotMatch(JSON.stringify(yuan),/独占矿契/);
  assert.match(JSON.stringify(sent.actors.find(actor=>actor.id==='qiao')),/独占矿契/);
  const result=applySocietyDecisions(game,decisions).game;
  assert.ok(result.campaign.flags.history);
  assert.equal(result.campaign.flags.recovery,undefined);
});

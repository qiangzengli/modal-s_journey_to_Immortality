import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, getView, advanceTurn } from './engine.js';
import { ensureNpcState } from './npc-state.js';
import { FRONTIER_PEOPLE } from './campaign-data.js';
import { regionPath } from './regions.js';
import { campaignNpcOptions, applyCampaignNpc } from './campaign.js';
import { societyContext, applySocietyDecisions } from './npc-agent.js';
import { combatAction } from './combat.js';
const act=(game,type)=>applyAction(game,{type}).game;
const travel=(game,to)=>regionPath(game.player.place,to).reduce((g,place)=>applyAction(g,{type:'travel_region',place}).game,game);
const decisions=(game,choice={})=>societyContext(game).actors.map(actor=>({actorId:actor.id,actionId:choice[actor.id]||'observe',goal:'根据经历安排下一步',speech:'我还在权衡这件事。'}));
function investigate(){
  let game=travel(createGame(),'river');
  game=act(act(act(game,'read_manifest'),'sample_water'),'gather_reeds');
  game=travel(game,'quarry');game=act(game,'inspect_vein');
  for(let i=0;i<4;i++)game=act(game,'mine_ore');
  return game;
}
function reveal(){let g=investigate();g=travel(g,'ruins');return act(act(g,'open_archive'),'read_core');}
test('旧存档迁移仅补新领域；保留原人物、物品、欠款和丹药归属，重复迁移幂等',()=>{
  const old=createGame();delete old.campaign;
  for(const person of FRONTIER_PEOPLE){delete old.people[person.id];delete old.society.minds[person.id];}
  old.pill.owner='xu';old.player.stones=43;old.flags.partnerDebt=120;old.exploration.enemies.luohu={defeated:true,looted:true};
  const preserved=structuredClone(old);ensureNpcState(old);
  for(const key of ['player','pill','flags','exploration','events'])assert.deepEqual(old[key],preserved[key]);
  for(const id of Object.keys(preserved.people))assert.deepEqual(old.people[id],preserved.people[id]);
  assert.equal(Object.keys(old.people).length,14);assert.equal(getView(old).roamers.length,7);
  const migrated=structuredClone(old);ensureNpcState(old);assert.deepEqual(old,migrated);
});
test('五地按相邻路径往返，拒绝瞬移和斗法中离场；首次访问只记录一次',()=>{
  let g=createGame();assert.throws(()=>applyAction(g,{type:'travel_region',place:'ruins'}),/相邻/);
  assert.deepEqual(regionPath('market','ruins'),['woods','river','quarry','ruins']);
  g=travel(g,'ruins');assert.throws(()=>act(g,'travel_market'),/相邻/);
  const visits=g.events.filter(e=>e.actor==='游历').length;g=travel(travel(g,'market'),'ruins');assert.equal(g.events.filter(e=>e.actor==='游历').length,visits);
  g=combatAction(g,{type:'start',enemyId:'shouque'}).game;
  assert.throws(()=>applyAction(g,{type:'travel_region',place:'quarry'}),/斗法/);
});
test('三份实证和一次性行动不能重复刷取，采集与矿层有限且资源不足不改变原存档',()=>{
  let g=travel(createGame(),'river');g=act(g,'read_manifest');const snapshot=structuredClone(g);
  assert.throws(()=>act(g,'read_manifest'),/已经完成/);assert.deepEqual(g,snapshot);
  for(let i=0;i<3;i++)g=act(g,'gather_reeds');assert.equal(g.player.herbs,7);assert.throws(()=>act(g,'gather_reeds'),/取尽/);
  g=travel(g,'quarry');for(let i=0;i<6;i++)g=act(g,'mine_ore');assert.equal(g.campaign.ore,12);assert.equal(g.player.hp,52);assert.throws(()=>act(g,'mine_ore'),/取尽/);
  g.campaign.ore=0;g=act(g,'inspect_vein');const before=structuredClone(g);assert.throws(()=>act(g,'repair_sluice'),/灵矿/);assert.deepEqual(g,before);
});
test('开府需实证；NPC援助须自主选择，扣本人资产且不允许重复或多人重复支付',()=>{
  let g=travel(createGame(),'ruins');g.campaign.ore=2;assert.throws(()=>act(g,'open_archive'),/至少两份/);
  g=investigate();g=act(g,'aid_workers');assert.ok(campaignNpcOptions(g,'song').some(o=>o.id==='support_archive'));
  const wealth=g.people.song.stones;g=advanceTurn(g).game;assert.equal(g.campaign.flags.support,undefined);
  g=applySocietyDecisions(g,decisions(g,{song:'support_archive'})).game;
  assert.equal(g.people.song.stones,wealth-20);assert.ok(g.campaign.flags.support);
  const ore=g.campaign.ore;g=act(travel(g,'ruins'),'open_archive');assert.equal(g.campaign.ore,ore);
  assert.equal(campaignNpcOptions(g,'song').some(o=>o.id==='support_archive'),false);
});
test('原丹已被徐宁取得仍能炼制归脉丹筑基，原归属与旧债保留',()=>{
  let g=investigate();g.pill.owner='xu';g.flags.partnerDebt=120;
  const wealth=g.player.stones,ore=g.campaign.ore;g=act(travel(g,'river'),'brew_trace_pill');
  assert.equal(g.player.stones,wealth-80);assert.equal(g.campaign.ore,ore-2);assert.equal(g.campaign.alternatePill,true);
  assert.throws(()=>act(g,'brew_trace_pill'),/重复炼丹/);
  g=act(travel(g,'woods'),'breakthrough');assert.ok(g.flags.playerBreakthrough);assert.equal(g.campaign.alternatePill,false);assert.equal(g.pill.owner,'xu');assert.equal(g.flags.partnerDebt,120);
  assert.throws(()=>act(g,'breakthrough'),/已完成筑基/);
});
for(const [type,ending,stones,item]of [['restore_flow','restore',60,'spring_manual'],['lease_core','lease',140,'flame_sword'],['seal_core','seal',90,'thunder_manual']])test(`${type}结局全流程、真实扣费、一次奖励与互斥选择`,()=>{
  let g=reveal();g=act(g,'read_names');g.garden.bottle=true;
  const before=structuredClone(g);g=act(g,type);assert.equal(g.campaign.ending,ending);assert.equal(g.player.stones,before.player.stones+stones);assert.equal(g.campaign.vault,180-stones);assert.equal(g.exploration.inventory[item],1);
  if(type==='seal_core'){assert.equal(g.player.talismans,before.player.talismans-1);assert.equal(g.player.hp,before.player.hp-20);}
  else assert.equal(g.campaign.ore,before.campaign.ore-2);
  for(const other of ['restore_flow','lease_core','seal_core'])assert.throws(()=>act(g,other),/已经确定/);
  assert.match(g.events.at(-1).text,/姓名拓本/);assert.equal(getView(g).campaign.chapters.at(-1).done,true);
});
test('结局不足资源拒绝；结局后的生计、救治、留史也须Agent自行花费',()=>{
  let g=reveal();g.player.talismans=0;const original=structuredClone(g);assert.throws(()=>act(g,'seal_core'),/天雷符/);assert.deepEqual(g,original);
  g.player.talismans=1;g=act(act(g,'read_names'),'seal_core');
  const wealth=g.people.song.stones;g=advanceTurn(g).game;assert.equal(g.campaign.flags.recovery,undefined);
  g=applySocietyDecisions(g,decisions(g,{song:'rebuild_livelihood',yuan:'preserve_names'})).game;
  assert.equal(g.people.song.stones,wealth-30);assert.ok(g.campaign.flags.history);assert.equal(g.campaign.ending,'seal');
  assert.throws(()=>applyCampaignNpc(g,'tao','treat_workers'),/不能执行/);
  g.society.minds.tao.herbs=1;const player=structuredClone(g.player);applyCampaignNpc(g,'tao','treat_workers');assert.equal(g.society.minds.tao.herbs,0);assert.deepEqual(g.player,player);assert.ok(g.campaign.flags.relief);
});
test('新散修只在本地可挑战和取袋，旧散修仍按原规则斗法',()=>{
  for(const [id,place]of [['duheng','river'],['chisong','quarry'],['shouque','ruins'],['luohu','woods']]){
    let g=createGame();assert.throws(()=>combatAction(g,{type:'start',enemyId:id}),/所在的区域/);
    g=travel(g,place);g=combatAction(g,{type:'start',enemyId:id}).game;g.exploration.battle.enemyHp=1;
    g=combatAction(g,{type:'turn',move:'attack'},()=>.5).game;g=combatAction(g,{type:'claim',enemyId:id}).game;
    assert.ok(g.exploration.enemies[id].looted);assert.equal(g.exploration.battle,null);
  }
});

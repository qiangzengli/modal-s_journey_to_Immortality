import test from 'node:test';
import assert from 'node:assert/strict';
import { getView, parseLocal, createGame } from './engine.js';
import { throughCampaign, act, travel, openingMove } from './canon-test-helpers.js';
import { combatAction } from './combat.js';
import { travelAccess } from './regions.js';
import { npcActors, ensureNpcState } from './npc-state.js';

test('携药离开禁地后主线指向燕家堡，第一章尚未通关', () => {
  const game = throughCampaign('leave_forbidden');
  const view = getView(game);
  assert.equal(view.campaign.next.type, 'enter_yanbao');
  assert.equal(view.campaign.complete, false);
  assert.equal(travelAccess(game, 'yanbao').available, true);
});

test('燕堡在禁地归来前锁定，逃跑与战败不通关，休整后仍可重试', () => {
  let game=throughCampaign('enter_forbidden');
  assert.equal(travelAccess(game,'yanbao').available,false);
  assert.throws(()=>travel(game,'yanbao'),/离开血色禁地/);
  game=travel(throughCampaign('leave_forbidden'),'yanbao');
  game=act(act(game,'enter_yanbao'),'investigate_yanbao');
  game=act(game,'fight_wangchan');
  game=combatAction(game,{type:'turn',move:'escape'},()=>0).game;
  assert.equal(game.exploration.battle.status,'escaped');
  game=combatAction(game,{type:'leave'}).game;
  while(game.player.hp<100)game=act(game,'frontier_rest');
  game=act(game,'fight_wangchan');game.player.hp=1;
  game=combatAction(game,{type:'turn',move:'attack'},()=>.5).game;
  assert.equal(game.exploration.battle.status,'lost');assert.equal(getView(game).campaign.complete,false);
  game=combatAction(game,{type:'leave'}).game;game=act(game,'frontier_rest');game=act(game,'fight_wangchan');
  assert.equal(game.exploration.battle.enemyHp,174);assert.equal(game.campaign.storyFlags.fight_wangchan,undefined);
});

test('已筑基旧档保留资源和历史，接续燕堡但不伪造通关或补奖', () => {
  const old=createGame();old.flags.playerBreakthrough=old.nextId++;old.campaign.storyFlags.take_master=old.nextId++;
  const before=structuredClone(old);ensureNpcState(old);
  for(const key of ['player','exploration','events','flags','turn'])assert.deepEqual(old[key],before[key]);
  const view=getView(old);assert.equal(view.campaign.next.type,'enter_yanbao');assert.equal(view.campaign.complete,false);assert.equal(view.campaign.cultivationComplete,true);
  assert.equal(old.exploration.inventory.yanbao_token,undefined);
  const migrated=structuredClone(old);ensureNpcState(old);getView(old);assert.deepEqual(old,migrated);
});

test('燕堡王蝉为鬼灵门 BOSS，实际取胜并结算后才通关，不能重复领奖', () => {
  let game = travel(throughCampaign('leave_forbidden'), 'yanbao');
  while(game.player.hp<100)game=act(game,'frontier_rest');
  assert.throws(()=>act(game,'fight_wangchan'),/先完成/);
  game=act(game,'enter_yanbao');game=act(game,'investigate_yanbao');
  const boss=getView(game).roamers.find(p=>p.id==='wen');
  assert.equal(boss.name,'王蝉');assert.equal(boss.boss,true);assert.equal(boss.affiliation.name,'鬼灵门');
  assert.equal(getView(game).people.some(p=>p.id==='wen'),false,'同一位王蝉不能同时出现两次');
  assert.deepEqual(npcActors(game).filter(p=>p.id==='wen').map(p=>p.place),['yanbao']);
  const wallet=game.people.wen.stones;
  game=act(game,'fight_wangchan');assert.equal(game.exploration.battle.status,'active');
  assert.throws(()=>travel(game,'river'),/斗法/);
  for(let i=0;i<50&&game.exploration.battle.status==='active';i++)game=combatAction(game,openingMove(getView(game)),()=>.5).game;
  assert.equal(game.exploration.battle.status,'won','常规修为和现有功法可赢下终战');
  assert.equal(getView(game).campaign.complete,false,'仍须确认战后结算');
  const result=combatAction(game,{type:'claim',enemyId:'wen'});game=result.game;
  assert.match(result.result,/第一章试炼完成/);assert.equal(getView(game).campaign.complete,true);
  assert.equal(game.exploration.inventory.yanbao_token,1);assert.equal(game.people.wen.stones,wallet);
  const before=structuredClone(game);assert.throws(()=>combatAction(game,{type:'claim',enemyId:'wen'}),/取空|已经/);assert.deepEqual(game,before);
  assert.deepEqual(parseLocal('前往燕家堡'),{type:'travel_region',place:'yanbao'});
});

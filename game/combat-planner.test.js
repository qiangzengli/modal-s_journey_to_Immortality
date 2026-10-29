import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createGame} from './engine.js';
import {combatAction} from './combat.js';
import {throughCampaign,act} from './canon-test-helpers.js';
import {createCombatPlanner} from './combat-planner.js';
import {requestCombatPlan,selectCombatTactic} from './npc-combat-agent.js';
const tactic=(intent,speech='对方凝气变招。')=>({intent,speech});
const plan=()=>({normal:tactic('guard'),wounded:tactic('heal'),opportunity:tactic('heavy'),exhausted:tactic('attack')});
const start=()=>{const game=createGame();game.player.place='woods';return combatAction(game,{type:'start',enemyId:'luohu'}).game;};
const next=(g,planner)=>{const result=combatAction(g,{type:'turn',move:'guard'},()=>.5).game;planner.prepare(result,g);planner.sync(result);return result;};

test('同一队伍回合中切换出招者不改变已展示的敌方预告',async()=>{
 const planner=createCombatPlanner({complete:async()=>({content:JSON.stringify(plan())})});
 let game=act(throughCampaign('meet_nangong'),'fight_mojiao');planner.prepare(game,null);planner.sync(game);await setImmediate();
 const original=structuredClone(game.exploration.battle);
 const afterPlayer=combatAction(game,{type:'turn',actorId:'player',move:'attack'},()=>.5).game;
 planner.prepare(afterPlayer,game);assert.equal(afterPlayer.exploration.battle.agentIntent,original.agentIntent);assert.equal(afterPlayer.exploration.battle.intentSource,original.intentSource);
 const hp=afterPlayer.player.hp;
 const afterAlly=combatAction(afterPlayer,{type:'turn',actorId:'ji',move:'attack'},()=>.5).game;
 assert.equal(afterAlly.player.hp,hp-16);planner.prepare(afterAlly,afterPlayer);assert.equal(afterAlly.exploration.battle.agentIntent,'guard');planner.stop();
});

test('模型悬挂时连续回合不等待、不加请求；已展示预告固定，后台结果只用于后续',async()=>{
 let release,calls=0;
 const planner=createCombatPlanner({complete:async()=>{calls++;return new Promise(resolve=>{release=()=>resolve({content:JSON.stringify(plan())});});}});
 let game=start();planner.prepare(game,null);planner.sync(game);const original=structuredClone(game);
 assert.equal(calls,1);assert.equal(game.exploration.battle.intentSource,'preparing');
 game=next(game,planner);game=next(game,planner);assert.equal(calls,1);
 const waiting=structuredClone(game);release();await setImmediate();
 assert.deepEqual(game,waiting);assert.equal(original.exploration.battle.agentIntent,'attack');
 const hp=game.player.hp;game=next(game,planner);
 assert.ok(game.player.hp<hp,'the already advertised attack must still execute');
 assert.equal(game.exploration.battle.agentIntent,'guard');assert.equal(game.exploration.battle.intentSource,'model');
 const guardedHp=game.player.hp;game=next(game,planner);assert.equal(game.player.hp,guardedHp);
 planner.stop();
});

test('条件策略使用实时状态，过期计划不再冒充AI战术',async()=>{
 let calls=0;
 const planner=createCombatPlanner({complete:async()=>{calls++;return calls===1?{content:JSON.stringify(plan())}:new Promise(()=>{});}});
 let game=start();planner.prepare(game,null);planner.sync(game);await setImmediate();
 const ready=plan(),enemyHp=game.exploration.battle.enemyHp;
 assert.equal(selectCombatTactic(game,ready).intent,'guard');
 game.player.hp=29;assert.equal(selectCombatTactic(game,ready).intent,'heavy');
 game.player.hp=80;game.exploration.battle.mana=7;assert.equal(selectCombatTactic(game,ready).intent,'attack');
 game.exploration.battle.enemyHp=enemyHp*.3;assert.equal(selectCombatTactic(game,ready).intent,'heal');
 game.exploration.battle.enemyHp=enemyHp;game.exploration.battle.mana=30;
 for(let i=0;i<7;i++)game=next(game,planner);
 assert.equal(game.exploration.battle.intentSource,'preparing');assert.equal(game.exploration.battle.agentIntent,'attack');
 assert.equal(calls,2);planner.stop();
});

test('取消后的迟到模型不能串入同敌重战；失败退避且不写档',async()=>{
 const callbacks=[],signals=[];let now=0;
 const planner=createCombatPlanner({now:()=>now,complete:async(_messages,options)=>{signals.push(options.signal);return new Promise(resolve=>callbacks.push(resolve));}});
 const old=start();planner.sync(old);planner.sync({...old,exploration:{...old.exploration,battle:null}});
 assert.equal(signals[0].aborted,true);
 const retry=start();planner.prepare(retry,null);planner.sync(retry);callbacks[0]({content:JSON.stringify(plan())});await setImmediate();
 const untouched=structuredClone(retry);const result=next(retry,planner);assert.equal(result.exploration.battle.intentSource,'preparing');assert.deepEqual(retry,untouched);
 callbacks[1]({content:'{"damage":9999}'});await setImmediate();
 planner.prepare(result,retry);assert.equal(result.exploration.battle.intentSource,'unavailable');planner.sync(result);assert.equal(callbacks.length,2);
 now=10001;planner.sync(result);assert.equal(callbacks.length,3);planner.stop();
});

test('超时会取消请求，旧存档读入只预热缓存不更改既有招式',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let signal;
 const planner=createCombatPlanner({complete:async(_m,o)=>{signal=o.signal;return new Promise(()=>{});},timeoutMs:80});
 const game=start();game.exploration.battle.agentIntent='heavy';game.exploration.battle.intentSource='model';
 const before=structuredClone(game);planner.sync(game);t.mock.timers.tick(81);await setImmediate();
 assert.equal(signal.aborted,true);assert.deepEqual(game,before);
 const result=next(game,planner);assert.equal(result.exploration.battle.intentSource,'unavailable');planner.stop();
});

test('策略协议拒绝越权字段和不合条件的治疗，模型不接触存档',async()=>{
 const game=start(),before=structuredClone(game);
 for(const invalid of [{...plan(),damage:999}, {...plan(),normal:tactic('heal')}, {...plan(),wounded:{...tactic('heal'),hp:100}}, {...plan(),normal:tactic('grant')}]){
  await assert.rejects(requestCombatPlan(game,async()=>({content:JSON.stringify(invalid)})),/invalid_tactic/);
 }
 const result=await requestCombatPlan(game,async()=>({content:JSON.stringify(plan())}));assert.deepEqual(result,plan());assert.deepEqual(game,before);
});


test('模型生成期间快速推进多轮，返回的条件策略按当前局势使用，不按请求年龄丢弃',async()=>{
 let release;const planner=createCombatPlanner({complete:()=>new Promise(resolve=>{release=()=>resolve({content:JSON.stringify(plan())});})});
 let game=start();game.player.hp=100;planner.prepare(game,null);planner.sync(game);
 for(let i=0;i<9;i++)game=next(game,planner);
 assert.equal(game.exploration.battle.round,10);assert.equal(game.exploration.battle.intentSource,'preparing');
 const before=structuredClone(game);release();await setImmediate();assert.deepEqual(game,before);
 game=next(game,planner);assert.equal(game.exploration.battle.intentSource,'model');assert.equal(game.exploration.battle.tacticPlanRound,1);
 assert.equal(game.exploration.battle.agentIntent,selectCombatTactic(game,plan()).intent);planner.stop();
});

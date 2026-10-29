import test from 'node:test';
import assert from 'node:assert/strict';
import {act,throughOpening,throughCampaign} from './canon-test-helpers.js';
import {getView} from './engine.js';
import {combatAction} from './combat.js';
import {chooseAutoMove} from './auto-combat.js';
import {selectCombatTactic,requestCombatPlan} from './npc-combat-agent.js';
import {getEnemyRecovery} from './enemy-recovery.js';

const tactic=intent=>({intent,speech:`对方准备${intent}。`});
const stallingPlan={normal:tactic('guard'),wounded:tactic('heal'),opportunity:tactic('guard'),exhausted:tactic('guard')};
const start=()=>act(throughOpening('investigate_mo'),'confront_mo');
const turn=(game,move='guard',extra={})=>combatAction(game,{type:'turn',move,...extra},()=>.5).game;

test('墨大夫反复护体和残血疗伤时，初始铁剑与长春功自动战斗可以获胜且不花消耗品',()=>{
  let game=start();game.player.hp=84;
  const inventory=structuredClone(game.exploration.inventory),heals=[];
  for(let i=0;i<60&&game.exploration.battle.status==='active';i++){
    game.exploration.battle.agentIntent=selectCombatTactic(game,stallingPlan).intent;
    const choice=chooseAutoMove(getView(game));assert.ok(choice);
    const result=combatAction(game,choice.input,()=>.5);game=result.game;
    if(result.result.includes('运功疗伤'))heals.push(game.exploration.battle.round-1);
    game=JSON.parse(JSON.stringify(game)); // Budget survives every save/reload.
  }
  assert.equal(game.exploration.battle.status,'won');assert.ok(game.exploration.battle.round<40);
  assert.ok(heals.length>0&&heals.length<=2);
  if(heals.length===2)assert.ok(heals[1]-heals[0]>=4);
  assert.deepEqual(game.exploration.inventory,inventory);
  assert.equal(game.volume.flags.confront_mo,undefined,'须由玩家收取遗书，修复不能跳过主线结算');
});

test('即使旧计划每次强制要求疗伤，规则层也限制为两次并间隔三个完整回合',()=>{
  let game=start();const rounds=[];
  for(let i=0;i<10;i++){
    const battle=game.exploration.battle;battle.enemyHp=20;battle.agentIntent='heal';
    const view=getView(game),before=structuredClone(game),hp=game.player.hp;
    game=turn(game);
    const healed=game.exploration.battle.enemyHp>20;
    assert.equal(view.battle.intent,healed?'heal':'attack','预告必须与实际结算一致');
    if(healed){rounds.push(battle.round);assert.equal(game.player.hp,hp);}else assert.ok(game.player.hp<hp);
    assert.equal(before.exploration.battle.round,battle.round,'源存档不应被修改');
  }
  assert.deepEqual(rounds,[1,5]);assert.equal(getEnemyRecovery(game.exploration.battle).remaining,0);
  game.exploration.battle.log=[];game=JSON.parse(JSON.stringify(game));
  assert.equal(getEnemyRecovery(game.exploration.battle).remaining,0,'滚动战报被截断不能补充疗伤次数');
});

test('第110回合的旧存档从历史疗伤继承已用次数，读档不写入，直接续战且不重置血量',()=>{
  let game=start(),battle=game.exploration.battle;
  delete battle.enemyRecovery;battle.round=110;battle.enemyHp=31;battle.agentIntent='heal';battle.intentSpeech='继续运功疗伤。';
  battle.log=[{round:104,side:'enemy',text:'墨大夫运功疗伤，恢复 15 气血。'},{round:108,side:'enemy',text:'墨大夫运功疗伤，恢复 15 气血。'}];
  game.player.hp=84;
  const original=structuredClone(game),view=getView(game);
  assert.equal(view.battle.enemyHp,31);assert.equal(view.battle.round,110);
  assert.equal(view.battle.enemyRecovery.remaining,0);assert.equal(view.battle.intent,'attack');
  assert.match(view.battle.intentSpeech,/耗尽/);assert.deepEqual(game,original);
  game=turn(game,'attack');assert.equal(game.exploration.battle.round,111);
  assert.ok(game.exploration.battle.enemyHp<31);assert.equal(game.exploration.battle.enemyRecovery.used,2);
  assert.equal(game.volume.flags.confront_mo,undefined);
});

test('旧存档仅疗伤一次时继承剩余次数和冷却，过期战术不能提前再次疗伤',()=>{
  const game=start(),battle=game.exploration.battle;delete battle.enemyRecovery;
  battle.round=8;battle.enemyHp=20;
  battle.log=[{round:7,side:'enemy',text:'墨大夫运功疗伤，恢复 15 气血。'}];
  assert.equal(getEnemyRecovery(battle).remaining,1);assert.equal(getEnemyRecovery(battle).cooldown,3);
  assert.equal(selectCombatTactic(game,stallingPlan).intent,'attack');
  battle.round=11;assert.equal(selectCombatTactic(game,stallingPlan).intent,'heal');
});

test('定神符打断和击杀都不结算疗伤，双人队伍只在敌人回应时消耗一次',()=>{
  let game=start();game.exploration.battle.enemyHp=20;game.exploration.battle.agentIntent='heal';
  game.exploration.inventory.binding_array=1;
  game=turn(game,'item',{itemId:'binding_array'});assert.equal(getEnemyRecovery(game.exploration.battle).used,0);
  assert.match(game.exploration.battle.log.at(-1).text,/未能出手/);
  game.exploration.battle.enemyHp=1;game.exploration.battle.agentIntent='heal';
  game=turn(game,'attack');assert.equal(game.exploration.battle.status,'won');assert.equal(getEnemyRecovery(game.exploration.battle).used,0);
  game=act(throughCampaign('meet_nangong'),'fight_mojiao');game.exploration.battle.enemyHp=45;game.exploration.battle.agentIntent='heal';
  game=turn(game,'guard',{actorId:'ji'});assert.equal(getEnemyRecovery(game.exploration.battle).used,0);assert.equal(game.exploration.battle.round,1);
  game=turn(game,'guard',{actorId:'player'});assert.equal(game.exploration.battle.enemyHp,60);assert.equal(getEnemyRecovery(game.exploration.battle).used,1);
});

test('模型上下文提供真实疗伤余力，过期的无限疗伤建议被选择器和结算器共同约束',async()=>{
  const game=start(),battle=game.exploration.battle;battle.enemyHp=20;battle.enemyRecovery={used:2,nextRound:1};
  let input;
  const plan=await requestCombatPlan(game,async messages=>{input=JSON.parse(messages[1].content);return {content:JSON.stringify(stallingPlan)};});
  assert.equal(input.enemyRecovery.remaining,0);assert.equal(input.enemyRecovery.available,false);
  assert.equal(selectCombatTactic(game,plan).intent,'attack');
  battle.agentIntent='heal';assert.equal(turn(game).exploration.battle.enemyHp,20);
});

test('旧存档的非法疗伤预告一经纠正，在同一队伍回合中降至残血也不会突然变招',()=>{
  let game=act(throughCampaign('meet_nangong'),'fight_mojiao');
  game.exploration.battle.enemyHp=65;game.exploration.battle.agentIntent='heal';
  assert.equal(getView(game).battle.intent,'attack');
  game=turn(game,'attack',{actorId:'player'});
  assert.ok(game.exploration.battle.enemyHp<=180*.35);
  assert.equal(getView(game).battle.intent,'attack');
  const hp=game.player.hp,enemyHp=game.exploration.battle.enemyHp;
  game=turn(game,'guard',{actorId:'ji'});
  assert.equal(game.exploration.battle.enemyHp,enemyHp);assert.ok(game.player.hp<hp);
});

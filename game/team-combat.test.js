import test from 'node:test';
import assert from 'node:assert/strict';
import {throughCampaign,act} from './canon-test-helpers.js';
import {getView} from './engine.js';
import {combatAction} from './combat.js';

test('韩立与南宫婉各选一次攻击或法术，全队行动后墨蛟才反击',()=>{
 let game=act(throughCampaign('meet_nangong'),'fight_mojiao');
 const before=structuredClone(game),hp=game.player.hp;
 assert.deepEqual(getView(game).battle.team.map(p=>p.id),['player','ji']);
 game=combatAction(game,{type:'turn',actorId:'player',move:'attack'},()=>.5).game;
 assert.equal(game.player.hp,hp);assert.equal(game.exploration.battle.round,1);
 assert.equal(getView(game).battle.actingId,'ji');
 assert.equal(game.exploration.battle.log.filter(e=>e.side==='ally').length,0,'同伴未选择时不能自动扣血');
 assert.throws(()=>combatAction(game,{type:'turn',actorId:'player',move:'attack'}),/已行动/);
 const mana=getView(game).battle.team.find(p=>p.id==='ji').mana,enemyHp=game.exploration.battle.enemyHp;
 game=combatAction(game,{type:'turn',actorId:'ji',move:'skill',skillId:'vermillion_ring'},()=>.5).game;
 assert.ok(game.exploration.battle.enemyHp<enemyHp);assert.equal(game.exploration.battle.round,2);assert.equal(game.player.hp,hp-16);
 assert.equal(getView(game).battle.team.find(p=>p.id==='ji').mana,mana-8);
 assert.match(game.exploration.battle.log.find(e=>e.side==='ally').text,/南宫婉.*朱雀环诀.*伤害/);
 assert.equal(game.exploration.battle.log.filter(e=>/损失/.test(e.text)).length,1);
 assert.deepEqual(before,act(throughCampaign('meet_nangong'),'fight_mojiao'));
});

test('南宫婉有独立气血和防御，墨蛟锁定谁只扣谁的血，主角换装不影响同伴攻击',()=>{
 let game=act(throughCampaign('meet_nangong'),'fight_mojiao');
 const original=getView(game).battle.team.find(p=>p.id==='ji');
 assert.equal(original.hp,96);assert.equal(original.maxHp,96);
 game=combatAction(game,{type:'turn',actorId:'ji',move:'attack'},()=>.5).game;
 game=combatAction(game,{type:'turn',actorId:'player',move:'guard'},()=>.5).game;
 const hp=game.player.hp;assert.equal(getView(game).battle.targetId,'ji');
 game=combatAction(game,{type:'turn',actorId:'ji',move:'attack'},()=>.5).game;
 game=combatAction(game,{type:'turn',actorId:'player',move:'guard'},()=>.5).game;
 assert.equal(game.player.hp,hp,'主角防御不替南宫婉分担伤害');
 assert.equal(getView(game).battle.team.find(p=>p.id==='ji').hp,82);
 assert.equal(game.exploration.battle.log.findLast(e=>e.side==='enemy').targetId,'ji');
 const before=getView(game).battle.team.find(p=>p.id==='ji').power;
 game.exploration.weapon='green_sword';game.flags.playerBreakthrough=game.nextId++;
 assert.equal(getView(game).battle.team.find(p=>p.id==='ji').power,before);
});

test('南宫婉只恢复自身气血，倒下者不能行动，仍存活的队友可继续赢下斗法',()=>{
 let game=act(throughCampaign('meet_nangong'),'fight_mojiao');
 game=combatAction(game,{type:'turn',actorId:'ji',move:'attack'},()=>.5).game;
 game=combatAction(game,{type:'turn',actorId:'player',move:'guard'},()=>.5).game;
 game.exploration.battle.allyStates.ji.hp=52;
 const hp=game.player.hp,mana=game.exploration.battle.mana;
 game=combatAction(game,{type:'turn',actorId:'ji',move:'skill',skillId:'moon_mend'},()=>.5).game;
 assert.equal(game.exploration.battle.allyStates.ji.hp,76);assert.equal(game.player.hp,hp);assert.equal(game.exploration.battle.mana,mana);
 // 韩立倒下后仍然保留南宫婉的行动；她获胜后可照常结算主药。
 game=combatAction(game,{type:'turn',actorId:'player',move:'attack'},()=>.5).game;
 game.player.hp=1;
 game=combatAction(game,{type:'turn',actorId:'ji',move:'attack'},()=>.5).game;
 game=combatAction(game,{type:'turn',actorId:'player',move:'attack'},()=>.5).game;
 assert.equal(game.player.hp,0);assert.equal(game.exploration.battle.status,'active');
 assert.equal(getView(game).battle.actingId,'ji');assert.equal(getView(game).battle.team[0].canAct,false);
 const before=structuredClone(game);assert.throws(()=>combatAction(game,{type:'turn',actorId:'player',move:'attack'}),/倒下/);assert.deepEqual(game,before);
 game.exploration.battle.enemyHp=1;
 game=combatAction(game,{type:'turn',actorId:'ji',move:'attack'},()=>.5).game;
 assert.equal(game.exploration.battle.status,'won');assert.equal(game.player.hp,25);
 game=combatAction(game,{type:'claim',enemyId:'story_mojiao'}).game;
 assert.equal(game.campaign.questHerbs.filter(h=>h==='天灵果').length,1);
});

test('同伴倒下不占行动名额，全队失去战力才败退且只扣一次灵石',()=>{
 let game=act(throughCampaign('meet_nangong'),'fight_mojiao');
 game=combatAction(game,{type:'turn',actorId:'ji',move:'attack'},()=>.5).game;
 game=combatAction(game,{type:'turn',actorId:'player',move:'guard'},()=>.5).game;
 game.exploration.battle.allyStates.ji.hp=1;
 game=combatAction(game,{type:'turn',actorId:'ji',move:'attack'},()=>.5).game;
 game=combatAction(game,{type:'turn',actorId:'player',move:'attack'},()=>.5).game;
 assert.equal(game.exploration.battle.allyStates.ji.hp,0);assert.equal(game.exploration.battle.status,'active');
 assert.throws(()=>combatAction(game,{type:'turn',actorId:'ji',move:'attack'}),/倒下/);
 game.player.hp=1;const stones=game.player.stones;
 game=combatAction(game,{type:'turn',actorId:'player',move:'attack'},()=>.5).game;
 assert.equal(game.exploration.battle.status,'lost');assert.equal(game.player.hp,25);assert.equal(game.player.stones,stones-Math.ceil(stones*.1));
 assert.throws(()=>combatAction(game,{type:'turn',actorId:'ji',move:'attack'}),/没有可继续/);
});

test('同伴可先手，独立真气与冷却跨存档保留，非法或重复行动不改变原档',()=>{
 let game=act(throughCampaign('meet_nangong'),'fight_mojiao');
 const check=(input,reason)=>{const copy=structuredClone(game);assert.throws(()=>combatAction(game,{type:'turn',...input},()=>.5),reason);assert.deepEqual(game,copy);};
 check({actorId:'wen',move:'attack'},/队伍/);
 check({actorId:'ji',move:'skill',skillId:'qi_bolt'},/未学会/);
 check({actorId:'ji',move:'item',itemId:'healing_pill'},/同伴可选择/);
 const mana=game.exploration.battle.mana;
 game=combatAction(game,{type:'turn',actorId:'ji',move:'skill',skillId:'scarlet_flame'},()=>.5).game;
 assert.equal(game.exploration.battle.mana,mana);assert.equal(game.exploration.battle.round,1);
 game=JSON.parse(JSON.stringify(game));const copy=structuredClone(game),view=getView(game);
 assert.equal(view.battle.actingId,'player');assert.equal(view.battle.team[1].mana,20);assert.equal(view.battle.team[1].skills.find(s=>s.id==='scarlet_flame').remaining,2);assert.deepEqual(game,copy);
 check({actorId:'ji',move:'attack'},/已行动/);
 game=combatAction(game,{type:'turn',actorId:'player',move:'guard'},()=>.5).game;
 assert.equal(game.exploration.battle.round,2);check({actorId:'ji',move:'skill',skillId:'scarlet_flame'},/冷却/);
 const hp=game.player.hp;
 game=combatAction(game,{type:'turn',actorId:'ji',move:'attack'},()=>.5).game;
 game=combatAction(game,{type:'turn',actorId:'player',move:'item',itemId:'binding_array'},()=>.5).game;
 assert.equal(game.player.hp,hp,'控制效果保持到全队行动后的反击阶段');
 game.exploration.battle.allyStates.ji.mana=0;
 check({actorId:'ji',move:'skill',skillId:'vermillion_ring'},/真气不足/);
});

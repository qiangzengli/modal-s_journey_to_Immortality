import test from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './ui-test-dom.js';
import {act,throughOpening} from './canon-test-helpers.js';
import {getView} from './engine.js';
import {combatAction} from './combat.js';
import {createCombatUI} from './combat-ui.js';

test('敌方疗伤次数、冷却和旧档非法预告在界面上与规则一致',t=>{
  const {$}=installDOM(t),ui=createCombatUI({navigate:()=>{},openInventory:()=>{},request:async()=>{}});
  let game=act(throughOpening('investigate_mo'),'confront_mo');
  game.exploration.battle.enemyHp=20;game.exploration.battle.agentIntent='heal';
  ui.render(getView(game));assert.match($('#battle-intent').textContent,/即将恢复至多 15 气血.*疗伤余力 2\/2 次/);
  game=combatAction(game,{type:'turn',move:'guard'},()=>.5).game;
  ui.render(getView(game));assert.match($('#battle-intent').textContent,/疗伤余力 1\/2 次.*疗伤冷却 3 回合/);
  assert.doesNotMatch($('#battle-intent').textContent,/即将恢复/);
  game.exploration.battle.enemyRecovery.used=2;game.exploration.battle.intentSpeech='准备疗伤';
  ui.render(getView(game));assert.match($('#battle-intent').textContent,/疗伤余力已耗尽.*疗伤余力 0\/2 次/);
  assert.doesNotMatch($('#battle-intent').textContent,/准备疗伤|即将恢复/);
});

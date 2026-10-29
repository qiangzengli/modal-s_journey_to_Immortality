import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {installDOM} from './ui-test-dom.js';
import {createAutoCombatUI} from './auto-combat-ui.js';
import {createGame,getView} from './engine.js';
import {combatAction} from './combat.js';
import {DEFAULT_AUTO_PLAN} from './auto-combat.js';

test('自动战斗不等待模型，单次提交可停止，错误/离场/隐藏页停止且迟到回复不重启',async t=>{
  const {$,document}=installDOM(t);t.mock.timers.enable({apis:['setTimeout']});
  let game=createGame();game.player.place='woods';game=combatAction(game,{type:'start',enemyId:'luohu'}).game;
  let view=getView(game),pending=false,resolveAction,resolvePlan,calls=0;
  const ui=createAutoCombatUI({stage:$('#combat-stage'),getState:()=>view,isPending:()=>pending,
    requestPlan:()=>new Promise(resolve=>resolvePlan=()=>resolve({ok:true,json:async()=>({source:'model',plan:DEFAULT_AUTO_PLAN})})),
    perform:async input=>{calls++;pending=true;await new Promise(resolve=>resolveAction=resolve);pending=false;game=combatAction(game,input,()=>.5).game;view=getView(game);ui.sync();return {view};}});
  t.after(()=>ui.dispose());ui.sync();$('#auto-combat-toggle').click();
  t.mock.timers.tick(800);await setImmediate();assert.equal(calls,1,'AI未返回仍执行行动');
  t.mock.timers.tick(4000);await setImmediate();assert.equal(calls,1,'上一招未结束不连发');
  $('#auto-combat-toggle').click();assert.equal(ui.isRunning(),false);
  resolvePlan();resolveAction();await setImmediate();t.mock.timers.tick(5000);await setImmediate();assert.equal(calls,1);
  $('#auto-combat-toggle').click();Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));assert.equal(ui.isRunning(),false);
  Object.defineProperty(document,'hidden',{configurable:true,value:false});$('#auto-combat-toggle').click();
  $('[aria-label="收起或展开战斗面板"]').click();assert.equal($('.battle-console').classList.contains('is-collapsed'),true);
  view={...view,battle:{...view.battle,status:'won'}};ui.sync();assert.equal(ui.isRunning(),false);assert.equal($('.battle-console').classList.contains('is-collapsed'),false,'胜利自动展开，战利品确认必须可见');
  view={...view,battle:null};ui.sync();assert.equal(ui.isRunning(),false);
});

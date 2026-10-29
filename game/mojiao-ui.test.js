import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setImmediate} from 'node:timers/promises';
import {parseHTML} from 'linkedom';
import {createCombatUI,roamerActions} from './combat-ui.js';
import {createPlanUI} from './plan-ui.js';
import {throughCampaign,act,openingMove} from './canon-test-helpers.js';
import {getView} from './engine.js';
import {combatAction} from './combat.js';
import {previewPlan} from './route-planner.js';

test('真实页面 DOM 展示墨蛟、协战与天灵果结算，点击收果不会跳到普通行囊',async()=>{
 const {document,window}=parseHTML(await readFile(new URL('../index.html',import.meta.url),'utf8'));
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');globalThis.document=document;
 let g=act(throughCampaign('meet_nangong'),'fight_mojiao'),ui,opened=0,calls=[];
 try{
  ui=createCombatUI({navigate:()=>{},openInventory:()=>opened++,request:async(path,input)=>{calls.push({path,input});g=combatAction(g,input,()=>.5).game;const view=getView(g);ui.render(view);return {view};}});
  ui.render(getView(g));assert.equal(document.querySelector('#combat-stage').hidden,false);assert.equal(document.querySelector('#battle-enemy').textContent,'墨蛟');assert.match(document.querySelector('#battle-intent').textContent,/南宫婉协战/);assert.match(document.querySelector('#battle-enemy-realm').textContent,/妖兽/);
  const active=getView(g).roamers.find(e=>e.id==='story_mojiao');assert.match(roamerActions(active,84),/天灵果/);assert.doesNotMatch(roamerActions(active,84),/储物袋/);
  for(let i=0;g.exploration.battle.status==='active'&&i<50;i++)g=combatAction(g,openingMove(getView(g)),()=>.5).game;
  assert.equal(g.exploration.battle.status,'won');ui.render(getView(g));assert.equal(document.querySelector('#combat-controls').hidden,true);assert.match(document.querySelector('#combat-result').textContent,/收取天灵果/);assert.doesNotMatch(document.querySelector('#combat-result').textContent,/储物袋/);
  document.querySelector('[data-battle-result="claim"]').dispatchEvent(new window.Event('click',{bubbles:true}));await setImmediate();
  assert.equal(calls.length,1);assert.equal(calls[0].path,'/api/combat');assert.equal(g.campaign.questHerbs.filter(h=>h==='天灵果').length,1);assert.equal(opened,0);assert.equal(document.querySelector('#combat-stage').hidden,true);
 }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}
});

test('规划界面明确显示战前资源和获胜条件，不声称点击后必得丹药',async t=>{
 const {document}=parseHTML(await readFile(new URL('../index.html',import.meta.url),'utf8'));
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');globalThis.document=document;
 const g=throughCampaign('meet_nangong'),view=getView(g),plan=previewPlan(g,{title:'击蛟取药',rationale:'取得主药后回宗换丹。',risk:'可能负伤或战败。',actions:[{type:'fight_mojiao'},{type:'leave_forbidden'},{type:'deliver_spirit_herbs'}]});
 t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({source:'model',revision:view.revision,plans:[plan],followUps:[],text:'先赢下石殿斗法。'})}));
 t.mock.timers.enable({apis:['setTimeout']});const actions=[];
 const ui=createPlanUI({getState:()=>({view,busy:false}),executeAction:async a=>actions.push(a),advance:()=>{},onStale:()=>{},notice:()=>{}});
 try{
  ui.changed();t.mock.timers.tick(600);await setImmediate();
  assert.match(document.querySelector('#quest-progress').textContent,/斗法/);assert.doesNotMatch(document.querySelector('#quest-progress').textContent,/步可取丹/);
  assert.match(document.querySelector('#plan-forecast').textContent,/战前预计资源/);assert.match(document.querySelector('#plan-forecast').textContent,/战后重新规划/);assert.doesNotMatch(document.querySelector('#plan-forecast').textContent,/预计取丹后/);
  await ui.run();assert.deepEqual(actions,[{type:'fight_mojiao'}]);
 }finally{ui.reset();if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { installDOM } from './ui-test-dom.js';
import { getView } from './engine.js';
import { combatAction } from './combat.js';
import { createCombatUI } from './combat-ui.js';
import { campaignMarkup } from './campaign-ui.js';
import { throughCampaign, act, travel, openingMove } from './canon-test-helpers.js';

test('终战界面标出 BOSS 与血灵护罩，战后确认通关且不跳普通行囊', async t => {
  const {$}=installDOM(t);
  let game=travel(throughCampaign('leave_forbidden'),'yanbao');
  while(game.player.hp<100)game=act(game,'frontier_rest');
  game=act(act(act(game,'enter_yanbao'),'investigate_yanbao'),'fight_wangchan');
  let inventories=0;
  const ui=createCombatUI({navigate:()=>{},openInventory:()=>inventories++,request:async(path,input)=>{game=combatAction(game,input,()=>.5).game;ui.render(getView(game));return {view:getView(game)};}});
  ui.render(getView(game));assert.match($('#battle-enemy-realm').textContent,/BOSS.*鬼灵门/);assert.match($('#battle-intent').textContent,/血灵护罩/);
  for(let i=0;i<50&&game.exploration.battle.status==='active';i++)game=combatAction(game,openingMove(getView(game)),()=>.5).game;
  ui.render(getView(game));assert.match($('#combat-result').textContent,/王蝉败退/);
  const confirm=$('[data-battle-result="claim"]');assert.match(confirm.textContent,/完成第一章试炼/);confirm.click();await setImmediate();
  assert.equal(getView(game).campaign.complete,true);assert.equal(inventories,0);
  assert.match(campaignMarkup(getView(game)),/第一章试炼完成 · 燕堡脱身/);
  assert.match(campaignMarkup(getView(game)),/后续修行/);
});

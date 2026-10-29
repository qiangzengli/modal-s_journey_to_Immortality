import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {setImmediate} from 'node:timers/promises';
import {installDOM} from './ui-test-dom.js';
import {createOpeningGame,getView,applyAction,advanceTurn} from './engine.js';
import {throughCampaign} from './canon-test-helpers.js';
import {SITES} from './content.js';

test('应用装配：读档、任务追踪、到点行动、人物页签与状态反馈连接完整',async t=>{
 const {$,window,dialogMethods}=installDOM(t);
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 let game=createOpeningGame(),view,callbacks;
 const actions=[],waits=[];
 t.mock.method(globalThis,'fetch',async(path,options)=>{
   if(path==='./api/state')return {ok:true,json:async()=>({view:getView(game),modelName:'deepseek-v4-flash'})};
   if(path==='./api/action'){
     const input=JSON.parse(options.body);actions.push(input);game=applyAction(game,input).game;game.revision=(game.revision||0)+1;
     return {ok:true,json:async()=>({view:getView(game),modelName:'deepseek-v4-flash',result:'经历已保存',actionType:input.type})};
   }
   if(path==='./api/advance'){
     waits.push(path);game=advanceTurn(game).game;game.revision=(game.revision||0)+1;
     return {ok:true,json:async()=>({view:getView(game),modelName:null,result:'静修一旬'})};
   }
   throw new Error('Unexpected request '+path);
 });
 const fakeWorld={sync:v=>view=v,clearSelection:()=>callbacks.onClearPerson(),cancel:()=>{},setBusy:()=>{},stopMovement:()=>{},react:()=>{},speak:()=>{},reset:()=>{},rotate:()=>{},zoomBy:()=>{},recenter:()=>{},
   async goTo(target){
     if(typeof target==='object'){return callbacks.onTravel(target.place);}
     const person=view.people.find(p=>p.id===target),site=SITES[target],place=person?.place||site?.place;
     if(place!==view.player.place&&!await callbacks.onTravel(place))return false;
     if(person)callbacks.onSelectPerson(target);else callbacks.onSelectSite(target);return true;
   }
 };
 globalThis.__testCreateWorld=(_container,options)=>{callbacks=options;return fakeWorld;};
 const temp=new URL(`./.app-ui-${process.pid}.js`,import.meta.url);
 t.after(async()=>{delete globalThis.__testCreateWorld;await unlink(temp);});
 const source=(await readFile(new URL('./app.js',import.meta.url),'utf8')).replace("import { createWorld } from './world.js';","const createWorld=globalThis.__testCreateWorld;");
 await writeFile(temp,source);await import(temp.href);dialogMethods();
 assert.equal(document.body.dataset.connection,'ready',$('#connection-copy').textContent);
 assert.match($('#campaign-track').textContent,/参加七玄门考核/);
 $('[data-open-panel="campaign"]').click();await setImmediate();assert.equal(document.body.dataset.surface,'journal');
 $('[data-campaign-action="qixuan_exam"]').click();await setImmediate();
 assert.equal(game.volume.flags.qixuan_exam>0,true);assert.equal(document.body.classList.contains('busy'),false);assert.match($('#interaction-result-copy').textContent,/经历已保存/);
 $('[data-open-panel="campaign"]').click();await setImmediate();
 // A tracking click crosses into 神手谷, selects 墨大夫, then applies the requested action.
 Object.defineProperty(window.HTMLSelectElement.prototype,'options',{configurable:true,get(){return this.querySelectorAll('option');}});
 $('[data-campaign-action="apprentice_mo"]').click();await setImmediate();
 assert.equal(game.player.place,'shenshou');assert.ok(game.volume.flags.apprentice_mo);assert.equal($('#world-name').textContent,'墨大夫');
 assert.ok(actions.every(a=>Number.isInteger(a.expectedRevision)));
 $('[data-person-pane="actions"]').click();assert.equal($('#world-person').dataset.pane,'actions');
 $('#person-close').click();await setImmediate();assert.equal(document.body.dataset.surface,'none');
 // A saved herb bed can grow, be harvested and crafted using the actual UI without an NPC/model step.
 game=throughCampaign('plant_pill_herbs');
 $('#connection-retry').click();await setImmediate();
 assert.match($('#quest-facts').textContent,/主药生长 0\/4/);
 assert.doesNotMatch($('#quest-facts').textContent,/丹价|280/);
 for(let i=0;i<2;i++){
   $('[data-open-panel="campaign"]').click();await setImmediate();
   $('[data-campaign-target="advance"]').click();await setImmediate();
 }
 assert.equal(waits.length,2);assert.equal(game.campaign.alchemy.growth,4);
 $('[data-open-panel="campaign"]').click();await setImmediate();
 $('[data-campaign-action="harvest_pill_herbs"]').click();await setImmediate();
 assert.equal(game.campaign.alchemy.harvested,true);
 $('[data-open-panel="campaign"]').click();await setImmediate();
 $('[data-campaign-action="refine_foundation_pill"]').click();await setImmediate();
 assert.equal(game.campaign.alternatePill,true);assert.equal(game.campaign.alchemy.crafted,1);
});

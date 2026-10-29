import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {setImmediate} from 'node:timers/promises';
import {installDOM} from './ui-test-dom.js';
import {combatAction} from './combat.js';
import {createGame,createOpeningGame,getView,applyAction,advanceTurn} from './engine.js';
import {throughCampaign,act,travel,openingMove} from './canon-test-helpers.js';
import {SITES} from './content.js';

test('应用装配：读档、任务追踪、到点行动、人物页签与状态反馈连接完整',async t=>{
 const {$,window,dialogMethods}=installDOM(t);
 t.mock.timers.enable({apis:['setTimeout','setInterval']});
 let game=createOpeningGame(),view,callbacks,finishAnimation,combatCalls=0,speechCalls=0,pendingAction=null,lastActionResult;
 const actions=[],waits=[];
 t.mock.method(globalThis,'fetch',async(path,options)=>{
   if(path==='./api/state')return {ok:true,json:async()=>({view:getView(game),modelName:'gpt-5.6-sol'})};
   if(path==='./api/action'){
     const input=JSON.parse(options.body);actions.push(input);
     if(input.type==='read_stone_gate'&&pendingAction){
       await new Promise(resolve=>pendingAction.release=resolve);
       if(pendingAction.fail){lastActionResult='行动未能保存，请稍后重试。';return {ok:false,json:async()=>({error:lastActionResult})};}
     }
     const outcome=applyAction(game,input);game=outcome.game;game.revision=(game.revision||0)+1;
     lastActionResult=input.type==='read_stone_gate'?outcome.result:'经历已保存';
     return {ok:true,json:async()=>({view:getView(game),modelName:'gpt-5.6-sol',result:lastActionResult,actionType:input.type})};
   }
   if(path==='./api/combat'){
     combatCalls++;game=combatAction(game,JSON.parse(options.body),()=>.5).game;game.revision++;
     return {ok:true,json:async()=>({view:getView(game),modelName:null,result:'本回合已保存',actionType:'turn'})};
   }
   if(path==='./api/advance'){
     waits.push(path);game=advanceTurn(game).game;game.revision=(game.revision||0)+1;
     return {ok:true,json:async()=>({view:getView(game),modelName:null,result:'静修一旬'})};
   }
   throw new Error('Unexpected request '+path);
 });
 const fakeWorld={combatReact:()=>new Promise(resolve=>{finishAnimation=resolve;}),sync:v=>view=v,clearSelection:()=>callbacks.onClearPerson(),cancel:()=>{},setBusy:()=>{},stopMovement:()=>{},react:()=>{},speak:()=>speechCalls++,reset:()=>{},rotate:()=>{},zoomBy:()=>{},recenter:()=>{},
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
 // The same result belongs to one visible surface, including closing/changing tabs while awaiting it.
 for(const surface of ['panel','map','about','error']){
   game=throughCampaign('gather_jade_mushroom');pendingAction={fail:surface==='error'};
   $('#connection-retry').click();await setImmediate();
   $('[data-open-panel="campaign"]').click();await setImmediate();
   $('[data-campaign-action="read_stone_gate"]').click();await setImmediate();
   $('[data-story-choice="marks"]').click();$('#story-scene-confirm').click();await setImmediate();
   assert.equal(typeof pendingAction.release,'function');
   $('[data-person-pane="actions"]').click();
   if(surface==='map')$('#person-close').click();
   if(surface==='about')$('[data-person-pane="about"]').click();
   pendingAction.release();await setImmediate();
   const copies=[...document.querySelectorAll('#notice-stack p')].filter(p=>p.textContent===lastActionResult);
   const inPanel=surface==='panel'||surface==='error';
   assert.equal(copies.length,inPanel?0:1,`${surface}: 结果只能在面板或顶部显示一次`);
   if(inPanel){assert.equal($('#interaction-result').hidden,false);assert.equal($('#interaction-result-copy').textContent,lastActionResult);}
   assert.equal(speechCalls,0,'行动结果不能再生成头顶气泡');
   if(surface==='error')assert.equal(game.campaign.storyFlags.read_stone_gate,undefined);
   for(const close of document.querySelectorAll('#notice-stack button'))close.click();
   $('#person-close').click();await setImmediate();pendingAction=null;
 }
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
 $('[data-campaign-action="prepare_alchemy"]').click();await setImmediate();
 assert.equal($('#story-scene').open,true);
 assert.equal(game.campaign.storyFlags.prepare_alchemy,undefined);
 $('[data-story-choice="furnace"]').click();$('#story-scene-confirm').click();await setImmediate();
 assert.ok(game.campaign.storyFlags.prepare_alchemy);
 assert.equal(actions.at(-1).approach,'furnace');
 $('[data-open-panel="campaign"]').click();await setImmediate();
 $('[data-campaign-action="refine_foundation_pill"]').click();await setImmediate();
 assert.equal(game.campaign.alternatePill,true);assert.equal(game.campaign.alchemy.crafted,1);
 game=createGame();game.player.place='woods';game.player.hp=90;game=combatAction(game,{type:'start',enemyId:'luohu'}).game;
 $('#connection-retry').click();await setImmediate();
 const beforeHp=game.player.hp;
 $('[data-combat-move="guard"]').click();await setImmediate();
 assert.equal(combatCalls,1);assert.ok(game.player.hp<beforeHp);
 assert.equal($('#battle-player-hp').textContent,`${game.player.hp} / 100`,'stats update before animation resolves');
 assert.equal($('#combat-inputs').disabled,true);
 t.mock.timers.tick(600);assert.equal($('#operation-status').hidden,true);
 $('[data-combat-move="guard"]').click();await setImmediate();assert.equal(combatCalls,1);
 finishAnimation();await setImmediate();assert.equal($('#combat-inputs').disabled,false);assert.equal(document.body.classList.contains('busy'),false);
 // A genuine finale win is settled through the app and opens the chapter ending once.
 game=travel(throughCampaign('leave_forbidden'),'yanbao');
 while(game.player.hp<100)game=act(game,'frontier_rest');
 game=act(act(act(game,'enter_yanbao'),'investigate_yanbao'),'fight_wangchan');
 for(let i=0;i<50&&game.exploration.battle.status==='active';i++)game=combatAction(game,openingMove(getView(game)),()=>.5).game;
 assert.equal(game.exploration.battle.status,'won');
 $('#connection-retry').click();await setImmediate();
 assert.equal($('#ending').open,false);
 $('[data-battle-result="claim"]').click();await setImmediate();
 assert.equal(game.campaign.storyFlags.fight_wangchan>0,true);
 assert.equal($('#ending').open,true);assert.match($('#ending .eyebrow').textContent,/第一章.*试炼完成/);
 assert.match($('#ending-stats').textContent,/王蝉/);assert.match($('#world-hint').textContent,/回百药园/);
 $('#ending-close').click();$('#connection-retry').click();await setImmediate();
 assert.equal($('#ending').open,false,'读已通关存档不重复弹出结算');
});

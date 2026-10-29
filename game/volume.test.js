import {winOpeningFight} from './canon-test-helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame,createOpeningGame,applyAction,getView,advanceTurn,parseLocal } from './engine.js';
import { VOLUME_ACTIONS,VOLUME_PEOPLE,VOLUME_SITES,VOLUME_REGIONS } from './volume-data.js';
import { ensureNpcState } from './npc-state.js';
import { societyContext } from './npc-agent.js';
import { agentContext } from './story-agent.js';
import { inventoryAction } from './combat.js';
import { createVolumeWorld,volumeWalkable,VOLUME_BLOCKERS } from './volume-world.js';
import { travelAccess } from './regions.js';
import * as THREE from 'three';
const act=(g,type)=>applyAction(g,{type}).game;
const travel=(g,place)=>g.player.place===place?g:applyAction(g,{type:'travel_region',place}).game;
function through(end,{side=false}={}){
 let g=createOpeningGame();
 for(const a of VOLUME_ACTIONS.filter(a=>!a.repeatable&&(!a.optional||side))){g=travel(g,a.place);g=act(g,a.type);if(g.exploration.battle)g=winOpeningFight(g);if(a.type===end)break;}
 return g;
}
test('新开局为凡人韩立，从七玄门开始；旧存档迁移不注入新剧情、不改资产',()=>{
 const g=createOpeningGame(),v=getView(g);
 assert.equal(g.player.place,'qixuan');assert.equal(v.world.realm,'凡人');assert.equal(v.combatStats.baseSpellPower,0);
 assert.equal(v.story.next.type,'qixuan_exam');assert.equal(g.player.stones,0);assert.equal(g.garden.bottle,false);
 assert.ok(v.people.every(p=>VOLUME_PEOPLE.some(a=>a.id===p.id)));
 const old=createGame();old.pill.owner='xu';old.flags.partnerDebt=120;old.player.stones=43;
 const snapshot=structuredClone(old);ensureNpcState(old);assert.deepEqual(old,snapshot);assert.equal(getView(old).story,null);
});
test('十七段主线和三条支线可完整推进；功法、信物、灵圃和事件链落入真实状态',()=>{
 const g=through('enter_xianmen',{side:true}),v=getView(g);
 assert.equal(v.story.complete,true);assert.equal(v.story.completed,17);assert.ok(v.story.objectives.every(a=>a.done));
 assert.equal(g.player.herbs,1);assert.equal(g.player.stones,180);assert.equal(g.player.hp,100);
 for(const id of ['mo_letter','warm_jade','ascension_token','sword_talisman','huanglong_recipe','changchun_manual','fireball_manual'])assert.equal(g.exploration.inventory[id],1,id);
 assert.equal(g.garden.bottle,true);assert.ok(g.exploration.learned.includes('changchun'));assert.ok(g.exploration.learned.includes('object_control'));
 assert.ok(inventoryAction(g,{type:'learn',itemId:'fireball_manual'}).game.exploration.learned.includes('fireball'));
 for(const event of g.events)assert.ok(event.causes.every(id=>g.events.some(e=>e.id===id&&e.id<event.id)));
 assert.equal(travelAccess(g,'market').available,true);assert.equal(travelAccess(g,'jinhuo').available,false);
 assert.equal(ensureNpcState(JSON.parse(JSON.stringify(g))).volume.flags.enter_xianmen,g.volume.flags.enter_xianmen);
});
test('前置条件、锁区、重复奖励和资源不足在事务副本校验，原档不变',()=>{
 let g=createOpeningGame();const before=structuredClone(g);
 for(const place of ['market','tainan'])assert.throws(()=>applyAction(g,{type:'travel_region',place}),/主线/);
 assert.throws(()=>act(g,'study_changchun'),/区域|地点|人物/);assert.deepEqual(g,before);
 g=through('test_green_dew');assert.equal(getView(g).actionOptions.discover_bottle.available,false);
 const snapshot=structuredClone(g);assert.throws(()=>act(g,'test_green_dew'),/已经完成/);assert.deepEqual(g,snapshot);
 g=through('meet_wan');g.player.herbs=0;assert.throws(()=>act(g,'trade_tainan'),/灵草/);
 g=through('enter_xianmen');const wealth=g.player.stones;assert.throws(()=>act(g,'enter_xianmen'),/已经完成/);assert.equal(g.player.stones,wealth);
});
test('神手谷灵圃持续供给，低血量可休养，不靠模型或额外资源解除主线卡点',()=>{
 let g=through('test_green_dew');g.player.herbs=0;
 g=advanceTurn(advanceTurn(g).game).game;
 assert.equal(g.garden.stored,2);g=act(g,'harvest_garden');assert.equal(g.player.herbs,2);
 g.player.hp=1;assert.throws(()=>act(act(g,'investigate_mo'),'confront_mo'),/气血/);
 g=act(g,'valley_rest');assert.equal(g.player.hp,36);
});
test('人物 Agent 跟随章节，墨大夫离场后不再发委托，迟到的张铁支线不改历史',()=>{
 let g=createOpeningGame();let context=societyContext(g);
 assert.ok(context.actors.some(a=>a.id==='modafu'));assert.ok(!context.actors.some(a=>a.id==='yanshi'));
 g=through('investigate_mo');g.society.offers.push({id:'test',npcId:'modafu',reward:10,status:'accepted'});const balance=g.people.modafu.stones;
 g=winOpeningFight(act(g,'confront_mo'));assert.equal(g.society.offers[0].status,'withdrawn');assert.equal(g.people.modafu.stones,balance+10);
 assert.ok(!societyContext(g).actors.some(a=>['modafu','zhangtie'].includes(a.id)));assert.ok(!getView(g).people.some(a=>a.id==='modafu'));
 assert.throws(()=>act(travel(g,'qixuan'),'help_zhang'),/错过/);
 const v=getView(through('apprentice_mo')),chat=agentContext(v,{mode:'dialogue',personId:'modafu',text:'我该修炼什么？'});
 assert.equal(chat.facts.objective.title,'修炼长春功');assert.ok(!chat.facts.firstVolume.knownFacts.includes('应对墨大夫危局'));
 assert.deepEqual(parseLocal('修炼长春功'),{type:'study_changchun'});
});
test('四张第一卷地图有独立地面与可点击任务点，出生点、人物与任务点可通行',()=>{
 const scene=new THREE.Scene(),targets={clickSurfaces:[],siteTargets:[],obstacleTargets:[]};
 const put=(root,geometry,material,x,y,z)=>{const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);root.add(o);return o;};
 createVolumeWorld(scene,targets,{THREE,put,material:color=>new THREE.MeshBasicMaterial({color}),label:()=>new THREE.Sprite(new THREE.SpriteMaterial()),makeTree:()=>{},makeBuilding:(root,x,z,w,d,color)=>put(root,new THREE.BoxGeometry(w,3,d),new THREE.MeshBasicMaterial({color}),x,1.5,z)});
 assert.equal(targets.clickSurfaces.length,4);
 for(const [id,r]of Object.entries(VOLUME_REGIONS)){assert.ok(volumeWalkable(id,...r.entry));for(const [x,z]of VOLUME_BLOCKERS[id])assert.equal(volumeWalkable(id,x,z),false);}
 for(const person of VOLUME_PEOPLE)assert.ok(volumeWalkable(person.place,...person.spot));
 for(const [id,site]of Object.entries(VOLUME_SITES)){assert.ok(volumeWalkable(site.place,...site.spot,{includeBuildings:false}));assert.ok(targets.siteTargets.some(o=>o.userData.siteId===id));}
 scene.traverse(o=>{assert.ok(o.position.toArray().every(Number.isFinite));o.geometry?.dispose();o.material?.dispose();});
});

test('第一卷结束接入坊市机缘，以新传闻串联因果，不借用七玄门事件',()=>{
 const g=through('enter_xianmen'),rumor=g.flags.pillRumorEvent;
 assert.ok(rumor>g.volume.flags.enter_xianmen);assert.equal(g.people.shen.knowledge.pill,rumor);
 const inspected=act(travel(g,'market'),'inspect_pill');assert.deepEqual(inspected.events.at(-1).causes,[rumor]);
});

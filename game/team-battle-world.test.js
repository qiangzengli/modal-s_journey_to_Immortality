import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installDOM} from './ui-test-dom.js';
import {createBattleWorld} from './battle-world.js';
import {createCultivatorActor} from './character-model.js';
import {createMojiaoActor} from './mojiao-model.js';
import {throughCampaign,act} from './canon-test-helpers.js';
import {getView} from './engine.js';
import {combatAction} from './combat.js';

test('南宫婉普攻实际前移挥环，独立法术从本人发出，敌方反击命中南宫婉且不重播韩立动作',async t=>{
 const {window}=installDOM(t);let time=0,scene;
 t.mock.method(performance,'now',()=>time);t.mock.timers.enable({apis:['setTimeout']});
 t.mock.method(window.HTMLCanvasElement.prototype,'getContext',()=>({fillText:()=>{}}));
 const saved=Object.getOwnPropertyDescriptor(globalThis,'matchMedia');Object.defineProperty(globalThis,'matchMedia',{configurable:true,value:()=>({matches:false})});
 t.after(()=>{if(saved)Object.defineProperty(globalThis,'matchMedia',saved);else delete globalThis.matchMedia;});
 const actors=new Map();
 const world=createBattleWorld({render:s=>{scene=s;}},id=>{
   const actor=id==='story_mojiao'?createMojiaoActor(THREE):createCultivatorActor(THREE,{id,enemy:id==='player'||id==='ji'?null:{}});
   actors.set(id,actor);return actor;
 },THREE);
 let game=act(throughCampaign('meet_nangong'),'fight_mojiao');world.sync(getView(game));world.resize(1200,800);world.render(0);
 const ally=actors.get('ji'),player=actors.get('player'),x=ally.position.x,playerX=player.position.x;
 let before=getView(game),input={type:'turn',actorId:'ji',move:'attack'};
 game=combatAction(game,input,()=>.5).game;world.sync(getView(game));let finished=world.react(before,getView(game),input);
 time=230;world.render(.23);assert.ok(ally.position.x>x+.5);assert.equal(player.position.x,playerX);assert.ok(Math.abs(ally.userData.leftArm.rotation.z)>.5);
 time=800;t.mock.timers.tick(1000);await finished;world.render(.8);assert.equal(ally.position.x,x);
 game=combatAction(game,{type:'turn',actorId:'player',move:'guard'},()=>.5).game;
 game=combatAction(game,{type:'turn',actorId:'player',move:'attack'},()=>.5).game;before=getView(game);
 input={type:'turn',actorId:'ji',move:'skill',skillId:'vermillion_ring'};
 game=combatAction(game,input,()=>.5).game;world.sync(getView(game));world.render(1);finished=world.react(before,getView(game),input);
 time=1100;world.render(1.1);assert.equal(player.position.x,playerX,'不能重播本回合已完成的韩立攻击');assert.ok(ally.position.x>x);
 time=1720;world.render(1.72);assert.ok(ally.userData.body.rotation.z>0,'反击受击的是南宫婉');assert.equal(player.userData.body.rotation.z,0);
 scene.updateMatrixWorld(true);scene.traverse(node=>assert.ok(node.matrixWorld.elements.every(Number.isFinite)));
 time=2400;t.mock.timers.tick(2000);await finished;world.sync({...getView(game),battle:null});
 const resources=new Set();scene.traverse(node=>{if(node.geometry)resources.add(node.geometry);if(node.material){resources.add(node.material);if(node.material.map)resources.add(node.material.map);}});for(const resource of resources)resource.dispose();
});

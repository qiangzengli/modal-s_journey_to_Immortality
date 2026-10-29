import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMojiaoActor} from './mojiao-model.js';

test('墨蛟为独立蛟身模型，地图与斗法共享可动画接口，几何和变换有限',()=>{
 for(const withLabel of [false,true]){
  const actor=createMojiaoActor(THREE,withLabel?{name:'墨蛟',label:()=>new THREE.Sprite(new THREE.SpriteMaterial())}:{});
  assert.ok(actor.getObjectByName('serpent-body'));assert.ok(actor.getObjectByName('dragon-head'));assert.ok(actor.getObjectByName('quest-fruit'));assert.equal(actor.userData.weapon,undefined);assert.equal(actor.userData.bag.visible,false);
  assert.ok(actor.userData.leftArm.isGroup&&actor.userData.rightArm.isGroup);assert.equal(Boolean(actor.userData.nameplate),withLabel);
  actor.userData.body.rotation.z=-.45;actor.userData.leftArm.rotation.z=.8;actor.rotation.y=-Math.PI/2;actor.updateMatrixWorld(true);
  const resources=new Set();actor.traverse(node=>{assert.equal(node.userData.personId,'story_mojiao');assert.ok(node.matrixWorld.elements.every(Number.isFinite));if(node.geometry){assert.ok([...node.geometry.attributes.position.array].every(Number.isFinite));resources.add(node.geometry);}if(node.material)resources.add(node.material);});
  const box=new THREE.Box3().setFromObject(actor.userData.body);assert.ok(box.getSize(new THREE.Vector3()).length()>3);for(const r of resources)r.dispose();
 }
});

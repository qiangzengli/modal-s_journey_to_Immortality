import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCultivatorActor } from './character-model.js';

test('主要角色共享地图与斗法动画接口，身形、发型与法器有独立辨识特征', () => {
  for(const [id,feature] of [['player','green-bottle'],['ji','vermillion-ring'],['wen','ghost-crown'],['modafu','elder-beard'],['trial_swordsman','giant-sword']]){
    const actor=createCultivatorActor(THREE,{id,enemy:id==='wen'?{rewardName:'燕堡战后所得'}:null});
    assert.ok(actor.getObjectByName(feature),`${id} 缺少 ${feature}`);
    assert.ok(actor.userData.body.isGroup&&actor.userData.leftArm.isGroup&&actor.userData.rightArm.isGroup);
    if(id==='player')assert.ok(actor.userData.weapon.isMesh);
    if(id==='wen')assert.ok(actor.userData.bag.isGroup);
    actor.userData.leftArm.rotation.z=.4;actor.userData.body.rotation.z=-.25;actor.updateMatrixWorld(true);
    actor.traverse(node=>{assert.equal(node.userData.personId,id);assert.ok(node.matrixWorld.elements.every(Number.isFinite));if(node.geometry)assert.ok([...node.geometry.attributes.position.array].every(Number.isFinite));});
    const size=new THREE.Box3().setFromObject(actor.userData.body).getSize(new THREE.Vector3());assert.ok(size.y>2.4&&size.y<3.5);
    const resources=new Set();actor.traverse(node=>{if(node.geometry)resources.add(node.geometry);if(node.material)resources.add(node.material);});for(const resource of resources)resource.dispose();
  }
});

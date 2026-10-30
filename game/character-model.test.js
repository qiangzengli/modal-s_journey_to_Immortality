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

test('角色面部有真实纵深、完整头颅；曲面与发束法线朝外，旋转后仍可见',async()=>{
  const {lockGeometry}=await import('./character-geometry.js');
  const strand=lockGeometry(THREE,[[0,0,0],[0,-1,0]],.1,.06);
  let outward=0;
  for(let i=9;i<18;i++){
    const radial=new THREE.Vector3().fromBufferAttribute(strand.attributes.position,i).setY(0);
    outward+=radial.dot(new THREE.Vector3().fromBufferAttribute(strand.attributes.normal,i));
  }
  assert.ok(outward>0,'发束反向法线会让旋转后的头发消失');strand.dispose();
  for(const id of ['player','ji','modafu','wen']){
    const actor=createCultivatorActor(THREE,{id});const face=actor.getObjectByName('sculpted-face');
    face.geometry.computeBoundingBox();assert.ok(face.geometry.boundingBox.max.z-face.geometry.boundingBox.min.z>.08,'面部必须有鼻梁和侧脸厚度');
    assert.ok(actor.getObjectByName('complete-skull'));assert.equal(face.isSprite,undefined);
    let triangles=0,draws=0;
    actor.traverse(n=>{if(n.isMesh){triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;draws++;}});
    assert.ok(triangles<80000,`${id}: ${triangles} 超出实时角色预算`);assert.ok(draws<=48,`${id}: ${draws} 次绘制`);
  }
});

test('背面外袍遮住内衬，衣发摆动不覆盖斗法关节姿态',async()=>{
  const {animateCultivator}=await import('./character-model.js');
  const actor=createCultivatorActor(THREE,{id:'player'});actor.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(.22,1.61,-1),new THREE.Vector3(0,0,1));
  const hits=ray.intersectObjects(actor.userData.body.children,true);
  assert.ok(hits.length);assert.equal(hits[0].object.material.color.getHex(),actor.userData.profile.robe,'背面不应透出浅色内衬');
  actor.userData.rightArm.rotation.z=-1.2;actor.userData.body.rotation.x=-.18;
  animateCultivator(actor,.7,true);
  assert.equal(actor.userData.rightArm.rotation.z,-1.2);assert.equal(actor.userData.body.rotation.x,-.18);
  const pose=actor.userData.motions.map(m=>m.node.rotation[m.axis]);animateCultivator(actor,1.3,true);
  assert.notDeepEqual(actor.userData.motions.map(m=>m.node.rotation[m.axis]),pose);
});

test('闭合衣料的 UV 接缝不形成光照裂缝，双眼高光朝向面部前方',async()=>{
  const {loft}=await import('./character-geometry.js');
  const geometry=loft(THREE,[[0,.2,.13],[.5,.28,.2],[1,.18,.12]],{segments:32,steps:20,folds:.008});
  const normals=geometry.attributes.normal;
  for(let row=0;row<=20;row++){
    const left=new THREE.Vector3().fromBufferAttribute(normals,row*33);
    const right=new THREE.Vector3().fromBufferAttribute(normals,row*33+32);
    assert.ok(left.distanceTo(right)<1e-6,'同一位置的法线必须连续');
  }
  geometry.dispose();
  const actor=createCultivatorActor(THREE,{id:'ji'}),eyes=actor.getObjectByName('corneal-highlights');
  const eyeNormals=eyes.geometry.attributes.normal;
  for(let i=0;i<eyeNormals.count;i++)assert.ok(eyeNormals.getZ(i)>0,'左右眼不能有一面反向消失');
  assert.ok(actor.getObjectByName('continuous-neck'));
});

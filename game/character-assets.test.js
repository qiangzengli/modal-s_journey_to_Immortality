import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createCharacterAssetStore,updateCharacterAsset} from './character-assets.js';
import {validateCharacterManifest,inspectCharacterGLB} from './character-asset-contract.js';
import {createCultivatorActor} from './character-model.js';
import {PROBE_ENTRY,characterGLBProbe} from './character-asset-test-fixture.js';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const actor=()=>createCultivatorActor(THREE,{id:'player'});
const loaded=actor=>actor.getObjectByName('loaded-character');
const createStore=(fetchBuffer,parseGLB=buffer=>new GLTFLoader().parseAsync(buffer,''))=>createCharacterAssetStore({THREE,fetchBuffer,parseGLB,cloneScene:clone});

test('资源清单只接受本地 GLB、独立手臂和明确的动作映射',()=>{
  const result=validateCharacterManifest({version:1,characters:{player:PROBE_ENTRY}});
  assert.equal(result.characters.player.file,'probe.glb');
  for(const file of ['../secret.glb','https://example.com/a.glb','a.glb?token=1','%2e%2e.glb','a.gltf'])assert.throws(()=>validateCharacterManifest({version:1,characters:{player:{...PROBE_ENTRY,file}}}),{code:'ASSET_PATH_INVALID'});
  assert.throws(()=>validateCharacterManifest({version:2,characters:{}}),{code:'MANIFEST_INVALID'});
  assert.throws(()=>validateCharacterManifest({version:1,characters:{player:{...PROBE_ENTRY,height:NaN}}}),{code:'MANIFEST_INVALID'});
  assert.throws(()=>validateCharacterManifest({version:1,characters:{player:{...PROBE_ENTRY,joints:{leftArm:'Arm',rightArm:'Arm'}}}}),{code:'RIG_INVALID'});
  assert.equal(inspectCharacterGLB(characterGLBProbe(),PROBE_ENTRY).triangles,2);
  assert.throws(()=>inspectCharacterGLB(characterGLBProbe(doc=>doc.buffers[0].uri='https://example.com/private.bin')),{code:'GLB_EXTERNAL_RESOURCE'});
  assert.throws(()=>inspectCharacterGLB(characterGLBProbe(doc=>doc.images=[{uri:'../portrait.png'}])),{code:'GLB_EXTERNAL_RESOURCE'});
  assert.throws(()=>inspectCharacterGLB(characterGLBProbe(doc=>doc.extensionsRequired=['KHR_draco_mesh_compression'])),{code:'GLB_DECODER_REQUIRED'});
  assert.throws(()=>inspectCharacterGLB(characterGLBProbe(doc=>doc.accessors[4].count=450003)),{code:'GLB_BUDGET_EXCEEDED'});
  assert.throws(()=>inspectCharacterGLB(characterGLBProbe(),{...PROBE_ENTRY,clips:{idle:'Missing'}}),{code:'CLIP_MISSING'});
  const short=characterGLBProbe().slice(0,-4);assert.throws(()=>inspectCharacterGLB(short),{code:'GLB_INVALID'});
});

test('真实 GLB 只加载一次；地图与斗法实例骨骼、材质独立且不改变外部角色状态',async t=>{
  let fetches=0,parses=0;
  const store=createStore(async()=>{fetches++;return characterGLBProbe();},async buffer=>{parses++;return new GLTFLoader().parseAsync(buffer,'');});t.after(()=>store.dispose());
  const a=actor(),b=actor(),body=a.userData.body,left=a.userData.leftArm;
  a.position.set(7,2,-3);a.rotation.y=.8;body.visible=false;
  const results=await Promise.all([store.attach(a,PROBE_ENTRY),store.attach(b,PROBE_ENTRY)]);
  assert.deepEqual(results.map(r=>r.status),['ready','ready']);assert.equal(fetches,1);assert.equal(parses,1);
  assert.deepEqual(a.position.toArray(),[7,2,-3]);assert.equal(a.rotation.y,.8);assert.equal(a.userData.body,body);assert.equal(a.userData.leftArm,left);assert.equal(body.visible,false);
  const meshA=loaded(a).getObjectByName('Body'),meshB=loaded(b).getObjectByName('Body');
  assert.ok(meshA.isSkinnedMesh);assert.notEqual(meshA.skeleton,meshB.skeleton);assert.notEqual(meshA.material,meshB.material);assert.equal(meshA.geometry,meshB.geometry);
  updateCharacterAsset(a,{elapsed:.5,action:'attack',progress:.5});updateCharacterAsset(b,{elapsed:.5});
  assert.ok(Math.abs(loaded(a).getObjectByName('RightArm').rotation.z)>.8);
  assert.ok(Math.abs(loaded(b).getObjectByName('RightArm').rotation.z)<1e-6);
  const bColor=loaded(b).getObjectByName('Sword').material.color.getHex();
  a.userData.weapon.material.color.setHex(0xff0000);updateCharacterAsset(a,{elapsed:.6});
  assert.equal(loaded(a).getObjectByName('Sword').material.color.getHex(),0xff0000);assert.equal(loaded(b).getObjectByName('Sword').material.color.getHex(),bColor);
  const proxyMaterials=[];a.getObjectByName('natural-stance').traverse(n=>{if(n.material?.emissive)proxyMaterials.push(n.material);});
  for(const m of proxyMaterials){m.emissive.setHex(0xff6600);m.emissiveIntensity=.3;}
  updateCharacterAsset(a,{elapsed:.7});assert.equal(meshA.material.emissive.getHex(),0xff6600);assert.equal(meshB.material.emissive.getHex(),0);
  for(const m of proxyMaterials){m.emissive.setHex(0);m.emissiveIntensity=0;}
  updateCharacterAsset(a,{elapsed:.8});assert.equal(meshA.material.emissive.getHex(),0);
  a.userData.disposeCharacterAsset();assert.equal(loaded(a),undefined);assert.ok(a.getObjectByName('natural-stance').visible);assert.ok(loaded(b));
});

test('没有对应动画的模型仍按现有手臂接口出招；失败替换保留可见的上一份模型',async t=>{
  const store=createStore(async()=>characterGLBProbe());t.after(()=>store.dispose());const a=actor();
  assert.equal((await store.attach(a,{...PROBE_ENTRY,clips:{}})).status,'ready');
  a.userData.rightArm.rotation.z=-.65;updateCharacterAsset(a,{elapsed:1,action:'attack',progress:.5});
  assert.ok(Math.abs(loaded(a).getObjectByName('RightArm').rotation.z+.65)<1e-6);
  const prior=loaded(a),status=await store.attach(a,{...PROBE_ENTRY,file:'bad.glb',joints:{leftArm:'Missing',rightArm:'RightArm'}});
  assert.equal(status.errorCode,'RIG_NODE_MISSING');assert.equal(status.file,'probe.glb');assert.equal(loaded(a),prior);
});

test('骨骼映射使用 GLB 原始节点名，兼容加载器对冒号的重命名',async t=>{
  const store=createStore(async()=>characterGLBProbe(doc=>{doc.nodes[2].name='Rig:LeftArm';doc.nodes[3].name='Rig:RightArm';}));t.after(()=>store.dispose());
  const a=actor();
  assert.equal((await store.attach(a,{...PROBE_ENTRY,joints:{leftArm:'Rig:LeftArm',rightArm:'Rig:RightArm'}})).status,'ready');
  updateCharacterAsset(a,{elapsed:.5,action:'attack',progress:.5});
  assert.ok(Math.abs(loaded(a).getObjectByName('RigRightArm').rotation.z)>.8);
});

test('损坏资源不会隐去原人物，晚到的请求和已销毁的角色不会重新挂载',async t=>{
  const first=deferred(),second=deferred();
  const store=createStore(file=>file==='first.glb'?first.promise:second.promise);t.after(()=>store.dispose());
  const a=actor(),old=store.attach(a,{...PROBE_ENTRY,file:'first.glb'}),fresh=store.attach(a,{...PROBE_ENTRY,file:'second.glb'});
  assert.equal(a.getObjectByName('natural-stance').visible,true);
  second.resolve(characterGLBProbe());assert.equal((await fresh).status,'ready');
  first.resolve(characterGLBProbe());assert.equal((await old).status,'superseded');assert.equal(a.userData.characterAsset.file,'second.glb');
  const wait=deferred(),pendingStore=createStore(()=>wait.promise);t.after(()=>pendingStore.dispose());
  const b=actor(),pending=pendingStore.attach(b,PROBE_ENTRY);b.userData.disposeCharacterAsset();wait.resolve(characterGLBProbe());
  assert.equal((await pending).status,'superseded');assert.equal(loaded(b),undefined);assert.ok(b.getObjectByName('natural-stance').visible);
  const bad=createStore(async()=>new ArrayBuffer(8));t.after(()=>bad.dispose());const c=actor();
  assert.equal((await bad.attach(c,PROBE_ENTRY)).errorCode,'GLB_SIZE_INVALID');assert.ok(c.getObjectByName('natural-stance').visible);
});

test('加载并发限制为两份，排队任务在资源管理器关闭后不再发起请求',async()=>{
  const gates=[deferred(),deferred()],calls=[];const store=createStore(file=>{calls.push(file);return gates[calls.length-1].promise;});
  const a=store.attach(actor(),{...PROBE_ENTRY,file:'a.glb'}),b=store.attach(actor(),{...PROBE_ENTRY,file:'b.glb'}),c=store.attach(actor(),{...PROBE_ENTRY,file:'c.glb'});
  assert.deepEqual(calls,['a.glb','b.glb']);store.dispose();gates[0].resolve(characterGLBProbe());gates[1].resolve(characterGLBProbe());
  await Promise.all([a,b,c]);assert.deepEqual(calls,['a.glb','b.glb']);
});

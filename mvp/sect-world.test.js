import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSectWorld, sectWalkable, SECT_BLOCKERS } from './sect-world.js';
import { SECTS, SECT_PEOPLE, SECT_SITES } from './sect-data.js';
import { REGIONS } from './regions.js';

test('四个山门生成独立地面、可点击地点与可通行出生点，接引人不困在建筑内', () => {
  const scene=new THREE.Scene(),targets={clickSurfaces:[],siteTargets:[],obstacleTargets:[]};
  const put=(root,geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);root.add(mesh);return mesh;};
  const helpers={THREE,put,material:color=>new THREE.MeshBasicMaterial({color}),label:()=>new THREE.Sprite(new THREE.SpriteMaterial()),makeTree:()=>{},makeBuilding:(root,x,z,w,d,color)=>put(root,new THREE.BoxGeometry(w,3,d),new THREE.MeshBasicMaterial({color}),x,1.5,z)};
  const world=createSectWorld(scene,targets,helpers);world.update(20);
  assert.equal(targets.clickSurfaces.length,4);
  for(const id of Object.keys(SECTS)){
    const [x,z]=REGIONS[id].entry;assert.equal(sectWalkable(id,x,z),true);
    const person=SECT_PEOPLE.find(p=>p.place===id);assert.equal(sectWalkable(id,...person.spot),true);
    assert.ok(targets.siteTargets.some(target=>target.userData.siteId==='sect_'+id));
    assert.equal(sectWalkable(id,...SECT_SITES['sect_'+id].spot),true);
    for(const [bx,bz]of SECT_BLOCKERS[id])assert.equal(sectWalkable(id,bx,bz),false);
  }
  scene.traverse(object=>{assert.ok(object.position.toArray().every(Number.isFinite));object.geometry?.dispose();object.material?.dispose();});
});

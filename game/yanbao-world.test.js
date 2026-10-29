import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFrontier, frontierWalkable } from './frontier-world.js';
import { createBuildingWorld } from './building-world.js';
import { buildingWalkable } from './building-layout.js';
import { REGIONS, regionAt } from './regions.js';
import { FRONTIER_SITES } from './campaign-data.js';
import { STORY_ENEMIES } from './combat-data.js';

test('燕堡真实场景的出生点可到门楼、血灵阵、侧院和王蝉，柱墙不可穿行', () => {
  const scene=new THREE.Scene(),targets={clickSurfaces:[],siteTargets:[],obstacleTargets:[]};
  const put=(root,geometry,material,x,y,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);root.add(mesh);return mesh;};
  const helpers={THREE,put,material:color=>new THREE.MeshBasicMaterial({color}),label:()=>new THREE.Sprite(new THREE.SpriteMaterial()),makeTree:()=>{}};
  const buildings=createBuildingWorld({...helpers,regionAt});
  const world=createFrontier(scene,targets,{...helpers,makeBuilding:buildings.makeBuilding});
  world.update(3);world.sync({campaign:{complete:false,flags:{},objectives:[]}});
  const [minX,maxX,minZ,maxZ]=REGIONS.yanbao.bounds;
  const walkable=(x,z)=>x>=minX&&x<=maxX&&z>=minZ&&z<=maxZ&&frontierWalkable('yanbao',x,z,{includeBuildings:false})&&buildings.buildings.filter(b=>b.room.place==='yanbao').every(b=>buildingWalkable(b.room,x,z));
  const key=(x,z)=>`${x},${z}`,queue=[REGIONS.yanbao.entry],seen=new Set([key(...queue[0])]);
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];
    for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){
      const nx=x+dx,nz=z+dz,k=key(nx,nz);
      if(!seen.has(k)&&walkable(nx,nz)){seen.add(k);queue.push([nx,nz]);}
    }
  }
  for(const [id,site]of Object.entries(FRONTIER_SITES).filter(([,s])=>s.place==='yanbao')){
    assert.ok(seen.has(key(...site.spot)),`${id} 从出生点无法到达`);
    assert.ok(targets.siteTargets.some(target=>target.userData.siteId===id));
  }
  assert.ok(seen.has(key(...STORY_ENEMIES.find(e=>e.id==='wen').spot)));
  assert.equal(walkable(683,7),false);assert.equal(walkable(683,-7),false);
  for(const {room}of buildings.buildings.filter(b=>b.room.place==='yanbao'))assert.equal(walkable(room.x+room.width/2,room.z),false);
  scene.traverse(object=>{assert.ok(object.position.toArray().every(Number.isFinite));object.geometry?.dispose();object.material?.dispose();});
});

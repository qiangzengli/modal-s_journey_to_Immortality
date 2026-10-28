import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildingLayout, buildingWalkable, insideRoom, roomPoint } from './building-layout.js';
import { createBuildingWorld } from './building-world.js';
import { createVolumeWorld } from './volume-world.js';
import { VOLUME_SITES } from './volume-data.js';
import { regionAt } from './regions.js';

const put = (root, geometry, material, x, y, z) => {
  const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x,y,z); root.add(mesh); return mesh;
};
const helpers = { THREE, put, material: color=>new THREE.MeshBasicMaterial({color}), label:()=>new THREE.Sprite(new THREE.SpriteMaterial()), regionAt };

test('两种朝向都有真实门洞，连续步行可进出，墙和家具仍阻挡角色', () => {
  for (const z of [-14, 12]) {
    const room = buildingLayout({x:218,z,width:6,depth:4.4,title:'房屋',place:'qinglan'});
    assert.equal(insideRoom(room,...Object.values(room.entry)),false);
    assert.equal(insideRoom(room,...Object.values(room.inside)),true);
    for(let localZ=.3;localZ<=room.depth/2+1;localZ+=.05) {
      const p=roomPoint(room,0,localZ); assert.equal(buildingWalkable(room,p.x,p.z),true,'门洞到室内不能有实心碰撞');
    }
    for(const [x,z] of [...room.walls,...room.furniture.map(f=>f.rect)]) {
      const p=roomPoint(room,x,z);assert.equal(buildingWalkable(room,p.x,p.z),false,'墙体与家具不能穿过');
    }
    const besideDoor=roomPoint(room,room.doorWidth/2,room.depth/2);
    assert.equal(buildingWalkable(room,besideDoor.x,besideDoor.z),false,'门边需要容纳人物半径');
  }
});

test('进入屋内自动揭顶、门自动打开，走出和跨图后恢复；地板可接收移动点击', () => {
  const world = createBuildingWorld(helpers), scene = new THREE.Scene();
  world.makeBuilding(scene,518,-14,7,4.6,0x556655,'墨大夫药庐');
  const b=world.buildings[0];
  assert.equal(world.update('shenshou',b.room.entry,.1),null);
  assert.ok(b.doors.every(d=>Math.abs(d.hinge.rotation.y)>1));
  assert.equal(world.update('shenshou',b.room.inside,.1)?.id,b.room.id);
  assert.equal(b.roof.visible,false);assert.equal(b.walls.visible,false);assert.equal(b.floor.visible,true);
  assert.equal(b.floor.userData.walkableSurface,true);
  assert.equal(world.update('market',b.room.inside,.1),null);
  assert.equal(b.roof.visible,true);assert.equal(b.walls.visible,true);
  scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});

test('药庐与墨府任务点位于真实可达室内，室外隐藏，进入后显示并可交互', () => {
  const buildings=createBuildingWorld(helpers),scene=new THREE.Scene(),targets={clickSurfaces:[],siteTargets:[],obstacleTargets:[]};
  const volume=createVolumeWorld(scene,targets,{...helpers,makeBuilding:buildings.makeBuilding,makeTree:()=>{}});
  for(const id of ['valley_room','mofu_letter']) {
    const site=VOLUME_SITES[id], b=buildings.buildings.find(b=>b.room.id===site.room);
    assert.ok(b);assert.equal(insideRoom(b.room,...site.spot),true);assert.equal(buildingWalkable(b.room,...site.spot),true);
    const hit=targets.siteTargets.find(t=>t.userData.siteId===id);
    volume.updateRoom(null);assert.equal(hit.parent.visible,false);
    volume.updateRoom(b.room.id);assert.equal(hit.parent.visible,true);
  }
  scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});

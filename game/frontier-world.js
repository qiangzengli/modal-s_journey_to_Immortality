import * as THREE from '../vendor/three.module.js';
import { REGIONS } from './regions.js';
import { FRONTIER_SITES } from './campaign-data.js';

export const FRONTIER_BLOCKERS = {
  river:[[39,14,3.4,2.4],[70,-15,3.4,2.4]],
  quarry:[[89,15,3.4,2.4],[119,-13,3.4,2.4],[106,-17,2.2,1.2]],
  ruins:[[150,-14,3.2,2.4],[172,-15,3.4,2.4]]
};
export function frontierWalkable(place,x,z,{includeBuildings=true}={}){
  if(place==='river'&&x>51.5&&x<58.5&&Math.abs(z)>2.5)return false;
  return !includeBuildings || !(FRONTIER_BLOCKERS[place]||[]).some(([bx,bz,rx,rz])=>Math.abs(x-bx)<rx&&Math.abs(z-bz)<rz);
}
export function createFrontier(scene, targets, helpers) {
  const {put,material,label,makeBuilding,makeTree}=helpers;
  const {clickSurfaces,siteTargets,obstacleTargets}=targets;
  const luminous=[], indicators={};
  const groundMats={river:0x46695d,quarry:0x806450,ruins:0x525d6c};
  for(const id of ['river','quarry','ruins']){
    const region=REGIONS[id], [min,max]=region.bounds, center=(min+max)/2;
    const ground=put(scene,new THREE.BoxGeometry(max-min+2,.5,40),material(groundMats[id]),center,-.28,0);clickSurfaces.push(ground);
    put(scene,new THREE.BoxGeometry(max-min+3,.07,4.6),material(id==='quarry'?0xa58b6b:0x8c9686),center,.005,0);
    for(let i=0;i<14;i++){
      const x=min+1+(i*7.61)%(max-min-2),z=i%2?-18:18;
      if(id==='river')makeTree(scene,x,z,.7+(i%3)*.2);
      else {const rock=put(scene,new THREE.DodecahedronGeometry(1.2+i%3*.3),material(id==='quarry'?0x9a6c4e:0x6b7184),x,.7,z);rock.scale.y=1.5;}
    }
    const banner=label(region.name,{width:360,font:35});banner.position.set(min+5,5,-3.5);scene.add(banner);
  }
  // 河水不能直接行走，主路上的栈桥连接两岸。
  const water=put(scene,new THREE.BoxGeometry(7,.08,39),new THREE.MeshStandardMaterial({color:0x4f96a3,roughness:.28,metalness:.25,transparent:true,opacity:.75}),55,-.02,0);
  for(let x=51.4;x<59;x+=.65)put(scene,new THREE.BoxGeometry(.56,.18,4.5),material(0x9b8969),x,.09,0);
  for(const z of [-2.1,2.1])for(let x=51.4;x<59;x+=1.4)put(scene,new THREE.CylinderGeometry(.06,.08,1,6),material(0x706047),x,.5,z);
  const boat=new THREE.Group();boat.position.set(44,.2,-11);scene.add(boat);
  put(boat,new THREE.BoxGeometry(5,.45,1.8),material(0x6f5843),0,0,0);put(boat,new THREE.BoxGeometry(.13,3,.13),material(0x8d7853),0,1.5,0);put(boat,new THREE.BoxGeometry(1.7,2,.05),material(0xbeb793),.65,2.1,0);
  for(const [id,buildings] of Object.entries(FRONTIER_BLOCKERS))for(const [x,z] of buildings)obstacleTargets.push(makeBuilding(scene,x,z,5.8,4,id==='quarry'?0x77543d:0x576f76,id==='river'?'药园静舍':id==='quarry'?'禁地废墟':'禁地石殿'));
  for(let i=0;i<9;i++){
    const sprig=put(scene,new THREE.ConeGeometry(.22,.8,5),material(i%2?0x8ca979:0xb5a56d),101+i%3*1.1,.4,-13-Math.floor(i/3)*.8);
    sprig.rotation.z=(i%3-1)*.1;
  }
  put(scene,new THREE.BoxGeometry(4,.5,3),material(0x737b79),162,.25,-6);
  for(const x of [159.5,164.5])for(const z of [-8,-4])put(scene,new THREE.CylinderGeometry(.3,.42,4,8),material(0x8c9290),x,2,z);
  const fruit=put(scene,new THREE.SphereGeometry(.3,12,8),new THREE.MeshStandardMaterial({color:0xe0b566,emissive:0x795325,emissiveIntensity:.4}),162,1.6,-6);luminous.push(fruit);
  for(const [id,site] of Object.entries(FRONTIER_SITES)){
    const [x,z]=site.spot, root=new THREE.Group();root.position.set(x,.02,z);scene.add(root);
    const ring=put(root,new THREE.CylinderGeometry(1.5,1.7,.15,12),material(0x9caa96),0,0,0);indicators[id]=ring;
    const sign=label(site.name,{width:280,font:29});sign.position.y=id==='core'?5.3:2.5;sign.userData.siteId=id;root.add(sign);siteTargets.push(sign);
    const hit=put(root,new THREE.CylinderGeometry(1.8,1.8,2,12),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),0,1,0);hit.userData.siteId=id;hit.castShadow=false;siteTargets.push(hit);
    if(id==='spring')for(let i=0;i<5;i++)put(root,new THREE.ConeGeometry(.18,.7,5),material(0xa2bf86),Math.cos(i)*.8,.4,Math.sin(i)*.8);
  }
  return {
    sync(view){fruit.visible=!view.campaign?.flags.fight_mojiao;const restored=view.campaign?.flags.garden_cultivate;water.material.color.setHex(restored?0x6bcbbe:0x4f96a3);for(const [id,mesh]of Object.entries(indicators))mesh.material.color.setHex(view.campaign?.objectives.some(o=>o.target===id&&o.done)?0xa8c78c:0x9caa96);},
    update(time){for(let i=0;i<luminous.length;i++){luminous[i].rotation.y=time*(.15+i*.04);if(!i)luminous[i].position.y=1.6+Math.sin(time)*.16;}}
  };
}

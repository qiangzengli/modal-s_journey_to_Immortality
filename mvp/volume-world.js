import { VOLUME_REGIONS, VOLUME_SITES } from './volume-data.js';

export const VOLUME_BLOCKERS=Object.fromEntries(Object.entries(VOLUME_REGIONS).map(([id,r])=>[id,[[r.entry[0]+22,-14,4,2.8]]]));
export const volumeWalkable=(place,x,z)=>!(VOLUME_BLOCKERS[place]||[]).some(([bx,bz,rx,rz])=>Math.abs(x-bx)<rx&&Math.abs(z-bz)<rz);
export function createVolumeWorld(scene,{clickSurfaces,siteTargets,obstacleTargets},{THREE,put,material,label,makeBuilding,makeTree}) {
  for(const [id,r]of Object.entries(VOLUME_REGIONS)) {
    const [min,max]=r.bounds,center=(min+max)/2;
    clickSurfaces.push(put(scene,new THREE.BoxGeometry(max-min+2,.5,40),material(Number(r.color.replace('#','0x'))),center,-.28,0));
    put(scene,new THREE.BoxGeometry(max-min,.06,4),material(0x9a9a82),center,.02,0);
    const [bx,bz]=VOLUME_BLOCKERS[id][0];
    obstacleTargets.push(makeBuilding(scene,bx,bz,7,4.6,id==='jiayuan'?0x715c56:0x5d7663,{qixuan:'七玄门',shenshou:'墨大夫药庐',jiayuan:'墨府',tainan:'太南会馆'}[id]));
    for(let i=0;i<10;i++)makeTree(scene,min+2+i*4.4,i%2?17:-18,.7+i%3*.15);
    const title=label(r.name,{width:360,font:34});title.position.set(min+7,4.8,-1);scene.add(title);
    if(id==='qixuan')for(let i=0;i<5;i++)put(scene,new THREE.BoxGeometry(2.5,.1+i*.12,1),material(0x8e9387),min+9,.05+i*.06,-3-i);
    if(id==='tainan')for(let i=0;i<4;i++){
      const table=put(scene,new THREE.BoxGeometry(2.6,.8,1.2),material(i%2?0x82774f:0x6e7e68),min+12+i*6,.4,13);
      for(let j=0;j<3;j++)put(scene,new THREE.CylinderGeometry(.16,.2,.4,8),material(0xc2b88b),table.position.x+j*.5-.5,1,13);
    }
  }
  for(const [id,site]of Object.entries(VOLUME_SITES)) {
    const [x,z]=site.spot,root=new THREE.Group();root.position.set(x,.02,z);scene.add(root);
    put(root,new THREE.CylinderGeometry(1.25,1.45,.12,16),material(0xa2ad8e),0,0,0);
    const title=label(site.name,{width:300,font:27});title.position.y=2.6;title.userData.siteId=id;root.add(title);siteTargets.push(title);
    const hit=put(root,new THREE.CylinderGeometry(1.5,1.5,2,12),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),0,1,0);hit.userData.siteId=id;siteTargets.push(hit);
    if(id==='valley_bottle'){
      put(root,new THREE.SphereGeometry(.28,12,8),material(0x85b48a),0,.45,0);
      put(root,new THREE.CylinderGeometry(.1,.13,.25,8),material(0x96c4a1),0,.75,0);
    }
  }
}

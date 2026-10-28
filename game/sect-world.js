import { SECTS, SECT_SITES } from './sect-data.js';
import { REGIONS } from './regions.js';

export const SECT_BLOCKERS = Object.fromEntries(Object.keys(SECTS).map(id => {
  const x = REGIONS[id].entry[0];
  return [id, [[x+24,-10,4.8,3.2], [x+16,12,3.5,2.6], [x+5,-5,.8,.8], [x+5,5,.8,.8]]];
}));
export function sectWalkable(place, x, z) {
  return !(SECT_BLOCKERS[place] || []).some(([bx,bz,rx,rz]) => Math.abs(x-bx)<rx && Math.abs(z-bz)<rz);
}

export function createSectWorld(scene, targets, { THREE, put, material, label, makeBuilding, makeTree }) {
  const glows = [];
  const themes = { qinglan:[0x5b7b70,0x577c85,0x9cddd5], lingshu:[0x5d7955,0x648369,0xb5e394], jinhuo:[0x62514b,0x804a37,0xef9b64], xuanming:[0x514d65,0x5d537b,0xbda4e8] };
  for (const [id, sect] of Object.entries(SECTS)) {
    const [groundColor, roofColor, glowColor] = themes[id], x = REGIONS[id].entry[0];
    const ground = put(scene,new THREE.BoxGeometry(48,.5,40),material(groundColor),x+11,-.28,0);
    targets.clickSurfaces.push(ground);
    put(scene,new THREE.BoxGeometry(42,.07,4.5),material(0x9e9b87),x+11,.01,0);
    for(let i=0;i<11;i++) put(scene,new THREE.BoxGeometry(1.3,.13,3.8),material(0xb9b49b),x-8+i*3.4,.05,0);
    const hall = makeBuilding(scene,x+24,-10,8.5,5.2,roofColor,sect.name+' · 正殿');
    const lodge = makeBuilding(scene,x+16,12,6,4.4,roofColor,id==='lingshu'?'百草药庐':id==='jinhuo'?'地火炉房':id==='xuanming'?'隐契书阁':'问剑堂');
    targets.obstacleTargets.push(hall,lodge);
    for(const z of [-5,5]) {
      const pillar = put(scene,new THREE.BoxGeometry(1,6,1),material(0x89938d),x+5,3,z);
      targets.obstacleTargets.push(pillar);
      const flag = put(scene,new THREE.BoxGeometry(.12,2,1.2),material(roofColor),x+5,4,z+Math.sign(z)*1.1);
      flag.rotation.z=.08;
    }
    put(scene,new THREE.BoxGeometry(1.2,.8,11.6),material(roofColor),x+5,6,0);
    const sign=label(sect.name,{width:340,font:36,color:id==='jinhuo'?'#ffd0a0':id==='xuanming'?'#e0d0fb':'#dcebd6'});
    sign.position.set(x+5,7.3,0);scene.add(sign);
    const arrival = put(scene,new THREE.RingGeometry(2.1,2.3,48),new THREE.MeshBasicMaterial({color:glowColor,side:THREE.DoubleSide,transparent:true,opacity:.7}),x,.08,0);
    arrival.rotation.x=-Math.PI/2; glows.push(arrival);
    for(let i=0;i<12;i++) {
      const tx=x-8+i*3.4,z=i%2?-18:18;
      if(id==='qinglan'||id==='lingshu') makeTree(scene,tx,z,.8+i%3*.2);
      else put(scene,new THREE.ConeGeometry(1.4,3+i%3,5),material(groundColor),tx,1.2,z);
    }
    if(id==='qinglan') for(let i=0;i<5;i++) {
      const sword=put(scene,new THREE.BoxGeometry(.18,2.4,.5),material(0xb0ccc6,.3,.6),x+10+i*1.1,1.6,-11);
      sword.rotation.z=(i-2)*.13;
      put(scene,new THREE.BoxGeometry(.2,.18,1.2),material(0x9aaf99),x+10+i*1.1,2.1,-11);
    }
    if(id==='lingshu') {
      put(scene,new THREE.CylinderGeometry(3.1,3.3,.15,40),material(0x83bfba,.2,.3),x+9,.08,-11);
      for(let i=0;i<8;i++) put(scene,new THREE.ConeGeometry(.4,.9,6),material(i%2?0xb8d598:0xd8d0b1),x+7+i%4*1.2,.4,-12+Math.floor(i/4)*2);
    }
    if(id==='jinhuo') {
      put(scene,new THREE.CylinderGeometry(2.3,2.5,.6,18),material(0x383d3b),x+9,.3,-11);
      const fire=put(scene,new THREE.IcosahedronGeometry(1.1,1),new THREE.MeshStandardMaterial({color:glowColor,emissive:0xe96934,emissiveIntensity:.7}),x+9,1.4,-11);glows.push(fire);
    }
    if(id==='xuanming') for(let i=0;i<6;i++) {
      const a=i*Math.PI/3;
      put(scene,new THREE.BoxGeometry(.5,2,.5),material(0x8c87a3),x+10+Math.cos(a)*3,1,-11+Math.sin(a)*3);
      const orb=put(scene,new THREE.IcosahedronGeometry(.27,0),new THREE.MeshStandardMaterial({color:glowColor,emissive:0x7961b5,emissiveIntensity:.7}),x+10+Math.cos(a)*3,2.3,-11+Math.sin(a)*3);glows.push(orb);
    }
    const siteId='sect_'+id, site=SECT_SITES[siteId];
    const marker=label(site.name,{width:260,font:29}); marker.position.set(site.spot[0],2.5,site.spot[1]);marker.userData.siteId=siteId;scene.add(marker);targets.siteTargets.push(marker);
    const pad=put(scene,new THREE.CylinderGeometry(1.6,1.8,.16,12),material(roofColor),site.spot[0],.08,site.spot[1]);pad.userData.siteId=siteId;targets.siteTargets.push(pad);
  }
  return { update(time) { glows.forEach((glow,i) => { if(glow.geometry.type!=='RingGeometry')glow.rotation.y=time*.35+i; }); } };
}

import {loft,ribbon,batchCharacterMeshes} from './character-geometry.js';
import {characterMaterials} from './character-materials.js';
import {createCharacterFace} from './character-face.js';
import {dressCultivator} from './character-costume.js';
import {styleCultivatorHair} from './character-hair.js';

export const CHARACTER_PROFILES = {
  player:{face:"hanli",costume:"disciple",robe:0xbfc5c3,inner:0x9a8968,trim:0x998666,edge:0x303e4a,leather:0x3b3028,hair:0x161514,skin:0xc8aa8c,ponytail:true,bottle:true,sword:true},
  ji:{face:"nangong",openCollar:true,robe:0xaa91aa,inner:0x52416b,trim:0xb6a278,edge:0x8e6997,sash:0x896985,hair:0x171820,skin:0xf0d8c9,female:true,longHair:true,ring:true,ornament:true},
  wen:{face:"wangchan",robe:0x302133,inner:0x671f3d,trim:0xae7384,hair:0x555863,hairGlint:0xa7acbc,skin:0xdecdd3,longHair:true,crown:true,eyes:0x912a48,shoulders:true},
  modafu:{face:"modafu",robe:0x594b3c,inner:0x333b36,hair:0x9b9b91,hairGlint:0xbcb9ad,skin:0xbba28a,beard:true,elder:true,longHair:true},
  lihuayuan:{robe:0x54756e,inner:0xd2c5a6,trim:0xb9a469,hair:0x747b78,beard:true,elder:true},
  yuan:{robe:0x8a8170,inner:0xe1d7b9,hair:0xb6b1a4,beard:true,elder:true,stout:true},
  song:{robe:0x796b4c,inner:0xb3a68a,hair:0xb1aaa0,beard:true,elder:true},
  yue:{robe:0x57958e,inner:0xc5d9cc,trim:0xc5b786,female:true,longHair:true,ornament:true},
  tao:{robe:0x90a77c,inner:0xe4d4b4,female:true,longHair:true,ornament:true},
  yan:{robe:0x9b3442,inner:0xd29c73,trim:0xcfb474,female:true,ponytail:true,ornament:true},
  mocaihuan:{face:"mocaihuan",robe:0x8ab5a0,inner:0xf0e6ce,trim:0xc4b081,female:true,longHair:true,ornament:true},
  yanshi:{robe:0x765d71,inner:0xdbb9c1,female:true,longHair:true,ornament:true},
  ning:{robe:0xa8a984,inner:0xe8dcc1,female:true,ponytail:true,ornament:true},
  lifeiyu:{face:"lifeiyu",robe:0x384454,inner:0xc2c3b8,trim:0x9f3f38,ponytail:true,sword:true},
  zhangtie:{face:"zhangtie",robe:0x75634a,inner:0x453d33,stout:true,shortRobe:true},
  trial_swordsman:{robe:0x6b7477,inner:0xc3b99d,stout:true,shortRobe:true,barefoot:true,giantSword:true},
  story_jinguang:{face:"jinguang",robe:0xb38b36,inner:0xe9d6a1,trim:0xc6ab65,hair:0x746c51,beard:true,elder:true,crown:true},
  qing:{robe:0x655770,inner:0xc6b8c9,longHair:true},
  gu:{robe:0x88794b,inner:0xe3dbc0,hair:0x8a8575,beard:true,elder:true},
  shen:{robe:0x776044,inner:0xc5b89d,stout:true},
  bai:{robe:0x657b60,inner:0xc4ceb2,hair:0x44493d,elder:true},
  qiao:{robe:0x87734b,inner:0xc8b58a,stout:true},
  shouque:{robe:0xa59ab2,inner:0xe5d7d9,female:true,longHair:true,ornament:true}
};


export function createCultivatorActor(THREE,{id='player',name=null,label,palette={},enemy=null}={}) {
  const p={robe:0x4c5e54,inner:0xaaa993,trim:0x9a8a63,hair:0x15181b,skin:0xc5a58f,...palette,...CHARACTER_PROFILES[id]};
  p.face||=p.female?'mocaihuan':p.elder?'modafu':p.stout?'zhangtie':'examiner';
  p.armed=Boolean(p.sword||p.giantSword||enemy||id==='wen');
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);body.name='cultivator-body';
  const m=characterMaterials(THREE,p),protectedNodes=new Set(),motions=[];
  const add=(parent,geometry,material,x=0,y=0,z=0,name='')=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=name;parent.add(mesh);return mesh;
  };
  const ellipsoid=(parent,material,position,scale,name='')=>{const mesh=add(parent,new THREE.SphereGeometry(1,16,12),material,...position,name);mesh.scale.set(...scale);return mesh;};
  const line=(parent,points,radius=.006,material=m.trim,name='')=>add(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),18,radius,4,false),material,0,0,0,name);
  const garment=(parent,sections,material=m.robe,options={})=>add(parent,loft(THREE,sections,options),material);
  // Seven-head proportions: shaped calves and boots, narrow waist, articulated shoulders.
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.x=side*(p.female?.115:.145);body.add(leg);
    garment(leg,[[.18,.06,.062],[.42,.067,.068],[.68,.075,.08],[.91,.105,.115],[1.24,.08,.085,-side*.025,0]],m.inner,{steps:24,segments:24,folds:.008,pleats:8});
    if(p.female){ellipsoid(leg,m.edge,[0,.07,.08],[.071,.056,.14]);}
    else if(p.barefoot)ellipsoid(leg,m.skin,[0,.09,.09],[.098,.085,.205]);
    else{
      garment(leg,[[.08,.105,.11,0,.055],[.16,.11,.12,0,.04],[.28,.077,.083],[.43,.09,.092]],m.leather,{steps:16,segments:24,folds:.003});
      ellipsoid(leg,m.leather,[0,.09,.11],[.094,.075,.178]);
      ellipsoid(leg,m.dark,[0,.035,.11],[.096,.023,.18]);
      line(leg,[[-.07,.28,.06],[-.045,.2,.13],[0,.17,.19],[.055,.15,.2]],.004,m.inner);
    }
  }
  const arms=dressCultivator(THREE,{body,p,m,add,line,ellipsoid,motions});
  if(!p.female)garment(body,[[1.96,.083,.074],[2.055,.071,.069],[2.11,.078,.073]],m.skin,{steps:16,segments:32});
  const head=new THREE.Group();head.name='anatomical-head';head.position.set(0,p.female?2.225:2.275,p.elder?.035:0);if(p.female)head.scale.setScalar(.92);head.rotation.x=.025;body.add(head);
  createCharacterFace(THREE,head,p,m.skin);
  for(const side of [-1,1]){
    ellipsoid(head,m.skin,[side*.151,-.008,.004],[.022,.044,.019]);
    line(head,[[side*.155,.024,.017],[side*.167,.011,.02],[side*.163,-.025,.016],[side*.152,-.036,.012]],.004,m.skin);
  }
  styleCultivatorHair(THREE,{head,p,m,add,line,ellipsoid,motions});
  let weapon;
  if(id==='wen'){
    weapon=add(arms[1],new THREE.CylinderGeometry(.019,.024,1.18,12),m.dark,.14,-.28,.09,'ghost-standard');
    add(arms[1],new THREE.TorusGeometry(.14,.018,8,32),m.trim,.14,.37,.09);
    add(arms[1],ribbon(THREE,[[.3,.23,.09],[.32,-.03,.09],[.29,-.31,.1]],.28),m.red);
  }else if(p.sword||p.giantSword||enemy){
    const length=p.giantSword?1.48:1.12,w=p.giantSword?.12:.038;
    const shape=new THREE.Shape();shape.moveTo(-w,-length/2);shape.lineTo(-w,length/2-.12);shape.lineTo(0,length/2);shape.lineTo(w,length/2-.12);shape.lineTo(w,-length/2);shape.closePath();
    weapon=add(arms[1],new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.006,bevelThickness:.006}),m.silver.clone(),.115,-.18,.095,p.giantSword?'giant-sword':'held-blade');
    add(arms[1],new THREE.BoxGeometry(p.giantSword?.28:.19,.027,.055),m.trim,.115,-.74,.11);
    add(arms[1],new THREE.CylinderGeometry(.024,.024,.17,12),m.dark,.115,-.825,.115);
  }
  if(weapon)protectedNodes.add(weapon);
  if(p.bottle){
    const bottle=new THREE.Group();bottle.name='green-bottle';bottle.position.set(-.27,1.18,.13);body.add(bottle);
    garment(bottle,[[-.13,.026,.022],[-.10,.052,.042],[-.045,.056,.045],[.008,.026,.023],[.055,.025,.023]],m.jade,{steps:24,segments:24});
    add(bottle,new THREE.CylinderGeometry(.029,.026,.027,16),m.trim,0,.065,0);
    line(body,[[-.27,1.27,.13],[-.3,1.34,.145],[-.24,1.35,.16]],.006,m.dark);
    const scabbard=add(body,new THREE.BoxGeometry(.055,.95,.055),m.dark,-.20,1.43,-.235);scabbard.rotation.z=-.25;
    add(body,new THREE.BoxGeometry(.19,.03,.08),m.trim,-.095,1.85,-.235);
    const tassel=new THREE.Group();tassel.position.set(.27,1.22,.13);body.add(tassel);
    line(tassel,[[0,0,0],[.012,-.1,.025],[0,-.19,.025]],.007,m.red);
    for(let i=0;i<8;i++)line(tassel,[[(i-3.5)*.004,-.18,.025],[(i-3.5)*.006,-.38,.03]],.003,m.red);
    motions.push({node:tassel,axis:'z',amount:.055,phase:2});
  }
  if(p.ring){
    const ring=add(arms[0],new THREE.TorusGeometry(.18,.017,12,48),m.trim,-.14,-.8,.11,'vermillion-ring');ring.rotation.x=.2;
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2;ellipsoid(arms[0],m.red,[-.14+Math.sin(a)*.18,-.8+Math.cos(a)*.18,.11],[.012,.012,.014]);}
  }
  if(p.elder){
    ellipsoid(body,m.leather,[.265,1.12,.04],[.085,.13,.065]);
    line(body,[[.23,1.3,.07],[.26,1.24,.08],[.28,1.18,.075]],.008,m.trim);
  }
  const shadow=add(root,new THREE.CircleGeometry(.55,32),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.20,depthWrite:false}),0,.022,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
  root.userData={id,body,head,leftArm:arms[0],rightArm:arms[1],baseY:0,weapon,profile:p,motions};
  if(name&&label){
    const plate=label(name,{width:230,font:37});plate.position.y=3.16;plate.material.depthWrite=false;plate.renderOrder=10;root.add(plate);root.userData.nameplate=plate;
    const leader=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,2.85,0),new THREE.Vector3(0,3.16,0)]),new THREE.LineBasicMaterial({color:0xb9ba90,transparent:true,opacity:.55,depthTest:false}));leader.visible=false;root.add(leader);root.userData.labelLeader=leader;
  }
  if(enemy){
    const bag=new THREE.Group();bag.visible=false;root.add(bag);root.userData.bag=bag;
    ellipsoid(bag,m.leather,[0,.25,0],[.23,.25,.18]);add(bag,new THREE.TorusGeometry(.10,.02,8,20),m.trim,0,.46,0).rotation.x=Math.PI/2;
    if(name&&label){const caption=label(enemy.rewardName||`${name} · 储物袋`,{width:290,font:28,color:'#f2d48c'});caption.position.y=1.65;bag.add(caption);}
  }
  for(const [i,arm] of arms.entries()){
    const rest=new THREE.Group();rest.name='relaxed-arm';rest.rotation.x=i===0?-.09:-.15;rest.rotation.y=i===0?.12:-.10;rest.rotation.z=i===0?.025:-.018;
    for(const child of [...arm.children])rest.add(child);arm.add(rest);
  }
  // An inner stance node gives the figure a relaxed weight shift without
  // overwriting the outer body/arm joints owned by combat and map movement.
  const stance=new THREE.Group();stance.name='natural-stance';stance.rotation.z=p.female?-.016:.009;
  for(const child of [...body.children])stance.add(child);body.add(stance);
  batchCharacterMeshes(THREE,body,protectedNodes);
  root.traverse(child=>{child.userData.personId=id;if(child.material===m.hair||child.material===m.hairGlint)child.receiveShadow=false;});
  return root;
}

export function animateCultivator(actor,time,moving=false){
  for(const {node,axis,amount,phase} of actor.userData.motions||[])node.rotation[axis]=Math.sin(time*(moving?5:1.7)+phase)*amount*(moving?1.7:1);
}

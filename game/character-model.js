// 以动画角色的剪影、衣装和法器为参照的程序化模型；地图与斗法共用同一套造型。
const PROFILES = {
  player:{robe:0x4f6971,inner:0xc3c8be,trim:0x8f987e,hair:0x171d20,skin:0xc8aa8c,ponytail:true,bottle:true,sword:true},
  ji:{robe:0xe6ddd8,inner:0xeee4d7,trim:0xaf5370,hair:0x171820,skin:0xf0d8c9,female:true,longHair:true,ring:true,ornament:true},
  wen:{robe:0x302133,inner:0x671f3d,trim:0xae7384,hair:0xd4c8d5,skin:0xdecdd3,longHair:true,crown:true,eyes:0x912a48,shoulders:true},
  modafu:{robe:0x594b3c,inner:0x333b36,hair:0xa9aaa0,skin:0xbba28a,beard:true,elder:true},
  lihuayuan:{robe:0x54756e,inner:0xd2c5a6,trim:0xb9a469,hair:0x747b78,beard:true,elder:true},
  yuan:{robe:0x8a8170,inner:0xe1d7b9,hair:0xb6b1a4,beard:true,elder:true,stout:true},
  song:{robe:0x796b4c,inner:0xb3a68a,hair:0xb1aaa0,beard:true,elder:true},
  yue:{robe:0x57958e,inner:0xc5d9cc,trim:0xc5b786,female:true,longHair:true,ornament:true},
  tao:{robe:0x90a77c,inner:0xe4d4b4,female:true,longHair:true,ornament:true},
  yan:{robe:0x9b3442,inner:0xd29c73,trim:0xcfb474,female:true,ponytail:true,ornament:true},
  mocaihuan:{robe:0x8ab5a0,inner:0xf0e6ce,trim:0xc4b081,female:true,longHair:true,ornament:true},
  yanshi:{robe:0x765d71,inner:0xdbb9c1,female:true,longHair:true,ornament:true},
  ning:{robe:0xa8a984,inner:0xe8dcc1,female:true,ponytail:true,ornament:true},
  lifeiyu:{robe:0x384454,inner:0xc2c3b8,trim:0x9f3f38,ponytail:true,sword:true},
  zhangtie:{robe:0x75634a,inner:0x453d33,stout:true,shortRobe:true},
  trial_swordsman:{robe:0x6b7477,inner:0xc3b99d,stout:true,shortRobe:true,barefoot:true,giantSword:true},
  story_jinguang:{robe:0xb38b36,inner:0xe9d6a1,trim:0xc6ab65,hair:0x746c51,beard:true,elder:true,crown:true},
  qing:{robe:0x655770,inner:0xc6b8c9,longHair:true},
  gu:{robe:0x88794b,inner:0xe3dbc0,hair:0x8a8575,beard:true,elder:true},
  shen:{robe:0x776044,inner:0xc5b89d,stout:true},
  bai:{robe:0x657b60,inner:0xc4ceb2,hair:0x44493d,elder:true},
  qiao:{robe:0x87734b,inner:0xc8b58a,stout:true},
  shouque:{robe:0xa59ab2,inner:0xe5d7d9,female:true,longHair:true,ornament:true}
};

export function createCultivatorActor(THREE,{id='player',name=null,label,palette={},enemy=null}={}) {
  const p={robe:0x63776b,inner:0xc4c4b0,trim:0xb2a17a,hair:0x232522,skin:0xcfaf92,...palette,...PROFILES[id]};
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const robe=mat(p.robe),inner=mat(p.inner),trim=mat(p.trim,.5,.32),skin=mat(p.skin,.83),hair=mat(p.hair,.58),leather=mat(0x282d2a);
  const add=(parent,geometry,material,x=0,y=0,z=0,name)=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
    if(name)mesh.name=name;parent.add(mesh);return mesh;
  };
  const ball=(parent,material,x,y,z,rx,ry,rz,name)=>{const mesh=add(parent,new THREE.SphereGeometry(1,16,12),material,x,y,z,name);mesh.scale.set(rx,ry,rz);return mesh;};
  const strand=(parent,points,radius,material=hair,name)=>add(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),12,radius,6,false),material,0,0,0,name);
  const width=p.female?.86:p.stout?1.15:1;
  // 腿、腰与肩分开塑形，避免圆锥长袍和圆头形成同样的剪影。
  for(const side of [-1,1]){
    add(body,new THREE.CylinderGeometry(.095,.085,.7,10),inner,side*.15,.61,0);
    ball(body,p.barefoot?skin:leather,side*.15,.14,.07,.12,.12,.24);
    if(!p.barefoot)add(body,new THREE.CylinderGeometry(.115,.12,.33,10),leather,side*.15,.32,0);
  }
  const hem=p.shortRobe?.8:.31;
  const skirt=add(body,new THREE.LatheGeometry([new THREE.Vector2(.46*width,hem),new THREE.Vector2(.42*width,.66),new THREE.Vector2(.31*width,1.04),new THREE.Vector2(.27*width,1.25)],28),robe);
  skirt.name='layered-robe';skirt.scale.z=.8;
  const under=add(body,new THREE.CylinderGeometry(.26*width,.39*width,.86,24),inner,0,.74,.015);under.scale.z=.77;
  const torso=add(body,new THREE.CylinderGeometry(.35*width,.27*width,.67,20),robe,0,1.52,0);torso.scale.z=.63;
  for(const side of [-1,1]){
    const lapel=add(body,new THREE.BoxGeometry(.08,.63,.035),inner,side*.105,1.57,.224);lapel.rotation.z=side*.36;
    const border=add(body,new THREE.BoxGeometry(.022,.65,.045),trim,side*.15,1.57,.23);border.rotation.z=side*.36;
    const fold=add(body,new THREE.BoxGeometry(.028,p.shortRobe?.38:.84,.028),trim,side*.28,.74,.29);fold.rotation.z=-side*.08;
  }
  const belt=add(body,new THREE.CylinderGeometry(.325*width,.33*width,.13,24),leather,0,1.17,0);belt.scale.z=.82;
  add(body,new THREE.BoxGeometry(.115,.12,.045),trim,0,1.17,.245);
  if(p.female){
    for(const side of [-1,1]){
      const ribbon=add(body,new THREE.BoxGeometry(.085,.73,.025),trim,side*.12,.77,.31);ribbon.rotation.z=-side*.13;
    }
  }
  add(body,new THREE.CylinderGeometry(.085,.105,.18,12),skin,0,1.96,0);
  const head=new THREE.Group();head.position.set(0,2.23,p.elder?.03:0);head.scale.setScalar(.9);body.add(head);
  ball(head,skin,0,0,0,p.female?.18:.198,.265,.176,'sculpted-face');
  ball(head,skin,0,-.135,.03,.135,.12,.137);
  for(const side of [-1,1]){
    ball(head,skin,side*.19,-.015,-.005,.032,.065,.04);
    const eye=ball(head,mat(0xd7cbbb),side*.078,.012,.156,.048,.016,.019);
    ball(head,mat(p.eyes||0x272b2b),side*.078,.012,.173,.018,.013,.01);
    const brow=add(head,new THREE.BoxGeometry(.086,.014,.018),hair,side*.078,.065,.159);brow.rotation.z=side*(p.crown?.22:.1);
    if(p.elder){const line=add(head,new THREE.BoxGeometry(.085,.008,.01),trim,side*.08,-.027,.162);line.rotation.z=-side*.12;}
  }
  ball(head,skin,0,-.04,.171,.028,.06,.037);
  add(head,new THREE.BoxGeometry(.065,.012,.017),mat(p.female?0x9c5d5a:0x8b6758),0,-.112,.164);
  const cap=add(head,new THREE.SphereGeometry(.211,20,14,0,Math.PI*2,0,Math.PI*.57),hair,0,.103,-.025);cap.scale.z=.95;
  for(const side of [-1,1]){
    strand(head,[[side*.018,.275,-.025],[side*.135,.2,.13],[side*.166,.035,.13],[side*.18,-.1,.065]],.029);
    strand(head,[[side*.12,.19,-.12],[side*.19,.02,-.08],[side*.18,-.17,-.07]],.033);
  }
  ball(head,hair,0,.29,-.07,.08,.09,.085);
  add(head,new THREE.CylinderGeometry(.083,.083,.045,12),trim,0,.3,-.07);
  if(p.longHair||p.ponytail){
    if(p.ponytail)strand(head,[[0,.24,-.15],[.05,.03,-.26],[.09,-.3,-.27],[.08,-.61,-.2]],.068,hair,'tied-ponytail');
    else for(const side of [-1,0,1])strand(head,[[side*.11,.1,-.16],[side*.15,-.2,-.21],[side*.16,-.52,-.19],[side*.13,-.8,-.12]],p.female?.07:.065,hair,'long-hair');
  }
  if(p.beard){
    const beard=add(head,new THREE.ConeGeometry(.07,.28,12),hair,0,-.26,.12,'elder-beard');beard.rotation.x=-.18;
    for(const side of [-1,1])strand(head,[[side*.02,-.1,.17],[side*.07,-.15,.17],[side*.07,-.21,.14]],.013);
  }
  if(p.ornament){
    for(const side of [-1,1]){
      const pin=add(head,new THREE.BoxGeometry(.17,.025,.035),trim,side*.19,.21,-.05);pin.rotation.z=side*.25;
      ball(head,inner,side*.25,.18,-.02,.045,.055,.035);
      strand(head,[[side*.26,.16,-.02],[side*.27,.02,-.02],[side*.25,-.07,-.01]],.009,trim);
    }
  }
  if(p.crown){
    const crown=new THREE.Group();crown.name='ghost-crown';head.add(crown);
    add(crown,new THREE.TorusGeometry(.17,.026,8,28),trim,0,.27,-.015).rotation.x=Math.PI/2;
    for(const side of [-1,0,1]){const spike=add(crown,new THREE.ConeGeometry(.04,.17+(side===0?.07:0),6),trim,side*.095,.36,-.02);spike.rotation.z=-side*.22;}
    ball(crown,mat(0xa52d55,.25,.3),0,.3,.14,.038,.052,.025);
  }
  const arms=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.33*width,1.77,0);body.add(arm);arms.push(arm);
    const sleeve=add(arm,new THREE.CylinderGeometry(.13,p.female?.2:.155,.61,16),robe,side*.09,-.27,0);sleeve.rotation.z=side*.18;
    const cuff=add(arm,new THREE.CylinderGeometry(.16,p.female?.21:.16,.07,16),inner,side*.14,-.57,.005);cuff.scale.z=.85;
    ball(arm,skin,side*.14,-.67,.015,.066,.1,.065);
    if(p.shoulders){const plate=ball(arm,trim,side*.035,.005,-.005,.19,.09,.19);plate.rotation.z=-side*.25;}
  }
  let weapon;
  if(id==='wen'){
    const arm=arms[1];
    weapon=add(arm,new THREE.CylinderGeometry(.027,.035,1.1,10),leather,.15,-.3,.17,'ghost-standard');
    add(arm,new THREE.TorusGeometry(.17,.032,8,24),trim,.15,.33,.17);
    const banner=add(arm,new THREE.BoxGeometry(.29,.55,.02),mat(0x732746),.29,-.02,.17);banner.rotation.z=-.08;
    add(arm,new THREE.BoxGeometry(.04,.22,.03),trim,.29,0,.19);
  }else if(p.sword||p.giantSword||enemy){
    const arm=arms[1],metal=mat(0xbac4c4,.28,.75),length=p.giantSword?1.45:1.02;
    weapon=add(arm,new THREE.BoxGeometry(p.giantSword?.19:.045,length,.045),metal,.16,-.13,.19,p.giantSword?'giant-sword':'held-blade');
    add(arm,new THREE.BoxGeometry(p.giantSword?.32:.22,.045,.075),trim,.16,-.65,.19);
    add(arm,new THREE.CylinderGeometry(.035,.035,.18,8),leather,.16,-.77,.19);
  }
  if(p.bottle){
    const bottle=new THREE.Group();bottle.name='green-bottle';bottle.position.set(-.29,1.02,.18);body.add(bottle);
    const jade=mat(0x719d72,.25,.2);ball(bottle,jade,0,0,0,.075,.105,.062);add(bottle,new THREE.CylinderGeometry(.028,.039,.075,12),jade,0,.11,0);add(bottle,new THREE.CylinderGeometry(.035,.035,.025,12),trim,0,.16,0);
    const sheath=add(body,new THREE.BoxGeometry(.075,1.25,.08),leather,-.16,1.51,-.26);sheath.rotation.z=-.27;
    add(body,new THREE.BoxGeometry(.24,.045,.09),trim,0,2.04,-.26);
  }
  if(p.ring){
    const ring=add(arms[0],new THREE.TorusGeometry(.24,.04,12,36),mat(0xc8a45b,.3,.65),-.17,-.7,.11,'vermillion-ring');ring.rotation.x=.25;
    ball(arms[0],mat(0xb94a49,.3),-.17,-.45,.12,.055,.07,.04);
  }
  const shadow=add(root,new THREE.CircleGeometry(.62,28),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.24,depthWrite:false}),0,.025,0);shadow.rotation.x=-Math.PI/2;
  root.userData={id,body,leftArm:arms[0],rightArm:arms[1],baseY:0,weapon,profile:p};
  if(name&&label){
    const plate=label(name,{width:230,font:37});plate.position.y=3.16;plate.material.depthWrite=false;plate.renderOrder=10;root.add(plate);root.userData.nameplate=plate;
    const leader=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,2.85,0),new THREE.Vector3(0,3.16,0)]),new THREE.LineBasicMaterial({color:0xb9ba90,transparent:true,opacity:.55,depthTest:false}));leader.visible=false;root.add(leader);root.userData.labelLeader=leader;
  }
  if(enemy){
    const bag=new THREE.Group();bag.visible=false;root.add(bag);root.userData.bag=bag;
    ball(bag,mat(0x977746),0,.3,0,.25,.3,.21);add(bag,new THREE.TorusGeometry(.12,.03,8,16),trim,0,.55,0).rotation.x=Math.PI/2;
    if(name&&label){const caption=label(enemy.rewardName||`${name} · 储物袋`,{width:290,font:28,color:'#f2d48c'});caption.position.y=1.65;bag.add(caption);}
  }
  root.traverse(child=>{child.userData.personId=id;});
  return root;
}

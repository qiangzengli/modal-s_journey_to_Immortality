import {loft,ribbon,lockGeometry,batchCharacterMeshes,surfaceGeometry} from './character-geometry.js';
import {characterMaterials} from './character-materials.js';
import {createCharacterFace} from './character-face.js';

export const CHARACTER_PROFILES = {
  player:{face:"hanli",robe:0x344a56,inner:0xa9b8b9,trim:0x8f8e6b,hair:0x171d20,skin:0xc8aa8c,ponytail:true,bottle:true,sword:true},
  ji:{face:"nangong",openCollar:true,robe:0xa591bb,inner:0x564778,trim:0xb5a470,sash:0x8a678b,hair:0x171820,skin:0xf0d8c9,female:true,longHair:true,ring:true,ornament:true},
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
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);body.name='cultivator-body';
  const m=characterMaterials(THREE,p),protectedNodes=new Set(),motions=[];
  const add=(parent,geometry,material,x=0,y=0,z=0,name='')=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=name;parent.add(mesh);return mesh;
  };
  const ellipsoid=(parent,material,position,scale,name='')=>{const mesh=add(parent,new THREE.SphereGeometry(1,16,12),material,...position,name);mesh.scale.set(...scale);return mesh;};
  const line=(parent,points,radius=.006,material=m.trim,name='')=>add(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),18,radius,4,false),material,0,0,0,name);
  const garment=(parent,sections,material=m.robe,options={})=>add(parent,loft(THREE,sections,options),material);
  const width=p.female?.85:p.stout?1.18:1;
  // Seven-head proportions: shaped calves and boots, narrow waist, articulated shoulders.
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.x=side*.145;body.add(leg);
    garment(leg,[[.18,.075,.08],[.42,.085,.087],[.68,.065,.075],[.91,.105,.115],[1.24,.08,.085,-side*.025,0]],m.inner,{steps:24,segments:24,folds:.008,pleats:8});
    if(p.barefoot)ellipsoid(leg,m.skin,[0,.09,.09],[.098,.085,.205]);
    else{
      garment(leg,[[.08,.105,.11,0,.055],[.16,.11,.12,0,.04],[.28,.077,.083],[.43,.087,.089]],m.leather,{steps:16,segments:24,folds:.003});
      ellipsoid(leg,m.leather,[0,.09,.11],[.103,.085,.2]);
      ellipsoid(leg,m.dark,[0,.035,.11],[.105,.027,.203]);
      line(leg,[[-.07,.28,.06],[-.045,.2,.13],[0,.17,.19],[.055,.15,.2]],.004,m.inner);
    }
  }
  const hem=p.shortRobe?.83:.26;
  const innerSkirt=garment(body,[[.17,.37*width,.245],[.38,.36*width,.23],[.75,.273*width,.18],[1.08,.22*width,.145],[1.35,.215*width,.13]],m.inner,{folds:.016,pleats:18});
  innerSkirt.name='inner-pleated-robe';
  const outerSkirt=garment(body,[[hem,.43*width,.27],[.53,.405*width,.255],[.92,.31*width,.21],[1.18,.25*width,.17],[1.36,.235*width,.155]],m.robe,{start:.29,end:Math.PI*2-.29,folds:.019,pleats:p.female?18:14,steps:44,segments:56});
  outerSkirt.name='layered-robe';
  for(const side of [-1,1]){
    line(body,[[side*.071,1.36,.159],[side*.08,1.13,.174],[side*.105,.76,.238],[side*.125,hem,.275]],.008,m.trim);
  }
  garment(body,[[hem,.432*width,.274],[hem+.045,.433*width,.276]],m.sash,{start:.29,end:Math.PI*2-.29,steps:3,segments:56,folds:.019,pleats:p.female?18:14,foldRange:[hem,1.36]});
  // Rounded chest is built as a continuous fitted garment, not stacked cylinders.
  garment(body,[[1.29,.235*width,.15],[1.47,.25*width,.17],[1.7,.30*width,.19],[1.87,.34*width,.165],[1.96,.28*width,.128],[2.035,.09,.095]],m.robe,{start:.66,end:Math.PI*2-.66,steps:32,segments:48,folds:.004});
  if(p.openCollar){
    garment(body,[[1.32,.232*width,.155],[1.63,.29*width,.185],[1.79,.30*width,.174]],m.inner,{start:-.70,end:.70,steps:24,segments:24,folds:.003});
    garment(body,[[1.785,.30*width,.173],[1.88,.28*width,.155],[1.96,.22*width,.11],[2.035,.083,.083]],m.skin,{start:-.64,end:.64,steps:20,segments:24});
  }else garment(body,[[1.32,.232*width,.155],[1.63,.29*width,.185],[1.82,.30*width,.17],[1.95,.235*width,.12],[2.035,.083,.083]],m.inner,{start:-.70,end:.70,steps:32,segments:24,folds:.003});
  if(p.openCollar){
    add(body,ribbon(THREE,[[-.22,1.79,.168],[0,1.8,.203],[.22,1.79,.168]],.055),m.sash);
    for(const side of [-1,1]){
      add(body,ribbon(THREE,[[side*.12,2.005,.09],[side*.23,1.82,.17],[side*.18,1.57,.182],[side*.13,1.34,.17]],.055),m.sash);
      line(body,[[side*.13,2.005,.1],[side*.245,1.82,.18],[side*.21,1.57,.19],[side*.16,1.34,.177]],.006,m.trim);
    }
  }else{
    for(const side of [-1,1]){
      const pts=[[side*.09,2.015,.092],[side*.16,1.9,.154],[side*.10,1.72,.207],[-side*.08,1.45,.176]];
      add(body,ribbon(THREE,pts,.065),m.inner);
      line(body,pts.map(([x,y,z])=>[x+side*.027,y,z+.01]),.006,m.trim);
    }
  }
  garment(body,[[1.27,.248*width,.17],[1.31,.249*width,.175],[1.38,.247*width,.17]],p.female?m.sash:m.leather,{steps:8,segments:48,folds:.002});
  for(let j=0;j<3;j++)line(body,[[-.21*width,1.29+j*.03,.09],[0,1.29+j*.03,.179],[.21*width,1.29+j*.03,.09]],.003,p.female?m.trim:m.dark);
  const buckle=add(body,new THREE.TorusGeometry(.038,.009,6,20),m.trim,0,1.325,.187);buckle.scale.x=1.35;
  // Sewn leaf embroidery follows the shoulders and hem in 3D.
  for(const side of [-1,1])for(let i=0;i<4;i++){
    const x=side*(.23+i*.018),y=1.88-i*.045,z=.154+i*.011;
    line(body,[[x,y,z],[x+side*.027,y+.025,z+.008],[x+side*.041,y+.011,z+.004]],.003,m.trim);
    line(body,[[side*(.2+i*.035),hem+.14,.264],[side*(.22+i*.035),hem+.175,.267],[side*(.24+i*.035),hem+.14,.265]],.003,m.trim);
  }
  // Folded fabric belt tails hang free from the hips, so their backs remain visible in orbit.
  for(const side of [-1,1]){
    const sash=new THREE.Group();sash.position.set(side*.13,1.29,.205);body.add(sash);
    add(sash,ribbon(THREE,[[0,0,0],[side*.014,-.24,.035],[side*.045,-.48,.06],[side*.07,-.71,.075]],p.female?.065:.042),p.female?m.sash:m.inner);
    motions.push({node:sash,axis:'x',amount:.045,phase:side});
  }
  garment(body,[[1.98,.085,.077],[2.075,.073,.074],[2.15,.077,.071]],m.skin,{steps:10,segments:24});
  const head=new THREE.Group();head.name='anatomical-head';head.position.set(0,2.335,p.elder?.035:0);body.add(head);
  createCharacterFace(THREE,head,p,m.skin);
  // Ears, hairline, complete crown/back of skull; no face or hair billboards.
  for(const side of [-1,1]){
    ellipsoid(head,m.skin,[side*.154,-.006,.002],[.025,.047,.022]);
    line(head,[[side*.158,.025,.014],[side*.174,.015,.017],[side*.173,-.018,.016],[side*.158,-.039,.01]],.006,m.skin);
  }
  const capVertices=[],capUV=[],capIndices=[],capSides=48,capRows=22;
  for(let j=0;j<=capRows;j++)for(let i=0;i<=capSides;i++){
    const a=i/capSides*Math.PI*2,v=j/capRows,theta=v*(1.0+1.6*(1-Math.cos(a))/2);
    capVertices.push(.178*Math.sin(theta)*Math.sin(a),.055+.225*Math.cos(theta),.003+.187*Math.sin(theta)*Math.cos(a));capUV.push(i/capSides,v);
    if(i<capSides&&j<capRows){const k=j*(capSides+1)+i;capIndices.push(k,k+capSides+1,k+1,k+1,k+capSides+1,k+capSides+2);}
  }
  add(head,surfaceGeometry(THREE,capVertices,capUV,capIndices),m.hair,0,0,0,'hair-cap');
  // Swept hairline, separated locks and fine highlights give the silhouette real depth.
  for(let i=0;i<40;i++){
    const a=(i+.5)/40*Math.PI*2,points=[];
    for(let j=0;j<=8;j++){
      const theta=(.16+j*.1)*(1.0+1.6*(1-Math.cos(a))/2);
      points.push([.179*Math.sin(theta)*Math.sin(a),.055+.226*Math.cos(theta),.003+.188*Math.sin(theta)*Math.cos(a)]);
    }
    line(head,points,.0008,m.hairGlint);
  }
  for(const side of [-1,1])add(head,lockGeometry(THREE,[[side*.145,.11,.055],[side*.16,.02,.035],[side*.154,-.12,.012]],.013,.007),m.hair);
  const bun=ellipsoid(head,m.hair,[0,.27,-.07],[p.female?.084:.066,.085,.065],'tied-hair-bun');
  if(!p.female)garment(head,[[.222,.067,.059,0,-.07],[.248,.065,.058,0,-.07]],m.trim,{steps:3,segments:28});
  if(p.longHair||p.ponytail||p.elder){
    const longHair=new THREE.Group();longHair.name=p.ponytail?'tied-ponytail':'long-hair';longHair.position.set(0,.23,-.095);head.add(longHair);
    const count=p.ponytail?9:15;
    for(let i=0;i<count;i++){
      const spread=(i/(count-1)-.5)*(p.ponytail?.10:.27);
      const pts=[[spread*.25,0,0],[spread,-.17,-.12],[spread*1.2+.018,-.47,-.19],[spread*.8+.045,-.85+(i%3)*.026,-.20],[spread*.65+.075,-(p.ponytail?1.02:1.25)+(i%4)*.025,-.17]];
      add(longHair,lockGeometry(THREE,pts,p.ponytail?.019:.021,.012),m.hair);

    }
    motions.push({node:longHair,axis:'x',amount:.04,phase:.5});
    if(p.female)for(const side of [-1,1])add(head,lockGeometry(THREE,[[side*.14,.1,.015],[side*.157,-.16,.085],[side*.16,-.42,.135],[side*.185,-.64,.13]],.014,.008),m.hair);
  }
  if(p.beard){
    const beard=new THREE.Group();beard.name='elder-beard';head.add(beard);
    for(let i=-4;i<=4;i++){
      const x=i*.009;
      add(beard,lockGeometry(THREE,[[x,-.145,.105],[x*1.05,-.2,.105],[x*.7,-.29,.08],[x*.32,-.38,.04]],.012,.007,{steps:18,sides:6}),m.hair);
    }
    for(const side of [-1,1])for(let i=0;i<3;i++)add(head,lockGeometry(THREE,[[side*.015,-.092,.137],[side*.046,-.11,.129],[side*(.061+i*.005),-.17,.105]],.006,.004,{steps:12,sides:6}),m.hair);
  }
  if(p.ornament){
    for(const side of [-1,1]){
      line(head,[[side*.07,.24,-.065],[side*.15,.235,-.08],[side*.23,.27,-.07]],.007,m.trim);
      for(let i=0;i<3;i++){
        const petal=ellipsoid(head,m.trim,[side*(.17+i*.024),.251+i*.013,-.068],[.023,.009,.012]);petal.rotation.z=side*.7;
      }
      line(head,[[side*.22,.248,-.07],[side*.23,.13,-.057],[side*.222,.037,-.05]],.003,m.trim);
      ellipsoid(head,m.jade,[side*.222,.017,-.05],[.01,.022,.01]);
      ellipsoid(head,m.trim,[side*.169,-.04,.016],[.007,.017,.007]);
    }
  }
  if(p.crown&&id!=='wen'){
    const crown=new THREE.Group();crown.name='ghost-crown';head.add(crown);
    for(const side of [-1,0,1]){
      add(crown,lockGeometry(THREE,[[side*.063,.22,.015],[side*.07,.28,.02],[side*.09,.35+(side===0?.035:0),.005]],.018,.008,{steps:14,sides:6}),m.trim);
    }
    ellipsoid(crown,m.red,[0,.265,.037],[.023,.036,.013]);
  }
  if(id==='wen'){
    const clasp=new THREE.Group();clasp.name='ghost-crown';head.add(clasp);
    line(clasp,[[-.06,.24,-.07],[0,.27,-.09],[.06,.24,-.07]],.009,m.silver);
    // The Yanbao appearance uses a patterned half-mask and swept silver-dark hair.
    for(const side of [-1,1])line(head,[[side*.012,.23,-.07],[side*.09,.205,.12],[side*.148,.09,.13],[side*.157,-.12,.015]],.008,m.silver);
  }
  const arms=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.30*width,1.91,0);body.add(arm);arms.push(arm);
    ellipsoid(arm,m.robe,[0,-.055,0],[.122,.115,.131]);
    garment(arm,[[-.71,.15,.13,side*.14,.025],[-.64,p.female?.205:.155,.14,side*.14,.01],[-.43,p.female?.165:.12,.12,side*.12,0],[-.2,.105,.125,side*.075,0],[.02,.12,.13,0,0]],m.robe,{segments:32,steps:32,folds:.009,pleats:8});
    garment(arm,[[-.72,.153,.133,side*.14,.025],[-.67,.16,.14,side*.14,.025]],m.inner,{steps:5,segments:32});
    garment(arm,[[-.665,.163,.142,side*.14,.025],[-.648,.166,.145,side*.14,.025]],m.trim,{steps:3,segments:32});
    const hand=new THREE.Group();hand.position.set(side*.14,-.77,.025);arm.add(hand);
    ellipsoid(hand,m.skin,[0,0,0],[.052,.066,.032]);
    for(let finger=0;finger<4;finger++){
      const x=(finger-1.5)*.023;line(hand,[[x,-.025,.004],[x,-.074,.012],[x+side*.005,-.105+(finger===0||finger===3?.013:0),.025]],.011,m.skin);
      ellipsoid(hand,m.inner,[x,-.087,.029],[.006,.012,.0015]);
    }
    line(hand,[[side*-.037,.01,.006],[side*-.068,-.016,.024],[side*-.061,-.046,.035]],.014,m.skin);
    if(p.shoulders)for(let i=0;i<3;i++){
      const plate=ellipsoid(arm,m.silver,[side*(.018+i*.028),-.018-i*.035,0],[.14-i*.012,.055,.14]);plate.rotation.z=-side*.3;
    }
  }
  let weapon;
  if(id==='wen'){
    weapon=add(arms[1],new THREE.CylinderGeometry(.019,.024,1.18,12),m.dark,.14,-.28,.09,'ghost-standard');
    add(arms[1],new THREE.TorusGeometry(.14,.018,8,32),m.trim,.14,.37,.09);
    add(arms[1],ribbon(THREE,[[.3,.23,.09],[.32,-.03,.09],[.29,-.31,.1]],.28),m.red);
  }else if(p.sword||p.giantSword||enemy){
    const length=p.giantSword?1.48:1.12,w=p.giantSword?.12:.038;
    const shape=new THREE.Shape();shape.moveTo(-w,-length/2);shape.lineTo(-w,length/2-.12);shape.lineTo(0,length/2);shape.lineTo(w,length/2-.12);shape.lineTo(w,-length/2);shape.closePath();
    weapon=add(arms[1],new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.006,bevelThickness:.006}),m.silver,.14,-.15,.095,p.giantSword?'giant-sword':'held-blade');
    add(arms[1],new THREE.BoxGeometry(p.giantSword?.28:.19,.027,.055),m.trim,.14,-.72,.11);
    add(arms[1],new THREE.CylinderGeometry(.024,.024,.17,12),m.dark,.14,-.815,.115);
  }
  if(weapon)protectedNodes.add(weapon);
  if(p.bottle){
    const bottle=new THREE.Group();bottle.name='green-bottle';bottle.position.set(-.27,1.18,.13);body.add(bottle);
    garment(bottle,[[-.13,.026,.022],[-.10,.052,.042],[-.045,.056,.045],[.008,.026,.023],[.055,.025,.023]],m.jade,{steps:24,segments:24});
    add(bottle,new THREE.CylinderGeometry(.029,.026,.027,16),m.trim,0,.065,0);
    line(body,[[-.27,1.27,.13],[-.3,1.34,.145],[-.24,1.35,.16]],.006,m.dark);
    const scabbard=add(body,new THREE.BoxGeometry(.06,1.25,.065),m.dark,-.13,1.60,-.235);scabbard.rotation.z=-.25;
    add(body,new THREE.BoxGeometry(.19,.03,.08),m.trim,.014,2.12,-.235);
    const tassel=new THREE.Group();tassel.position.set(.27,1.22,.13);body.add(tassel);
    line(tassel,[[0,0,0],[.012,-.1,.025],[0,-.19,.025]],.007,m.red);
    for(let i=0;i<8;i++)line(tassel,[[(i-3.5)*.004,-.18,.025],[(i-3.5)*.006,-.38,.03]],.003,m.red);
    motions.push({node:tassel,axis:'z',amount:.055,phase:2});
  }
  if(p.ring){
    const ring=add(arms[0],new THREE.TorusGeometry(.23,.024,12,48),m.trim,-.14,-.8,.11,'vermillion-ring');ring.rotation.x=.2;
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2;ellipsoid(arms[0],m.red,[-.14+Math.sin(a)*.23,-.8+Math.cos(a)*.23,.11],[.018,.018,.02]);}
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
  batchCharacterMeshes(THREE,body,protectedNodes);
  root.traverse(child=>{child.userData.personId=id;if(child.material===m.hair||child.material===m.hairGlint)child.receiveShadow=false;});
  return root;
}

export function animateCultivator(actor,time,moving=false){
  for(const {node,axis,amount,phase} of actor.userData.motions||[])node.rotation[axis]=Math.sin(time*(moving?5:1.7)+phase)*amount*(moving?1.7:1);
}

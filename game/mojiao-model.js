// Procedural beast geometry; shared by the map and the combat scene.
export function createMojiaoActor(THREE,{id='story_mojiao',name,label}={}) {
  const root=new THREE.Group(),body=new THREE.Group(),bag=new THREE.Group();root.add(body,bag);bag.visible=false;
  const scales=new THREE.MeshStandardMaterial({color:0x28494d,roughness:.42,metalness:.3});
  const ridge=new THREE.MeshStandardMaterial({color:0x6d9391,roughness:.55});
  const ivory=new THREE.MeshStandardMaterial({color:0xc9c4a2,roughness:.6});
  const eyes=new THREE.MeshStandardMaterial({color:0xffb24d,emissive:0x9c3c0a,emissiveIntensity:.7});
  function mesh(parent,geometry,material,x,y,z){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const curve=new THREE.CatmullRomCurve3([[-.7,.2,-1.7],[-1,.4,-1.1],[.5,.65,-.8],[.65,1.1,0],[0,1.7,.3],[0,2.1,.65]].map(v=>new THREE.Vector3(...v)));
  const trunk=mesh(body,new THREE.TubeGeometry(curve,48,.32,10,false),scales,0,0,0);trunk.name='serpent-body';
  const head=mesh(body,new THREE.SphereGeometry(.43,16,12),scales,0,2.15,.72);head.scale.set(1,.8,1.3);head.name='dragon-head';
  const snout=mesh(body,new THREE.SphereGeometry(.3,12,8),ridge,0,2.02,1.12);snout.scale.set(1,.55,1.25);
  for(const side of [-1,1]){
    mesh(body,new THREE.SphereGeometry(.065,8,6),eyes,side*.33,2.28,.96);
    const horn=mesh(body,new THREE.ConeGeometry(.11,.63,9),ivory,side*.27,2.62,.55);horn.rotation.z=side*-.35;horn.rotation.x=-.35;
    const fang=mesh(body,new THREE.ConeGeometry(.045,.2,7),ivory,side*.2,1.91,1.23);fang.rotation.z=Math.PI;
  }
  for(let i=0;i<15;i++){
    const point=curve.getPoint(i/16),spine=mesh(body,new THREE.ConeGeometry(.1,.25,6),ridge,point.x,point.y+.33,point.z);spine.rotation.x=-.35;
  }
  const leftArm=new THREE.Group(),rightArm=new THREE.Group();
  for(const [arm,side]of [[leftArm,-1],[rightArm,1]]){
    body.add(arm);arm.position.set(side*.3,1.4,.3);
    const limb=mesh(arm,new THREE.CylinderGeometry(.11,.16,.65,8),scales,side*.22,-.16,.08);limb.rotation.z=side*.8;
    for(let i=0;i<3;i++){const claw=mesh(arm,new THREE.ConeGeometry(.045,.25,6),ivory,side*(.38+i*.06),-.43,.18+i*.11);claw.rotation.x=Math.PI/2;}
  }
  const shadow=mesh(root,new THREE.CircleGeometry(1.5,32),new THREE.MeshBasicMaterial({color:0x071717,transparent:true,opacity:.3,depthWrite:false}),0,.025,-.25);shadow.rotation.x=-Math.PI/2;
  const fruit=mesh(bag,new THREE.SphereGeometry(.25,12,8),new THREE.MeshStandardMaterial({color:0xe8ba63,emissive:0x70441c,emissiveIntensity:.4}),0,.55,0);fruit.name='quest-fruit';
  mesh(bag,new THREE.CylinderGeometry(.5,.7,.3,12),ridge,0,.15,0);
  let nameplate,labelLeader;
  if(name&&label){
    nameplate=label(name,{width:230,font:37});nameplate.position.y=3.4;nameplate.renderOrder=10;nameplate.material.depthWrite=false;root.add(nameplate);
    labelLeader=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,2.85,0),new THREE.Vector3(0,3.4,0)]),new THREE.LineBasicMaterial({color:0x9abdb5,transparent:true,opacity:.55,depthTest:false}));labelLeader.visible=false;root.add(labelLeader);
    const caption=label('天灵果 · 待收取',{width:290,font:28,color:'#f2d48c'});caption.position.y=1.8;bag.add(caption);
  }
  root.userData={id,kind:'beast',body,leftArm,rightArm,bag,nameplate,labelLeader,baseY:0};
  root.traverse(child=>{child.userData.personId=id;});
  return root;
}

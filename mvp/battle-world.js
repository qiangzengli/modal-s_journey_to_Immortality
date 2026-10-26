import * as THREE from '/vendor/three.module.js';
import { WANDERERS } from './combat-data.js';

// 独立斗法场景与相机。主地图的人物、位置和镜头不参与战斗动画。
export function createBattleWorld(renderer, makePerson) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14232b);
  scene.fog = new THREE.Fog(0x14232b, 24, 58);
  const camera = new THREE.OrthographicCamera(-12,12,6,-6,.1,100);
  scene.add(new THREE.HemisphereLight(0xb9dfef,0x283b32,2.2));
  const sun = new THREE.DirectionalLight(0xf9deb1,3.6);
  sun.position.set(-5,12,7);scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8ab9dc,2.2);
  rim.position.set(6,5,-7);scene.add(rim);
  function mesh(geometry, color, x=0,y=0,z=0, basic=false) {
    const object=new THREE.Mesh(geometry,basic?new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75}):new THREE.MeshStandardMaterial({color,roughness:.8}));
    object.position.set(x,y,z);scene.add(object);return object;
  }
  function ring(radius,color,y=.075) {
    const object=mesh(new THREE.RingGeometry(radius-.025,radius+.025,96),color,0,y,0,true);
    object.material.side=THREE.DoubleSide;object.rotation.x=-Math.PI/2;return object;
  }
  function caption(text,color='#e9d7aa',width=280) {
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=90;
    const ctx=canvas.getContext('2d');ctx.font='600 38px "Songti SC", serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowColor='#08171a';ctx.shadowBlur=10;ctx.fillStyle=color;ctx.fillText(text,width/2,45);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));sprite.scale.set(width/110,.82,1);return sprite;
  }
  mesh(new THREE.CylinderGeometry(7.7,8.2,.7,64),0x42564f,0,-.4,0);
  mesh(new THREE.CylinderGeometry(7.4,7.4,.08,64),0x536259,0,0,0);
  ring(7.2,0xc7b483);const outer=ring(6.5,0x8db5b2);ring(4.6,0xc2b58b);ring(1.2,0xb3c0a0);
  const diagram=new THREE.Group();scene.add(diagram);
  for(let i=0;i<8;i++) {
    const angle=i*Math.PI/4;
    const rune=caption(['乾','坤','震','巽','坎','离','艮','兑'][i],'#c1bd92',100);
    rune.position.set(Math.cos(angle)*5.7,.12,Math.sin(angle)*5.7);rune.scale.set(.65,.65,1);diagram.add(rune);
    const stone=mesh(new THREE.CylinderGeometry(.36,.5,1.1+(i%2)*.6,5),0x435851,Math.cos(angle)*8.1,.4,Math.sin(angle)*8.1);
    stone.rotation.y=angle;
    mesh(new THREE.OctahedronGeometry(.18),0xb6d1b5,Math.cos(angle)*8.1,1.3+(i%2)*.3,Math.sin(angle)*8.1,true);
  }
  const floor=mesh(new THREE.PlaneGeometry(140,140),0x1b3032,0,-1.2,0);floor.rotation.x=-Math.PI/2;
  for(let i=0;i<18;i++) {
    const angle=i*.8;
    mesh(new THREE.ConeGeometry(2.5+(i%4),5+(i%6),5),0x233a3d,Math.cos(angle)*24,-.8,Math.sin(angle)*24);
  }
  const motes=new THREE.BufferGeometry();
  const points=new Float32Array(120*3);
  for(let i=0;i<120;i++){points[i*3]=Math.sin(i*13.7)*13;points[i*3+1]=.5+(i%17)*.3;points[i*3+2]=Math.cos(i*7.8)*13;}
  motes.setAttribute('position',new THREE.BufferAttribute(points,3));
  const dust=new THREE.Points(motes,new THREE.PointsMaterial({color:0xcbd6b0,size:.045,transparent:true,opacity:.7}));scene.add(dust);
  const player=makePerson('player',null);scene.add(player);
  const enemies=Object.fromEntries(WANDERERS.map(enemy=>{
    const actor=makePerson(enemy.id,null);scene.add(actor);actor.userData.bag.visible=false;actor.visible=false;return [enemy.id,actor];
  }));
  const playerName=caption('你 · 持剑');playerName.position.set(-3,3.6,0);scene.add(playerName);
  let enemyName=null;
  const arc=mesh(new THREE.TorusGeometry(1.0,.055,6,36,Math.PI*1.3),0xe6d1a3,0,1.2,0,true);arc.visible=false;
  const ward=ring(.85,0x87c5d3,.11);ward.visible=false;
  let view=null, width=1200,height=800, animation=null;
  const effects=[];
  function showNumber(text,side,color) {
    const sprite=caption(text,color,240);sprite.position.set(side==='player'?player.position.x:enemies[view.battle.enemyId].position.x,3,0);
    scene.add(sprite);effects.push({sprite,start:performance.now()});
  }
  function resize(w,h) {
    width=w;height=h;
    const lens=width<700?12:10.5;
    const aspect=width/height;
    camera.left=-lens*aspect/2;camera.right=lens*aspect/2;camera.top=lens/2;camera.bottom=-lens/2;camera.updateProjectionMatrix();
    camera.position.set(0,8.5,15);camera.lookAt(0,width<700?-.3:-.6,0);
  }
  function sync(next) {
    const previousId=view?.battle?.enemyId;
    view=next;
    if(!view.battle){
      animation?.finish();
      for(const {sprite} of effects){scene.remove(sprite);sprite.material.map.dispose();sprite.material.dispose();}
      effects.length=0;
      return;
    }
    if(previousId!==view.battle.enemyId){
      if(enemyName){scene.remove(enemyName);enemyName.material.map.dispose();enemyName.material.dispose();}
      enemyName=caption(view.battle.enemyName,'#e2b39b');scene.add(enemyName);
    }
    for(const [id,actor] of Object.entries(enemies))actor.visible=id===view.battle.enemyId;
    const color=next.weapon.attack>=11?0xe3a075:next.weapon.attack>=5?0xadd7a6:0xd8c38f;
    player.userData.weapon.material.color.setHex(color);
    resize(width,height);
  }
  function react(before,after,choice) {
    if(!before.battle)return Promise.resolve();
    if(animation)animation.finish();
    const entries=after.battle?.log.filter(entry=>entry.round===before.battle.round)||[];
    return new Promise(resolve=>{
      let timer;
      const finish=()=>{clearTimeout(timer);if(animation?.finish===finish)animation=null;arc.visible=false;ward.visible=false;resolve();};
      animation={start:performance.now(),choice,entries,playerShown:false,enemyShown:false,finish};
      // 切到后台也能结束表现，避免动画阻塞下一次操作。
      timer=setTimeout(finish,1250);
    });
  }
  function render(elapsed) {
    if(!view?.battle)return;
    const enemy=enemies[view.battle.enemyId];
    const gap=width<700?1.55:2.8;
    player.position.set(-gap,.055,0);enemy.position.set(gap,.055,0);
    player.rotation.y=Math.PI/2;enemy.rotation.y=-Math.PI/2;
    player.userData.body.rotation.z=0;
    enemy.userData.body.rotation.z=view.battle.status==='won'?-.45:0;
    for(const actor of [player,enemy]){
      actor.userData.body.position.y=Math.sin(elapsed*2.3)*.025;
      actor.userData.rightArm.rotation.z=Math.sin(elapsed*1.8)*.06;
      actor.userData.leftArm.rotation.z=-.08;
    }
    playerName.position.set(-gap,3.3,0);enemyName.position.set(gap,3.3,0);
    playerName.visible=width>=700;enemyName.visible=width>=700;
    if(animation){
      const t=(performance.now()-animation.start)/1100;
      const line=animation.entries.find(entry=>entry.side==='player')?.text||'';
      const enemyLine=animation.entries.find(entry=>entry.side==='enemy')?.text||'';
      const attacking=line.includes('伤害');
      const counter=enemyLine.includes('损失');
      if(attacking){
        player.position.x+=Math.sin(Math.min(1,t*2)*Math.PI)*.85;
        player.userData.rightArm.rotation.z=-Math.sin(Math.min(1,t*2)*Math.PI)*1.2;
        arc.visible=t>.12&&t<.48;arc.position.set(gap-.3,1.25,0);arc.rotation.set(.3,t*9,-.2);
        arc.material.color.setHex(animation.choice.move==='skill'?0x92ccdf:animation.choice.move==='item'?0xbf9ee4:0xe4cf93);
      }else{ward.visible=t<.5;ward.position.x=-gap;ward.material.color.setHex(animation.choice.move==='guard'?0x91c5db:0xa1d4a6);}
      if(counter){enemy.position.x-=Math.sin(Math.max(0,Math.min(1,(t-.5)*2))*Math.PI)*.8;enemy.userData.rightArm.rotation.z=-Math.sin(Math.max(0,Math.min(1,(t-.5)*2))*Math.PI)*1.2;}
      if(t>.23&&!animation.playerShown){
        animation.playerShown=true;
        const hit=line.match(/造成 (\d+) 点/);const heal=line.match(/恢复 (\d+) (气血|真气)/);
        if(hit)showNumber(`−${hit[1]}`,'enemy','#efba87');else if(heal)showNumber(`+${heal[1]} ${heal[2]}`,'player','#a8dfb3');else if(animation.choice.move==='guard')showNumber('凝气防御','player','#a5d6e3');else if(animation.choice.move==='escape')showNumber(view.battle.status==='escaped'?'脱身成功':'退路被封','player','#e8d2a0');
      }
      if(t>.73&&!animation.enemyShown){
        animation.enemyShown=true;const hurt=enemyLine.match(/损失 (\d+) 气血/);const heal=enemyLine.match(/恢复 (\d+) 气血/);
        if(hurt)showNumber(`−${hurt[1]}`,'player','#eeac94');else if(heal)showNumber(`+${heal[1]}`,'enemy','#a8dfb3');
      }
      if(t>=1)animation.finish();
    }
    for(let i=effects.length-1;i>=0;i--){
      const effect=effects[i],age=(performance.now()-effect.start)/1000;
      effect.sprite.position.y=3+age*.7;effect.sprite.material.opacity=Math.max(0,1-age/1.5);
      if(age>1.5){scene.remove(effect.sprite);effect.sprite.material.map.dispose();effect.sprite.material.dispose();effects.splice(i,1);}
    }
    outer.material.opacity=.45+Math.sin(elapsed*.7)*.15;dust.rotation.y=elapsed*.018;
    renderer.render(scene,camera);
  }
  return {sync,resize,render,react};
}

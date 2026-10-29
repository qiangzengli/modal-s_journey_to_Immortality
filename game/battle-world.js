import { animateCultivator } from './character-model.js';
import { ALL_ENEMIES as WANDERERS } from './combat-data.js';
import { createBattleEffects, playerEffect, enemyEffect } from './battle-fx.js';
import { createBattleCamera } from './battle-camera.js';

// 独立斗法场景与相机。主地图的人物、位置和镜头不参与战斗动画。
export function createBattleWorld(renderer, makePerson, THREE) {
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
  const companions=Object.fromEntries([...new Map(WANDERERS.flatMap(enemy=>enemy.allies||(enemy.ally?[enemy.ally]:[])).map(ally=>[ally.id,ally])).values()].map(ally=>{
    const actor=makePerson(ally.id,null),name=caption(`${ally.name} · 出战`,'#d1c3eb');actor.visible=name.visible=false;scene.add(actor,name);return [ally.id,{actor,name}];
  }));
  const playerName=caption('你 · 持剑');playerName.position.set(-3,3.6,0);scene.add(playerName);
  let enemyName=null;
  const fx=createBattleEffects(THREE,scene);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const hitMaterials=new Map([player,...Object.values(enemies),...Object.values(companions).map(p=>p.actor)].map(actor=>{
    const materials=new Set();actor.userData.body.traverse(node=>{if(node.material?.isMeshStandardMaterial)materials.add(node.material);});
    return [actor,[...materials]];
  }));
  let view=null, width=1200,height=800, animation=null;
  const orbit=createBattleCamera(camera,{stage:document.querySelector('#combat-stage'),getFocusPoint:side=>side==='player'?player.position:enemies[view?.battle?.enemyId]?.position});
  const effects=[];
  function showNumber(text,side,color) {
    const sprite=caption(text,color,240),actor=side==='player'?player:companions[side]?.actor||enemies[view.battle.enemyId];sprite.position.copy(actor.position).setY(3);
    scene.add(sprite);effects.push({sprite,start:performance.now()});
  }
  function resize(w,h) {
    width=w;height=h;
    orbit.resize(width,height);
  }
  function sync(next) {
    const previousId=view?.battle?.enemyId;
    view=next;
    orbit.sync(view.battle);
    if(!view.battle){
      animation?.finish();fx.clear();
      for(const {sprite} of effects){scene.remove(sprite);sprite.material.map.dispose();sprite.material.dispose();}
      effects.length=0;
      return;
    }
    if(previousId!==view.battle.enemyId){
      if(enemyName){scene.remove(enemyName);enemyName.material.map.dispose();enemyName.material.dispose();}
      enemyName=caption(view.battle.enemyName,'#e2b39b');scene.add(enemyName);
    }
    for(const [id,{actor,name}]of Object.entries(companions))actor.visible=name.visible=Boolean(view.battle.team?.some(member=>member.id===id));
    for(const [id,actor] of Object.entries(enemies))actor.visible=id===view.battle.enemyId;
    const color=next.weapon.attack>=11?0xe3a075:next.weapon.attack>=5?0xadd7a6:0xd8c38f;
    player.userData.weapon.material.color.setHex(color);
    resize(width,height);
  }
  function react(before,after,choice) {
    if(!before.battle)return Promise.resolve();
    if(animation)animation.finish();
    const entries=after.battle?.log.filter(entry=>entry.actionNumber===after.battle.actionNumber)||[];
    const action=entries.find(entry=>entry.side==='player'||entry.side==='ally');
    const actorId=action?.actorId||choice.actorId||before.battle.actingId||'player';
    const attacker=actorId==='player'?player:companions[actorId]?.actor;
    if(!attacker)return Promise.resolve();
    const playerLine=action?.text||'';
    const enemyLines=entries.filter(entry=>entry.side==='enemy');
    const enemyAction=enemyLines.find(entry=>/损失|恢复/.test(entry.text))||enemyLines.at(-1);
    const enemyLine=enemyAction?.text||'';
    const targetId=enemyAction?.targetId||'player',defender=targetId==='player'?player:companions[targetId]?.actor||player;
    const kind=action?.effect||playerEffect(choice);
    const response=enemyEffect(before.battle.enemyId,before.battle.intent);
    const attacking=playerLine.includes('伤害');
    const counter=enemyLine.includes('损失');
    const healing=enemyLine.includes('恢复');
    const playerMs=['slash','shield','escape'].includes(kind)?460:650;
    const enemyMs=counter?(response==='slash'?430:600):healing?550:0;
    const enemyStart=playerMs+50;
    const duration=enemyMs?enemyStart+enemyMs:playerMs+80;
    const impactAt=effect=>({slash:.42,heavy_slash:.46,qi_bolt:.55,wind_blade:.55,fire_art:.53,thunder_art:.44,binding_array:.42,thunder_array:.5}[effect]||.47);
    const origin=attacker.position.clone(),target=enemies[before.battle.enemyId].position.clone();
    return new Promise(resolve=>{
      let timer;
      const finish=()=>{clearTimeout(timer);if(animation?.finish===finish)animation=null;fx.clear();resolve();};
      const start=performance.now();
      animation={start,duration,playerMs,enemyStart,enemyMs,kind,response,attacking,counter,healing,playerLine,enemyLine,actorId,attacker,targetId,defender,playerImpact:impactAt(kind),enemyImpact:impactAt(response),playerShown:false,enemyShown:false,finish};
      fx.spawn(kind,origin,target,{start,duration:kind==='shield'?duration+200:playerMs,reducedMotion:reducedMotion.matches});
      if(before.battle.intent==='guard')fx.spawn('shield',target,origin,{start,duration,reducedMotion:reducedMotion.matches});
      if(counter||healing)fx.spawn(response,target,defender.position.clone(),{start:start+enemyStart,duration:enemyMs,reducedMotion:reducedMotion.matches});
      // 后台页面不依赖动画帧完成，也不会留下锁住的操作按钮。
      timer=setTimeout(finish,duration+100);
    });
  }
  function render(elapsed) {
    if(!view?.battle)return;
    const enemy=enemies[view.battle.enemyId];
    const gap=width<700?1.55:2.8;
    player.position.set(-gap,.055,0);enemy.position.set(gap,.055,0);
    player.rotation.y=Math.PI/2;enemy.rotation.y=-Math.PI/2;
    enemy.scale.setScalar(width<700 && enemy.userData.kind==='beast' ? .8 : 1);
    const allies=Object.values(companions).filter(p=>p.actor.visible);
    allies.forEach(({actor,name},i)=>{actor.position.set(-gap,.055,-2.1-i*1.9);actor.rotation.y=Math.PI/2;name.position.copy(actor.position).setY(3.1);});
    player.userData.body.rotation.z=0;
    for(const actor of [player,enemy,...allies.map(p=>p.actor)]){
      animateCultivator(actor,elapsed);
      actor.userData.body.rotation.x=0;actor.userData.body.rotation.z=0;
      actor.userData.body.position.y=Math.sin(elapsed*2.3)*.025;
      actor.userData.rightArm.rotation.z=Math.sin(elapsed*1.8)*.06;
      actor.userData.leftArm.rotation.z=-.08;
    }
    if(!animation){
      enemy.userData.body.rotation.z=view.battle.status==='won'?-.45:0;
      for(const member of view.battle.team)if(member.hp<=0){const actor=member.id==='player'?player:companions[member.id]?.actor;if(actor)actor.userData.body.rotation.z=-.85;}
    }
    playerName.position.set(-gap,3.3,0);enemyName.position.set(gap,3.3,0);
    playerName.visible=width>=700;enemyName.visible=width>=700;
    for(const actor of [player,enemy,...allies.map(p=>p.actor)]){
      if(actor.userData.weapon)actor.userData.weapon.rotation.z=0;
      for(const material of hitMaterials.get(actor)){material.emissive.setHex(0);material.emissiveIntensity=0;}
    }
    let cameraShake=0;
    if(animation){
      const time=performance.now()-animation.start;
      const p=Math.min(1,time/animation.playerMs);
      const e=Math.max(0,Math.min(1,(time-animation.enemyStart)/(animation.enemyMs||1)));
      const attacker=animation.attacker;
      const motion=reducedMotion.matches ? .25 : 1;
      const swing=Math.sin(p*Math.PI);
      const enemySwing=Math.sin(e*Math.PI);
      if(animation.attacking){
        const melee=animation.kind==='slash';
        const direction=enemy.position.clone().sub(attacker.position).setY(0).normalize();
        attacker.position.addScaledVector(direction,swing*(melee?1.15:.25)*motion);
        const arm=animation.actorId==='ji'?attacker.userData.leftArm:attacker.userData.rightArm;
        arm.rotation.z=-swing*(melee?1.4:1.05);
        attacker.userData.body.rotation.x=-swing*.12*motion;
        if(attacker.userData.weapon)attacker.userData.weapon.rotation.z=-swing*(melee?1.6:.35);
      }else if(animation.kind==='shield')attacker.userData.leftArm.rotation.z=Math.min(1,p*4)*.9;
      else if(animation.kind==='escape')attacker.position.x-=swing*.65*motion;
      else attacker.userData.leftArm.rotation.z=swing*.5;
      if(animation.counter){
        const melee=['slash','heavy_slash'].includes(animation.response);
        const direction=animation.defender.position.clone().sub(enemy.position).setY(0).normalize();
        enemy.position.addScaledVector(direction,enemySwing*(melee?.8:.12)*motion);
        enemy.userData.rightArm.rotation.z=-enemySwing*(melee?1.3:.7);
        if(enemy.userData.weapon)enemy.userData.weapon.rotation.z=-enemySwing*(melee?1.5:.35);
      }
      const impact=(progress,at)=>progress<at?0:Math.max(0,1-(progress-at)/.22);
      const playerHit=impact(p,animation.playerImpact)*(animation.attacking?1:0);
      const enemyHit=impact(e,animation.enemyImpact)*(animation.counter?1:0);
      enemy.userData.body.rotation.z=-playerHit*.18*motion;
      animation.defender.userData.body.rotation.z=enemyHit*.18*motion;
      for(const [actor,hit] of [[enemy,playerHit],[animation.defender,enemyHit]])for(const material of hitMaterials.get(actor)){material.emissive.setHex(0xe49d60);material.emissiveIntensity=hit*.3;}
      if(!reducedMotion.matches)cameraShake=Math.sin(time*.035)*(playerHit+enemyHit)*.035;
      if(p>=animation.playerImpact&&!animation.playerShown){
        animation.playerShown=true;
        const hit=animation.playerLine.match(/造成 (\d+) 点/);const heal=animation.playerLine.match(/恢复 (\d+) (气血|真气)/);
        if(hit)showNumber(`−${hit[1]}`,'enemy','#efba87');else if(heal)showNumber(`+${heal[1]} ${heal[2]}`,animation.actorId,'#a8dfb3');else if(animation.kind==='shield')showNumber('凝气防御',animation.actorId,'#a5d6e3');else if(animation.kind==='escape')showNumber(view.battle.status==='escaped'?'脱身成功':'退路被封','player','#e8d2a0');
      }
      if(e>=animation.enemyImpact&&!animation.enemyShown){
        animation.enemyShown=true;const hurt=animation.enemyLine.match(/损失 (\d+) 气血/);const heal=animation.enemyLine.match(/恢复 (\d+) 气血/);
        if(hurt)showNumber(`−${hurt[1]}`,animation.targetId,'#eeac94');else if(heal)showNumber(`+${heal[1]}`,'enemy','#a8dfb3');
      }
      if(view.battle.status==='won'&&p>animation.playerImpact)enemy.userData.body.rotation.z=-.45;
      if(time>=animation.duration)animation.finish();
    }
    fx.update();
    for(let i=effects.length-1;i>=0;i--){
      const effect=effects[i],age=(performance.now()-effect.start)/1000;
      effect.sprite.position.y=3+age*.7;effect.sprite.material.opacity=Math.max(0,1-age/1.5);
      if(age>1.5){scene.remove(effect.sprite);effect.sprite.material.map.dispose();effect.sprite.material.dispose();effects.splice(i,1);}
    }
    outer.material.opacity=.45+Math.sin(elapsed*.7)*.15;dust.rotation.y=elapsed*.018;
    orbit.update(cameraShake);
    renderer.render(scene,camera);
  }
  return {sync,resize,render,react};
}

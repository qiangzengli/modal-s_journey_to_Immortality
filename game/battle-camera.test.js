import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBattleCamera } from './battle-camera.js';
import { installDOM } from './ui-test-dom.js';

test('斗法镜头可环绕、俯仰和缩放，结算与尺寸改变保留视角，离场重置', () => {
  const camera = new THREE.OrthographicCamera(-12, 12, 6, -6, .1, 100);
  const orbit = createBattleCamera(camera);
  orbit.sync({enemyId:'luohu'}); orbit.resize(1200,800);
  const initial = camera.position.clone();
  orbit.rotate(Math.PI / 2); orbit.zoomBy(1.5);
  assert.ok(camera.position.x > 14); assert.ok(Math.abs(camera.position.z) < 1e-6);
  const rotated = camera.position.clone(), projection = camera.top;
  orbit.sync({enemyId:'luohu',round:2}); orbit.resize(1200,800); orbit.update(.03); orbit.update();
  assert.ok(camera.position.distanceTo(rotated)<1e-9,'结算及受击抖动不覆盖旋转');
  assert.equal(camera.top,projection);
  orbit.resize(390,844); assert.ok(camera.position.x>14,'移动布局不重置旋转');
  orbit.rotate(0,-100); assert.ok(camera.position.y>0,'不能翻到地面以下');
  orbit.zoomBy(1000); assert.ok(camera.top>2,'拉近有限制');
  orbit.zoomBy(.0001); assert.ok(camera.top<10,'拉远有限制');
  orbit.sync(null); orbit.resize(1200,800); orbit.sync({enemyId:'luohu'});
  assert.ok(camera.position.distanceTo(initial)<1e-9,'下一场恢复初始镜头');
});

test('鼠标、触摸与按钮独立控制镜头，取消手势和离场释放拖动，战斗按钮不被拦截', t => {
  const {window,document,$}=installDOM(t),stage=$('#combat-stage');stage.hidden=false;
  const camera = new THREE.OrthographicCamera(-12,12,6,-6,.1,100);
  const orbit=createBattleCamera(camera,{stage,getFocusPoint:side=>({x:side==='player'?-3:3,z:0})});t.after(()=>orbit.dispose());
  orbit.sync({enemyId:'luohu'});
  const surface=$('.battle-orbit-surface');
  const send=(target,type,props)=>{const e=new window.Event(type,{bubbles:true,cancelable:true});for(const [key,value]of Object.entries(props))Object.defineProperty(e,key,{value});target.dispatchEvent(e);return e;};
  send(surface,'pointerdown',{pointerId:1,button:0,clientX:10,clientY:20});
  send(surface,'pointermove',{pointerId:1,clientX:110,clientY:40});
  assert.ok(camera.position.x<-5);const angle=camera.position.clone();
  send(surface,'pointercancel',{pointerId:1});send(surface,'pointermove',{pointerId:1,clientX:400,clientY:50});
  assert.ok(camera.position.distanceTo(angle)<1e-9);
  send(surface,'pointerdown',{pointerId:2,button:0,clientX:10,clientY:20});
  send(surface,'pointerdown',{pointerId:3,button:0,clientX:110,clientY:20});
  const lens=camera.top;send(surface,'pointermove',{pointerId:3,clientX:210,clientY:20});assert.ok(camera.top<lens);
  window.dispatchEvent(new window.Event('blur'));assert.equal(surface.classList.contains('dragging'),false);
  $('[data-battle-focus="enemy"]').click();assert.equal($('[data-battle-focus="enemy"]').getAttribute('aria-pressed'),'true');
  $('[data-battle-camera="reset"]').click();assert.ok(Math.abs(camera.position.x)<1e-9);
  let attacks=0;const attack=document.createElement('button');attack.textContent='攻击';$('#combat-inputs').append(attack);attack.addEventListener('click',()=>attacks++);attack.click();assert.equal(attacks,1);
  const before=camera.position.clone();send($('#command'),'keydown',{key:'q'});assert.ok(camera.position.distanceTo(before)<1e-9);
  send(surface,'keydown',{key:'q'});assert.notEqual(camera.position.x,before.x);
  orbit.sync(null);const left=camera.position.clone();send(surface,'keydown',{key:'q'});assert.ok(camera.position.distanceTo(left)<1e-9);
});

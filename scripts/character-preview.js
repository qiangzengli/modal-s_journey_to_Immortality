import * as THREE from '/vendor/three.module.js';
import {createCultivatorActor,animateCultivator} from '/game/character-model.js';
import {createCharacterAssetStore,updateCharacterAsset} from '/game/character-assets.js';
import {inspectCharacterGLB,validateCharacterManifest,CHARACTER_ASSET_LIMITS} from '/game/character-asset-contract.js';
import {queueCharacterAsset} from '/game/character-asset-client.js';
import {GLTFLoader} from '/vendor/addons/loaders/GLTFLoader.js';
import {clone} from '/vendor/addons/utils/SkeletonUtils.js';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#171e28');scene.fog=new THREE.Fog('#171e28',13,30);
const camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.03,60);
scene.add(new THREE.HemisphereLight(0xd9e5f5,0x4b4037,1.6));const key=new THREE.DirectionalLight(0xffe4cc,3.2);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;key.shadow.bias=-.0002;key.shadow.normalBias=.015;scene.add(key);const rim=new THREE.DirectionalLight(0xa5caff,2.5);rim.position.set(3,4,-4);scene.add(rim);
const floor=new THREE.Mesh(new THREE.CircleGeometry(12,96),new THREE.MeshStandardMaterial({color:0x343b44,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const names={player:'韩立',ji:'南宫婉',modafu:'墨大夫',wen:'王蝉',mocaihuan:'墨彩环',lifeiyu:'厉飞雨',zhangtie:'张铁',story_jinguang:'金光上人'};
const actors=Object.fromEntries(Object.keys(names).map(id=>{const actor=createCultivatorActor(THREE,{id});scene.add(actor);return[id,actor]}));
let selected='all',angle=0,elevation=.04,distance=10,targetY=1.3,turning=false,drag=null;
function layout(){Object.values(actors).forEach(a=>a.visible=false);const ids=selected==='all'?['player','ji','modafu','wen']:[selected];ids.forEach((id,i)=>{const a=actors[id];a.visible=true;a.position.set((i-(ids.length-1)/2)*1.65,0,0);a.rotation.y=0;});document.querySelector('#labels').innerHTML=ids.map(id=>`<span data-character="${id}">${names[id]}</span>`).join('');distance=selected==='all'?11:5.6;targetY=1.3;angle=0;elevation=.035;}
layout();document.querySelector('#character').onchange=e=>{selected=e.target.value;layout();showSource()};document.querySelector('#front').onclick=()=>angle=0;document.querySelector('#quarter').onclick=()=>angle=.5;document.querySelector('#side').onclick=()=>angle=Math.PI/2;document.querySelector('#back').onclick=()=>angle=Math.PI;document.querySelector('#detail').onclick=()=>{if(selected==='all'){selected='player';document.querySelector('#character').value=selected;layout();}distance=1.3;targetY=selected==='ji'?2.25:2.275;elevation=0;};document.querySelector('#bust').onclick=()=>{if(selected==='all'){selected='player';document.querySelector('#character').value=selected;layout();}distance=2.6;targetY=1.93;elevation=.025;};document.querySelector('#auto').onclick=()=>turning=!turning;
renderer.domElement.onpointerdown=e=>{drag=[e.clientX,e.clientY];renderer.domElement.setPointerCapture(e.pointerId)};renderer.domElement.onpointermove=e=>{if(drag){angle+=(e.clientX-drag[0])*.009;elevation=Math.max(-.3,Math.min(.8,elevation+(e.clientY-drag[1])*.005));drag=[e.clientX,e.clientY]}};renderer.domElement.onpointerup=()=>drag=null;renderer.domElement.onwheel=e=>{e.preventDefault();distance=Math.max(.7,Math.min(15,distance*Math.exp(e.deltaY*.001)));};
function resize(){const width=innerWidth-(document.querySelector('#asset-panel').hidden?0:Math.min(350,innerWidth*.45));renderer.setSize(width,innerHeight);camera.aspect=width/innerHeight;camera.updateProjectionMatrix();document.querySelector('#labels').style.width=width+'px';}
window.onresize=resize;
let frame=0;function render(t){requestAnimationFrame(render);if(turning)angle+=.004;camera.position.set(Math.sin(angle)*distance,targetY+Math.sin(elevation)*distance,Math.cos(angle)*distance);camera.lookAt(0,targetY,0);for(const a of Object.values(actors))if(a.visible)previewActor(a,t/1000);renderer.render(scene,camera);for(const label of document.querySelectorAll('[data-character]')){const p=actors[label.dataset.character].position.clone().add(new THREE.Vector3(0,-.15,0)).project(camera);label.style.left=(p.x*.5+.5)*100+'%';label.style.top=(-p.y*.5+.5)*100+'%';}if(frame++%30===0){showSource();document.querySelector('#metrics').textContent=`${renderer.info.render.triangles.toLocaleString()} 三角面 · ${renderer.info.render.calls} 次绘制`;} };requestAnimationFrame(render);

const $=id=>document.getElementById(id);
const actionNames={idle:'待机',walk:'行走',attack:'普通攻击',cast:'施法',guard:'防御',hit:'受击',defeat:'倒地'};
let localStore=null,localActor=null,localBuffer=null,localFile=null,exportManifest=null,importVersion=0;
for(const [key,name]of Object.entries(actionNames)){
  const label=document.createElement('label');label.textContent=name;
  const select=document.createElement('select');select.id='clip-'+key;label.append(select);$('clip-fields').append(label);
}
function message(text,error=false){$('import-result').textContent=text;$('import-result').dataset.error=error;}
function showSource(){
  const ids=selected==='all'?['player','ji','modafu','wen']:[selected];
  $('source-status').textContent=ids.map(id=>{
    const status=actors[id].userData.characterAsset;
    const label={procedural:'现有程序模型',loading:'正在加载 GLB',ready:'GLB 已接入',fallback:'加载失败，保留程序模型'}[status.status]||status.status;
    return `${names[id]} · ${label}${status.file?'\n'+status.file:''}${status.errorCode?'\n'+status.errorCode+'：'+status.message:''}`;
  }).join('\n\n');
}
function previewActor(actor,elapsed){
  const action=$('preview-action').value,progress=elapsed%1.8/1.8,swing=Math.sin(progress*Math.PI);
  animateCultivator(actor,elapsed,action==='walk');
  actor.userData.leftArm.rotation.z=action==='walk'?Math.sin(elapsed*10)*.3:action==='guard'?.7:0;
  actor.userData.rightArm.rotation.z=action==='attack'||action==='cast'?-swing*1.25:action==='walk'?-Math.sin(elapsed*10)*.3:0;
  actor.userData.body.rotation.z=action==='hit'?swing*.18:action==='defeat'?-.85:0;
  updateCharacterAsset(actor,{elapsed,action,progress:action==='defeat'?1:progress,moving:action==='walk'});
}
function setOptions(select,names,match){
  select.replaceChildren(new Option('不指定',''),...names.map(name=>new Option(name,name)));
  if(match)select.value=names.find(name=>match.test(name))||'';
}
function clearLocal(){
  const previous=localActor;
  localStore?.dispose();localStore=null;localActor=null;exportManifest=null;$('export-asset').disabled=true;
  if(previous)queueCharacterAsset(previous,THREE);
}
$('assets').onclick=()=>{const panel=$('asset-panel');panel.hidden=!panel.hidden;$('assets').setAttribute('aria-expanded',String(!panel.hidden));resize();showSource();};
$('asset-file').onchange=async()=>{
  const version=++importVersion,file=$('asset-file').files[0];
  $('mapping').disabled=true;exportManifest=null;$('export-asset').disabled=true;
  if(!file)return;
  try{
    if(!/^[a-z0-9][a-z0-9_-]{0,95}\.glb$/.test(file.name))throw new Error('请将文件重命名为小写英文、数字、短横线或下划线组成的 .glb 文件名。');
    if(file.size>CHARACTER_ASSET_LIMITS.bytes)throw new Error('文件超过 32 MiB。');
    const buffer=await file.arrayBuffer(),report=inspectCharacterGLB(buffer);
    if(version!==importVersion)return;
    clearLocal();localBuffer=buffer;localFile=file.name;
    const nodes=[...new Set((report.json.nodes||[]).map(node=>node.name).filter(Boolean))];
    setOptions($('joint-left'),nodes,/left.*arm|arm.*[._]l$|upperarm_l/i);
    setOptions($('joint-right'),nodes,/right.*arm|arm.*[._]r$|upperarm_r/i);
    setOptions($('joint-weapon'),nodes,/sword|blade|weapon|ring/i);
    setOptions($('joint-root'),nodes,/hips|pelvis/i);
    const clips=(report.json.animations||[]).map(clip=>clip.name).filter(Boolean);
    for(const key of Object.keys(actionNames))setOptions($('clip-'+key),clips,new RegExp(key==='attack'?'attack|strike|slash':key,'i'));
    $('asset-info').textContent=`${file.name} · ${report.triangles.toLocaleString()} 三角面 · ${report.materials} 材质 · ${clips.length} 个动作片段`;
    $('mapping').disabled=false;message('已读取。核对节点映射后，应用到当前角色。');
  }catch(error){if(version===importVersion)message((error.code?error.code+'：':'')+error.message,true);}
};
$('apply-asset').onclick=async()=>{
  const version=importVersion;
  try{
    if(selected==='all'){selected='player';$('character').value=selected;layout();}
    const id=selected,clips={};
    for(const key of Object.keys(actionNames))if($('clip-'+key).value)clips[key]=$('clip-'+key).value;
    const entry={file:localFile,height:Number($('asset-height').value),rotationY:Number($('asset-yaw').value)*Math.PI/180,joints:{leftArm:$('joint-left').value,rightArm:$('joint-right').value},clips};
    if($('joint-weapon').value)entry.weapon=$('joint-weapon').value;
    if($('joint-root').value)entry.rootMotion=$('joint-root').value;
    const manifest=validateCharacterManifest({version:1,characters:{[id]:entry}});inspectCharacterGLB(localBuffer,manifest.characters[id]);
    $('apply-asset').disabled=true;message('正在检查骨骼与材质…');
    const target=actors[id];await target.userData.characterAssetReady;
    if(version!==importVersion)return;
    if(localActor!==target){clearLocal();await target.userData.characterAssetReady;target.userData.disposeCharacterAsset?.();}
    if(version!==importVersion)return;
    localActor=target;
    localStore??=createCharacterAssetStore({THREE,fetchBuffer:async()=>localBuffer,parseGLB:buffer=>new GLTFLoader().parseAsync(buffer,''),cloneScene:clone});
    const result=await localStore.attach(target,manifest.characters[id]);
    if(version!==importVersion)return;
    if(result.errorCode)throw new Error(`${result.errorCode}：${result.message}`);
    exportManifest=manifest;$('export-asset').disabled=false;
    message(`${names[id]} 已应用本地模型。可切换上方动作和视角检查；该操作尚未发布到游戏。`);showSource();
  }catch(error){message(error.message,true);}finally{$('apply-asset').disabled=false;}
};
$('reset-asset').onclick=()=>{importVersion++;clearLocal();message('已恢复项目模型。');showSource();};
$('export-asset').onclick=()=>{
  if(!exportManifest)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(exportManifest,null,2)+'\n'],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='character-entry.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  message('已导出当前角色的配置。合并到项目清单并放入同名 GLB 后，运行 npm run check:characters；不要覆盖其他角色条目。');
};
$('mapping').onchange=()=>{exportManifest=null;$('export-asset').disabled=true;};
window.addEventListener('pagehide',()=>{localStore?.dispose();for(const actor of Object.values(actors))actor.userData.disposeCharacterAsset?.();});

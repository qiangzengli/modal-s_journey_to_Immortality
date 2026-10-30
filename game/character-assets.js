import {CharacterAssetError,CHARACTER_ASSET_LIMITS,inspectCharacterGLB,validateCharacterManifest} from './character-asset-contract.js';

// The game keeps its existing actor, position, labels, loot and animation handles.
// Only the visual child is swapped, once the entire replacement is usable.
export function createCharacterAssetStore({THREE,fetchBuffer,parseGLB,cloneScene}){
  const records=new Map(),actors=new Map(),waiting=[];let disposed=false,activeLoads=0;
  const error=(code,message)=>new CharacterAssetError(code,message);
  async function scheduled(job){
    if(activeLoads<2)activeLoads++;else await new Promise(resolve=>waiting.push(resolve));
    try{if(disposed)throw error('ASSET_DISPOSED','角色资源管理器已关闭。');return await job();}
    finally{const next=waiting.shift();if(next)next();else activeLoads--;}
  }
  function releaseTemplate(gltf){
    const resources=new Set(),images=new Set();
    gltf.scene.traverse(node=>{
      if(node.geometry)resources.add(node.geometry);
      for(const material of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){
        resources.add(material);
        for(const value of Object.values(material))if(value?.isTexture){resources.add(value);if(value.source?.data?.close)images.add(value.source.data);}
      }
    });
    for(const resource of resources)resource.dispose();for(const image of images)image.close();
  }
  function record(file){
    if(records.has(file))return records.get(file);
    const pending=scheduled(async()=>{
      const buffer=await fetchBuffer(file);const report=inspectCharacterGLB(buffer);
      const gltf=await parseGLB(buffer);
      if(!gltf.scene){throw error('GLB_SCENE_MISSING','模型没有可显示的场景。');}
      if(disposed){releaseTemplate(gltf);throw error('ASSET_DISPOSED','角色资源管理器已关闭。');}
      return {gltf,report};
    });
    records.set(file,pending);
    pending.catch(()=>{if(records.get(file)===pending)records.delete(file);});
    return pending;
  }
  function instance(gltf,entry,id){
    const scene=cloneScene(gltf.scene),owned=new Set(),materials=new Map();
    const nodes=new Map();let triangles=0;
    scene.traverse(node=>{
      // GLTFLoader sanitizes animation node names (e.g. Mixamo's ':'), but
      // preserves the original glTF name in userData. The manifest uses that.
      const name=node.userData.name||node.name;
      if(name){if(!nodes.has(name))nodes.set(name,[]);nodes.get(name).push(node);}
      node.userData.personId=id;
      if(node.isMesh){
        triangles+=(node.geometry.index?.count||node.geometry.attributes.position.count)/3;
        node.castShadow=node.receiveShadow=true;
        const copy=material=>{if(!materials.has(material)){const clone=material.clone();materials.set(material,clone);owned.add(clone);}return materials.get(material);};
        node.material=Array.isArray(node.material)?node.material.map(copy):copy(node.material);
      }
    });
    const dispose=()=>{scene.removeFromParent();for(const m of owned)m.dispose();scene.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.dispose();});};
    try{
      if(triangles>CHARACTER_ASSET_LIMITS.triangles||!triangles)throw error('GLB_BUDGET_EXCEEDED','实际场景实例数量超出三角面预算。');
      const node=name=>{const matches=nodes.get(name);if(matches?.length!==1)throw error('RIG_NODE_MISSING',`找不到唯一的节点：${name}`);return matches[0];};
      const leftArm=node(entry.joints.leftArm),rightArm=node(entry.joints.rightArm);
      const weapon=entry.weapon?node(entry.weapon):null,rootMotion=entry.rootMotion?node(entry.rootMotion):null;
      if(weapon&&!(()=>{let found=false;weapon.traverse(n=>{found ||= n.isMesh;});return found;})())throw error('RIG_NODE_MISSING','武器节点没有可显示的网格。');
      for(const name of Object.values(entry.clips))if(gltf.animations.filter(clip=>clip.name===name).length!==1)throw error('CLIP_MISSING',`找不到唯一的动画：${name}`);
      const pivot=new THREE.Group();pivot.name='loaded-character';pivot.userData.personId=id;pivot.add(scene);pivot.rotation.y=entry.rotationY;
      const bounds=new THREE.Box3().setFromObject(pivot),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      if(![...size,...center].every(Number.isFinite)||size.y<=.001||Math.max(size.x,size.z)/size.y>4)throw error('GLB_BOUNDS_INVALID','角色尺寸无效或包含异常远离人物的网格。');
      const scale=entry.height/size.y;pivot.scale.setScalar(scale);pivot.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
      const mixer=new THREE.AnimationMixer(scene),actions=new Map();
      for(const [semantic,name]of Object.entries(entry.clips)){
        const action=mixer.clipAction(gltf.animations.find(clip=>clip.name===name));action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;actions.set(semantic,action);
      }
      const rest=new Map([leftArm,rightArm,weapon].filter(Boolean).map(n=>[n,n.quaternion.clone()]));
      const emission=[...owned].filter(m=>m.emissive).map(m=>({m,color:m.emissive.clone(),intensity:m.emissiveIntensity}));
      const weaponMaterials=new Set();weapon?.traverse(n=>{for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[])if(m.color)weaponMaterials.add(m);});
      const motionOrigin=rootMotion?.position.clone();let active=null;
      return {pivot,file:entry.file,triangles,materials:owned.size,update(actor,frame,flash){
        const semantic=frame.action||(frame.moving?'walk':'idle'),action=actions.get(semantic);
        if(active!==action){active?.stop();mixer.stopAllAction();for(const [n,q]of rest)n.quaternion.copy(q);active=action;active?.reset().play();}
        if(action){
          const duration=action.getClip().duration;
          action.time=['walk','idle'].includes(semantic)?Math.max(0,frame.elapsed||0)%Math.max(duration,.001):Math.min(1,Math.max(0,frame.progress||0))*duration;
          action.enabled=true;action.paused=true;mixer.update(0);
        }else{
          leftArm.quaternion.copy(rest.get(leftArm)).multiply(actor.userData.leftArm.quaternion);
          rightArm.quaternion.copy(rest.get(rightArm)).multiply(actor.userData.rightArm.quaternion);
          if(weapon&&actor.userData.weapon)weapon.quaternion.copy(rest.get(weapon)).multiply(actor.userData.weapon.quaternion);
        }
        if(rootMotion){rootMotion.position.x=motionOrigin.x;rootMotion.position.z=motionOrigin.z;}
        if(actor.userData.weapon)for(const m of weaponMaterials)m.color.copy(actor.userData.weapon.material.color);
        for(const {m,color,intensity}of emission){m.emissive.copy(color);m.emissiveIntensity=intensity;if(flash?.emissive?.getHex()&&flash.emissiveIntensity>0){m.emissive.copy(flash.emissive);m.emissiveIntensity=flash.emissiveIntensity;}}
      },dispose(){mixer.stopAllAction();mixer.uncacheRoot(scene);pivot.removeFromParent();dispose();}};
    }catch(cause){dispose();throw cause;}
  }
  function stateFor(actor){
    if(actors.has(actor))return actors.get(actor);
    const fallback=[...actor.userData.body.children].map(node=>({node,visible:node.visible}));let flash;
    actor.userData.body.traverse(node=>{if(!flash&&node.material?.emissive)flash=node.material;});
    const state={generation:0,current:null,fallback,disposed:false,frame:{elapsed:0},flash};actors.set(actor,state);
    actor.userData.characterAsset={status:'procedural',file:null};
    actor.userData.updateCharacterAsset=frame=>{state.frame=frame;state.current?.update(actor,frame,flash);};
    actor.userData.disposeCharacterAsset=()=>{
      state.generation++;state.disposed=true;state.current?.dispose();state.current=null;
      for(const {node,visible}of fallback)node.visible=visible;
      actor.userData.characterAsset={status:'procedural',file:null};delete actor.userData.updateCharacterAsset;delete actor.userData.disposeCharacterAsset;actors.delete(actor);
    };
    return state;
  }
  async function attach(actor,entry){
    if(disposed)return {status:'disposed'};
    const state=stateFor(actor),generation=++state.generation;
    try{
      entry=validateCharacterManifest({version:1,characters:{[actor.userData.id]:entry}}).characters[actor.userData.id];
      actor.userData.characterAsset={status:'loading',file:entry.file};
      const {gltf}=await record(entry.file);
      if(state.disposed||generation!==state.generation||disposed)return {status:'superseded'};
      const next=instance(gltf,entry,actor.userData.id);
      try{next.update(actor,state.frame,state.flash);}catch(cause){next.dispose();throw cause;}
      state.current?.dispose();state.current=next;
      actor.userData.body.add(next.pivot);
      for(const {node}of state.fallback)node.visible=false;
      const status={status:'ready',file:entry.file,triangles:next.triangles,materials:next.materials};actor.userData.characterAsset=status;return status;
    }catch(cause){
      if(state.disposed||generation!==state.generation||disposed)return {status:'superseded'};
      const status={status:state.current?'ready':'fallback',file:state.current?.file||null,errorCode:cause.code||'ASSET_LOAD_FAILED',message:cause.message};
      actor.userData.characterAsset=status;return status;
    }
  }
  function dispose(){
    if(disposed)return;disposed=true;
    for(const actor of [...actors.keys()])actor.userData.disposeCharacterAsset();
    for(const promise of records.values())promise.then(({gltf})=>releaseTemplate(gltf),()=>{});records.clear();
  }
  return {attach,dispose};
}

export function updateCharacterAsset(actor,frame){actor.userData.updateCharacterAsset?.(frame);}

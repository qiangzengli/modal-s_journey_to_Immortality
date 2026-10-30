import {validateCharacterManifest,CharacterAssetError,CHARACTER_ASSET_LIMITS} from './character-asset-contract.js';
import {createCharacterAssetStore} from './character-assets.js';

let manifestPromise,storePromise;
const base=()=>new URL('./',document.baseURI);
async function response(path){
  const result=await fetch(new URL(path,base()),{signal:AbortSignal.timeout(15000)});
  if(!result.ok)throw new CharacterAssetError('ASSET_HTTP_ERROR',`角色资源请求失败（${result.status}）。`);
  return result;
}
function manifest(){
  return manifestPromise??=(async()=>validateCharacterManifest(await(await response('assets/characters/models/manifest.json')).json()))();
}
function store(THREE){
  return storePromise??=(async()=>{
    const [{GLTFLoader},{clone}]=await Promise.all([
      import(new URL('vendor/addons/loaders/GLTFLoader.js',base()).href),
      import(new URL('vendor/addons/utils/SkeletonUtils.js',base()).href)
    ]);
    const loader=new GLTFLoader();
    return createCharacterAssetStore({THREE,cloneScene:clone,
      fetchBuffer:async file=>{
        const res=await response('assets/characters/models/'+file);
        if(Number(res.headers.get('content-length'))>CHARACTER_ASSET_LIMITS.bytes)throw new CharacterAssetError('GLB_SIZE_INVALID','角色文件超过 32 MiB。');
        return res.arrayBuffer();
      },
      parseGLB:buffer=>loader.parseAsync(buffer,'')
    });
  })();
}
export function queueCharacterAsset(actor,THREE){
  actor.userData.characterAsset={status:'procedural',file:null};
  // Node-side simulation and tests never perform an incidental browser request.
  if(typeof document==='undefined'||typeof location==='undefined'||!/^https?:$/.test(location.protocol))return;
  let cancelled=false;
  actor.userData.disposeCharacterAsset=()=>{cancelled=true;actor.userData.characterAsset={status:'procedural',file:null};};
  actor.userData.characterAssetReady=(async()=>{
    try{
      const entry=(await manifest()).characters[actor.userData.id];
      if(cancelled)return {status:'disposed'};
      if(!entry)return actor.userData.characterAsset;
      const assets=await store(THREE);
      if(cancelled)return {status:'disposed'};
      return await assets.attach(actor,entry);
    }catch(cause){
      if(cancelled)return {status:'disposed'};
      return actor.userData.characterAsset={status:'fallback',file:null,errorCode:cause.code||'ASSET_LOAD_FAILED',message:cause.message};
    }
  })();
}

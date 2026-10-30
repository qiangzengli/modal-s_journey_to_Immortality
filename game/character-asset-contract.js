// Shared by the browser, the asset check command and the HTTP allowlist.
export const CHARACTER_ASSET_LIMITS = Object.freeze({bytes:32*1024*1024,triangles:150000,materials:16});
export class CharacterAssetError extends Error {
  constructor(code,message){super(message);this.name='CharacterAssetError';this.code=code;}
}
const fail=(code,message)=>{throw new CharacterAssetError(code,message);};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const nodeName=value=>typeof value==='string'&&value.length>0&&value.length<=100;
export function validateCharacterManifest(input){
  if(!object(input)||input.version!==1||!object(input.characters))fail('MANIFEST_INVALID','角色资源清单必须使用 version: 1 和 characters 对象。');
  const characters={};
  for(const [id,entry] of Object.entries(input.characters)){
    if(!/^[a-z][a-z0-9_]{0,63}$/.test(id)||!object(entry))fail('MANIFEST_INVALID','角色 ID 或配置无效。');
    if(!/^[a-z0-9][a-z0-9_-]{0,95}\.glb$/.test(entry.file||''))fail('ASSET_PATH_INVALID',`${id} 的 file 必须是本目录内的 .glb 文件名。`);
    if(!Number.isFinite(entry.height)||entry.height<1||entry.height>4)fail('MANIFEST_INVALID',`${id} 的 height 必须在 1–4 之间。`);
    if(entry.rotationY!==undefined&&(!Number.isFinite(entry.rotationY)||Math.abs(entry.rotationY)>Math.PI*2))fail('MANIFEST_INVALID',`${id} 的 rotationY 无效。`);
    if(!object(entry.joints)||!nodeName(entry.joints.leftArm)||!nodeName(entry.joints.rightArm))fail('RIG_INVALID',`${id} 必须声明左右臂节点。`);
    if(entry.joints.leftArm===entry.joints.rightArm)fail('RIG_INVALID',`${id} 的左右臂不能映射到同一节点。`);
    if((entry.weapon!==undefined&&!nodeName(entry.weapon))||(id==='player'&&!nodeName(entry.weapon)))fail('RIG_INVALID',`${id} 的武器节点无效。`);
    if(entry.rootMotion!==undefined&&!nodeName(entry.rootMotion))fail('RIG_INVALID',`${id} 的 rootMotion 节点无效。`);
    const clips={};
    if(entry.clips!==undefined&&!object(entry.clips))fail('MANIFEST_INVALID',`${id} 的 clips 必须是对象。`);
    for(const [action,name] of Object.entries(entry.clips||{})){
      if(!['idle','walk','attack','cast','guard','hit','defeat'].includes(action)||!nodeName(name))fail('CLIP_INVALID',`${id} 的动作映射无效。`);
      clips[action]=name;
    }
    characters[id]={file:entry.file,height:entry.height,rotationY:entry.rotationY||0,joints:{leftArm:entry.joints.leftArm,rightArm:entry.joints.rightArm},clips};
    if(entry.weapon)characters[id].weapon=entry.weapon;
    if(entry.rootMotion)characters[id].rootMotion=entry.rootMotion;
  }
  return {version:1,characters};
}

export function inspectCharacterGLB(buffer,entry){
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<20||buffer.byteLength>CHARACTER_ASSET_LIMITS.bytes)fail('GLB_SIZE_INVALID','GLB 文件为空、损坏或超过 32 MiB。');
  const view=new DataView(buffer);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==buffer.byteLength)fail('GLB_INVALID','仅支持完整的 glTF 2.0 二进制文件。');
  let offset=12,json=null,binaryBytes=0,chunkIndex=0;
  while(offset<buffer.byteLength){
    if(offset+8>buffer.byteLength)fail('GLB_INVALID','GLB 区块头不完整。');
    const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true);offset+=8;
    if(length%4||offset+length>buffer.byteLength)fail('GLB_INVALID','GLB 区块长度无效。');
    if(chunkIndex===0&&type!==0x4e4f534a)fail('GLB_INVALID','GLB 的首个区块必须为 JSON。');
    if(type===0x4e4f534a){
      if(json)fail('GLB_INVALID','GLB 包含重复 JSON 区块。');
      try{json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset,length)).trim());}catch{fail('GLB_INVALID','GLB JSON 无法解析。');}
    }else if(type===0x004e4942){if(binaryBytes)fail('GLB_INVALID','GLB 包含重复数据区块。');binaryBytes=length;}
    offset+=length;chunkIndex++;
  }
  if(!object(json)||json.asset?.version!=='2.0')fail('GLB_INVALID','GLB 缺少 glTF 2.0 资源描述。');
  for(const key of ['buffers','images','nodes','meshes','materials','accessors','animations','extensionsRequired'])if(json[key]!==undefined&&!Array.isArray(json[key]))fail('GLB_INVALID',`GLB 的 ${key} 字段必须是数组。`);
  // Self-contained files work offline and under /niminglu/, without fetching
  // another host or unexpectedly reading adjacent project files.
  for(const resource of [...(json.buffers||[]),...(json.images||[])])if(resource.uri!==undefined)fail('GLB_EXTERNAL_RESOURCE','GLB 的贴图和缓冲区必须嵌入文件内。');
  if((json.buffers||[]).some((b,i)=>i!==0||!Number.isInteger(b.byteLength)||b.byteLength<0||b.byteLength>binaryBytes))fail('GLB_INVALID','GLB 缓冲区无效。');
  if((json.extensionsRequired||[]).some(name=>['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'].includes(name)))fail('GLB_DECODER_REQUIRED','请导出未压缩网格及 PNG/JPEG 贴图；本版本未配置压缩解码器。');
  let triangles=0;
  for(const mesh of json.meshes||[])for(const primitive of mesh.primitives||[]){
    const count=json.accessors?.[primitive.indices??primitive.attributes?.POSITION]?.count;
    if(!Number.isInteger(count)||count<0||![undefined,4].includes(primitive.mode))fail('GLB_GEOMETRY_INVALID','角色网格必须使用有效的三角形拓扑。');
    if(count%3)fail('GLB_GEOMETRY_INVALID','三角形索引数必须是 3 的倍数。');
    triangles+=count/3;
  }
  if(!triangles||triangles>CHARACTER_ASSET_LIMITS.triangles||(json.materials||[]).length>CHARACTER_ASSET_LIMITS.materials)fail('GLB_BUDGET_EXCEEDED','角色应包含网格，且不超过 15 万三角面、16 个材质。');
  if(entry){
    for(const name of [...Object.values(entry.joints),entry.weapon,entry.rootMotion].filter(Boolean)){
      if((json.nodes||[]).filter(node=>node.name===name).length!==1)fail('RIG_NODE_MISSING',`找不到唯一的节点：${name}`);
    }
    for(const name of Object.values(entry.clips))if((json.animations||[]).filter(clip=>clip.name===name).length!==1)fail('CLIP_MISSING',`找不到唯一的动画：${name}`);
  }
  return {json,triangles,materials:(json.materials||[]).length,bytes:buffer.byteLength};
}

// A deliberately simple skinned probe, only for verifying the real GLB pipeline.
// It is never registered as a game character or presented as an art asset.
export const PROBE_ENTRY={file:'probe.glb',height:2.6,rotationY:0,joints:{leftArm:'LeftArm',rightArm:'RightArm'},weapon:'Sword',rootMotion:'Hips',clips:{idle:'Idle',attack:'Strike'}};
export function characterGLBProbe(change=()=>{}){
  const chunks=[],views=[],accessors=[];let size=0;
  const add=(array,type,componentType,count)=>{
    const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength),padded=new Uint8Array(Math.ceil(bytes.length/4)*4);padded.set(bytes);
    const view=views.length;views.push({buffer:0,byteOffset:size,byteLength:bytes.length});chunks.push(padded);size+=padded.length;
    const accessor={bufferView:view,componentType,count,type};
    if(type==='VEC3'&&componentType===5126){accessor.min=[0,1,2].map(k=>Math.min(...Array.from({length:count},(_,i)=>array[i*3+k])));accessor.max=[0,1,2].map(k=>Math.max(...Array.from({length:count},(_,i)=>array[i*3+k])));}
    accessors.push(accessor);return accessors.length-1;
  };
  const positions=add(new Float32Array([-.4,0,0,.4,0,0,0,1.8,0]),'VEC3',5126,3);
  const normals=add(new Float32Array([0,0,1,0,0,1,0,0,1]),'VEC3',5126,3);
  const joints=add(new Uint16Array([0,0,0,0,2,0,0,0,1,0,0,0]),'VEC4',5123,3);
  const weights=add(new Float32Array([1,0,0,0,1,0,0,0,1,0,0,0]),'VEC4',5126,3);
  const indices=add(new Uint16Array([0,1,2]),'SCALAR',5123,3);
  const inverse=[];for(const [x,y]of [[0,0],[-.25,1],[.25,1]])inverse.push(1,0,0,0,0,1,0,0,0,0,1,0,-x,-y,0,1);
  const binds=add(new Float32Array(inverse),'MAT4',5126,3);
  const times=add(new Float32Array([0,.5,1]),'SCALAR',5126,3);accessors[times].min=[0];accessors[times].max=[1];
  const idle=add(new Float32Array([0,0,0,1,0,0,0,1,0,0,0,1]),'VEC4',5126,3);
  const strike=add(new Float32Array([0,0,0,1,0,0,-Math.sin(.6),Math.cos(.6),0,0,0,1]),'VEC4',5126,3);
  const doc={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[
    {name:'Root',children:[1,4]}, {name:'Hips',children:[2,3]},
    {name:'LeftArm',translation:[-.25,1,0]}, {name:'RightArm',translation:[.25,1,0],children:[5]},
    {name:'Body',mesh:0,skin:0}, {name:'Sword',mesh:1,translation:[0,-.2,.1],scale:[.08,.3,.08]}
  ],skins:[{joints:[1,2,3],inverseBindMatrices:binds,skeleton:1}],
    meshes:[{primitives:[{attributes:{POSITION:positions,NORMAL:normals,JOINTS_0:joints,WEIGHTS_0:weights},indices,material:0}]},{primitives:[{attributes:{POSITION:positions,NORMAL:normals},indices,material:1}]}],
    materials:[{name:'Cloth',pbrMetallicRoughness:{baseColorFactor:[.15,.5,.35,1],roughnessFactor:.8,metallicFactor:0},doubleSided:true},{name:'Blade',pbrMetallicRoughness:{baseColorFactor:[.7,.7,.7,1],roughnessFactor:.4,metallicFactor:.6},doubleSided:true}],
    buffers:[{byteLength:size}],bufferViews:views,accessors,
    animations:[{name:'Idle',samplers:[{input:times,output:idle}],channels:[{sampler:0,target:{node:3,path:'rotation'}}]},{name:'Strike',samplers:[{input:times,output:strike}],channels:[{sampler:0,target:{node:3,path:'rotation'}}]}]
  };
  change(doc);
  const json=new TextEncoder().encode(JSON.stringify(doc)),jsonLength=Math.ceil(json.length/4)*4,total=12+8+jsonLength+8+size;
  const buffer=new ArrayBuffer(total),view=new DataView(buffer),bytes=new Uint8Array(buffer);view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,total,true);
  view.setUint32(12,jsonLength,true);view.setUint32(16,0x4e4f534a,true);bytes.fill(32,20,20+jsonLength);bytes.set(json,20);
  let cursor=20+jsonLength;view.setUint32(cursor,size,true);view.setUint32(cursor+4,0x004e4942,true);cursor+=8;
  for(const chunk of chunks){bytes.set(chunk,cursor);cursor+=chunk.length;}return buffer;
}

import {CHARACTER_FACES,FACE_INDICES,FACE_BOUNDARY} from './character-face-data.js';
import {surfaceGeometry} from './character-geometry.js';
const textures=new WeakMap();
function bindFaceTexture(THREE,id,material){
  // Until a local image has loaded, use the matching skin material rather than a white face.
  if(typeof Image==='undefined')return;
  if(!textures.has(THREE))textures.set(THREE,new Map());const cache=textures.get(THREE);
  const apply=texture=>{material.map=texture;material.color.setHex(0xffffff);material.needsUpdate=true;};
  let entry=cache.get(id);
  if(entry){if(entry.ready)apply(entry.texture);else if(!entry.failed)entry.waiting.push(apply);return;}
  entry={ready:false,failed:false,waiting:[apply]};cache.set(id,entry);
  entry.texture=new THREE.TextureLoader().load(`./assets/characters/${id}-face.jpg`,texture=>{
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;entry.ready=true;
    for(const notify of entry.waiting)notify(texture);entry.waiting=[];
  },undefined,()=>{entry.failed=true;entry.waiting=[];});
}
export function createCharacterFace(THREE,head,profile,skin){
  const id=CHARACTER_FACES[profile.face]?profile.face:'examiner',data=CHARACTER_FACES[id];
  skin.color.setHex(data.skin);
  const material=new THREE.MeshStandardMaterial({color:data.skin,roughness:.88});
  bindFaceTexture(THREE,id,material);
  const face=new THREE.Mesh(surfaceGeometry(THREE,data.positions,data.uvs,FACE_INDICES),material);face.name='sculpted-face';face.castShadow=true;face.receiveShadow=true;head.add(face);
  // Close the face boundary into a complete skull, preserving a continuous jaw in side view.
  const positions=[],uvs=[],indices=[],n=FACE_BOUNDARY.length,rows=12;
  for(let row=0;row<=rows;row++){
    const t=row/rows,a=t*Math.PI/2,shrink=Math.cos(a);
    for(let i=0;i<=n;i++){
      const index=FACE_BOUNDARY[i%n]*3,[x,y,z]=data.positions.slice(index,index+3);
      positions.push(x*shrink,y*shrink,z*(1-t)-Math.sin(a)*.158);uvs.push(i/n,t);
      if(row<rows&&i<n){const k=row*(n+1)+i;indices.push(k,k+1,k+n+2,k,k+n+2,k+n+1);}
    }
  }
  const skull=new THREE.Mesh(surfaceGeometry(THREE,positions,uvs,indices),skin);skull.name='complete-skull';skull.castShadow=true;skull.receiveShadow=true;head.add(skull);
  return face;
}

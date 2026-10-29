import {CHARACTER_FACES,FACE_INDICES,FACE_BOUNDARY} from './character-face-data.js';
import {surfaceGeometry} from './character-geometry.js';
const textures=new WeakMap();
// Smooth the reconstructed surface without changing the face/skull seam.
// Midpoint triangles alone add polygons but leave the same faceted nose; Loop
// weights smooth both vertices and UVs, with the boundary pinned in place.
function smoothFace(THREE,data,iterations=2){
  let positions=data.positions,uvs=data.uvs,indices=FACE_INDICES;
  for(let pass=0;pass<iterations;pass++){
    const count=positions.length/3,neighbors=Array.from({length:count},()=>new Set()),edges=new Map();
    for(let i=0;i<indices.length;i+=3){
      const tri=indices.slice(i,i+3);
      for(let k=0;k<3;k++){
        const a=tri[k],b=tri[(k+1)%3],c=tri[(k+2)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;
        neighbors[a].add(b);neighbors[b].add(a);
        if(!edges.has(key))edges.set(key,{a,b,opposite:[]});edges.get(key).opposite.push(c);
      }
    }
    const boundary=new Set();for(const {a,b,opposite} of edges.values())if(opposite.length!==2){boundary.add(a);boundary.add(b);}
    const nextP=[],nextUV=[],nextIndices=[];
    for(let i=0;i<count;i++){
      const ns=[...neighbors[i]],beta=boundary.has(i)?0:ns.length===3?3/16:3/(8*ns.length);
      for(const [src,dst,stride] of [[positions,nextP,3],[uvs,nextUV,2]])for(let k=0;k<stride;k++)dst.push(src[i*stride+k]*(1-ns.length*beta)+beta*ns.reduce((sum,j)=>sum+src[j*stride+k],0));
    }
    for(const edge of edges.values()){
      const {a,b,opposite}=edge;edge.index=nextP.length/3;
      for(const [src,dst,stride] of [[positions,nextP,3],[uvs,nextUV,2]])for(let k=0;k<stride;k++)dst.push(opposite.length===2?
        (src[a*stride+k]+src[b*stride+k])*3/8+(src[opposite[0]*stride+k]+src[opposite[1]*stride+k])/8:
        (src[a*stride+k]+src[b*stride+k])/2);
    }
    const edgeIndex=(a,b)=>edges.get(a<b?`${a}:${b}`:`${b}:${a}`).index;
    for(let i=0;i<indices.length;i+=3){const[a,b,c]=indices.slice(i,i+3),ab=edgeIndex(a,b),bc=edgeIndex(b,c),ca=edgeIndex(c,a);nextIndices.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);}
    positions=nextP;uvs=nextUV;indices=nextIndices;
  }
  return surfaceGeometry(THREE,positions,uvs,indices);
}
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
  const material=new THREE.MeshStandardMaterial({color:data.skin,roughness:.82,emissive:data.skin,emissiveIntensity:.035});
  bindFaceTexture(THREE,id,material);
  const face=new THREE.Mesh(smoothFace(THREE,data),material);face.name='sculpted-face';face.castShadow=true;face.receiveShadow=true;head.add(face);
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

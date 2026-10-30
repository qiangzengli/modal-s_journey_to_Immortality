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
  const material=skin.clone();material.color.setHex(data.skin);
  bindFaceTexture(THREE,id,material);
  // Sub-centimetre nose/eyelid shadows alias on a map-sized shadow atlas. The
  // albedo retains their local occlusion; direct lights still shade the volume.
  const face=new THREE.Mesh(smoothFace(THREE,data),material);face.name='sculpted-face';face.castShadow=true;face.receiveShadow=false;head.add(face);
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
  // Small curved wet surfaces give the eyes a real light response while keeping
  // the period portrait's gaze and eyelid shape. They do not replace it with dots.
  const eyeMaterial=new THREE.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.07,roughness:.08,clearcoat:1,clearcoatRoughness:.08,depthWrite:false});
  const eyePositions=[],eyeUV=[],eyeIndices=[];
  for(const loop of [[33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246],[263,249,390,373,374,380,381,382,362,398,384,385,386,387,388,466]]){
    const points=loop.map(i=>new THREE.Vector3(...data.positions.slice(i*3,i*3+3)));
    const center=points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).multiplyScalar(1/points.length),offset=eyePositions.length/3;
    eyePositions.push(center.x,center.y,center.z+.005);eyeUV.push(.5,.5);
    for(let i=0;i<points.length;i++){const p=points[i];eyePositions.push(p.x,p.y,p.z+.001);eyeUV.push(i/points.length,0);eyeIndices.push(offset,offset+i+1,offset+(i+1)%points.length+1);}
  }
  for(let i=0;i<eyeIndices.length;i+=3){
    const[a,b,c]=eyeIndices.slice(i,i+3).map(j=>new THREE.Vector3(...eyePositions.slice(j*3,j*3+3)));
    if(b.sub(a).cross(c.sub(a)).z<0)[eyeIndices[i+1],eyeIndices[i+2]]=[eyeIndices[i+2],eyeIndices[i+1]];
  }
  const corneas=new THREE.Mesh(surfaceGeometry(THREE,eyePositions,eyeUV,eyeIndices),eyeMaterial);corneas.name='corneal-highlights';head.add(corneas);
  return face;
}

// Continuous, UV-mapped surfaces for cloth and anatomy. All coordinates are local to the joint.
export function loft(THREE, sections, {segments=40, steps=32, start=0, end=Math.PI*2, folds=0, pleats=12, foldRange=null, drape=0}={}) {
  const rows=[...sections].sort((a,b)=>a[0]-b[0]);
  const positions=[],uvs=[],indices=[];
  const sample=(y,column)=>{
    let i=0;while(i<rows.length-2&&rows[i+1][0]<y)i++;
    const t=Math.max(0,Math.min(1,(y-rows[i][0])/(rows[i+1][0]-rows[i][0])));
    const a=rows[Math.max(0,i-1)][column]||0,b=rows[i][column]||0,c=rows[i+1][column]||0,d=rows[Math.min(rows.length-1,i+2)][column]||0;
    return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  };
  for(let j=0;j<=steps;j++){
    const v=j/steps,y=rows[0][0]+(rows.at(-1)[0]-rows[0][0])*v;
    for(let i=0;i<=segments;i++){
      const u=i/segments,a=start+(end-start)*u;
      const f=foldRange?(y-foldRange[0])/(foldRange[1]-foldRange[0]):v;
      // Irregular folds gather at the waist and relax toward the hem. The second
      // frequency avoids the perfectly repeated fluting of a rigid cone.
      const fold=folds*(.35+.65*(1-f))*(Math.cos(a*pleats+f*.55)+.3*Math.cos(a*pleats*2-f))
        +drape*Math.sin(Math.PI*v)*(.55*Math.sin(a*5+v*9)+.3*Math.sin(a*9-v*13));
      positions.push(sample(y,3)+(sample(y,1)+fold)*Math.sin(a),y,sample(y,4)+(sample(y,2)+fold*.65)*Math.cos(a));uvs.push(u,v);
      if(i<segments&&j<steps){const k=j*(segments+1)+i;indices.push(k,k+1,k+segments+2,k,k+segments+2,k+segments+1);}
    }
  }
  const geometry=surfaceGeometry(THREE,positions,uvs,indices);
  if(Math.abs(end-start-Math.PI*2)<1e-5)weldSeamNormals(THREE,geometry,segments,steps);
  return geometry;
}
// UV seams remain split, but a closed piece of cloth must have continuous light.
export function weldSeamNormals(THREE,geometry,segments,steps){
  const normals=geometry.attributes.normal;
  for(let row=0;row<=steps;row++){
    const first=row*(segments+1),last=first+segments;
    const n=new THREE.Vector3().fromBufferAttribute(normals,first).add(new THREE.Vector3().fromBufferAttribute(normals,last)).normalize();
    normals.setXYZ(first,n.x,n.y,n.z);normals.setXYZ(last,n.x,n.y,n.z);
  }
  return geometry;
}
export function surfaceGeometry(THREE, positions,uvs,indices){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function ribbon(THREE, points, width, {steps=30,camber=.012}={}){
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),positions=[],uvs=[],indices=[];
  for(let i=0;i<=steps;i++){
    const v=i/steps,p=path.getPoint(v),t=path.getTangent(v),side=new THREE.Vector3(t.y,-t.x,0).normalize();
    for(let j=0;j<=4;j++){
      const u=j/4,w=typeof width==='function'?width(v):width;
      const point=p.clone().addScaledVector(side,(u-.5)*w);point.z+=Math.sin(u*Math.PI)*camber;
      positions.push(...point.toArray());uvs.push(u,v);
      if(i<steps&&j<4){const k=i*5+j;indices.push(k,k+5,k+6,k,k+6,k+1);}
    }
  }
  const geometry=surfaceGeometry(THREE,positions,uvs,indices);return geometry;
}
// Tapered locks are actual volumes, not cylinders or camera-facing hair cards.
export function lockGeometry(THREE,points,width,depth,{steps=22,sides=8}={}){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),frames=curve.computeFrenetFrames(steps,false),positions=[],uvs=[],indices=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps,p=curve.getPointAt(t),taper=Math.max(.025,Math.pow(Math.sin(Math.PI*t),.5));
    for(let j=0;j<=sides;j++){
      const a=j/sides*Math.PI*2,point=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*width*taper).addScaledVector(frames.binormals[i],Math.sin(a)*depth*taper);
      positions.push(...point.toArray());uvs.push(j/sides,t);
      if(i<steps&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}
    }
  }
  return weldSeamNormals(THREE,surfaceGeometry(THREE,positions,uvs,indices),sides,steps);
}
// Merge static pieces per material and joint. Animation handles and named features stay intact.
export function batchCharacterMeshes(THREE,root,protectedNodes=new Set()){
  for(const group of [...root.children])if(group.isGroup)batchCharacterMeshes(THREE,group,protectedNodes);
  const batches=new Map();
  for(const mesh of [...root.children])if(mesh.isMesh&&!protectedNodes.has(mesh)&&!mesh.name&&mesh.geometry.attributes.normal&&mesh.geometry.attributes.uv){
    const key=mesh.material; if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);
  }
  for(const [material,meshes] of batches){
    if(meshes.length<2)continue;
    const positions=[],normals=[],uvs=[],indices=[];let offset=0;
    for(const mesh of meshes){
      mesh.updateMatrix();const g=mesh.geometry.clone().applyMatrix4(mesh.matrix);
      positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);uvs.push(...g.attributes.uv.array);
      const index=g.index?.array||Array.from({length:g.attributes.position.count},(_,i)=>i);for(const i of index)indices.push(i+offset);
      offset+=g.attributes.position.count;g.dispose();mesh.geometry.dispose();root.remove(mesh);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);
    const batch=new THREE.Mesh(g,material);batch.castShadow=true;batch.receiveShadow=true;root.add(batch);
  }
}

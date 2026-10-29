// Shared microstructure maps keep every NPC from allocating another set of fabric textures.
const caches=new WeakMap();
function weave(THREE){
  if(caches.has(THREE))return caches.get(THREE);
  const size=128,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const warp=Math.sin(x*Math.PI/2)*11,weft=Math.cos(y*Math.PI/2)*8,grain=((x*37+y*71)%17)-8;
    const value=Math.round(190+warp+weft+grain);const i=(y*size+x)*4;data.set([value,value,value,255],i);
  }
  const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(5,7);texture.needsUpdate=true;
  caches.set(THREE,texture);return texture;
}
export function characterMaterials(THREE,p){
  const material=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const cloth=color=>{const m=material(color,.82);m.bumpMap=weave(THREE);m.bumpScale=.008;m.side=THREE.DoubleSide;return m;};
  return {robe:cloth(p.robe),inner:cloth(p.inner),sash:cloth(p.sash||p.trim),trim:material(p.trim,.45,.62),skin:material(p.skin,.85),hair:material(p.hair,.72,0),hairGlint:material(p.hairGlint||0x323236,.58),leather:material(0x262626,.91),silver:material(0xb5bcc0,.32,.8),jade:material(0x527f64,.3,.1),red:cloth(0x872f35),dark:material(0x272329,.9)};
}

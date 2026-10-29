// Shared microstructure maps keep every NPC from allocating another set of fabric textures.
const caches=new WeakMap();
const hairTextures=new WeakMap();
const brocades=new WeakMap();
function embroideredSilk(THREE){
  if(brocades.has(THREE))return brocades.get(THREE);
  const w=128,h=512,data=new Uint8Array(w*h*4),base=[168,140,157],gold=[186,164,104],petal=[149,89,89];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const u=x/w,v=y/h,stem=.5+.14*Math.sin(v*Math.PI*8);
    let color=base;
    if(Math.abs(u-stem)<.014||u<.025||u>.975)color=gold;
    for(let j=0;j<8;j++){
      const cy=(j+.5)/8,side=j%2?1:-1,cx=.5+.14*Math.sin(cy*Math.PI*8)+side*.13;
      const dx=(u-cx)*.7,dy=(v-cy)*3,angle=side*.6;
      const a=dx*Math.cos(angle)-dy*Math.sin(angle),b=dx*Math.sin(angle)+dy*Math.cos(angle);
      const d=a*a/.004+b*b/.019;
      if(d<1)color=d>.7?gold:petal;
    }
    const grain=((x*17+y*31)%7)-3;
    data.set([...color.map(c=>c+grain),255],(y*w+x)*4);
  }
  const texture=new THREE.DataTexture(data,w,h);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
  brocades.set(THREE,texture);return texture;
}
function hairGrooves(THREE){
  if(hairTextures.has(THREE))return hairTextures.get(THREE);
  const size=256,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const t=x+Math.sin(y/size*Math.PI)*14;
    const value=Math.round(150+30*Math.sin(t*2.9)+18*Math.sin(t*5.1));
    data.set([value,value,value,255],(y*size+x)*4);
  }
  const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.needsUpdate=true;
  hairTextures.set(THREE,texture);return texture;
}
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
  const cloth=color=>{
    const m=new THREE.MeshPhysicalMaterial({color,roughness:p.female?.65:.86,sheen:p.female?.38:.12,sheenRoughness:.75,sheenColor:0xbfb3ac,side:THREE.DoubleSide});
    m.bumpMap=weave(THREE);m.bumpScale=.0012;return m;
  };
  const hair=material(p.hair,.67);hair.bumpMap=hairGrooves(THREE);hair.bumpScale=.0013;
  const edge=cloth(p.edge||p.inner),brocade=p.face==='nangong'?cloth(0xffffff):edge;
  if(brocade!==edge)brocade.map=embroideredSilk(THREE);
  return {robe:cloth(p.robe),inner:cloth(p.inner),edge,brocade,lining:cloth(p.female?0xd3c0bd:0xbcb9a8),sash:cloth(p.sash||p.trim),trim:material(p.trim,.58,.42),skin:material(p.skin,.82),hair,hairGlint:material(p.hairGlint||0x211f1c,.9),leather:material(p.leather||0x302c2b,.8),silver:material(0xb5bcc0,.32,.8),jade:material(0x527f64,.3,.1),red:cloth(0x872f35),dark:material(0x272329,.9)};
}

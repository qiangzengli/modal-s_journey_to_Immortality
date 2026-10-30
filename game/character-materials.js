// Shared microstructure maps keep every NPC from allocating another set of fabric textures.
const caches=new WeakMap();
const hairTextures=new WeakMap();
const brocades=new WeakMap();
function embroideredSilk(THREE){
  if(brocades.has(THREE))return brocades.get(THREE);
  const w=192,h=768,data=new Uint8Array(w*h*4),base=[155,128,146],gold=[175,151,101],petal=[136,87,103];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const u=x/w,v=y/h,stem=.5+.13*Math.sin(v*Math.PI*12);
    let color=base;
    if(Math.abs(u-stem)<.006||Math.abs(u-.045)<.008||Math.abs(u-.955)<.008)color=gold;
    for(let j=0;j<6;j++){
      const cy=(j+.5)/6,side=j%2?1:-1,cx=.5+side*.15;
      const dx=(u-cx),dy=(v-cy)*3.7,angle=Math.atan2(dy,dx),r=Math.hypot(dx,dy),edge=.10*(1+.3*Math.cos(angle*5));
      if(r<edge)color=r>edge-.012?gold:petal;
      if(r<.021)color=gold;
      const lx=(u-(.5-side*.13)),ly=(v-cy+.045)*3.7;
      const leaf=lx*lx/.006+(ly+side*lx*.7)**2/.0013;
      if(leaf<1)color=leaf>.5?gold:[130,132,112];
    }
    const stitch=((x+y*2)%5===0?-7:0)+((x*17+y*31)%7)-3;
    data.set([...color.map(c=>c+stitch),255],(y*w+x)*4);
  }
  const texture=new THREE.DataTexture(data,w,h);texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
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
  const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
  hairTextures.set(THREE,texture);return texture;
}
function weave(THREE){
  if(caches.has(THREE))return caches.get(THREE);
  const size=128,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const warp=Math.sin(x*Math.PI/2)*11,weft=Math.cos(y*Math.PI/2)*8,grain=((x*37+y*71)%17)-8;
    const value=Math.round(190+warp+weft+grain);const i=(y*size+x)*4;data.set([value,value,value,255],i);
  }
  const texture=new THREE.DataTexture(data,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(5,7);texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
  caches.set(THREE,texture);return texture;
}
export function characterMaterials(THREE,p){
  const material=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const cloth=color=>{
    const m=new THREE.MeshPhysicalMaterial({color,roughness:p.female?.65:.86,sheen:p.female?.38:.12,sheenRoughness:.75,sheenColor:0xbfb3ac,side:THREE.DoubleSide});
    m.bumpMap=weave(THREE);m.bumpScale=.0012;return m;
  };
  const hair=new THREE.MeshPhysicalMaterial({color:p.hair,roughness:.6,clearcoat:.08,clearcoatRoughness:.65});hair.bumpMap=hairGrooves(THREE);hair.bumpScale=.007;
  const edge=cloth(p.edge||p.inner),brocade=p.face==='nangong'?cloth(0xffffff):edge;
  if(brocade!==edge)brocade.map=embroideredSilk(THREE);
  const skin=new THREE.MeshPhysicalMaterial({color:p.skin,roughness:.64,clearcoat:.055,clearcoatRoughness:.55});
  const hairGlint=hair.clone();hairGlint.color.setHex(p.hairGlint||0x302d29);hairGlint.roughness=.55;
  return {robe:cloth(p.robe),inner:cloth(p.inner),edge,brocade,lining:cloth(p.female?0xd3c0bd:0xbcb9a8),sash:cloth(p.sash||p.trim),trim:material(p.trim,.48,.55),skin,hair,hairGlint,leather:material(p.leather||0x302c2b,.69),silver:material(0xb5bcc0,.32,.8),jade:new THREE.MeshPhysicalMaterial({color:0x527f64,roughness:.26,clearcoat:.5,clearcoatRoughness:.18}),red:cloth(0x872f35),dark:material(0x272329,.9)};
}

import {surfaceGeometry,lockGeometry,loft} from './character-geometry.js';

// Sculpted clumps sit on a complete scalp. Smaller strands trace each clump's
// sweep; there is no conical cap or repeated vertical "spaghetti" fringe.
export function styleCultivatorHair(THREE,{head,p,m,add,line,ellipsoid,motions}){
  const female=p.female,travel=p.costume==='disciple';
  const vertices=[],uvs=[],indices=[],sides=48,rows=22;
  for(let j=0;j<=rows;j++)for(let i=0;i<=sides;i++){
    const a=i/sides*Math.PI*2,v=j/rows;
    const edge=0.85+1.77*(1-Math.cos(a))/2;
    const theta=v*edge,ripple=.0017*Math.cos(a*31+theta*4);
    vertices.push((.169+ripple)*Math.sin(theta)*Math.sin(a),.039+(.217+ripple)*Math.cos(theta),-.005+(.18+ripple)*Math.sin(theta)*Math.cos(a)*(1-.35*Math.pow(v,7)*Math.pow(Math.max(0,Math.cos(a)),2)));uvs.push(i/sides,v);
    if(i<sides&&j<rows){const k=j*(sides+1)+i;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
  }
  add(head,surfaceGeometry(THREE,vertices,uvs,indices),m.hair,0,0,0);
  const lock=(parent,pts,w,d,name='')=>add(parent,lockGeometry(THREE,pts,w,d,{steps:18,sides:8}),m.hair,0,0,0,name);
  // Individual grooves follow the skull instead of separate bulky tube locks.
  for(const side of [-1,1]){
    if(female){
      lock(head,[[side*.105,.181,.094],[side*.163,.115,.066],[side*.174,.036,-.004],[side*.146,-.04,-.063]],.018,.008);
    }
    lock(head,[[side*.142,.112,.069],[side*.157,.026,.026],[side*.15,-.105,.009]],.009,.005);
  }
  if(travel||female){
    // Two narrow face-framing strands, long enough to reach the collar.
    for(const side of [-1,1]){
      const strand=new THREE.Group();head.add(strand);
      const pts=[[side*.13,.123,.115],[side*.155,-.02,.116],[side*.164,-.22,.12],[side*.19,-.42,.162],[side*.21,-.64,.173]];
      lock(strand,pts,female?.023:.014,.008);

      motions.push({node:strand,axis:'x',amount:.016,phase:side});
    }
  }
  const bun=ellipsoid(head,m.hair,[0,.237,-.08],[female?.071:.059,.064,.06]);
  if(!female){
    add(head,loft(THREE,[[.22,.061,.054,0,-.08],[.238,.060,.053,0,-.08]],{steps:3,segments:24}),m.edge);
    line(head,[[-.1,.232,-.08],[.1,.232,-.08]],.006,m.trim);
  }
  if(p.longHair||p.ponytail||p.elder){
    const hair=new THREE.Group();hair.name=p.ponytail?'tied-ponytail':'long-hair';hair.position.set(0,.19,-.105);head.add(hair);
    const count=p.ponytail?7:11,spread=p.ponytail?.095:.24,length=p.elder?.90:female?1.18:1.02;
    for(let j=0;j<count;j++){
      const x=(j/(count-1)-.5)*spread;
      const pts=[[x*.38,0,0],[x,-.16,-.10],[x*1.12,-.4,-.146],[x*.95+.024,-.7,-.155],[x*.6+.045,-length+(j%3)*.025,-.112]];
      lock(hair,pts,p.ponytail?.025:.027,.016);
      for(let k=0;k<2;k++)line(hair,pts.map(([a,b,c])=>[a+(k-.5)*.006,b,c-.013]),.0008,m.hairGlint);
    }
    motions.push({node:hair,axis:'x',amount:.03,phase:.5});
  }
  if(p.beard){
    const beard=new THREE.Group();beard.name='elder-beard';head.add(beard);
    for(let j=-4;j<=4;j++){
      const x=j*.008;
      lock(beard,[[x,-.139,.113],[x*1.1,-.2,.11],[x*.65,-.31,.083],[x*.2,-.36,.059]],.011,.006);
    }
    for(const side of [-1,1])for(let j=0;j<3;j++)lock(head,[[side*.013,-.092,.141],[side*.04,-.105,.132],[side*(.054+j*.004),-.165,.106]],.005,.003);
  }
  if(p.ornament&&p.face==='nangong'){
    line(head,[[-.055,.23,-.08],[.085,.23,-.09]],.004,m.trim);
    for(const side of [-1,1]){
      line(head,[[side*.158,-.028,.02],[side*.162,-.064,.02]],.002,m.trim);
      ellipsoid(head,m.trim,[side*.162,-.07,.02],[.006,.014,.004]);
      ellipsoid(head,m.red,[side*.162,-.07,.023],[.003,.009,.003]);
    }
  }else if(p.ornament){
    for(const side of [-1,1]){
      line(head,[[side*.065,.22,-.074],[side*.12,.223,-.093],[side*.16,.225,-.1]],.005,m.trim);
      for(let j=0;j<3;j++){
        const petal=ellipsoid(head,m.trim,[side*(.115+j*.018),.232+(j%2)*.013,-.095],[.016,.006,.01]);petal.rotation.z=side*.7;
      }
      ellipsoid(head,m.trim,[side*.163,-.038,.015],[.006,.012,.006]);
      ellipsoid(head,m.jade,[side*.163,-.065,.015],[.005,.013,.005]);
    }
  }
  if(p.crown){
    const crown=new THREE.Group();crown.name='ghost-crown';head.add(crown);
    if(p.face==='wangchan'){
      line(crown,[[-.058,.22,-.079],[0,.25,-.099],[.058,.22,-.079]],.008,m.silver);
      for(const side of [-1,1])line(head,[[side*.013,.232,-.065],[side*.09,.204,.12],[side*.149,.08,.13],[side*.151,-.12,.02]],.004,m.silver);
    }else{
      for(const side of [-1,0,1])add(crown,lockGeometry(THREE,[[side*.06,.21,.009],[side*.07,.28,.015],[side*.09,.34+(side===0?.03:0),.005]],.015,.008,{steps:12,sides:6}),m.trim);
      ellipsoid(crown,m.red,[0,.26,.03],[.021,.032,.01]);
    }
  }
}

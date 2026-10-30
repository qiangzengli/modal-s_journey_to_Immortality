import {surfaceGeometry,lockGeometry,loft,weldSeamNormals} from './character-geometry.js';
import {CHARACTER_FACES} from './character-face-data.js';

// Sculpted clumps sit on a complete scalp. Smaller strands trace each clump's
// sweep; there is no conical cap or repeated vertical "spaghetti" fringe.
export function styleCultivatorHair(THREE,{head,p,m,add,line,ellipsoid,motions}){
  const female=p.female,travel=p.costume==='disciple';
  const vertices=[],uvs=[],indices=[],sides=72,rows=30;
  const face=CHARACTER_FACES[p.face]||CHARACTER_FACES.examiner;
  const hairline=new THREE.CatmullRomCurve3([127,162,21,54,103,67,109,10,338,297,332,284,251,389,356].map(i=>new THREE.Vector3(...face.positions.slice(i*3,i*3+3))));
  // A single continuous scalp is fitted to the actual forehead boundary.
  // Front and rear share their temple positions, avoiding intersecting caps.
  const scalp=(a,v)=>{
    const front=Math.cos(a)>=0,u=(Math.sin(a)+1)/2;
    const temple=hairline.getPoint(Math.sin(a)<0?0:1),q=front?hairline.getPoint(u):temple.clone();
    if(!front){const t=-Math.cos(a);q.set(Math.sin(a)*Math.abs(temple.x),temple.y*(1-t)-.13*t,temple.z*(1-t)-.172*t);}
    q.x*=1.10;q.y-=.018;q.z+=.015;
    const t=v*Math.PI/2,volume=Math.sin(v*Math.PI),ridge=.001*Math.cos(a*27+v*5)*volume;
    return[q.x*Math.sin(t),.266+(q.y-.266)*(1-Math.cos(t))+ridge,-.03+(q.z+.03)*Math.sin(t)+Math.cos(a)*.014*volume+ridge];
  };
  for(let j=0;j<=rows;j++)for(let i=0;i<=sides;i++){
    const a=i/sides*Math.PI*2,v=j/rows;
    vertices.push(...scalp(a,v));uvs.push(i/sides,v);
    if(i<sides&&j<rows){const k=j*(sides+1)+i;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
  }
  add(head,weldSeamNormals(THREE,surfaceGeometry(THREE,vertices,uvs,indices),sides,rows),m.hair,0,0,0);
  const lock=(parent,pts,w,d,name='',material=m.hair)=>add(parent,lockGeometry(THREE,pts,w,d,{steps:w<.002?14:20,sides:w<.002?4:8}),material,0,0,0,name);
  for(const side of [-1,1]){
    lock(head,[[side*.138,.12,.115],[side*.169,.045,.06],[side*.161,-.06,.019],[side*.15,-.115,.016]],.016,.008);
    if(travel||female){
      const strand=new THREE.Group();head.add(strand);
      const pts=[[side*.132,.13,.125],[side*.158,.005,.109],[side*.162,-.15,.115],[side*.175,-.31,.135],[side*.19,-(female?.47:.39),.152]];
      lock(strand,pts,female?.017:.012,.006);
      lock(strand,pts.map(([x,y,z],i)=>[x+side*.007,y+(i===4?.04:0),z-.004]),.006,.003);
      motions.push({node:strand,axis:'x',amount:.012,phase:side});
    }
  }
  // A coiled bun follows a swept path instead of a single sphere perched on top.
  const coil=Array.from({length:18},(_,i)=>{const a=i/17*Math.PI*3.8;return[Math.sin(a)*.055,.235+Math.cos(a)*.038,-.082-i/17*.035]});
  lock(head,coil,.023,.019);
  if(!female){
    add(head,loft(THREE,[[.22,.061,.054,0,-.08],[.238,.060,.053,0,-.08]],{steps:3,segments:24}),m.edge);
    line(head,[[-.1,.232,-.08],[.1,.232,-.08]],.0045,m.trim);
  }
  if(p.longHair||p.ponytail||p.elder){
    const hair=new THREE.Group();hair.name=p.ponytail?'tied-ponytail':'long-hair';hair.position.set(0,.19,-.105);head.add(hair);
    const count=p.ponytail?7:11,spread=p.ponytail?.13:.30,length=p.elder?.90:female?1.18:1.02;
    for(let j=0;j<count;j++){
      const u=j/(count-1),x=(u-.5)*spread,edge=Math.abs(u-.5)*2;
      const pts=[[x*.30,0,0],[x*.85,-.17,-.10],[x*1.08,-.43,-.15],[x*.95+.025,-.72,-.17],[x*.72+.045,-length+edge*.14+(j%2)*.045,-.13]];
      lock(hair,pts,p.ponytail?.031:.037,.019);
      for(let k=0;k<3;k++)lock(hair,pts.map(([a,b,c])=>[a+(k-1)*.009,b,c-.018]),.0014,.0009,'',m.hair);
    }
    motions.push({node:hair,axis:'x',amount:.022,phase:.5});
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

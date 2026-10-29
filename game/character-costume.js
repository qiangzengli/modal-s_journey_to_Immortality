import {loft,ribbon} from './character-geometry.js';

// Clothes are cut around the body: a short travelling mantle for Han Li,
// a fitted bodice / skirt for Nangong Wan, and a long wrapped coat for elders.
export function dressCultivator(THREE,{body,p,m,add,line,ellipsoid,motions}){
  const female=p.female,travel=p.costume==='disciple',width=female?.88:p.stout?1.16:1;
  const garment=(parent,rows,material=m.robe,options={})=>add(parent,loft(THREE,rows,options),material);
  const band=(parent,points,width,material=m.edge)=>add(parent,ribbon(THREE,points,width),material);
  const hem=p.shortRobe?.83:travel?.47:female?.12:.28;
  const skirtRows=female?
    [[.12,.38,.235],[.35,.32,.21],[.72,.265,.17],[1.08,.24,.16],[1.26,.218,.147],[1.42,.175,.123]]:
    [[hem,.345*width,.23],[.65,.32*width,.217],[.94,.29*width,.2],[1.16,.255*width,.172],[1.36,.22*width,.148]];
  const skirt=garment(body,skirtRows,m.inner,{folds:.008,pleats:17,drape:.012,steps:30,segments:44});
  skirt.name='inner-pleated-robe';
  // A split tabard leaves the boots and trouser legs visible on a travelling disciple.
  const outerRows=female?
    [[.15,.405,.25],[.39,.335,.224],[.76,.274,.183],[1.13,.247,.173],[1.42,.18,.135]]:
    [[hem+.055,.365*width,.25],[.69,.34*width,.238],[.96,.305*width,.217],[1.18,.267*width,.187],[1.36,.23*width,.163]];
  const opening=female?.59:travel?.65:.29;
  const outer=garment(body,outerRows,m.robe,{start:opening,end:Math.PI*2-opening,folds:.011,pleats:13,drape:.016,steps:34,segments:48});outer.name='layered-robe';
  // Edges follow exactly the coat opening rather than floating straight gold wires.
  for(const side of [-1,1]){
    const points=outerRows.map(([y,x,z])=>[side*x*Math.sin(opening),y,z*Math.cos(opening)+.009]).reverse();
    band(body,points,female?.033:.034,female?m.brocade:m.edge);
    line(body,points.map(([x,y,z])=>[x+side*.017,y,z+.003]),.0025,m.trim);
  }
  // Curved hem edging; no solid ring bridging the split at the front.
  garment(body,[[hem+.055,outerRows[0][1]+.003,outerRows[0][2]+.003],[hem+.09,outerRows[0][1]+.002,outerRows[0][2]+.002]],m.edge,{start:opening,end:Math.PI*2-opening,steps:3,segments:48,folds:.011,pleats:13,foldRange:[hem+.055,1.36]});
  const chestRows=female?
    [[1.37,.179,.128],[1.52,.19,.145],[1.7,.247,.176],[1.83,.267,.15],[1.92,.235,.115],[1.973,.145,.09],[2.015,.088,.078]]:
    [[1.3,.22*width,.148],[1.45,.235*width,.165],[1.68,.285*width,.183],[1.84,.329*width,.17],[1.92,.29*width,.135],[1.975,.165*width,.108],[2.015,.092,.084]];
  // Back and side jacket, with fabric gathered where the belt constrains it.
  garment(body,chestRows,m.robe,{start:female?.8:.69,end:Math.PI*2-(female?.8:.69),folds:.004,drape:.008,steps:30,segments:44});
  if(female){
    garment(body,[[1.38,.178,.13],[1.53,.194,.15],[1.69,.248,.18],[1.84,.25,.145]],m.inner,{start:-.85,end:.85,folds:.003,steps:22,segments:26});
    garment(body,[[1.84,.25,.145],[1.86,.251,.131],[1.94,.208,.1],[2.04,.075,.073]],m.skin,{start:-.82,end:.82,steps:18,segments:24});
    band(body,[[-.21,1.83,.096],[-.12,1.84,.128],[0,1.815,.157],[.12,1.84,.128],[.21,1.83,.096]],.027,m.edge);
    for(const side of [-1,1]){
      const pts=[[side*.083,2.012,.071],[side*.185,1.9,.12],[side*.215,1.76,.166],[side*.16,1.55,.158],[side*.128,1.4,.14]];
      band(body,pts,.067,m.brocade);line(body,pts.map(([x,y,z])=>[x+side*.023,y,z+.008]),.003,m.trim);
    }
    // Delicate folded shoulder drape, distinct from the male crossed collar.
    for(const side of [-1,1]){
      
      line(body,[[side*.095,1.93,.075],[side*.125,1.916,.099],[side*.17,1.918,.091]],.002,m.skin);
    }
  }else{
    garment(body,[[1.31,.212*width,.12,0,.027],[1.5,.236*width,.139,0,.032],[1.72,.278*width,.148,0,.04],[1.88,.262*width,.11,0,.025],[2.02,.078,.076]],m.inner,{folds:.003,drape:.004,steps:28,segments:40});
    // One overlapping lapel reads as a real cross collar; the old symmetric X
    // left two exposed diagonals all the way down the belly.
    band(body,[[-.077,2.015,.083],[-.147,1.91,.135],[-.07,1.758,.19],[.005,1.68,.182]],.062,m.lining);
    band(body,[[.078,2.015,.084],[.149,1.91,.138],[.02,1.735,.206],[-.13,1.53,.187],[-.17,1.36,.166]],travel?.09:.072,m.edge);
    line(body,[[.112,1.99,.09],[.175,1.905,.134],[.057,1.73,.213],[-.095,1.52,.196],[-.139,1.36,.175]],.003,m.trim);
    if(travel){
      // Short outer lapels frame the ochre under-robe, as in the early animation.
      for(const side of [-1,1])band(body,[[side*.11,1.99,.06],[side*.23,1.85,.137],[side*.205,1.6,.163],[side*.195,1.37,.129]],.058,m.edge);
    }
  }
  const beltY=female?1.41:1.34,beltW=female?.188:.241*width;
  garment(body,[[beltY-.085,beltW,.164],[beltY-.02,beltW+.008,.17],[beltY+.048,beltW,.162]],female?m.sash:m.leather,{steps:10,segments:40,folds:.002});
  for(const dy of [-.067,.031])line(body,Array.from({length:25},(_,i)=>{const a=i/24*Math.PI*2;return[Math.sin(a)*(beltW+.003),beltY+dy,Math.cos(a)*.17]}),.0035,m.trim);
  const clasp=ellipsoid(body,m.trim,[0,beltY-.018,.183],[female?.044:.071,.035,.012]);
  ellipsoid(body,female?m.jade:m.dark,[0,beltY-.018,.196],[female?.022:.046,.022,.005]);
  for(const side of [-1,1]){
    const sash=new THREE.Group();sash.position.set(side*(female?.07:.12),beltY-.07,.185);body.add(sash);
    band(sash,[[0,0,0],[side*.025,-.2,.025],[side*.028,-.46,.048],[side*.07,-(female?.91:.67),.055]],female?.055:.027,female?m.sash:m.edge);
    motions.push({node:sash,axis:'x',amount:.04,phase:side});
  }
  // Sparse sewn scrollwork on shoulders and front skirt. It follows the cloth
  // surface and uses the same batch material, instead of extra transparent quads.
  for(const side of [-1,1]){
    for(let j=0;j<3;j++){
      const x=side*(.20+j*.032),y=1.87-j*.026,z=.136-j*.012;
      line(body,[[x,y-.11,z+.027],[x-side*.013,y-.05,z+.02],[x+side*.02,y,z],[x+side*.045,y-.025,z-.013],[x+side*.018,y-.043,z+.007]],.0025,m.trim);
    }
    if(female)for(let j=0;j<4;j++){
      const x=side*(.17+j*.025),y=.31+j*.04;
      line(body,[[x,y,.225],[x+side*.04,y+.05,.224],[x+side*.02,y+.105,.218],[x-side*.007,y+.08,.22]],.002,m.trim);
    }
  }
  const arms=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*(female?.258:.314*width),1.865,0);arm.name=side<0?'left-shoulder':'right-shoulder';body.add(arm);arms.push(arm);
    const elbowX=side*.09,wristX=side*.115;
    ellipsoid(arm,m.robe,[-side*.006,-.048,0],[female?.11:.13,.102,female?.115:.137]);
    // All sleeves have a rounded deltoid, a soft elbow and an actual wrist.
    const sleeveRows=travel?
      [[-.445,.16,.137,elbowX,.013],[-.37,.168,.139,side*.085,0],[-.22,.135,.139,side*.045,0],[-.055,.14,.143,0,0],[.025,.108,.11,-side*.024,0]]:
      female?[[ -.67,.137,.115,wristX,.025],[-.56,.155,.126,side*.11,.01],[-.4,.125,.113,side*.09,0],[-.20,.114,.115,side*.045,0],[-.045,.12,.12,0,0],[.025,.097,.099,-side*.019,0]]:
      [[-.68,.157,.128,wristX,.015],[-.55,.161,.133,side*.10,0],[-.34,.131,.128,side*.075,0],[-.14,.132,.13,side*.036,0],[-.02,.14,.132,0,0],[.025,.1,.10,-side*.022,0]];
    garment(arm,sleeveRows,m.robe,{folds:.008,drape:.011,pleats:9,steps:28,segments:32});
    const cuffY=travel?-.445:-.68,cuffW=travel?.162:female?.139:.158;
    garment(arm,[[cuffY-.007,cuffW+.003,.14,travel?elbowX:wristX,.015],[cuffY+.029,cuffW+.01,.142,travel?elbowX:wristX,.015]],m.edge,{steps:5,segments:32,folds:.003});
    if(travel){
      garment(arm,[[-.725,.065,.065,wristX,.02],[-.66,.075,.074,wristX,.022],[-.53,.09,.087,wristX,.022],[-.40,.096,.09,wristX,.022]],m.edge,{steps:16,segments:28,folds:.003});
      for(let j=0;j<6;j++){
        const y=-.7+j*.043,r=.084+j*.003;
        garment(arm,[[y,r,r,wristX,.022],[y+.012,r+.001,r+.001,wristX,.022]],m.lining,{steps:2,segments:24});
      }
      // Raised, embossed bracer plate covering the forearm wraps.
      band(arm,[[wristX,-.7,.099],[side*.11,-.56,.117],[elbowX,-.43,.113]],v=>.105+.05*v,m.leather);
      for(const offset of [-.043,.043])line(arm,[[wristX+offset,-.69,.113],[side*.11+offset,-.56,.132],[elbowX+offset,-.44,.124]],.003,m.trim);
      line(arm,[[wristX,-.67,.118],[wristX-.025,-.59,.136],[wristX+.025,-.53,.137],[wristX,-.46,.127]],.004,m.trim);
    }else garment(arm,[[-.731,.06,.054,wristX,.023],[-.667,.069,.063,wristX,.023]],m.lining,{steps:5,segments:24});
    const hand=new THREE.Group();hand.position.set(wristX,-.787,.025);arm.add(hand);
    ellipsoid(hand,m.skin,[0,0,0],[.049,.065,.031]);
    for(let finger=0;finger<4;finger++){
      const x=(finger-1.5)*.022,end=-.105+(finger===0||finger===3?.014:0);
      line(hand,[[x,-.028,.004],[x,-.071,.014],[x+side*.004,end,.027]],.0105,m.skin);
    }
    line(hand,[[side*-.035,.012,.005],[side*-.058,-.018,.024],[side*-.052,-.049,.038]],.013,m.skin);
    if(p.shoulders)for(let j=0;j<3;j++){
      const plate=ellipsoid(arm,m.silver,[side*(.012+j*.022),-.013-j*.035,0],[.14-j*.014,.045,.14]);plate.rotation.z=-side*.3;
    }
  }
  return arms;
}

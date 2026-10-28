import { GameError } from './errors.js';
import { FRONTIER_PEOPLE, FRONTIER_ACTIONS, ENDINGS } from './campaign-data.js';
import { REGIONS, regionName } from './regions.js';

export function ensureCampaign(game) {
  const defaults = { version:1, visited:['market','woods'], flags:{}, ore:0, mined:0, gathered:0, alternatePill:false, vault:180, ending:null, endingEvent:0 };
  game.campaign ??= {};
  for (const [key, value] of Object.entries(defaults)) game.campaign[key] ??= value;
  for(const actor of FRONTIER_PEOPLE) game.people[actor.id] ??= {...structuredClone(actor),knowledge:{},trust:0,condition:'正常'};
  if(!game.campaign.visited.includes(game.player.place))game.campaign.visited.push(game.player.place);
  return game;
}
function note(game, actor, text, causes=[]) {
  const id=game.nextId++;
  game.events.push({id,turn:game.turn,actor,text,causes:causes.filter(Boolean),scope:'public'});
  return id;
}
export function travelRegion(source, to) {
  const game=ensureCampaign(structuredClone(source));
  if(game.exploration?.battle)throw new GameError('请先离开斗法空间再赶路。');
  if(!REGIONS[game.player.place]?.neighbors.includes(to))throw new GameError('只能从相邻的山道往返，请按天下图的路线前行。');
  game.player.place=to;
  const first=!game.campaign.visited.includes(to);
  if(first){game.campaign.visited.push(to);note(game,'游历',`初到${regionName(to)}。${REGIONS[to].description}`);}
  return {game,result:`来到${regionName(to)}。${REGIONS[to].description}`};
}
const evidenceCount = game => ['manifest','water','vein'].filter(key=>game.campaign.flags[key]).length;
const requireValue=(condition,message)=>{if(!condition)throw new GameError(message);};
function spend(game, {herbs=0,ore=0,stones=0,hp=0,talismans=0}) {
  requireValue(game.player.herbs>=herbs,`需要 ${herbs} 株灵草。`);
  requireValue(game.campaign.ore>=ore,`需要 ${ore} 块赤砂灵矿，可在矿场开采。`);
  requireValue(game.player.stones>=stones,`需要 ${stones} 灵石。`);
  requireValue(game.player.hp>hp,`气血必须高于 ${hp}，请先调息。`);
  requireValue(game.player.talismans>=talismans,`需要 ${talismans} 张天雷符。`);
  game.player.herbs-=herbs;game.campaign.ore-=ore;game.player.stones-=stones;game.player.hp-=hp;game.player.talismans-=talismans;
}
export function applyCampaignAction(game, type) {
  ensureCampaign(game);
  const def=FRONTIER_ACTIONS.find(action=>action.type===type), c=game.campaign, f=c.flags;
  requireValue(def,'未知的游历行动。');
  requireValue(type==='frontier_rest'?['river','quarry','ruins'].includes(game.player.place):game.player.place===def.place,`请先前往${regionName(def.place)}。`);
  const oneTime={read_manifest:'manifest',sample_water:'water',inspect_vein:'vein',aid_workers:'aid',repair_sluice:'sluice',open_archive:'opened',read_core:'truth',read_names:'names'};
  requireValue(!oneTime[type]||!f[oneTime[type]],'这件事已经完成，不会重复发放线索或奖励。');
  let text;
  if(type==='read_manifest')text='货单显示：失踪药船曾为赤砂矿场运送“养脉丹”。沈秋的丹药也是同一条商路流出的货物。';
  if(type==='sample_water')text='枯泉水样里混着赤色矿屑，残余灵气被整齐截断。这不是普通的旱灾。';
  if(type==='inspect_vein')text='你辨认出抽脉阵纹：矿机只是导管，真正的灵枢藏在更东面的归墟遗府。';
  if(type==='gather_reeds'){
    requireValue(c.gathered<3,'河谷可安全采集的月露草已经取尽。可返回灵圃培养。');c.gathered++;game.player.herbs+=2;text='采下两株月露草，作为灵草收入行囊。你留下了未成熟的根茎。';
  }
  if(type==='mine_ore'){
    requireValue(c.mined<6,'可安全开采的矿层已经取尽。保留灵矿用于开府、修闸或结局，也可等待人物援助。');requireValue(game.player.hp>=20,'气血至少 20 才能下矿。');spend(game,{hp:8});c.mined++;c.ore+=2;text='开采两块赤砂灵矿，矿尘令你损失 8 气血。';
  }
  if(type==='frontier_rest'){
    requireValue(game.player.hp<100,'气血已满，无需付费调息。');spend(game,{stones:8});const healed=Math.min(35,100-game.player.hp);game.player.hp+=healed;text=`在${regionName(game.player.place)}借静地调息，恢复 ${healed} 气血。`;
  }
  if(type==='aid_workers'){
    spend(game,{herbs:2});game.people.song.trust+=15;game.player.reputation=Math.min(100,game.player.reputation+8);text='你为工棚配好药，病痛暂缓。修闸图留在工棚供你查阅，宋砚记住了这份帮助。';
  }
  if(type==='repair_sluice'){
    requireValue(f.vein,'先辨认矿场阵纹，才知道该断开哪条导管。');spend(game,{ore:2,herbs:1});game.people.yue.trust+=15;text='分流旧闸恢复运转，云渡河谷有了细流。这只能缓解枯水，灵枢本身仍在抽取地脉。';
  }
  if(type==='brew_trace_pill'){
    requireValue(f.water&&f.vein,'需要枯泉水样与矿场阵纹实证，才能补全归脉丹方。');
    requireValue(!c.alternatePill&&!f.brewed&&!game.flags.playerBreakthrough&&game.pill.owner!=='player','已有筑基机缘或已经炼制过归脉丹，无需重复炼丹。');
    spend(game,{herbs:3,ore:2,stones:80});c.alternatePill=true;f.brewed=true;text='归脉丹已炼成。可返回听雨亭服丹筑基；原本那枚筑基丹的归属和旧债都不会因此改变。';
  }
  if(type==='open_archive'){
    requireValue(evidenceCount(game)>=2,'石门需要货单、水样、矿纹中的至少两份实证，不能只凭传闻开门。');
    if(!f.support)spend(game,{ore:2});text=f.support?'借助人物交来的阵源，归墟石门开启。':'你以两块灵矿补足阵源，归墟石门开启。';
  }
  if(type==='read_core'){
    requireValue(f.opened,'先开启归墟石门。');text='万息旧契揭示：古府曾为救灾积蓄灵气，后来却将河谷居民与地脉当作长期供源。矿场和养脉丹都依赖这座灵枢。你可以归还地脉、承下矿契，或将它封存。';
  }
  if(type==='read_names'){
    requireValue(f.opened,'先开启归墟石门。');text='你拓下供息者的姓名。无论最后如何处置灵枢，这份记录都不会再因封府而消失。';
  }
  const endings={restore_flow:'restore',lease_core:'lease',seal_core:'seal'};
  if(endings[type]){
    requireValue(f.truth,'先读取万息旧契，弄清三条路的代价。');requireValue(!c.ending,'本卷的灵枢归属已经确定，可继续游历，但不能反复领取结局奖励。');
    if(type==='restore_flow'){requireValue(game.garden?.bottle,'需要先在黑风林认主小绿瓶，以灵液稳定回流。');spend(game,{ore:2,herbs:2});}
    if(type==='lease_core')spend(game,{ore:2});
    if(type==='seal_core')spend(game,{hp:20,talismans:1});
    c.ending=endings[type];
    const reward={restore:[60,'spring_manual',12],lease:[140,'flame_sword',-8],seal:[90,'thunder_manual',4]}[c.ending];
    requireValue(c.vault>=reward[0],'遗府府库不足，不能重复取物。');c.vault-=reward[0];game.player.stones+=reward[0];
    game.exploration.inventory[reward[1]]=(game.exploration.inventory[reward[1]]||0)+1;
    game.player.reputation=Math.max(0,Math.min(100,game.player.reputation+reward[2]));
    if(c.ending==='restore')game.player.herbs+=4;
    text=`${ENDINGS[c.ending].title}：${ENDINGS[c.ending].text}${f.names?' 你保存的姓名拓本将与真相一起流传。':' 你没有拓下碑林姓名，一部分供息者的往事仍埋在古府。'}`;
  }
  requireValue(text,'游历行动尚不可执行。');
  const id=note(game,'游历',text,[f.manifest,f.water,f.vein]);
  if(oneTime[type])f[oneTime[type]]=id;
  if(endings[type])c.endingEvent=id;
  return text;
}
export function campaignNpcOptions(game,id) {
  const c=game.campaign;if(!c)return[];
  const p=game.people[id],f=c.flags,options=[];
  if(['yue','tao','song','ji'].includes(id)&&!f.opened&&!f.support&&!c.ending&&p.stones>=20&&p.trust>=10&&evidenceCount(game)>=2)options.push({id:'support_archive',label:'从自己的资金投入20灵石准备阵源，帮助玩家开启归墟石门'});
  if(['qiao','yuan'].includes(id)&&f.truth&&!c.ending&&!p.knowledge.coreDebated)options.push({id:'debate_core',label:'根据自己的利益公开说明对灵枢归属的立场，不能替玩家选择结局'});
  if(c.ending){
    if(['yue','song','qiao'].includes(id)&&!f.recovery&&p.stones>=30)options.push({id:'rebuild_livelihood',label:`从自己的资金投入30灵石${c.ending==='lease'?'整顿矿场工棚和货运':'安排矿工转业、修整渡口'}，不改变灵枢归属`});
    if(id==='tao'&&!f.relief&&(game.society?.minds[id]?.herbs||0)>=1)options.push({id:'treat_workers',label:'消耗自己通过委托收到的1株灵草救治工棚病患，不索取玩家背包物品'});
    if(['yuan','ji'].includes(id)&&f.names&&!f.history&&p.stones>=15)options.push({id:'preserve_names',label:'从自己的资金投入15灵石誊刻已拓印的供息者姓名，公开保存旧史'});
  }
  return options;
}
export function applyCampaignNpc(game,id,action) {
  requireValue(campaignNpcOptions(game,id).some(option=>option.id===action),'当前不能执行这项人物行动。');
  if(action==='support_archive'){game.people[id].stones-=20;game.campaign.flags.support=note(game,game.people[id].name,`${game.people[id].name}以自己的 20 灵石备好阵源，托传音客交给你。开府时可以省下灵矿。`);}
  else if(action==='debate_core')game.people[id].knowledge.coreDebated=note(game,game.people[id].name,`${game.people[id].name}公开参与灵枢归属的争论。最终抉择仍由你亲自作出。`,[game.campaign.flags.truth]);
  else {
    const actor=game.people[id], c=game.campaign;
    const effects={
      rebuild_livelihood:{flag:'recovery',stones:30,text:c.ending==='lease'?'整顿工棚与货运，矿工有了过渡安排，但河谷仍承受抽脉代价':'为矿工转业和渡口修整筹资，旧商路开始寻找新的生计'},
      treat_workers:{flag:'relief',herbs:1,text:'用委托所得的一株灵草救治工棚病患，病痛得到缓解，地脉的后果仍需面对'},
      preserve_names:{flag:'history',stones:15,text:'誊刻供息者姓名，将玩家带出的拓本公开保存，让旧契中的牺牲有据可查'}
    };
    const effect=effects[action];
    actor.stones-=effect.stones||0;
    if(effect.herbs)game.society.minds[id].herbs-=effect.herbs;
    c.flags[effect.flag]=note(game,actor.name,`${actor.name}自主决定${effect.text}。`,[c.endingEvent,c.flags.truth,...(effect.flag==='history'?[c.flags.names]:[])]);
  }
}
export function campaignView(game) {
  const c=game.campaign||{visited:['market','woods'],flags:{},ore:0,mined:0,gathered:0,ending:null},f=c.flags;
  const chapters=[
    {id:'river',title:'第一章 · 河上无舟',summary:'追查药船与枯泉，找到断流实证。',done:Boolean(f.manifest&&f.water),target:'ferry'},
    {id:'quarry',title:'第二章 · 赤砂有骨',summary:'辨认抽脉阵纹，在矿工生计与河谷病痛间作出行动。',done:Boolean(f.vein),target:'ore'},
    {id:'ruins',title:'第三章 · 万息归谁',summary:'进入遗府，读懂旧契，再决定灵枢的归属。',done:Boolean(c.ending),target:'archive'}
  ];
  const objectives=[['read_manifest','货单与药船','ferry',f.manifest],['sample_water','枯泉实证','spring',f.water],['inspect_vein','抽脉阵纹','ore',f.vein],['aid_workers','工棚的求生路（可选）','workers',f.aid],['repair_sluice','为云渡引回支流（可选）','sluice',f.sluice],['open_archive','开启归墟石门','archive',f.opened],['read_core','读取万息旧契','core',f.truth],['read_names','留下供息者姓名（可选）','memorial',f.names]]
    .map(([type,title,target,done])=>({type,title,target,done:Boolean(done)}));
  const aftermath=[['recovery','矿工与商路的生计','song'],['relief','工棚病患的救治','tao'],['history','供息者姓名的留存','yuan']].map(([flag,title,target])=>({title,target,done:Boolean(f[flag]),eventId:f[flag]||null}));
  return {title:'卷一 · 枯潮来信',chapters,objectives,aftermath,ending:c.ending?{id:c.ending,...ENDINGS[c.ending]}:null,flags:{...f},ore:c.ore,minesRemaining:6-c.mined,reedsRemaining:3-c.gathered,alternatePill:Boolean(c.alternatePill),visited:[...c.visited],regions:Object.entries(REGIONS).map(([id,region])=>({id,...region,visited:c.visited.includes(id),current:game.player.place===id}))};
}

import { SECT_PEOPLE } from './sect-data.js';
import { GameError } from './errors.js';
import { FRONTIER_PEOPLE, FRONTIER_ACTIONS } from './campaign-data.js';
import { REGIONS, regionName, travelAccess } from './regions.js';
import { cultivationRealm } from './cultivation.js';

export function ensureCampaign(game) {
  const defaults={version:2,visited:['market','woods'],flags:{},storyFlags:{},questHerbs:[],ore:0,mined:0,gathered:0,alternatePill:false,vault:180,ending:null,endingEvent:0};
  game.campaign??={};
  for(const [key,value]of Object.entries(defaults))game.campaign[key]??=value;
  // Historical campaign fields and reward balances remain untouched and are never replayed.
  for(const actor of [...FRONTIER_PEOPLE,...SECT_PEOPLE]) {
    game.people[actor.id]??={...structuredClone(actor),knowledge:{},trust:0,condition:'正常'};
    if(game.campaign.canonVersion!==1)for(const key of ['name','role','realm','bio','goal','publicGoal','temperament'])game.people[actor.id][key]=actor[key];
  }
  game.campaign.canonVersion=1;
  if(!game.campaign.visited.includes(game.player.place))game.campaign.visited.push(game.player.place);
  return game;
}
function note(game,actor,text,causes=[],scope='player') {
  const id=game.nextId++;
  game.events.push({id,turn:game.turn,actor,text,causes:causes.filter(Boolean),scope});return id;
}
export function travelRegion(source,to) {
  const game=ensureCampaign(structuredClone(source));
  if(game.exploration?.battle)throw new GameError('请先离开斗法空间再赶路。');
  const access=travelAccess(game,to);if(!access.available)throw new GameError(access.reason);
  if(to===game.player.place)throw new GameError('你已在此区域，无需再次传送。');
  game.player.place=to;
  if(!game.campaign.visited.includes(to)){game.campaign.visited.push(to);note(game,'游历',`初到${regionName(to)}。${REGIONS[to].description}`,[],'public');}
  return {game,result:`传送抵达${regionName(to)}。${REGIONS[to].description}`};
}
const requireValue=(value,message)=>{if(!value)throw new GameError(message);};
export function applyCampaignAction(game,type) {
  ensureCampaign(game);
  const def=FRONTIER_ACTIONS.find(a=>a.type===type),c=game.campaign,f=c.storyFlags;
  requireValue(def,'这项旧游历行动已结束，请打开主线手记继续黄枫谷之旅。');
  requireValue(type==='frontier_rest'?['river','quarry','ruins'].includes(game.player.place):game.player.place===def.place,`请先前往${regionName(def.place)}。`);
  requireValue(!f[type]||def.repeatable,'这段经历已经完成，奖励不会重复领取。');
  const missing=def.requires.find(key=>!f[key]);
  requireValue(!missing,`先完成「${FRONTIER_ACTIONS.find(a=>a.type===missing)?.title}」。`);
  if(def.encounter) requireValue(game.exploration?.enemies[def.encounter]?.defeated&&game.exploration.enemies[def.encounter].looted,'需亲自赢下斗法并收取战利品，才能完成这段经历。');
  if(['sword_trace','fight_swordsman'].includes(type))requireValue(!f.leave_forbidden&&!game.flags.playerBreakthrough,'这次禁地试炼已经结束，无法重演未参加的争斗。');
  const hp={gather_monkey_flower:8,gather_jade_mushroom:8}[type]||0;
  const herbs={garden_cultivate:2,aid_hanyunzhi:1}[type]||0;
  requireValue(game.player.hp>hp,`气血须高于 ${hp}，请先休养。`);
  requireValue(game.player.herbs>=herbs,`需要 ${herbs} 株灵草。`);
  const item=id=>{game.exploration.inventory[id]=(game.exploration.inventory[id]||0)+1;};
  let text;
  switch(type) {
    case 'huangfeng_register':
      requireValue(!game.sects.membership||game.sects.membership.sectId==='qinglan','已有其他门派归属，请先处理门籍，不能同时加入两派。');
      requireValue(game.exploration.inventory.ascension_token>0||game.sects.membership?.sectId==='qinglan','需持有升仙令；未持令的旧旅人可先向钟灵道递交拜帖，获邀入黄枫谷后再登记。');
      game.sects.membership??={sectId:'qinglan',joinedTurn:game.turn};game.sects.application=null;
      text='叶师叔核验了你的入门凭据，将韩立记入黄枫谷门籍。门中筑基丹分配紧张，你决定先接百药园差事，另寻修炼与筑基的机会。';break;
    case 'garden_duty': game.player.herbs+=2;item('huanglong_recipe');text='你接下马师兄看守百药园的差事，领到两株修炼药材。园中清静，适合潜修长春功；药园所得与自己的秘密须分清。';break;
    case 'garden_cultivate': item('spirit_pill');text='你将药草用于炼药，借黄龙丹、金髓丸辅助长春功，在百药园潜修至炼气十一层。继续筑基仍需要真正的筑基丹。';break;
    case 'forbidden_enlist': requireValue(!game.flags.playerBreakthrough,'血色禁地试炼面向炼气弟子。你已经筑基，可直接拜师李化元。');text='你向李化元报名参加七派血色禁地试炼。紫猴花、玉髓芝与天灵果是这次采药的目标，禁地中的争夺不会因同属七派而停止。';break;
    case 'enter_forbidden': requireValue(!game.flags.playerBreakthrough,'已经筑基，不能再参加炼气弟子的禁地试炼；可直接拜师。');text='禁制开启，你随七派炼气弟子踏入血色禁地。众人落点不同，能否带着灵药返回，只能靠自己谨慎行事。';break;
    case 'gather_monkey_flower': c.questHerbs.push('紫猴花');text='你避开密林里的危险，采到紫猴花。它收入任务药囊，不会被普通灵草交易消耗。';break;
    case 'gather_jade_mushroom': c.questHerbs.push('玉髓芝');text='你在寒潭边采到玉髓芝，付出少许气血，将主药收入独立药囊。';break;
    case 'aid_hanyunzhi': game.people.tao.trust+=15;text='你将一株灵草交给菡云芝，帮她缓解禁地里的困境。她记住这份援手，双方各自的采药之路仍由自己决定。';break;
    case 'meet_nangong': text='你进入中心区域，与南宫婉相遇。石殿中的危险令你们暂时联手；她的真正来历还不是此时能够轻易问出的事。';break;
    case 'fight_mojiao': if(!c.questHerbs.includes('天灵果'))c.questHerbs.push('天灵果');game.people.ji.trust+=10;text='你与南宫婉在石殿中击败墨蛟，亲手采下天灵果，收入任务药囊。共斗的经历留在彼此记忆中，眼下先要带药离开禁地。';break;
    case 'leave_forbidden': text='你带着三味主药离开血色禁地。李化元等候弟子归来，交药后可按门规领取筑基丹。';break;
    case 'deliver_spirit_herbs':
      requireValue(game.sects.membership?.sectId==='qinglan','需以黄枫谷弟子身份向宗门交药。');
      requireValue(['紫猴花','玉髓芝','天灵果'].every(h=>c.questHerbs.includes(h)),'三味任务主药尚未收齐。');
      c.questHerbs=c.questHerbs.filter(h=>!['紫猴花','玉髓芝','天灵果'].includes(h));c.alternatePill=true;
      text='你向黄枫谷交付三味主药，领取一枚筑基丹。此丹独立于坊市那枚机缘，先前的债务与交易仍然有效。可前往太岳山静处服丹筑基。';break;
    case 'sword_trace': text='你循着断裂法器与银剑划痕，发现一名赤足持剑的巨剑门修士。尚不知道他携有什么宝物，可先交谈试探，再决定迎战还是绕开。';break;
    case 'fight_swordsman': text='巨剑门赤脚大汉已在斗法中落败。你取出储物袋，发现一张布满奇异花纹的银色书页，暂时看不懂用途，决定先收好再离开禁地。';break;
    case 'examine_silver_page':
      requireValue(game.exploration.inventory.silver_page>0,'需实际从赤脚大汉的储物袋中取得银色书页。');
      text='回到百药园后，你细看银页上的奇异花纹，常用辨识手段并未解开秘密。书页仍完整保留，日后拜师、研习剑诀时再核对线索。';break;
    case 'compare_sword_pages':
      requireValue(game.exploration.inventory.silver_page>0,'银色书页须仍在行囊中。');
      requireValue(game.exploration.learned.includes('wind_blade'),'先在行囊中研习李化元所传的青元剑诀。');
      item('sword_page_notes');text='你结合李化元所藏金页的线索，以所学剑诀研究银页，将花纹与剑芒感应记入参悟手记。书页没有消失，修为也没有凭空提升，更深的剑诀仍待继续修炼。';break;
    case 'take_master':
      requireValue(game.flags.playerBreakthrough,'需先实际取得筑基丹并完成筑基。');
      requireValue(game.sects.membership?.sectId==='qinglan','需先拜入黄枫谷。');
      item('wind_manual');text='筑基之后，你正式拜李化元为师，从绿波洞取得青元剑诀，开始黄枫谷筑基弟子的修行。功法已收入行囊，可自行研习。';break;
    case 'gather_reeds': requireValue(c.gathered<3,'药园这批可采灵草已经取尽，可继续培养自己的灵圃。');c.gathered++;game.player.herbs+=2;text='按药园差事份额采下两株灵草，收入行囊。';break;
    case 'frontier_rest':
      requireValue(game.player.hp<100,'气血已满，无需付费调息。');requireValue(game.player.stones>=8,'需要 8 灵石。');
      game.player.stones-=8;game.player.hp=Math.min(100,game.player.hp+35);text='你借静地调息，恢复最多 35 气血。';break;
  }
  game.player.hp-=hp;game.player.herbs-=herbs;
  const id=note(game,'黄枫谷',text,[...def.requires.map(key=>f[key]), ...(def.encounter?[game.exploration.enemies[def.encounter]?.victoryEventId]:[])]);if(!def.repeatable)f[type]=id;
  return text;
}
export function campaignNpcOptions(game,id) {
  const f=game.campaign?.storyFlags||{},p=game.people[id];if(!p)return[];
  const options=[];
  if(['yue','song'].includes(id)&&f.enter_forbidden&&!f.scout_help&&p.trust>=10&&p.stones>=20)options.push({id:'share_trial_notes',label:'以自己的20灵石整理禁地见闻并公开提醒同门，不替玩家采药或完成任务'});
  if(id==='tao'&&f.leave_forbidden&&!f.relief&&(game.society?.minds[id]?.herbs||0)>=1)options.push({id:'treat_survivors',label:'用本人委托所得的1株灵草照料试炼伤者'});
  return options;
}
export function applyCampaignNpc(game,id,action) {
  requireValue(campaignNpcOptions(game,id).some(o=>o.id===action),'当前不能执行这项人物行动。');
  const p=game.people[id],f=game.campaign.storyFlags;
  if(action==='share_trial_notes'){p.stones-=20;f.scout_help=note(game,p.name,`${p.name}自主花费 20 灵石整理禁地见闻，提醒同门谨慎采药。`,[f.enter_forbidden],'public');}
  if(action==='treat_survivors'){game.society.minds[id].herbs--;f.relief=note(game,p.name,`${p.name}用委托所得的一株灵草救治试炼伤者。`,[f.leave_forbidden],'public');}
}
export function campaignView(game) {
  const c=game.campaign,f=c.storyFlags||{};
  const objectives=FRONTIER_ACTIONS.filter(a=>!a.utility).map(a=>({ ...a,target:a.site,done:Boolean(f[a.type]),missed:Boolean(a.thread==='silver_page'&&!f.fight_swordsman&&(f.leave_forbidden||game.flags.playerBreakthrough)),skipped:Boolean(game.flags.playerBreakthrough&&['garden_duty','garden_cultivate','forbidden_enlist','enter_forbidden','gather_monkey_flower','gather_jade_mushroom','meet_nangong','fight_mojiao','leave_forbidden','deliver_spirit_herbs'].includes(a.type)&&!f[a.type]),unlocked:a.requires.every(key=>f[key])}));
  const next=objectives.find(a=>!a.done&&!a.optional&&!a.skipped);
  return {title:'卷二 · 黄枫仙途',summary:next?.detail||'筑基拜师已成，青元剑诀的修行由此开始。',next,complete:Boolean(f.take_master),objectives,
    chapters:[{id:'qinglan',title:'一 · 升仙入谷',summary:'凭升仙令入黄枫谷。',done:Boolean(f.huangfeng_register),target:'sect_qinglan'}, {id:'river',title:'二 · 百药潜修',summary:'接管百药园，潜修长春功。',done:Boolean(f.garden_cultivate),target:'ferry'}, {id:'quarry',title:'三 · 血色试炼',summary:'七派禁地采药，与南宫婉相遇。',done:Boolean(f.deliver_spirit_herbs),skipped:Boolean(game.flags.playerBreakthrough&&!f.deliver_spirit_herbs),target:'workers'}, {id:'qinglan',title:'四 · 筑基拜师',summary:'服丹筑基，拜师李化元，研习青元剑诀。',done:Boolean(f.take_master),target:'sect_qinglan'}],
    aftermath:[],ending:null,flags:{...f},ore:c.ore,minesRemaining:0,reedsRemaining:Math.max(0,3-c.gathered),questHerbs:[...c.questHerbs],alternatePill:Boolean(c.alternatePill),visited:[...c.visited],realm:cultivationRealm(game),
    regions:Object.entries(REGIONS).map(([id,r])=>({id,...r,...travelAccess(game,id),visited:c.visited.includes(id),current:game.player.place===id}))};
}

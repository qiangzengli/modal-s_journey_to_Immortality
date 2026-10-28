import { GameError } from './errors.js';
import { VOLUME_ACTIONS, VOLUME_CHAPTERS, VOLUME_PEOPLE } from './volume-data.js';

export const inOpening = game => Boolean(game.volume && !game.volume.flags.enter_xianmen);
export function ensureVolume(game) {
  if (!game.volume) return game; // 旧存档不改写故事、修为、资产或位置。
  for (const actor of VOLUME_PEOPLE) game.people[actor.id] ??= {...structuredClone(actor),knowledge:{},trust:0,condition:'正常'};
  return game;
}
export function startVolume(game) {
  game.volume={version:1,flags:{},startedTurn:game.turn};
  game.player.place='qixuan'; game.player.name='韩立';
  game.player.stones=0; game.player.herbs=0; game.player.talismans=0;
  game.exploration.learned=[];
  game.campaign.visited=['qixuan'];
  game.events=[];game.nextId=1;
  for (const person of Object.values(game.people)) person.knowledge={};
  ensureVolume(game);
  record(game,'入山','你随三叔来到彩霞山。七玄门正在招收弟子，先去试炼道参加考核。');
  return game;
}
function record(game,actor,text,causes=[]) {
  const id=game.nextId++;
  game.events.push({id,turn:game.turn,actor,text,causes:causes.filter(Boolean),scope:'player'});
  return id;
}
export function applyVolumeAction(game,type) {
  if (!game.volume) throw new GameError('这是七玄门开篇的任务。旧存档可继续原旅途，重开后体验第一卷。');
  const def=VOLUME_ACTIONS.find(action=>action.type===type),f=game.volume.flags;
  if (!def) throw new GameError('未知的第一卷行动。');
  if (game.player.place!==def.place) throw new GameError('请先前往任务所在地点。');
  if (f[type]&&!def.repeatable) throw new GameError('这段经历已经完成，奖励不会重复领取。');
  const missing=def.requires.find(key=>!f[key]);
  if (missing) throw new GameError(`先完成「${VOLUME_ACTIONS.find(action=>action.type===missing).title}」。`);
  if(type==='help_zhang'&&f.confront_mo)throw new GameError('张铁已遭变故，这段少年时的支线已经错过。');
  const damage={qixuan_exam:8,confront_mo:12,defend_qixuan:10}[type]||0;
  if(game.player.hp<=damage)throw new GameError('气血不足，请先使用回春丹或在神手谷休养。');
  if(['aid_lifeiyu','trade_tainan'].includes(type)&&game.player.herbs<1)throw new GameError('需要一株灵草，可在神手谷试验绿液或收取灵圃产物。');
  if(type==='valley_rest'&&game.player.hp>=100)throw new GameError('气血充盈，无需休养。');
  game.player.hp-=damage;
  const item=id=>{game.exploration.inventory[id]=(game.exploration.inventory[id]||0)+1;};
  let text='';
  switch(type) {
    case 'qixuan_exam': text='你走完彩霞山试炼道，以耐力通过考核，成为七玄门记名弟子。墨大夫正在神手谷挑选学徒。';break;
    case 'help_zhang': game.people.zhangtie.trust+=15;text='你照应了张铁。他记住这份情谊，约你一道去神手谷。';break;
    case 'apprentice_mo': text='墨大夫收你与张铁为徒，交下一部口诀，要求潜心修炼。你留在神手谷，开始一边学医、一边练功。';break;
    case 'study_changchun': item('changchun_manual');game.exploration.learned.push('changchun');text='长春功终于引出第一缕灵力。你将口诀整理成册，掌握长春功，踏入炼气一层。';break;
    case 'find_green_bottle': text='你在石径拾到一只小绿瓶，瓶身纹路细密。你把它藏好，决定先在月下观察，不向旁人透露。';break;
    case 'test_green_dew': game.garden.bottle=true;game.garden.plots=[{growth:0,plantedTurn:game.turn}];game.garden.lastTurn=game.turn;game.player.herbs+=3;text='你用月下凝出的绿液试验药苗，确认它能催生药草。三株药草收入行囊，小绿瓶与灵圃正式启用；此后每旬继续凝液生长。';break;
    case 'aid_lifeiyu': game.player.herbs--;game.people.lifeiyu.trust+=20;item('healing_pill');text='你用一株药草配药，缓解厉飞雨服用抽髓丸后的伤势。他赠你一枚回春丹，记下这份援手。';break;
    case 'investigate_mo': text='你从药柜记录和张铁失踪前的行迹中发现异常，意识到墨大夫关心的不只是医术传承。你开始为可能的暗算设防。';break;
    case 'confront_mo': item('mo_letter');game.people.modafu.condition='已故';game.people.zhangtie.condition='炼尸之祸';
      for(const offer of game.society.offers.filter(o=>['modafu','zhangtie'].includes(o.npcId)&&['open','accepted'].includes(o.status))){game.people[offer.npcId].stones+=offer.reward;offer.status='withdrawn';}
      text='凭事先调查与长春功根基，你在墨大夫的夺舍危局中保住自身。真相与张铁的遭遇终于浮出水面；墨大夫留下遗书，寒毒仍需去嘉元城化解。';break;
    case 'scout_jinguang': text='你观察金光上人的护罩与符宝，记下其施术间隙，准备以御剑之术破局。';break;
    case 'defend_qixuan': item('ascension_token');item('sword_talisman');game.exploration.learned.push('object_control');game.people.wangjuechu.trust+=20;text='你抓住金光上人护罩的破绽，解开七玄门之围，取得升仙令与剑符宝。这场风波后，你决定先履行墨府遗书。';break;
    case 'deliver_mo_letter': item('warm_jade');game.people.yanshi.trust+=15;text='严氏核验了墨大夫遗书。你说明来意并完成遗书交代，取得暖阳宝玉，可以着手化解寒毒。';break;
    case 'comfort_caihuan': game.people.mocaihuan.trust+=20;text='你向墨彩环说明这段来路，也认真听她说起对修仙的向往。告别尚未到来，这份相识已记在彼此心里。';break;
    case 'cure_cold_poison': game.player.hp=100;text='暖阳宝玉驱散寒毒，气血恢复。墨府旧事暂告一段落，你循着修仙者的消息，前往太南小会。';break;
    case 'meet_wan': game.people.wanxiaoshan.trust+=10;text='万小山向你讲解灵根、越国七派与升仙大会。升仙令的用途渐渐清楚，你终于知道黄枫谷是下一站。';break;
    case 'trade_tainan': game.player.herbs--;item('fireball_manual');item('huanglong_recipe');text='你以一株催生药草换得火弹术与黄龙丹方。法术可在行囊研习，丹方记入第一卷所得；资源的来路仍需保密。';break;
    case 'enter_xianmen': game.player.stones+=180;text='你收好升仙令，准备拜入黄枫谷。第一卷「七玄问道」完成，获得后续游历资粮 180 灵石。天下图已开放，七玄门、墨府的旧人仍可重访。';break;
    case 'valley_rest': game.player.hp=Math.min(100,game.player.hp+35);text='你在药庐整理行装、安静休养，恢复最多 35 气血。';break;
  }
  const id=record(game,'第一卷',text,def.requires.map(key=>f[key]));
  if(!def.repeatable)f[type]=id;
  if(type==='enter_xianmen'){
    const rumor=record(game,'邸报','游历消息：地下坊市的沈秋持有一枚筑基丹，开价 280 灵石。你可继续问计，自行筹划取丹路径。',[id]);
    game.events.at(-1).scope='public';game.flags.pillRumorEvent=rumor;
    for(const person of ['shen','bai','xu','qing','wei'])game.people[person].knowledge.pill=rumor;
  }
  return text;
}
export function volumeView(game) {
  if(!game.volume)return null;
  const f=game.volume.flags;
  const objectives=VOLUME_ACTIONS.filter(a=>!a.repeatable).map(a=>({type:a.type,title:a.title,detail:a.detail,cost:a.cost,target:a.person||a.site,place:a.place,optional:Boolean(a.optional),done:Boolean(f[a.type]),unlocked:a.requires.every(key=>f[key])&&!(a.type==='help_zhang'&&f.confront_mo&&!f.help_zhang),missed:a.type==='help_zhang'&&Boolean(f.confront_mo)&&!f.help_zhang}));
  const next=objectives.find(a=>!a.optional&&!a.done);
  return {title:'卷一 · 七玄问道',complete:Boolean(f.enter_xianmen),chapters:VOLUME_CHAPTERS.map(ch=>({...ch,done:Boolean(f[ch.end])})),objectives,next,completed:objectives.filter(a=>!a.optional&&a.done).length,total:objectives.filter(a=>!a.optional).length,
    realm:f.enter_xianmen?'炼气九层':f.confront_mo?'炼气四层':f.study_changchun?'炼气一层':'凡人',
    summary:next?.detail||'七玄门到太南小会的旅程已完成，黄枫谷的道途还在前方。',
    knownFacts:objectives.filter(a=>a.done).map(a=>a.title)};
}

import { GameError } from './errors.js';
import { VOLUME_ACTIONS, VOLUME_CHAPTERS, VOLUME_PEOPLE } from './volume-data.js';
import {bridgeStory,storyDone} from './story-beats.js';
import {cultivationRealm} from './cultivation.js';

export const inOpening = game => Boolean(game.volume && !game.volume.flags.enter_xianmen);
export function ensureVolume(game) {
  if (!game.volume) return game; // 旧存档不改写故事、修为、资产或位置。
  if(!game.volume.version||game.volume.version<2){
    game.volume.legacyCompleted=game.volume.flags.enter_xianmen?['probe_tainan','fight_qingwen','fight_hupinggu']:[];
    game.volume.version=2;
  }
  if(game.volume.version<3){bridgeStory(game.volume,'volume',Boolean(game.volume.flags.enter_xianmen));game.volume.version=3;}
  for (const actor of VOLUME_PEOPLE) game.people[actor.id] ??= {...structuredClone(actor),knowledge:{},trust:0,condition:'正常'};
  return game;
}
export function startVolume(game) {
  game.volume={version:3,legacyCompleted:[],flags:{},startedTurn:game.turn};
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
  if ((f[type]||game.volume.legacyCompleted?.includes(type))&&!def.repeatable) throw new GameError('这段经历已经完成，奖励不会重复领取。');
  const missing=def.requires.find(key=>!storyDone(game.volume,key));
  if (missing) throw new GameError(`先完成「${VOLUME_ACTIONS.find(action=>action.type===missing).title}」。`);
  if(type==='help_zhang'&&f.confront_mo)throw new GameError('张铁已遭变故，这段少年时的支线已经错过。');
  if(def.encounter&&!game.exploration.enemies[def.encounter]?.looted)throw new GameError('需亲自赢下这场交锋并收取战利品，才能继续主线。');
  const damage={qixuan_exam:8}[type]||0;
  if(game.player.hp<=damage)throw new GameError('气血不足，请先使用回春丹或在神手谷休养。');
  if(['aid_lifeiyu','trade_tainan'].includes(type)&&game.player.herbs<1)throw new GameError('需要一株灵草，可在神手谷试验绿液或收取灵圃产物。');
  if(['valley_rest','tainan_rest'].includes(type)&&game.player.hp>=100)throw new GameError('气血充盈，无需休养。');
  game.player.hp-=damage;
  const item=id=>{game.exploration.inventory[id]=(game.exploration.inventory[id]||0)+1;};
  let text='';
  switch(type) {
    case 'learn_medicine': text='你从辨药、切药与分量开始学医，弄清了药庐的日常规矩。医书与长春功的口诀都要靠亲手实践，正式修炼现在可以开始。';break;
    case 'observe_bottle': text='你确认小瓶会在月下凝出绿液，将不同夜晚的变化秘密记下。绿液是否可以催生药草，还要以药苗实际试验，不能贸然入口。';break;
    case 'cultivate_changchun': text='依靠自有药草与长期吐纳，你逐渐稳固炼气四层的根基。药庐的生活还在继续，张铁许久未出现的事情却让你无法再忽略。';break;
    case 'trace_zhang': text='你核对了张铁失踪前的行迹，发现练功与药庐记录之间有几处断点。这些只是需要追查的线索，还不足以把猜想当成真相。';break;
    case 'read_mo_letter':
      if(!game.exploration.inventory.mo_letter)throw new GameError('须先实际收取墨大夫遗书。');
      text='你细读遗书，记下嘉元城墨府与暖阳宝玉的线索，也将张铁的旧物收好。寒毒尚未化去，眼前的山门风波也不能置之不理。';break;
    case 'settle_qixuan': text='你安顿了七玄门风波后的事务，向旧交交代去向。升仙令仍藏在行囊中，下一程先去嘉元城，把遗书与寒毒的事情处理清楚。';break;
    case 'inquire_mofu': text='你听取墨彩环说明墨府近况，没有立即以修仙者自居。她的忧虑让你明白，向严氏说明来意时须分清事实与承诺。';break;
    case 'negotiate_mofu': text='你与严氏围绕信物、遗书和寒毒商谈，说明了自己能够交代的事情。双方决定以实际凭据核验，接下来正式交付遗书。';break;
    case 'learn_tainan_rules': text='你分清小会交易、结伴与升仙令的不同门道。万小山的见闻可以参考，修仙界的承诺仍须自己核实；自有灵草的来路不宜外露。';break;
    case 'practice_fireball':
      if(!game.exploration.inventory.fireball_manual&&!game.exploration.learned.includes('fireball'))throw new GameError('需先实际取得火弹术口诀。');
      if(!game.exploration.learned.includes('fireball'))game.exploration.learned.push('fireball');
      text='你亲手演练火弹术，熟悉起势与收势，法术已可在斗法中使用。纸上口诀终于化作可用的手段，面对谷外邀约也多了一分准备。';break;
    case 'prepare_departure': text='你整理小会所见、已有法术与升仙令，继续潜修长春功至炼气九层。修仙门派的道路已经清楚，但踏入门内仍需亲自持令问道。';break;
    case 'qixuan_exam': text='你走完彩霞山试炼道，以耐力通过考核，成为七玄门记名弟子。墨大夫正在神手谷挑选学徒。';break;
    case 'help_zhang': game.people.zhangtie.trust+=15;text='你照应了张铁。他记住这份情谊，约你一道去神手谷。';break;
    case 'apprentice_mo': text='墨大夫收你与张铁为徒，交下一部口诀，要求潜心修炼。你留在神手谷，开始一边学医、一边练功。';break;
    case 'study_changchun': item('changchun_manual');game.exploration.learned.push('changchun');text='长春功终于引出第一缕灵力。你将口诀整理成册，掌握长春功，踏入炼气一层。';break;
    case 'find_green_bottle': text='你在石径拾到一只小绿瓶，瓶身纹路细密。你把它藏好，决定先在月下观察，不向旁人透露。';break;
    case 'test_green_dew': game.garden.bottle=true;game.garden.plots=[{growth:0,plantedTurn:game.turn}];game.garden.lastTurn=game.turn;game.player.herbs+=3;text='你用月下凝出的绿液试验药苗，确认它能催生药草。三株药草收入行囊，小绿瓶与灵圃正式启用；此后每旬继续凝液生长。';break;
    case 'aid_lifeiyu': game.player.herbs--;game.people.lifeiyu.trust+=20;item('healing_pill');text='你用一株药草配药，缓解厉飞雨服用抽髓丸后的伤势。他赠你一枚回春丹，记下这份援手。';break;
    case 'investigate_mo': text='你从药柜记录和张铁失踪前的行迹中发现异常，意识到墨大夫关心的不只是医术传承。你开始为可能的暗算设防。';break;
    case 'confront_mo': game.people.modafu.condition='已故';game.people.zhangtie.condition='炼尸之祸';
      for(const offer of game.society.offers.filter(o=>['modafu','zhangtie'].includes(o.npcId)&&['open','accepted'].includes(o.status))){game.people[offer.npcId].stones+=offer.reward;offer.status='withdrawn';}
      text='你凭事先调查与长春功根基，亲手击败墨大夫，渡过师徒间的夺舍危局。真相与张铁的遭遇终于浮出水面；墨大夫留下遗书，寒毒仍需去嘉元城化解。';break;
    case 'scout_jinguang': if(!game.exploration.learned.includes('object_control'))game.exploration.learned.push('object_control');item('healing_pill');text='你观察金光上人的护罩与符宝，记下其施术间隙，将御物术用于御剑，另备一枚回春丹。接下来要亲自迎战，护罩的余力会随交锋消耗。';break;
    case 'defend_qixuan':game.people.wangjuechu.trust+=20;text='你抓住金光上人护罩的破绽，解开七玄门之围，取得升仙令与剑符宝。这场风波后，你决定先履行墨府遗书。';break;
    case 'deliver_mo_letter': item('warm_jade');game.people.yanshi.trust+=15;text='严氏核验了墨大夫遗书。你说明来意并完成遗书交代，取得暖阳宝玉，可以着手化解寒毒。';break;
    case 'comfort_caihuan': game.people.mocaihuan.trust+=20;text='你向墨彩环说明这段来路，也认真听她说起对修仙的向往。告别尚未到来，这份相识已记在彼此心里。';break;
    case 'cure_cold_poison': game.player.hp=100;text='暖阳宝玉驱散寒毒，气血恢复。墨府旧事暂告一段落，你循着修仙者的消息，前往太南小会。';break;
    case 'meet_wan': game.people.wanxiaoshan.trust+=10;text='万小山向你讲解灵根、越国七派与升仙大会。升仙令的用途渐渐清楚，你终于知道黄枫谷是下一站。';break;
    case 'trade_tainan': game.player.herbs--;item('fireball_manual');item('huanglong_recipe');text='你以一株催生药草换得火弹术与黄龙丹方。法术可在行囊研习，丹方记入第一卷所得；资源的来路仍需保密。';break;
    case 'probe_tainan': item('healing_pill');text='你向万小山核对消息，对青纹一行的热络邀约留了心眼。谷外果然有人封路，你备好一枚回春丹，先应对青纹道士，之后仍要留意他的同伙。';break;
    case 'fight_qingwen': text='你亲手击退青纹道士，夺回了主动。胡萍姑仍封住另一侧退路；先整理伤势和法术，再决定何时继续突围。';break;
    case 'fight_hupinggu': text='你突破胡萍姑的阻截，摆脱青纹一行的围堵。小会上的热络与谷外的杀机，让你真正认识到散修交往的风险。';break;
    case 'tainan_rest': game.player.hp=Math.min(100,game.player.hp+35);text='你回到小会歇脚处，梳理灵力、包扎伤口，恢复最多 35 气血。';break;
    case 'enter_xianmen': game.player.stones+=180;game.player.hp=100;text='摆脱劫修后，你休整至气血充盈，收好升仙令，准备拜入黄枫谷。七玄门到太南小会的经历已完成，获得游历资粮 180 灵石。接下来前往黄枫谷山门登记入门，接下百药园差事；故人仍可重访。';break;
    case 'valley_rest': game.player.hp=Math.min(100,game.player.hp+35);text='你在药庐整理行装、安静休养，恢复最多 35 气血。';break;
  }
  const id=record(game,'第一卷',text,[...def.requires.map(key=>f[key]),...(def.encounter?[game.exploration.enemies[def.encounter]?.victoryEventId]:[])]);
  if(!def.repeatable)f[type]=id;
  if(type==='enter_xianmen'){
    const rumor=record(game,'邸报','游历消息：黄枫谷坊市的许掌柜持有一枚筑基丹，开价 280 灵石。坊市交易由人物自行决定；你须采集主药、留种培育，再按丹方亲手炼制筑基丹。',[id]);
    game.events.at(-1).scope='public';game.flags.pillRumorEvent=rumor;
    for(const person of ['shen','bai','xu','qing','wei'])game.people[person].knowledge.pill=rumor;
  }
  return text;
}
export function volumeView(game) {
  if(!game.volume)return null;
  const f=game.volume.flags;
  const objectives=VOLUME_ACTIONS.filter(a=>!a.repeatable).map(a=>({type:a.type,title:a.title,detail:a.detail,cost:a.cost,target:a.person||a.site,place:a.place,optional:Boolean(a.optional),encounter:a.encounter,done:Boolean(f[a.type]||game.volume.legacyCompleted?.includes(a.type)),legacy:Boolean(game.volume.legacyCompleted?.includes(a.type)),unlocked:a.requires.every(key=>f[key]||game.volume.legacyCompleted?.includes(key))&&!(a.type==='help_zhang'&&f.confront_mo&&!f.help_zhang),missed:a.type==='help_zhang'&&Boolean(f.confront_mo)&&!f.help_zhang}));
  const next=objectives.find(a=>!a.optional&&!a.done);
  return {title:'卷一 · 七玄问道',complete:Boolean(f.enter_xianmen),chapters:VOLUME_CHAPTERS.map(ch=>({...ch,done:Boolean(f[ch.end])})),objectives,next,completed:objectives.filter(a=>!a.optional&&a.done).length,total:objectives.filter(a=>!a.optional).length,
    realm:cultivationRealm(game),decisions:Object.values(game.volume.decisions||{}),
    summary:next?.detail||'七玄门到太南小会的旅程已完成，黄枫谷的道途还在前方。',
    knownFacts:objectives.filter(a=>a.done).map(a=>a.title)};
}

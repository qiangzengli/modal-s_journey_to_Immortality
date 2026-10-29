import { cultivationRealm, canonContext } from './cultivation.js';
import { VOLUME_PEOPLE } from './volume-data.js';
import { startVolume, ensureVolume, applyVolumeAction, volumeView, inOpening } from './volume.js';
import { SECT_PEOPLE } from './sect-data.js';
import { FRONTIER_PEOPLE } from './campaign-data.js';
import { ensureCampaign, applyCampaignAction, travelRegion, campaignView } from './campaign.js';
import { REGIONS } from './regions.js';
import { ensureNpcState, npcPublic, societyView, npcPosition, expireOffers } from './npc-state.js';
import { ACTION_DEFS, RETIRED_PILL_ACTIONS } from './content.js';
import { GARDEN_ACTIONS, ensureGarden, applyGardenAction, advanceGarden, getGardenView } from './garden.js';
import { GameError } from './errors.js';
import { assertPeace, ensureExploration, getCombatView, combatAction } from './combat.js';
import { affiliationFor, sectView } from './sects.js';
export { GameError } from './errors.js';

import { CANON_IDENTITIES } from './canon.js';
export const PEOPLE = [
  ...FRONTIER_PEOPLE, ...SECT_PEOPLE,
  { id: 'shen', name: '许掌柜', role: '丹商', goal: '卖掉筑基丹，为师弟换取续命药', publicGoal: '急于卖丹', place: 'market', stones: 40, links: ['bai', 'wei'] },
  { id: 'bai', name: '马师兄', role: '药师', goal: '保住鉴丹声誉，不让假药流入坊市', publicGoal: '谨慎验药', place: 'market', stones: 300, links: ['shen', 'xu'] },
  { id: 'xu', name: '吴风', role: '散修', goal: '赶在寿元关口前取得筑基丹', publicGoal: '寻找突破机会', place: 'market', stones: 230, links: ['bai', 'qing'] },
  { id: 'lu', name: '叶师叔', role: '巡坊执事', goal: '查清私售丹药的来路', publicGoal: '巡视坊市', place: 'market', stones: 0, links: ['wei', 'ning'] },
  { id: 'qing', name: '刘靖', role: '牙行掮客', goal: '从情报和借贷中获利', publicGoal: '撮合交易', place: 'market', stones: 260, links: ['xu', 'han'] },
  { id: 'wei', name: '宋蒙', role: '护商修士', goal: '护住雇主和自己的信誉', publicGoal: '护送许掌柜', place: 'market', stones: 55, links: ['shen', 'lu'] },
  { id: 'han', name: '封岳', role: '林中劫修', goal: '盯住携宝离城的落单者', publicGoal: '在林道徘徊', place: 'woods', stones: 35, links: ['qing'] },
  { id: 'ning', name: '萧翠儿', role: '传音客', goal: '靠传递可靠消息谋生', publicGoal: '接送传音', place: 'market', stones: 25, links: ['lu', 'bai', 'xu'] }
].map(p=>({...p,...CANON_IDENTITIES[p.id],...(CANON_IDENTITIES[p.id]?{publicGoal:CANON_IDENTITIES[p.id].goal}:{})}));

const MARKET = 'market';
const WOODS = 'woods';
const MAX_COMMAND = 280;

function note(game, actor, text, causes = [], scope = 'public') {
  const event = { id: game.nextId++, turn: game.turn, actor, text, causes, scope };
  game.events.push(event);
  return event.id;
}

function know(game, id, fact, eventId) {
  const person = game.people[id];
  if (!person.knowledge[fact]) person.knowledge[fact] = eventId;
}

function at(game, place) {
  if (game.player.place !== place) {
    throw new GameError(place === MARKET ? '这件事需要回到黄枫谷坊市。' : '这件事需要先到太岳山脉。');
  }
}

function hasPill(game, owner) {
  if (game.pill.owner !== owner) throw new GameError('筑基丹已经易主，原计划无法继续。请查看机缘栏。');
}

function requireStones(game, amount) {
  if (game.player.stones < amount) throw new GameError(`灵石不足：需要 ${amount}，当前只有 ${game.player.stones}。`);
}

export function createGame() {
  const people = Object.fromEntries(PEOPLE.map(person => [person.id, {
    ...person,
    links: [...person.links],
    knowledge: {},
    trust: 0,
    condition: '正常'
  }]));
  const game = {
    version: 2,
    turn: 1,
    ap: null, // null 表示不限行动次数，兼容原有存档字段。
    nextId: 1,
    player: { place: MARKET, stones: 180, hp: 100, reputation: 50, herbs: 1, talismans: 1, seal: 0, clues: [], clueEvents: {}, dialogues: {} },
    people,
    pill: { owner: 'shen', price: 280, genuine: true },
    flags: {
      partner: false, partnerDebt: 0, partnerDeadline: 0, partnerDefaulted: false,
      partnerDemanded: false, partnerEvent: 0, sellerReserved: false,
      report: 0, auction: false, lured: 0, trap: 0, attacked: 0,
      forged: 0, rumorSpread: 0, disputed: false, rumorDebunked: false,
      xuLoan: 0, xuBought: 0, breakthrough: 0, exposed: false,
      herbGathered: 0, herbSale: 0, tonicReady: 0, tonicDelivered: false,
      pillSale: 0, hanStalked: false, playerBreakthrough: 0
    },
    events: []
  };
  note(game, '邸报', '黄枫谷坊市传出消息：许掌柜持有一枚筑基丹，开价 280 灵石。几位修士各有打算，买家何时出手尚未可知。');
  know(game, 'shen', 'pill', 1);
  know(game, 'bai', 'pill', 1);
  know(game, 'xu', 'pill', 1);
  know(game, 'qing', 'pill', 1);
  know(game, 'wei', 'pill', 1);
  return ensureNpcState(ensureGarden(ensureExploration(game)));
}

export function createOpeningGame() { return ensureNpcState(startVolume(createGame())); }

export const ACTIONS = ['travel_region', 'ask', 'negotiate', ...ACTION_DEFS.map(action => action.type)];

export function dialogueFor(game, target) {
  const mind = game.society?.minds[target];
  if (mind?.speech) return mind.speech;
  const person = game.people[target];
  return `${person.name}正在观察局势。可直接和他交谈，了解打算。${target === 'xu' && game.flags.partnerDebt ? `你尚欠他 ${game.flags.partnerDebt} 灵石。` : ''}`;
}

export function applyAction(source, action) {
  assertPeace(source);
  if (!action || !ACTIONS.includes(action.type)) throw new GameError('未识别的行动。可以试试「验丹」「调查货道」「找吴风合资」。');
  if (RETIRED_PILL_ACTIONS.includes(action.type)) throw new GameError('筑基丹须自行培育三味主药后炼制，不能直接购买、议价或夺丹。请推进黄枫谷主线。');
  const game = ensureVolume(ensureCampaign(structuredClone(source)));
  game.ap = null;
  const type = action.type;
  const target = action.target;
  const participant = ACTION_DEFS.find(def => def.type === type)?.person;
  if (participant && type !== 'buy_pill' && game.people[participant]?.place !== game.player.place) throw new GameError('这位人物不在此区域，请先找到本人。');
  let result = '';
  if (['travel_region', 'travel_market', 'travel_woods'].includes(type)) return travelRegion(game, type === 'travel_region' ? action.place || action.target : type === 'travel_market' ? 'market' : 'woods');
  const definition=ACTION_DEFS.find(def=>def.type===type),encounter=definition?.encounter;
  if(encounter&&definition.volume&&game.volume&&!game.volume.flags[type]&&!game.volume.legacyCompleted?.includes(type))return combatAction(game,{type:game.exploration?.enemies[encounter]?.defeated?'claim':'start',enemyId:encounter});
  if (ACTION_DEFS.find(def=>def.type===type)?.volume) return {game,result:applyVolumeAction(game,type)};
  if (inOpening(game) && type!=='ask' && !(GARDEN_ACTIONS.includes(type)&&type!=='discover_bottle'&&game.garden.bottle)) throw new GameError('请先完成七玄门第一卷，再开启这段游历。');
  if(encounter&&definition.campaign&&!game.campaign.storyFlags[type])return combatAction(game,{type:game.exploration?.enemies[encounter]?.defeated?'claim':'start',enemyId:encounter});
  if (ACTION_DEFS.find(def=>def.type===type)?.campaign) return {game,result:applyCampaignAction(game,type)};
  if (GARDEN_ACTIONS.includes(type)) return { game, result: applyGardenAction(game, type) };

  switch (type) {
    case 'ask': {
      const person = game.people[target];
      if (!person || ['已故','炼尸之祸'].includes(person.condition)) throw new GameError('请选择一位在场人物交谈。');
      if (person.place !== game.player.place) throw new GameError(`${person.name}不在此处。`);
      result = dialogueFor(game, target);
      game.player.dialogues ??= {};
      game.player.dialogues[target] = { turn: game.turn, text: result };
      note(game, '你', `与${person.name}交谈，得知其当前关切。`, [], 'player');
      break;
    }
    case 'inspect_pill': {
      at(game, MARKET);
      hasPill(game, 'shen');
      if (game.people.shen.place !== MARKET) throw new GameError('许掌柜已带丹药离开坊市，马师兄现在无法当面验丹。');
      if (game.player.clues.includes('authentic')) throw new GameError('马师兄已为这枚丹药落印，无需重复鉴定。');
      requireStones(game, 10);
      game.player.stones -= 10;
      game.people.bai.stones += 10;
      game.player.clues.push('authentic');
      const id = note(game, '马师兄', '马师兄当面验出丹纹真实，为你出具可核对的鉴定记录。你付了 10 灵石。', [game.flags.pillRumorEvent || 1]);
      game.player.clueEvents.authentic = id;
      know(game, 'bai', 'authentic', id);
      result = '鉴定完成：筑基丹是真品。你现在可以用这份记录说服吴风合资。';
      break;
    }
    case 'investigate_route': {
      at(game, MARKET);
      if (game.player.clues.includes('smuggling')) throw new GameError('你已拿到萧翠儿的货道证词。');
      game.player.clues.push('smuggling');
      const id = note(game, '萧翠儿', '萧翠儿向你提供了禁运货道的车号与时间，可交给叶师叔核对。', [game.flags.pillRumorEvent || 1], 'player');
      game.player.clueEvents.smuggling = id;
      know(game, 'ning', 'smuggling', id);
      result = '你取得可核对的走私线索。叶师叔可能据此行动。';
      break;
    }
    case 'partner': {
      at(game, MARKET);
      hasPill(game, 'shen');
      if (game.flags.partner || game.flags.partnerDebt) throw new GameError('你与吴风的合资约定尚未结清。');
      if (!game.player.clues.includes('authentic')) throw new GameError('吴风不愿盲目出资。先请马师兄验丹。');
      if (game.people.xu.stones < 100) throw new GameError('吴风眼下拿不出 100 灵石，先与他商量其他办法。');
      game.people.xu.stones -= 100;
      game.player.stones += 100;
      game.flags.partner = true;
      game.flags.partnerDebt = 120;
      game.flags.partnerDeadline = game.turn + 1;
      game.people.xu.trust += 20;
      game.flags.partnerEvent = note(game, '吴风', '吴风看过马师兄的鉴定记录，拿出 100 灵石与你合资；你承诺事后返还 120 灵石。', [game.people.bai.knowledge.authentic]);
      result = '合资成功：获得 100 灵石。取得丹药后，你仍欠吴风 120 灵石。';
      break;
    }
    case 'sell_herbs': {
      at(game, MARKET);
      if (!game.player.herbs) throw new GameError('你的药草已经卖出。');
      if (game.people.bai.stones < 80) throw new GameError('马师兄当前灵石不足，暂时无法收购。');
      game.player.herbs -= 1;
      game.player.stones += 80;
      game.people.bai.stones -= 80;
      game.flags.herbSale = note(game, '马师兄', '马师兄收走你的灵草并支付 80 灵石，准备用于炼制续命药。');
      result = '卖出灵草，获得 80 灵石。';
      break;
    }
    case 'gather_herbs': {
      at(game, WOODS);
      if (game.flags.herbGathered >= 2) throw new GameError('这片林道的灵草已采尽。');
      game.flags.herbGathered += 1;
      game.player.herbs += 1;
      note(game, '你', '你冒险深入林道，采到一株可卖给马师兄的灵草。', [], 'player');
      result = `采得灵草 1 株。回坊市可出售；林道还可采 ${2 - game.flags.herbGathered} 株。`;
      break;
    }
    case 'report': {
      at(game, MARKET);
      hasPill(game, 'shen');
      if (!game.player.clues.includes('smuggling')) throw new GameError('叶师叔需要能核对的货道线索。先找萧翠儿调查。');
      if (game.flags.report) throw new GameError('叶师叔已经收到你的证词。');
      const id = note(game, '你', '你把萧翠儿的车号和时间交给叶师叔，要求查验许掌柜所售的丹药。', [], 'player');
      game.flags.report = id;
      know(game, 'lu', 'smuggling', id);
      result = '证词已经递交给叶师叔，查验时机由他自行决定。';
      break;
    }
    case 'lure': {
      at(game, MARKET);
      hasPill(game, 'shen');
      if (game.flags.lured) throw new GameError('你已向许掌柜提出林中验货的邀请，留意他的回应。');
      game.flags.lured = note(game, '你', '你以避开坊市耳目为由，约许掌柜下旬在太岳山脉验货。', [], 'player');
      know(game, 'shen', 'woods_meeting', game.flags.lured);
      result = '你向许掌柜提出林中会面的邀请。他会根据自身处境决定是否赴约，留意后续动向。';
      break;
    }
    case 'prepare_trap': {
      at(game, WOODS);
      if (game.flags.trap) throw new GameError('天雷符已经布好。');
      if (!game.player.talismans) throw new GameError('你没有天雷符，无法布阵。');
      game.player.talismans -= 1;
      game.flags.trap = note(game, '你', '你在林道布下天雷符，准备截住携丹者。', [], 'player');
      result = '天雷符已布好，消耗 1 张。斗法仍会消耗气血并招来追查。';
      break;
    }
    case 'buy_seal': {
      at(game, MARKET);
      if (game.player.seal) throw new GameError('你手里已有空白鉴定印。');
      requireStones(game, 25);
      game.player.stones -= 25;
      game.people.qing.stones += 25;
      game.player.seal = 1;
      const sale = note(game, '刘靖', '刘靖卖给你一枚可用于伪造鉴定符的空白印，收下 25 灵石。', [], 'player');
      know(game, 'qing', 'seal_buyer_player', sale);
      result = '取得空白鉴定印。造假会留下可追查的来源。';
      break;
    }
    case 'forge_poison': {
      at(game, MARKET);
      hasPill(game, 'shen');
      if (!game.player.seal) throw new GameError('要伪造药师鉴定，需要先向刘靖取得空白印。');
      if (game.flags.forged) throw new GameError('假鉴定已经传出。');
      game.player.seal = 0;
      game.flags.forged = note(game, '你', '你伪造“筑基丹有毒”的鉴定符，交给萧翠儿传播。', [], 'player');
      know(game, 'ning', 'poison_rumor', game.flags.forged);
      know(game, 'ning', 'rumor_source_player', game.flags.forged);
      result = '假鉴定已交给萧翠儿。是否传开、谁会相信或查验，取决于各人的后续选择。';
      break;
    }
    case 'honor_partner': {
      at(game, MARKET);
      if (!game.flags.partnerDebt) throw new GameError('当前没有待履行的合资承诺。');
      requireStones(game, game.flags.partnerDebt);
      game.player.stones -= game.flags.partnerDebt;
      game.people.xu.stones += game.flags.partnerDebt;
      note(game, '你', `你向吴风付清 ${game.flags.partnerDebt} 灵石，履行合资承诺。`);
      game.flags.partnerDebt = 0;
      game.people.xu.trust += 25;
      result = '合资承诺已经履行，吴风认可你守信。';
      break;
    }
    case 'buy_talisman': {
      at(game, MARKET);
      requireStones(game, 35);
      game.player.stones -= 35;
      game.people.qing.stones += 35;
      game.player.talismans += 1;
      note(game, '刘靖', '刘靖以 35 灵石卖出一张天雷符，提醒你符力只够布置一次阵法。', [], 'player');
      result = '获得天雷符 1 张。前往太岳山脉的天雷阵位可布下埋伏。';
      break;
    }
    case 'rest': {
      at(game, WOODS);
      if (game.player.hp >= 100) throw new GameError('气血已充盈，无需调息。');
      requireStones(game, 10);
      game.player.stones -= 10;
      const restored = Math.min(30, 100 - game.player.hp);
      game.player.hp += restored;
      note(game, '你', `在听雨亭以灵石引气调息，恢复 ${restored} 气血。`, [], 'player');
      result = `调息完成：恢复 ${restored} 气血，消耗 10 灵石。`;
      break;
    }
    case 'breakthrough': {
      if(game.campaign.storyFlags.enter_forbidden&&!game.campaign.storyFlags.leave_forbidden)throw new GameError('请先携药离开血色禁地，再闭关筑基。');
      at(game, WOODS);
      if (game.flags.playerBreakthrough) throw new GameError('你已完成筑基。未了的承诺与因果仍可继续处理。');
      if(!game.campaign.alternatePill)hasPill(game, 'player');
      if (game.player.hp < 60) throw new GameError('气血不足 60，强行突破会伤及根基。先在听雨亭调息。');
      const pillName='筑基丹';
      if(game.campaign.alternatePill)game.campaign.alternatePill=false;else game.pill.owner = 'consumed';
      game.player.hp = Math.min(100, game.player.hp + 20);
      game.flags.playerBreakthrough = note(game, '你', `在听雨亭服下${pillName}，灵气贯通经脉。你踏入筑基初期，旧日的承诺与仇怨仍留在身后。`, [game.campaign.storyFlags.refine_foundation_pill || game.flags.pillSale || game.flags.attacked].filter(Boolean));
      result = `筑基已成。${game.flags.partnerDebt ? `与吴风的 ${game.flags.partnerDebt} 灵石欠款仍未结清。` : '你可以继续观察这场机缘留下的因果。'}`;
      break;
    }
  }
  return { game, result };
}

export function advanceTurn(source) {
  assertPeace(source);
  const game = structuredClone(source);
  game.turn += 1;
  game.ap = null;
  if (game.flags.partner && game.pill.owner === 'shen' && game.turn > game.flags.partnerDeadline) {
    game.flags.partner = false;
    if (game.player.stones >= 100) {
      game.player.stones -= 100;
      game.people.xu.stones += 100;
      game.flags.partnerDebt = 0;
      note(game, '吴风', '合资期限已过，丹药仍未买下。吴风收回出资的 100 灵石，双方解除约定。', [game.flags.partnerEvent]);
    } else {
      game.flags.partnerDefaulted = true;
      game.people.xu.trust -= 40;
      note(game, '吴风', '合资期限已过，你却拿不出返还的灵石。吴风撤出约定，并记下这笔欠款。', [game.flags.partnerEvent]);
    }
  }

  expireOffers(game);
  advanceGarden(game);
  game.player.hp = Math.min(100, game.player.hp + 5);
  return { game, result: `进入第 ${game.turn} 旬。灵圃与既有约定已结算；人物动向由各自 Agent 决定。` };
}

export function getView(game) {
  const names = Object.fromEntries(Object.values(game.people).map(p => [p.id, p.name]));
  const story=volumeView(game);
  names.player = '你';
  names.consumed = '已炼化';
  const visible = game.events.filter(e => e.scope !== 'private');
  const visibleIds = new Set(visible.map(e => e.id));
  const pillOwner = game.pill.owner;
  return {
    ...getCombatView(game),
    story,
    canon:canonContext(game),
    sects: sectView(game),
    garden: getGardenView(game),
    society: societyView(game),
    campaign: campaignView(game),
    turn: game.turn,
    ap: null,
    revision: game.revision || 0,
    player: structuredClone(game.player),
    pill: {
      owner: names[pillOwner],
      ownerId: pillOwner,
      price: pillOwner === 'shen' ? game.pill.price : pillOwner === 'lu' ? 150 : null,
      disputed: game.flags.disputed,
      partnerDebt: game.flags.partnerDebt
    },
    people: Object.values(game.people).filter(p=>!['已故','炼尸之祸'].includes(p.condition)&&(!inOpening(game)||VOLUME_PEOPLE.some(a=>a.id===p.id))).map(p => ({
      id: p.id, name: p.name, role: p.role, goal: p.publicGoal,
      affiliation: affiliationFor(game, p.id),
      place: game.people[p.id].place, condition: game.people[p.id].condition,
      trust: game.people[p.id].trust,
      agent: npcPublic(game, p.id), position: npcPosition(game, p.id, game.people[p.id].place),
      greeting: dialogueFor(game, p.id),
      dialogue: game.player.dialogues?.[p.id] || null,
      memories: visible.filter(e => e.actor === p.name || e.text.includes(p.name)).slice(-3).map(e => ({ turn: e.turn, text: e.text, id: e.id }))
    })),
    world: { herbsRemaining: Math.max(0, 2 - game.flags.herbGathered), trapReady: Boolean(game.flags.trap), meetingPlanned: Boolean(game.flags.lured), reportFiled: Boolean(game.flags.report), partnered: Boolean(game.flags.partnerEvent), breakthrough: Boolean(game.flags.playerBreakthrough), realm: cultivationRealm(game) },
    actionOptions: Object.fromEntries(ACTION_DEFS.map(def => {
      try {
        const after = applyAction(game, { type: def.type }).game;
        const delta = Object.fromEntries(['stones', 'hp', 'herbs', 'talismans', 'reputation', 'seal'].map(key => [key, after.player[key] - game.player[key]]).filter(([,value]) => value));
        return [def.type, { available: true, reason: '', delta }];
      } catch (error) {
        if (!(error instanceof GameError)) throw error;
        return [def.type, { available: false, reason: error.message, delta: {} }];
      }
    })),
    events: visible.map(e => ({ ...e, causes: e.causes.filter(id => visibleIds.has(id)) })).reverse(),
    outcome: inOpening(game) ? story.summary : game.flags.playerBreakthrough ? `筑基已成。${game.flags.partnerDebt ? '与吴风的欠款仍待偿还。' : '这场机缘的因果仍将继续。'}` : game.campaign.alternatePill ? '筑基丹已入手。可前往听雨亭服丹筑基。' : pillOwner === 'player'
      ? game.flags.partnerDebt ? '筑基丹已入手；吴风的合资承诺仍待履行。' : '筑基丹已入手。可以继续推进时间，观察人物的后续反应。'
      : '筑基丹须自行培育主药后炼制。推进黄枫谷主线，采得三味活株、研习丹方，再留种培育、成熟采收。'
  };
}

export function parseLocal(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_COMMAND) throw new GameError('请输入 1～280 字的行动描述。');
  const input = text.trim();
  const destination=Object.entries(REGIONS).find(([,region])=>input.includes(region.name) || (region.short && input.includes(region.short)));
  if(destination && /传送|前往|返回|去|到/.test(input))return {type:'travel_region',place:destination[0]};
  const frontier = ACTION_DEFS.find(def=>(def.campaign||def.volume) && input.includes(def.title));
  if(frontier)return {type:frontier.type};
  if (/炼制.*筑基丹|炼.*筑基丹/.test(input) && !/炼化/.test(input)) return { type: 'refine_foundation_pill' };
  if (/栽种.*主药|种植.*主药|培育.*筑基.*药|培养.*筑基.*药/.test(input)) return { type: 'plant_pill_herbs' };
  if (/采收.*主药|收取.*筑基.*药/.test(input)) return { type: 'harvest_pill_herbs' };
  if (/认主.*小绿瓶|寻.*小绿瓶/.test(input)) return { type: 'discover_bottle' };
  if (/炼.*息壤|扩建.*灵圃/.test(input)) return { type: 'buy_spirit_soil' };
  if (/收取.*灵草|收取.*灵圃|收获.*灵草/.test(input)) return { type: 'harvest_garden' };
  if (/栽种.*灵草|种植.*灵草/.test(input)) return { type: 'plant_herb' };
  if (/暂停自动浇灌|关闭自动浇灌/.test(input)) return { type: 'disable_auto_water' };
  if (/开启自动浇灌/.test(input)) return { type: 'enable_auto_water' };
  if (/暂停.*续种|关闭.*续种/.test(input)) return { type: 'disable_auto_plant' };
  if (/开启.*续种/.test(input)) return { type: 'enable_auto_plant' };
  if (/灵液催熟|手动浇灌/.test(input)) return { type: 'water_herb' };
  if (/服丹|冲击筑基|闭关突破|炼化筑基丹/.test(input)) return { type: 'breakthrough' };
  if (/调息|疗伤|休息/.test(input)) return { type: 'rest' };
  if (/买.*天雷符|购.*天雷符|补充.*符/.test(input)) return { type: 'buy_talisman' };
  const price = input.match(/(?:出价|报价|愿出|以|用)\s*(\d{1,4})\s*(?:枚)?灵石|(?:买丹|买筑基丹|购买筑基丹).*?(\d{1,4})\s*(?:枚)?灵石/);
  if (price && /丹|许掌柜|丹商/.test(input)) {
    return {
      type: 'negotiate', offer: Number(price[1] || price[2]),
      leverage: /走私|货道|举报|证词/.test(input) ? 'smuggling' : /真丹|鉴定|马师兄/.test(input) ? 'authentic' : 'none'
    };
  }
  if (/还款|还给吴风|履约|结清/.test(input)) return { type: 'honor_partner' };
  if (/举报|告发|报给陆|交给陆|执事.*查封/.test(input)) return { type: 'report' };
  if (/伪造|造谣|假鉴定|有毒|放出.*消息/.test(input)) return { type: 'forge_poison' };
  if (/空白印|鉴定印|买.*印/.test(input)) return { type: 'buy_seal' };
  if (/合资|借.*灵石|合作买丹|找吴风/.test(input)) return { type: 'partner' };
  if (/验丹|鉴丹|鉴定|真假|药纹/.test(input)) return { type: 'inspect_pill' };
  if (/货道|车号|走私|调查.*来路|问萧翠儿/.test(input)) return { type: 'investigate_route' };
  if (/引.*出城|约.*太岳山脉|诱.*太岳山脉|林中验货/.test(input)) return { type: 'lure' };
  if (/布阵|设伏|埋伏|布.*天雷符/.test(input)) return { type: 'prepare_trap' };
  if (/伏击|偷袭|夺丹|抢.*丹|攻击沈/.test(input)) return { type: 'ambush' };
  if (/回.*坊市|去.*坊市/.test(input)) return { type: 'travel_market' };
  if (/去.*太岳山脉|前往.*林|入.*林|进.*林/.test(input)) return { type: 'travel_woods' };
  if (/采.*灵草|采药|采集.*药/.test(input)) return { type: 'gather_herbs' };
  if (/卖.*灵草|卖.*药草/.test(input)) return { type: 'sell_herbs' };
  if (/买.*筑基丹|购买.*丹|竞买.*丹|出价.*丹/.test(input)) return { type: 'buy_pill' };
  const person = [...PEOPLE,...VOLUME_PEOPLE].find(p => input.includes(p.name));
  if (person && /问|聊|交谈|打听|找/.test(input)) return { type: 'ask', target: person.id };
  throw new GameError('这条计策暂时无法执行。可试试「请马师兄验丹」「找吴风合资」「向叶师叔举报」或点击行动按钮。');
}

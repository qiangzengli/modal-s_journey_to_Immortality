import { ACTION_DEFS } from './content.js';
import { GameError } from './errors.js';
import { assertPeace, ensureExploration, getCombatView } from './combat.js';
export { GameError } from './errors.js';

export const PEOPLE = [
  { id: 'shen', name: '沈秋', role: '丹商', goal: '卖掉筑基丹，为师弟换取续命药', publicGoal: '急于卖丹', place: 'market', stones: 40, links: ['bai', 'wei'] },
  { id: 'bai', name: '白芷', role: '药师', goal: '保住鉴丹声誉，不让假药流入坊市', publicGoal: '谨慎验药', place: 'market', stones: 300, links: ['shen', 'xu'] },
  { id: 'xu', name: '徐宁', role: '散修', goal: '赶在寿元关口前取得筑基丹', publicGoal: '寻找突破机会', place: 'market', stones: 230, links: ['bai', 'qing'] },
  { id: 'lu', name: '陆执事', role: '巡坊执事', goal: '查清私售丹药的来路', publicGoal: '巡视坊市', place: 'market', stones: 0, links: ['wei', 'ning'] },
  { id: 'qing', name: '青闻', role: '牙行掮客', goal: '从情报和借贷中获利', publicGoal: '撮合交易', place: 'market', stones: 260, links: ['xu', 'han'] },
  { id: 'wei', name: '魏守', role: '护商修士', goal: '护住雇主和自己的信誉', publicGoal: '护送沈秋', place: 'market', stones: 55, links: ['shen', 'lu'] },
  { id: 'han', name: '寒沙', role: '林中劫修', goal: '盯住携宝离城的落单者', publicGoal: '在林道徘徊', place: 'woods', stones: 35, links: ['qing'] },
  { id: 'ning', name: '宁素', role: '传音客', goal: '靠传递可靠消息谋生', publicGoal: '接送传音', place: 'market', stones: 25, links: ['lu', 'bai', 'xu'] }
];

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
    throw new GameError(place === MARKET ? '这件事需要回到地下坊市。' : '这件事需要先到黑风林。');
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
  note(game, '邸报', '地下坊市传出消息：沈秋持有一枚筑基丹，开价 280 灵石。三旬之内，买家将陆续出手。');
  know(game, 'shen', 'pill', 1);
  know(game, 'bai', 'pill', 1);
  know(game, 'xu', 'pill', 1);
  know(game, 'qing', 'pill', 1);
  know(game, 'wei', 'pill', 1);
  return ensureExploration(game);
}

export const ACTIONS = ['ask', 'negotiate', ...ACTION_DEFS.map(action => action.type)];

const ASK_LINES = {
  shen: '沈秋收起丹盒：「我急着换续命药，但丹药来路与你无关。」',
  bai: '白芷低声说：「看药纹似乎是真丹。若要我落印鉴定，得当面验。」',
  xu: '徐宁握着空药瓶：「我只剩一次筑基机会。若能合资，我愿承担一部分价钱。」',
  lu: '陆执事说：「私售并非罪；若涉及禁运，我需要能核对的线索。」',
  qing: '青闻笑道：「买卖做不成，消息也能值钱。不过凭证造假，迟早有人追查。」',
  wei: '魏守按住剑柄：「我护的是雇主，不是丹药。出城之后也一样。」',
  han: '寒沙眯眼望着林道：「黑风林的路，谁带着重宝，谁就要买平安。」',
  ning: '宁素说：「昨夜运丹的脚夫走的是封禁货道，我认得那辆车。」'
};

export function dialogueFor(game, target) {
  const { flags: f, people: p, pill } = game;
  if (target === 'shen') {
    if (p.shen.trust <= -30) return '沈秋把丹盒藏进袖中：「你的手段，我会记住。再来谈买卖，先想清楚自己做过什么。」';
    if (f.tonicDelivered) return '沈秋松开了紧握的手：「师弟的续命药已经备好。这笔买卖，总算有了一个交代。」';
    if (pill.owner !== 'shen') return '沈秋叹道：「丹已不在我手里。眼下，我更在意师弟的续命药何时能备好。」';
    if (p.shen.place === WOODS) return '沈秋看了眼身旁的魏守：「按约来了。就在这里验货，别往林子深处走。」';
    if (f.disputed) return '沈秋压低声音：「那张有毒鉴定来得蹊跷，可买家都信了。价钱能谈，不能让我血本无归。」';
  }
  if (target === 'bai') {
    if (f.rumorDebunked) return '白芷敲了敲丹谱：「药纹没错，有毒的鉴定才是假货。我会查清印信是从哪里流出的。」';
    if (f.tonicReady) return '白芷说：「你卖来的灵草已炼成续命药。药成不易，希望它能到真正需要的人手里。」';
    if (game.player.clues.includes('authentic')) return '白芷指向你的鉴定符：「我的印记是真的。带给徐宁看，他不会再担心丹药品质。」';
  }
  if (target === 'xu') {
    if (f.partnerDebt) return `徐宁看着你：「还欠我 ${f.partnerDebt} 灵石。说好共担机缘，也得记得兑现承诺。」`;
    if (f.breakthrough) return '徐宁气息渐稳：「这道瓶颈终于过去了。可当初买丹的那些传闻，我还要查清楚。」';
    if (pill.owner === 'xu') return '徐宁收好丹盒：「我已准备闭关。机缘不等人，只能自己去争。」';
    if (p.xu.trust > 20) return '徐宁拱手：「你把该还的灵石都还清了。下次遇到机缘，我们还可以坐下来谈。」';
  }
  if (target === 'lu') {
    if (p.lu.knowledge.ambush) return '陆执事注视着你：「魏守已经报案。黑风林里那场夺丹，坊市会继续追查。」';
    if (pill.owner === 'lu') return '陆执事展开封条：「车号与时间已经核实。此丹以一百五十灵石公售，账目公开。」';
    if (f.report) return '陆执事把证词压在玉牌下：「线索已收下。待下旬核验，你可来问结果。」';
  }
  if (target === 'wei' && f.attacked) return '魏守按剑道：「我认得你的招式。伤了人、夺了丹，就别指望事情到此为止。」';
  if (target === 'han' && f.hanStalked) return '寒沙低声道：「丹商进林了，身边那把剑可不好对付。没有准备，最好别动歪心思。」';
  if (target === 'ning' && f.rumorSpread) return '宁素攥着传音符：「消息已经传开。可真假一旦出了差错，收信的人总会回来追问源头。」';
  if (target === 'ning' && game.player.clues.includes('smuggling')) return '宁素点头：「车号和时间我都给你了。若要执事出面，记得把完整证词递上去。」';
  return ASK_LINES[target];
}

export function applyAction(source, action) {
  assertPeace(source);
  if (!action || !ACTIONS.includes(action.type)) throw new GameError('未识别的行动。可以试试「验丹」「调查货道」「找徐宁合资」。');
  const game = structuredClone(source);
  game.ap = null;
  const type = action.type;
  const target = action.target;
  let result = '';

  switch (type) {
    case 'ask': {
      const person = game.people[target];
      if (!person) throw new GameError('请选择一位在场人物交谈。');
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
      if (game.people.shen.place !== MARKET) throw new GameError('沈秋已带丹药离开坊市，白芷现在无法当面验丹。');
      if (game.player.clues.includes('authentic')) throw new GameError('白芷已为这枚丹药落印，无需重复鉴定。');
      requireStones(game, 10);
      game.player.stones -= 10;
      game.people.bai.stones += 10;
      game.player.clues.push('authentic');
      const id = note(game, '白芷', '白芷当面验出丹纹真实，为你出具可核对的鉴定记录。你付了 10 灵石。', [1]);
      game.player.clueEvents.authentic = id;
      know(game, 'bai', 'authentic', id);
      result = '鉴定完成：筑基丹是真品。你现在可以用这份记录说服徐宁合资。';
      break;
    }
    case 'investigate_route': {
      at(game, MARKET);
      if (game.player.clues.includes('smuggling')) throw new GameError('你已拿到宁素的货道证词。');
      game.player.clues.push('smuggling');
      const id = note(game, '宁素', '宁素向你提供了禁运货道的车号与时间，可交给陆执事核对。', [1], 'player');
      game.player.clueEvents.smuggling = id;
      know(game, 'ning', 'smuggling', id);
      result = '你取得可核对的走私线索。陆执事可能据此行动。';
      break;
    }
    case 'partner': {
      at(game, MARKET);
      hasPill(game, 'shen');
      if (game.flags.partner || game.flags.partnerDebt) throw new GameError('你与徐宁的合资约定尚未结清。');
      if (!game.player.clues.includes('authentic')) throw new GameError('徐宁不愿盲目出资。先请白芷验丹。');
      game.people.xu.stones -= 100;
      game.player.stones += 100;
      game.flags.partner = true;
      game.flags.partnerDebt = 120;
      game.flags.partnerDeadline = game.turn + 1;
      game.people.xu.trust += 20;
      game.flags.partnerEvent = note(game, '徐宁', '徐宁看过白芷的鉴定记录，拿出 100 灵石与你合资；你承诺事后返还 120 灵石。', [game.people.bai.knowledge.authentic]);
      result = '合资成功：获得 100 灵石。取得丹药后，你仍欠徐宁 120 灵石。';
      break;
    }
    case 'buy_pill': {
      at(game, MARKET);
      const owner = game.pill.owner;
      if (!['shen', 'lu'].includes(owner)) throw new GameError('眼下没有人愿意向你出售这枚筑基丹。');
      if (owner === 'shen' && game.people.shen.place !== MARKET) throw new GameError('沈秋不在坊市，无法在此向他买丹。');
      const price = owner === 'lu' ? 150 : game.pill.price;
      requireStones(game, price);
      game.player.stones -= price;
      game.pill.owner = 'player';
      if (owner === 'shen') game.people.shen.stones += price;
      else game.flags.auction = false;
      game.flags.pillSale = note(game, '你', `以 ${price} 灵石从${owner === 'shen' ? '沈秋' : '执事公售'}处取得筑基丹。`, owner === 'lu' ? [game.flags.report] : game.flags.partnerEvent ? [game.flags.partnerEvent] : [1]);
      result = `筑基丹入手，花费 ${price} 灵石。${game.flags.partnerDebt ? '别忘了与徐宁的合资承诺。' : ''}`;
      break;
    }
    case 'negotiate': {
      at(game, MARKET);
      hasPill(game, 'shen');
      if (game.people.shen.place !== MARKET) throw new GameError('沈秋已离开坊市，无法当面议价。');
      const offer = action.offer;
      const leverage = action.leverage || 'none';
      if (!Number.isInteger(offer) || offer < 1 || offer > 9999) throw new GameError('请给出 1～9999 灵石之间的整数报价。');
      if (!['none', 'smuggling', 'authentic'].includes(leverage)) throw new GameError('这项筹码无法核对。');
      if (leverage !== 'none' && !game.player.clues.includes(leverage)) throw new GameError('你尚未掌握所声称的证据，无法据此议价。');
      requireStones(game, offer);
      const minimum = leverage === 'smuggling' ? 200 : game.flags.disputed ? 190 : 240;
      const causes = leverage === 'none' ? [1] : [game.player.clueEvents[leverage]];
      if (offer < minimum) {
        game.people.shen.trust -= 5;
        note(game, '沈秋', `你出价 ${offer} 灵石${leverage === 'smuggling' ? '并亮出货道证词' : ''}。沈秋认为低于底线，拒绝交易。`, causes);
        result = `沈秋拒绝 ${offer} 灵石的报价。依据当前局势，他至少要 ${minimum} 灵石。`;
      } else {
        game.player.stones -= offer;
        game.people.shen.stones += offer;
        game.pill.owner = 'player';
        if (leverage === 'smuggling') game.people.shen.trust -= 20;
        game.flags.pillSale = note(game, '沈秋', `你${leverage === 'smuggling' ? '以货道证词压价，' : ''}出价 ${offer} 灵石，沈秋权衡后同意交易。筑基丹归你。`, causes);
        result = `议价成功：以 ${offer} 灵石取得筑基丹。${leverage === 'smuggling' ? '沈秋记下了你的施压。' : ''}`;
      }
      break;
    }
    case 'sell_herbs': {
      at(game, MARKET);
      if (!game.player.herbs) throw new GameError('你的药草已经卖出。');
      game.player.herbs -= 1;
      game.player.stones += 80;
      game.people.bai.stones -= 80;
      game.flags.herbSale = note(game, '白芷', '白芷收走你的灵草并支付 80 灵石，准备用于炼制续命药。');
      result = '卖出灵草，获得 80 灵石。';
      break;
    }
    case 'gather_herbs': {
      at(game, WOODS);
      if (game.flags.herbGathered >= 2) throw new GameError('这片林道的灵草已采尽。');
      game.flags.herbGathered += 1;
      game.player.herbs += 1;
      note(game, '你', '你冒险深入林道，采到一株可卖给白芷的灵草。', [], 'player');
      result = `采得灵草 1 株。回坊市可出售；林道还可采 ${2 - game.flags.herbGathered} 株。`;
      break;
    }
    case 'report': {
      at(game, MARKET);
      hasPill(game, 'shen');
      if (!game.player.clues.includes('smuggling')) throw new GameError('陆执事需要能核对的货道线索。先找宁素调查。');
      if (game.flags.report) throw new GameError('陆执事已经收到你的证词。');
      const id = note(game, '你', '你把宁素的车号和时间交给陆执事，要求查验沈秋所售的丹药。', [], 'player');
      game.flags.report = id;
      know(game, 'lu', 'smuggling', id);
      result = '陆执事收下证词，下旬会查验。';
      break;
    }
    case 'lure': {
      at(game, MARKET);
      hasPill(game, 'shen');
      if (game.flags.lured) throw new GameError('沈秋已答应在黑风林验货。');
      game.flags.lured = note(game, '你', '你以避开坊市耳目为由，约沈秋下旬在黑风林验货。', [], 'player');
      know(game, 'shen', 'woods_meeting', game.flags.lured);
      result = '沈秋答应赴约。先到黑风林准备，推进一旬后他会抵达。';
      break;
    }
    case 'travel_woods':
    case 'travel_market': {
      const destination = type === 'travel_woods' ? WOODS : MARKET;
      if (game.player.place === destination) throw new GameError('你已经在这里。');
      game.player.place = destination;
      note(game, '你', `前往${destination === WOODS ? '黑风林' : '地下坊市'}。`, [], 'player');
      result = destination === WOODS ? '你进入黑风林。寒沙正在附近观察来路。' : '你回到地下坊市。';
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
    case 'ambush': {
      at(game, WOODS);
      hasPill(game, 'shen');
      if (game.people.shen.place !== WOODS) throw new GameError('沈秋不在黑风林。可以先约他出城，再推进一旬。');
      if (!game.flags.trap) {
        game.player.hp = Math.max(1, game.player.hp - 35);
        game.people.shen.trust -= 30;
        game.flags.attacked = note(game, '魏守', '你贸然拦截沈秋，魏守挡下攻势。你失去 35 气血，丹药仍在沈秋手里。');
        result = '伏击失败：护商修士早有防备。先布阵或另寻办法。';
      } else {
        game.player.hp = Math.max(1, game.player.hp - 20);
        game.player.reputation = Math.max(0, game.player.reputation - 15);
        game.pill.owner = 'player';
        game.people.shen.trust -= 50;
        game.people.shen.condition = '负伤';
        game.flags.attacked = note(game, '你', '天雷符迫退魏守，你付出 20 气血夺得筑基丹。沈秋负伤逃走，目击者记下了你的身形。', [game.flags.trap, game.flags.lured]);
        result = '夺宝成功，但你受伤、名声受损；沈秋和魏守不会忘记此事。';
      }
      break;
    }
    case 'buy_seal': {
      at(game, MARKET);
      if (game.player.seal) throw new GameError('你手里已有空白鉴定印。');
      requireStones(game, 25);
      game.player.stones -= 25;
      game.people.qing.stones += 25;
      game.player.seal = 1;
      const sale = note(game, '青闻', '青闻卖给你一枚可用于伪造鉴定符的空白印，收下 25 灵石。', [], 'player');
      know(game, 'qing', 'seal_buyer_player', sale);
      result = '取得空白鉴定印。造假会留下可追查的来源。';
      break;
    }
    case 'forge_poison': {
      at(game, MARKET);
      hasPill(game, 'shen');
      if (!game.player.seal) throw new GameError('要伪造药师鉴定，需要先向青闻取得空白印。');
      if (game.flags.forged) throw new GameError('假鉴定已经传出。');
      game.player.seal = 0;
      game.flags.forged = note(game, '你', '你伪造“筑基丹有毒”的鉴定符，交给宁素传播。', [], 'player');
      know(game, 'ning', 'poison_rumor', game.flags.forged);
      know(game, 'ning', 'rumor_source_player', game.flags.forged);
      result = '假鉴定已交给宁素。推进一旬后，坊市会出现反应。';
      break;
    }
    case 'honor_partner': {
      at(game, MARKET);
      if (!game.flags.partnerDebt) throw new GameError('当前没有待履行的合资承诺。');
      requireStones(game, game.flags.partnerDebt);
      game.player.stones -= game.flags.partnerDebt;
      game.people.xu.stones += game.flags.partnerDebt;
      note(game, '你', `你向徐宁付清 ${game.flags.partnerDebt} 灵石，履行合资承诺。`);
      game.flags.partnerDebt = 0;
      game.people.xu.trust += 25;
      result = '合资承诺已经履行，徐宁认可你守信。';
      break;
    }
    case 'buy_talisman': {
      at(game, MARKET);
      requireStones(game, 35);
      game.player.stones -= 35;
      game.people.qing.stones += 35;
      game.player.talismans += 1;
      note(game, '青闻', '青闻以 35 灵石卖出一张天雷符，提醒你符力只够布置一次阵法。', [], 'player');
      result = '获得天雷符 1 张。前往黑风林的天雷阵位可布下埋伏。';
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
      at(game, WOODS);
      if (game.flags.playerBreakthrough) throw new GameError('你已完成筑基。未了的承诺与因果仍可继续处理。');
      hasPill(game, 'player');
      if (game.player.hp < 60) throw new GameError('气血不足 60，强行突破会伤及根基。先在听雨亭调息。');
      game.pill.owner = 'consumed';
      game.player.hp = Math.min(100, game.player.hp + 20);
      game.flags.playerBreakthrough = note(game, '你', '在听雨亭服下筑基丹，灵气贯通经脉。你踏入筑基初期，旧日的承诺与仇怨仍留在身后。', [game.flags.pillSale || game.flags.attacked].filter(Boolean));
      result = `筑基已成。${game.flags.partnerDebt ? `与徐宁的 ${game.flags.partnerDebt} 灵石欠款仍未结清。` : '你可以继续观察这场机缘留下的因果。'}`;
      break;
    }
  }
  return { game, result };
}

function spreadKnowledge(game, from, fact, to, cause) {
  if (!game.people[from].knowledge[fact] || game.people[to].knowledge[fact]) return;
  know(game, to, fact, cause);
}

export function advanceTurn(source) {
  assertPeace(source);
  const game = structuredClone(source);
  game.turn += 1;
  game.ap = null;
  const started = game.events.length;

  // 宁素只传递自己确实收到的消息，消息来源留在事件账本中。
  if (game.people.ning.knowledge.poison_rumor && !game.flags.rumorSpread) {
    const cause = game.people.ning.knowledge.poison_rumor;
    const id = note(game, '宁素', '宁素将“筑基丹有毒”的鉴定符传给白芷和徐宁，坊市开始议论。', [cause]);
    spreadKnowledge(game, 'ning', 'poison_rumor', 'bai', id);
    spreadKnowledge(game, 'ning', 'poison_rumor', 'xu', id);
    game.flags.rumorSpread = id;
  }

  // 药师先暂停背书；到下一旬再核验，形成可操作的短暂信息差。
  if (game.people.bai.knowledge.poison_rumor && !game.flags.disputed && !game.flags.rumorDebunked) {
    game.flags.disputed = true;
    note(game, '白芷', '白芷暂停为筑基丹背书，等待重新核验。', [game.flags.rumorSpread]);
  } else if (game.flags.disputed && game.turn >= source.turn + 1 && game.turn >= 3 && !game.flags.rumorDebunked) {
    game.flags.rumorDebunked = note(game, '白芷', '白芷核对药纹，确认“有毒鉴定”是伪造的，开始寻找鉴定印来源。', [game.flags.rumorSpread]);
    game.flags.disputed = false;
    know(game, 'bai', 'forged_rumor', game.flags.rumorDebunked);
    spreadKnowledge(game, 'bai', 'forged_rumor', 'lu', game.flags.rumorDebunked);
  }

  if (game.flags.report && game.pill.owner === 'shen') {
    game.pill.owner = 'lu';
    game.flags.auction = true;
    game.people.shen.trust -= 15;
    note(game, '陆执事', '陆执事核对车号，查封私售的筑基丹，定价 150 灵石公开转售。沈秋怀疑此事与你有关。', [game.flags.report]);
  }

  if (game.flags.herbSale && !game.flags.tonicReady) {
    game.flags.tonicReady = note(game, '白芷', '白芷用收来的灵草炼好续命药，等沈秋筹足灵石便可交货。', [game.flags.herbSale]);
  }

  if (game.flags.partner && game.pill.owner === 'shen' && game.turn > game.flags.partnerDeadline) {
    game.flags.partner = false;
    if (game.player.stones >= 100) {
      game.player.stones -= 100;
      game.people.xu.stones += 100;
      game.flags.partnerDebt = 0;
      note(game, '徐宁', '合资期限已过，丹药仍未买下。徐宁收回出资的 100 灵石，双方解除约定。', [game.flags.partnerEvent]);
    } else {
      game.flags.partnerDefaulted = true;
      game.people.xu.trust -= 40;
      note(game, '徐宁', '合资期限已过，你却拿不出返还的灵石。徐宁撤出约定，并记下这笔欠款。', [game.flags.partnerEvent]);
    }
  }

  if (game.flags.partner && game.pill.owner === 'shen' && !game.flags.sellerReserved) {
    game.flags.sellerReserved = true;
    know(game, 'shen', 'player_funded', game.flags.partnerEvent);
    note(game, '沈秋', '沈秋得知你与徐宁已经筹款，暂缓寻找别的买家，等你前来交易。', [game.flags.partnerEvent]);
  }

  if (game.flags.lured && game.pill.owner === 'shen' && game.people.shen.place === MARKET) {
    game.people.shen.place = WOODS;
    game.people.wei.place = WOODS;
    note(game, '沈秋', '沈秋带丹药与魏守前往黑风林赴约。', [game.flags.lured]);
  } else if (game.pill.owner === 'shen' && game.flags.disputed && game.pill.price !== 210) {
    game.pill.price = 210;
    note(game, '沈秋', '鉴定传闻使买家退缩，急需灵石的沈秋把丹药降至 210 灵石。', [game.flags.rumorSpread]);
  }

  if (game.pill.owner === 'shen' && game.people.shen.place === MARKET) {
    if (game.people.xu.stones >= game.pill.price && !game.flags.partner) {
      game.people.xu.stones -= game.pill.price;
      game.people.shen.stones += game.pill.price;
      game.pill.owner = 'xu';
      game.flags.xuBought = note(game, '徐宁', `徐宁为求突破，以 ${game.pill.price} 灵石买下筑基丹。`, game.flags.rumorSpread ? [game.flags.rumorSpread] : [1]);
    } else if (!game.flags.partner && !game.flags.xuLoan) {
      const loan = game.pill.price - game.people.xu.stones;
      if (loan > 0 && loan <= 80 && game.people.qing.stones >= loan) {
        game.people.qing.stones -= loan;
        game.people.xu.stones += loan;
        game.flags.xuLoan = loan;
        note(game, '青闻', `青闻借给徐宁 ${loan} 灵石，押他突破后偿还。`, [1]);
      }
    }
  }

  if (game.pill.owner === 'xu' && game.flags.xuBought && !game.flags.breakthrough && game.turn >= game.events.find(e => e.id === game.flags.xuBought).turn + 1) {
    game.flags.breakthrough = note(game, '徐宁', '徐宁服丹闭关，终于突破瓶颈；他开始回看买丹时听过的传闻。', [game.flags.xuBought]);
    game.people.xu.condition = '筑基初期';
  }
  if (game.flags.tonicReady && !game.flags.tonicDelivered && game.people.shen.stones >= 100 && game.pill.owner !== 'shen') {
    game.people.shen.stones -= 100;
    game.people.bai.stones += 100;
    game.flags.tonicDelivered = true;
    game.people.shen.condition = '已为师弟备药';
    note(game, '沈秋', '沈秋用卖丹所得向白芷买下续命药，终于能救治师弟。', [game.flags.tonicReady, game.flags.pillSale || game.flags.xuBought]);
  }
  if (game.flags.breakthrough && game.flags.rumorDebunked && !game.flags.exposed && game.people.ning.knowledge.rumor_source_player) {
    game.flags.exposed = true;
    game.people.xu.trust -= 40;
    note(game, '宁素', '宁素在追问下承认鉴定符由你交给她。徐宁得知你是造谣者，决定追查当年的差价。', [game.flags.rumorDebunked, game.flags.forged]);
  }

  if (game.flags.attacked && (game.pill.owner === 'player' || game.flags.playerBreakthrough) && !game.people.lu.knowledge.ambush) {
    const id = note(game, '魏守', '魏守向陆执事报案，描述黑风林的夺丹者。坊市对你的警惕上升。', [game.flags.attacked]);
    know(game, 'lu', 'ambush', id);
    game.player.reputation = Math.max(0, game.player.reputation - 10);
  }
  if (game.people.shen.place === WOODS && game.pill.owner === 'shen' && !game.flags.hanStalked) {
    note(game, '寒沙', '寒沙发现沈秋带丹入林，开始暗中尾随，但忌惮同行的魏守。', [game.flags.lured]);
    game.flags.hanStalked = true;
  }
  if (game.flags.partnerDebt && (game.pill.owner === 'player' || game.flags.playerBreakthrough) && !game.flags.partnerDemanded) {
    game.flags.partnerDemanded = true;
    note(game, '徐宁', `徐宁提醒你：合资承诺中的 ${game.flags.partnerDebt} 灵石还未结清。`);
  }

  game.player.hp = Math.min(100, game.player.hp + 5);
  return { game, result: `进入第 ${game.turn} 旬。${game.events.length - started} 条新动向写入因果账本。` };
}

export function getView(game) {
  const names = Object.fromEntries(PEOPLE.map(p => [p.id, p.name]));
  names.player = '你';
  names.consumed = '已炼化';
  const visible = game.events.filter(e => e.scope !== 'private');
  const visibleIds = new Set(visible.map(e => e.id));
  const pillOwner = game.pill.owner;
  return {
    ...getCombatView(game),
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
    people: PEOPLE.map(p => ({
      id: p.id, name: p.name, role: p.role, goal: p.publicGoal,
      place: game.people[p.id].place, condition: game.people[p.id].condition,
      trust: game.people[p.id].trust,
      greeting: dialogueFor(game, p.id),
      dialogue: game.player.dialogues?.[p.id] || null,
      memories: visible.filter(e => e.actor === p.name || e.text.includes(p.name)).slice(-3).map(e => ({ turn: e.turn, text: e.text, id: e.id }))
    })),
    world: { herbsRemaining: Math.max(0, 2 - game.flags.herbGathered), trapReady: Boolean(game.flags.trap), meetingPlanned: Boolean(game.flags.lured), reportFiled: Boolean(game.flags.report), partnered: Boolean(game.flags.partnerEvent), breakthrough: Boolean(game.flags.playerBreakthrough), realm: game.flags.playerBreakthrough ? '筑基初期' : '炼气九层' },
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
    outcome: game.flags.playerBreakthrough ? `筑基已成。${game.flags.partnerDebt ? '与徐宁的欠款仍待偿还。' : '这场机缘的因果仍将继续。'}` : pillOwner === 'player'
      ? game.flags.partnerDebt ? '筑基丹已入手；徐宁的合资承诺仍待履行。' : '筑基丹已入手。可以继续推进时间，观察人物的后续反应。'
      : pillOwner === 'xu' ? '徐宁已取得筑基丹。本局机缘失手，可重开尝试另一条路线。' : ''
  };
}

export function parseLocal(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_COMMAND) throw new GameError('请输入 1～280 字的行动描述。');
  const input = text.trim();
  if (/服丹|冲击筑基|闭关突破|炼化筑基丹/.test(input)) return { type: 'breakthrough' };
  if (/调息|疗伤|休息/.test(input)) return { type: 'rest' };
  if (/买.*天雷符|购.*天雷符|补充.*符/.test(input)) return { type: 'buy_talisman' };
  const price = input.match(/(?:出价|报价|愿出|以|用)\s*(\d{1,4})\s*(?:枚)?灵石|(?:买丹|买筑基丹|购买筑基丹).*?(\d{1,4})\s*(?:枚)?灵石/);
  if (price && /丹|沈秋|丹商/.test(input)) {
    return {
      type: 'negotiate', offer: Number(price[1] || price[2]),
      leverage: /走私|货道|举报|证词/.test(input) ? 'smuggling' : /真丹|鉴定|白芷/.test(input) ? 'authentic' : 'none'
    };
  }
  if (/还款|还给徐宁|履约|结清/.test(input)) return { type: 'honor_partner' };
  if (/举报|告发|报给陆|交给陆|执事.*查封/.test(input)) return { type: 'report' };
  if (/伪造|造谣|假鉴定|有毒|放出.*消息/.test(input)) return { type: 'forge_poison' };
  if (/空白印|鉴定印|买.*印/.test(input)) return { type: 'buy_seal' };
  if (/合资|借.*灵石|合作买丹|找徐宁/.test(input)) return { type: 'partner' };
  if (/验丹|鉴丹|鉴定|真假|药纹/.test(input)) return { type: 'inspect_pill' };
  if (/货道|车号|走私|调查.*来路|问宁素/.test(input)) return { type: 'investigate_route' };
  if (/引.*出城|约.*黑风林|诱.*黑风林|林中验货/.test(input)) return { type: 'lure' };
  if (/布阵|设伏|埋伏|布.*天雷符/.test(input)) return { type: 'prepare_trap' };
  if (/伏击|偷袭|夺丹|抢.*丹|攻击沈/.test(input)) return { type: 'ambush' };
  if (/回.*坊市|去.*坊市/.test(input)) return { type: 'travel_market' };
  if (/去.*黑风林|前往.*林|入.*林|进.*林/.test(input)) return { type: 'travel_woods' };
  if (/采.*灵草|采药|采集.*药/.test(input)) return { type: 'gather_herbs' };
  if (/卖.*灵草|卖.*药草/.test(input)) return { type: 'sell_herbs' };
  if (/买.*筑基丹|购买.*丹|竞买.*丹|出价.*丹/.test(input)) return { type: 'buy_pill' };
  const person = PEOPLE.find(p => input.includes(p.name));
  if (person && /问|聊|交谈|打听|找/.test(input)) return { type: 'ask', target: person.id };
  throw new GameError('这条计策暂时无法执行。可试试「请白芷验丹」「找徐宁合资」「向陆执事举报」或点击行动按钮。');
}

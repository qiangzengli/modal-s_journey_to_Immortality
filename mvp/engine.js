export class GameError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GameError';
  }
}

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

function spend(game, amount = 1) {
  if (game.ap < amount) throw new GameError('本旬行动点不足。先点击「推进一旬」。');
  game.ap -= amount;
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
    ap: 3,
    nextId: 1,
    player: { place: MARKET, stones: 180, hp: 100, reputation: 50, herbs: 1, talismans: 1, seal: 0, clues: [], clueEvents: {} },
    people,
    pill: { owner: 'shen', price: 280, genuine: true },
    flags: {
      partner: false, partnerDebt: 0, partnerDeadline: 0, partnerDefaulted: false,
      partnerDemanded: false, partnerEvent: 0, sellerReserved: false,
      report: 0, auction: false, lured: 0, trap: 0, attacked: 0,
      forged: 0, rumorSpread: 0, disputed: false, rumorDebunked: false,
      xuLoan: 0, xuBought: 0, breakthrough: 0, exposed: false,
      herbGathered: 0, herbSale: 0, tonicReady: 0, tonicDelivered: false,
      pillSale: 0, hanStalked: false
    },
    events: []
  };
  note(game, '邸报', '地下坊市传出消息：沈秋持有一枚筑基丹，开价 280 灵石。三旬之内，买家将陆续出手。');
  know(game, 'shen', 'pill', 1);
  know(game, 'bai', 'pill', 1);
  know(game, 'xu', 'pill', 1);
  know(game, 'qing', 'pill', 1);
  know(game, 'wei', 'pill', 1);
  return game;
}

export const ACTIONS = [
  'ask', 'inspect_pill', 'investigate_route', 'partner', 'buy_pill', 'negotiate', 'sell_herbs',
  'report', 'lure', 'travel_woods', 'travel_market', 'prepare_trap', 'ambush',
  'buy_seal', 'forge_poison', 'honor_partner', 'gather_herbs'
];

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

export function applyAction(source, action) {
  if (!action || !ACTIONS.includes(action.type)) throw new GameError('未识别的行动。可以试试「验丹」「调查货道」「找徐宁合资」。');
  const game = structuredClone(source);
  const type = action.type;
  const target = action.target;
  let result = '';

  switch (type) {
    case 'ask': {
      const person = game.people[target];
      if (!person) throw new GameError('请选择一位在场人物交谈。');
      if (person.place !== game.player.place) throw new GameError(`${person.name}不在此处。`);
      spend(game);
      result = ASK_LINES[target];
      note(game, '你', `与${person.name}交谈，得知其当前关切。`, [], 'player');
      break;
    }
    case 'inspect_pill': {
      at(game, MARKET);
      hasPill(game, 'shen');
      if (game.people.shen.place !== MARKET) throw new GameError('沈秋已带丹药离开坊市，白芷现在无法当面验丹。');
      if (game.player.clues.includes('authentic')) throw new GameError('白芷已为这枚丹药落印，无需重复鉴定。');
      requireStones(game, 10);
      spend(game);
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
      spend(game);
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
      spend(game);
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
      spend(game);
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
      spend(game);
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
      spend(game);
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
      spend(game);
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
      spend(game);
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
      spend(game);
      game.flags.lured = note(game, '你', '你以避开坊市耳目为由，约沈秋下旬在黑风林验货。', [], 'player');
      know(game, 'shen', 'woods_meeting', game.flags.lured);
      result = '沈秋答应赴约。先到黑风林准备，推进一旬后他会抵达。';
      break;
    }
    case 'travel_woods':
    case 'travel_market': {
      const destination = type === 'travel_woods' ? WOODS : MARKET;
      if (game.player.place === destination) throw new GameError('你已经在这里。');
      spend(game);
      game.player.place = destination;
      note(game, '你', `前往${destination === WOODS ? '黑风林' : '地下坊市'}。`, [], 'player');
      result = destination === WOODS ? '你进入黑风林。寒沙正在附近观察来路。' : '你回到地下坊市。';
      break;
    }
    case 'prepare_trap': {
      at(game, WOODS);
      if (game.flags.trap) throw new GameError('天雷符已经布好。');
      if (!game.player.talismans) throw new GameError('你没有天雷符，无法布阵。');
      spend(game);
      game.player.talismans -= 1;
      game.flags.trap = note(game, '你', '你在林道布下天雷符，准备截住携丹者。', [], 'player');
      result = '天雷符已布好，消耗 1 张。斗法仍会消耗气血并招来追查。';
      break;
    }
    case 'ambush': {
      at(game, WOODS);
      hasPill(game, 'shen');
      if (game.people.shen.place !== WOODS) throw new GameError('沈秋不在黑风林。可以先约他出城，再推进一旬。');
      spend(game);
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
      spend(game);
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
      spend(game);
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
      spend(game);
      game.player.stones -= game.flags.partnerDebt;
      game.people.xu.stones += game.flags.partnerDebt;
      note(game, '你', `你向徐宁付清 ${game.flags.partnerDebt} 灵石，履行合资承诺。`);
      game.flags.partnerDebt = 0;
      game.people.xu.trust += 25;
      result = '合资承诺已经履行，徐宁认可你守信。';
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
  const game = structuredClone(source);
  game.turn += 1;
  game.ap = 3;
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

  if (game.flags.attacked && game.pill.owner === 'player' && !game.people.lu.knowledge.ambush) {
    const id = note(game, '魏守', '魏守向陆执事报案，描述黑风林的夺丹者。坊市对你的警惕上升。', [game.flags.attacked]);
    know(game, 'lu', 'ambush', id);
    game.player.reputation = Math.max(0, game.player.reputation - 10);
  }
  if (game.people.shen.place === WOODS && game.pill.owner === 'shen' && !game.flags.hanStalked) {
    note(game, '寒沙', '寒沙发现沈秋带丹入林，开始暗中尾随，但忌惮同行的魏守。', [game.flags.lured]);
    game.flags.hanStalked = true;
  }
  if (game.flags.partnerDebt && game.pill.owner === 'player' && !game.flags.partnerDemanded) {
    game.flags.partnerDemanded = true;
    note(game, '徐宁', `徐宁提醒你：合资承诺中的 ${game.flags.partnerDebt} 灵石还未结清。`);
  }

  game.player.hp = Math.min(100, game.player.hp + 5);
  return { game, result: `进入第 ${game.turn} 旬。${game.events.length - started} 条新动向写入因果账本。` };
}

export function getView(game) {
  const names = Object.fromEntries(PEOPLE.map(p => [p.id, p.name]));
  names.player = '你';
  const visible = game.events.filter(e => e.scope !== 'private');
  const visibleIds = new Set(visible.map(e => e.id));
  const pillOwner = game.pill.owner;
  return {
    turn: game.turn,
    ap: game.ap,
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
      trust: game.people[p.id].trust
    })),
    events: visible.map(e => ({ ...e, causes: e.causes.filter(id => visibleIds.has(id)) })).reverse(),
    outcome: pillOwner === 'player'
      ? game.flags.partnerDebt ? '筑基丹已入手；徐宁的合资承诺仍待履行。' : '筑基丹已入手。可以继续推进时间，观察人物的后续反应。'
      : pillOwner === 'xu' ? '徐宁已取得筑基丹。本局机缘失手，可重开尝试另一条路线。' : ''
  };
}

export function parseLocal(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_COMMAND) throw new GameError('请输入 1～280 字的行动描述。');
  const input = text.trim();
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

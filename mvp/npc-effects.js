import { GameError } from './errors.js';
const MARKET = 'market', WOODS = 'woods';
function note(game, actor, text, causes = [], scope = 'public') {
  const event = { id: game.nextId++, turn: game.turn, actor, text, causes, scope };
  game.events.push(event);
  return event.id;
}

function know(game, id, fact, eventId) {
  const person = game.people[id];
  if (!person.knowledge[fact]) person.knowledge[fact] = eventId;
}

function spreadKnowledge(game, from, fact, to, cause) {
  if (!game.people[from].knowledge[fact] || game.people[to].knowledge[fact]) return;
  know(game, to, fact, cause);
}


export const NPC_EFFECTS = {
  ning: { spread_rumor: '向熟人传播自己收到的鉴定传闻', reveal_source: '说明已经核实的假鉴定来源' },
  bai: { suspend_endorsement: '收到争议后暂停鉴定背书', verify_rumor: '重新核验争议中的丹药', brew_tonic: '用已经收购的灵草炼续命药' },
  lu: { investigate_report: '核对收到的货道证词，依法查封公售' },
  shen: { reserve_pill: '知道玩家合资后暂留丹药', attend_meeting: '按玩家的邀请带护卫赴林', lower_price: '因药性争议降价到210', buy_tonic: '花100灵石购买已炼好的续命药' },
  xu: { buy_pill: '用自己的灵石买下在售筑基丹', cultivate: '炼化已购得的筑基丹', request_repayment: '提醒玩家偿还真实欠款' },
  qing: { lend_stones: '从自己资产中借出徐宁买丹所缺灵石' },
  wei: { report_attack: '向执事报告亲历的夺丹事件' },
  han: { follow_caravan: '跟踪已来到黑风林的丹商' }
};
export function applyNpcEffect(source, actorId, action) {
  if (!Object.hasOwn(NPC_EFFECTS[actorId] || {}, action)) throw new GameError('人物没有这项能力。');
  const game = structuredClone(source), choice = `${actorId}:${action}`;
  const started = game.events.length;
  // 只执行决策者明确选择且当前事实允许的行为，不按时间自动触发。
  if (choice === 'ning:spread_rumor' && game.people.ning.knowledge.poison_rumor && !game.flags.rumorSpread) {
    const cause = game.people.ning.knowledge.poison_rumor;
    const id = note(game, '宁素', '宁素将“筑基丹有毒”的鉴定符传给白芷和徐宁，坊市开始议论。', [cause]);
    spreadKnowledge(game, 'ning', 'poison_rumor', 'bai', id);
    spreadKnowledge(game, 'ning', 'poison_rumor', 'xu', id);
    game.flags.rumorSpread = id;
  }

  // 暂停背书与核验是独立选择，满足准备时间后仍须本人决定。
  if (choice === 'bai:suspend_endorsement' && game.people.bai.knowledge.poison_rumor && !game.flags.disputed && !game.flags.rumorDebunked) {
    game.flags.disputed = true;
    note(game, '白芷', '白芷暂停为筑基丹背书，等待重新核验。', [game.flags.rumorSpread]);
  } else if (choice === 'bai:verify_rumor' && game.flags.disputed && game.turn >= 3 && !game.flags.rumorDebunked) {
    game.flags.rumorDebunked = note(game, '白芷', '白芷核对药纹，确认“有毒鉴定”是伪造的，开始寻找鉴定印来源。', [game.flags.rumorSpread]);
    game.flags.disputed = false;
    know(game, 'bai', 'forged_rumor', game.flags.rumorDebunked);
    spreadKnowledge(game, 'bai', 'forged_rumor', 'lu', game.flags.rumorDebunked);
  }

  if (choice === 'lu:investigate_report' && game.flags.report && game.pill.owner === 'shen') {
    game.pill.owner = 'lu';
    game.flags.auction = true;
    game.people.shen.trust -= 15;
    note(game, '陆执事', '陆执事核对车号，查封私售的筑基丹，定价 150 灵石公开转售。沈秋怀疑此事与你有关。', [game.flags.report]);
  }

  if (choice === 'bai:brew_tonic' && game.flags.herbSale && !game.flags.tonicReady) {
    game.flags.tonicReady = note(game, '白芷', '白芷用收来的灵草炼好续命药，等沈秋筹足灵石便可交货。', [game.flags.herbSale]);
  }

  if (choice === 'shen:reserve_pill' && game.flags.partner && game.pill.owner === 'shen' && !game.flags.sellerReserved) {
    game.flags.sellerReserved = true;
    know(game, 'shen', 'player_funded', game.flags.partnerEvent);
    note(game, '沈秋', '沈秋得知你与徐宁已经筹款，暂缓寻找别的买家，等你前来交易。', [game.flags.partnerEvent]);
  }

  if (choice === 'shen:attend_meeting' && game.flags.lured && game.pill.owner === 'shen' && game.people.shen.place === MARKET) {
    game.people.shen.place = WOODS;
    game.people.wei.place = WOODS;
    note(game, '沈秋', '沈秋带丹药与魏守前往黑风林赴约。', [game.flags.lured]);
  } else if (choice === 'shen:lower_price' && game.pill.owner === 'shen' && game.flags.disputed && game.pill.price !== 210) {
    game.pill.price = 210;
    note(game, '沈秋', '鉴定传闻使买家退缩，急需灵石的沈秋把丹药降至 210 灵石。', [game.flags.rumorSpread]);
  }

  if (['xu:buy_pill', 'qing:lend_stones'].includes(choice) && game.pill.owner === 'shen' && game.people.shen.place === MARKET) {
    if (choice === 'xu:buy_pill' && game.people.xu.stones >= game.pill.price && !game.flags.partner) {
      game.people.xu.stones -= game.pill.price;
      game.people.shen.stones += game.pill.price;
      game.pill.owner = 'xu';
      game.flags.xuBought = note(game, '徐宁', `徐宁为求突破，以 ${game.pill.price} 灵石买下筑基丹。`, game.flags.rumorSpread ? [game.flags.rumorSpread] : [1]);
    }
    if (choice === 'qing:lend_stones' && !game.flags.partner && !game.flags.xuLoan) {
      const loan = game.pill.price - game.people.xu.stones;
      if (loan > 0 && loan <= 80 && game.people.qing.stones >= loan) {
        game.people.qing.stones -= loan;
        game.people.xu.stones += loan;
        game.flags.xuLoan = loan;
        note(game, '青闻', `青闻借给徐宁 ${loan} 灵石，押他突破后偿还。`, [1]);
      }
    }
  }

  if (choice === 'xu:cultivate' && game.pill.owner === 'xu' && game.flags.xuBought && !game.flags.breakthrough && game.turn >= game.events.find(e => e.id === game.flags.xuBought).turn + 1) {
    game.flags.breakthrough = note(game, '徐宁', '徐宁服丹闭关，终于突破瓶颈；他开始回看买丹时听过的传闻。', [game.flags.xuBought]);
    game.people.xu.condition = '筑基初期';
  }
  if (choice === 'shen:buy_tonic' && game.flags.tonicReady && !game.flags.tonicDelivered && game.people.shen.stones >= 100 && game.pill.owner !== 'shen') {
    game.people.shen.stones -= 100;
    game.people.bai.stones += 100;
    game.flags.tonicDelivered = true;
    game.people.shen.condition = '已为师弟备药';
    note(game, '沈秋', '沈秋用卖丹所得向白芷买下续命药，终于能救治师弟。', [game.flags.tonicReady, game.flags.pillSale || game.flags.xuBought]);
  }
  if (choice === 'ning:reveal_source' && game.flags.breakthrough && game.flags.rumorDebunked && !game.flags.exposed && game.people.ning.knowledge.rumor_source_player) {
    game.flags.exposed = true;
    game.people.xu.trust -= 40;
    note(game, '宁素', '宁素在追问下承认鉴定符由你交给她。徐宁得知你是造谣者，决定追查当年的差价。', [game.flags.rumorDebunked, game.flags.forged]);
  }

  if (choice === 'wei:report_attack' && game.flags.attacked && (game.pill.owner === 'player' || game.flags.playerBreakthrough) && !game.people.lu.knowledge.ambush) {
    const id = note(game, '魏守', '魏守向陆执事报案，描述黑风林的夺丹者。坊市对你的警惕上升。', [game.flags.attacked]);
    know(game, 'lu', 'ambush', id);
    game.player.reputation = Math.max(0, game.player.reputation - 10);
  }
  if (choice === 'han:follow_caravan' && game.people.shen.place === WOODS && game.pill.owner === 'shen' && !game.flags.hanStalked) {
    note(game, '寒沙', '寒沙发现沈秋带丹入林，开始暗中尾随，但忌惮同行的魏守。', [game.flags.lured]);
    game.flags.hanStalked = true;
  }
  if (choice === 'xu:request_repayment' && game.flags.partnerDebt && (game.pill.owner === 'player' || game.flags.playerBreakthrough) && !game.flags.partnerDemanded) {
    game.flags.partnerDemanded = true;
    note(game, '徐宁', `徐宁提醒你：合资承诺中的 ${game.flags.partnerDebt} 灵石还未结清。`);
  }


  if (game.events.length === started) throw new GameError('当前局势不允许这项人物行动。');
  return game;
}

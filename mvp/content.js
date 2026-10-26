export const ACTION_DEFS = [
  { type: 'inspect_pill', title: '请白芷验丹', detail: '拿到可核对的真丹鉴定', cost: '1 行动 · 10 灵石', place: 'market', person: 'bai' },
  { type: 'investigate_route', title: '查禁运货道', detail: '取得车号与时间证词', cost: '1 行动', place: 'market', person: 'ning' },
  { type: 'partner', title: '商议合资', detail: '凭真丹鉴定借入 100 灵石，承诺返还 120', cost: '1 行动 · 形成欠款', place: 'market', person: 'xu' },
  { type: 'sell_herbs', title: '出售一株灵草', detail: '白芷收购，用于炼制续命药', cost: '1 行动 · 灵草 1 → 灵石 80', place: 'market', person: 'bai' },
  { type: 'buy_pill', title: '买下筑基丹', detail: '按当前售价购入', cost: '1 行动 · 按现价付款', place: 'market', person: 'shen' },
  { type: 'report', title: '递交货道证词', detail: '执事将在下一旬查验并查封', cost: '1 行动 · 需货道证词', place: 'market', person: 'lu' },
  { type: 'buy_seal', title: '买空白鉴定印', detail: '可用于制作假鉴定，来源会留下记录', cost: '1 行动 · 25 灵石', place: 'market', person: 'qing' },
  { type: 'forge_poison', title: '散布有毒鉴定', detail: '交宁素传播，可能被追查', cost: '1 行动 · 空白印 1', place: 'market', person: 'ning' },
  { type: 'lure', title: '约沈秋出城', detail: '下一旬与护卫一同赴黑风林', cost: '1 行动', place: 'market', person: 'shen' },
  { type: 'travel_woods', title: '前往黑风林', detail: '经过界门进入城外险地', cost: '1 行动', place: 'market', site: 'gate' },
  { type: 'travel_market', title: '返回地下坊市', detail: '经过界门回到坊市', cost: '1 行动', place: 'woods', site: 'gate' },
  { type: 'gather_herbs', title: '采集灵草', detail: '林道共可采两株；带回坊市出售', cost: '1 行动', place: 'woods', site: 'herbs' },
  { type: 'prepare_trap', title: '布下天雷符', detail: '阵法能迫退护卫，为夺丹创造机会', cost: '1 行动 · 天雷符 1', place: 'woods', site: 'formation' },
  { type: 'ambush', title: '拦截夺丹', detail: '无阵会失败并失去 35 气血；有阵损失 20 气血、15 声望', cost: '1 行动 · 会被目击追查', place: 'woods', site: 'formation' },
  { type: 'honor_partner', title: '结清合资承诺', detail: '偿还徐宁，增加信任', cost: '1 行动 · 偿还欠款', place: 'market', person: 'xu' },
  { type: 'buy_talisman', title: '购入天雷符', detail: '补充一张用于布阵的符箓', cost: '1 行动 · 35 灵石', place: 'market', person: 'qing' },
  { type: 'rest', title: '调息疗伤', detail: '在听雨亭恢复 30 气血', cost: '1 行动 · 10 灵石', place: 'woods', site: 'camp' },
  { type: 'breakthrough', title: '服丹筑基', detail: '气血至少 60 时炼化筑基丹；因果与欠款继续保留', cost: '1 行动 · 消耗筑基丹', place: 'woods', site: 'camp' }
];

export const PERSON_ACTIONS = {
  shen: ['ask', 'buy_pill', 'lure'], bai: ['ask', 'inspect_pill', 'sell_herbs'],
  xu: ['ask', 'partner', 'honor_partner'], lu: ['ask', 'report', 'buy_pill'],
  qing: ['ask', 'buy_seal', 'buy_talisman'], wei: ['ask'], han: ['ask', 'ambush'],
  ning: ['ask', 'investigate_route', 'forge_poison']
};

export const SITES = {
  herbs: { name: '灵草坡', role: '黑风林 · 采集', detail: '林间灵草可用于药师炼丹，也能换来购买机缘的灵石。', actions: ['gather_herbs'] },
  formation: { name: '天雷阵位', role: '黑风林 · 设伏', detail: '古阵仍能聚气。护商修士会对贸然进攻作出反击。', actions: ['prepare_trap', 'ambush'] },
  camp: { name: '听雨亭', role: '黑风林 · 调息', detail: '山林间的一处静地。调息疗伤，或服下筑基丹冲破瓶颈。', actions: ['rest', 'breakthrough'] }
};

export const PERSON_DETAILS = {
  shen: { color: '#b48b53', realm: '炼气九层', bio: '衣袍有些旧，却把丹盒擦得一尘不染。说话时总在留意来往的买家。' },
  bai: { color: '#81b59c', realm: '炼气八层', bio: '袖口沾着药草的青汁，案上丹谱翻到了旧页。她只认可亲手核验的药纹。' },
  xu: { color: '#8babce', realm: '炼气圆满', bio: '剑鞘已磨出缺口，手边的药瓶空了很久。他看向丹盒的目光从未移开太久。' },
  lu: { color: '#cc8c74', realm: '筑基初期', bio: '赤袍佩令，腰间挂着巡坊玉牌。定夺之前，他总要把证词核对两遍。' },
  qing: { color: '#b09bc9', realm: '炼气七层', bio: '宽檐帽遮去半张脸，指尖的算盘从不闲着。人情、印信与借贷都有价钱。' },
  wei: { color: '#99b3a4', realm: '炼气圆满', bio: '剑不离身，始终站在雇主退路一侧。看似沉默，却一直注视周围人的手。' },
  han: { color: '#c9937e', realm: '炼气九层', bio: '黑衣融入树影。林道上的车辙和脚印，比传闻更能引起他的兴趣。' },
  ning: { color: '#d6c39b', realm: '炼气六层', bio: '一筒传音符系在腰间。她游走于坊市各处，靠消息的可信度维持生意。' }
};

export function questSteps(view, route = 'trade') {
  const w = view.world;
  const won = view.pill.ownerId === 'player' || w.breakthrough;
  const routes = {
    trade: [
      ['核验丹药', view.player.clues.includes('authentic'), 'bai', '取得药师印记，才有说服徐宁的凭据。'],
      ['与徐宁合资', w.partnered, 'xu', '合资有期限，也有还款承诺。'],
      ['筹足灵石', view.player.stones >= (view.pill.price ?? 280), 'bai', '将灵草换成灵石，留意商人当前要价。'],
      ['取得筑基丹', won, view.pill.ownerId === 'lu' ? 'lu' : 'shen', '买家也在筹钱，切勿空等太久。']
    ],
    report: [
      ['查清货道', view.player.clues.includes('smuggling'), 'ning', '向宁素索取可核对的车号与时间。'],
      ['向执事递交证词', w.reportFiled, 'lu', '有证词，执事才会调查。'],
      ['等待查验', view.pill.ownerId === 'lu', 'advance', '推进一旬，观察查封结果。'],
      ['取得筑基丹', won, 'lu', '公售价为 150 灵石。']
    ],
    ambush: [
      ['邀丹商出城', w.meetingPlanned, 'shen', '沈秋会在下旬与魏守一同赴约。'],
      ['林中布阵', w.trapReady, 'formation', '穿过界门，在天雷阵位埋下符箓。'],
      ['等待携丹者', view.people.find(p => p.id === 'shen').place === 'woods', 'advance', '推进一旬，让约定成为现实。'],
      ['取得筑基丹', won, 'formation', '有阵仍会受伤、失去声望，并被追查。']
    ]
  };
  // 已经取得机缘时，旧路线的前置步骤不再阻挡最终修炼目标。
  const steps = (routes[route] || routes.trade).map(([title, done, target, detail]) => ({ title, done, target, detail, skipped: won && !done }));
  return [...steps, { title: '听雨亭服丹筑基', done: w.breakthrough, target: 'camp', detail: '气血至少 60。突破不会抹去欠款与仇怨。', skipped: false }];
}

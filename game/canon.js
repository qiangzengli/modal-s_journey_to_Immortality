// 旧档保留人物 ID、财物和记忆；仅迁移公开身份，不伪造旧事件。
export const CANON_IDENTITIES = {
  shen:{name:'许掌柜',role:'万宝楼掌柜',realm:'炼气期',bio:'在黄枫谷坊市经营万宝楼，熟悉法器与灵药交易。',goal:'经营万宝楼，权衡丹药交易的得失'},
  bai:{name:'马师兄',role:'黄枫谷百药园管事',realm:'炼气十三层',bio:'看管百药园，熟悉药性与灵草培育。',goal:'照看药园，核验灵草与丹药'},
  xu:{name:'吴风',role:'黄枫谷弟子',realm:'炼气十三层',bio:'黄枫谷中修炼多年的弟子，关心筑基所需的机缘。',goal:'筹措资粮，寻求筑基机会'},
  lu:{name:'叶师叔',role:'黄枫谷执事',realm:'筑基期',bio:'处理门中事务，熟悉升仙令与弟子入门规矩。',goal:'核验凭据，维护门中秩序'},
  qing:{name:'刘靖',role:'黄枫谷修士',realm:'筑基期',bio:'李化元门下修士，行事重视是非。',goal:'维护同门与宗门秩序'},
  wei:{name:'宋蒙',role:'黄枫谷弟子',realm:'筑基期',bio:'李化元门下弟子，喜好与同道切磋。',goal:'磨炼斗法本事，履行已作承诺'},
  han:{name:'封岳',role:'天阙堡弟子',realm:'炼气十三层',bio:'天阙堡弟子，行事狠辣，觊觎他人的修炼资粮。',goal:'夺取灵药与法器'},
  ning:{name:'萧翠儿',role:'散修',realm:'炼气期',bio:'机敏的少女散修，关心修仙界的消息与机缘。',goal:'辨认消息真假，寻找修炼机会'}
};
export function ensureCanonIdentities(game) {
  if(game.canonVersion===1)return;
  for(const [id,identity]of Object.entries(CANON_IDENTITIES))if(game.people[id])Object.assign(game.people[id],identity,{publicGoal:identity.goal});
  game.player.name??='韩立';
  game.canonVersion=1;
}

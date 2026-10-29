// 原著境界词表；当前可操作的突破为炼气到筑基，不靠聊天提升境界。
export const CULTIVATION_REALMS = [
  {name:'凡人',stages:[]}, {name:'炼气',stages:Array.from({length:13},(_,i)=>`${i+1}层`)},
  ...['筑基','结丹','元婴','化神','炼虚','合体'].map(name=>({name,stages:['初期','中期','后期']})),
  {name:'大乘',stages:['大乘期']}, {name:'渡劫飞升',stages:[]}
];
export function cultivationRealm(game) {
  if(game.flags?.playerBreakthrough)return '筑基初期';
  if(game.campaign?.storyFlags?.garden_cultivate)return '炼气十一层';
  if(game.campaign?.storyFlags?.garden_first_retreat)return '炼气十层';
  const f=game.volume?.flags;
  if(!f)return '炼气九层';
  return f.enter_xianmen||f.prepare_departure?'炼气九层':f.confront_mo||f.cultivate_changchun?'炼气四层':f.study_changchun?'炼气一层':'凡人';
}
export function canonContext(game) {
  return {source:'凡人修仙传',protagonist:'韩立',realm:cultivationRealm(game),
    era:game.volume&&!game.volume.flags.enter_xianmen?'七玄门、神手谷、嘉元城与太南小会':game.campaign?.storyFlags?.take_master?'黄枫谷筑基，拜师李化元':game.campaign?.storyFlags?.enter_forbidden?'血色禁地采药与筑基':'升仙令入黄枫谷与百药园修炼',
    completed:Object.keys(game.campaign?.storyFlags||{}),
    rules:'人物、功法、门派、地名、境界沿用《凡人修仙传》。原著主线经历以当前已完成行动为准；不要提前透露墨大夫夺舍、向之礼真实身份、小瓶来历或未来剧情。小绿瓶是韩立的秘密。筑基丹须由韩立将禁地所得三味活株留种培育，成熟采收后亲手炼制，不能购买、夺丹或交药领取成丹。交易、委托与问计是当前局势下的自由分支，不宣称是原著既定事件。不得用对话授予修为、物品、入门资格或完成任务；只使用可执行行动。历史记录的旧称仅是旧档记载，不创建同名新人物或继续旧故事。'};
}

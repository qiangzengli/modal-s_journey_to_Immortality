export const SKILLS = {
  changchun: {name:'长春功',cost:8,attribute:'spellPower',effect:'heal',bonus:5,cooldown:2,description:'调匀木灵之气，恢复气血。',color:'#9fc79a'},
  object_control: {name:'御物术',cost:10,attribute:'attack',effect:'damage',bonus:12,cooldown:1,description:'以灵力御剑，攻其不备。',color:'#b6cbbc'},
  fireball: {name:'火弹术',cost:12,attribute:'spellPower',effect:'damage',bonus:16,cooldown:1,description:'凝聚火弹，初入修仙界的基础法术。',color:'#dfad7b'},
  qi_bolt: { name: '冰锥术', cost: 12, attribute: 'spellPower', effect: 'damage', bonus: 5, cooldown: 1, description: '凝出冰锥。以基础法力施展，冷却 1 回合。', color: '#9fcbd3' },
  wind_blade: { name: '青元剑诀', cost: 14, attribute: 'attack', effect: 'damage', bonus: 20, cooldown: 1, description: '青元剑芒破空。以基础攻击力施展，冷却 1 回合。', color: '#b7d9ac' },
  spring_art: { name: '回春功', cost: 16, attribute: 'spellPower', effect: 'heal', bonus: 12, cooldown: 2, description: '以基础法力疗愈自身，不受兵器加成，冷却 2 回合。', color: '#93cba5' },
  fire_art: { name: '弄焰诀', cost: 18, attribute: 'spellPower', effect: 'damage', bonus: 24, cooldown: 2, description: '凝焰攻敌。以基础法力施展，冷却 2 回合。', color: '#eda27b' },
  thunder_art: { name: '掌心雷', cost: 22, attribute: 'spellPower', effect: 'damage', bonus: 32, cooldown: 2, description: '雷击穿甲。以基础法力施展，无视防御，冷却 2 回合。', pierce: true, color: '#b5a8e3' }
};

export const ITEMS = {
  changchun_manual:{name:'长春功',kind:'manual',skill:'changchun',description:'墨大夫传下的基础修炼功法。'},
  fireball_manual:{name:'火弹术',kind:'manual',skill:'fireball',description:'太南小会换得的法术，研习后可用于斗法。'},
  sword_talisman:{name:'剑符宝',kind:'array',power:35,description:'金光上人遗下的符宝，释放剑光并打断攻势；消耗一次。'},
  mo_letter:{name:'墨大夫遗书',kind:'story',description:'送往嘉元城墨府的凭据，记录在第一卷经历中。'},
  warm_jade:{name:'暖阳宝玉',kind:'story',description:'从墨府取得的解毒之物，在墨府内堂使用。'},
  ascension_token:{name:'升仙令',kind:'story',description:'黄枫谷的入门信物，随第一卷主线推进使用。'},
  huanglong_recipe:{name:'黄龙丹方',kind:'story',description:'太南小会换得的丹方，作为后续炼丹的线索收藏。'},
  worn_sword: { name: '铁剑', kind: 'weapon', attack: 2, description: '普攻与伤害功法威力 +2。' },
  green_sword: { name: '青竹剑', kind: 'weapon', attack: 7, description: '普攻与伤害功法威力 +7。' },
  vine_staff: { name: '乌龙夺', kind: 'weapon', attack: 5, description: '普攻与伤害功法威力 +5。' },
  flame_sword: { name: '火云剑', kind: 'weapon', attack: 11, description: '普攻与伤害功法威力 +11。' },
  thunder_blade: { name: '金蚨子母刃', kind: 'weapon', attack: 15, description: '普攻与伤害功法威力 +15。' },
  wind_manual: { name: '青元剑诀·残卷', kind: 'manual', skill: 'wind_blade', description: '李化元所传，筑基后研习青元剑诀。' },
  spring_manual: { name: '回春功·玉简', kind: 'manual', skill: 'spring_art', description: '研习后永久掌握回春功。' },
  fire_manual: { name: '弄焰诀·卷轴', kind: 'manual', skill: 'fire_art', description: '研习后永久掌握弄焰诀。' },
  thunder_manual: { name: '掌心雷·真解', kind: 'manual', skill: 'thunder_art', description: '研习后永久掌握掌心雷。' },
  healing_pill: { name: '回春丹', kind: 'pill', heal: 35, description: '恢复 35 气血。战斗内使用占用一回合。' },
  spirit_pill: { name: '黄龙丹', kind: 'pill', mana: 22, description: '斗法中恢复 22 真气，占用一回合。' },
  binding_array: { name: '定神符', kind: 'array', power: 18, description: '基础威力 18，并打断敌人本回合行动。一次性。' },
  thunder_array: { name: '火雨符', kind: 'array', power: 40, description: '基础威力 40，无视防御。一次性。' }
};

export const WANDERERS = [
  { id:'duheng',name:'陆师兄',role:'黄枫谷弟子',place:'river',realm:'炼气十三层',spot:[49,-8],color:'#79a8b4',hp:86,attack:14,defense:2,escape:.65,bio:'黄枫谷弟子，随身携带法器；可切磋斗法，交锋结果由当前选择决定。',quote:'道友要切磋，便请出招。',loot:{stones:45,herbs:2,items:{green_sword:1,healing_pill:2}}},
  { id:'chisong',name:'寒天涯',role:'禁地试炼弟子',place:'quarry',realm:'炼气十三层',spot:[111,6],color:'#c28768',hp:120,attack:18,defense:4,escape:.5,bio:'参加血色禁地的修士，在采药途中与其他弟子竞争。',quote:'灵药各凭本事。',loot:{stones:70,herbs:2,items:{flame_sword:1,fire_manual:1,healing_pill:3,thunder_array:1}}},
  { id:'shouque',name:'多宝女',role:'掩月宗弟子',place:'ruins',realm:'炼气十三层',spot:[155,8],color:'#a9aed2',hp:150,attack:22,defense:5,escape:.45,bio:'掩月宗弟子，携有多件法器，在血色禁地中心活动。',quote:'莫要小看我的法器。',loot:{stones:95,herbs:3,items:{thunder_blade:1,thunder_manual:1,healing_pill:3,binding_array:2}}},
  { id: 'luohu', name:'青纹道士', role:'散修', realm:'炼气期', spot: [7, 2], color: '#aabb8b', hp: 66, attack: 11, defense: 1, escape: 0.7,
    bio:'太南小会结识的散修之一，言谈与行事需要谨慎辨别。', quote:'道友既要试法，贫道奉陪。',
    loot: { stones: 28, herbs: 1, items: { green_sword: 1, fireball_manual: 1, healing_pill: 2 } } },
  { id: 'suqin', name:'黄孝天', role:'散修', realm:'炼气期', spot: [12, -7], color: '#8dbb9e', hp: 84, attack: 14, defense: 2, escape: 0.6,
    bio:'在越国游历的散修，与同道争夺修炼资粮。', quote:'修仙资粮，谁都需要。',
    loot: { stones: 35, herbs: 3, items: { vine_staff: 1, spring_manual: 1, healing_pill: 2, binding_array: 1 } } },
  { id: 'peijin', name:'吴九指', role:'散修', realm:'炼气期', spot: [21, -2], color: '#d69776', hp: 106, attack: 17, defense: 2, escape: 0.5,
    bio:'游走坊市的散修，随身携带丹药和法器。', quote:'切磋归切磋，莫伤了和气。',
    loot: { stones: 48, herbs: 2, items: { flame_sword: 1, fire_manual: 1, healing_pill: 2, spirit_pill: 2, thunder_array: 1 } } },
  { id: 'mochi', name:'胡萍姑', role:'散修', realm:'炼气期', spot: [20, 7], color: '#aea0cc', hp: 132, attack: 20, defense: 4, escape: 0.4,
    bio:'与太南散修往来，遇事会权衡利益与风险。', quote:'道友先想好退路。',
    loot: { stones: 70, herbs: 2, items: { thunder_blade: 1, thunder_manual: 1, spirit_pill: 2, binding_array: 2, thunder_array: 2 } } }
];

export const ITEM_KINDS = { story:'剧情信物', weapon: '武器', manual: '功法', pill: '灵丹', array: '阵法' };
export function lootEntries(loot) {
  return [
    { name: '灵石', quantity: loot.stones, kind: '灵石' },
    { name: '灵草', quantity: loot.herbs, kind: '灵草' },
    ...Object.entries(loot.items).map(([id, quantity]) => ({ id, ...ITEMS[id], kind: ITEM_KINDS[ITEMS[id].kind], quantity }))
  ];
}

// Main-story encounters use the same turn engine; prerequisites and completion remain rule-owned.
export const STORY_ENEMIES=[
  {id:'story_mojiao',name:'墨蛟',kind:'beast',scope:'campaign',role:'石殿守药妖兽',place:'ruins',spot:[165,-1],color:'#577e82',realm:'禁地妖兽',hp:180,attack:16,defense:5,escape:.7,requires:'meet_nangong',completion:'fight_mojiao',bio:'墨鳞蛟身盘踞石殿，守住天灵果。留意扑击与蓄力甩尾，南宫婉会在每回合协力牵制。',quote:'墨蛟昂首嘶鸣，尾尖扫过石面。',ally:{id:'ji',name:'南宫婉',power:8},reward:{name:'天灵果',kind:'任务主药',quantity:1},loot:{stones:0,herbs:0,items:{}}},
  {id:'story_jinguang',name:'金光上人',role:'野狼帮请来的修仙者',place:'qixuan',spot:[467,4],color:'#d6b667',realm:'炼气期',hp:76,ward:18,attack:8,defense:3,escape:.8,requires:'scout_jinguang',completion:'defend_qixuan',bio:'金刚符撑起护罩，他以修仙手段威压七玄门。先观察护罩，再用御物术与进退应对。',quote:'凡人也敢挡在本上人面前？',loot:{stones:0,herbs:0,items:{ascension_token:1,sword_talisman:1}}},
  {id:'story_qingwen',name:'青纹道士',role:'太南散修中的劫修',place:'tainan',spot:[644,5],color:'#8caa83',realm:'炼气期',hp:86,attack:9,defense:2,escape:.8,requires:'probe_tainan',completion:'fight_qingwen',bio:'小会上的热络邀请变成谷外的围堵。青纹先行出手，同伙尚在附近，须保留疗伤与应变的余地。',quote:'道友既已出谷，何必急着走？',loot:{stones:0,herbs:0,items:{spirit_pill:1}}},
  {id:'story_hupinggu',name:'胡萍姑',role:'青纹同行的劫修',place:'tainan',spot:[647,-4],color:'#b59aad',realm:'炼气期',hp:80,attack:10,defense:2,escape:.8,requires:'fight_qingwen',completion:'fight_hupinggu',bio:'青纹败退后，同行的胡萍姑仍封住去路。可先在小会歇脚处疗伤，再完成突围。',quote:'想把东西带走，还得过我这关。',loot:{stones:0,herbs:0,items:{binding_array:1}}}
];
// Quest rewards are shown here but only granted by the campaign settlement.
export const encounterLoot=enemy=>enemy.reward?[{...enemy.reward}]:lootEntries(enemy.loot);
export const ALL_ENEMIES=[...WANDERERS,...STORY_ENEMIES];
export function enemyAvailable(game,enemy) {
  if(enemy.scope==='campaign') {
    if(game.volume&&!game.volume.flags.enter_xianmen)return false;
    const flags=game.campaign?.storyFlags||{};
    return Boolean(flags[enemy.requires])&&!flags[enemy.completion];
  }
  if(enemy.completion&&game.volume?.flags[enemy.completion]&&!game.exploration?.enemies[enemy.id]?.defeated)return false;
  if(enemy.completion)return Boolean(game.volume?.flags[enemy.requires])&&!game.volume?.legacyCompleted?.includes(enemy.completion);
  if(game.volume&&!game.volume.flags.enter_xianmen)return false;
  // The same characters have already appeared in the opening, not a second copy in the woods.
  if(game.volume&&['luohu','mochi'].includes(enemy.id))return false;
  return true;
}

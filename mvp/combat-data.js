export const SKILLS = {
  qi_bolt: { name: '凝气诀', cost: 12, power: 25, cooldown: 1, description: '凝气成刃。造成法术伤害，冷却 1 回合。', color: '#9fcbd3' },
  wind_blade: { name: '疾风剑诀', cost: 14, power: 34, cooldown: 1, description: '剑气破空。伤害随武器提升，冷却 1 回合。', color: '#b7d9ac' },
  spring_art: { name: '回春术', cost: 16, heal: 32, cooldown: 2, description: '恢复 32 气血，冷却 2 回合。', color: '#93cba5' },
  fire_art: { name: '离火诀', cost: 18, power: 44, cooldown: 2, description: '离火焚身。高额伤害，冷却 2 回合。', color: '#eda27b' },
  thunder_art: { name: '惊雷诀', cost: 22, power: 52, cooldown: 2, description: '雷击穿甲。无视防御，冷却 2 回合。', pierce: true, color: '#b5a8e3' }
};

export const ITEMS = {
  worn_sword: { name: '旧铁剑', kind: 'weapon', attack: 2, description: '普攻与伤害功法威力 +2。' },
  green_sword: { name: '青锋剑', kind: 'weapon', attack: 7, description: '普攻与伤害功法威力 +7。' },
  vine_staff: { name: '青藤杖', kind: 'weapon', attack: 5, description: '普攻与伤害功法威力 +5。' },
  flame_sword: { name: '赤炎剑', kind: 'weapon', attack: 11, description: '普攻与伤害功法威力 +11。' },
  thunder_blade: { name: '雷纹刃', kind: 'weapon', attack: 15, description: '普攻与伤害功法威力 +15。' },
  wind_manual: { name: '疾风剑诀·残卷', kind: 'manual', skill: 'wind_blade', description: '研习后永久掌握疾风剑诀。' },
  spring_manual: { name: '回春术·玉简', kind: 'manual', skill: 'spring_art', description: '研习后永久掌握回春术。' },
  fire_manual: { name: '离火诀·卷轴', kind: 'manual', skill: 'fire_art', description: '研习后永久掌握离火诀。' },
  thunder_manual: { name: '惊雷诀·真解', kind: 'manual', skill: 'thunder_art', description: '研习后永久掌握惊雷诀。' },
  healing_pill: { name: '回春丹', kind: 'pill', heal: 35, description: '恢复 35 气血。战斗内使用占用一回合。' },
  spirit_pill: { name: '聚气丹', kind: 'pill', mana: 22, description: '斗法中恢复 22 真气，占用一回合。' },
  binding_array: { name: '缚灵阵盘', kind: 'array', power: 18, description: '基础威力 18，并打断敌人本回合行动。一次性。' },
  thunder_array: { name: '雷火阵盘', kind: 'array', power: 40, description: '基础威力 40，无视防御。一次性。' }
};

export const WANDERERS = [
  { id: 'luohu', name: '罗槐', role: '落魄剑修', realm: '炼气六层', spot: [7, 2], color: '#aabb8b', hp: 66, attack: 11, defense: 1, escape: 0.7,
    bio: '守着入林的小径磨剑，腰间的储物袋露出一角剑谱。他会根据交锋形势选择攻守。', quote: '想带走我的剑谱？先接住我的剑。',
    loot: { stones: 28, herbs: 1, items: { green_sword: 1, wind_manual: 1, healing_pill: 2 } } },
  { id: 'suqin', name: '苏芩', role: '采药散修', realm: '炼气八层', spot: [12, -7], color: '#8dbb9e', hp: 84, attack: 14, defense: 2, escape: 0.6,
    bio: '药篓里藏着青藤杖与回春玉简。懂得回春法术，珍视自己的药篓。', quote: '黑风林的灵草各凭本事。道友若执意争夺，便请出招。',
    loot: { stones: 35, herbs: 3, items: { vine_staff: 1, spring_manual: 1, healing_pill: 2, binding_array: 1 } } },
  { id: 'peijin', name: '裴烬', role: '游火丹修', realm: '炼气九层', spot: [21, -2], color: '#d69776', hp: 106, attack: 17, defense: 2, escape: 0.5,
    bio: '赤炎剑与丹瓶悬在腰侧。离火蓄势凶猛，先守后攻或用阵盘打断更稳妥。', quote: '我的离火可不认人。真要斗法，就别后悔。',
    loot: { stones: 48, herbs: 2, items: { flame_sword: 1, fire_manual: 1, healing_pill: 2, spirit_pill: 2, thunder_array: 1 } } },
  { id: 'mochi', name: '墨迟', role: '阵道散修', realm: '炼气圆满', spot: [20, 7], color: '#aea0cc', hp: 132, attack: 20, defense: 4, escape: 0.4,
    bio: '雷纹刃映着阵盘的微光。会权衡护体、蓄势与疗伤。建议备齐丹药再挑战。', quote: '走进这片阵纹之前，先想好退路。',
    loot: { stones: 70, herbs: 2, items: { thunder_blade: 1, thunder_manual: 1, spirit_pill: 2, binding_array: 2, thunder_array: 2 } } }
];

export const ITEM_KINDS = { weapon: '武器', manual: '功法', pill: '灵丹', array: '阵法' };
export function lootEntries(loot) {
  return [
    { name: '灵石', quantity: loot.stones, kind: '灵石' },
    { name: '灵草', quantity: loot.herbs, kind: '灵草' },
    ...Object.entries(loot.items).map(([id, quantity]) => ({ id, ...ITEMS[id], kind: ITEM_KINDS[ITEMS[id].kind], quantity }))
  ];
}

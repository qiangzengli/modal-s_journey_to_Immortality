// Original-novel names; legacy IDs intentionally stay stable for existing saves.
// Sources and the boundary between canon and sandbox mechanics: docs/SECT_CANON.md.
export const ALIGNMENTS = {
  righteous: { name: '正道', color: '#9acbbd', description: '此处指越国七派一侧，并非天南正道盟。阵营不替人物决定善恶。' },
  demonic: { name: '魔道', color: '#d9a0ad', description: '天南魔道六宗一侧；人物仍按自身利益与经历作出决定。' },
  unaffiliated: { name: '无阵营', color: '#c4bea2', description: '不受门规约束，凭自身经历与各方往来。' }
};

export const SECTS = {
  qinglan: { name: '黄枫谷', alignment: 'righteous', faction: '越国七派', representative: 'gu', specialty: '太岳山脉 · 越国七派', doctrine: '越国七大修仙门派之一，山门位于建州太岳山脉。韩立凭升仙令拜入此谷，曾照料百药园。', approach: '钟灵道为黄枫谷掌门。可与他交谈并递交拜帖。', hall: '黄枫谷大殿', lodge: '百药园' },
  lingshu: { name: '掩月宗', alignment: 'righteous', faction: '越国七派', representative: 'liu', specialty: '越国 · 七派之首', doctrine: '越国七大修仙门派之首，南宫婉、穹老怪所属宗门。当前呈现其越国时期，未使用后来迁往北凉国的山门。', approach: '宣乐是掩月宗对外管事之一。可与他交谈，了解宗门并表达入门意愿。', hall: '掩月宗大殿', lodge: '掩月宗客舍' },
  jinhuo: { name: '魔焰门', alignment: 'demonic', faction: '魔道六宗', representative: 'yan', specialty: '天罗国 · 魔道六宗', doctrine: '天南魔道六宗之一，原著中参与魔道入侵，后来势力扩展至元武国。怜飞花为门主独女。', approach: '可与怜飞花接洽。她如何回应取决于对话与本局经历，不能仅凭同属魔道获得信任。', hall: '魔焰门大殿', lodge: '魔焰门客舍' },
  xuanming: { name: '鬼灵门', alignment: 'demonic', faction: '魔道六宗', representative: 'wen', specialty: '天罗国 · 驱鬼役妖', doctrine: '天南魔道六宗之一，擅长驱鬼役妖之术。王蝉是鬼灵门少主，与燕家及血灵大法有关。', approach: '可与王蝉接洽。他会权衡自身与宗门利益；对话不会预先触发原著的后续战事。', hall: '鬼灵门大殿', lodge: '鬼灵门客舍' }
};

// Only documented novel affiliations are assigned. Existing sandbox NPCs remain unaffiliated.
export const NPC_SECTS = {
  trial_swordsman:['jujianmen','试炼弟子'],
  gu: ['qinglan', '掌门'], liu: ['lingshu', '对外管事'],
  yan: ['jinhuo', '门主之女'], wen: ['xuanming', '少主']
};

const CANON_AFFILIATIONS={
  gu:['qinglan','结丹修士'],liu:['lingshu','结丹修士'],yan:['jinhuo','门人'],wen:['xuanming','少主'],
  bai:['qinglan','百药园管事'],xu:['qinglan','弟子'],lu:['qinglan','执事'],wei:['qinglan','李化元弟子'],qing:['qinglan','李化元弟子'],
  yue:['qinglan','弟子'],song:['qinglan','弟子'],yuan:['qinglan','结丹修士'],ji:['lingshu','修士'],shouque:['lingshu','弟子'],duheng:['qinglan','弟子'],
  tao:['lingshoushan','弟子'],qiao:['lingshoushan','弟子'],han:['tianquebao','弟子'],chisong:['tianquebao','弟子']
};
export const OTHER_SECTS={lingshoushan:'灵兽山',tianquebao:'天阙堡',jujianmen:'巨剑门',huadaowu:'化刀坞',qingxumen:'清虚门'};

for(const [id,affiliation]of Object.entries(CANON_AFFILIATIONS))if(!['gu','liu'].includes(id))NPC_SECTS[id]=affiliation;
NPC_SECTS.lihuayuan=['qinglan','结丹修士'];

// Goals/temperaments below guide sandbox Agent interaction, not quotations or scripted outcomes.
export const SECT_PEOPLE = [
  { id:'gu',name:'钟灵道',role:'黄枫谷掌门',place:'qinglan',spot:[214,-4],stones:120,goal:'处理黄枫谷门务，审慎接待求道的修士',publicGoal:'处理宗门事务',links:[],color:'#c8b66f',realm:'筑基期',bio:'黄枫谷掌门，原著中曾接待持升仙令入谷的韩立。',temperament:'以宗门事务和可核实的来历为重，审慎判断来客' },
  { id:'liu',name:'宣乐',role:'掩月宗对外管事',place:'lingshu',spot:[274,-4],stones:140,goal:'处理掩月宗对外事务，权衡来客的价值与风险',publicGoal:'接洽宗门外务',links:[],color:'#b6c5dd',realm:'筑基期',bio:'掩月宗对外管事，原著中参与灵矿驻地的相关事件。',temperament:'谨慎权衡利益，重视自身处境与宗门立场' },
  { id:'yan',name:'怜飞花',role:'魔焰门门主之女',place:'jinhuo',spot:[334,-4],stones:160,goal:'维护魔焰门利益，判断来客是否值得合作',publicGoal:'观察来客的意图',links:[],color:'#dca27d',realm:'筑基期',bio:'魔焰门门主独女，原著中曾率人进攻七派的灵矿驻地。',temperament:'自信而有戒心，重视实力与宗门利益' },
  { id:'wen',name:'王蝉',role:'鬼灵门少主',place:'xuanming',spot:[394,-4],stones:130,goal:'维护鬼灵门与自身利益，甄别接近山门之人的目的',publicGoal:'权衡来客与宗门利益',links:[],color:'#bba6d8',realm:'筑基期',bio:'鬼灵门少主，原著中修习血灵大法，与燕家有重要关联。',temperament:'重利、警惕，善于试探，不轻易信任来客' }
];

export const SECT_SITES = Object.fromEntries([
  ['qinglan','太岳山脉 · 黄枫谷',[216,7],'黄枫谷位于越国建州太岳山脉。可了解宗门，再与钟灵道交谈。'],
  ['lingshu','掩月宗山门',[276,7],'越国七派之首。宣乐在此接洽来客，当前尚未演进到迁宗北凉国的时期。'],
  ['jinhuo','魔焰门山门',[336,7],'天南魔道六宗之一。可与怜飞花接洽，陈述自己的来意。'],
  ['xuanming','鬼灵门山门',[396,7],'天南魔道六宗之一。王蝉在此接洽来客。']
].map(([sect,name,spot,detail])=>['sect_'+sect,{name,spot,detail,sect,place:sect,role:SECTS[sect].name+' · 山门',seal:'门',actions:sect==='qinglan'?['huangfeng_register','forbidden_enlist','deliver_spirit_herbs','take_master']:[]} ]));

export const ALIGNMENTS = {
  righteous: { name: '正道', color: '#9acbbd', description: '重名分、门规与公开秩序，但各人仍有自己的欲望与取舍。' },
  demonic: { name: '魔道', color: '#d9a0ad', description: '重自主、力量与契约，不代表所有门人都嗜杀或背信。' },
  unaffiliated: { name: '无阵营', color: '#c4bea2', description: '不受门规约束，凭自身经历与各方往来。' }
};

export const SECTS = {
  qinglan: { name: '青岚剑宗', alignment: 'righteous', representative: 'gu', specialty: '剑修 · 护商 · 立誓', doctrine: '以剑护道，凭证据定是非。重承诺，也要面对宗门名声与个人公道的冲突。', approach: '看重守信与实证，愿听散修陈述；不会仅因对方出身魔道便定罪。' },
  lingshu: { name: '灵枢谷', alignment: 'righteous', representative: 'liu', specialty: '丹医 · 灵植 · 济世', doctrine: '草木与生灵皆有其命。精研丹医，反对以无辜者性命换取突破。', approach: '看重救治与灵草用途，愿与魔道医修合作；先判断行为，再判断门第。' },
  jinhuo: { name: '烬火门', alignment: 'demonic', representative: 'yan', specialty: '离火 · 炼器 · 护矿', doctrine: '以火炼身，以契立足。追求力量与资源，要求门人承担自己许诺的代价。', approach: '看重担当与交换，认可救亲护友；与正道有利益分歧，也能谈成合作。' },
  xuanming: { name: '玄冥阁', alignment: 'demonic', representative: 'wen', specialty: '阵术 · 情报 · 隐行', doctrine: '藏锋于影，明价守契。善用阵法、消息与隐秘盟约，容许野心，不容许假账。', approach: '看重谋略与消息可信度，交易有价；不会仅因同属魔道就无条件信任。' }
};

// Public background identities. Independent cultivators remain genuinely unaffiliated.
export const NPC_SECTS = {
  gu: ['qinglan', '接引长老'], liu: ['lingshu', '接引医修'], yan: ['jinhuo', '接引长老'], wen: ['xuanming', '接引使'],
  lu: ['qinglan', '外务执事'], wei: ['qinglan', '护商弟子'], duheng: ['qinglan', '游历剑修'], shouque: ['qinglan', '试剑客卿'],
  bai: ['lingshu', '丹师'], tao: ['lingshu', '接引医修'], suqin: ['lingshu', '采药弟子'],
  shen: ['jinhuo', '外行丹师'], qiao: ['jinhuo', '护矿执事'], chisong: ['jinhuo', '护契客卿'], peijin: ['jinhuo', '离火弟子'],
  qing: ['xuanming', '行商执事'], han: ['xuanming', '外行门人'], mochi: ['xuanming', '阵师']
};

export const SECT_PEOPLE = [
  { id:'gu',name:'顾长青',role:'青岚接引长老',place:'qinglan',spot:[214,-4],stones:120,goal:'寻找守信而有独立判断的门人，维护山门秩序',publicGoal:'接引问道之人',links:['lu','wei'],color:'#91c4bf',realm:'筑基中期',bio:'剑碑前的长老不问出身，先问来者愿为何事拔剑。',temperament:'克制、重证据与承诺，能容纳异议' },
  { id:'liu',name:'柳闻溪',role:'灵枢接引医修',place:'lingshu',spot:[274,-4],stones:140,goal:'将灵植丹医传给尊重生命之人，守住谷中药泉',publicGoal:'照看药泉与来客',links:['tao','bai'],color:'#b4d39b',realm:'筑基初期',bio:'她在药泉旁接待来客，愿意听他们如何看待救人与修行。',temperament:'温和但有原则，反对为求突破牺牲无辜' },
  { id:'yan',name:'晏赤霄',role:'烬火接引长老',place:'jinhuo',spot:[334,-4],stones:160,goal:'招揽敢承担代价的修士，守住地火与门人契约',publicGoal:'守护地火山门',links:['qiao','shen'],color:'#dca27d',realm:'筑基中期',bio:'地火照着旧铠。他不忌野心，却鄙薄推卸代价的人。',temperament:'直率、重担当与契约，不因道统不同拒绝合作' },
  { id:'wen',name:'闻夜',role:'玄冥接引使',place:'xuanming',spot:[394,-4],stones:130,goal:'寻找善于核验消息的同行，让隐阁之约保持可信',publicGoal:'甄别来客与消息',links:['qing','mochi'],color:'#bba6d8',realm:'筑基初期',bio:'雾桥尽头的人将传音符一一封存。他相信秘密，也要求可追溯的代价。',temperament:'谨慎、善试探，重谋略但厌恶失信' }
];

export const SECT_SITES = Object.fromEntries([
  ['qinglan','问剑台',[216,7],'剑碑列于云阶旁，远处是青岚正殿。可在此了解门规，再找顾长青递交拜帖。'],
  ['lingshu','丹医堂',[276,7],'药泉绕堂而过，灵植沿泉生长。柳闻溪在堂前接引愿研丹医之人。'],
  ['jinhuo','炉心殿',[336,7],'玄铁炉与地火脉相连。晏赤霄守在殿前，门规重契与担当。'],
  ['xuanming','明契阁',[396,7],'月色照着阵柱与隐阁，闻夜在雾桥前接待求道的来客。']
].map(([sect,name,spot,detail])=>['sect_'+sect,{name,spot,detail,sect,place:sect,role:SECTS[sect].name+' · 山门',seal:'门',actions:[]} ]));

import { CANON_IDENTITIES } from './canon.js';
import { VOLUME_ACTIONS, VOLUME_PEOPLE, VOLUME_SITES } from './volume-data.js';
import { SECT_PEOPLE, SECT_SITES } from './sect-data.js';
import { FRONTIER_ACTIONS, FRONTIER_PEOPLE, FRONTIER_SITES } from './campaign-data.js';
export const ACTION_DEFS = [
  ...VOLUME_ACTIONS, ...FRONTIER_ACTIONS,
  { type: 'discover_bottle', title: '寻得小绿瓶', detail: '认主古瓶并安置一株幼苗，每旬自动凝液催生', cost: '奇遇 · 每局一次', place: 'woods', site: 'herbs', garden: true },
  { type: 'plant_herb', title: '栽种一株灵草', detail: '种入空畦，自然生长 4 旬，灵液可加速', cost: '灵草 1', place: 'woods', site: 'herbs', garden: true },
  { type: 'water_herb', title: '灵液催熟', detail: '为长势最好的一畦增加 1 点生长', cost: '灵液 1 滴', place: 'woods', site: 'herbs', garden: true },
  { type: 'harvest_garden', title: '收取灵圃灵草', detail: '将全部待取产物收入行囊', cost: '无资源消耗', place: 'woods', site: 'herbs', garden: true },
  { type: 'buy_spirit_soil', title: '炼制息壤盆', detail: '增至两畦，每畦产量由 3 株提高到 4 株', cost: '120 灵石 · 一次投入', place: 'woods', site: 'herbs', garden: true },
  { type: 'enable_auto_water', title: '开启自动浇灌', detail: '每旬凝液后自动使用最多一滴', cost: '不消耗资源', place: 'woods', site: 'herbs', garden: true },
  { type: 'disable_auto_water', title: '暂停自动浇灌', detail: '自然生长继续，留存灵液用于手动催熟', cost: '不消耗资源', place: 'woods', site: 'herbs', garden: true },
  { type: 'enable_auto_plant', title: '开启留种续种', detail: '成熟时每畦留一株再种，其余产物待取', cost: '每次留种 1 株', place: 'woods', site: 'herbs', garden: true },
  { type: 'disable_auto_plant', title: '暂停留种续种', detail: '下次成熟时全部产物待取，灵畦留空', cost: '不消耗资源', place: 'woods', site: 'herbs', garden: true },
  { type: 'inspect_pill', title: '请马师兄验丹', detail: '拿到可核对的真丹鉴定', cost: '10 灵石', place: 'market', person: 'bai' },
  { type: 'investigate_route', title: '查禁运货道', detail: '取得车号与时间证词', cost: '无资源消耗', place: 'market', person: 'ning' },
  { type: 'partner', title: '商议合资', detail: '凭真丹鉴定借入 100 灵石，承诺返还 120', cost: '形成欠款', place: 'market', person: 'xu' },
  { type: 'sell_herbs', title: '出售一株灵草', detail: '马师兄收购，用于炼制续命药', cost: '灵草 1 → 灵石 80', place: 'market', person: 'bai' },
  { type: 'buy_pill', title: '买下筑基丹', detail: '按当前售价购入', cost: '按现价付款', place: 'market', person: 'shen' },
  { type: 'report', title: '递交货道证词', detail: '提供线索，由执事自行决定何时查验', cost: '需货道证词', place: 'market', person: 'lu' },
  { type: 'buy_seal', title: '买空白鉴定印', detail: '可用于制作假鉴定，来源会留下记录', cost: '25 灵石', place: 'market', person: 'qing' },
  { type: 'forge_poison', title: '散布有毒鉴定', detail: '交萧翠儿传播，可能被追查', cost: '空白印 1', place: 'market', person: 'ning' },
  { type: 'lure', title: '约许掌柜出城', detail: '提出林中会面，许掌柜会自行权衡是否赴约', cost: '无资源消耗', place: 'market', person: 'shen' },
  { type: 'travel_woods', title: '前往太岳山脉', detail: '传送进入太岳山脉', cost: '无资源消耗', place: 'market', site: 'gate' },
  { type: 'travel_market', title: '返回黄枫谷坊市', detail: '传送回到黄枫谷坊市', cost: '无资源消耗', place: 'woods', site: 'gate' },
  { type: 'gather_herbs', title: '采集灵草', detail: '林道共可采两株；带回坊市出售', cost: '无资源消耗', place: 'woods', site: 'herbs' },
  { type: 'prepare_trap', title: '布下天雷符', detail: '阵法能迫退护卫，为夺丹创造机会', cost: '天雷符 1', place: 'woods', site: 'formation' },
  { type: 'ambush', title: '拦截夺丹', detail: '无阵会失败并失去 35 气血；有阵损失 20 气血、15 声望', cost: '会被目击追查', place: 'woods', site: 'formation' },
  { type: 'honor_partner', title: '结清合资承诺', detail: '偿还吴风，增加信任', cost: '偿还欠款', place: 'market', person: 'xu' },
  { type: 'buy_talisman', title: '购入天雷符', detail: '补充一张用于布阵的符箓', cost: '35 灵石', place: 'market', person: 'qing' },
  { type: 'rest', title: '调息疗伤', detail: '在听雨亭恢复 30 气血', cost: '10 灵石', place: 'woods', site: 'camp' },
  { type: 'breakthrough', title: '服丹筑基', detail: '气血至少 60 时服用筑基丹；因果与欠款继续保留', cost: '消耗筑基丹', place: 'woods', site: 'camp' }
];

export const PERSON_ACTIONS = {
  shen: ['ask', 'buy_pill', 'lure'], bai: ['ask', 'inspect_pill', 'sell_herbs'],
  xu: ['ask', 'partner', 'honor_partner'], lu: ['ask', 'report', 'buy_pill'],
  qing: ['ask', 'buy_seal', 'buy_talisman'], wei: ['ask'], han: ['ask', 'ambush'],
  ning: ['ask', 'investigate_route', 'forge_poison']
};

export const SITES = {
  herbs: { name: '灵草坡', role: '太岳山脉 · 采集与灵圃', detail: '太岳山间的灵草可以采集；带来的小绿瓶也能继续催生自己栽种的药草。', actions: ['gather_herbs'] },
  formation: { name: '天雷阵位', role: '太岳山脉 · 设伏', detail: '古阵仍能聚气。护商修士会对贸然进攻作出反击。', actions: ['prepare_trap', 'ambush'] },
  camp: { name: '听雨亭', role: '太岳山脉 · 调息', detail: '山林间的一处静地。调息疗伤，或服下筑基丹冲破瓶颈。', actions: ['rest', 'breakthrough'] }
};

export const PERSON_DETAILS = {
  shen: { color: '#b48b53', realm: '炼气九层', bio: '衣袍有些旧，却把丹盒擦得一尘不染。说话时总在留意来往的买家。' },
  bai: { color: '#81b59c', realm: '炼气八层', bio: '袖口沾着药草的青汁，案上丹谱翻到了旧页。她只认可亲手核验的药纹。' },
  xu: { color: '#8babce', realm: '炼气十三层', bio: '剑鞘已磨出缺口，手边的药瓶空了很久。他看向丹盒的目光从未移开太久。' },
  lu: { color: '#cc8c74', realm: '筑基初期', bio: '赤袍佩令，腰间挂着巡坊玉牌。定夺之前，他总要把证词核对两遍。' },
  qing: { color: '#b09bc9', realm: '炼气七层', bio: '宽檐帽遮去半张脸，指尖的算盘从不闲着。人情、印信与借贷都有价钱。' },
  wei: { color: '#99b3a4', realm: '炼气十三层', bio: '剑不离身，始终站在雇主退路一侧。看似沉默，却一直注视周围人的手。' },
  han: { color: '#c9937e', realm: '炼气九层', bio: '黑衣融入树影。林道上的车辙和脚印，比传闻更能引起他的兴趣。' },
  ning: { color: '#d6c39b', realm: '炼气六层', bio: '一筒传音符系在腰间。她游走于坊市各处，靠消息的可信度维持生意。' }
};

for(const [id,p]of Object.entries(CANON_IDENTITIES))Object.assign(PERSON_DETAILS[id],{realm:p.realm,bio:p.bio});
for(const person of [...FRONTIER_PEOPLE, ...SECT_PEOPLE, ...VOLUME_PEOPLE]){PERSON_DETAILS[person.id]={color:person.color,realm:person.realm,bio:person.bio};PERSON_ACTIONS[person.id]=['ask'];}
Object.assign(SITES,FRONTIER_SITES,SECT_SITES,VOLUME_SITES);
for(const a of VOLUME_ACTIONS)if(a.person)PERSON_ACTIONS[a.person].push(a.type);
for(const site of Object.values(SITES))site.place ??= 'woods';

export const REGIONS = {
  qinglan: { name:'青岚山门',short:'青岚',bounds:[192,238,-19,19],entry:[204,0],color:'#567b70',description:'云阶剑碑与青瓦大殿。顾长青在问剑台接引来客。',risk:'正道 · 青岚剑宗',requiredTier:0 },
  lingshu: { name:'灵枢山门',short:'灵枢',bounds:[252,298,-19,19],entry:[264,0],color:'#5e8662',description:'药泉灵雾浓郁，须筑基后才能稳住灵息。柳闻溪在药庐前候客。',risk:'正道 · 灵枢谷',requiredTier:1 },
  jinhuo: { name:'烬火山门',short:'烬火',bounds:[312,358,-19,19],entry:[324,0],color:'#815746',description:'玄石山门立于地火之上，筑基修士方能抵御火息。晏赤霄守着丹炉。',risk:'魔道 · 烬火门',requiredTier:1 },
  xuanming: { name:'玄冥山门',short:'玄冥',bounds:[372,418,-19,19],entry:[384,0],color:'#5f577a',description:'月桥、阵柱与雾中藏书阁。闻夜在桥头甄别来客。',risk:'魔道 · 玄冥阁',requiredTier:0 },
  market: { name: '地下坊市', short: '坊市', bounds: [-27.3, -1.5, -11.1, 11.1], entry: [-17, 0], color: '#566052', description: '一枚筑基丹，让救命、寿元与利益交织。', risk: '安全交易' },
  woods: { name: '黑风林', short: '黑风林', bounds: [1.5, 27.3, -11.1, 11.1], entry: [5, 0], color: '#3b5141', description: '散修、古瓶与禁运车辙。传送阵可直抵各地。', risk: '炼气六层至圆满' },
  river: { name: '云渡河谷', short: '云渡', bounds: [32, 78, -19, 19], entry: [36, 0], color: '#42696b', description: '渡船搁浅，药田枯萎。断流的河水里带着赤色矿屑。', risk: '炼气八层' },
  quarry: { name: '赤砂矿场', short: '赤砂', bounds: [82, 128, -19, 19], entry: [86, 0], color: '#80644f', description: '矿机仍在运转，工棚里传来咳嗽。谁在抽走地底的生机？', risk: '炼气圆满' },
  ruins: { name: '归墟遗府', short: '归墟', bounds: [132, 178, -19, 19], entry: [136, 0], color: '#525d75', description: '一座替人保存灵气的古府，也可能是一座囚笼。', risk: '筑基守关者 · 可避战' }
};
const ATLAS = {qinglan:[18,15],lingshu:[51,10],jinhuo:[83,17],market:[19,48],river:[51,45],quarry:[83,47],woods:[19,80],xuanming:[51,82],ruins:[83,80]};
for (const [id, region] of Object.entries(REGIONS)) { region.mapPosition = ATLAS[id]; region.requiredTier ??= 0; }
export const REGION_IDS = Object.keys(REGIONS);
export const regionName = id => REGIONS[id]?.name || id;
export function regionAt(x) { return REGION_IDS.find(id => x >= REGIONS[id].bounds[0] && x <= REGIONS[id].bounds[1]) || REGION_IDS.reduce((best,id)=>Math.abs(REGIONS[id].entry[0]-x)<Math.abs(REGIONS[best].entry[0]-x)?id:best,'market'); }
// Regions are separate destinations; transport never visits intermediate regions.
export function regionPath(from, to) {
  if (!Object.hasOwn(REGIONS, from) || !Object.hasOwn(REGIONS, to)) return null;
  return from === to ? [] : [to];
}
export function travelAccess(game, to) {
  if (!Object.hasOwn(REGIONS, to || '')) return { available: false, reason: '请选择已知的传送目的地。' };
  const requiredRealm = REGIONS[to].requiredTier ? '筑基初期' : '炼气九层';
  const available = !REGIONS[to].requiredTier || Boolean(game.flags?.playerBreakthrough);
  return { available, requiredRealm, reason: available ? '' : `需达到${requiredRealm}，才能承受${REGIONS[to].name}的灵压。` };
}
export function regionEntry(to) { return REGIONS[to].entry; }

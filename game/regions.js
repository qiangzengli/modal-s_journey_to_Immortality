import { VOLUME_REGIONS } from './volume-data.js';
export const REGIONS = {
  ...VOLUME_REGIONS,
  qinglan: { name:'太岳山脉 · 黄枫谷',short:'黄枫谷',bounds:[192,238,-19,19],entry:[204,0],color:'#85784f',description:'越国建州太岳山脉，黄枫谷山门所在。钟灵道在此处理门务。',risk:'正道 · 黄枫谷',requiredTier:0 },
  lingshu: { name:'掩月宗山门',short:'掩月宗',bounds:[252,298,-19,19],entry:[264,0],color:'#657e93',description:'越国七派之首。可与对外管事宣乐接洽。',risk:'正道 · 掩月宗',requiredTier:1 },
  jinhuo: { name:'魔焰门山门',short:'魔焰门',bounds:[312,358,-19,19],entry:[324,0],color:'#815746',description:'天罗国魔道六宗之一，怜飞花在此接洽来客。',risk:'魔道 · 魔焰门',requiredTier:1 },
  xuanming: { name:'鬼灵门山门',short:'鬼灵门',bounds:[372,418,-19,19],entry:[384,0],color:'#5f577a',description:'天罗国魔道六宗之一。少主王蝉重视来客的实力与意图。',risk:'魔道 · 鬼灵门',requiredTier:0 },
  market: { name: '地下坊市', short: '坊市', bounds: [-27.3, -1.5, -11.1, 11.1], entry: [-17, 0], color: '#566052', description: '一枚筑基丹，让救命、寿元与利益交织。', risk: '安全交易' },
  woods: { name: '黑风林', short: '黑风林', bounds: [1.5, 27.3, -11.1, 11.1], entry: [5, 0], color: '#3b5141', description: '散修、古瓶与禁运车辙。传送阵可直抵各地。', risk: '炼气六层至圆满' },
  river: { name: '云渡河谷', short: '云渡', bounds: [32, 78, -19, 19], entry: [36, 0], color: '#42696b', description: '渡船搁浅，药田枯萎。断流的河水里带着赤色矿屑。', risk: '炼气八层' },
  quarry: { name: '赤砂矿场', short: '赤砂', bounds: [82, 128, -19, 19], entry: [86, 0], color: '#80644f', description: '矿机仍在运转，工棚里传来咳嗽。谁在抽走地底的生机？', risk: '炼气圆满' },
  ruins: { name: '归墟遗府', short: '归墟', bounds: [132, 178, -19, 19], entry: [136, 0], color: '#525d75', description: '一座替人保存灵气的古府，也可能是一座囚笼。', risk: '筑基守关者 · 可避战' }
};
const ATLAS = {qinglan:[18,15],lingshu:[51,10],jinhuo:[83,17],market:[19,48],river:[51,45],quarry:[83,47],woods:[19,80],xuanming:[51,82],ruins:[83,80]};
for (const [id, region] of Object.entries(REGIONS)) { region.mapPosition ??= ATLAS[id]; region.requiredTier ??= 0; }
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
  if (game.volume && !game.volume.flags.enter_xianmen) {
    const required = {qixuan:null,shenshou:'qixuan_exam',jiayuan:'defend_qixuan',tainan:'cure_cold_poison'};
    const available = Object.hasOwn(required,to) && (!required[to] || Boolean(game.volume.flags[required[to]]));
    return {available, requiredRealm:'剧情开放', reason:available?'':'请先推进第一卷主线，完成对应经历后开放此地。'};
  }
  const requiredRealm = REGIONS[to].requiredTier ? '筑基初期' : '炼气九层';
  const available = !REGIONS[to].requiredTier || Boolean(game.flags?.playerBreakthrough);
  return { available, requiredRealm, reason: available ? '' : `需达到${requiredRealm}，才能承受${REGIONS[to].name}的灵压。` };
}
export function regionEntry(to) { return REGIONS[to].entry; }

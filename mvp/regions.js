export const REGIONS = {
  market: { name: '地下坊市', short: '坊市', bounds: [-27.3, -1.5, -11.1, 11.1], entry: [-17, 0], color: '#566052', description: '一枚筑基丹，让救命、寿元与利益交织。', risk: '安全交易', neighbors: ['woods'] },
  woods: { name: '黑风林', short: '黑风林', bounds: [1.5, 27.3, -11.1, 11.1], entry: [5, 0], color: '#3b5141', description: '散修、古瓶与禁运车辙。东侧山道通向云渡河。', risk: '炼气六层至圆满', neighbors: ['market', 'river'] },
  river: { name: '云渡河谷', short: '云渡', bounds: [32, 78, -19, 19], entry: [36, 0], color: '#42696b', description: '渡船搁浅，药田枯萎。断流的河水里带着赤色矿屑。', risk: '炼气八层', neighbors: ['woods', 'quarry'] },
  quarry: { name: '赤砂矿场', short: '赤砂', bounds: [82, 128, -19, 19], entry: [86, 0], color: '#80644f', description: '矿机仍在运转，工棚里传来咳嗽。谁在抽走地底的生机？', risk: '炼气圆满', neighbors: ['river', 'ruins'] },
  ruins: { name: '归墟遗府', short: '归墟', bounds: [132, 178, -19, 19], entry: [136, 0], color: '#525d75', description: '一座替人保存灵气的古府，也可能是一座囚笼。', risk: '筑基守关者 · 可避战', neighbors: ['quarry'] }
};
export const REGION_IDS = Object.keys(REGIONS);
export const regionName = id => REGIONS[id]?.name || id;
export function regionAt(x) { return REGION_IDS.find(id => x >= REGIONS[id].bounds[0] && x <= REGIONS[id].bounds[1]) || REGION_IDS.reduce((best,id)=>Math.abs(REGIONS[id].entry[0]-x)<Math.abs(REGIONS[best].entry[0]-x)?id:best,'market'); }
export function regionPath(from, to) {
  if (!REGIONS[from] || !REGIONS[to]) return null;
  const queue = [[from]], seen = new Set();
  while (queue.length) { const path=queue.shift(), last=path.at(-1); if(last===to)return path.slice(1); if(seen.has(last))continue; seen.add(last); for(const id of REGIONS[last].neighbors)queue.push([...path,id]); }
  return null;
}
export function regionExit(from, to) {
  if (!REGIONS[from]?.neighbors.includes(to)) return null;
  const right=REGIONS[to].entry[0]>REGIONS[from].entry[0];
  return { x: REGIONS[from].bounds[right?1:0] + (right?-.7:.7), z: 0 };
}
export function regionEntry(to, from) {
  const exit=regionExit(to,from);
  return exit ? [exit.x,exit.z] : REGIONS[to].entry;
}

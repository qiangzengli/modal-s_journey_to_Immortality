import { VOLUME_REGIONS } from './volume-data.js';
export const REGIONS = {
  ...VOLUME_REGIONS,
  qinglan:{name:'黄枫谷山门',short:'黄枫谷',bounds:[192,238,-19,19],entry:[204,0],color:'#567b70',description:'太岳山脉中的越国七派之一，钟灵道处理门务，叶师叔办理门籍，李化元接见弟子。',risk:'越国七派'},
  lingshu:{name:'掩月宗山门',short:'掩月宗',bounds:[252,298,-19,19],entry:[264,0],color:'#5e8662',description:'越国七派中的强宗，宣乐在此接洽来客。',risk:'越国七派',requiredTier:1},
  jinhuo:{name:'魔焰门山门',short:'魔焰门',bounds:[312,358,-19,19],entry:[324,0],color:'#815746',description:'天罗国魔道六宗之一，地火映照山门。',risk:'魔道六宗',requiredTier:1},
  xuanming:{name:'鬼灵门山门',short:'鬼灵门',bounds:[372,418,-19,19],entry:[384,0],color:'#5f577a',description:'鬼灵门少主王蝉在此接待来访修士。',risk:'魔道六宗',requiredTier:1},
  market:{name:'黄枫谷坊市',short:'坊市',bounds:[-27.3,-1.5,-11.1,11.1],entry:[-17,0],color:'#566052',description:'万宝楼与药铺之间，筑基丹的交易牵动修士各自的打算。',risk:'交易与问计'},
  woods:{name:'太岳山脉',short:'太岳山',bounds:[1.5,27.3,-11.1,11.1],entry:[5,0],color:'#3b5141',description:'黄枫谷所在山脉，可采药、调息、切磋与闭关筑基。',risk:'炼气修士游历'},
  river:{name:'百药园',short:'百药园',bounds:[32,78,-19,19],entry:[36,0],color:'#42696b',description:'马师兄看管的药园，韩立在此接下差事，以灵药辅助长春功修炼。',risk:'黄枫谷修行'},
  quarry:{name:'血色禁地·外层',short:'禁地外层',bounds:[82,128,-19,19],entry:[86,0],color:'#80644f',description:'七派炼气弟子的采药试炼之地，紫猴花与玉髓芝藏在妖兽出没的密林里。',risk:'采药与争夺'},
  ruins:{name:'血色禁地·中心区',short:'禁地中心',bounds:[132,178,-19,19],entry:[136,0],color:'#525d75',description:'中心区石殿内藏天灵果，也潜伏着墨蛟。南宫婉在此探查禁地。',risk:'墨蛟 · 剧情交锋'}
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
  const storyGate={river:'huangfeng_register',quarry:'forbidden_enlist',ruins:'enter_forbidden'}[to];
  if(storyGate&&!game.campaign?.storyFlags?.[storyGate])return {available:false,requiredRealm:'主线开放',reason:'请先推进黄枫谷主线，完成入门或禁地报名。'};
  const requiredRealm = REGIONS[to].requiredTier ? '筑基初期' : '炼气九层';
  const available = !REGIONS[to].requiredTier || Boolean(game.flags?.playerBreakthrough);
  return { available, requiredRealm, reason: available ? '' : `需达到${requiredRealm}，才能承受${REGIONS[to].name}的灵压。` };
}
export function regionEntry(to) { return REGIONS[to].entry; }

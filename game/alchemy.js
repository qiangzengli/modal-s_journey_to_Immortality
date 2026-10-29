import { GameError } from './errors.js';

export const PILL_HERBS = ['紫猴花', '玉髓芝', '天灵果'];
export const PILL_GROWTH = 4;

export function ensureAlchemy(game) {
  game.campaign.alchemy ??= { planted: false, growth: 0, harvested: false, crafted: 0 };
  return game.campaign.alchemy;
}

export function advanceAlchemy(game) {
  const bed = game.campaign?.alchemy;
  if (!bed?.planted || bed.harvested || bed.growth >= PILL_GROWTH) return false;
  bed.growth++;
  if (game.garden.autoWater && game.garden.drops && bed.growth < PILL_GROWTH) {
    game.garden.drops--;
    bed.growth++;
    return true;
  }
  return false;
}

export function applyAlchemyAction(game, type) {
  const bed = ensureAlchemy(game);
  if (type === 'plant_pill_herbs') {
    if (!game.garden?.bottle) throw new GameError('需先寻得小绿瓶并完成灵液试验，再培育筑基主药。');
    if (!PILL_HERBS.every(herb => game.campaign.questHerbs.includes(herb))) throw new GameError('三味任务主药尚未收齐，不能留种培育。');
    game.campaign.questHerbs = game.campaign.questHerbs.filter(herb => !PILL_HERBS.includes(herb));
    bed.planted = true;
    return '将紫猴花、玉髓芝、天灵果留种栽入自己的药畦。主药需生长 4 点；每旬自然生长 1 点，自动浇灌优先为主药消耗 1 滴灵液，再催生 1 点。成熟后须亲自采收。';
  }
  if (type === 'harvest_pill_herbs') {
    if (!bed.planted || bed.growth < PILL_GROWTH) throw new GameError(`主药尚未成熟（${bed.growth}/${PILL_GROWTH}），请推进旬数继续培养。`);
    bed.harvested = true;
    return '亲手采收成熟的紫猴花、玉髓芝、天灵果，各得一份炼丹主药，收入专用药囊。可到药园静室按丹方炼制筑基丹。';
  }
  if (type !== 'refine_foundation_pill') throw new GameError('未知的培药炼丹操作。');
  if (!bed.harvested) throw new GameError('需先培养并采收三味成熟主药，普通灵草不能代替。');
  if (bed.crafted) throw new GameError('这批主药已经炼制，不能重复取丹。');
  bed.harvested = false;
  bed.crafted++;
  game.campaign.alternatePill = true;
  return '你依照筑基丹方处理三味亲手培育的成熟主药，在药园静室控火炼制，得到一枚筑基丹。主药已消耗，可前往太岳山听雨亭服丹筑基。';
}

export function alchemyView(game) {
  const bed = game.campaign.alchemy || { planted: false, growth: 0, harvested: false, crafted: 0 };
  return { ...bed, herbs: [...PILL_HERBS], growthRequired: PILL_GROWTH, recipe: Boolean(game.campaign.storyFlags?.deliver_spirit_herbs), ready: bed.planted && !bed.harvested && !bed.crafted && bed.growth >= PILL_GROWTH };
}

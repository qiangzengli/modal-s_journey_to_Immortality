import { GameError } from './errors.js';

export const GARDEN_ACTIONS = ['discover_bottle', 'plant_herb', 'water_herb', 'harvest_garden', 'buy_spirit_soil', 'enable_auto_water', 'disable_auto_water', 'enable_auto_plant', 'disable_auto_plant'];
const GROWTH = 4;
const CAPACITY = 3;
const SOIL_PRICE = 120;

export function createGarden() {
  return { bottle: false, spiritSoil: false, drops: 0, autoWater: true, autoPlant: true, plots: [null], stored: 0, harvested: 0, lastTurn: null };
}
export function ensureGarden(game) { game.garden ??= createGarden(); return game; }
function record(game, text) {
  game.events.push({ id: game.nextId++, turn: game.turn, actor: '灵草坡', text, causes: [], scope: 'player' });
}
function seedling(game) { return { growth: 0, plantedTurn: game.turn }; }
function yieldPerPlot(garden) { return garden.spiritSoil ? 4 : 3; }
function growingPlot(garden) {
  // 优先催熟最接近成熟的一畦，下一轮会自然轮到另一畦。
  return garden.plots.filter(plot => plot && plot.growth < GROWTH).sort((a, b) => b.growth - a.growth)[0];
}
function ripen(game) {
  const garden = game.garden;
  let gained = 0, replanted = 0;
  garden.plots = garden.plots.map(plot => {
    if (!plot || plot.growth < GROWTH) return plot;
    const reserved = garden.autoPlant ? 1 : 0;
    gained += yieldPerPlot(garden) - reserved;
    replanted += reserved;
    return reserved ? seedling(game) : null;
  });
  if (gained) {
    garden.stored += gained;
    record(game, `灵草成熟，${gained} 株收入灵圃待取${replanted ? `，另留 ${replanted} 株自动续种` : '，空畦可重新栽种'}。回到灵草坡即可收取。`);
  }
  return gained;
}

// 只由推进一旬调用；真实时间、刷新页面和普通操作均不产生灵液或收成。
export function advanceGarden(game) {
  ensureGarden(game);
  const garden = game.garden;
  if (!garden.bottle || garden.lastTurn >= game.turn) return;
  garden.lastTurn = game.turn;
  garden.drops = Math.min(CAPACITY, garden.drops + 1);
  for (const plot of garden.plots) if (plot) plot.growth = Math.min(GROWTH, plot.growth + 1);
  const target = growingPlot(garden);
  if (garden.autoWater && garden.drops && target && target.growth < GROWTH) {
    garden.drops--;
    target.growth++;
  }
  ripen(game);
}

// 调用方提供事务副本。数量、价格、进度和留种均在服务端确定。
export function applyGardenAction(game, type) {
  ensureGarden(game);
  const garden = game.garden;
  if (game.player.place !== 'woods' && !(game.volume && game.player.place==='shenshou')) throw new GameError('请先到黑风林的灵草坡照看灵圃。');
  if (type === 'discover_bottle') {
    if(game.volume)throw new GameError('小绿瓶须在神手谷完成拾取与月下试验。');
    if (garden.bottle) throw new GameError('小绿瓶已认主，不能重复获取。');
    garden.bottle = true;
    garden.lastTurn = game.turn;
    garden.plots[0] = seedling(game);
    const result = '你在旧石龛中发现小绿瓶和一株存活的幼苗，将它安置在灵圃。每旬凝液 1 滴，已开启自动浇灌与留种续种；首批约两旬后成熟。';
    record(game, result);
    return result;
  }
  if (!garden.bottle) throw new GameError('先在灵草坡寻得并认主小绿瓶。');
  let result;
  if (type === 'plant_herb') {
    const empty = garden.plots.indexOf(null);
    if (empty < 0) throw new GameError('所有灵畦都已种植。');
    if (game.player.herbs < 1) throw new GameError('需要行囊中的 1 株灵草作种，可先采药或收取灵圃产物。');
    game.player.herbs--;
    garden.plots[empty] = seedling(game);
    result = '以 1 株灵草分株栽种。自然生长需 4 旬，每滴灵液额外增加 1 点生长。';
  } else if (type === 'water_herb') {
    if (!garden.drops) throw new GameError('瓶中尚无灵液；推进一旬可凝聚 1 滴。');
    const target = growingPlot(garden);
    if (!target) throw new GameError('灵畦尚未种植，无需消耗灵液。');
    garden.drops--;
    target.growth++;
    const gained = ripen(game);
    result = `消耗 1 滴灵液，催生 1 点生长。${gained ? `本次成熟 ${gained} 株待取。` : '灵草叶脉泛起青光。'}`;
  } else if (type === 'harvest_garden') {
    if (!garden.stored) throw new GameError('尚无成熟灵草可收取。推进旬数后再来看看。');
    const amount = garden.stored;
    game.player.herbs += amount;
    garden.harvested += amount;
    garden.stored = 0;
    result = `收取灵草 ${amount} 株，已放入行囊，可交给白芷出售。`;
  } else if (type === 'buy_spirit_soil') {
    if (garden.spiritSoil) throw new GameError('息壤盆已经炼成，无需重复投入。');
    if (game.player.stones < SOIL_PRICE) throw new GameError(`炼制息壤盆需要 ${SOIL_PRICE} 灵石。`);
    game.player.stones -= SOIL_PRICE;
    garden.spiritSoil = true;
    garden.plots.push(null);
    result = '消耗 120 灵石炼成息壤盆：新增一畦，每畦成熟产量由 3 株增至 4 株。空畦需要 1 株灵草栽种。';
  } else {
    const toggles = {
      enable_auto_water: ['autoWater', true, '自动浇灌已开启。每旬最多使用 1 滴，优先催熟长势最好的一畦。'],
      disable_auto_water: ['autoWater', false, '自动浇灌已暂停。灵草照常生长，灵液最多蓄积 3 滴，可手动催熟。'],
      enable_auto_plant: ['autoPlant', true, '留种续种已开启。成熟时从每畦产物中留 1 株再种，其余放入灵圃待取。'],
      disable_auto_plant: ['autoPlant', false, '留种续种已暂停。下次成熟时全部产物待取，灵畦留空。']
    };
    const setting = Object.hasOwn(toggles, type) && toggles[type];
    if (!setting) throw new GameError('未知的灵圃操作。');
    const [key, enabled, text] = setting;
    if (garden[key] === enabled) throw new GameError('这项设置已经生效。');
    garden[key] = enabled;
    result = text;
  }
  record(game, result);
  return result;
}

export function getGardenView(game) {
  const garden = game.garden || createGarden();
  return {
    ...structuredClone(garden), capacity: CAPACITY, growthRequired: GROWTH,
    yieldPerPlot: yieldPerPlot(garden), soilPrice: SOIL_PRICE,
    plots: garden.plots.map((plot, index) => ({ index, planted: Boolean(plot), growth: plot?.growth || 0, remaining: plot ? GROWTH - plot.growth : null }))
  };
}

import { alchemyMarkup } from './alchemy-ui.js';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function createGardenUI({ getState, executeAction, navigate }) {
  function button(type, label, secondary = false) {
    const { view, busy } = getState();
    const state = view.actionOptions[type];
    return `<button type="button" data-garden-action="${type}" class="${secondary ? 'garden-secondary' : ''}" ${busy || !state.available ? 'disabled' : ''} title="${esc(state.reason)}">${esc(label)}</button>`;
  }
  function render() {
    const { view, site, busy } = getState();
    if (!view) return;
    const garden = view.garden;
    $('#garden-card').hidden = !['herbs','valley_bottle','spring','infirmary'].includes(site) || Boolean(view.battle);
    $('#garden-hud').hidden = !garden.bottle;
    $('#garden-hud').textContent = garden.stored ? `⚘ 待收 ${garden.stored} 株` : `⚘ 灵液 ${garden.drops} / ${garden.capacity}`;
    $('#garden-hud').classList.toggle('ripe', garden.stored > 0);
    $('#garden-hud').disabled = busy || Boolean(view.battle);
    $('#garden-summary').innerHTML = `<h3>灵植神器</h3><button type="button" data-garden-open><span>${garden.bottle ? '小绿瓶' + (garden.spiritSoil ? ' · 息壤盆' : '') : view.story?'神手谷的青光':'灵草坡的青光'}</span><strong>${garden.bottle ? `待收 ${garden.stored} 株 · 凝液 ${garden.drops}/${garden.capacity}` : '前往寻得小绿瓶 ↗'}</strong><small>${garden.bottle ? `已收获 ${garden.harvested} 株 · ${garden.plots.filter(p => p.planted).length}/${garden.plots.length} 畦在生长` : view.story?'沿神手谷石径调查小绿瓶的秘密。':'太岳山脉的旧石龛里，一只古瓶正在吸纳月华。'}</small></button>`;
    if (['spring','infirmary'].includes(site)) { $('#garden-card').innerHTML=alchemyMarkup(view);return; }
    if (!['herbs','valley_bottle'].includes(site)) return;
    const bottle = '<div class="jade-bottle" aria-hidden="true"><i></i><span>生</span></div>';
    if (!garden.bottle && view.story) { $('#garden-card').innerHTML='<p class="garden-note">先完成石径的拾取与月下试验，小绿瓶才会开启灵圃。</p>';return; }
    if (!garden.bottle) {
      $('#garden-card').innerHTML = `<div class="garden-heading">${bottle}<div><small>林中奇遇 / 月华凝露</small><h3>小绿瓶</h3><p>石龛旁一株幼苗青翠未枯，瓶内隐约可见灵液。</p></div></div><p class="garden-note">认主后每旬凝聚 1 滴灵液，自动催生并留种。无需守在林中，外出游历时也会生长。</p>${button('discover_bottle', '认主小绿瓶 · 安置幼苗')}`;
      return;
    }
    $('#garden-card').innerHTML = `<div class="garden-heading">${bottle}<div><small>灵植神器 / ${garden.spiritSoil ? '息壤相伴' : '月华凝露'}</small><h3>小绿瓶 <span>已认主</span></h3><p>灵液 ${garden.drops} / ${garden.capacity} 滴 · 每旬凝液 1 滴</p></div></div>
      <div class="garden-drops" aria-label="灵液 ${garden.drops} 滴">${Array.from({ length: garden.capacity }, (_, i) => `<i class="${i < garden.drops ? 'filled' : ''}"></i>`).join('')}<small>每滴催生 1 点</small></div>
      <div class="garden-plots">${garden.plots.map(plot => `<div class="garden-plot ${plot.planted ? 'planted' : ''}"><span>${plot.planted ? '⚘' : '＋'}</span><div><b>第 ${plot.index + 1} 畦 · ${plot.planted ? '灵草生长中' : '待栽种'}</b><small>${plot.planted ? `生长 ${plot.growth}/${garden.growthRequired} · 成熟产 ${garden.yieldPerPlot} 株` : '需要行囊灵草 1 株'}</small><progress max="${garden.growthRequired}" value="${plot.growth}" aria-label="第 ${plot.index + 1} 畦生长进度"></progress></div></div>`).join('')}</div>
      <div class="garden-harvest"><div><small>灵圃待取</small><strong>${garden.stored}<em> 株灵草</em></strong></div>${button('harvest_garden', '收入行囊')}</div>
      <div class="garden-controls">${button('plant_herb', '栽种 · 灵草 1')}${button('water_herb', '催熟 · 灵液 1')}</div>
      <div class="garden-settings"><span>自动浇灌 <b>${garden.autoWater ? '开启' : '暂停'}</b></span>${button(garden.autoWater ? 'disable_auto_water' : 'enable_auto_water', garden.autoWater ? '暂停浇灌' : '开启浇灌', true)}<span>留种续种 <b>${garden.autoPlant ? '开启' : '暂停'}</b></span>${button(garden.autoPlant ? 'disable_auto_plant' : 'enable_auto_plant', garden.autoPlant ? '暂停续种' : '开启续种', true)}</div>
      <p class="garden-note">自然生长每旬 +1；自动浇灌每旬最多用 1 滴，优先照看正在培养的筑基主药。${garden.autoPlant ? `成熟时每畦留 1 株续种，实际待取 ${garden.yieldPerPlot - 1} 株。` : '成熟时全部产物待取，灵畦留空。'}普通操作不会推进培养。</p>
      ${garden.spiritSoil ? '<p class="garden-upgrade">◆ 息壤盆已炼成 · 两畦培育，每畦增产 1 株</p>' : `<div class="garden-upgrade"><b>息壤盆</b><p>扩建为两畦，每畦产量从 3 株提高到 4 株。</p>${button('buy_spirit_soil', `炼制 · ${garden.soilPrice} 灵石`, true)}</div>`}
      <p class="garden-note">推进一旬也会结算坊市机缘与欠款。成熟产物会留存，不必立即赶回。</p>`;
  }
  $('#garden-card').addEventListener('click', event => {
    const target = event.target.closest('[data-garden-action]');
    if (target && !getState().busy) executeAction({ type: target.dataset.gardenAction });
  });
  for (const selector of ['#garden-summary', '#actions']) $(selector).addEventListener('click', event => { if (event.target.closest('[data-garden-open]')) navigate(getState().view?.story?'valley_bottle':'herbs'); });
  $('#garden-hud').addEventListener('click', () => navigate(getState().view?.story?'valley_bottle':'herbs'));
  return { render };
}

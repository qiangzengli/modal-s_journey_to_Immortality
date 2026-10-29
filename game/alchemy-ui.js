const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function alchemyMarkup(view) {
  const a = view.campaign.alchemy;
  const status = view.world.breakthrough ? '已服丹筑基' : view.campaign.alternatePill || view.pill.ownerId === 'player' ? '筑基丹已入行囊' : a.crafted ? '本批已炼制' : a.harvested ? '成熟主药已采收，可炼丹' : a.ready ? '主药已成熟，请亲自采收' : a.planted ? `主药生长 ${a.growth}/${a.growthRequired}，推进旬数继续培养` : a.recipe ? '丹方已研习，三味活株待栽种' : '先采集三味活株并研习丹方';
  return `<article class="campaign-aside" aria-label="培药炼丹"><strong>自行培药 · 炼制筑基丹</strong><p>${esc(a.herbs.join(' · '))}</p><p>${esc(status)}</p>${a.planted && !a.crafted ? `<progress max="${a.growthRequired}" value="${a.growth}" aria-label="筑基主药生长进度"></progress>` : ''}<small>留种栽培 → 灵液催熟 → 成熟采收 → 按方炼丹</small></article>`;
}

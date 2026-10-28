import { cultivatorArt, equipmentIcon } from './equipment-art.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const fact = (label, value) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
const categories = { all: '全部', equipment: '装备', pill: '丹药', manual: '玉简', array: '阵盘' };
const kindNames = { weapon: '兵器', head: '头冠', body: '衣袍', hands: '护腕', feet: '靴履', waist: '腰饰', ring: '戒指', artifact: '法宝', pill: '丹药', manual: '功法玉简', array: '阵盘' };

// Slot count and grouping are independent of the portrait and inventory capacity.
// Reserved slots stay empty until the game supplies equipment for those locations.
export const EQUIPMENT_SLOTS = [
  { id: 'weapon', type: 'weapon', name: '兵器' },
  { id: 'head', type: 'head', name: '头冠' },
  { id: 'body', type: 'body', name: '衣袍' },
  { id: 'hands', type: 'hands', name: '护腕' },
  { id: 'feet', type: 'feet', name: '靴履' },
  { id: 'waist', type: 'waist', name: '腰饰' },
  { id: 'ring1', type: 'ring', name: '戒指 · 一' },
  { id: 'ring2', type: 'ring', name: '戒指 · 二' },
  { id: 'artifact1', type: 'artifact', name: '法宝 · 一' },
  { id: 'artifact2', type: 'artifact', name: '法宝 · 二' }
];
const slotTypes = new Set(EQUIPMENT_SLOTS.map(slot => slot.type));
const itemType = item => item.slot || item.kind;
const isEquipment = item => slotTypes.has(itemType(item));
const iconFor = item => item?.id === 'vine_staff' ? 'staff' : item?.kind === 'manual' ? 'skills' : itemType(item || {}) || 'inventory';
function equippedAt(view, slot) {
  if (slot.id === 'weapon') return view.weapon;
  if (slot.id === 'artifact1' && view.garden?.bottle) return { id: 'green_bottle', name: '小绿瓶', kind: 'artifact', bound: true, description: '吸纳月华，凝液催生。每旬凝聚 1 滴灵液，用于催长灵圃中的灵草。' };
  return view.equipment?.[slot.id] || null;
}

export function inventoryPage(inventory, { category = 'all', slotType = '', query = '', sort = 'kind', page = 0, pageSize = 20 } = {}) {
  const search = query.trim().toLocaleLowerCase();
  const matching = inventory.filter(item => item.quantity > 0 &&
    (category === 'all' || (category === 'equipment' ? isEquipment(item) : item.kind === category)) &&
    (!slotType || itemType(item) === slotType) &&
    (!search || `${item.name} ${item.description || ''}`.toLocaleLowerCase().includes(search)));
  const byName = (a, b) => a.name.localeCompare(b.name, 'zh-CN') || a.id.localeCompare(b.id);
  matching.sort(sort === 'power' ? (a, b) => (b.attack || 0) - (a.attack || 0) || byName(a, b) : sort === 'quantity' ? (a, b) => b.quantity - a.quantity || byName(a, b) : sort === 'name' ? byName : (a, b) => itemType(a).localeCompare(itemType(b)) || byName(a, b));
  const pages = Math.max(1, Math.ceil(matching.length / pageSize));
  const currentPage = Math.max(0, Math.min(page, pages - 1));
  return { items: matching.slice(currentPage * pageSize, (currentPage + 1) * pageSize), total: matching.length, page: currentPage, pages };
}

function itemHeading(item, tag) {
  return `<div class="equipment-item-heading"><span class="equipment-item-icon">${equipmentIcon(iconFor(item))}</span><div><small>${esc(tag)}</small><h4>${esc(item.name)}</h4></div>${item.attack != null ? `<b class="equipment-power">+${esc(item.attack)}<small>威力</small></b>` : ''}</div>`;
}
function actionFor(item) {
  if (item.kind === 'weapon') return 'equip';
  if (item.kind === 'manual') return 'learn';
  if (item.heal) return 'use';
  return '';
}
function actionUnavailable(item, view) {
  return item.id === view.weapon?.id || item.equipped || item.learned || (item.heal && view.player.hp >= 100);
}
function itemDetails(item, view, { inBag = false, locked = false, pending = false } = {}) {
  const worn = item.id === view.weapon?.id || item.equipped || item.bound;
  const tag = `${kindNames[itemType(item)] || '物品'} · ${item.bound ? '已认主' : worn ? '已装备' : inBag ? `持有 ${item.quantity} 件` : '已装备'}`;
  let html = itemHeading(item, tag) + `<p class="equipment-description">${esc(item.description)}</p>`;
  if (item.id === 'green_bottle') {
    const garden = view.garden;
    return html + `<dl class="equipment-facts">${fact('瓶中灵液', `${garden.drops} / ${garden.capacity} 滴`)}${fact('灵圃待收', `${garden.stored} 株`)}</dl><p class="equipment-note">认主法宝随身相伴。${garden.autoWater ? '自动浇灌' : '浇灌已暂停'} · ${garden.autoPlant ? '留种续种' : '不留种'}。</p>`;
  }
  if (item.attack != null) {
    const delta = item.attack - (view.weapon?.attack || 0);
    html += `<dl class="equipment-facts">${fact('普攻加成', `+${item.attack}`)}${fact('伤害功法加成', `+${item.attack}`)}</dl>`;
    if (inBag && !worn) html += `<div class="equipment-compare"><span>对比 · ${esc(view.weapon?.name || '未装备')}</span><b class="${delta < 0 ? 'decrease' : ''}">${delta > 0 ? '↑ +' : delta < 0 ? '↓ ' : ''}${delta} 威力</b></div>`;
  }
  if (item.heal || item.mana || item.power) html += `<dl class="equipment-facts">${fact(item.heal ? '恢复气血' : item.mana ? '恢复真气' : '基础威力', item.heal || item.mana || item.power)}${fact('持有数量', item.quantity)}</dl>`;
  if (inBag) {
    const action = actionFor(item);
    const label = worn ? '已装备' : item.learned ? '已掌握' : action === 'equip' ? '装备到 · 兵器' : action === 'learn' ? '研习功法' : action === 'use' ? '服用丹药' : '';
    if (action) html += `<button type="button" class="equipment-primary" data-equipment-action="${action}" data-equipment-focus="action" data-item-id="${esc(item.id)}" ${locked || actionUnavailable(item, view) ? 'disabled' : ''}>${pending ? '正在结算…' : label}</button>${view.battle?.status === 'active' ? '<p class="equipment-note">斗法中不可在此换装或使用物品。</p>' : item.heal && view.player.hp >= 100 ? '<p class="equipment-note">气血已满，无需服用。</p>' : ''}`;
    else html += `<p class="equipment-note">${['pill', 'array'].includes(item.kind) ? '在斗法中的「灵丹与阵法」页使用。' : '此物当前没有可用操作。'}</p>`;
  }
  return html;
}
function skillsDetails(view) {
  return `<div class="equipment-detail-title"><h4>已修功法</h4><span>${view.skills.length} 门</span></div><div class="equipment-skills">${view.skills.map(skill => `<article><h5>${esc(skill.name)}</h5><p>${esc(skill.description)}</p><dl class="equipment-facts">${fact('真气消耗', skill.cost)}${fact('冷却', `${skill.cooldown} 回合`)}${fact(skill.heal ? '恢复气血' : '基础威力', skill.heal || skill.power)}${fact(skill.heal ? '施展效果' : '兵器加成', skill.heal ? '疗愈自身' : `+${view.weapon?.attack || 0}`)}</dl></article>`).join('') || '<p class="equipment-empty">获得玉简后，可在行囊中研习功法。</p>'}</div>`;
}

export function createEquipmentUI({ element, onAction }) {
  let current, selectedItem = null, selectedSlot = 'weapon';
  let screen = 'overview', category = 'all', slotType = '', query = '', sort = 'kind', page = 0;
  let pending = false, externalPending = false, composing = false, resetGridScroll = false, error = '';
  function draw() {
    if (!current || composing) return;
    const active = element.ownerDocument?.activeElement;
    const focused = element.contains(active) ? active : null;
    const focusKey = focused?.dataset?.equipmentFocus;
    const caret = focused?.selectionStart;
    let gridScroll = resetGridScroll ? 0 : element.querySelector('.equipment-grid')?.scrollTop || 0;
    const { weapon, garden, skills = [], inventory = [], player, world } = current;
    const result = inventoryPage(inventory, { category, slotType, query, sort, page });
    if (page !== result.page) gridScroll = 0;
    page = result.page; resetGridScroll = false;
    const slot = EQUIPMENT_SLOTS.find(entry => entry.id === selectedSlot);
    const picked = inventory.find(item => item.id === selectedItem && item.quantity > 0);
    if (selectedItem && !picked) selectedItem = null;
    const equipped = equippedAt(current, slot);
    const locked = pending || externalPending || current.battle?.status === 'active';
    const detail = screen === 'skills' ? skillsDetails({ ...current, skills }) : picked ? itemDetails(picked, current, { inBag: true, locked, pending }) : equipped ? itemDetails(equipped, current) : `<div class="equipment-item-heading"><span class="equipment-item-icon">${equipmentIcon(slot.type)}</span><div><small>${esc(slot.name)} · 空槽</small><h4>暂无装备</h4></div></div><p class="equipment-description">${slot.type === 'artifact' ? '游历修真界，寻觅与你有缘的法宝。' : `尚未获得可用于${esc(slot.name)}的装备。`}此处会展示对应部位的物品与属性。</p>`;
    const occupied = EQUIPMENT_SLOTS.filter(entry => equippedAt(current, entry)).length;
    element.innerHTML = `<section class="equipment-sheet" data-screen="${screen}" aria-label="人物装备与行囊"><header class="equipment-heading"><div><small>青衣负剑 · 道途随行</small><h3>人物装备</h3></div><span>${esc(world?.realm || '修行中')}</span></header>
      <nav class="equipment-tabs" aria-label="装备界面切换">${[['overview', '人物装备'], ['inventory', '储物行囊'], ['skills', '已修功法']].map(([id, label]) => `<button type="button" data-equipment-screen="${id}" data-equipment-focus="screen-${id}" aria-pressed="${screen === id}">${label}${id === 'skills' ? ` · ${skills.length}` : ''}</button>`).join('')}</nav>
      <div class="equipment-layout"><div class="equipment-portrait"><div class="equipment-map">${cultivatorArt({ staff: weapon?.id === 'vine_staff', bottle: Boolean(garden?.bottle), armed: Boolean(weapon) })}<div class="equipment-slots" role="group" aria-label="装备部位">${EQUIPMENT_SLOTS.map((entry, index) => {
        const item = equippedAt(current, entry);
        return `<button type="button" class="equipment-slot ${item ? 'occupied' : 'vacant'}" style="--slot-row:${index % 5};--slot-side:${index < 5 ? 0 : 1}" data-equipment-slot="${entry.id}" data-equipment-focus="slot-${entry.id}" aria-pressed="${selectedSlot === entry.id && !selectedItem && screen !== 'skills'}" aria-controls="equipment-detail" aria-label="${esc(entry.name)}：${esc(item?.name || '暂无装备')}"><span>${equipmentIcon(item ? iconFor(item) : entry.type)}</span><div><small>${esc(entry.name)}</small><strong>${esc(item?.name || '空槽')}</strong></div></button>`;
      }).join('')}</div></div><div class="equipment-vitals"><span>气血 <b>${esc(player.hp)}<small> / 100</small></b></span><span>兵器威力 <b>+${esc(weapon?.attack || 0)}</b></span><span>已占槽位 <b>${occupied}<small> / ${EQUIPMENT_SLOTS.length}</small></b></span></div><p class="equipment-portrait-note">选部位查看装备 · 空槽等待新的机缘</p></div>
      <div class="equipment-workbench"><section class="equipment-collection" aria-label="储物行囊"><div class="equipment-collection-heading"><h4>储物行囊</h4><span>${inventory.filter(item => item.quantity > 0).length} 类物品 · 数量叠放</span></div>
      <div class="equipment-filters" role="group" aria-label="物品分类">${Object.entries(categories).map(([id, label]) => `<button type="button" data-equipment-filter="${id}" data-equipment-focus="filter-${id}" aria-pressed="${category === id}">${label}</button>`).join('')}</div>
      <div class="equipment-toolbar"><label><span class="sr-only">搜索行囊物品</span><input type="search" data-equipment-search data-equipment-focus="search" maxlength="80" placeholder="搜索名称或属性…" value="${esc(query)}"></label><label><span class="sr-only">物品排序</span><select data-equipment-sort data-equipment-focus="sort">${Object.entries({ kind: '按类别', power: '威力优先', quantity: '数量优先', name: '按名称' }).map(([id, label]) => `<option value="${id}" ${sort === id ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div>
      ${slotType ? `<div class="equipment-slot-filter">${esc(kindNames[slotType])}候选 <button type="button" data-equipment-clear data-equipment-focus="clear">显示全部 ×</button></div>` : ''}
      <div class="equipment-grid" role="group" aria-label="行囊物品，第 ${page + 1} 页">${result.items.map(item => `<button type="button" class="equipment-cell ${item.id === weapon?.id || item.equipped ? 'equipped' : ''}" data-equipment-item="${esc(item.id)}" data-equipment-focus="item-${esc(item.id)}" aria-pressed="${selectedItem === item.id}" aria-controls="equipment-detail" aria-label="${esc(item.name)}，${item.quantity} 件${item.id === weapon?.id || item.equipped ? '，已装备' : ''}"><span>${equipmentIcon(iconFor(item))}</span><strong>${esc(item.name)}</strong><small>×${item.quantity}</small>${item.id === weapon?.id || item.equipped ? '<em>装</em>' : ''}</button>`).join('') || '<p class="equipment-empty">没有符合条件的物品。<br>可切换分类或清除筛选。</p>'}</div>
      <div class="equipment-pagination"><span>${result.total} 类 · ${page + 1} / ${result.pages} 页</span><div><button type="button" data-equipment-page="-1" data-equipment-focus="previous" ${page === 0 ? 'disabled' : ''} aria-label="上一页">‹</button><button type="button" data-equipment-page="1" data-equipment-focus="next" ${page + 1 >= result.pages ? 'disabled' : ''} aria-label="下一页">›</button></div></div></section>
      <section id="equipment-detail" class="equipment-detail" aria-label="装备与物品详情">${detail}${!picked && screen !== 'skills' ? `<button type="button" class="equipment-open-bag" data-equipment-candidates data-equipment-focus="candidates">在行囊中查看${esc(slot.name)}候选 →</button>` : ''}</section><p class="equipment-error" role="alert" ${error ? '' : 'hidden'}>${esc(error)}</p></div></div></section>`;
    const grid = element.querySelector('.equipment-grid'); if (grid) grid.scrollTop = gridScroll;
    // Item IDs are data, never interpolated into a CSS selector.
    const restore = focusKey && [...(element.querySelectorAll?.('[data-equipment-focus]') || [])].find(node => node.dataset.equipmentFocus === focusKey);
    if (restore) { restore.focus({ preventScroll: true }); if (restore.type === 'search' && caret != null) restore.setSelectionRange(caret, caret); }
  }
  function candidates() {
    slotType = EQUIPMENT_SLOTS.find(slot => slot.id === selectedSlot).type;
    category = 'equipment'; query = ''; page = 0; resetGridScroll = true;
  }
  element.addEventListener('input', event => {
    if (event.target.matches('[data-equipment-search]') && !event.isComposing) { query = event.target.value.slice(0, 80); page = 0; resetGridScroll = true; draw(); }
  });
  element.addEventListener('compositionstart', event => { if (event.target.matches('[data-equipment-search]')) composing = true; });
  element.addEventListener('compositionend', event => {
    if (event.target.matches('[data-equipment-search]')) { composing = false; query = event.target.value.slice(0, 80); page = 0; resetGridScroll = true; draw(); }
  });
  element.addEventListener('change', event => {
    if (event.target.matches('[data-equipment-sort]') && ['kind', 'power', 'quantity', 'name'].includes(event.target.value)) { sort = event.target.value; page = 0; resetGridScroll = true; draw(); }
  });
  element.addEventListener('click', async event => {
    const target = selector => event.target.closest(selector);
    const navigation = target('[data-equipment-screen]');
    if (navigation && ['overview', 'inventory', 'skills'].includes(navigation.dataset.equipmentScreen)) { screen = navigation.dataset.equipmentScreen; error = ''; draw(); return; }
    const slot = target('[data-equipment-slot]');
    if (slot && EQUIPMENT_SLOTS.some(entry => entry.id === slot.dataset.equipmentSlot)) { selectedSlot = slot.dataset.equipmentSlot; selectedItem = null; screen = 'overview'; error = ''; candidates(); draw(); return; }
    if (target('[data-equipment-candidates]')) { screen = 'inventory'; selectedItem = null; candidates(); draw(); return; }
    const filter = target('[data-equipment-filter]');
    if (filter && Object.hasOwn(categories, filter.dataset.equipmentFilter)) { category = filter.dataset.equipmentFilter; slotType = ''; page = 0; resetGridScroll = true; draw(); return; }
    if (target('[data-equipment-clear]')) { category = 'all'; slotType = ''; query = ''; page = 0; resetGridScroll = true; draw(); return; }
    const pagination = target('[data-equipment-page]');
    if (pagination && !pagination.disabled && ['-1', '1'].includes(pagination.dataset.equipmentPage)) { page += Number(pagination.dataset.equipmentPage); resetGridScroll = true; draw(); return; }
    const itemButton = target('[data-equipment-item]');
    if (itemButton && current.inventory.some(item => item.id === itemButton.dataset.equipmentItem && item.quantity > 0)) { selectedItem = itemButton.dataset.equipmentItem; error = ''; draw(); return; }
    const action = target('[data-equipment-action]');
    if (!action || action.disabled || pending || externalPending || current?.battle?.status === 'active') return;
    const item = current.inventory.find(entry => entry.id === action.dataset.itemId && entry.quantity > 0);
    if (!item || !actionFor(item) || actionFor(item) !== action.dataset.equipmentAction || actionUnavailable(item, current)) return;
    pending = true; error = ''; draw();
    try {
      const result = await onAction({ type: actionFor(item), itemId: item.id });
      if (!result) error = '操作未完成，请稍后重试。';
      else if (actionFor(item) === 'learn') { screen = 'skills'; selectedItem = null; }
    }
    catch { error = '操作未完成，请稍后重试。'; }
    finally {
      pending = false; draw();
      if (element.ownerDocument?.activeElement === element.ownerDocument?.body) element.querySelector(`[data-equipment-focus="screen-${screen}"]`)?.focus({ preventScroll: true });
    }
  });
  return { render(view, options = {}) { current = view; externalPending = Boolean(options.pending); draw(); } };
}

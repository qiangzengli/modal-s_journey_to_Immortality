import { cultivatorArt, equipmentIcon } from './equipment-art.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const staff = weapon => weapon?.id === 'vine_staff';
const fact = (label, value) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;

function weaponDetails(view, pending) {
  const weapon = view.weapon;
  if (!weapon) return '<p class="equipment-empty">尚未装备兵器。获得武器后可在行囊中装备。</p>';
  const weapons = (view.inventory || []).filter(item => item.kind === 'weapon' && item.quantity > 0);
  const locked = pending || view.battle?.status === 'active';
  return `<div class="equipment-item-heading"><span class="equipment-item-icon">${equipmentIcon(staff(weapon) ? 'staff' : 'weapon')}</span><div><small>兵器 · 已装备</small><h4>${esc(weapon.name)}</h4></div><b class="equipment-power">+${esc(weapon.attack)}<small>威力</small></b></div>
    <p class="equipment-description">${esc(weapon.description)}</p>
    <dl class="equipment-facts">${fact('普攻加成', `+${weapon.attack}`)}${fact('伤害功法加成', `+${weapon.attack}`)}</dl>
    ${weapons.length > 1 ? `<div class="equipment-alternatives"><p>更换兵器 <small>${view.battle?.status === 'active' ? '斗法中不可换装' : '从行囊中选择'}</small></p>${weapons.map(item => {
      const equipped = item.id === weapon.id;
      const delta = item.attack - weapon.attack;
      return `<button type="button" data-equipment-equip="${esc(item.id)}" ${locked || equipped ? 'disabled' : ''}><span>${esc(item.name)}<small>威力 +${esc(item.attack)}${equipped ? '' : ` · ${delta >= 0 ? '↑' : '↓'}${Math.abs(delta)}`}</small></span><b>${equipped ? '已装备' : pending ? '换装中…' : '装备 →'}</b></button>`;
    }).join('')}</div>` : '<p class="equipment-note">游历所得的兵器可在此比较、换装。</p>'}`;
}

function artifactDetails(view) {
  const garden = view.garden;
  if (!garden?.bottle) return `<div class="equipment-item-heading"><span class="equipment-item-icon">${equipmentIcon('artifact')}</span><div><small>随身法宝 · 待寻</small><h4>尚无认主法宝</h4></div></div><p class="equipment-description">黑风林的灵草坡有一处旧石龛，青光隐现，或许藏着一份机缘。</p>`;
  return `<div class="equipment-item-heading"><span class="equipment-item-icon">${equipmentIcon('artifact')}</span><div><small>随身法宝 · 已认主</small><h4>小绿瓶</h4></div><span class="equipment-seal">凝露</span></div><p class="equipment-description">吸纳月华，凝液催生。每旬凝聚 1 滴灵液，用于催长灵圃中的灵草。</p>
    <dl class="equipment-facts">${fact('瓶中灵液', `${garden.drops} / ${garden.capacity} 滴`)}${fact('灵圃待收', `${garden.stored} 株`)}</dl>
    <p class="equipment-note">${garden.spiritSoil ? '息壤盆已安置于灵草坡。' : ''}浇灌${garden.autoWater ? '自动进行' : '已暂停'} · ${garden.autoPlant ? '成熟留种续种' : '成熟后不留种'}。</p>`;
}

function skillDetails(view) {
  return `<div class="equipment-item-heading"><span class="equipment-item-icon">${equipmentIcon('skills')}</span><div><small>丹田 · 已修功法</small><h4>内蕴道法</h4></div><span class="equipment-seal">${view.skills.length} 门</span></div><div class="equipment-skills">${view.skills.map(skill => `<article><h5>${esc(skill.name)}</h5><p>${esc(skill.description)}</p><dl class="equipment-facts">${fact('真气消耗', skill.cost)}${fact('冷却', `${skill.cooldown} 回合`)}${fact(skill.heal ? '恢复气血' : '基础威力', skill.heal || skill.power)}${fact(skill.heal ? '施展效果' : '兵器加成', skill.heal ? '疗愈自身' : `+${view.weapon?.attack || 0}`)}</dl></article>`).join('') || '<p class="equipment-empty">尚未修习功法，获得玉简后可在行囊中研习。</p>'}</div>`;
}

function inventoryDetails(view) {
  const count = kind => (view.inventory || []).filter(item => item.kind === kind).reduce((sum, item) => sum + item.quantity, 0);
  return `<div class="equipment-item-heading"><span class="equipment-item-icon">${equipmentIcon('inventory')}</span><div><small>腰间 · 储物行囊</small><h4>随身储物袋</h4></div></div><p class="equipment-description">收纳游历所得的兵器、玉简与丹药。</p><dl class="equipment-facts">${fact('兵器', `${count('weapon')} 件`)}${fact('待研习玉简', `${count('manual')} 卷`)}${fact('灵丹', `${count('pill')} 颗`)}${fact('阵盘', `${count('array')} 件`)}</dl><button type="button" class="equipment-open-bag" data-equipment-bag>查看行囊物品 ↓</button>`;
}

export function createEquipmentUI({ element, onEquip, onOpenInventory }) {
  let current;
  let selected = 'weapon';
  let pending = false;
  let externalPending = false;
  let error = '';
  const kinds = ['weapon', 'artifact', 'skills', 'inventory'];
  function draw() {
    if (!current) return;
    const active = element.ownerDocument?.activeElement;
    const focusedSlot = element.contains(active) ? active?.dataset?.equipmentSlot : null;
    const { weapon, garden, skills = [], inventory = [], player, world } = current;
    const slots = [
      ['weapon', '执掌 · 兵器', weapon?.name || '尚未装备', weapon ? `威力 +${weapon.attack}` : '待寻兵器'],
      ['artifact', '随身 · 法宝', garden?.bottle ? '小绿瓶' : '待寻法宝', garden?.bottle ? `灵液 ${garden.drops}/${garden.capacity}` : '尚未认主'],
      ['skills', '丹田 · 功法', skills[0]?.name || '尚未修习', `已修 ${skills.length} 门`],
      ['inventory', '腰间 · 行囊', '储物袋', `${inventory.filter(item => item.quantity > 0).length} 类物品`]
    ];
    const detail = { weapon: weaponDetails, artifact: artifactDetails, skills: skillDetails, inventory: inventoryDetails };
    element.innerHTML = `<section class="equipment-sheet" aria-label="人物装备图谱"><header class="equipment-heading"><div><small>身藏万象 · 道途随行</small><h3>人物图谱</h3></div><span>${esc(world?.realm || '修行中')}</span></header>
      <div class="equipment-map" data-selected="${selected}">${cultivatorArt({ staff: staff(weapon), bottle: Boolean(garden?.bottle), armed: Boolean(weapon) })}<div class="equipment-slots" role="group" aria-label="选择人物部位查看详情">${slots.map(([kind, label, name, status]) => `<button type="button" class="equipment-slot equipment-slot-${kind}" data-equipment-slot="${kind}" aria-pressed="${selected === kind}" aria-controls="equipment-detail"><small>${label}</small><span class="equipment-slot-icon">${equipmentIcon(kind === 'weapon' && staff(weapon) ? 'staff' : kind)}</span><strong>${esc(name)}</strong><em>${esc(status)}</em></button>`).join('')}</div><span class="equipment-map-caption">点击部位 · 观其详</span></div>
      <div class="equipment-vitals"><span>气血 <b>${esc(player.hp)}<small> / 100</small></b></span><span>兵器威力 <b>+${esc(weapon?.attack || 0)}</b></span><span>已修功法 <b>${skills.length}<small> 门</small></b></span></div>
      <section id="equipment-detail" class="equipment-detail" aria-label="${slots.find(([kind]) => kind === selected)[1]}详情">${detail[selected]({ ...current, skills }, pending || externalPending)}</section>
      <p class="equipment-error" role="alert" ${error ? '' : 'hidden'}>${esc(error)}</p></section>`;
    if (focusedSlot) element.querySelector(`[data-equipment-slot="${focusedSlot}"]`)?.focus({ preventScroll: true });
  }
  element.addEventListener('click', async event => {
    const slot = event.target.closest('[data-equipment-slot]');
    if (slot && kinds.includes(slot.dataset.equipmentSlot)) { selected = slot.dataset.equipmentSlot; error = ''; draw(); return; }
    if (event.target.closest('[data-equipment-bag]')) { onOpenInventory?.(); return; }
    const equip = event.target.closest('[data-equipment-equip]');
    if (!equip || equip.disabled || pending || externalPending || current?.battle?.status === 'active') return;
    const id = equip.dataset.equipmentEquip;
    if (id === current.weapon?.id || !current.inventory.some(item => item.id === id && item.kind === 'weapon' && item.quantity > 0)) return;
    pending = true; error = ''; draw();
    try {
      const result = await onEquip(id);
      if (!result) error = '换装未完成，请稍后重试。';
    } catch { error = '换装未完成，请稍后重试。'; }
    finally {
      pending = false; draw();
      // Restore keyboard focus after replacing the equip button with its result.
      if (selected === 'weapon' && (!element.ownerDocument?.activeElement || element.ownerDocument.activeElement === element.ownerDocument.body)) element.querySelector('[data-equipment-slot="weapon"]')?.focus({ preventScroll: true });
    }
  });
  return { render(view, options = {}) { current = view; externalPending = Boolean(options.pending); draw(); } };
}

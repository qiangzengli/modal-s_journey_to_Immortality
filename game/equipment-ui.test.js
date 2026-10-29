import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getView } from './engine.js';
import { inventoryAction } from './combat.js';
import { createEquipmentUI, EQUIPMENT_SLOTS, inventoryPage } from './equipment-ui.js';

// Exercise public UI events with real engine views. This does not assert browser layout.
function harness(onAction = () => {}) {
  const element = { innerHTML: '', listeners: {}, contains: () => false, querySelector: () => null, addEventListener(event, listener) { this.listeners[event] = listener; } };
  const ui = createEquipmentUI({ element, onAction });
  const click = (attribute, value, extra = {}) => element.listeners.click({ target: { closest: selector => selector === `[data-equipment-${attribute}]` ? { dataset: { [`equipment${attribute[0].toUpperCase()}${attribute.slice(1)}`]: value, ...extra }, disabled: false } : null } });
  const input = (event, value, isComposing = false) => element.listeners[event]({ target: { value, matches: selector => selector === '[data-equipment-search]' }, isComposing });
  return { ui, element, click, input };
}

test('部位与功法分离，读图不改存档；法宝认主后更新同一槽位，不伪造空槽物品', async () => {
  const game = createGame(), snapshot = structuredClone(game);
  let calls = 0;
  const { ui, element, click } = harness(() => calls++);
  ui.render(getView(game));
  assert.match(element.innerHTML, /data-portrait-layer="character"/);
  assert.match(element.innerHTML, /data-portrait-equipment="sword"/);
  assert.doesNotMatch(element.innerHTML, /data-portrait-layer="bottle"/);
  assert.equal(EQUIPMENT_SLOTS.length, 10);
  await click('slot', 'head');
  assert.match(element.innerHTML, /头冠 · 空槽/);
  await click('slot', 'artifact1');
  assert.match(element.innerHTML, /法宝 · 一 · 空槽/);
  assert.doesNotMatch(element.innerHTML, /<h4>小绿瓶<\/h4>/);
  assert.deepEqual(game, snapshot);
  game.garden.bottle = true; game.garden.drops = 2; game.garden.stored = 7;
  ui.render(getView(game));
  assert.match(element.innerHTML, /data-portrait-layer="bottle"/);
  assert.match(element.innerHTML, /<h4>小绿瓶<\/h4>/);
  assert.match(element.innerHTML, /2 \/ 3 滴/); assert.match(element.innerHTML, /7 株/);
  await click('screen', 'skills'); assert.match(element.innerHTML, /<h5>冰锥术<\/h5>/);
  assert.equal(calls, 0);
  game.exploration.inventory.vine_staff = 1;
  const equipped = inventoryAction(game, { type: 'equip', itemId: 'vine_staff' }).game;
  ui.render(getView(equipped));
  assert.match(element.innerHTML, /data-portrait-equipment="staff"/);
  assert.doesNotMatch(element.innerHTML, /data-portrait-equipment="sword"/);
  ui.render({ ...getView(equipped), weapon: null });
  assert.doesNotMatch(element.innerHTML, /data-portrait-equipment=/);
});

test('选择与对比不换装；确认后等待真实结算，拦截重复请求并保留物品数量', async () => {
  let game = createGame(); game.exploration.inventory.green_sword = 1;
  let finish, calls = 0;
  const { ui, element, click } = harness(async action => {
    calls++; await new Promise(resolve => { finish = resolve; });
    game = inventoryAction(game, action).game;
    const view = getView(game); ui.render(view); return { view };
  });
  ui.render(getView(game));
  await click('item', 'green_sword');
  assert.match(element.innerHTML, /↑ \+5 威力/); assert.equal(calls, 0);
  const pending = click('action', 'equip', { itemId: 'green_sword' });
  await click('action', 'equip', { itemId: 'green_sword' });
  assert.equal(calls, 1); assert.equal(game.exploration.weapon, 'worn_sword');
  assert.match(element.innerHTML, /正在结算/);
  finish(); await pending;
  assert.equal(game.exploration.weapon, 'green_sword');
  assert.equal(game.exploration.inventory.green_sword, 1); assert.equal(game.exploration.inventory.worn_sword, 1);
  assert.match(element.innerHTML, /<h4>青竹剑<\/h4>/); assert.match(element.innerHTML, /普攻加成<\/dt><dd>\+7/);
  await click('action', 'equip', { itemId: 'green_sword' });
  await click('action', 'equip', { itemId: 'healing_pill' }); assert.equal(calls, 1);
});

test('斗法和已有请求期间禁止操作；失败保留装备且允许重试', async () => {
  const game = createGame(); game.exploration.inventory.green_sword = 1;
  const view = getView(game); let calls = 0;
  const { ui, element, click } = harness(async () => { calls++; throw new Error('offline'); });
  ui.render({ ...view, battle: { status: 'active' } }); await click('item', 'green_sword');
  await click('action', 'equip', { itemId: 'green_sword' });
  assert.equal(calls, 0); assert.match(element.innerHTML, /斗法中不可在此换装/);
  ui.render(view, { pending: true }); await click('action', 'equip', { itemId: 'green_sword' }); assert.equal(calls, 0);
  ui.render(view); await click('action', 'equip', { itemId: 'green_sword' });
  assert.equal(calls, 1); assert.match(element.innerHTML, /操作未完成/);
  assert.equal(game.exploration.weapon, 'worn_sword');
  await click('action', 'equip', { itemId: 'green_sword' }); assert.equal(calls, 2);
});

test('大量物品可分类、搜索、排序与翻页，不截断总容量，不修改原数组', () => {
  const items = Array.from({ length: 127 }, (_, i) => ({ id: `sword-${i}`, name: `灵剑${i}`, kind: 'weapon', attack: i, quantity: i + 1 }));
  items.push({ id: 'pill', name: '回春丹', kind: 'pill', description: '恢复气血', quantity: 3 }, { id: 'zero', name: '已消耗物品', kind: 'pill', quantity: 0 });
  const original = structuredClone(items);
  const found = [];
  for (let page = 0; page < 7; page++) {
    const result = inventoryPage(items, { category: 'equipment', sort: 'power', page });
    assert.equal(result.total, 127); assert.ok(result.items.length <= 20);
    found.push(...result.items.map(item => item.id));
  }
  assert.equal(new Set(found).size, 127); assert.equal(found[0], 'sword-126'); assert.equal(found.at(-1), 'sword-0');
  assert.deepEqual(inventoryPage(items, { query: '气血' }).items.map(item => item.id), ['pill']);
  assert.equal(inventoryPage(items, { slotType: 'ring' }).total, 0);
  assert.equal(inventoryPage(items, { category: 'pill', page: 50 }).page, 0);
  assert.equal(inventoryPage(items, { sort: 'quantity' }).items[0].id, 'sword-126');
  assert.deepEqual(items, original);
});

test('中文输入法组合期间保留输入框，刷新不打断；搜索后支持研习和服丹', async () => {
  let game = createGame(); game.player.hp = 50; game.exploration.inventory.wind_manual = 1;
  let calls = 0;
  const { ui, element, click, input } = harness(async action => { calls++; game = inventoryAction(game, action).game; const view = getView(game); ui.render(view); return { view }; });
  ui.render(getView(game)); const before = element.innerHTML;
  input('compositionstart', ''); input('input', 'hui', true); ui.render(getView(game));
  assert.equal(element.innerHTML, before);
  input('compositionend', '回春');
  assert.match(element.innerHTML, /value="回春"/);
  assert.equal((element.innerHTML.match(/data-equipment-item=/g) || []).length, 1);
  await click('item', 'healing_pill'); await click('action', 'use', { itemId: 'healing_pill' });
  assert.equal(game.player.hp, 85); assert.equal(game.exploration.inventory.healing_pill, 1);
  await click('clear', ''); await click('item', 'wind_manual');
  await click('action', 'learn', { itemId: 'wind_manual' });
  assert.equal(calls, 2); assert.equal(game.exploration.inventory.wind_manual, 0);
  assert.ok(game.exploration.learned.includes('wind_blade'));
  assert.match(element.innerHTML, /data-screen="skills"/); assert.match(element.innerHTML, /<h5>青元剑诀<\/h5>/);
});

test('属性与功法显示服务端的基础值、加成及总威力，换装和筑基后同步刷新', async () => {
  let game = createGame();
  game.exploration.inventory.green_sword = 1;
  game.exploration.learned.push('wind_blade', 'spring_art');
  const { ui, element, click } = harness();
  ui.render(getView(game));
  assert.match(element.innerHTML, /基础攻击力<\/dt><dd>14/);
  assert.match(element.innerHTML, /基础法力<\/dt><dd>20/);
  assert.match(element.innerHTML, /基础攻击力 14 \+ 兵器 2 = 16/);
  assert.match(element.innerHTML, /真气上限 <b>40/);
  await click('screen', 'skills');
  assert.match(element.innerHTML, /基础法力 20 \+ 功法 5 \+ 兵器 2 = 27/);
  assert.match(element.innerHTML, /基础攻击力 14 \+ 功法 20 \+ 兵器 2 = 36/);
  assert.match(element.innerHTML, /基础法力 20 \+ 功法 12 = 32/);
  game = inventoryAction(game, { type: 'equip', itemId: 'green_sword' }).game;
  game.flags.playerBreakthrough = 1;
  ui.render(getView(game));
  assert.match(element.innerHTML, /基础攻击力<\/dt><dd>19/);
  assert.match(element.innerHTML, /基础法力<\/dt><dd>25/);
  assert.match(element.innerHTML, /已含筑基提升 \+5/);
  assert.match(element.innerHTML, /基础攻击力 19 \+ 兵器 7 = 26/);
  assert.match(element.innerHTML, /基础法力 25 \+ 功法 5 \+ 兵器 7 = 37/);
  assert.match(element.innerHTML, /基础法力 25 \+ 功法 12 = 37/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getView } from './engine.js';
import { inventoryAction } from './combat.js';
import { createEquipmentUI } from './equipment-ui.js';

// Exercise public UI events with actual engine views. Layout needs visual review separately.
function harness({ onEquip = () => {}, onOpenInventory = () => {} } = {}) {
  const element = { innerHTML: '', listeners: {}, contains: () => false, querySelector: () => null, addEventListener(event, listener) { this.listeners[event] = listener; } };
  const ui = createEquipmentUI({ element, onEquip, onOpenInventory });
  const click = (attribute, value) => element.listeners.click({ target: { closest: selector => selector === `[data-equipment-${attribute}]` ? { dataset: { [`equipment${attribute[0].toUpperCase()}${attribute.slice(1)}`]: value }, disabled: false } : null } });
  return { ui, element, click };
}

test('图谱切换与读档均只读；法宝状态随真实视图更新，保留所选部位', async () => {
  const game = createGame();
  const snapshot = structuredClone(game);
  let equips = 0, opened = 0;
  const { ui, element, click } = harness({ onEquip: () => equips++, onOpenInventory: () => opened++ });
  ui.render(getView(game));
  await click('slot', 'artifact');
  assert.match(element.innerHTML, /尚无认主法宝/);
  assert.doesNotMatch(element.innerHTML, /<h4>小绿瓶<\/h4>/);
  assert.deepEqual(game, snapshot);
  game.garden.bottle = true; game.garden.drops = 2; game.garden.stored = 7;
  ui.render(getView(game));
  assert.match(element.innerHTML, /data-selected="artifact"/);
  assert.match(element.innerHTML, /<h4>小绿瓶<\/h4>/);
  assert.match(element.innerHTML, /2 \/ 3 滴/);
  assert.match(element.innerHTML, /7 株/);
  await click('slot', 'skills');
  assert.match(element.innerHTML, /<h5>凝气诀<\/h5>/);
  await click('slot', 'inventory'); await click('bag', '');
  assert.equal(opened, 1); assert.equal(equips, 0);
});

test('图谱换装等待真实结算，拦截重复请求并展示新装备；不丢失数量或属性', async () => {
  let game = createGame();
  game.exploration.inventory.green_sword = 1;
  let finish, calls = 0;
  const { ui, element, click } = harness({ onEquip: async id => {
    calls++;
    await new Promise(resolve => { finish = resolve; });
    game = inventoryAction(game, { type: 'equip', itemId: id }).game;
    const view = getView(game); ui.render(view);
    return { view };
  } });
  ui.render(getView(game));
  const pending = click('equip', 'green_sword');
  await click('equip', 'green_sword');
  assert.equal(calls, 1);
  assert.equal(game.exploration.weapon, 'worn_sword');
  assert.match(element.innerHTML, /换装中/);
  finish(); await pending;
  assert.equal(game.exploration.weapon, 'green_sword');
  assert.equal(game.exploration.inventory.green_sword, 1);
  assert.equal(game.exploration.inventory.worn_sword, 1);
  assert.match(element.innerHTML, /<h4>青锋剑<\/h4>/);
  assert.match(element.innerHTML, /普攻加成<\/dt><dd>\+7/);
  await click('equip', 'green_sword'); await click('equip', 'healing_pill');
  assert.equal(calls, 1);
});

test('斗法和已有请求期间禁止换装；请求失败保留装备并可再次尝试', async () => {
  const game = createGame(); game.exploration.inventory.green_sword = 1;
  const view = getView(game);
  let calls = 0;
  const { ui, element, click } = harness({ onEquip: async () => { calls++; throw new Error('offline'); } });
  ui.render({ ...view, battle: { status: 'active' } });
  await click('equip', 'green_sword');
  assert.equal(calls, 0); assert.match(element.innerHTML, /斗法中不可换装/);
  ui.render(view, { pending: true }); await click('equip', 'green_sword');
  assert.equal(calls, 0);
  ui.render(view); await click('equip', 'green_sword');
  assert.equal(calls, 1); assert.match(element.innerHTML, /换装未完成/);
  assert.match(element.innerHTML, /<h4>旧铁剑<\/h4>/);
  await click('equip', 'green_sword'); assert.equal(calls, 2);
  assert.equal(game.exploration.weapon, 'worn_sword');
});

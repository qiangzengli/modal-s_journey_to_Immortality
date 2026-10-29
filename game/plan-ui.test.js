import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createPlanUI } from './plan-ui.js';

// 通过模块的事件与请求接口检验异步流程；不替代浏览器布局检查。
test('手札展示模型方案，选择后执行真实参数；局势变化立即禁用旧方案并拒绝迟到响应', async t => {
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, { value: '', innerHTML: '', listeners: {}, addEventListener(event, handler) { this.listeners[event] = handler; } }); return nodes.get(id); };
  t.mock.method(globalThis, 'fetch', async () => {});
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document'), oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  globalThis.document = { querySelector: node };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => '', setItem: () => {} } });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let view = { revision: 0, pill: { ownerId: 'shen' }, world: {} }, resolveSlow, requested;
  const actions = [];
  const makePlan = (id, title, action) => ({ id, title, rationale: '根据主药进度炼丹。', risk: '留意支出。', forecast: { stones: 20, hp: 100, reputation: 50, turns: 0, debt: 0 }, steps: [{ title: '按方炼丹', detail: '预计取得丹药。', action }] });
  const result = { source: 'model', modelName: 'deepseek-v4-flash', revision: 0, text: '选择方案', followUps: [], plans: [makePlan('a', '灵液催熟培药', { type: 'plant_pill_herbs' }), makePlan('b', '成熟主药炼丹', { type: 'refine_foundation_pill' })] };
  globalThis.fetch = async (path, options) => {
    requested = JSON.parse(options.body);
    if (requested.expectedRevision === 1) return new Promise(resolve => { resolveSlow = () => resolve({ ok: true, json: async () => ({ ...result, revision: 1 }) }); });
    return { ok: true, json: async () => structuredClone(result) };
  };
  const ui = createPlanUI({ getState: () => ({ view, busy: false }), executeAction: async action => { actions.push(action); return true; }, advance: () => {}, onStale: () => {}, notice: () => {} });
  try {
    ui.changed(); t.mock.timers.tick(600); await setImmediate();
    assert.match(node('#plan-options').innerHTML, /灵液催熟培药/);
    assert.match(node('#plan-options').innerHTML, /成熟主药炼丹/);
    assert.equal(node('#quest-track').disabled, false);
    node('#plan-options').listeners.click({ target: { closest: () => ({ dataset: { plan: 'b' } }) } });
    await ui.run(); assert.deepEqual(actions, [{ type: 'refine_foundation_pill' }]);
    view = { ...view, revision: 1 }; ui.changed();
    assert.equal(node('#quest-track').disabled, true); assert.equal(ui.next(), null);
    t.mock.timers.tick(600); await setImmediate();
    view = { ...view, revision: 2 }; ui.changed(); resolveSlow(); await setImmediate();
    assert.equal(ui.next(), null); assert.equal(node('#quest-track').disabled, true);
  } finally { ui.reset();
    for (const [key, descriptor] of [['document', oldDocument], ['localStorage', oldStorage]]) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } }
});

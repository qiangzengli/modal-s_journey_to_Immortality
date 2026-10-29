import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBattleEffects } from './battle-fx.js';
import { ITEMS, SKILLS } from './combat-data.js';

const kinds = ['slash', 'heavy_slash', 'blood_art', 'vermillion_ring', 'shield', 'escape', ...Object.keys(SKILLS), ...Object.keys(ITEMS).filter(id => ['pill', 'array'].includes(ITEMS[id].kind))];

test('every combat effect animates finite geometry and releases its resources', () => {
  for (const reducedMotion of [false, true]) for (const kind of kinds) {
    const scene = new THREE.Scene();
    const fx = createBattleEffects(THREE, scene);
    const from = new THREE.Vector3(-2.8, 0, 0), to = new THREE.Vector3(2.8, 0, 0);
    fx.spawn(kind, from, to, { start: 100, duration: 1000, reducedMotion });
    assert.deepEqual(from.toArray(), [-2.8, 0, 0]);
    assert.deepEqual(to.toArray(), [2.8, 0, 0]);
    const resources = new Map();
    scene.traverse(node => {
      for (const resource of [node.geometry, node.material, node.isInstancedMesh ? node : null].filter(Boolean)) {
        if (resources.has(resource)) continue;
        resources.set(resource, 0);
        resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource) + 1));
      }
    });
    assert.ok(resources.size > 0, `${kind} has a visual effect`);
    let visible = false;
    for (const time of [0, 100, 250, 450, 600, 800, 1099]) {
      fx.update(time);
      scene.updateMatrixWorld(true);
      scene.traverse(node => {
        assert.ok(node.matrixWorld.elements.every(Number.isFinite), `${kind}: finite transform`);
        if (node.geometry) assert.ok(Array.from(node.geometry.attributes.position.array).every(Number.isFinite), `${kind}: finite vertices`);
        if (node.material) {
          assert.ok(node.material.opacity >= 0 && node.material.opacity <= 1);
          visible ||= node.visible && node.material.opacity > 0;
        }
        if (node.isInstancedMesh) assert.ok(Array.from(node.instanceMatrix.array).every(Number.isFinite));
      });
    }
    assert.ok(visible, `${kind} is visible during its lifetime`);
    fx.update(1100);
    assert.equal(fx.activeCount, 0);
    assert.equal(scene.children.length, 0);
    assert.ok([...resources.values()].every(count => count === 1), `${kind}: resources disposed once`);
    fx.clear();
    assert.ok([...resources.values()].every(count => count === 1));
  }
});

test('scheduled counterattacks remain invisible and clearing cancels all effects', () => {
  const scene = new THREE.Scene();
  const fx = createBattleEffects(THREE, scene);
  const from = new THREE.Vector3(-3, 0, 0), to = new THREE.Vector3(3, 0, 0);
  for (const kind of kinds) fx.spawn(kind, from, to, { start: 2000 });
  fx.update(1000);
  scene.traverse(node => {
    if (node.material) assert.ok(!node.visible || node.material.opacity === 0);
  });
  fx.clear();
  fx.update(2500);
  assert.equal(scene.children.length, 0);
  assert.equal(fx.activeCount, 0);
});

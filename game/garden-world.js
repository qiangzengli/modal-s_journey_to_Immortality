import * as THREE from '/vendor/three.module.js';

export function createGardenWorld(scene, siteTargets, x, z) {
  const root = new THREE.Group();
  root.position.set(x + 1.6, 0, z - 0.9);
  scene.add(root);
  const stone = new THREE.MeshStandardMaterial({ color: 0x697565, roughness: .9 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xb1a777, metalness: .5, roughness: .4 });
  const jade = new THREE.MeshStandardMaterial({ color: 0x397e51, emissive: 0x245d36, emissiveIntensity: .35, roughness: .25, metalness: .35 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x86b765, emissive: 0x415d26, emissiveIntensity: .25 });
  function mesh(parent, geometry, material, px, py, pz) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(px, py, pz);
    object.castShadow = true; object.receiveShadow = true;
    object.userData.siteId = 'herbs';
    parent.add(object); siteTargets.push(object);
    return object;
  }
  mesh(root, new THREE.CylinderGeometry(.65, .8, .4, 7), stone, 0, .2, -.35);
  const bottle = new THREE.Group(); bottle.position.set(0, .4, -.35); root.add(bottle);
  const profile = [[0,0],[.22,0],[.31,.1],[.34,.4],[.29,.61],[.12,.75],[.12,.95],[.17,.98],[.17,1.05],[.1,1.08],[0,1.08]].map(([a,b]) => new THREE.Vector2(a,b));
  mesh(bottle, new THREE.LatheGeometry(profile, 16), jade, 0, 0, 0);
  mesh(bottle, new THREE.CylinderGeometry(.18, .18, .07, 12), gold, 0, 1.08, 0);
  const sigil = mesh(bottle, new THREE.TorusGeometry(.24, .018, 6, 24), gold, 0, .4, .24);
  sigil.scale.y = .8;
  const aura = mesh(root, new THREE.TorusGeometry(.68, .025, 6, 40), new THREE.MeshBasicMaterial({ color: 0xc2df9b, transparent: true, opacity: .55 }), 0, .08, -.35);
  aura.rotation.x = -Math.PI / 2;
  const drops = Array.from({ length: 3 }, (_, i) => {
    const drop = mesh(root, new THREE.OctahedronGeometry(.09), new THREE.MeshStandardMaterial({ color: 0xc8eeaf, emissive: 0x8bc78b, emissiveIntensity: 1 }), -.25 + i * .25, 1.9, -.35);
    return drop;
  });
  const plots = [-.85, .85].map(px => {
    const group = new THREE.Group(); group.position.set(px, 0, 1.1); root.add(group);
    mesh(group, new THREE.CylinderGeometry(.7, .55, .26, 8), stone, 0, .13, 0);
    mesh(group, new THREE.CylinderGeometry(.59, .59, .04, 12), new THREE.MeshStandardMaterial({ color: 0x443e2c }), 0, .28, 0);
    const plant = new THREE.Group(); plant.position.y = .3; group.add(plant);
    mesh(plant, new THREE.CylinderGeometry(.035, .06, .9, 6), leaf, 0, .45, 0);
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4;
      const blade = mesh(plant, new THREE.SphereGeometry(1, 7, 5), leaf, Math.cos(angle) * .16, .2 + i * .12, Math.sin(angle) * .16);
      blade.scale.set(.13, .05, .35); blade.rotation.set(0, -angle + Math.PI/2, .3);
    }
    mesh(plant, new THREE.OctahedronGeometry(.12), gold, 0, .98, 0);
    return { group, plant };
  });
  let state;
  return {
    sync(garden) {
      state = garden;
      jade.emissiveIntensity = garden?.bottle ? .55 : .15;
      for (let i = 0; i < plots.length; i++) {
        const plot = garden?.plots[i];
        plots[i].group.visible = Boolean(garden?.bottle && plot);
        plots[i].plant.visible = Boolean(plot?.planted);
        plots[i].plant.scale.setScalar(.35 + (plot?.growth || 0) / 4 * .65);
      }
      drops.forEach((drop, i) => { drop.visible = Boolean(garden?.bottle && i < garden.drops); });
    },
    update(elapsed, reducedMotion = false) {
      bottle.position.y = .4 + (reducedMotion ? 0 : Math.sin(elapsed * 1.5) * .05);
      aura.material.opacity = state?.stored ? .75 : .25;
      aura.scale.setScalar(state?.stored ? 1.18 : 1);
      drops.forEach((drop, i) => { drop.position.y = 1.8 + (reducedMotion ? 0 : Math.sin(elapsed * 2 + i) * .08); });
    }
  };
}

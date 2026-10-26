// 所有形状与时间只用于表现，不读取或修改战斗数值。
const clamp = value => Math.max(0, Math.min(1, value));
const phase = (time, start, end) => clamp((time - start) / (end - start));
const random = seed => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

export function playerEffect(choice) {
  if (choice.move === 'skill') return choice.skillId;
  if (choice.move === 'item') return choice.itemId;
  return { attack: 'slash', guard: 'shield', escape: 'escape' }[choice.move] || 'qi_bolt';
}
export function enemyEffect(id, intent) {
  if (intent === 'heal') return 'spring_art';
  if (intent === 'guard') return 'shield';
  if (id === 'peijin') return 'fire_art';
  if (id === 'mochi') return intent === 'heavy' ? 'thunder_art' : 'qi_bolt';
  if (id === 'suqin') return 'wind_blade';
  return intent === 'heavy' ? 'heavy_slash' : 'slash';
}

export function createBattleEffects(THREE, scene) {
  const active = new Set();
  function release(effect) {
    scene.remove(effect.root);
    const geometries = new Set(), materials = new Set();
    effect.root.traverse(node => {
      if (node.isInstancedMesh) node.dispose();
      if (node.geometry) geometries.add(node.geometry);
      if (node.material) materials.add(node.material);
    });
    for (const resource of [...geometries, ...materials]) resource.dispose();
    active.delete(effect);
  }
  function spawn(kind, from, to, { start = performance.now(), duration = 1000, reducedMotion = false } = {}) {
    const root = new THREE.Group();
    const updates = [];
    const source = from.clone().setY(1.25), target = to.clone().setY(1.25);
    const direction = target.x >= source.x ? 1 : -1;
    const effect = { root, updates, start, duration };
    scene.add(root); active.add(effect);
    function material(color, opacity = .8) {
      return new THREE.MeshBasicMaterial({ color, opacity, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false });
    }
    function mesh(geometry, color, opacity = .8) {
      const object = new THREE.Mesh(geometry, material(color, opacity));
      root.add(object); return object;
    }
    function animate(object, startAt, endAt, update) {
      const opacity = object.material.opacity;
      updates.push(time => {
        object.visible = time >= startAt && time < endAt;
        if (!object.visible) return;
        const p = phase(time, startAt, endAt);
        object.material.opacity = opacity * Math.min(1, p * 8) * (1 - p * p);
        update(p, time);
      });
      return object;
    }
    function pulse(center, color, size, startAt = .43, endAt = 1) {
      const object = mesh(new THREE.RingGeometry(.86, 1, 64), color, .65);
      object.rotation.x = -Math.PI / 2; object.position.copy(center).setY(.13);
      animate(object, startAt, endAt, p => object.scale.setScalar(size * (.25 + p)));
      return object;
    }
    function halo(center, color, size, startAt = .02, endAt = .45) {
      const object = mesh(new THREE.SphereGeometry(1, 16, 10), color, .25);
      object.position.copy(center);
      animate(object, startAt, endAt, p => object.scale.setScalar(size * Math.sin(p * Math.PI)));
      return object;
    }
    function streak(points, color, thickness = .035) {
      const path = new THREE.CurvePath();
      for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(points[i - 1], points[i]));
      return mesh(new THREE.TubeGeometry(path, Math.max(12, points.length * 3), thickness, 5, false), color);
    }
    function cloud(center, color, count, mode, startAt = .42, endAt = 1, size = 1) {
      const amount = reducedMotion ? Math.min(count, 12) : count;
      const object = new THREE.InstancedMesh(new THREE.OctahedronGeometry(.055, 0), material(color), amount);
      root.add(object); object.frustumCulled = false;
      const dummy = new THREE.Object3D();
      animate(object, startAt, endAt, p => {
        for (let i = 0; i < amount; i++) {
          const angle = random(i + 2) * Math.PI * 2;
          const speed = .6 + random(i + 91) * 1.4;
          if (mode === 'rise') {
            const spiral = angle + p * 4;
            dummy.position.set(center.x + Math.cos(spiral) * size * .65, .2 + p * 3.3 + random(i) * .4, center.z + Math.sin(spiral) * size * .65);
          } else if (mode === 'gather') {
            const radius = (1 - p) * size * 1.5;
            dummy.position.copy(center).add(new THREE.Vector3(Math.cos(angle) * radius, (random(i + 18) - .5) * radius, Math.sin(angle) * radius));
          } else {
            const radius = p * size * speed;
            dummy.position.copy(center).add(new THREE.Vector3(Math.cos(angle) * radius, (random(i + 18) - .2) * radius - p * p * .4, Math.sin(angle) * radius));
          }
          dummy.scale.setScalar((.6 + random(i + 40)) * (1 - p * .7));
          dummy.rotation.set(p * 4, angle, p * 7); dummy.updateMatrix(); object.setMatrixAt(i, dummy.matrix);
        }
        object.instanceMatrix.needsUpdate = true;
      });
    }
    function glyph(center, color, radius, startAt = .05) {
      for (const scale of [1, .78]) {
        const object = mesh(new THREE.RingGeometry(radius * scale - .025, radius * scale, 6), color, .8);
        object.position.copy(center).setY(.14); object.rotation.x = -Math.PI / 2;
        animate(object, startAt, 1, p => { object.rotation.z = p * (scale === 1 ? 1 : -1); object.scale.setScalar(.65 + Math.min(p * 3, .35)); });
      }
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const b = a + Math.PI * 2 / 3;
        const line = streak([new THREE.Vector3(Math.cos(a) * radius, .15, Math.sin(a) * radius), new THREE.Vector3(Math.cos(b) * radius, .15, Math.sin(b) * radius)], color, .018);
        line.position.copy(center).setY(0);
        animate(line, startAt, 1, () => {});
      }
    }
    function bolt(center, color, startAt = .3, offset = 0) {
      const points = Array.from({ length: 9 }, (_, i) => new THREE.Vector3(center.x + (i === 8 ? 0 : (random(i + offset + 70) - .5) * .85), -i * .6, center.z + (random(i + offset + 20) - .5) * .4));
      const lightning = streak(points, color, .055);
      lightning.position.y = 5.8;
      animate(lightning, startAt, .88, p => { lightning.scale.y = Math.min(1, p * 7); });
      const core = streak(points, 0xffffff, .017);
      core.position.y = 5.8;
      animate(core, startAt + .03, .82, p => { core.scale.y = Math.min(1, p * 7); });
      for (const side of [-1, 1]) {
        const branch = streak([points[3], points[3].clone().add(new THREE.Vector3(side * .65, -.6, .2)), points[3].clone().add(new THREE.Vector3(side, -1.2, .3))], color, .024);
        branch.position.y = 5.8;
        animate(branch, startAt + .08, .8, () => {});
      }
    }
    if (kind === 'slash' || kind === 'heavy_slash') {
      const heavy = kind === 'heavy_slash';
      for (let i = 0; i < (heavy ? 2 : 1); i++) {
        const crescent = mesh(new THREE.RingGeometry(.8, 1.08, 40, 1, 0, Math.PI * 1.3), heavy ? 0xf2bb84 : 0xf0e8c3);
        crescent.position.copy(target);
        animate(crescent, .16 + i * .11, .75 + i * .1, p => { crescent.rotation.set(.2, .3 * direction, direction * (p * 2.5 - 1.6) + i * 1.8); crescent.scale.setScalar((heavy ? 1.35 : 1) * (.6 + p * .6)); });
      }
      cloud(target, 0xffdc9c, 24, 'burst', .4, .98, 1.3);
    } else if (kind === 'qi_bolt') {
      cloud(source, 0x90e2f7, 28, 'gather', 0, .3, .9);
      const orb = mesh(new THREE.IcosahedronGeometry(.25, 2), 0xb6f3ff);
      const glow = mesh(new THREE.SphereGeometry(.48, 16, 10), 0x4bb8e4, .3);
      for (const object of [orb, glow]) animate(object, .15, .55, p => { object.position.lerpVectors(source, target, p); object.position.y += Math.sin(p * Math.PI) * .3; object.rotation.y = p * 8; });
      pulse(target, 0x86dafa, 1.4, .5); halo(target, 0x79cfff, 1, .5, .9); cloud(target, 0xb8edff, 35, 'burst', .5, 1, 1.6);
    } else if (kind === 'wind_blade') {
      for (let i = 0; i < 3; i++) {
        const blade = mesh(new THREE.RingGeometry(.58, .75, 32, 1, -.8, Math.PI * 1.3), 0xc9f7a7);
        animate(blade, .06 + i * .12, .55 + i * .12, p => { blade.position.lerpVectors(source, target, p); blade.position.y += (i - 1) * .43; blade.position.z += Math.sin(p * Math.PI) * (i - 1) * .5; blade.rotation.set(.2, .2, direction * (p * 2 - 1)); });
      }
      cloud(target, 0xb9e9a0, 35, 'burst', .48, 1, 1.8); pulse(target, 0xa6dab6, 1.4, .5);
    } else if (kind === 'fire_art') {
      halo(source, 0xff952f, .65, 0, .3);
      const fireball = mesh(new THREE.IcosahedronGeometry(.43, 2), 0xffbb49);
      const shell = mesh(new THREE.SphereGeometry(.65, 14, 10), 0xff622b, .4);
      for (const object of [fireball, shell]) animate(object, .12, .53, p => { object.position.lerpVectors(source, target, p); object.position.y += Math.sin(p * Math.PI) * .45; object.rotation.set(p * 5, p * 8, 0); });
      for (let i = 0; i < 7; i++) {
        const flame = mesh(new THREE.ConeGeometry(.26, 1.7, 6), i % 2 ? 0xffd05a : 0xff792f, .8);
        const angle = i / 7 * Math.PI * 2;
        animate(flame, .45, 1, p => { flame.position.set(target.x + Math.cos(angle + p) * p, .25 + p * 1.2, target.z + Math.sin(angle + p) * p); flame.scale.set(1 - p * .6, .4 + Math.sin(p * Math.PI) * 1.3, 1 - p * .6); });
      }
      pulse(target, 0xff8d36, 1.8, .45); cloud(target, 0xffc56a, 42, 'rise', .45, 1, 1.1);
    } else if (kind === 'thunder_art') {
      glyph(target, 0xae9cff, 1.3); bolt(target, 0xbaacff);
      halo(target, 0xb0cfff, 1.1, .38, .75); pulse(target, 0xbbbdff, 1.6, .37); cloud(target, 0xd8dcff, 38, 'burst', .4, 1, 1.6);
    } else if (kind === 'spring_art' || kind === 'healing_pill' || kind === 'spirit_pill') {
      const mana = kind === 'spirit_pill';
      const herbal = kind === 'spring_art';
      const color = mana ? 0x85c9ff : herbal ? 0x8ce8b3 : 0xffd68f;
      pulse(source, color, herbal ? 1.5 : 1, .02); cloud(source, color, 32, mana ? 'gather' : 'rise', .05, 1, 1.15);
      if (herbal) {
        for (let i = 0; i < 6; i++) {
          const petal = mesh(new THREE.SphereGeometry(.45, 10, 6), color, .32);
          const angle = i * Math.PI / 3;
          animate(petal, .08, .95, p => { petal.position.set(source.x + Math.cos(angle) * .65, .25 + p * .5, source.z + Math.sin(angle) * .65); petal.scale.set(.4, .15 + p * .4, 1.2); petal.rotation.y = -angle; });
        }
      } else {
        for (let i = 0; i < 3; i++) {
          const orbit = mesh(new THREE.TorusGeometry(.65, .026, 5, 40), color);
          orbit.position.copy(source);
          animate(orbit, .08, .95, p => { orbit.rotation.set(i * 1.1, p * 5, p * 2 + i); orbit.scale.setScalar(.6 + Math.sin(p * Math.PI) * .5); });
        }
      }
    } else if (kind === 'shield') {
      const shield = mesh(new THREE.SphereGeometry(1.12, 20, 14), 0x78c4de, .17); shield.position.copy(source);
      animate(shield, .03, 1, p => shield.scale.setScalar(.85 + Math.sin(p * Math.PI) * .2));
      const edge = mesh(new THREE.RingGeometry(.85, .91, 6), 0xa9e2ee, .8); edge.position.copy(source); edge.position.x += direction * .35; edge.rotation.y = Math.PI / 2;
      animate(edge, .04, 1, p => { edge.rotation.z = p * .8; edge.scale.setScalar(.8 + Math.sin(p * Math.PI) * .25); });
      pulse(source, 0x85c6dd, 1.1, .02);
    } else if (kind === 'binding_array') {
      glyph(target, 0xc1a1f3, 1.45);
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        const points = Array.from({length: 14}, (_, n) => new THREE.Vector3(Math.cos(angle + n * .13) * .85, .15 + n * .22, Math.sin(angle + n * .13) * .85));
        const chain = streak(points, 0xb8a5ee, .027); chain.position.copy(target).setY(0);
        animate(chain, .18, 1, p => { chain.scale.y = Math.min(1, p * 3); chain.rotation.y = p * .45; });
      }
      pulse(target, 0xc5a9f5, 1.7, .3);
    } else if (kind === 'thunder_array') {
      glyph(target, 0xffbe77, 1.65);
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2;
        const center = target.clone().add(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
        const pillar = mesh(new THREE.CylinderGeometry(.08, .22, 2.7, 8), 0xff983e, .65);
        pillar.position.copy(center).setY(1.45);
        animate(pillar, .18 + i * .04, .94, p => pillar.scale.setScalar(Math.sin(p * Math.PI)));
        if (i % 2 === 0) bolt(center, 0xf8c67c, .32 + i * .08, i * 4);
      }
      pulse(target, 0xffa848, 2, .4); cloud(target, 0xffcf83, 40, 'burst', .5, 1, 2);
    } else if (kind === 'escape') {
      for (let i = 0; i < 7; i++) {
        const smoke = mesh(new THREE.IcosahedronGeometry(.45, 1), 0x9baeb0, .18);
        animate(smoke, i * .035, .96, p => { smoke.position.copy(source).add(new THREE.Vector3(-direction * p * (1 + i * .12), p * .6 + (i % 3) * .3, Math.sin(i) * p)); smoke.scale.setScalar(.3 + p * 1.4); });
      }
      cloud(source, 0xc3d3c9, 20, 'burst', .08, .9, 1);
    }
    // 初始帧不闪现尚未到时的几何体。
    for (const update of updates) update(0);
    return effect;
  }
  function update(now = performance.now()) {
    for (const effect of active) {
      const time = (now - effect.start) / effect.duration;
      if (time >= 1) release(effect);
      else for (const update of effect.updates) update(Math.max(0, time));
    }
  }
  function clear() { for (const effect of [...active]) release(effect); }
  return { spawn, update, clear, get activeCount() { return active.size; } };
}

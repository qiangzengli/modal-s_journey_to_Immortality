import * as THREE from '/vendor/three.module.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, ...extra });
function mesh(group, geometry, material, x, y, z) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.receiveShadow = true;
  group.add(object);
  return object;
}

// 原创程序化布景；固定序列保证每次读档的景物位置一致。
export function decorateWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const stone = mat(0x697a71);
  const wood = mat(0x68513b);
  const brass = mat(0xbba16b, { metalness: 0.45, roughness: 0.45 });
  const water = mesh(group, new THREE.PlaneGeometry(290, 130), mat(0x274e4d, { metalness: 0.32, roughness: 0.35 }), 75, -0.75, 0);
  water.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 24; i++) {
    const angle = i / 24 * Math.PI * 2;
    const radiusX = 38 + (i % 4) * 3;
    const radiusZ = 23 + (i % 5) * 2;
    const height = 5 + (i * 7 % 11);
    const mountain = mesh(group, new THREE.ConeGeometry(4 + i % 4, height, 5), mat([0x415b56, 0x52685d, 0x3a5653][i % 3]), Math.cos(angle) * radiusX, height / 2 - 1, Math.sin(angle) * radiusZ);
    if(mountain.position.x>29&&Math.abs(mountain.position.z)<25)mountain.position.z=mountain.position.z<0?-28:28;
    mountain.rotation.y = i * 0.41;
    mountain.castShadow = true;
  }
  // 石板路与石砌岸边。
  const paving = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.045, 0.82), mat(0xa29b82), 102);
  const dummy = new THREE.Object3D();
  let index = 0;
  for (let x = -27; x <= 27; x += 1.65) for (const z of [-1.55, -0.53, 0.52]) {
    dummy.position.set(x + (z > 0 ? 0.18 : 0), 0.04, z);
    dummy.rotation.set(0, Math.sin(x * 3) * 0.025, 0);
    dummy.updateMatrix();
    paving.setMatrixAt(index++, dummy.matrix);
  }
  paving.count = index;
  paving.receiveShadow = true;
  group.add(paving);
  for (let i = 0; i < 40; i++) {
    const x = -28.5 + i * 1.46;
    for (const z of [-13.1, 13.1]) mesh(group, new THREE.DodecahedronGeometry(0.58 + (i % 3) * 0.1), stone, x, -0.1, z);
  }
  // 草丛采用实例化，避免为每片草增加单独的绘制调用。
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.11, 0.48, 3), mat(0x74916c), 420);
  let grassCount = 0;
  for (let i = 0; i < 620; i++) {
    const x = -27 + (i * 17.431 % 54);
    const z = -11.8 + (i * 8.713 % 23.6);
    if (Math.abs(z) < 3 || (x < 0 && Math.abs(z) > 5)) continue;
    dummy.position.set(x, 0.18, z);
    dummy.rotation.set(0, i, 0.1 * Math.sin(i));
    dummy.scale.setScalar(0.6 + (i % 5) * 0.17);
    dummy.updateMatrix();
    grass.setMatrixAt(grassCount++, dummy.matrix);
    if (grassCount >= 420) break;
  }
  grass.count = grassCount;
  group.add(grass);
  // 摊位周围的陶罐、木箱与药卷。
  for (const [x, z] of [[-16.9, -7], [-10.8, -8], [-22, 6], [-12, -10]]) {
    const crate = mesh(group, new THREE.BoxGeometry(0.75, 0.65, 0.75), wood, x, 0.34, z);
    crate.castShadow = true;
    for (const dy of [-0.17, 0.17]) mesh(group, new THREE.BoxGeometry(0.8, 0.065, 0.8), brass, x, 0.34 + dy, z);
    const pot = mesh(group, new THREE.SphereGeometry(0.28, 9, 7), mat(0x856849), x + 0.55, 0.3, z + 0.25);
    pot.scale.y = 1.2;
    mesh(group, new THREE.CylinderGeometry(0.17, 0.18, 0.1, 9), mat(0x463c31), x + 0.55, 0.63, z + 0.25);
  }
  // 飘幡与池面波纹。
  const banners = [];
  for (const [x, z, color] of [[-12, -7, 0x94704d], [-22, -5.6, 0x756185], [-4.3, 6, 0x95594a]]) {
    mesh(group, new THREE.CylinderGeometry(0.045, 0.055, 3.6, 6), wood, x, 1.8, z);
    const banner = mesh(group, new THREE.PlaneGeometry(0.9, 1.55, 4, 8), mat(color, { side: THREE.DoubleSide }), x + 0.48, 2.6, z);
    banners.push(banner);
  }
  const rippleMaterial = new THREE.MeshBasicMaterial({ color: 0x8cb3a2, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false });
  const ripples = [];
  for (let i = 0; i < 12; i++) {
    const ripple = mesh(group, new THREE.RingGeometry(1.5, 1.52, 40), rippleMaterial.clone(), -30 + i * 5.4, -0.71, i % 2 ? -17 : 17);
    ripple.rotation.x = -Math.PI / 2;
    ripples.push(ripple);
  }
  const motesPositions = new Float32Array(120 * 3);
  for (let i = 0; i < 120; i++) { motesPositions[i * 3] = -25 + (i * 13.713 % 50); motesPositions[i * 3 + 1] = 0.6 + (i * 1.513 % 4); motesPositions[i * 3 + 2] = -11 + (i * 7.313 % 22); }
  const motesGeometry = new THREE.BufferGeometry();
  motesGeometry.setAttribute('position', new THREE.BufferAttribute(motesPositions, 3));
  const motes = new THREE.Points(motesGeometry, new THREE.PointsMaterial({ color: 0xe6d7a1, size: 0.08, transparent: true, opacity: 0.6, depthWrite: false }));
  group.add(motes);
  const pulses = [];
  return {
    burst(position, color = 0xe9c87b) {
      const pulse = mesh(group, new THREE.RingGeometry(0.6, 0.75, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false }), position.x, 0.12, position.z);
      pulse.rotation.x = -Math.PI / 2;
      pulses.push({ object: pulse, life: 0 });
    },
    update(time, dt) {
      for (const banner of banners) {
        const positions = banner.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) positions.setZ(i, Math.sin(time * 2.2 + positions.getY(i) * 2.6) * 0.09);
        positions.needsUpdate = true;
      }
      ripples.forEach((ripple, i) => { const phase = (time * 0.15 + i / 12) % 1; ripple.scale.setScalar(0.8 + phase * 2.5); ripple.material.opacity = (1 - phase) * 0.13; });
      motes.rotation.y = Math.sin(time * 0.025) * 0.04;
      motes.position.y = Math.sin(time * 0.5) * 0.15;
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]; p.life += dt;
        p.object.scale.setScalar(1 + p.life * 6);
        p.object.material.opacity = Math.max(0, 1 - p.life / 1.2);
        if (p.life > 1.2) { group.remove(p.object); p.object.geometry.dispose(); p.object.material.dispose(); pulses.splice(i, 1); }
      }
    }
  };
}

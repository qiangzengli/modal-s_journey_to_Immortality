import * as THREE from '/vendor/three.module.js';
import { decorateWorld } from './scenery.js';

const NPC_SPOTS = {
  shen: { market: [-15, -4], woods: [12, -3] },
  bai: { market: [-19, 3] },
  xu: { market: [-10, 5] },
  lu: { market: [-5, -4] },
  qing: { market: [-22, -5] },
  wei: { market: [-13, -6], woods: [10, -5] },
  han: { woods: [16, 5] },
  ning: { market: [-7, 5] }
};

const SITE_SPOTS = { herbs: [20, 2], formation: [15, -6.5], camp: [25, -7] };
const FOREST_TREES = [
  [5, -10, 1], [8, -8, 1.25], [13, -10, 1.1], [19, -9, 1.4], [25, -10, 1],
  [4, 8, 1.2], [7, 10, 1.4], [12, 9, 1], [18, 10, 1.3], [24, 8, 1.1],
  [6, -5, 0.8], [22, -5, 1], [4, 5, 0.9], [23, 5, 1.2]
];
const FOREST_ROCKS = [[9, 5], [18, -4], [25, 2]];
const MARKET_BLOCKERS = [
  [-25, -9, 3.35, 2.55], [-17, 9, 3.5, 2.6], [-6, 9, 3.25, 2.55],
  [-15, -7.9, 1.9, 1.25], [-9, -8.2, 1.9, 1.25], [-21, 7.3, 1.9, 1.25]
];

const COLORS = {
  player: { robe: 0x637d89, trim: 0xd8c38f, skin: 0xe1b89b, hair: 0x202724 },
  shen: { robe: 0x81623c, trim: 0xd4b27a, skin: 0xcfa786, hair: 0x252721 },
  bai: { robe: 0x638a78, trim: 0xc9dabb, skin: 0xedd0b1, hair: 0x292a27 },
  xu: { robe: 0x607b99, trim: 0xb2c8d9, skin: 0xdbb398, hair: 0x24282d },
  lu: { robe: 0x925b4d, trim: 0xd9bd85, skin: 0xd4a98d, hair: 0x242624 },
  qing: { robe: 0x77668d, trim: 0xbba689, skin: 0xd8af91, hair: 0x24242b },
  wei: { robe: 0x596d66, trim: 0xc6c8ad, skin: 0xc7a283, hair: 0x212823 },
  han: { robe: 0x413e42, trim: 0xab6b55, skin: 0xb98d75, hair: 0x1d2020 },
  ning: { robe: 0xb1a486, trim: 0x70685e, skin: 0xe2bb9e, hair: 0x272926 }
};

const WOODS = 'woods';
const MARKET = 'market';
const MOVE_SPEED = 7;

function material(color, roughness = 0.85, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function put(parent, geometry, mat, x, y, z, rotation = 0) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotation;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function label(text, { width = 320, font = 34, color = '#f5eacb', backdrop = '#21302be0' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 88;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = backdrop;
  ctx.beginPath();
  ctx.roundRect(3, 8, width - 6, 70, 18);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ac956a';
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `600 ${font}px "PingFang SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, 44);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(width / 108, 0.81, 1);
  return sprite;
}

function makePerson(id, name) {
  const colors = COLORS[id];
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const robe = material(colors.robe);
  const trim = material(colors.trim, 0.7, 0.1);
  const skin = material(colors.skin);
  const hair = material(colors.hair);
  const leather = material(0x382e25);

  put(body, new THREE.CylinderGeometry(0.3, 0.53, 1.25, 9), robe, 0, 0.9, 0);
  put(body, new THREE.BoxGeometry(0.1, 0.86, 0.05), trim, 0, 1.05, 0.3);
  put(body, new THREE.CylinderGeometry(0.35, 0.36, 0.1, 9), leather, 0, 0.75, 0);
  put(body, new THREE.SphereGeometry(0.32, 12, 10), skin, 0, 1.84, 0);
  const hairCap = put(body, new THREE.SphereGeometry(0.332, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 1.98, 0);
  hairCap.rotation.y = 0.2;
  put(body, new THREE.SphereGeometry(0.028, 6, 6), leather, -0.105, 1.85, 0.29);
  put(body, new THREE.SphereGeometry(0.028, 6, 6), leather, 0.105, 1.85, 0.29);
  const leftArm = put(body, new THREE.CylinderGeometry(0.14, 0.2, 0.88, 7), robe, -0.48, 1.23, 0, -0.12);
  const rightArm = put(body, new THREE.CylinderGeometry(0.14, 0.2, 0.88, 7), robe, 0.48, 1.23, 0, 0.12);
  for (const side of [-1, 1]) {
    put(body, new THREE.SphereGeometry(0.115, 8, 6), skin, side * 0.48, 0.77, 0.02);
    put(body, new THREE.CylinderGeometry(0.205, 0.205, 0.09, 8), trim, side * 0.48, 0.84, 0);
    const lapel = put(body, new THREE.BoxGeometry(0.085, 0.59, 0.05), trim, side * 0.10, 1.32, 0.31);
    lapel.rotation.z = side * 0.32;
    put(body, new THREE.BoxGeometry(0.12, 0.026, 0.035), hair, side * 0.105, 1.93, 0.29);
  }
  put(body, new THREE.ConeGeometry(0.044, 0.11, 5), skin, 0, 1.82, 0.32).rotation.x = Math.PI / 2;
  put(body, new THREE.BoxGeometry(0.1, 0.025, 0.02), leather, 0, 1.71, 0.285);
  put(body, new THREE.TorusGeometry(0.37, 0.035, 5, 10), trim, 0, 0.76, 0).rotation.x = Math.PI / 2;
  put(body, new THREE.BoxGeometry(0.25, 0.21, 0.37), leather, -0.2, 0.13, 0.03);
  put(body, new THREE.BoxGeometry(0.25, 0.21, 0.37), leather, 0.2, 0.13, 0.03);
  put(body, new THREE.CylinderGeometry(0.13, 0.15, 0.25, 9), hair, 0, 2.24, -0.12);
  put(body, new THREE.SphereGeometry(0.14, 8, 6), trim, 0, 2.36, -0.1);

  if (id === 'shen' || id === 'bai') {
    put(body, new THREE.BoxGeometry(0.46, 0.43, 0.23), material(0x78543a), 0, 0.88, -0.43);
    put(body, new THREE.BoxGeometry(0.48, 0.06, 0.28), trim, 0, 1.12, -0.43);
  }
  if (['wei', 'xu', 'lu', 'han'].includes(id)) {
    const blade = put(body, new THREE.BoxGeometry(0.075, 1.28, 0.09), material(0xa9b1a9, 0.32, 0.7), 0.63, 0.95, -0.25);
    blade.rotation.z = -0.15;
    put(body, new THREE.BoxGeometry(0.32, 0.07, 0.15), trim, 0.63, 0.42, -0.25);
  }
  if (id === 'qing') {
    put(body, new THREE.CylinderGeometry(0.66, 0.65, 0.09, 16), material(0x534858), 0, 2.13, 0);
  }
  if (id === 'ning') {
    put(body, new THREE.CylinderGeometry(0.15, 0.15, 0.55, 10), material(0xc4af79), 0.7, 1.05, 0.05, Math.PI / 2);
  }
  if (id === 'player') {
    const cape = put(body, new THREE.ConeGeometry(0.62, 1.25, 9, 1, true), material(0x354b5c, 0.75, 0.05), 0, 1.02, -0.08);
    cape.rotation.y = Math.PI;
    const scabbard = put(body, new THREE.BoxGeometry(0.12, 1.5, 0.13), leather, -0.23, 1.30, -0.4);
    scabbard.rotation.z = -0.3;
    put(body, new THREE.BoxGeometry(0.4, 0.07, 0.16), trim, -0.03, 1.86, -0.4);
  }
  if (id === 'bai' || id === 'ning') put(body, new THREE.CylinderGeometry(0.17, 0.1, 0.85, 7), hair, 0, 1.6, -0.25);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.74, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.27, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);
  if (name) {
    const nameplate = label(name, { width: 230, font: 37 });
    nameplate.position.y = 3.16;
    root.add(nameplate);
  }
  root.userData = { id, body, leftArm, rightArm, baseY: 0 };
  root.traverse(child => { child.userData.personId = id; });
  return root;
}

function makeStall(scene, x, z, cloth, rotation = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = rotation;
  scene.add(root);
  const wood = material(0x6a4b34);
  put(root, new THREE.BoxGeometry(2.9, 0.2, 1.5), wood, 0, 0.97, 0);
  for (const sx of [-1.25, 1.25]) for (const sz of [-0.56, 0.56]) {
    put(root, new THREE.CylinderGeometry(0.085, 0.085, 2.3, 6), wood, sx, 1.25, sz);
  }
  const roof = put(root, new THREE.BoxGeometry(3.35, 0.18, 1.9), material(cloth), 0, 2.42, 0);
  roof.rotation.z = -0.05;
  for (let i = -1; i <= 1; i++) {
    put(root, new THREE.CylinderGeometry(0.13, 0.15, 0.35, 7), material(0x9a7752), i * 0.8, 1.22, -0.24);
  }
  return root;
}

function makeBuilding(scene, x, z, width, depth, roofColor, title) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  scene.add(root);
  put(root, new THREE.BoxGeometry(width, 3.4, depth), material(0x494b3b), 0, 1.7, 0);
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-width * 0.64, 0.12);
  roofShape.lineTo(-width * 0.46, 0.28);
  roofShape.lineTo(0, 1.65);
  roofShape.lineTo(width * 0.46, 0.28);
  roofShape.lineTo(width * 0.64, 0.12);
  roofShape.lineTo(width * 0.58, -0.12);
  roofShape.lineTo(0, 1.33);
  roofShape.lineTo(-width * 0.58, -0.12);
  roofShape.closePath();
  put(root, new THREE.ExtrudeGeometry(roofShape, { depth: depth * 1.28, bevelEnabled: false }), material(roofColor), 0, 3.45, -depth * 0.64);
  put(root, new THREE.CylinderGeometry(0.11, 0.11, depth * 1.4, 8), material(0xb29b70), 0, 5.10, 0).rotation.x = Math.PI / 2;
  for (let z = -depth * 0.63; z <= depth * 0.64; z += 0.38) {
    const points = [[-width * 0.63, 3.59, z], [-width * 0.46, 3.75, z], [0, 5.12, z], [width * 0.46, 3.75, z], [width * 0.63, 3.59, z]].map(p => new THREE.Vector3(...p));
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x35473f, transparent: true, opacity: 0.5 })));
  }
  for (const side of [-1, 1]) {
    put(root, new THREE.BoxGeometry(0.15, 3.5, depth + 0.15), material(0x73553c), side * width * 0.44, 1.75, 0);
    put(root, new THREE.BoxGeometry(1.0, 1.0, 0.06), material(0xb39c69), side * width * 0.28, 2.0, depth / 2 + 0.10);
    for (let i = -1; i <= 1; i++) put(root, new THREE.BoxGeometry(0.055, 1.05, 0.08), material(0x4c3f2f), side * width * 0.28 + i * 0.3, 2.0, depth / 2 + 0.14);
  }
  put(root, new THREE.BoxGeometry(1.1, 2.25, 0.15), material(0x2b2d28), 0, 1.12, depth / 2 + 0.08);
  const sign = label(title, { width: 270, font: 29 });
  sign.position.set(0, 3.08, depth / 2 + 0.25);
  root.add(sign);
  return root;
}

function makeTree(scene, x, z, size = 1) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.scale.setScalar(size);
  scene.add(root);
  put(root, new THREE.CylinderGeometry(0.27, 0.42, 2.3, 7), material(0x5d4b37), 0, 1.15, 0);
  const greens = [0x415a45, 0x526a4c, 0x314c3f];
  for (let i = 0; i < 3; i++) put(root, new THREE.ConeGeometry(1.25 - i * 0.19, 2.45, 7), material(greens[i]), 0, 2.15 + i * 0.85, 0);
  return root;
}

function makeLantern(scene, x, z) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  scene.add(root);
  put(root, new THREE.CylinderGeometry(0.07, 0.08, 2.75, 8), material(0x6e5940), 0, 1.38, 0);
  put(root, new THREE.BoxGeometry(0.55, 0.59, 0.55), new THREE.MeshStandardMaterial({ color: 0xe4ad66, emissive: 0xb37630, emissiveIntensity: 0.45 }), 0, 2.6, 0);
  put(root, new THREE.ConeGeometry(0.45, 0.34, 4), material(0x4c3f31), 0, 3.04, 0, Math.PI / 4);
  const light = new THREE.PointLight(0xffca88, 4, 7);
  light.position.set(0, 2.6, 0);
  root.add(light);
}

function createTerrain(scene, clickSurfaces, gateTargets, siteTargets, obstacleTargets) {
  const market = put(scene, new THREE.BoxGeometry(29, 0.4, 26), material(0x566052), -14.5, -0.25, 0);
  const woods = put(scene, new THREE.BoxGeometry(29, 0.4, 26), material(0x3b5141), 14.5, -0.25, 0);
  clickSurfaces.push(market, woods);
  put(scene, new THREE.BoxGeometry(58, 0.05, 4.5), material(0x8b826b), 0, 0.006, 0);
  put(scene, new THREE.BoxGeometry(28, 0.04, 1.1), material(0x9c9278), -15, 0.027, -6.4);
  for (let i = 0; i < 80; i++) {
    const x = -27 + ((i * 17.73) % 54);
    const z = -11 + ((i * 9.41) % 22);
    if (Math.abs(z) < 3) continue;
    const stone = put(scene, new THREE.DodecahedronGeometry(0.1 + (i % 4) * 0.035), material(x < 0 ? 0x757967 : 0x657262), x, 0.03, z);
    stone.rotation.y = i * 0.5;
  }
  obstacleTargets.push(makeBuilding(scene, -25, -9, 6.2, 4.6, 0x5b503c, '青闻牙行'));
  obstacleTargets.push(makeBuilding(scene, -17, 9, 6.5, 4.7, 0x566651, '百草药铺'));
  obstacleTargets.push(makeBuilding(scene, -6, 9, 6, 4.6, 0x655747, '巡坊司'));
  obstacleTargets.push(makeStall(scene, -15, -7.9, 0x957456));
  obstacleTargets.push(makeStall(scene, -9, -8.2, 0x707d62));
  obstacleTargets.push(makeStall(scene, -21, 7.3, 0x806356, Math.PI));
  makeLantern(scene, -2.9, -2.8);
  makeLantern(scene, -2.9, 2.8);
  makeLantern(scene, -24.2, 1.8);

  // 界门连接两处场景，可自由往返。
  const gate = new THREE.Group();
  gate.position.set(0, 0, 0);
  scene.add(gate);
  put(gate, new THREE.BoxGeometry(0.65, 5.2, 0.72), material(0x62685a), 0, 2.6, -2.5);
  put(gate, new THREE.BoxGeometry(0.65, 5.2, 0.72), material(0x62685a), 0, 2.6, 2.5);
  put(gate, new THREE.BoxGeometry(0.8, 0.75, 5.9), material(0x737a68), 0, 5.1, 0);
  const gateSign = label('黑风林 · 坊市', { width: 340, font: 27 });
  gateSign.position.set(0, 6.1, 0);
  gate.add(gateSign);
  gate.traverse(child => { child.userData.isGate = true; });
  const gateHitbox = put(gate, new THREE.BoxGeometry(2.2, 5.8, 5.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0, 2.9, 0);
  gateHitbox.castShadow = false;
  gateTargets.push(gateHitbox);

  FOREST_TREES.forEach(([x, z, size]) => obstacleTargets.push(makeTree(scene, x, z, size)));
  for (const [x, z] of FOREST_ROCKS) {
    const stone = put(scene, new THREE.DodecahedronGeometry(1.2, 0), material(0x6a7066), x, 0.53, z);
    stone.rotation.set(0.2, 0.5, 0.1);
    obstacleTargets.push(stone);
  }
  const array = new THREE.Group();
  array.position.set(15, 0.03, -6.5);
  scene.add(array);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.55, 32), new THREE.MeshBasicMaterial({ color: 0xc49e69, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  array.add(ring);
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    put(array, new THREE.CylinderGeometry(0.2, 0.27, 1.2, 7), material(0x77796c), Math.sin(angle) * 1.8, 0.6, Math.cos(angle) * 1.8);
  }
  const arrayLabel = label('天雷阵位', { width: 250, font: 31 });
  arrayLabel.position.y = 2.45;
  arrayLabel.userData.siteId = 'formation';
  array.add(arrayLabel);
  siteTargets.push(arrayLabel);
  const arrayTarget = put(array, new THREE.CylinderGeometry(2, 2, 1.5, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0, 0.75, 0);
  arrayTarget.userData.siteId = 'formation';
  arrayTarget.castShadow = false;
  siteTargets.push(arrayTarget);

  const herbPatch = new THREE.Group();
  herbPatch.position.set(SITE_SPOTS.herbs[0], 0, SITE_SPOTS.herbs[1]);
  scene.add(herbPatch);
  for (const [x, z, size] of [[-0.7, 0.1, 0.8], [0, -0.4, 1], [0.8, 0.3, 0.9], [0.3, 0.8, 0.7]]) {
    put(herbPatch, new THREE.ConeGeometry(0.2 * size, 0.95 * size, 5), material(0x77a66c), x, 0.48 * size, z);
    put(herbPatch, new THREE.SphereGeometry(0.13 * size, 8, 6), new THREE.MeshStandardMaterial({ color: 0xa8ca7d, emissive: 0x3b562b, emissiveIntensity: 0.5 }), x, 0.9 * size, z);
  }
  const herbLabel = label('灵草坡', { width: 220, font: 34 });
  herbLabel.position.y = 2.2;
  herbLabel.userData.siteId = 'herbs';
  herbPatch.add(herbLabel);
  siteTargets.push(herbLabel);
  const herbTarget = put(herbPatch, new THREE.CylinderGeometry(1.55, 1.55, 1.8, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0, 0.9, 0);
  herbTarget.userData.siteId = 'herbs';
  herbTarget.castShadow = false;
  siteTargets.push(herbTarget);
  const camp = new THREE.Group();
  camp.position.set(SITE_SPOTS.camp[0], 0, SITE_SPOTS.camp[1]);
  scene.add(camp);
  put(camp, new THREE.CylinderGeometry(1.65, 1.85, 0.2, 8), material(0x7f8875), 0, 0.1, 0);
  for (const x of [-1.15, 1.15]) for (const z of [-1.15, 1.15]) put(camp, new THREE.CylinderGeometry(0.07, 0.09, 2.5, 7), material(0x70523a), x, 1.45, z);
  put(camp, new THREE.ConeGeometry(2.1, 0.9, 4), material(0x4e6b62), 0, 3.0, 0, Math.PI / 4);
  put(camp, new THREE.CylinderGeometry(0.60, 0.65, 0.12, 16), material(0xaa9a6a), 0, 0.27, 0);
  const campLabel = label('听雨亭 · 调息', { width: 300, font: 29 });
  campLabel.position.y = 4;
  campLabel.userData.siteId = 'camp';
  camp.add(campLabel);
  const campTarget = put(camp, new THREE.BoxGeometry(3.2, 3.1, 3.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0, 1.6, 0);
  campTarget.userData.siteId = 'camp';
  campTarget.castShadow = false;
  siteTargets.push(campTarget, campLabel);
  return { herbPatch, arrayRing: ring };
}

export function createWorld(container, { onSelectPerson, onSelectSite, onClearPerson, onTravel, onHint, miniMap }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x304d49);
  scene.fog = new THREE.Fog(0x304d49, 43, 100);
  const camera = new THREE.OrthographicCamera(-16, 16, 10, -10, 0.1, 120);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.appendChild(renderer.domElement);
  const ambient = new THREE.HemisphereLight(0xc6e0dc, 0x38493d, 2.1);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffdfa3, 2.7);
  sun.position.set(-7, 23, 15);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -37; sun.shadow.camera.right = 37;
  sun.shadow.camera.top = 26; sun.shadow.camera.bottom = -26;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const clickSurfaces = [];
  const gateTargets = [];
  const siteTargets = [];
  const obstacleTargets = [];
  const terrain = createTerrain(scene, clickSurfaces, gateTargets, siteTargets, obstacleTargets);
  const scenery = decorateWorld(scene);
  const player = makePerson('player', '你');
  scene.add(player);
  const people = Object.fromEntries(Object.keys(NPC_SPOTS).map(id => {
    const actor = makePerson(id, { shen: '沈秋', bai: '白芷', xu: '徐宁', lu: '陆执事', qing: '青闻', wei: '魏守', han: '寒沙', ning: '宁素' }[id]);
    scene.add(actor);
    return [id, actor];
  }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.88, 32), new THREE.MeshBasicMaterial({ color: 0xecc579, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.visible = false;
  scene.add(ring);
  const destinationMarker = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.44, 32), new THREE.MeshBasicMaterial({ color: 0xe4d196, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
  destinationMarker.rotation.x = -Math.PI / 2;
  destinationMarker.visible = false;
  scene.add(destinationMarker);
  const routeLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xdfc587, transparent: true, opacity: 0.55 }));
  scene.add(routeLine);
  const pillAura = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 6, 32), new THREE.MeshBasicMaterial({ color: 0xf0c46a, transparent: true, opacity: 0.7 }));
  scene.add(pillAura);

  let place = MARKET;
  let initialized = false;
  let selectedId = null;
  let selectedSiteId = null;
  let destination = null;
  let route = [];
  let afterWalk = null;
  let travelPending = false;
  let travelArmed = true;
  let pointerDown = null;
  let zoom = 23;
  let azimuth = Math.atan2(18, 19);
  let busy = false;
  let mapTimer = 0;
  const keys = new Set();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const cameraFocus = new THREE.Vector3(-16, 0, 0);
  let lastFrameTime = performance.now();
  let elapsed = 0;
  let view;

  function resize() {
    const width = Math.max(320, container.clientWidth);
    const height = Math.max(300, container.clientHeight);
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.left = -zoom * aspect / 2;
    camera.right = zoom * aspect / 2;
    camera.top = zoom / 2;
    camera.bottom = -zoom / 2;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  function positionFor(id, location) {
    return NPC_SPOTS[id][location] || NPC_SPOTS[id].market || NPC_SPOTS[id].woods;
  }

  function select(id) {
    selectedId = id;
    selectedSiteId = null;
    ring.visible = Boolean(id);
    onClearPerson?.();
    if (id) {
      const actor = people[id];
      ring.position.set(actor.position.x, 0.06, actor.position.z);
    }
  }

  function selectSite(id) {
    select(null);
    selectedSiteId = id;
    ring.visible = true;
    ring.position.set(SITE_SPOTS[id][0], 0.06, SITE_SPOTS[id][1]);
  }

  function sync(nextView) {
    view = nextView;
    if (!initialized || place !== nextView.player.place) {
      initialized = true;
      place = nextView.player.place;
      const x = place === MARKET ? -17 : 4.5;
      player.position.set(x, 0, 0);
      cameraFocus.set(x, 0, 0);
      destination = null;
      route = [];
      afterWalk = null;
      travelArmed = true;
      select(null);
      destinationMarker.visible = false;
      routeLine.visible = false;
    }
    const plants = terrain.herbPatch.children.filter(child => child.isMesh && !child.userData.siteId);
    plants.forEach((plant, i) => { plant.visible = nextView.world.herbsRemaining > 0 && (nextView.world.herbsRemaining > 1 || i < 4); });
    terrain.arrayRing.material.color.setHex(nextView.world.trapReady ? 0x88d5ee : 0xc49e69);
    terrain.arrayRing.material.transparent = true;
    for (const person of nextView.people) {
      const actor = people[person.id];
      const spot = positionFor(person.id, person.place);
      actor.userData.destination = new THREE.Vector3(spot[0], 0, spot[1]);
      if (!actor.userData.initialized) {
        actor.position.copy(actor.userData.destination);
        actor.userData.initialized = true;
      }
    }
  }

  function bounds() { return place === MARKET ? [-27.3, -1.5] : [1.5, 27.3]; }

  function walkable(x, z) {
    const [minX, maxX] = bounds();
    if (x < minX || x > maxX || z < -11.1 || z > 11.1) return false;
    if (place === MARKET) return !MARKET_BLOCKERS.some(([bx, bz, rx, rz]) => Math.abs(x - bx) < rx && Math.abs(z - bz) < rz);
    return !FOREST_TREES.some(([tx, tz, size]) => Math.hypot(x - tx, z - tz) < 0.67 * size)
      && !FOREST_ROCKS.some(([rx, rz]) => Math.hypot(x - rx, z - rz) < 1.18);
  }

  function clearSegment(a, b) {
    const steps = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.25);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!walkable(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }

  function findRoute(target) {
    const [minX, maxX] = place === MARKET ? [-27, -2] : [2, 27];
    const nodes = [];
    for (let x = minX; x <= maxX; x++) for (let z = -11; z <= 11; z++) {
      if (walkable(x, z)) nodes.push({ x, z, key: `${x},${z}` });
    }
    const closest = point => nodes.reduce((best, node) => !best || Math.hypot(node.x - point.x, node.z - point.z) < Math.hypot(best.x - point.x, best.z - point.z) ? node : best, null);
    const start = closest(player.position);
    const end = closest(target);
    if (!start || !end) return [];
    const nodeMap = new Map(nodes.map(node => [node.key, node]));
    const open = [start];
    const cost = new Map([[start.key, 0]]);
    const parents = new Map();
    const closed = new Set();
    while (open.length) {
      open.sort((a, b) => cost.get(a.key) + Math.hypot(a.x - end.x, a.z - end.z) - cost.get(b.key) - Math.hypot(b.x - end.x, b.z - end.z));
      const node = open.shift();
      if (node.key === end.key) break;
      closed.add(node.key);
      for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) {
        if (!dx && !dz) continue;
        const next = nodeMap.get(`${node.x + dx},${node.z + dz}`);
        if (!next || closed.has(next.key) || !clearSegment(node, next)) continue;
        const nextCost = cost.get(node.key) + Math.hypot(dx, dz);
        if (nextCost >= (cost.get(next.key) ?? Infinity)) continue;
        cost.set(next.key, nextCost);
        parents.set(next.key, node.key);
        if (!open.includes(next)) open.push(next);
      }
    }
    if (start.key !== end.key && !parents.has(end.key)) return [];
    const points = [end];
    while (points[0].key !== start.key) points.unshift(nodeMap.get(parents.get(points[0].key)));
    if (walkable(target.x, target.z) && clearSegment(end, target)) points.push(target);
    const compact = [];
    let from = player.position;
    while (points.length) {
      let farthest = 0;
      for (let i = 0; i < points.length; i++) {
        if (clearSegment(from, points[i])) farthest = i;
        else break;
      }
      const next = points[farthest];
      compact.push(new THREE.Vector3(next.x, 0, next.z));
      from = next;
      points.splice(0, farthest + 1);
    }
    return compact;
  }

  function walkTo(x, z, callback) {
    const allowed = bounds();
    const target = new THREE.Vector3(THREE.MathUtils.clamp(x, allowed[0], allowed[1]), 0, THREE.MathUtils.clamp(z, -11.1, 11.1));
    route = findRoute(target);
    destination = route.shift() || null;
    afterWalk = callback || null;
    routeLine.geometry.dispose();
    routeLine.geometry = new THREE.BufferGeometry().setFromPoints([player.position, ...(destination ? [destination] : []), ...route].map(p => new THREE.Vector3(p.x, 0.10, p.z)));
    routeLine.visible = Boolean(destination);
    destinationMarker.visible = Boolean(destination);
    if (destination) {
      const endpoint = route.at(-1) || destination;
      destinationMarker.position.set(endpoint.x, 0.12, endpoint.z);
    }
    if (!destination) onHint('此处暂时没有可走的路径。');
  }

  function moveBy(dx, dz) {
    const [minX, maxX] = bounds();
    const x = THREE.MathUtils.clamp(player.position.x + dx, minX, maxX);
    const z = THREE.MathUtils.clamp(player.position.z + dz, -11.1, 11.1);
    if (walkable(x, z)) player.position.set(x, 0, z);
    else if (walkable(x, player.position.z)) player.position.x = x;
    else if (walkable(player.position.x, z)) player.position.z = z;
  }

  function attemptTravel() {
    if (travelPending || busy || !travelArmed || !view) return;
    travelArmed = false;
    travelPending = true;
    const next = place === MARKET ? WOODS : MARKET;
    Promise.resolve(onTravel(next)).finally(() => { travelPending = false; });
  }

  function pointerRay(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }

  renderer.domElement.addEventListener('pointerdown', event => { pointerDown = [event.clientX, event.clientY]; });
  renderer.domElement.addEventListener('pointerup', event => {
    const start = pointerDown;
    pointerDown = null;
    if (busy || !start || Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 8) return;
    pointerRay(event);
    const siteHit = raycaster.intersectObjects(siteTargets)[0];
    if (siteHit) {
      const id = siteHit.object.userData.siteId;
      if (place !== WOODS) { onHint('先通过界门进入黑风林。'); return; }
      selectSite(id);
      const [x, z] = SITE_SPOTS[id];
      walkTo(id === 'herbs' ? x - 1.7 : x, id === 'herbs' ? z : z + 2.2, () => onSelectSite(id));
      onHint(`正走向${id === 'herbs' ? '灵草坡' : id === 'camp' ? '听雨亭' : '天雷阵位'}。`);
      return;
    }
    const gateHit = raycaster.intersectObjects(gateTargets)[0];
    if (gateHit) {
      travelArmed = true;
      select(null);
      walkTo(place === MARKET ? -2.2 : 2.2, 0, attemptTravel);
      onHint(place === MARKET ? '正在走向界门，前往黑风林。' : '正在走向界门，返回坊市。');
      return;
    }
    const activePeople = Object.values(people).filter(actor => actor.visible);
    const hits = raycaster.intersectObjects(activePeople, true);
    const id = hits.find(hit => hit.object.userData.personId)?.object.userData.personId;
    if (id) {
      select(id);
      const actor = people[id];
      const actorPlace = view?.people.find(person => person.id === id)?.place;
      if (actorPlace !== place) { onHint('先到人物所在的区域，再与他交谈。'); return; }
      const dx = actor.position.x - player.position.x;
      const dz = actor.position.z - player.position.z;
      const distance = Math.max(1, Math.hypot(dx, dz));
      walkTo(actor.position.x - dx / distance * 1.7, actor.position.z - dz / distance * 1.7, () => onSelectPerson(id));
      return;
    }
    if (raycaster.intersectObjects(obstacleTargets, true).length) {
      onHint('这里有障碍物。请点击道路或空地移动。');
      return;
    }
    const groundHit = raycaster.intersectObjects(clickSurfaces)[0];
    if (groundHit) {
      const x = groundHit.point.x;
      if ((place === MARKET && x > -1) || (place === WOODS && x < 1)) {
        travelArmed = true;
        select(null);
        walkTo(place === MARKET ? -2.2 : 2.2, 0, attemptTravel);
        onHint(place === MARKET ? '正在经过界门前往黑风林。' : '正在经过界门返回坊市。');
      } else {
        select(null);
        walkTo(x, groundHit.point.z);
      }
    }
  });

  renderer.domElement.addEventListener('wheel', event => {
    event.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom + Math.sign(event.deltaY) * 1.7, 15, 37);
    resize();
  }, { passive: false });

  window.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || event.target?.isContentEditable || document.querySelector('dialog[open]')) return;
    if (event.key.toLowerCase() === 'q') { azimuth -= 0.22; return; }
    if (event.key.toLowerCase() === 'e') { azimuth += 0.22; return; }
    if (busy) return;
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      if (!keys.size) select(null);
      keys.add(event.key);
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', event => { keys.delete(event.key); });
  window.addEventListener('blur', () => keys.clear());

  function drawMiniMap() {
    if (!miniMap || !view) return;
    const ctx = miniMap.getContext('2d');
    const width = miniMap.width, height = miniMap.height;
    const px = x => (x + 30) / 60 * width;
    const py = z => (z + 14) / 28 * height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#172d29'; ctx.fillRect(0, 0, width / 2, height);
    ctx.fillStyle = '#253c2c'; ctx.fillRect(width / 2, 0, width / 2, height);
    ctx.fillStyle = '#7f8061'; ctx.fillRect(0, py(-1.8), width, py(1.8) - py(-1.8));
    ctx.strokeStyle = '#b5a46d'; ctx.beginPath(); ctx.moveTo(px(0), 0); ctx.lineTo(px(0), height); ctx.stroke();
    ctx.fillStyle = '#576351';
    for (const [x, z, rx, rz] of MARKET_BLOCKERS) ctx.fillRect(px(x - rx), py(z - rz), rx * width / 30, rz * height / 14);
    for (const [x,z] of Object.values(SITE_SPOTS)) { ctx.fillStyle='#dbc48b'; ctx.fillRect(px(x)-3,py(z)-3,6,6); }
    for (const person of view.people) { const actor=people[person.id]; ctx.fillStyle = person.id === view.pill.ownerId ? '#f6ce65' : '#acc3ad'; ctx.beginPath(); ctx.arc(px(actor.position.x),py(actor.position.z),2.7,0,Math.PI*2);ctx.fill(); }
    ctx.save(); ctx.translate(px(player.position.x), py(player.position.z)); ctx.rotate(-player.rotation.y);
    ctx.fillStyle='#f6efce'; ctx.beginPath(); ctx.moveTo(0,5);ctx.lineTo(-4,-4);ctx.lineTo(0,-2);ctx.lineTo(4,-4);ctx.closePath();ctx.fill();ctx.restore();
    ctx.fillStyle='#c4ccb2';ctx.font='12px sans-serif';ctx.fillText('坊市',9,17);ctx.fillText('黑风林',width-52,17);
  }
  miniMap?.addEventListener('click', event => {
    if (busy || !view) return;
    const rect = miniMap.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 60 - 30;
    const z = (event.clientY - rect.top) / rect.height * 28 - 14;
    select(null);
    if ((x > 0) !== (place === WOODS)) { travelArmed=true; walkTo(place === MARKET ? -2.2 : 2.2,0,attemptTravel); }
    else walkTo(x,z);
  });

  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min((now - lastFrameTime) / 1000, 0.04);
    lastFrameTime = now;
    elapsed += dt;
    // 按地图坐标移动；默认视角下，上/下沿主路，左/右沿横向斜轴。
    // 镜头旋转只改变观察角度，不改变按键所控制的地图方向。
    const moveX = (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('w') || keys.has('ArrowUp') ? 1 : 0);
    const moveZ = (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('d') || keys.has('ArrowRight') ? 1 : 0);
    let moving = false;
    if (moveX || moveZ) {
      destination = null;
      route = [];
      routeLine.visible = false;
      destinationMarker.visible = false;
      afterWalk = null;
      const distance = Math.hypot(moveX, moveZ);
      const oldX = player.position.x;
      const oldZ = player.position.z;
      moveBy(moveX / distance * MOVE_SPEED * dt, moveZ / distance * MOVE_SPEED * dt);
      moving = Math.hypot(player.position.x - oldX, player.position.z - oldZ) > 0.001;
    } else if (destination) {
      const diff = destination.clone().sub(player.position);
      const distance = diff.length();
      if (distance < 0.1) {
        player.position.copy(destination);
        destination = route.shift() || null;
        if (!destination) {
          routeLine.visible = false;
          destinationMarker.visible = false;
          const callback = afterWalk;
          afterWalk = null;
          callback?.();
        }
      } else {
        const step = Math.min(distance, MOVE_SPEED * dt);
        const oldX = player.position.x;
        const oldZ = player.position.z;
        moveBy(diff.x / distance * step, diff.z / distance * step);
        moving = Math.hypot(player.position.x - oldX, player.position.z - oldZ) > 0.001;
      }
    }
    if (place === MARKET && player.position.x > -1.5) {
      player.position.x = -1.5;
      if (Math.abs(player.position.z) < 2.6) attemptTravel();
    } else if (place === WOODS && player.position.x < 1.5) {
      player.position.x = 1.5;
      if (Math.abs(player.position.z) < 2.6) attemptTravel();
    }
    if (Math.abs(player.position.x) > 3) travelArmed = true;
    player.userData.body.position.y = moving ? Math.sin(elapsed * 12) * 0.07 : Math.sin(elapsed * 2.4) * 0.025;
    player.userData.leftArm.rotation.z = moving ? Math.sin(elapsed * 10) * 0.25 : -0.08;
    player.userData.rightArm.rotation.z = moving ? -Math.sin(elapsed * 10) * 0.25 : 0.08;
    if (moving && (moveX || moveZ)) player.rotation.y = Math.atan2(moveX, moveZ);
    else if (moving && destination) player.rotation.y = Math.atan2(destination.x - player.position.x, destination.z - player.position.z);

    for (const actor of Object.values(people)) {
      if (actor.userData.destination) actor.position.lerp(actor.userData.destination, Math.min(1, dt * 3.4));
      actor.userData.body.position.y = Math.sin(elapsed * 2.1 + actor.position.x) * 0.025;
      actor.userData.leftArm.rotation.z = -0.08 + Math.sin(elapsed * 1.1 + actor.position.x) * 0.025;
      actor.userData.rightArm.rotation.z = 0.08 - Math.sin(elapsed * 1.1 + actor.position.x) * 0.025;
      if (selectedId === actor.userData.id) actor.rotation.y = Math.atan2(player.position.x - actor.position.x, player.position.z - actor.position.z);
      const personView = view?.people.find(p => p.id === actor.userData.id);
      actor.userData.body.rotation.z = personView?.condition === '负伤' ? 0.12 : 0;
    }
    if (selectedId) ring.position.set(people[selectedId].position.x, 0.055, people[selectedId].position.z);
    ring.material.opacity = 0.5 + Math.sin(elapsed * 4) * 0.3;
    cameraFocus.lerp(new THREE.Vector3(player.position.x, 0, player.position.z), Math.min(1, dt * 2.7));
    camera.position.set(cameraFocus.x + Math.sin(azimuth) * 26.2, 22, cameraFocus.z + Math.cos(azimuth) * 26.2);
    camera.lookAt(cameraFocus.x, 0, cameraFocus.z);
    const bearer = view?.pill.ownerId === 'player' ? player : people[view?.pill.ownerId];
    pillAura.visible = Boolean(bearer);
    if (bearer) { pillAura.position.set(bearer.position.x, 2.65 + Math.sin(elapsed * 2) * 0.1, bearer.position.z); pillAura.rotation.set(Math.PI / 2, 0, elapsed * 0.5); }
    if (view?.world.trapReady) { terrain.arrayRing.rotation.z = elapsed * 0.3; terrain.arrayRing.material.opacity = 0.65 + Math.sin(elapsed * 3) * 0.3; }
    scenery.update(elapsed, dt);
    mapTimer += dt;
    if (mapTimer > 0.12) { drawMiniMap(); mapTimer = 0; }
    renderer.render(scene, camera);
  }
  frame();

  return {
    sync,
    setBusy(value) { busy = value; if (value) { keys.clear(); destination=null; route=[]; afterWalk=null; routeLine.visible=false; destinationMarker.visible=false; } },
    clearSelection() { select(null); },
    rotate(amount) { azimuth += amount; },
    zoomBy(amount) { zoom = THREE.MathUtils.clamp(zoom + amount, 15, 37); resize(); },
    recenter() { azimuth = Math.atan2(18,19); zoom=23; resize(); },
    react(type, before, after) {
      const color = type === 'ambush' ? 0xe99c7d : type === 'rest' ? 0x9ed9bb : 0xe7c774;
      scenery.burst(player.position, color);
      if (type === 'breakthrough') { for (const offset of [0,0.4,0.8]) setTimeout(() => scenery.burst(player.position,0xcce5b0), offset*1000); }
    },
    focusSite(id) {
      if (busy) return;
      if (id === 'gate') { travelArmed=true; walkTo(place === MARKET ? -2.2 : 2.2,0,attemptTravel); return; }
      if (!SITE_SPOTS[id]) return;
      if (place !== WOODS) { onHint('这处地点在黑风林，先通过界门。'); travelArmed=true; walkTo(-2.2,0,attemptTravel); return; }
      selectSite(id); const [x,z]=SITE_SPOTS[id];
      walkTo(id === 'herbs' ? x-1.7 : x, id === 'herbs' ? z : z+2.2, () => onSelectSite(id));
    },
    focus(id) {
      if (busy) return;
      if (!people[id]) return;
      select(id);
      const actor = people[id];
      if (view?.people.find(p => p.id === id)?.place !== place) { onHint('此人目前在另一区域。'); return; }
      const dx = actor.position.x - player.position.x;
      const dz = actor.position.z - player.position.z;
      const distance = Math.max(1, Math.hypot(dx, dz));
      walkTo(actor.position.x - dx / distance * 1.7, actor.position.z - dz / distance * 1.7, () => onSelectPerson(id));
    },
    travel() { travelArmed = true; walkTo(place === MARKET ? -2.2 : 2.2, 0, attemptTravel); },
    getPlace() { return place; }
  };
}

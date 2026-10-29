import { createCultivatorActor } from './character-model.js';
import { createMojiaoActor } from './mojiao-model.js';
import { createBuildingWorld } from './building-world.js';
import { buildingWalkable } from './building-layout.js';
import { VOLUME_PEOPLE, VOLUME_SITES } from './volume-data.js';
import { createVolumeWorld, volumeWalkable, VOLUME_BLOCKERS } from './volume-world.js';
import { SECT_PEOPLE, SECT_SITES } from './sect-data.js';
import { createSectWorld, sectWalkable, SECT_BLOCKERS } from './sect-world.js';
import * as THREE from '../vendor/three.module.js';
import { decorateWorld } from './scenery.js';
import { createNavigator } from './navigation.js';
import { SITES } from './content.js';
import { ALL_ENEMIES as WANDERERS } from './combat-data.js';
import { createBattleWorld } from './battle-world.js';
import { createGardenWorld } from './garden-world.js';
import { placeNpcs, arrangeNameplates } from './npc-layout.js';
import { REGIONS, regionName, regionAt, regionEntry } from './regions.js';
import { FRONTIER_PEOPLE, FRONTIER_SITES } from './campaign-data.js';
import { createFrontier, frontierWalkable, FRONTIER_BLOCKERS } from './frontier-world.js';

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
for (const actor of [...FRONTIER_PEOPLE, ...SECT_PEOPLE, ...VOLUME_PEOPLE, ...WANDERERS]) {
  NPC_SPOTS[actor.id] ??= {};
  NPC_SPOTS[actor.id][actor.place || 'woods'] = actor.spot;
}


const SITE_SPOTS = { herbs: [20, 2], formation: [15, -6.5], camp: [25, -7] };
for (const [id, site] of Object.entries({...FRONTIER_SITES,...SECT_SITES,...VOLUME_SITES})) SITE_SPOTS[id] = site.spot;
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
for (const actor of [...FRONTIER_PEOPLE, ...SECT_PEOPLE, ...VOLUME_PEOPLE, ...WANDERERS]) COLORS[actor.id] = { robe: Number(actor.color.replace('#','0x')), trim: 0xd3c392, skin: 0xcfad8e, hair: 0x292b29 };


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

function label(text, { width = 320, font = 34, color = '#f5eacb', backdrop = '#21302be0', subtitle = '' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = subtitle ? 124 : 88;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = backdrop;
  ctx.beginPath();
  ctx.roundRect(3, 8, width - 6, canvas.height - 16, 18);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ac956a';
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `600 ${font}px "PingFang SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, subtitle ? 42 : 44);
  if (subtitle) { ctx.font = '22px \"PingFang SC\", sans-serif'; ctx.fillText(subtitle, width / 2, 88); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(width / 108, canvas.height / 108, 1);
  return sprite;
}

function makePerson(id, name) {
  if(id==='story_mojiao')return createMojiaoActor(THREE,{id,name,label});
  return createCultivatorActor(THREE,{id,name,label,palette:COLORS[id],enemy:WANDERERS.find(enemy=>enemy.id===id)});
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

function createTerrain(scene, clickSurfaces, siteTargets, obstacleTargets, makeBuilding) {
  const market = put(scene, new THREE.BoxGeometry(29, 0.4, 26), material(0x566052), -14.5, -0.25, 0);
  const woods = put(scene, new THREE.BoxGeometry(29, 0.4, 26), material(0x3b5141), 14.5, -0.25, 0);
  clickSurfaces.push(market, woods);
  for (const x of [-14.5,14.5]) put(scene, new THREE.BoxGeometry(28, 0.05, 4.5), material(0x8b826b), x, 0.006, 0);
  put(scene, new THREE.BoxGeometry(28, 0.04, 1.1), material(0x9c9278), -15, 0.027, -6.4);
  for (let i = 0; i < 80; i++) {
    const x = -27 + ((i * 17.73) % 54);
    const z = -11 + ((i * 9.41) % 22);
    if (Math.abs(z) < 3) continue;
    const stone = put(scene, new THREE.DodecahedronGeometry(0.1 + (i % 4) * 0.035), material(x < 0 ? 0x757967 : 0x657262), x, 0.03, z);
    stone.rotation.y = i * 0.5;
  }
  obstacleTargets.push(makeBuilding(scene, -25, -9, 6.2, 4.6, 0x5b503c, '刘靖牙行'));
  obstacleTargets.push(makeBuilding(scene, -17, 9, 6.5, 4.7, 0x566651, '百草药铺'));
  obstacleTargets.push(makeBuilding(scene, -6, 9, 6, 4.6, 0x655747, '巡坊司'));
  obstacleTargets.push(makeStall(scene, -15, -7.9, 0x957456));
  obstacleTargets.push(makeStall(scene, -9, -8.2, 0x707d62));
  obstacleTargets.push(makeStall(scene, -21, 7.3, 0x806356, Math.PI));
  makeLantern(scene, -2.9, -2.8);
  makeLantern(scene, -2.9, 2.8);
  makeLantern(scene, -24.2, 1.8);

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

export function createWorld(container, { onSelectPerson, onSelectSite, onClearPerson, onTravel, onHint, onNavigation, onNearby, miniMap }) {
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
  scene.add(sun, sun.target);

  const clickSurfaces = [];
  const siteTargets = [];
  const obstacleTargets = [];
  const sceneBeforeMaps = new Set(scene.children);
  const buildings = createBuildingWorld({ THREE, put, material, label, regionAt });
  const { makeBuilding } = buildings;
  const terrain = createTerrain(scene, clickSurfaces, siteTargets, obstacleTargets, makeBuilding);
  const frontier = createFrontier(scene, { clickSurfaces, siteTargets, obstacleTargets }, { THREE, put, material, label, makeBuilding, makeTree });
  const sectWorld = createSectWorld(scene, {clickSurfaces, siteTargets, obstacleTargets}, {THREE, put, material, label, makeBuilding, makeTree});
  const volumeWorld = createVolumeWorld(scene, {clickSurfaces,siteTargets,obstacleTargets}, {THREE,put,material,label,makeBuilding,makeTree});
  const gardenWorld = createGardenWorld(scene, siteTargets, ...SITE_SPOTS.herbs);
  clickSurfaces.push(...buildings.buildings.map(building => building.floor));
  const gardenReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Keep each destination visually separate; coordinates are only local rendering offsets.
  const mapHolders = scene.children.filter(root => !sceneBeforeMaps.has(root)).map(root => {
    const holder = new THREE.Group(); holder.userData.region = regionAt(root.position.x);
    scene.add(holder); holder.add(root); return holder;
  });
  const scenery = decorateWorld(scene);
  const obstacleMeshes = [];
  for(const root of obstacleTargets)root.traverse(object=>{
    if(object.isMesh && object.material.opacity === 1){
      object.material=object.material.clone();
      object.material.transparent=true;
      obstacleMeshes.push(object);
    }
  });
  const occlusionRay = new THREE.Raycaster();
  const faded = new Set();
  const player = makePerson('player', '你');
  scene.add(player);
  const people = Object.fromEntries(Object.keys(NPC_SPOTS).map(id => {
    const actor = makePerson(id, [...FRONTIER_PEOPLE, ...SECT_PEOPLE, ...VOLUME_PEOPLE, ...WANDERERS].find(actor=>actor.id===id)?.name || { shen: '许掌柜', bai: '马师兄', xu: '吴风', lu: '叶师叔', qing: '刘靖', wei: '宋蒙', han: '封岳', ning: '萧翠儿' }[id]);
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
  const battleWorld=createBattleWorld(renderer,makePerson,THREE);

  let place = MARKET;
  let initialized = false;
  let selectedId = null;
  let selectedSiteId = null;
  let destination = null;
  let route = [];
  let afterWalk = null;
  let crossing = null;
  let nearby = null;
  let nearbyId = null;
  let travelPending = false;
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
  let currentRoom = null;
  const roomHud = document.createElement('aside');
  roomHud.className = 'room-hud'; roomHud.hidden = true;
  const roomTitle = document.createElement('strong'), exitButton = document.createElement('button');
  exitButton.type = 'button'; exitButton.textContent = '离开房屋 ↗';
  roomHud.append(roomTitle, exitButton); container.appendChild(roomHud);
  exitButton.addEventListener('click', () => {
    if (currentRoom && document.body.dataset.uiBlocked !== 'true') void goTo('exit:' + currentRoom.id);
  });
  function updateRoom(dt) {
    const room = buildings.update(place, player.position, dt);
    currentRoom = room;
    roomHud.hidden = !room || Boolean(view?.battle) || document.body.dataset.uiBlocked === 'true';
    roomTitle.textContent = room ? room.title + ' · 室内' : '';
    exitButton.disabled = busy;
    volumeWorld.updateRoom(room?.id);
  }

  function locate(target) {
    if (typeof target === 'object') return target;
    if (target.startsWith('room:') || target.startsWith('exit:')) {
      const exit = target.startsWith('exit:'), room = buildings.buildings.find(b => b.room.id === target.slice(5))?.room;
      return room ? { kind: exit ? 'exit' : 'room', id: target, name: (exit ? '离开' : '进入') + room.title, place: room.place, ...(exit ? room.entry : room.inside) } : null;
    }
    if (target.startsWith('region:') || target.startsWith('gate:')) { const to=target.split(':')[1]; return REGIONS[to] ? {kind:'gate',name:regionName(to),place:to} : null; }
    const person = view && [...view.people,...view.roamers].find(p => p.id === target && !p.looted);
    if (person) {
      const destination = people[target]?.userData.destination;
      if (!destination) return null;
      return { kind: 'person', id: target, name: person.defeated?`${person.name}的储物袋`:person.name, place: person.place, x: destination.x, z: destination.z };
    }
    if (SITE_SPOTS[target]) { const [x,z] = SITE_SPOTS[target]; return { kind: 'site', id: target, name: SITES[target].name, place: SITES[target].place || WOODS, room: SITES[target].room, x, z }; }
    return null;
  }
  function stopWalking() {
    destination = null; route = []; routeLine.visible = false; destinationMarker.visible = false;
    const finish = afterWalk; afterWalk = null; finish?.(false);
  }
  const navigation = createNavigator({
    getPlace: () => place, locate, stop: stopWalking,
    waitForTransition: () => crossing?.done,
    walk: goal => new Promise(resolve => {
      if (['person','site'].includes(goal.kind) && (!goal.room || currentRoom?.id === goal.room) && clearSegment(player.position,goal) && Math.hypot(player.position.x-goal.x,player.position.z-goal.z) <= 2.8) { resolve(true); return; }
      let x = goal.x, z = goal.z;
      if (goal.kind === 'person') {
        const approaches = Array.from({length:16}, (_,i) => ({ x:goal.x+Math.cos(i*Math.PI/8)*1.9, z:goal.z+Math.sin(i*Math.PI/8)*1.9 }))
          .filter(p=>walkable(p.x,p.z) && Object.values(people).every(actor => !actor.visible || actor.userData.place !== place || Math.hypot(p.x-actor.position.x,p.z-actor.position.z) >= 1.25)).sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z));
        if (!approaches.length) { resolve(false); return; }
        ({x,z} = approaches[0]);
      } else if (goal.kind === 'site' && !goal.room) { x += goal.id === 'herbs' ? -1.7 : 0; z += goal.id === 'herbs' ? 0 : 2.2; }
      walkTo(x,z,success => resolve(success && (goal.kind === 'point' || (Math.hypot(player.position.x-goal.x,player.position.z-goal.z) <= (['room','exit'].includes(goal.kind) || goal.room ? .2 : 3.2) && clearSegment(player.position,goal)))));
    }),
    cross: async next => {
      if (travelPending || busy) return false;
      travelPending = true;
      try {
        const success = await onTravel(next);
        if (success && crossing) await crossing.done;
        return Boolean(success);
      } finally { travelPending = false; }
    },
    onChange: state => { onNavigation?.(state); },
    onArrive: goal => {
      if (goal.kind === 'person') { select(goal.id); onSelectPerson(goal.id); }
      else if (goal.kind === 'site') { selectSite(goal.id); onSelectSite(goal.id); }
    }
  });
  function goTo(target) {
    if (busy || !view || view.battle) return Promise.resolve(false);
    keys.clear(); select(null);
    return navigation.go(target);
  }

  function updateIdentityLabel(actor, name, identity) {
    const key = `${name}:${identity?.sectId || ''}`;
    if (actor.userData.identityLabel === key) return;
    actor.userData.identityLabel = key;
    const sprite = actor.userData.nameplate;
    const replacement = label(name, {width:330,font:34,color:identity?.color,subtitle:actor.userData.kind==='beast'?'禁地妖兽 · 守护天灵果':identity?.sectId ? `${identity.alignmentName} · ${identity.name}` : '散修 · 无门无派'});
    sprite.material.map.dispose(); sprite.material.map = replacement.material.map;
    sprite.material.needsUpdate = true; sprite.scale.copy(replacement.scale); replacement.material.dispose();
  }

  function resize() {
    const width = Math.max(320, container.clientWidth);
    const height = Math.max(300, container.clientHeight);
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const lens = zoom;
    battleWorld.resize(width,height);
    camera.left = -lens * aspect / 2;
    camera.right = lens * aspect / 2;
    camera.top = lens / 2;
    camera.bottom = -lens / 2;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  function positionFor(id, location) {
    return NPC_SPOTS[id][location] || Object.values(NPC_SPOTS[id])[0];
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
    const previousBattle=view?.battle;
    const firstLoad=!initialized;
    view = nextView;
    battleWorld.sync(nextView);
    gardenWorld.sync(nextView.garden);
    frontier.sync(nextView);
    if (!initialized || place !== nextView.player.place) {
      const first = !initialized;
      initialized = true;
      place = nextView.player.place;
      const [x, z] = regionEntry(place);
      const entry = new THREE.Vector3(x, 0, z);
      stopWalking();
      if (!first && travelPending) {
        player.position.copy(entry);
        const transition = { from: entry.clone().add(new THREE.Vector3(0,1.5,0)), to: entry, time: 0, resolve: null };
        transition.done = new Promise(resolve => { transition.resolve = resolve; });
        crossing = transition;
      } else player.position.copy(entry);
      cameraFocus.copy(entry);
      mapHolders.forEach(holder => { holder.visible = holder.userData.region === place; });
      scenery.sync(place);
      scenery.burst(entry);
      select(null);
    }
    const plants = terrain.herbPatch.children.filter(child => child.isMesh && !child.userData.siteId);
    plants.forEach((plant, i) => { plant.visible = nextView.world.herbsRemaining > 0 && (nextView.world.herbsRemaining > 1 || i < 4); });
    terrain.arrayRing.material.color.setHex(nextView.world.trapReady ? 0x88d5ee : 0xc49e69);
    terrain.arrayRing.material.transparent = true;
    const allPeople = [...nextView.people, ...nextView.roamers];
    const placements = placeNpcs(allPeople.map(person => ({ ...person, point: person.position || positionFor(person.id, person.place), home: !person.position })), npcCanStand);
    for(const actor of Object.values(people))actor.visible=false;
    for (const person of allPeople) {
      const actor = people[person.id];
      const spot = placements.get(person.id);
      actor.visible = Boolean(spot) && person.place === place;
      updateIdentityLabel(actor, person.name, person.affiliation);
      if (!spot) { actor.userData.destination = null; continue; }
      const changedRegion=actor.userData.place!==person.place;
      actor.userData.place = person.place;
      actor.userData.destination = new THREE.Vector3(spot.x, 0, spot.z);
      if (!actor.userData.initialized || changedRegion) {
        actor.position.copy(actor.userData.destination);
        actor.userData.initialized = true;
      }
      if(actor.userData.bag){
        actor.userData.bag.visible=Boolean(person.defeated&&!person.looted);
        actor.userData.body.visible=!person.defeated;
        actor.userData.nameplate.visible=!person.defeated;
        actor.visible=!person.looted && person.place === place;
      }
    }
    updateIdentityLabel(player, '你', nextView.sects.player);
    if(nextView.battle&&!previousBattle){
      navigation.cancel();keys.clear();select(null);
      if(firstLoad){
        const goal=locate(nextView.battle.enemyId);
        const approach=Array.from({length:16},(_,i)=>({x:goal.x+Math.cos(i*Math.PI/8)*2.7,z:goal.z+Math.sin(i*Math.PI/8)*2.7})).find(p=>walkable(p.x,p.z));
        if(approach)player.position.set(approach.x,0,approach.z);
      }
    }
    if(Boolean(nextView.battle)!==Boolean(previousBattle))resize();
    if(selectedId&&!people[selectedId].visible)select(null);
    if(nextView.weapon){
      const auraColor=nextView.weapon.attack>=11?0xe0a478:nextView.weapon.attack>=5?0xa7d6ac:0xd8c38f;
      player.userData.weapon.material.color.setHex(auraColor);
    }
  }

  function bounds() { return REGIONS[place].bounds; }

  function walkableAt(location, x, z) {
    const [minX, maxX, minZ, maxZ] = REGIONS[location].bounds;
    if (x < minX || x > maxX || z < minZ || z > maxZ) return false;
    if (!buildings.buildings.filter(b=>b.room.place===location).every(b=>buildingWalkable(b.room,x,z))) return false;
    if (location === MARKET) return !MARKET_BLOCKERS.slice(3).some(([bx, bz, rx, rz]) => Math.abs(x - bx) < rx && Math.abs(z - bz) < rz);
    if (location !== WOODS) return frontierWalkable(location, x, z, {includeBuildings:false}) && sectWalkable(location, x, z, {includeBuildings:false}) && volumeWalkable(location,x,z,{includeBuildings:false});
    return !FOREST_TREES.some(([tx, tz, size]) => Math.hypot(x - tx, z - tz) < 0.67 * size)
      && !FOREST_ROCKS.some(([rx, rz]) => Math.hypot(x - rx, z - rz) < 1.18);
  }
  function walkable(x, z) { return walkableAt(place, x, z); }
  function npcCanStand(location, x, z) {
    // Include the robe's footprint, rather than checking only the body's center.
    return [[0,0],[.75,0],[-.75,0],[0,.75],[0,-.75]].every(([dx,dz]) => walkableAt(location,x+dx,z+dz));
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
    const [minX, maxX, minZ, maxZ] = bounds().map((value, index) => index % 2 ? Math.floor(value) : Math.ceil(value));
    const nodes = [];
    for (let x = minX; x <= maxX; x++) for (let z = minZ; z <= maxZ; z++) {
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
    const target = new THREE.Vector3(THREE.MathUtils.clamp(x, allowed[0], allowed[1]), 0, THREE.MathUtils.clamp(z, allowed[2], allowed[3]));
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
    if (!destination) { const finish=afterWalk; afterWalk=null; finish?.(false); onHint('此处暂时没有可走的路径。'); }
  }

  function moveBy(dx, dz) {
    const [minX, maxX, minZ, maxZ] = bounds();
    const x = THREE.MathUtils.clamp(player.position.x + dx, minX, maxX);
    const z = THREE.MathUtils.clamp(player.position.z + dz, minZ, maxZ);
    if (walkable(x, z)) player.position.set(x, 0, z);
    else if (walkable(x, player.position.z)) player.position.x = x;
    else if (walkable(player.position.x, z)) player.position.z = z;
  }

  function pointerRay(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
  }
  function visibleHit(hit) {
    for(let object=hit.object;object;object=object.parent)if(!object.visible)return false;
    return true;
  }

  renderer.domElement.addEventListener('pointerdown', event => { pointerDown = [event.clientX, event.clientY]; });
  renderer.domElement.addEventListener('pointerup', event => {
    const start = pointerDown;
    pointerDown = null;
    if (!view || document.body.dataset.uiBlocked==='true' || busy || view?.battle || !start || Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 8) return;
    pointerRay(event);
    const siteHit = raycaster.intersectObjects(siteTargets).filter(visibleHit)[0];
    if (siteHit) {
      const id = siteHit.object.userData.siteId;
      goTo(id);
      return;
    }
    const hits = raycaster.intersectObjects(Object.values(people), true).filter(visibleHit);
    const id = hits.find(hit => hit.object.userData.personId)?.object.userData.personId;
    if (id) { goTo(id); return; }
    const obstacle = raycaster.intersectObjects(obstacleTargets, true).filter(hit => visibleHit(hit) && !hit.object.userData.walkableSurface)[0];
    if (obstacle?.object.userData.buildingId && obstacle.object.userData.buildingId !== currentRoom?.id) {
      goTo('room:' + obstacle.object.userData.buildingId); return;
    }
    if (obstacle) {
      onHint('这里有障碍物。请点击道路或空地移动。');
      return;
    }
    const groundHit = raycaster.intersectObjects(clickSurfaces).filter(visibleHit)[0];
    if (groundHit) {
      const {x,z} = groundHit.point;
      goTo({kind:'point',name:'地图位置',place:regionAt(x),x,z});
    }
  });

  renderer.domElement.addEventListener('wheel', event => {
    event.preventDefault();
    if(document.body.dataset.uiBlocked==='true')return;
    zoom = THREE.MathUtils.clamp(zoom + Math.sign(event.deltaY) * 1.7, 15, 37);
    resize();
  }, { passive: false });

  window.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || event.target?.isContentEditable || document.querySelector('dialog[open]')) return;
    if (view?.battle || document.body.dataset.uiBlocked==='true' || event.target.closest?.('#map-panel,#world-person,.command-dock,#help-card')) return;
    if (event.key.toLowerCase() === 'q') { azimuth -= 0.22; return; }
    if (event.key.toLowerCase() === 'e') { azimuth += 0.22; return; }
    if (busy) return;
    if (event.key.toLowerCase() === 'f' && nearby) { event.preventDefault(); goTo(nearby.id); return; }
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      if (!keys.size) { navigation.cancel(); select(null); }
      keys.add(event.key);
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', event => { keys.delete(event.key); });
  window.addEventListener('blur', () => keys.clear());
  document.addEventListener('focusin', event => { if (event.target.matches('input,textarea,select')) keys.clear(); });

  function drawMiniMap() {
    if (!miniMap || !view) return;
    const ctx = miniMap.getContext('2d');
    const width = miniMap.width, height = miniMap.height;
    const [min,max,minZ,maxZ]=bounds();
    const px=x=>(x-min)/(max-min)*width, py=z=>(z-minZ)/(maxZ-minZ)*height;
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle=REGIONS[place].color;ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#a59a78';ctx.fillRect(0,py(-1.8),width,py(1.8)-py(-1.8));
    if(place==='river'){ctx.fillStyle='#69a9b1';ctx.fillRect(px(51.5),0,px(58.5)-px(51.5),height);ctx.fillStyle='#d0b77f';ctx.fillRect(px(51.5),py(-2),px(58.5)-px(51.5),py(2)-py(-2));}
    ctx.fillStyle='#263a35';
    for(const [x,z,rx,rz] of (place===MARKET?MARKET_BLOCKERS:FRONTIER_BLOCKERS[place]||SECT_BLOCKERS[place]||VOLUME_BLOCKERS[place]||[]))ctx.fillRect(px(x-rx),py(z-rz),rx*2/(max-min)*width,rz*2/(maxZ-minZ)*height);
    for(const [id,[x,z]]of Object.entries(SITE_SPOTS)){if(SITES[id].place!==place)continue;ctx.fillStyle='#f5d594';ctx.fillRect(px(x)-3,py(z)-3,6,6);}
    for(const person of [...view.people,...view.roamers]){if(person.looted||person.place!==place)continue;const actor=people[person.id];ctx.fillStyle=person.defeated?'#e5bf71':person.affiliation?.color || '#d1e6d4';ctx.beginPath();ctx.arc(px(actor.position.x),py(actor.position.z),2.7,0,Math.PI*2);ctx.fill();}
    ctx.save();ctx.translate(px(player.position.x),py(player.position.z));ctx.rotate(-player.rotation.y);
    ctx.fillStyle='#fff9e2';ctx.beginPath();ctx.moveTo(0,5);ctx.lineTo(-4,-4);ctx.lineTo(0,-2);ctx.lineTo(4,-4);ctx.closePath();ctx.fill();ctx.restore();
    ctx.fillStyle='#fff3d6';ctx.font='12px sans-serif';ctx.fillText(regionName(place),9,17);
  }
  miniMap?.addEventListener('click',event=>{
    if(busy||!view)return;
    const rect=miniMap.getBoundingClientRect(),[min,max,minZ,maxZ]=bounds();
    const x=min+(event.clientX-rect.left)/rect.width*(max-min),z=minZ+(event.clientY-rect.top)/rect.height*(maxZ-minZ);
    goTo({kind:'point',name:'小地图目标',place,x,z});
  });

  function updateOcclusion() {
    const next = new Set();
    for(const actor of [player, ...(selectedId?[people[selectedId]]:[])]) {
      const point=actor.position.clone().add(new THREE.Vector3(0,1.4,0));
      const projected=point.clone().project(camera);
      occlusionRay.setFromCamera(new THREE.Vector2(projected.x,projected.y),camera);
      occlusionRay.far=occlusionRay.ray.origin.distanceTo(point)-0.3;
      for(const hit of occlusionRay.intersectObjects(obstacleMeshes,false))next.add(hit.object);
    }
    for(const object of faded)if(!next.has(object)){object.material.opacity=1;object.material.depthWrite=true;}
    for(const object of next){object.material.opacity=0.2;object.material.depthWrite=false;}
    faded.clear();for(const object of next)faded.add(object);
  }

  function updateNearby() {
    let candidates = view ? [...view.people,...view.roamers].filter(p=>p.place===place&&!p.looted).map(p=>locate(p.id)).filter(Boolean) : [];
    candidates.push(...Object.keys(SITE_SPOTS).map(locate).filter(site => site.place === place && (!site.room || currentRoom?.id === site.room)));
    for (const {room} of buildings.buildings) if (room.place === place) {
      const target = locate((currentRoom?.id === room.id ? 'exit:' : 'room:') + room.id);
      if (Math.hypot(player.position.x-room.entry.x,player.position.z-room.entry.z)<3.2) candidates.push({...target, ...room.entry});
    }
    nearby = !busy && !view?.battle && !navigation.active && !crossing ? candidates.filter(p=>clearSegment(player.position,p) && Math.hypot(p.x-player.position.x,p.z-player.position.z)<3).sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z))[0] : null;
    if ((nearby?.id || null) !== nearbyId) { nearbyId=nearby?.id || null; onNearby?.(nearby || null); }
  }

  function updateNameplates() {
    if (!view) return;
    camera.updateMatrixWorld();
    const width = container.clientWidth, height = container.clientHeight;
    if (!width || !height) return;
    const labels = [], actors = new Map();
    for (const actor of [player, ...Object.values(people)]) {
      const sprite = actor.userData.nameplate, leader = actor.userData.labelLeader;
      if (!sprite) continue;
      sprite.visible = false; leader.visible = false;
      if (!actor.visible || (actor !== player && (actor.userData.place !== place || !actor.userData.body.visible))) continue;
      const anchor = actor.position.clone().add(new THREE.Vector3(0, 3.16, 0)).project(camera);
      if (anchor.z < -1 || anchor.z > 1) continue;
      const id = actor.userData.id;
      actors.set(id, { actor, depth: anchor.z });
      labels.push({ id, x: (anchor.x+1)*width/2, y: (1-anchor.y)*height/2,
        width: sprite.scale.x*height/zoom, height: sprite.scale.y*height/zoom,
        priority: id === selectedId ? 3 : id === nearbyId ? 2 : actor === player ? 1 : 0 });
    }
    const layout = arrangeNameplates(labels, width, height);
    for (const label of labels) {
      const position = layout.get(label.id);
      if (!position) continue;
      const { actor, depth } = actors.get(label.id);
      const sprite = actor.userData.nameplate, leader = actor.userData.labelLeader;
      const point = new THREE.Vector3(position.x/width*2-1, 1-position.y/height*2, depth).unproject(camera);
      actor.updateWorldMatrix(true, false);
      sprite.position.copy(actor.worldToLocal(point));
      sprite.visible = true;
      leader.visible = Math.hypot(position.x-label.x, position.y-label.y) > 3;
      if (leader.visible) {
        const vertices = leader.geometry.attributes.position;
        vertices.setXYZ(1, sprite.position.x, sprite.position.y, sprite.position.z);
        vertices.needsUpdate = true;
        leader.geometry.computeBoundingSphere();
      }
    }
  }

  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min((now - lastFrameTime) / 1000, 0.04);
    lastFrameTime = now;
    elapsed += dt;
    sectWorld.update(elapsed);
    // 按地图坐标移动；默认视角下，上/下沿主路，左/右沿横向斜轴。
    // 镜头旋转只改变观察角度，不改变按键所控制的地图方向。
    const moveX = (keys.has('s') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('w') || keys.has('ArrowUp') ? 1 : 0);
    const moveZ = (keys.has('a') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('d') || keys.has('ArrowRight') ? 1 : 0);
    let moving = false;
    if (crossing) {
      crossing.time += dt;
      const t = Math.min(1, crossing.time / 0.45);
      player.position.lerpVectors(crossing.from, crossing.to, t * t * (3 - 2 * t));
      moving = true;
      if (t === 1) { const finish=crossing.resolve; crossing=null; finish?.(); }
    } else if (!busy && (moveX || moveZ)) {
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
          callback?.(true);
        }
      } else {
        const step = Math.min(distance, MOVE_SPEED * dt);
        const oldX = player.position.x;
        const oldZ = player.position.z;
        moveBy(diff.x / distance * step, diff.z / distance * step);
        moving = Math.hypot(player.position.x - oldX, player.position.z - oldZ) > 0.001;
      }
    }
    updateRoom(dt);
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
    cameraFocus.lerp(new THREE.Vector3(player.position.x,0,player.position.z),Math.min(1,dt*2.7));
    camera.position.set(cameraFocus.x+Math.sin(azimuth)*26.2,22,cameraFocus.z+Math.cos(azimuth)*26.2);
    camera.lookAt(cameraFocus.x,0,cameraFocus.z);
    sun.position.set(cameraFocus.x - 7, 23, cameraFocus.z + 15);
    sun.target.position.set(cameraFocus.x, 0, cameraFocus.z);
    const bearer = view?.campaign.alternatePill || view?.pill.ownerId === 'player' ? player : null;
    pillAura.visible = Boolean(bearer);
    if (bearer) { pillAura.position.set(bearer.position.x, 2.65 + Math.sin(elapsed * 2) * 0.1, bearer.position.z); pillAura.rotation.set(Math.PI / 2, 0, elapsed * 0.5); }
    if (view?.world.trapReady) { terrain.arrayRing.rotation.z = elapsed * 0.3; terrain.arrayRing.material.opacity = 0.65 + Math.sin(elapsed * 3) * 0.3; }
    gardenWorld.update(elapsed, gardenReducedMotion.matches);
    frontier.update(elapsed);
    scenery.update(elapsed, dt);
    mapTimer += dt;
    if (mapTimer > 0.12) { drawMiniMap(); updateNearby(); updateOcclusion(); mapTimer = 0; }
    updateNameplates();
    if(view?.battle)battleWorld.render(elapsed);
    else renderer.render(scene, camera);
  }
  frame();

  return {
    sync,
    goTo,
    stopMovement() { keys.clear(); },
    cancel() { navigation.cancel(); keys.clear(); },
    reset() { navigation.cancel(); initialized=false; select(null); },
    interact() { if (nearby) return goTo(nearby.id); },
    setBusy(value) { busy=value; if(value) { keys.clear(); stopWalking(); } },
    clearSelection() { navigation.cancel(); select(null); },
    rotate(amount) { azimuth += amount; },
    zoomBy(amount) { zoom = THREE.MathUtils.clamp(zoom + amount, 15, 37); resize(); },
    recenter() { azimuth = Math.atan2(18,19); zoom=23; resize(); },
    react(type, before, after) {
      const color = type === 'ambush' ? 0xe99c7d : type === 'rest' ? 0x9ed9bb : 0xe7c774;
      scenery.burst(player.position, color);
      if (type === 'breakthrough') { for (const offset of [0,0.4,0.8]) setTimeout(() => scenery.burst(player.position,0xcce5b0), offset*1000); }
    },
    combatReact: battleWorld.react,
    focusSite: goTo,
    focus: goTo,
    getPlace() { return place; }
  };
}

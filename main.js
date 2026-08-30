import * as THREE from 'three';
import { createCharacterModel, createQuestMarker, createStoryProp } from './models.js';
import { PORTRAITS, STORY } from './story.js';

const ui = {
  scene: document.querySelector('#scene'), quest: document.querySelector('#quest'), objective: document.querySelector('#objective'),
  location: document.querySelector('#location'), realm: document.querySelector('#realm'), party: document.querySelector('#party'),
  count: document.querySelector('#quest-count'), progress: document.querySelector('#quest-progress'), targetHint: document.querySelector('#target-hint'),
  targetName: document.querySelector('#target-name'), targetDistance: document.querySelector('#target-distance'), toast: document.querySelector('#toast'),
  dialog: document.querySelector('#dialog'), dialogName: document.querySelector('#dialog-name'), dialogText: document.querySelector('#dialog-text'),
  dialogPortrait: document.querySelector('#dialog-portrait'), battle: document.querySelector('#battle'), interact: document.querySelector('#interact'),
  interactLabel: document.querySelector('#interact-label'), chapterCard: document.querySelector('#chapter-card')
};

const state = { step: 0, dialogIndex: 0, dialogue: [], target: null, heroHp: 100, enemyHp: 100, enemyMaxHp: 100, enemyAttack: 12, battleLocked: false, auto: false, complete: false };
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b1719, .014);
const backdrop = new THREE.TextureLoader().load('./assets/generated/qixuan-gate.png');
backdrop.colorSpace = THREE.SRGBColorSpace;
scene.background = backdrop;
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 120);
camera.position.set(4, 3.8, 14);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
ui.scene.append(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xc6d8d2, 0x102023, 1.75));
const keyLight = new THREE.DirectionalLight(0xffd8a0, 2.65);
keyLight.position.set(-10, 15, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const world = new THREE.Group();
const qixuanWorld = new THREE.Group();
const mofuWorld = new THREE.Group();
const actorLayer = new THREE.Group();
world.add(qixuanWorld, mofuWorld, actorLayer);
scene.add(world);
const materials = new Map();
const getMaterial = (color, roughness = .8, metalness = .03) => {
  const key = `${color}-${roughness}-${metalness}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  return materials.get(key);
};
const addMesh = (parent, geometry, material, position, rotation) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};

function makeTree(parent, x, z, scale = 1) {
  const root = new THREE.Group(); root.position.set(x, 0, z); root.scale.setScalar(scale); parent.add(root);
  addMesh(root, new THREE.CylinderGeometry(.13, .23, 2.1, 8), getMaterial(0x3b2922), [0, 1.05, 0]);
  addMesh(root, new THREE.ConeGeometry(1.2, 3.1, 10), getMaterial(0x173b37), [0, 2.65, 0]);
  addMesh(root, new THREE.ConeGeometry(.82, 2.1, 10), getMaterial(0x245149), [0, 4.05, 0]);
}
function makeLantern(parent, x, z) {
  addMesh(parent, new THREE.CylinderGeometry(.04, .04, 1.7, 8), getMaterial(0x39261e), [x, .85, z]);
  addMesh(parent, new THREE.BoxGeometry(.3, .42, .3), getMaterial(0xffb75c, .28), [x, 1.7, z]);
  const light = new THREE.PointLight(0xffa04f, 1.8, 6); light.position.set(x, 1.7, z); parent.add(light);
}
function buildEnvironments() {
  const qGround = addMesh(qixuanWorld, new THREE.PlaneGeometry(70, 70), getMaterial(0x17312e), [0, 0, 0], [-Math.PI / 2, 0, 0]);
  qGround.receiveShadow = true;
  addMesh(qixuanWorld, new THREE.PlaneGeometry(6, 34), getMaterial(0x635a46), [0, .018, -2], [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 15; i++) addMesh(qixuanWorld, new THREE.CylinderGeometry(.32 + (i % 3) * .08, .38, .08, 7), getMaterial(0x807660), [((i % 2) - .5) * (1.2 + i % 4), .07, 12 - i * 1.8]);
  [[-12,-12],[-10,-6],[-12,1],[-10,8],[12,-11],[10,-5],[12,2],[10,9]].forEach(([x,z], i) => makeTree(qixuanWorld, x, z, .72 + (i % 3) * .1));
  for (const x of [-3.8, 3.8]) addMesh(qixuanWorld, new THREE.CylinderGeometry(.28, .36, 5.2, 10), getMaterial(0x654431), [x, 2.6, -13]);
  addMesh(qixuanWorld, new THREE.BoxGeometry(8.8, .68, .86), getMaterial(0x6b4734), [0, 5.05, -13]);
  addMesh(qixuanWorld, new THREE.BoxGeometry(3.3, .82, .13), getMaterial(0xc19b5e, .38, .2), [0, 4.2, -13.47]);
  addMesh(qixuanWorld, new THREE.BoxGeometry(7, 3.2, 5), getMaterial(0x4c3a31), [-8, 1.6, -2]);
  const roof = addMesh(qixuanWorld, new THREE.ConeGeometry(5.7, 2.15, 4), getMaterial(0x253f43), [-8, 4, -2]); roof.rotation.y = Math.PI / 4;
  makeLantern(qixuanWorld, -4.5, -4); makeLantern(qixuanWorld, 4.5, -4);

  addMesh(mofuWorld, new THREE.PlaneGeometry(70, 70), getMaterial(0x27332f), [0, 0, 0], [-Math.PI / 2, 0, 0]);
  addMesh(mofuWorld, new THREE.PlaneGeometry(10, 30), getMaterial(0x77705f), [0, .018, -2], [-Math.PI / 2, 0, 0]);
  for (const x of [-7, 7]) addMesh(mofuWorld, new THREE.BoxGeometry(.5, 4.5, 28), getMaterial(0x66594a), [x, 2.25, -2]);
  for (const x of [-4.7, 0, 4.7]) addMesh(mofuWorld, new THREE.CylinderGeometry(.23, .3, 3.8, 10), getMaterial(0x5f3029), [x, 1.9, -10]);
  addMesh(mofuWorld, new THREE.BoxGeometry(11, 3.5, 4.5), getMaterial(0x5c4639), [0, 1.75, -11]);
  const mofuRoof = addMesh(mofuWorld, new THREE.ConeGeometry(8.3, 2.3, 4), getMaterial(0x3e4544), [0, 4.4, -11]); mofuRoof.rotation.y = Math.PI / 4;
  makeLantern(mofuWorld, -4.8, -5); makeLantern(mofuWorld, 4.8, -5); makeLantern(mofuWorld, -4.8, 4); makeLantern(mofuWorld, 4.8, 4);
  mofuWorld.visible = false;
}
buildEnvironments();

const player = createCharacterModel('hanli', { showName: false });
player.position.set(0, 0, 10);
player.scale.setScalar(1.08);
actorLayer.add(player);
const actors = {};
const spawnActor = (key, model, position) => {
  const root = createCharacterModel(model);
  root.position.set(...position);
  root.visible = false;
  actorLayer.add(root);
  actors[key] = root;
  return root;
};
spawnActor('examiner', 'examiner', [0, 0, 2]);
spawnActor('zhangtie', 'zhangtie', [-2.4, 0, 3]);
spawnActor('modafu', 'modafu', [0, 0, -3]);
spawnActor('lifeiyu', 'lifeiyu', [-4, 0, 0]);
spawnActor('mocaihuan', 'mocaihuan', [3.2, 0, -1]);
spawnActor('gangmaster', 'gangmaster', [0, 0, 2]);
const props = {
  altar: createStoryProp('altar'), bottle: createStoryProp('bottle'), letter: createStoryProp('letter')
};
props.altar.position.set(4.5, 0, -2); props.bottle.position.set(5, 0, 3); props.letter.position.set(-4, 0, -2);
Object.values(props).forEach(prop => { prop.visible = false; actorLayer.add(prop); });
const targets = { ...actors, ...props };
const marker = createQuestMarker();
actorLayer.add(marker);

const visibilityByStep = {
  'entrance-test': ['examiner', 'zhangtie'], 'meet-doctor': ['modafu', 'zhangtie'], cultivate: ['altar', 'zhangtie'],
  'green-bottle': ['bottle'], 'li-feiyu': ['lifeiyu'], 'zhang-tie-missing': ['letter'], confrontation: ['modafu'],
  'last-letter': ['letter'], 'arrive-mo-estate': ['mocaihuan'], 'mo-estate-crisis': ['mocaihuan', 'gangmaster'],
  'decode-letter': ['mocaihuan', 'letter'], farewell: ['mocaihuan']
};

function setStep(index, { teleport = false } = {}) {
  state.step = THREE.MathUtils.clamp(index, 0, STORY.length - 1);
  const step = STORY[state.step];
  const isMofu = step.scene === 'mofu';
  qixuanWorld.visible = !isMofu;
  mofuWorld.visible = isMofu;
  scene.fog.color.set(isMofu ? 0x171d1c : 0x0b1719);
  if (teleport || (state.step > 0 && STORY[state.step - 1]?.scene !== step.scene)) player.position.set(0, 0, 10);
  [...Object.values(actors), ...Object.values(props)].forEach(item => item.visible = false);
  (visibilityByStep[step.id] || []).forEach(key => { if (targets[key]) targets[key].visible = true; });
  state.target = targets[step.target];
  if (state.target) {
    marker.visible = true;
    marker.position.copy(state.target.position);
    ui.targetName.textContent = state.target.userData.displayName || step.prompt;
  } else marker.visible = false;
  ui.quest.textContent = step.title;
  ui.objective.textContent = step.objective;
  ui.location.textContent = `地点：${step.location}`;
  ui.realm.textContent = step.realm;
  ui.count.textContent = `${state.step + 1} / ${STORY.length}`;
  ui.progress.style.width = `${((state.step + 1) / STORY.length) * 100}%`;
  ui.party.innerHTML = step.party.map(([name, role]) => `<div class="party-card"><span>${name}</span><em>${role}</em></div>`).join('');
  ui.interactLabel.textContent = step.prompt;
  updateTargetHint();
}

function updateTargetHint() {
  if (!state.target || state.complete) { ui.targetHint.classList.add('hidden'); return; }
  const distance = player.position.distanceTo(state.target.position);
  ui.targetDistance.textContent = `${Math.max(1, Math.round(distance * 3))} 米`;
  ui.targetHint.classList.toggle('close', distance < 2.4);
  ui.targetHint.classList.remove('hidden');
}
function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => ui.toast.classList.remove('show'), 2400);
}
function startDialogue(lines, onDone) {
  state.dialogue = lines;
  state.dialogIndex = 0;
  state.dialogDone = onDone;
  ui.dialog.classList.remove('hidden');
  renderDialogueLine();
}
function renderDialogueLine() {
  const [name, text] = state.dialogue[state.dialogIndex];
  ui.dialogName.textContent = name;
  ui.dialogText.textContent = text;
  ui.dialogPortrait.src = PORTRAITS[name] || './assets/generated/qixuan-gate.png';
  ui.dialogPortrait.classList.toggle('environment', !PORTRAITS[name]);
}
document.querySelector('#dialog-next').onclick = () => {
  state.dialogIndex += 1;
  if (state.dialogIndex < state.dialogue.length) renderDialogueLine();
  else {
    ui.dialog.classList.add('hidden');
    state.dialogDone?.();
  }
};
function interact() {
  if (!state.target || player.position.distanceTo(state.target.position) > 2.4 || !ui.dialog.classList.contains('hidden')) return;
  const step = STORY[state.step];
  startDialogue(step.dialogue, () => step.battle ? startBattle(step.battle) : finishStep());
}
function finishStep() {
  const step = STORY[state.step];
  if (step.reward) showToast(step.reward);
  if (step.complete) {
    state.complete = true;
    marker.visible = false;
    ui.targetHint.classList.add('hidden');
    ui.interact.classList.add('hidden');
    ui.chapterCard.innerHTML = '<span>第一章完成</span><strong>七玄门与墨府</strong><small>韩立将踏入真正的修仙世界</small>';
    ui.chapterCard.classList.remove('hidden');
    ui.chapterCard.classList.add('complete');
    return;
  }
  setTimeout(() => setStep(state.step + 1, { teleport: STORY[state.step + 1]?.scene !== step.scene }), 500);
}

function startBattle(config) {
  state.enemyMaxHp = config.hp;
  state.enemyHp = config.hp;
  state.heroHp = 100;
  state.enemyAttack = config.attack;
  state.battleLocked = false;
  document.querySelector('#battle-title').textContent = config.enemy;
  document.querySelector('#enemy-name').textContent = config.enemy;
  document.querySelector('#enemy-hp-name').textContent = config.enemy;
  document.querySelector('#enemy-image').src = config.portrait;
  ui.battle.classList.remove('hidden');
  battleLog(`${config.enemy}发动攻势，战斗开始。`);
  updateBattleBars();
  maybeAutoBattle();
}
function updateBattleBars() {
  document.querySelector('#hero-hp').style.width = `${state.heroHp}%`;
  document.querySelector('#enemy-hp').style.width = `${(state.enemyHp / state.enemyMaxHp) * 100}%`;
}
function battleLog(text) { document.querySelector('#battle-log').textContent = text; }
function battleAction(action) {
  if (state.battleLocked || state.enemyHp <= 0) return;
  state.battleLocked = true;
  let damage = 0;
  if (action === 'item') {
    state.heroHp = Math.min(100, state.heroHp + 30);
    battleLog('韩立服下回灵丹，恢复 30 点气血。');
  } else {
    damage = action === 'spell' ? 34 : action === 'guard' ? 8 : 21;
    state.enemyHp = Math.max(0, state.enemyHp - damage);
    battleLog(`韩立施展${action === 'spell' ? '长春功' : action === 'guard' ? '守御诀' : '剑击'}，造成 ${damage} 点伤害。`);
  }
  updateBattleBars();
  if (state.enemyHp <= 0) {
    setTimeout(() => { ui.battle.classList.add('hidden'); state.battleLocked = false; finishStep(); }, 650);
    return;
  }
  setTimeout(() => {
    const incoming = action === 'guard' ? 5 : state.enemyAttack;
    state.heroHp = Math.max(0, state.heroHp - incoming);
    battleLog(`敌人反击，韩立损失 ${incoming} 点气血。`);
    if (state.heroHp <= 0) {
      state.heroHp = 100;
      state.enemyHp = state.enemyMaxHp;
      battleLog('战斗失败，已从战斗前重新开始。');
    }
    updateBattleBars();
    state.battleLocked = false;
    maybeAutoBattle();
  }, 620);
}
function maybeAutoBattle() { if (state.auto && !ui.battle.classList.contains('hidden')) setTimeout(() => battleAction('attack'), 700); }
document.querySelectorAll('[data-action]').forEach(button => button.onclick = () => battleAction(button.dataset.action));

document.querySelector('#interact').onclick = interact;
document.querySelector('#save').onclick = () => {
  localStorage.setItem('fanren-save-v2', JSON.stringify({ step: state.step, complete: state.complete }));
  showToast('当前主线进度已保存');
};
document.querySelector('#journal').onclick = () => showToast(`${STORY[state.step].title}：${STORY[state.step].objective}`);
document.querySelector('#bag').onclick = () => showToast('神秘小瓶 · 回灵丹 × 2 · 解毒散 × 1');
document.querySelector('#auto').onclick = event => {
  state.auto = !state.auto;
  event.currentTarget.textContent = `自动：${state.auto ? '开' : '关'}`;
  maybeAutoBattle();
};

const keys = {};
addEventListener('keydown', event => {
  keys[event.key.toLowerCase()] = true;
  if (event.key.toLowerCase() === 'e') interact();
});
addEventListener('keyup', event => keys[event.key.toLowerCase()] = false);
let joystickVector = { x: 0, y: 0 };
const joystick = document.querySelector('#joystick');
const joystickKnob = joystick.querySelector('span');
function setJoystick(event) {
  const rect = joystick.getBoundingClientRect();
  const point = event.touches?.[0] || event;
  let x = (point.clientX - rect.left - rect.width / 2) / (rect.width * .36);
  let y = (point.clientY - rect.top - rect.height / 2) / (rect.height * .36);
  const length = Math.hypot(x, y) || 1;
  if (length > 1) { x /= length; y /= length; }
  joystickVector = { x, y };
  joystickKnob.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
}
joystick.addEventListener('pointerdown', event => { joystick.setPointerCapture(event.pointerId); setJoystick(event); });
joystick.addEventListener('pointermove', event => { if (event.buttons) setJoystick(event); });
joystick.addEventListener('pointerup', () => { joystickVector = { x: 0, y: 0 }; joystickKnob.style.transform = ''; });
joystick.addEventListener('pointercancel', () => { joystickVector = { x: 0, y: 0 }; joystickKnob.style.transform = ''; });

const clock = new THREE.Clock();
let elapsed = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .05);
  elapsed += dt;
  const canMove = ui.battle.classList.contains('hidden') && ui.dialog.classList.contains('hidden') && !state.complete;
  let x = 0, z = 0;
  if (canMove) {
    x = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + joystickVector.x;
    z = (keys.s ? 1 : 0) - (keys.w ? 1 : 0) + joystickVector.y;
    const length = Math.hypot(x, z);
    if (length > 1) { x /= length; z /= length; }
    player.position.x = THREE.MathUtils.clamp(player.position.x + x * 3.35 * dt, -6, 6);
    player.position.z = THREE.MathUtils.clamp(player.position.z + z * 3.35 * dt, -10, 12);
    if (x || z) {
      player.rotation.y = Math.atan2(x, z);
      player.position.y = Math.abs(Math.sin(elapsed * 8)) * .035;
    } else player.position.y = THREE.MathUtils.lerp(player.position.y, 0, .18);
  }
  camera.position.lerp(new THREE.Vector3(player.position.x + 4.2, 3.9, player.position.z + 5.4), 1 - Math.pow(.002, dt));
  camera.lookAt(player.position.x, 1.1, player.position.z);
  marker.userData.animate?.(elapsed);
  Object.values(actors).forEach((actor, index) => { if (actor.visible) actor.position.y = Math.sin(elapsed * 1.4 + index) * .012; });
  updateTargetHint();
  const near = state.target && player.position.distanceTo(state.target.position) < 2.4;
  ui.interact.classList.toggle('hidden', !near || !ui.dialog.classList.contains('hidden') || state.complete);
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

setStep(0, { teleport: true });
setTimeout(() => ui.chapterCard.classList.add('hidden'), 3200);
animate();

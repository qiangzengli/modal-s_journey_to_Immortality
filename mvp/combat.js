import { npcPublic, npcPosition, npcWallet, ensureNpcState, withdrawNpcOffers } from './npc-state.js';
import { GameError } from './errors.js';
import { ITEMS, SKILLS, WANDERERS, lootEntries } from './combat-data.js';

export function createExploration() {
  return {
    inventory: { worn_sword: 1, healing_pill: 2, spirit_pill: 1 },
    weapon: 'worn_sword', learned: ['qi_bolt'], enemies: {}, battle: null
  };
}
export function ensureExploration(game) { game.exploration ??= createExploration(); return game; }
export function assertPeace(game) {
  if (game.exploration?.battle?.status === 'active') throw new GameError('斗法尚未结束，请先决出胜负或尝试逃跑。');
}
const enemyById = id => WANDERERS.find(enemy => enemy.id === id);
const intentFor = battle => battle.agentIntent || 'attack';
const intentNames = { attack: '试探进攻', heavy: '蓄力重击', guard: '护体守势', heal: '运功疗伤' };
function writeEvent(game, text) {
  game.events.push({ id: game.nextId++, turn: game.turn, actor: '斗法', text, causes: [], scope: 'player' });
}
function weaponPower(state) { return ITEMS[state.weapon]?.attack || 0; }
function powerBonus(game) { return game.flags.playerBreakthrough ? 5 : 0; }
function checkItem(state, id, kind) {
  const item = Object.hasOwn(ITEMS, id || '') ? ITEMS[id] : null;
  if (!item || (kind && item.kind !== kind) || !(state.inventory[id] > 0)) throw new GameError('行囊中没有这件可用物品。');
  return item;
}
function finish(game, status, text) {
  game.exploration.battle.status = status;
  writeEvent(game, text);
  return text;
}

// 每次请求只结算玩家的一次选择和随后的敌方行动；随机结果只由服务端生成。
export function combatAction(source, input, random = Math.random) {
  const game = ensureExploration(structuredClone(source));
  const state = game.exploration;
  let battle = state.battle;
  if (input.type === 'start') {
    if (battle) throw new GameError('请先结束当前斗法结算。');
    const enemy = enemyById(input.enemyId);
    if (!enemy || game.player.place !== (enemy.place || 'woods')) throw new GameError('请先到这位散修所在的区域。');
    if (state.enemies[enemy.id]?.defeated) throw new GameError('此人已经败退，不可重复挑战。');
    if (game.player.hp < 20) throw new GameError('气血不足 20，请先服用回春丹或前往听雨亭疗伤。');
    state.battle = { enemyId: enemy.id, status: 'active', round: 1, enemyHp: enemy.hp, mana: 40, cooldowns: {}, log: [{ round: 0, side: 'world', text: `与${enemy.name}交锋。你先出手，每次行动后敌人会回应。` }] };
    return { game, result: `与${enemy.name}的斗法开始。` };
  }
  if (input.type === 'leave') {
    if (!battle || battle.status === 'active') throw new GameError('斗法中只能通过逃跑脱身。');
    state.battle = null;
    return { game, result: battle.status === 'won' ? '储物袋留在原处，可以随时回来拾取。' : '重新踏上山道。可先服丹或到附近静地调息。' };
  }
  if (input.type === 'claim') {
    assertPeace(game);
    const enemy = enemyById(input.enemyId);
    const record = enemy && state.enemies[enemy.id];
    if ((!enemy || game.player.place !== (enemy.place || 'woods')) || !record?.defeated) throw new GameError('请先在此人所在区域击败他，再拾取储物袋。');
    if (record.looted) throw new GameError('这个储物袋已经取空。');
    ensureNpcState(game);
    const loot = { ...enemy.loot, stones: npcWallet(game, enemy.id).stones };
    game.player.stones += loot.stones;
    npcWallet(game, enemy.id).stones = 0;
    game.player.herbs += enemy.loot.herbs;
    for (const [id, amount] of Object.entries(enemy.loot.items)) state.inventory[id] = (state.inventory[id] || 0) + amount;
    record.looted = true;
    if (battle?.enemyId === enemy.id) state.battle = null;
    const result = `收起${enemy.name}的储物袋：${lootEntries(loot).map(item => `${item.name} ×${item.quantity}`).join('、')}。`;
    writeEvent(game, result);
    return { game, result };
  }
  if (input.type !== 'turn' || !battle || battle.status !== 'active') throw new GameError('当前没有可继续的斗法。');
  const enemy = enemyById(battle.enemyId);
  const intent = intentFor(battle);
  const lines = [];
  const log = (side, text) => { lines.push(text); battle.log.push({ round: battle.round, side, text }); };
  const damage = (power, pierce = false) => Math.max(1, Math.round((power - (pierce ? 0 : enemy.defense)) * (0.9 + random() * 0.2) * (intent === 'guard' ? 0.45 : 1)));
  let guarded = false;
  let interrupted = false;
  let usedSkill;
  let hit = 0;
  if (input.move === 'attack') {
    hit = damage(14 + weaponPower(state) + powerBonus(game));
    const restored = Math.min(5, 40 - battle.mana);
    battle.mana += restored;
    log('player', `你挥动${ITEMS[state.weapon].name}，造成 ${hit} 点伤害，回复 ${restored} 真气。`);
  } else if (input.move === 'skill') {
    const skill = Object.hasOwn(SKILLS, input.skillId || '') && SKILLS[input.skillId];
    if (!skill || !state.learned.includes(input.skillId)) throw new GameError('你尚未学会这门功法。');
    if (battle.cooldowns[input.skillId] > 0) throw new GameError('这门功法尚在冷却中。');
    if (battle.mana < skill.cost) throw new GameError('真气不足，可普攻、防御回气或服用聚气丹。');
    if (skill.heal && game.player.hp >= 100) throw new GameError('气血已满，无需施展回春术。');
    battle.mana -= skill.cost;
    usedSkill = input.skillId;
    if (skill.heal) {
      const amount = Math.min(skill.heal, 100 - game.player.hp);
      game.player.hp += amount;
      log('player', `你施展${skill.name}，恢复 ${amount} 气血。`);
    } else {
      hit = damage(skill.power + weaponPower(state) + powerBonus(game), skill.pierce);
      log('player', `你施展${skill.name}，造成 ${hit} 点伤害。`);
    }
  } else if (input.move === 'guard') {
    guarded = true;
    const amount = Math.min(8, 40 - battle.mana);
    battle.mana += amount;
    log('player', `你凝气防御，本回合减伤 65%，回复 ${amount} 真气。`);
  } else if (input.move === 'item') {
    const item = checkItem(state, input.itemId);
    if (!['pill', 'array'].includes(item.kind)) throw new GameError('此物不能在斗法中使用。');
    if (item.heal && game.player.hp >= 100) throw new GameError('气血已满，无需服用回春丹。');
    if (item.mana && battle.mana >= 40) throw new GameError('真气已满，无需服用聚气丹。');
    state.inventory[input.itemId]--;
    if (item.heal || item.mana) {
      const amount = item.heal ? Math.min(item.heal, 100 - game.player.hp) : Math.min(item.mana, 40 - battle.mana);
      if (item.heal) game.player.hp += amount; else battle.mana += amount;
      log('player', `你服下${item.name}，恢复 ${amount} ${item.heal ? '气血' : '真气'}。`);
    } else {
      hit = damage(item.power, true);
      interrupted = input.itemId === 'binding_array';
      log('player', `你展开${item.name}，造成 ${hit} 点伤害${interrupted ? '，封住敌人本回合行动' : ''}。`);
    }
  } else if (input.move === 'escape') {
    if (random() < enemy.escape) {
      log('player', '你借树影脱离战场，保住了随身物品。');
      finish(game, 'escaped', `你从${enemy.name}面前脱身；气血损伤保留，敌人仍守在原处。`);
      return { game, result: lines.join(' ') };
    }
    log('player', '脱身失败，对方封住了去路！');
  } else throw new GameError('请选择普攻、功法、防御、物品或逃跑。');

  battle.enemyHp = Math.max(0, battle.enemyHp - hit);
  for (const id of Object.keys(battle.cooldowns)) battle.cooldowns[id] = Math.max(0, battle.cooldowns[id] - 1);
  if (usedSkill) battle.cooldowns[usedSkill] = SKILLS[usedSkill].cooldown;
  if (battle.enemyHp === 0) {
    state.enemies[enemy.id] = { defeated: true, looted: false };
    withdrawNpcOffers(game, enemy.id);
    log('world', `${enemy.name}败退，储物袋掉落在林道上。`);
    finish(game, 'won', `你击败了${enemy.name}，对方遗落了储物袋。`);
  } else {
    if (interrupted) log('enemy', `${enemy.name}被缚灵阵困住，未能出手。`);
    else if (intent === 'guard') log('enemy', `${enemy.name}维持护体守势${hit ? '，抵消了部分伤害' : ''}，本回合没有进攻。`);
    else if (intent === 'heal') {
      const amount = Math.min(15, enemy.hp - battle.enemyHp);
      battle.enemyHp += amount;
      log('enemy', `${enemy.name}运功疗伤，恢复 ${amount} 气血。`);
    } else {
      const hurt = Math.max(1, Math.round(enemy.attack * (intent === 'heavy' ? 1.8 : 1) * (0.9 + random() * 0.2) * (guarded ? 0.35 : 1)));
      game.player.hp = Math.max(0, game.player.hp - hurt);
      log('enemy', `${enemy.name}${intent === 'heavy' ? '蓄力重击' : '出手反击'}，你损失 ${hurt} 气血。`);
    }
    if (game.player.hp === 0) {
      const lost = Math.ceil(game.player.stones * 0.1);
      game.player.stones -= lost;
      game.player.hp = 25;
      log('world', `你负伤败退，散落 ${lost} 灵石，气血恢复至 25。功法与物品保留。`);
      finish(game, 'lost', `你败于${enemy.name}，损失 ${lost} 灵石后负伤脱身。`);
    } else battle.round++;
  }
  battle.log = battle.log.slice(-60);
  return { game, result: lines.join(' ') };
}

export function inventoryAction(source, input) {
  const game = ensureExploration(structuredClone(source));
  assertPeace(game);
  const state = game.exploration;
  const item = checkItem(state, input.itemId);
  let result;
  if (input.type === 'equip' && item.kind === 'weapon') {
    if (state.weapon === input.itemId) throw new GameError('这件武器已经装备。');
    state.weapon = input.itemId;
    result = `已装备${item.name}，普攻和伤害功法威力 +${item.attack}。`;
  } else if (input.type === 'learn' && item.kind === 'manual') {
    if (state.learned.includes(item.skill)) throw new GameError('你已经掌握这门功法。');
    state.inventory[input.itemId]--;
    state.learned.push(item.skill);
    result = `研习${item.name}，学会了${SKILLS[item.skill].name}。下一场斗法即可施展。`;
  } else if (input.type === 'use' && item.heal) {
    if (game.player.hp >= 100) throw new GameError('气血已满，无需服丹。');
    const amount = Math.min(item.heal, 100 - game.player.hp);
    state.inventory[input.itemId]--;
    game.player.hp += amount;
    result = `服用${item.name}，恢复 ${amount} 气血。`;
  } else throw new GameError('这件物品无法这样使用；聚气丹与阵盘需在斗法中使用。');
  return { game, result };
}

export function getCombatView(game) {
  const state = game.exploration || createExploration();
  const battle = state.battle;
  const enemy = battle && enemyById(battle.enemyId);
  const intent = enemy && intentFor(battle);
  return {
    roamers: WANDERERS.map(enemy => ({ ...enemy, place: enemy.place || 'woods', ...state.enemies[enemy.id], agent: npcPublic(game, enemy.id), position: npcPosition(game, enemy.id, enemy.place || 'woods'), loot: lootEntries({ ...enemy.loot, stones: game.society?.minds[enemy.id]?.stones ?? enemy.loot.stones }) })),
    inventory: Object.entries(state.inventory).filter(([,n]) => n > 0).map(([id, quantity]) => ({ id, ...ITEMS[id], quantity, equipped: state.weapon === id, learned: state.learned.includes(ITEMS[id].skill) })),
    skills: state.learned.map(id => ({ id, ...SKILLS[id], remaining: battle?.cooldowns[id] || 0 })),
    weapon: { id: state.weapon, ...ITEMS[state.weapon] },
    battle: battle ? { ...structuredClone(battle), enemyName: enemy.name, maxEnemyHp: enemy.hp, intent, intentName: intentNames[intent], escapeChance: enemy.escape, loot: lootEntries(enemy.loot) } : null
  };
}

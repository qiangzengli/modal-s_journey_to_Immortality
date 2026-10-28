import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, applyAction, advanceTurn, getView } from './engine.js';
import { combatAction, inventoryAction, ensureExploration } from './combat.js';
import { SKILLS } from './combat-data.js';

const act = (game, input, roll = 0.5) => combatAction(game, input, () => roll).game;
const turn = (game, move, extra = {}, roll) => act(game, { type: 'turn', move, ...extra }, roll);
function start(enemyId = 'luohu') {
  const game = createGame(); game.player.place = 'woods';
  return act(game, { type: 'start', enemyId });
}
function win(game = start()) {
  for (let i = 0; i < 30 && game.exploration.battle.status === 'active'; i++) game = turn(game, 'attack');
  assert.equal(game.exploration.battle.status, 'won');
  return game;
}

test('旧档补充初始功法与行囊，不改原有资源；迁移幂等', () => {
  const game = createGame(); delete game.exploration;
  game.player.stones = 125; game.player.hp = 69;
  const old = structuredClone(game);
  ensureExploration(game);
  assert.deepEqual(game.player, old.player);
  assert.deepEqual(game.exploration.learned, ['qi_bolt']);
  game.exploration.inventory.healing_pill = 0;
  ensureExploration(game);
  assert.equal(game.exploration.inventory.healing_pill, 0);
});

test('回合由玩家选择推进；真气、功法冷却和敌方反击正确结算', () => {
  let game = start(); const before = structuredClone(game);
  const view = getView(game);
  assert.equal(view.battle.round, 1);
  assert.deepEqual(game, before);
  game = turn(game, 'skill', { skillId: 'qi_bolt' });
  assert.equal(game.player.hp, 89);
  assert.equal(game.exploration.battle.enemyHp, 40);
  assert.equal(game.exploration.battle.mana, 28);
  assert.equal(game.exploration.battle.cooldowns.qi_bolt, 1);
  assert.equal(game.exploration.battle.round, 2);
  assert.throws(() => turn(game, 'skill', { skillId: 'qi_bolt' }), /冷却/);
  game.exploration.battle.agentIntent = 'heavy'; // Agent 选择重击后的确定性结算
  game = turn(game, 'guard');
  assert.equal(game.player.hp, 82);
  assert.equal(game.exploration.battle.mana, 36);
  assert.equal(game.exploration.battle.cooldowns.qi_bolt, 0);
  assert.equal(game.turn, 1);
});

test('逃跑成功不获战利品，失败受到一次反击；伤势保留', () => {
  const source = start();
  const escaped = turn(source, 'escape', {}, 0);
  assert.equal(escaped.exploration.battle.status, 'escaped');
  assert.equal(escaped.player.hp, 100);
  assert.equal(escaped.exploration.enemies.luohu, undefined);
  const failed = turn(source, 'escape', {}, 0.99);
  assert.equal(failed.exploration.battle.status, 'active');
  assert.ok(failed.player.hp < 100);
  assert.equal(failed.exploration.battle.round, 2);
});

test('胜利不受死敌反击，储物袋跨保存保留、只可领取一次', () => {
  let game = start();
  game.exploration.battle.enemyHp = 1;
  game = turn(game, 'attack');
  assert.equal(game.player.hp, 100);
  const won = JSON.parse(JSON.stringify(game));
  game = act(won, { type: 'leave' });
  assert.equal(game.exploration.enemies.luohu.looted, false);
  game = act(game, { type: 'claim', enemyId: 'luohu' });
  assert.equal(game.player.stones, 208);
  assert.equal(game.player.herbs, 2);
  assert.equal(game.exploration.inventory.green_sword, 1);
  assert.throws(() => act(game, { type: 'claim', enemyId: 'luohu' }), /取空/);
  assert.throws(() => act(game, { type: 'start', enemyId: 'luohu' }), /败退/);
  assert.equal(won.exploration.enemies.luohu.looted, false);
});

test('战利品能装备、研习和使用，强化下一场斗法且不可凭空取物', () => {
  let game = act(win(), { type: 'claim', enemyId: 'luohu' });
  game = inventoryAction(game, { type: 'equip', itemId: 'green_sword' }).game;
  game = inventoryAction(game, { type: 'learn', itemId: 'wind_manual' }).game;
  assert.ok(game.exploration.learned.includes('wind_blade'));
  assert.equal(game.exploration.inventory.wind_manual, 0);
  assert.throws(() => inventoryAction(game, { type: 'equip', itemId: 'thunder_blade' }), /没有/);
  game = act(game, { type: 'start', enemyId: 'suqin' });
  game = turn(game, 'skill', { skillId: 'wind_blade' });
  assert.equal(game.exploration.battle.enemyHp, 45);
});

test('丹药按实际恢复消耗，阵盘打断敌人，非法回合完全不改原档', () => {
  let game = start(); const original = structuredClone(game);
  for (const input of [{ move: 'item', itemId: 'healing_pill' }, { move: 'skill', skillId: 'fire_art' }, { move: 'item', itemId: '__proto__' }, { move: 'nope' }]) {
    assert.throws(() => act(game, { type: 'turn', ...input }));
    assert.deepEqual(game, original);
  }
  game.player.hp = 80;
  game = turn(game, 'item', { itemId: 'healing_pill' });
  assert.equal(game.player.hp, 89);
  assert.equal(game.exploration.inventory.healing_pill, 1);
  game.exploration.inventory.binding_array = 1;
  const hp = game.player.hp;
  game = turn(game, 'item', { itemId: 'binding_array' });
  assert.equal(game.player.hp, hp);
  assert.equal(game.exploration.inventory.binding_array, 0);
});

test('斗法中禁止移动、推进时间及场外服丹；败退有明示代价且可继续游玩', () => {
  const game = start('mochi');
  assert.throws(() => applyAction(game, { type: 'travel_market' }), /斗法/);
  assert.throws(() => advanceTurn(game), /斗法/);
  assert.throws(() => inventoryAction(game, { type: 'use', itemId: 'healing_pill' }), /斗法/);
  assert.throws(() => act(game, { type: 'leave' }), /逃跑/);
  assert.throws(() => act(game, { type: 'claim', enemyId: 'mochi' }), /斗法/);
  game.player.hp = 1; game.exploration.battle.round = 2;
  const lost = turn(game, 'attack');
  assert.equal(lost.exploration.battle.status, 'lost');
  assert.equal(lost.player.hp, 25);
  assert.equal(lost.player.stones, 162);
  assert.deepEqual(lost.exploration.inventory, game.exploration.inventory);
  assert.equal(lost.exploration.enemies.mochi, undefined);
  assert.equal(applyAction(lost, { type: 'travel_market' }).game.player.place, 'market');
});

test('场外和未击败时不能获取储物袋，真气不足不能出招', () => {
  assert.throws(() => act(createGame(), { type: 'start', enemyId: 'luohu' }), /所在的区域/);
  const game = start(); game.exploration.battle.mana = 0;
  assert.throws(() => turn(game, 'skill', { skillId: 'qi_bolt' }), /真气不足/);
  const roaming = createGame(); roaming.player.place = 'woods';
  assert.throws(() => act(roaming, { type: 'claim', enemyId: 'luohu' }), /击败/);
});

test('人物基础属性随境界成长；换装只增加附加威力，旧档读取不写入属性', () => {
  const old = createGame(); delete old.exploration;
  const snapshot = structuredClone(old);
  const initial = getView(old).combatStats;
  assert.equal(initial.baseAttack, 14);
  assert.equal(initial.baseSpellPower, 20);
  assert.equal(initial.basicAttack.total, 16);
  assert.equal(initial.maxMana, 40);
  assert.deepEqual(old, snapshot);
  let game = createGame(); game.exploration.inventory.green_sword = 1;
  game = inventoryAction(game, { type: 'equip', itemId: 'green_sword' }).game;
  const equipped = getView(game);
  assert.equal(equipped.combatStats.baseAttack, initial.baseAttack);
  assert.equal(equipped.combatStats.baseSpellPower, initial.baseSpellPower);
  assert.equal(equipped.combatStats.basicAttack.total, 21);
  assert.equal(equipped.skills[0].scaling.total, 32);
  game.flags.playerBreakthrough = 1;
  const advanced = getView(game);
  assert.equal(advanced.combatStats.baseAttack, 19);
  assert.equal(advanced.combatStats.baseSpellPower, 25);
  assert.equal(advanced.combatStats.basicAttack.total, 26);
  assert.equal(advanced.skills[0].scaling.total, 37);
  assert.equal(advanced.combatStats.maxMana, 40);
});

test('普攻与所有伤害功法的面板威力和实战一致；筑基、武器、防御与波动只结算一次', () => {
  for (const breakthrough of [0, 1]) for (const weapon of ['worn_sword', 'green_sword']) {
    const source = start('mochi');
    source.flags.playerBreakthrough = breakthrough;
    source.exploration.weapon = weapon;
    source.exploration.inventory[weapon] = 1;
    source.exploration.learned = Object.keys(SKILLS);
    const view = getView(source);
    const moves = [{ move: 'attack', total: view.combatStats.basicAttack.total, pierce: false }, ...view.skills.filter(skill => skill.effect === 'damage').map(skill => ({ move: 'skill', skillId: skill.id, total: skill.scaling.total, pierce: skill.pierce }))];
    for (const intent of ['attack', 'guard']) for (const roll of [0, 0.5, 1]) for (const { total, pierce, ...move } of moves) {
      source.exploration.battle.agentIntent = intent;
      const next = act(source, { type: 'turn', ...move }, roll);
      const expected = Math.max(1, Math.round((total - (pierce ? 0 : 4)) * (0.9 + roll * 0.2) * (intent === 'guard' ? 0.45 : 1)));
      assert.equal(132 - next.exploration.battle.enemyHp, expected, `${weapon}/${breakthrough}/${intent}/${roll}/${move.skillId || move.move}`);
      assert.equal(getView(next).combatStats.baseSpellPower, view.combatStats.baseSpellPower);
    }
  }
});

test('回春术使用基础法力且不吃兵器，治疗封顶；丹药和阵盘保持固定效果', () => {
  for (const breakthrough of [0, 1]) for (const weapon of ['worn_sword', 'thunder_blade']) {
    const game = start('mochi');
    game.flags.playerBreakthrough = breakthrough;
    game.exploration.weapon = weapon;
    game.exploration.learned.push('spring_art');
    game.exploration.battle.agentIntent = 'guard';
    game.player.hp = 30;
    const view = getView(game);
    const skill = view.skills.find(skill => skill.id === 'spring_art');
    assert.equal(skill.scaling.weaponBonus, 0);
    assert.equal(skill.scaling.total, breakthrough ? 37 : 32);
    const healed = turn(game, 'skill', { skillId: 'spring_art' });
    assert.equal(healed.player.hp, 30 + skill.scaling.total);
    assert.equal(healed.exploration.battle.mana, 24);
    assert.equal(turn(game, 'item', { itemId: 'healing_pill' }).player.hp, 65);
    game.player.hp = 95;
    assert.equal(turn(game, 'skill', { skillId: 'spring_art' }).player.hp, 100);
    game.player.hp = 100;
    assert.throws(() => turn(game, 'skill', { skillId: 'spring_art' }), /气血已满/);
    game.exploration.inventory.thunder_array = 1;
    game.exploration.battle.agentIntent = 'attack';
    assert.equal(turn(game, 'item', { itemId: 'thunder_array' }).exploration.battle.enemyHp, 92);
  }
});

test('真气恢复使用统一上限，施法只消耗真气，不扣基础法力', () => {
  const game = start();
  game.flags.playerBreakthrough = 1;
  game.exploration.battle.mana = 38;
  for (const [move, extra] of [['attack', {}], ['guard', {}], ['item', { itemId: 'spirit_pill' }]]) {
    const next = turn(game, move, extra);
    assert.equal(next.exploration.battle.mana, getView(next).combatStats.maxMana);
    assert.equal(getView(next).combatStats.baseSpellPower, 25);
  }
  const full = turn(game, 'guard');
  assert.throws(() => turn(full, 'item', { itemId: 'spirit_pill' }), /真气已满/);
  const cast = turn(game, 'skill', { skillId: 'qi_bolt' });
  assert.equal(cast.exploration.battle.mana, 26);
  assert.equal(getView(cast).combatStats.baseSpellPower, 25);
});

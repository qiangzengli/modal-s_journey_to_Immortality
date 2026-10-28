import { ITEMS } from './combat-data.js';

// Derived from existing progression/equipment: reading an old save needs no migration.
export function getCombatStats(game) {
  const realmBonus = game.flags.playerBreakthrough ? 5 : 0;
  const baseAttack = 14 + realmBonus;
  const baseSpellPower = 20 + realmBonus;
  const weaponBonus = ITEMS[game.exploration?.weapon || 'worn_sword']?.attack || 0;
  return {
    baseAttack, baseSpellPower, realmBonus, weaponBonus, maxMana: 40,
    basicAttack: { attribute: 'attack', base: baseAttack, skillBonus: 0, weaponBonus, total: baseAttack + weaponBonus }
  };
}

// All ability totals are built on the character's current, unequipped attributes.
// Consumable pills/arrays intentionally do not use character scaling.
export function getSkillScaling(stats, skill) {
  const base = skill.attribute === 'attack' ? stats.baseAttack : stats.baseSpellPower;
  const weaponBonus = skill.effect === 'heal' ? 0 : stats.weaponBonus;
  return { attribute: skill.attribute, base, skillBonus: skill.bonus, weaponBonus, total: base + skill.bonus + weaponBonus };
}

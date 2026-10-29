// Enemy tactics propose actions; their recovery budget belongs to the rules.
export const ENEMY_RECOVERY = Object.freeze({ amount: 15, maxUses: 2, cooldown: 3 });

export function getEnemyRecovery(battle) {
  const saved = battle.enemyRecovery;
  // Pre-limit saves contain only the rolling combat log. Preserve every visible
  // use, including the old text-only entries, rather than refilling on reload.
  const history = (battle.log || []).filter(entry => entry.side === 'enemy' &&
    (entry.move === 'heal' || /(?:运功疗伤|盘身回气)，恢复 \d+ 气血/.test(entry.text || '')));
  const used = Math.min(ENEMY_RECOVERY.maxUses, Math.max(0,
    Number.isInteger(saved?.used) ? saved.used : history.length));
  const lastRound = Math.max(0, ...history.map(entry => Number.isInteger(entry.round) ? entry.round : 0));
  const nextRound = Number.isInteger(saved?.nextRound) && saved.nextRound >= 1 ? saved.nextRound :
    lastRound ? lastRound + ENEMY_RECOVERY.cooldown + 1 : 1;
  const remaining = ENEMY_RECOVERY.maxUses - used;
  const cooldown = Math.max(0, nextRound - battle.round);
  return { ...ENEMY_RECOVERY, used, remaining, nextRound, cooldown, available: remaining > 0 && cooldown === 0 };
}

export function legalEnemyTactic(battle, enemy, tactic = { intent: battle.agentIntent || 'attack', speech: battle.intentSpeech }) {
  if (tactic.intent !== 'heal') return tactic;
  const recovery = getEnemyRecovery(battle);
  if (recovery.available && battle.enemyHp <= enemy.hp * .35) return tactic;
  const reason = !recovery.remaining ? '疗伤余力已耗尽' : recovery.cooldown ? '疗伤尚在冷却' : '尚未进入重伤状态';
  return { intent: 'attack', speech: `${enemy.name}${reason}，转而${enemy.kind === 'beast' ? '探爪扑击' : '试探进攻'}。` };
}

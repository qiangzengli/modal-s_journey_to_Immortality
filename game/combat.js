import {applyCampaignAction} from './campaign.js';
import {applyVolumeAction} from './volume.js';
import { npcPublic, npcPosition, npcWallet, ensureNpcState, withdrawNpcOffers } from './npc-state.js';
import { GameError } from './errors.js';
import { ITEMS, SKILLS, ALL_ENEMIES as WANDERERS, enemyAvailable, lootEntries, encounterLoot } from './combat-data.js';
import { getCombatStats, getSkillScaling } from './combat-stats.js';
import { affiliationFor } from './sects.js';

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
const alliesFor=enemy=>enemy.allies||(enemy.ally?[enemy.ally]:[]);
const teamIds=enemy=>['player',...alliesFor(enemy).map(ally=>ally.id)];
const allyState=(battle,ally)=>({hp:ally.maxHp,mana:ally.maxMana,cooldowns:{},...battle.allyStates?.[ally.id]});
const actorHp=(game,battle,enemy,id)=>id==='player'?game.player.hp:allyState(battle,alliesFor(enemy).find(p=>p.id===id)).hp;
const livingIds=(game,battle,enemy)=>teamIds(enemy).filter(id=>actorHp(game,battle,enemy,id)>0);
const nextActor=(game,battle,enemy)=>livingIds(game,battle,enemy).find(id=>!battle.actedIds?.includes(id))||'player';
const targetFor=(game,battle,enemy)=>{const ids=livingIds(game,battle,enemy);return ids[(battle.round-1)%ids.length]||'player';};
const intentFor = battle => battle.agentIntent || 'attack';
const intentNames = { attack: '试探进攻', heavy: '蓄力重击', guard: '护体守势', heal: '运功疗伤' };
function writeEvent(game, text) {
  const id = game.nextId++;
  game.events.push({ id, turn: game.turn, actor: '斗法', text, causes: [], scope: 'player' });
  return id;
}
function checkItem(state, id, kind) {
  const item = Object.hasOwn(ITEMS, id || '') ? ITEMS[id] : null;
  if (!item || (kind && item.kind !== kind) || !(state.inventory[id] > 0)) throw new GameError('行囊中没有这件可用物品。');
  return item;
}
function finish(game, status, text) {
  game.exploration.battle.status = status;
  return writeEvent(game, text);
}

// 每次请求只结算队内一人的选择；全队行动完才结算一次反击。
export function combatAction(source, input, random = Math.random) {
  const game = ensureExploration(structuredClone(source));
  const state = game.exploration;
  const stats = getCombatStats(game);
  let battle = state.battle;
  if (input.type === 'start') {
    if (battle) throw new GameError('请先结束当前斗法结算。');
    const enemy = enemyById(input.enemyId);
    if (!enemy || game.player.place !== (enemy.place || 'woods')) throw new GameError('请先到对手所在的区域。');
    if(!enemyAvailable(game,enemy))throw new GameError('这场交锋尚未开放，请先完成战前调查，已完成的经历不能重演。');
    if (state.enemies[enemy.id]?.defeated) throw new GameError('对手已经败退，不可重复挑战。');
    if (game.player.hp < 20) throw new GameError('气血不足 20，请先服用回春丹或到附近静地疗伤。');
    state.battle = { enemyId: enemy.id, status: 'active', round: 1, enemyHp: enemy.hp, ward:enemy.ward||0, mana: stats.maxMana, cooldowns: {}, log: [{ round: 0, side: 'world', text: `与${enemy.name}交锋。${alliesFor(enemy).length?'队内每人各行动一次，再由对手反击。':'你先出手，每次行动后敌人会回应。'}` }] };
    return { game, result: `与${enemy.name}的斗法开始。` };
  }
  if (input.type === 'leave') {
    if (!battle || battle.status === 'active') throw new GameError('斗法中只能通过逃跑脱身。');
    state.battle = null;
    return { game, result: battle.status === 'won' ? (enemyById(battle.enemyId).reward?'天灵果留在石殿，可以回来收取。':enemyById(battle.enemyId).campaign?'储物袋留在原处，须在携药离开禁地前回来拾取。':'储物袋留在原处，可以随时回来拾取。') : '重新踏上山道。可先服丹或到附近静地调息。' };
  }
  if (input.type === 'claim') {
    assertPeace(game);
    const enemy = enemyById(input.enemyId);
    const record = enemy && state.enemies[enemy.id];
    if ((!enemy || game.player.place !== (enemy.place || 'woods')) || !record?.defeated) throw new GameError('请先在对手所在区域击败对手，再收取战后所得。');
    if (record.looted) throw new GameError(enemy.reward?'天灵果已经收取，不能重复领取。':'这个储物袋已经取空。');
    if (enemy.campaign && !game.campaign.storyFlags[enemy.completion] && (game.campaign.storyFlags.leave_forbidden || game.flags.playerBreakthrough)) throw new GameError('禁地试炼已经结束，不能再返回搜取战利品。');
    ensureNpcState(game);
    const loot = { ...enemy.loot, stones: enemy.lootFromWallet === false ? enemy.loot.stones : npcWallet(game, enemy.id).stones };
    game.player.stones += loot.stones;
    if (enemy.lootFromWallet !== false) npcWallet(game, enemy.id).stones = 0;
    game.player.herbs += enemy.loot.herbs;
    for (const [id, amount] of Object.entries(enemy.loot.items)) state.inventory[id] = (state.inventory[id] || 0) + amount;
    record.looted = true;
    if (battle?.enemyId === enemy.id) state.battle = null;
    const result = enemy.reward ? `墨蛟已被击败，你与南宫婉收取石殿中的天灵果。` : `收起${enemy.name}的储物袋：${lootEntries(loot).map(item => `${item.name} ×${item.quantity}`).join('、')}。`;
    writeEvent(game, result);
    if(enemy.scope==='campaign'||enemy.campaign)return {game,result:applyCampaignAction(game,enemy.completion)};
    if(enemy.completion&&!game.volume?.flags[enemy.completion])return {game,result:result+' '+applyVolumeAction(game,enemy.completion)};
    return { game, result };
  }
  if (input.type !== 'turn' || !battle || battle.status !== 'active') throw new GameError('当前没有可继续的斗法。');
  const enemy = enemyById(battle.enemyId);
  const actorId=input.actorId??nextActor(game,battle,enemy);
  if(!teamIds(enemy).includes(actorId))throw new GameError('这名角色不在本场斗法队伍中。');
  if(actorHp(game,battle,enemy,actorId)<=0)throw new GameError('这名角色已经倒下，不能继续出招。');
  if(battle.actedIds?.includes(actorId))throw new GameError('这名角色本回合已行动，请选择尚未行动的队友。');
  const ally=alliesFor(enemy).find(p=>p.id===actorId);
  for(const member of alliesFor(enemy)){battle.allyStates??={};battle.allyStates[member.id]=allyState(battle,member);}
  const actorState=ally?battle.allyStates[actorId]:battle;
  battle.actionNumber=(battle.actionNumber||0)+1;
  const intent = intentFor(battle);
  const lines = [];
  let effect=({attack:'slash',guard:'shield',escape:'escape'})[input.move]||input.skillId||input.itemId;
  const log = (side, text,meta={}) => { lines.push(text); battle.log.push({ round: battle.round,actionNumber:battle.actionNumber, side, text,...(['player','ally'].includes(side)?{actorId,move:input.move,effect}: {}),...meta }); };
  const damage = (power, pierce = false) => Math.max(1, Math.round((power - (pierce ? 0 : enemy.defense)) * (0.9 + random() * 0.2) * (intent === 'guard' ? 0.45 : 1)));
  const guardedIds=[...(battle.roundEffects?.guardedIds||[])];
  let interrupted = battle.roundEffects?.interrupted||false;
  let usedSkill;
  let cooldown;
  let hit = 0;
  if(ally){
    if(input.move==='attack'){
      hit=damage(ally.power);const restored=Math.min(5,ally.maxMana-actorState.mana);actorState.mana+=restored;
      log('ally',`${ally.name}挥动${ally.weaponName}，造成 ${hit} 点伤害，回复 ${restored} 真气。`);
    }else if(input.move==='skill'){
      const skill=ally.skills.find(s=>s.id===input.skillId);
      if(!skill)throw new GameError('这名同伴尚未学会这门法术。');
      if(actorState.cooldowns[skill.id]>0)throw new GameError('这门法术尚在冷却中。');
      if(actorState.mana<skill.cost)throw new GameError('同伴真气不足，可普攻或凝气防御回气。');
      if(skill.heal&&actorState.hp>=ally.maxHp)throw new GameError('同伴气血已满，无需施展疗伤法术。');
      actorState.mana-=skill.cost;usedSkill=skill.id;cooldown=skill.cooldown;effect=skill.effect;
      if(skill.heal){const healed=Math.min(skill.heal,ally.maxHp-actorState.hp);actorState.hp+=healed;log('ally',`${ally.name}施展${skill.name}，恢复 ${healed} 气血。`);}
      else {hit=damage(skill.power,skill.pierce);log('ally',`${ally.name}施展${skill.name}，造成 ${hit} 点伤害。`);}
    }else if(input.move==='guard'){
      guardedIds.push(actorId);const restored=Math.min(8,ally.maxMana-actorState.mana);actorState.mana+=restored;
      log('ally',`${ally.name}以朱雀环护身，本回合自身减伤 65%，回复 ${restored} 真气。`);
    }else throw new GameError('同伴可选择普攻、法术或凝气防御；物品和撤退由韩立操作。');
  }else if (input.move === 'attack') {
    hit = damage(stats.basicAttack.total);
    const restored = Math.min(5, stats.maxMana - battle.mana);
    battle.mana += restored;
    log('player', `你挥动${ITEMS[state.weapon].name}，造成 ${hit} 点伤害，回复 ${restored} 真气。`);
  } else if (input.move === 'skill') {
    const skill = Object.hasOwn(SKILLS, input.skillId || '') && SKILLS[input.skillId];
    if (!skill || !state.learned.includes(input.skillId)) throw new GameError('你尚未学会这门功法。');
    if (battle.cooldowns[input.skillId] > 0) throw new GameError('这门功法尚在冷却中。');
    if (battle.mana < skill.cost) throw new GameError('真气不足，可普攻、防御回气或服用黄龙丹。');
    if (skill.effect === 'heal' && game.player.hp >= 100) throw new GameError('气血已满，无需施展回春功。');
    battle.mana -= skill.cost;
    usedSkill = input.skillId;
    cooldown=skill.cooldown;
    const scaling = getSkillScaling(stats, skill);
    if (skill.effect === 'heal') {
      const amount = Math.min(scaling.total, 100 - game.player.hp);
      game.player.hp += amount;
      log('player', `你施展${skill.name}，恢复 ${amount} 气血。`);
    } else {
      hit = damage(scaling.total, skill.pierce);
      log('player', `你施展${skill.name}，造成 ${hit} 点伤害。`);
    }
  } else if (input.move === 'guard') {
    guardedIds.push(actorId);
    const amount = Math.min(8, stats.maxMana - battle.mana);
    battle.mana += amount;
    log('player', `你凝气防御，本回合减伤 65%，回复 ${amount} 真气。`);
  } else if (input.move === 'item') {
    const item = checkItem(state, input.itemId);
    if (!['pill', 'array'].includes(item.kind)) throw new GameError('此物不能在斗法中使用。');
    if (item.heal && game.player.hp >= 100) throw new GameError('气血已满，无需服用回春丹。');
    if (item.mana && battle.mana >= stats.maxMana) throw new GameError('真气已满，无需服用黄龙丹。');
    state.inventory[input.itemId]--;
    if (item.heal || item.mana) {
      const amount = item.heal ? Math.min(item.heal, 100 - game.player.hp) : Math.min(item.mana, stats.maxMana - battle.mana);
      if (item.heal) game.player.hp += amount; else battle.mana += amount;
      log('player', `你服下${item.name}，恢复 ${amount} ${item.heal ? '气血' : '真气'}。`);
    } else {
      hit = damage(item.power, true);
      interrupted = input.itemId === 'binding_array';
      log('player', `你展开${item.name}，造成 ${hit} 点伤害${interrupted ? '，封住敌人本回合行动' : ''}。`);
    }
  } else if (input.move === 'escape') {
    if (random() < enemy.escape) {
      log('player', '你借地势脱离战场，保住了随身物品。');
      finish(game, 'escaped', `你从${enemy.name}面前脱身；气血损伤保留，敌人仍守在原处。`);
      return { game, result: lines.join(' ') };
    }
    log('player', '脱身失败，对方封住了去路！');
  } else throw new GameError('请选择普攻、功法、防御、物品或逃跑。');

  if(hit>0&&battle.ward>0){
    const absorbed=Math.min(battle.ward,hit);battle.ward-=absorbed;hit-=absorbed;
    log('enemy',`${enemy.wardName||'金刚护罩'}抵消 ${absorbed} 点伤害，护罩余力 ${battle.ward}。${battle.ward?'继续寻找破绽。':'护罩已破！'}`);
  }
  battle.enemyHp = Math.max(0, battle.enemyHp - hit);
  for (const id of Object.keys(actorState.cooldowns)) actorState.cooldowns[id] = Math.max(0, actorState.cooldowns[id] - 1);
  if (usedSkill) actorState.cooldowns[usedSkill] = cooldown;
  battle.actedIds=[...(battle.actedIds||[]),actorId];
  battle.roundEffects={guardedIds,interrupted};
  if(battle.enemyHp>0&&livingIds(game,battle,enemy).some(id=>!battle.actedIds.includes(id)))return {game,result:lines.join(' ')};
  if (battle.enemyHp === 0) {
    if(game.player.hp===0){game.player.hp=25;log('world','同伴赢下斗法，掩护你调息至 25 气血。');}
    state.enemies[enemy.id] = { defeated: true, looted: false };
    withdrawNpcOffers(game, enemy.id);
    log('world', enemy.reward?'墨蛟倒下，守护天灵果的威胁已除。收取主药后才能继续离开禁地。':`${enemy.name}败退，储物袋掉落在林道上。`);
    state.enemies[enemy.id].victoryEventId = finish(game, 'won', enemy.reward?'你与南宫婉合力击败墨蛟，天灵果等待收取。':`你击败了${enemy.name}，对方遗落了储物袋。`);
  } else {
    if (interrupted) log('enemy', `${enemy.name}被定神符困住，未能出手。`);
    else if (intent === 'guard') log('enemy', `${enemy.name}维持护体守势${hit ? '，抵消了部分伤害' : ''}，本回合没有进攻。`);
    else if (intent === 'heal') {
      const amount = Math.min(15, enemy.hp - battle.enemyHp);
      battle.enemyHp += amount;
      log('enemy', `${enemy.name}${enemy.kind==='beast'?'盘身回气':'运功疗伤'}，恢复 ${amount} 气血。`);
    } else {
      const targetId=targetFor(game,battle,enemy),targetAlly=alliesFor(enemy).find(p=>p.id===targetId),target=targetAlly?battle.allyStates[targetId]:game.player;
      const hurt = Math.max(1, Math.round((enemy.attack * (intent === 'heavy' ? 1.8 : 1)-(targetAlly?.defense||0)) * (0.9 + random() * 0.2) * (guardedIds.includes(targetId) ? 0.35 : 1)));
      target.hp = Math.max(0, target.hp - hurt);
      log('enemy', `${enemy.name}${enemy.kind==='beast'?(intent==='heavy'?'蓄力甩尾':'探爪扑击'):(intent === 'heavy' ? '蓄力重击' : '出手反击')}，${targetAlly?.name||'你'}损失 ${hurt} 气血。`,{targetId});
      if(target.hp===0)log('world',`${targetAlly?.name||'韩立'}倒下，暂时无法继续出招。`);
    }
    if (!livingIds(game,battle,enemy).length) {
      const lost = Math.ceil(game.player.stones * 0.1);
      game.player.stones -= lost;
      game.player.hp = 25;
      log('world', `你负伤败退，散落 ${lost} 灵石，气血恢复至 25。功法与物品保留。`);
      finish(game, 'lost', `你败于${enemy.name}，损失 ${lost} 灵石后负伤脱身。`);
    } else {battle.round++;battle.actedIds=[];battle.roundEffects={};}
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
  } else throw new GameError('这件物品无法这样使用；黄龙丹与阵盘需在斗法中使用。');
  return { game, result };
}

export function getCombatView(game) {
  const state = game.exploration || createExploration();
  const stats = getCombatStats(game);
  const battle = state.battle;
  const enemy = battle && enemyById(battle.enemyId);
  const intent = enemy && intentFor(battle);
  return {
    combatStats: stats,
    roamers: WANDERERS.filter(enemy=>enemyAvailable(game,enemy)).map(enemy => ({ ...enemy, affiliation: affiliationFor(game, enemy.id), place: enemy.place || 'woods', ...state.enemies[enemy.id], agent: npcPublic(game, enemy.id), position: npcPosition(game, enemy.id, enemy.place || 'woods'), loot: enemy.campaign&&!state.enemies[enemy.id]?.defeated ? [] : enemy.reward?encounterLoot(enemy):lootEntries({ ...enemy.loot, stones: enemy.lootFromWallet === false ? enemy.loot.stones : game.society?.minds[enemy.id]?.stones ?? enemy.loot.stones }) })),
    inventory: Object.entries(state.inventory).filter(([,n]) => n > 0).map(([id, quantity]) => ({ id, ...ITEMS[id], quantity, equipped: state.weapon === id, learned: state.learned.includes(ITEMS[id].skill) })),
    skills: state.learned.map(id => {
      const skill = SKILLS[id];
      const scaling = getSkillScaling(stats, skill);
      return { id, ...skill, scaling, [skill.effect === 'heal' ? 'heal' : 'power']: scaling.base + scaling.skillBonus, remaining: battle?.cooldowns[id] || 0 };
    }),
    weapon: { id: state.weapon, ...ITEMS[state.weapon] },
    battle: battle ? { ...structuredClone(battle),actingId:nextActor(game,battle,enemy),targetId:targetFor(game,battle,enemy),actedIds:[...(battle.actedIds||[])],team:[
      {id:'player',name:'韩立',hp:game.player.hp,maxHp:100,defense:0,mana:battle.mana,maxMana:stats.maxMana,weaponName:ITEMS[state.weapon].name,power:stats.basicAttack.total,skills:state.learned.map(id=>({id,...SKILLS[id],power:getSkillScaling(stats,SKILLS[id]).total,remaining:battle.cooldowns[id]||0}))},
      ...alliesFor(enemy).map(ally=>({...ally,hp:allyState(battle,ally).hp,mana:allyState(battle,ally).mana,skills:ally.skills.map(skill=>({...skill,remaining:allyState(battle,ally).cooldowns[skill.id]||0}))}))
    ].map(actor=>({...actor,canAct:battle.status==='active'&&actor.hp>0&&!battle.actedIds?.includes(actor.id)})),enemyName: enemy.name, maxEnemyHp: enemy.hp, boss:Boolean(enemy.boss), chapterFinale:Boolean(enemy.chapterFinale), wardName:enemy.wardName||'金刚护罩', intent, intentName: intentNames[intent], escapeChance: enemy.escape, ally:enemy.ally, reward:enemy.reward, rewardName:enemy.rewardName, loot: encounterLoot(enemy) } : null
  };
}

import { affiliationText } from './sect-ui.js';
import { createEquipmentUI, combatScalingText } from './equipment-ui.js';
import { createAutoCombatUI } from './auto-combat-ui.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const $ = selector => document.querySelector(selector);
const lootMarkup = loot => loot.map(item => `<div class="loot-item"><small>${esc(item.kind)}</small><strong>${esc(item.name)}</strong><span>× ${item.quantity}</span></div>`).join('');

export function createCombatUI({ request, navigate, openInventory }) {
  let current;
  let pending = false;
  let slow = false;
  let tab = 'skills';
  let selectedActor='player';
  let previousEnemy;
  let previousTurn;
  const stage = $('#combat-stage');
  const autoCombat=createAutoCombatUI({stage,getState:()=>current,isPending:()=>pending,perform:input=>submit('/api/combat',input)});
  const actor=()=>current?.battle?.team.find(member=>member.id===selectedActor);
  const equipmentUI = createEquipmentUI({
    element: $('#equipment'),
    onAction: input => submit('/api/inventory', input)
  });
  function updateRoundLabel() {
    const battle = current?.battle;
    if (!battle) return;
    $('#battle-round').textContent = pending ? (slow?'战报同步中，请勿重复出招':'招式交锋中…') : battle.status === 'active' ? `第 ${battle.round} 回合 · ${actor()?.name||'韩立'}出招` : { won: battle.chapterFinale?'王蝉败退 · 确认后完成第一章':battle.reward?'胜负已分 · 天灵果待收取':'胜负已分 · 储物袋掉落', lost: '负伤败退', escaped: '成功脱身' }[battle.status];
  }
  function control(move, title, detail, extra = '', reason = '') {
    return `<button type="button" data-combat-move="${move}" ${extra} ${reason ? 'disabled' : ''}><strong>${esc(title)}</strong><small>${esc(reason || detail)}</small></button>`;
  }
  function renderInventory() {
    equipmentUI.render(current, { pending });
    $('#roamers').innerHTML = current.roamers.map(enemy => `<button type="button" class="roamer-row" data-roamer="${enemy.id}" ${enemy.looted ? 'disabled' : ''}><span style="--roamer-color:${enemy.color}">${enemy.defeated ? (enemy.reward?'果':'袋') : enemy.name[0]}</span><div><strong>${enemy.name} <small>${enemy.realm}</small></strong><p>${enemy.looted ? (enemy.reward?'已完成 · 主药已收取':'已败退 · 储物袋已取空') : enemy.defeated ? (enemy.reward?'天灵果待收取':'储物袋待拾取') : `${enemy.kind==='beast'?'石殿妖兽':affiliationText(enemy.affiliation)} · 气血 ${enemy.hp}`}</p></div><b>↗</b></button>`).join('');
  }
  function render(view) {
    current = view;
    renderInventory();
    const battle = view.battle;
    document.body.classList.toggle('in-combat', Boolean(battle));
    stage.hidden = !battle;
    if (!battle) { previousEnemy = null; previousTurn = null; autoCombat.sync(); return; }
    if (previousEnemy !== battle.enemyId) { tab = 'skills';selectedActor=battle.actingId; previousEnemy = battle.enemyId; }
    if(!actor()?.canAct&&battle.status==='active'){selectedActor=battle.actingId;tab='skills';}
    const member=actor(),isPlayer=member.id==='player';
    const active = battle.status === 'active';
    const enemy = view.roamers.find(person => person.id === battle.enemyId);
    const intentCopy = { heavy: '重击将至 · 防御可减伤 65%，定神符可打断', guard: '护体中 · 伤害减免 55%，该次不会攻击', heal: '即将恢复 15 气血 · 可趁机进攻', attack: '全队行动后反击' };
    updateRoundLabel();
    $('#battle-order').textContent=battle.team.length>1?'队内每人行动一次，再由敌方反击 · 可选择先后顺序':'双方依次行动 · 时间不会自动推进';
    $('#combat-team').hidden=battle.team.length<2;
    $('#combat-team').innerHTML=battle.team.map(p=>`<button type="button" data-combat-actor="${esc(p.id)}" aria-pressed="${selectedActor===p.id}" ${!p.canAct?'disabled':''}><strong>${esc(p.name)} <em>${p.hp<=0?'已倒下':p.canAct?'待出招':'已行动'}</em></strong><small>气血 ${p.hp} / ${p.maxHp}</small><span class="battle-bar"><i data-team-hp="${esc(p.id)}" style="width:${p.hp/p.maxHp*100}%"></i></span><small>真气 ${p.mana} / ${p.maxMana}</small><span class="battle-bar mana"><i data-team-mana="${esc(p.id)}" style="width:${p.mana/p.maxMana*100}%"></i></span></button>`).join('');
    $('#combat-actor-status').textContent=`${member.name} · 真气 ${member.mana} / ${member.maxMana} · ${member.weaponName} · 攻击 ${member.power} · 防御 ${member.defense}`;
    $('#battle-player-hp').textContent = `${view.player.hp} / 100`;
    $('#battle-player-bar').style.width = `${view.player.hp}%`;
    $('#battle-mana').textContent = `${battle.mana} / ${view.combatStats.maxMana}`;
    $('#battle-mana-bar').style.width = `${battle.mana / view.combatStats.maxMana * 100}%`;
    $('#battle-weapon').textContent = view.weapon.name;
    $('#battle-enemy').textContent = enemy.name;
    $('#battle-enemy-realm').textContent = `${battle.boss?'BOSS · ':''}${enemy.realm} · ${enemy.kind==='beast'?'石殿妖兽':affiliationText(enemy.affiliation)}`;
    $('#battle-enemy-hp').textContent = `${battle.enemyHp} / ${enemy.hp}`;
    $('#battle-enemy-bar').style.width = `${battle.enemyHp / enemy.hp * 100}%`;
    $('#battle-intent').textContent = active ? `${battle.ally?`${battle.ally.name}协战 · 可切换角色选择普攻或法术 · `:''}${battle.ward?`${battle.wardName} ${battle.ward} · `:''}${battle.intentSource==='model'?'Agent 战术':'基础应对'} · ${battle.intentSpeech || battle.intentName}${['attack','heavy'].includes(battle.intent)?' · 目标：'+esc(battle.team.find(p=>p.id===battle.targetId)?.name):''} · 下次应对：${intentCopy[battle.intent]}${battle.intentSource==='offline'?' · AI 离线':battle.intentSource==='unavailable'?' · AI 暂未回应，仍可出招':' · AI 后台推演 · 无需等待'}` : battle.status === 'won' ? (battle.reward?'墨蛟已倒下。收取天灵果后，主药会进入任务药囊，随后可离开禁地交药。':`对手已败，收取${battle.rewardName||'储物袋'}后继续行程。`) : '当前伤势会保留。可先服用回春丹，或到听雨亭调息。';
    $('#combat-controls').hidden = !active;
    $('#combat-result').hidden = active;
    $('#combat-error').textContent = '';
    const latestRound = battle.log.at(-1)?.round;
    $('#battle-log').innerHTML = battle.log.filter(entry => entry.round === latestRound).map(entry => `<p class="log-${entry.side}">${esc(entry.text)}</p>`).join('');
    $('#battle-history').innerHTML = battle.log.map(entry => `<p><small>${entry.round ? `第 ${entry.round} 回合` : '交锋'}</small> ${esc(entry.text)}</p>`).join('');
    $('#combat-basics').innerHTML = control('attack', `普通攻击 · 威力 ${member.power}`, `${isPlayer?combatScalingText(view.combatStats.basicAttack):member.weaponName+'攻敌'}；回复 5 真气`) + control('guard', '凝气防御', '本回合自身减伤 65% · 回复 8 真气') + (isPlayer?control('escape', '尝试逃跑', `成功率 ${Math.round(battle.escapeChance * 100)}% · 失败消耗本次行动`):'');
    $('#combat-tabs').innerHTML = `<button type="button" data-combat-tab="skills" aria-pressed="${tab === 'skills'}">功法 · ${isPlayer?view.skills.length:member.skills.length}</button>${isPlayer?`<button type="button" data-combat-tab="items" aria-pressed="${tab === 'items'}">灵丹与阵法</button>`:''}`;
    if (tab === 'skills') {
      $('#combat-options').innerHTML = (isPlayer?view.skills:member.skills).map(skill => control('skill', `${skill.name} · ${skill.heal ? '治疗' : '威力'} ${isPlayer?skill.scaling.total:skill.heal||skill.power}`, `${skill.cost} 真气 · 冷却 ${skill.cooldown} 回合${skill.pierce ? ' · 无视防御' : ''}${isPlayer?'；'+combatScalingText(skill.scaling):''}${skill.heal ? '；恢复自身气血' : '；实际伤害受减伤与波动影响'}`, `data-skill-id="${skill.id}"`, skill.remaining ? `冷却中 · 还需 ${skill.remaining} 回合` : member.mana < skill.cost ? '真气不足' : skill.heal && member.hp >= member.maxHp ? '气血已满' : '')).join('');
    } else {
      $('#combat-options').innerHTML = view.inventory.filter(item => ['pill', 'array'].includes(item.kind)).map(item => control('item', `${item.name} ×${item.quantity}`, item.description, `data-item-id="${item.id}"`, item.heal && view.player.hp >= 100 ? '气血已满' : item.mana && battle.mana >= view.combatStats.maxMana ? '真气已满' : '')).join('') || '<p class="panel-tip">没有可用的灵丹或阵盘。击败散修后可从储物袋中获得。</p>';
    }
    if (!active) $('#combat-result').innerHTML = battle.status === 'won'
      ? `<h2>${battle.chapterFinale?'王蝉败退 · 第一章终战获胜':enemy.reward?'石殿主药 · 天灵果':(enemy.rewardName||`${enemy.name}的储物袋`)}</h2><div class="loot-grid">${lootMarkup(battle.loot)}</div><div class="result-actions"><button type="button" class="primary" data-battle-result="claim">${battle.chapterFinale?'完成第一章试炼':enemy.reward?'收取天灵果':`收取${enemy.rewardName||'储物袋'}`} →</button><button type="button" data-battle-result="leave">暂不拾取，回到地图</button></div>`
      : `<h2>${battle.status === 'escaped' ? '留得青山在' : '败退，也是一场历练'}</h2><p>${esc(battle.log.at(-1)?.text)}</p><p>敌人未被击败，没有战利品。再次挑战时对方气血恢复。</p><div class="result-actions"><button type="button" class="primary" data-battle-result="leave">回到地图 →</button></div>`;
    $('#combat-inputs').disabled = pending;
    const turnKey=`${battle.enemyId}:${battle.round}:${battle.actionNumber||0}:${battle.status}`;
    if(previousTurn!==turnKey)stage.querySelector('.battle-console').scrollTop=0;
    previousTurn=turnKey;
    autoCombat.sync();
  }
  async function submit(path, input) {
    if (pending) return;
    pending = true;slow=false;
    const slowTimer=setTimeout(()=>{slow=true;updateRoundLabel();},3000);
    equipmentUI.render(current, { pending });
    updateRoundLabel();
    $('#combat-inputs').disabled = true;
    try { return await request(path, input); }
    finally { clearTimeout(slowTimer);slow=false;pending = false; equipmentUI.render(current, { pending }); $('#combat-inputs').disabled = false; updateRoundLabel(); autoCombat.sync(); }
  }
  stage.addEventListener('click', async event => {
    const member=event.target.closest('[data-combat-actor]');
    if(member&&!pending&&!member.disabled){selectedActor=member.dataset.combatActor;tab='skills';render(current);return;}
    const change = event.target.closest('[data-combat-tab]');
    if (change && !pending) { tab = change.dataset.combatTab; render(current); return; }
    const button = event.target.closest('[data-combat-move]');
    if (button&&!button.disabled&&!autoCombat.isRunning()) { await submit('/api/combat', { type: 'turn',actorId:selectedActor, move: button.dataset.combatMove, skillId: button.dataset.skillId, itemId: button.dataset.itemId }); return; }
    const result = event.target.closest('[data-battle-result]');
    if (result) {
      const type = result.dataset.battleResult;
      const questReward=Boolean(current.battle.reward||current.battle.chapterFinale);
      const data = await submit('/api/combat', { type, enemyId: current.battle.enemyId });
      if (data && type === 'claim'&&!questReward) openInventory();
    }
  });
  $('#roamers').addEventListener('click', event => {
    const button = event.target.closest('[data-roamer]');
    if (button) navigate(button.dataset.roamer);
  });
  return { render, showError(text) { $('#combat-error').textContent = text; } };
}

export function roamerActions(enemy, hp) {
  const ready = !enemy.looted && (enemy.defeated || hp >= 20);
  const type = enemy.defeated ? 'claim' : 'start';
  return `<div class="roamer-drops"><small>${enemy.reward?'守护主药':enemy.defeated ? '袋中物品' : enemy.campaign?'交锋线索':'身携宝物'}</small>${enemy.campaign&&!enemy.defeated?'<p>战利品尚未发现，获胜后亲自查看。</p>':''}<div class="loot-grid">${lootMarkup(enemy.loot)}</div></div><button type="button" class="challenge-button" data-encounter="${type}" data-enemy-id="${enemy.id}" ${ready ? '' : 'disabled'}>${enemy.looted ? (enemy.reward?'主药已收取':'储物袋已取空') : enemy.defeated ? (enemy.reward?'收取天灵果 →':'拾取储物袋 →') : hp < 20 ? '气血不足 20 · 先行疗伤' : '发起斗法 ⚔'}</button>${enemy.defeated ? '' : `<p class="combat-warning">逃跑成功率 ${Math.round(enemy.escape * 100)}%。败退损失当前灵石的 10%，以 25 气血脱身；物品与功法保留。</p>`}`;
}

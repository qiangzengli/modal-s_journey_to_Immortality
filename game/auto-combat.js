export const AUTO_POLICIES = { economy: '节省优先', victory: '胜利优先', no_items: '不使用物品' };
export const DEFAULT_AUTO_PLAN = { healBelow: .4, reserveMana: 8, preferredSkills: [], heavyResponse: 'guard' };

export function autoTeam(view) {
  return view.battle?.team || [{id:'player',name:'韩立',hp:view.player.hp,maxHp:100,mana:view.battle?.mana,maxMana:view.combatStats.maxMana,power:view.combatStats.basicAttack.total,defense:0,canAct:true,skills:view.skills}];
}

// The model ranks tactics; current inventory, cooldowns and safety remain rule-owned.
export function chooseAutoMove(view, policy = 'economy', plan = DEFAULT_AUTO_PLAN) {
  const battle=view.battle;
  if (!battle || battle.status!=='active') return null;
  const enemy=view.roamers.find(person=>person.id===battle.enemyId);
  if (!enemy || !Object.hasOwn(AUTO_POLICIES,policy)) return null;
  const options=[], effectiveHp=battle.enemyHp+(battle.ward||0),team=autoTeam(view);
  const available=team.filter(member=>member.hp>0&&member.canAct);
  const defender=team.find(member=>member.id===(battle.targetId||'player'));
  for (const member of available) {
    const player=member.id==='player',skills=player?view.skills:member.skills;
    const threatened=!battle.targetId||battle.targetId===member.id;
    const incoming=threatened&&['attack','heavy'].includes(battle.intent)?Math.max(1,Math.round((enemy.attack*(battle.intent==='heavy'?1.8:1)-(member.defense||0))*1.1)):0;
    const damage=(power,pierce)=>Math.max(1,Math.round((power-(pierce?0:enemy.defense))*.9*(battle.intent==='guard'?.45:1)));
    const candidates=[{move:'attack',name:'普通攻击',damage:damage(member.power),cost:0},
      {move:'guard',name:'凝气防御',damage:0,cost:0,guard:true}];
    for (const skill of skills||[]) {
      if (skill.remaining>0||skill.cost>member.mana) continue;
      const healing=skill.effect==='heal'||Boolean(skill.heal);
      if (healing&&member.hp>=member.maxHp) continue;
      const power=skill.scaling?.total||(healing?skill.heal:skill.power);
      candidates.push({move:'skill',skillId:skill.id,name:skill.name,cost:skill.cost,damage:healing?0:damage(power,skill.pierce),heal:healing?Math.min(power,member.maxHp-member.hp):0});
    }
    if (player&&policy!=='no_items') for (const item of view.inventory) {
      if (!item.quantity||!['pill','array'].includes(item.kind)) continue;
      if (policy==='economy'&&!['healing_pill','spirit_pill'].includes(item.id)) continue;
      if (item.heal&&member.hp>=member.maxHp||item.mana&&member.mana>=member.maxMana) continue;
      // Ordinary medicine is a last resort in economy mode, never routine top-ups.
      if (policy==='economy'&&member.hp>Math.max(incoming*2,member.maxHp*.3)) continue;
      candidates.push({move:'item',itemId:item.id,name:item.name,cost:0,item:true,damage:item.power?damage(item.power,true):0,
        heal:Math.min(item.heal||0,member.maxHp-member.hp),mana:Math.min(item.mana||0,member.maxMana-member.mana),interrupt:item.id==='binding_array'});
    }
    for (const candidate of candidates) {
      const lethal=candidate.damage>=effectiveHp;
      const interrupted=candidate.interrupt||battle.roundEffects?.interrupted;
      const hit=lethal||interrupted?0:Math.ceil(incoming*(candidate.guard?.35:1));
      const remaining=member.hp+(candidate.heal||0)-hit;
      if (remaining<=0) continue;
      if(available.length===1&&defender&&defender.id!==member.id&&!lethal&&!interrupted&&['attack','heavy'].includes(battle.intent)){
        const guard=battle.roundEffects?.guardedIds?.includes(defender.id);
        const counter=Math.max(1,Math.round((enemy.attack*(battle.intent==='heavy'?1.8:1)-(defender.defense||0))*1.1*(guard?.35:1)));
        if(defender.hp<=counter)continue;
      }
      const urgent=member.hp<=Math.max(member.maxHp*plan.healBelow,incoming*2);
      let score=lethal?10000:candidate.damage*2;
      score-=candidate.cost*.5+(candidate.item?(policy==='economy'?90:35):0);
      score-=hit*(urgent?3:1.3);
      score+=(candidate.heal||0)*(urgent?3:.25);
      if(candidate.guard)score+=Math.min(8,member.maxMana-member.mana)*1.5;
      if(candidate.guard&&battle.intent!=='heavy')score-=30; // Do not stall through ordinary attacks.
      if(candidate.mana)score+=candidate.mana*(member.mana<8?2:.2);
      if(candidate.guard&&battle.intent==='heavy'&&plan.heavyResponse==='guard')score+=25;
      if(candidate.interrupt&&battle.intent==='heavy'&&plan.heavyResponse==='interrupt')score+=20;
      if(candidate.skillId&&plan.preferredSkills.includes(candidate.skillId))score+=4;
      if(candidate.cost&&member.mana-candidate.cost<plan.reserveMana&&!urgent&&!lethal)score-=8;
      // If basic attack finishes in the same conservative number of hits, save the mana.
      if(candidate.move==='skill'&&candidate.damage>0&&Math.ceil(effectiveHp/candidate.damage)===Math.ceil(effectiveHp/candidates[0].damage))score-=candidate.damage*2-candidates[0].damage*2+2;
      options.push({input:{type:'turn',actorId:member.id,move:candidate.move,...(candidate.skillId?{skillId:candidate.skillId}:{}),...(candidate.itemId?{itemId:candidate.itemId}:{})},score,
        reason:`${member.name} · ${candidate.name}${candidate.heal?'，先稳住气血':lethal?'，尝试收尾':candidate.item?'，应急使用':candidate.guard?'，减伤并回气':'，节省消耗攻敌'}`});
    }
  }
  return options.sort((a,b)=>b.score-a.score)[0]||null;
}

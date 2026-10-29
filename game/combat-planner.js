import {requestCombatPlan,selectCombatTactic} from './npc-combat-agent.js';

// Runtime cache only. Model completions never mutate the game or acquire its save lock.
export function createCombatPlanner({complete,now=Date.now,timeoutMs=8000,retryMs=10000}) {
  let session=null;
  function stop(){session?.controller?.abort();session=null;}
  function prepare(next,previous) {
    const battle=next.exploration?.battle;
    if(battle?.status!=='active')return;
    const sameBattle=previous?.exploration?.battle?.status==='active'&&previous.exploration.battle.enemyId===battle.enemyId;
    if(sameBattle&&previous.exploration.battle.round===battle.round)return;
    const ready=sameBattle&&session?.enemyId===battle.enemyId&&session.ready;
    const fresh=ready&&battle.round-ready.receivedRound<=6;
    const tactic=fresh?selectCombatTactic(next,ready.plan):null;
    battle.agentIntent=tactic?.intent||'attack';
    battle.intentSpeech=tactic?.speech||'对方保持试探攻势。';
    battle.intentSource=tactic?'model':!complete?'offline':sameBattle&&session?.failed?'unavailable':'preparing';
    battle.tacticRound=battle.round;
    battle.tacticPlanRound=tactic?ready.round:null;
  }
  function sync(game,{newBattle=false}={}) {
    const battle=game.exploration?.battle;
    if(battle?.status!=='active'){stop();return;}
    if(newBattle||!session||session.enemyId!==battle.enemyId){stop();session={enemyId:battle.enemyId,ready:null,pending:null,retryAt:0,failed:false,latestRound:battle.round};}
    session.latestRound=battle.round;
    if(!complete||session.pending||now()<session.retryAt||session.ready&&battle.round-session.ready.receivedRound<2)return;
    const current=session,snapshot=structuredClone(game),controller=new AbortController();
    current.controller=controller;
    let timer;
    const aborted=new Promise((_,reject)=>{
      controller.signal.addEventListener('abort',()=>reject(controller.signal.reason),{once:true});
      timer=setTimeout(()=>controller.abort(new DOMException('Tactic planning timed out','TimeoutError')),timeoutMs);timer.unref?.();
    });
    current.pending=Promise.race([requestCombatPlan(snapshot,complete,{signal:controller.signal}),aborted])
      .then(plan=>{if(session===current){current.ready={plan,round:battle.round,receivedRound:current.latestRound};current.failed=false;}})
      .catch(()=>{if(session===current){current.failed=true;current.retryAt=now()+retryMs;}})
      .finally(()=>{clearTimeout(timer);if(session===current){current.pending=null;current.controller=null;}});
  }
  return {prepare,sync,stop};
}

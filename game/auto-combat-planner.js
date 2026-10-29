import {requestAutoCombatPlan} from './auto-combat-agent.js';
import {DEFAULT_AUTO_PLAN} from './auto-combat.js';

// One read-only model request at a time. A completed plan cannot execute an action or save a game.
export function createAutoCombatPlanner(complete) {
  let session=null;
  function clear(){session?.controller.abort();session=null;}
  function sync(view,{newBattle=false}={}) {
    if(newBattle||view.battle?.status!=='active'||session&&view.battle.enemyId!==session.enemyId)clear();
  }
  async function request(view,policy) {
    if(session&&session.enemyId===view.battle.enemyId&&session.policy===policy&&(session.pending||view.battle.round-session.round<3))return session.promise;
    clear();
    const active={enemyId:view.battle.enemyId,policy,round:view.battle.round,controller:new AbortController(),pending:true};session=active;
    const timer=setTimeout(()=>active.controller.abort(),8000);timer.unref?.();
    active.promise=requestAutoCombatPlan(view,policy,complete,{signal:active.controller.signal})
      .catch(()=>({source:'unavailable',plan:structuredClone(DEFAULT_AUTO_PLAN)}))
      .finally(()=>{clearTimeout(timer);active.pending=false;});
    return active.promise;
  }
  return {request,sync,clear};
}

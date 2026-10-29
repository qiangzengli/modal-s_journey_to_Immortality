import {gameRequest} from './api-client.js';
import {AUTO_POLICIES,DEFAULT_AUTO_PLAN,chooseAutoMove} from './auto-combat.js';

export function createAutoCombatUI({stage,getState,isPending,perform,requestPlan=gameRequest}) {
  const document=stage.ownerDocument;
  const bar=document.createElement('div');bar.className='auto-combat-controls';
  bar.innerHTML=`<div><button type="button" id="auto-combat-toggle" aria-pressed="false">自动战斗</button><select id="auto-combat-policy" aria-label="自动战斗消耗策略">${Object.entries(AUTO_POLICIES).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></div><small id="auto-combat-status" role="status">优先普攻与功法，危险时才用普通回复药。</small>`;
  stage.querySelector('.battle-console').prepend(bar);
  const toggle=bar.querySelector('button'),select=bar.querySelector('select'),status=bar.querySelector('small');
  const collapse=document.createElement('button');collapse.type='button';collapse.textContent='收起战报';collapse.setAttribute('aria-expanded','true');collapse.setAttribute('aria-label','收起或展开战斗面板');
  bar.querySelector('div').append(collapse);
  collapse.addEventListener('click',()=>{const hidden=stage.querySelector('.battle-console').classList.toggle('is-collapsed');collapse.textContent=hidden?'展开战报':'收起战报';collapse.setAttribute('aria-expanded',String(!hidden));});
  let running=false,timer=null,generation=0,controller=null,plan=null,source='local',enemyId=null,steps=0,lastRound=-1,readyRound=-1,stalls=0,previousHp=null;
  function describe(text) { status.textContent=text; }
  function stop(text='自动战斗已停止，可以手动出招。') {
    running=false;generation++;clearTimeout(timer);timer=null;controller?.abort();controller=null;plan=null;
    toggle.textContent='自动战斗';toggle.setAttribute('aria-pressed','false');select.disabled=false;
    stage.querySelector('#combat-inputs').disabled=isPending();describe(text);
  }
  function advise() {
    const view=getState();if(controller||!running||view.battle.round-lastRound<3)return;
    const ticket=generation;lastRound=view.battle.round;
    const active=new AbortController();controller=active;
    const deadline=setTimeout(()=>active.abort(),8500);
    source=plan?'model':'preparing';
    requestPlan('/api/combat/auto-plan',{method:'POST',headers:{'content-type':'application/json'},signal:active.signal,body:JSON.stringify({expectedRevision:view.revision,enemyId,policy:select.value})})
      .then(async response=>{const reply=await response.json();if(ticket!==generation||!running)return;if(!response.ok)throw new Error();
        plan=reply.source==='model'?reply.plan:null;source=reply.source;readyRound=getState().battle?.round??-1;})
      .catch(()=>{if(ticket===generation){plan=null;source='unavailable';}})
      .finally(()=>{clearTimeout(deadline);if(controller===active)controller=null;});
  }
  function schedule() {
    if(!running||timer||isPending()||document.hidden)return;
    timer=setTimeout(step,800);
  }
  async function step() {
    timer=null;const view=getState();
    if(!running||document.hidden||isPending())return;
    if(!view.battle||view.battle.enemyId!==enemyId||view.battle.status!=='active'){sync();return;}
    if(++steps>100||stalls>=8){stop('自动战斗已暂停：连续交锋未取得进展，请手动调整。');return;}
    advise();
    const ready=plan&&view.battle.round-readyRound<=6;
    const choice=chooseAutoMove(view,select.value,ready?plan:DEFAULT_AUTO_PLAN);
    if(!choice){stop('自动战斗已暂停：当前没有安全的可用招式，请手动接管。');return;}
    describe(`${ready?'AI 策略':source==='preparing'?'本地应对 · AI 后台规划':'本地应对 · AI 暂不可用'}｜${choice.reason}`);
    const ticket=generation;
    try {
      const data=await perform(choice.input);
      if(ticket!==generation||!running)return;
      if(!data){stop('自动战斗已暂停：行动未完成，请确认最新战况。');return;}
      const hp=data.view?.battle?.enemyHp;
      stalls=hp===previousHp?stalls+1:0;previousHp=hp;
      sync();schedule();
    }catch{if(ticket===generation)stop('自动战斗已暂停：连接异常，请手动重试。');}
  }
  function sync() {
    const battle=getState()?.battle;
    bar.hidden=!battle||battle.status!=='active';
    if(running&&(!battle||battle.status!=='active'||battle.enemyId!==enemyId))stop(battle?.status==='won'?'自动战斗已获胜，请亲自确认战利品。':'本场自动战斗已结束。');
    toggle.disabled=isPending()&&!running;
    if(running)stage.querySelector('#combat-inputs').disabled=true;
    schedule();
  }
  function start() {
    const view=getState();if(isPending()||view?.battle?.status!=='active')return;
    running=true;generation++;enemyId=view.battle.enemyId;steps=0;stalls=0;previousHp=view.battle.enemyHp;lastRound=-10;readyRound=-1;source='preparing';
    toggle.textContent='停止自动';toggle.setAttribute('aria-pressed','true');select.disabled=true;
    describe('本地应对 · AI 正在后台规划，不影响出招。');advise();sync();
  }
  toggle.addEventListener('click',()=>running?stop():start());
  select.addEventListener('change',()=>describe(select.value==='economy'?'优先普攻与功法，危险时才用普通回复药。':select.value==='no_items'?'不消耗物品；无法安全出招时暂停。':'必要时允许使用战斗丹药与阵法。'));
  const visibility=()=>{if(document.hidden&&running)stop('页面已隐藏，自动战斗已暂停。');};
  document.addEventListener('visibilitychange',visibility);
  return {sync,stop,isRunning:()=>running,dispose(){stop();document.removeEventListener('visibilitychange',visibility);bar.remove();}};
}

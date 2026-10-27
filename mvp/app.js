import { createWorld } from './world.js';
import { ACTION_DEFS, PERSON_ACTIONS, PERSON_DETAILS, SITES, questSteps } from './content.js';
import { createCombatUI, roamerActions } from './combat-ui.js';
import { createAgentUI } from './agent-ui.js';
import { createCommandUI } from './command-ui.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const names = Object.fromEntries(ACTION_DEFS.map(action => [action.type, action.title]));
names.ask = '探问近况';
const defs = Object.fromEntries(ACTION_DEFS.map(action => [action.type, action]));
const titles = { opportunity: '筑基丹去向', self: '行囊与处境', people: '修真界众生', actions: '行事之前', events: '修真邸报' };
let current;
let busy = false;
let selectedPerson = null;
let selectedSite = null;
let activePanel = null;
let chosenRoute = 'trade';
try { const route=localStorage.getItem('niminglu-route'); if(['trade','report','ambush'].includes(route)) chosenRoute=route; } catch {}
let currentSteps = [];
let newsCount = 0;
let summaryTimer;
let nearbyTarget = null;
let lastInteraction = null;
let commandGeneration = 0;
let commandPending = false;
let commandController = null;
let agentUI;
let commandUI;
let currentModelName = null;
function chooseRoute(route) {
  if(route!==chosenRoute)cancelPendingCommand();
  chosenRoute=route;
  try { localStorage.setItem('niminglu-route',route); } catch {}
  if(current)updateQuest();
  commandUI?.refresh();
}
function actionTarget(action, view=current) {
  if(action.type==='ask')return action.target;
  if(action.type==='negotiate')return 'shen';
  if(action.type==='buy_pill')return view.pill.ownerId==='lu'?'lu':'shen';
  const def=defs[action.type];
  return def?.person || def?.site;
}
function updateNearbyPrompt() {
  $('#nearby-interact').hidden=!nearbyTarget||busy||Boolean(selectedPerson||selectedSite);
  $('#nearby-name').textContent=nearbyTarget ? `${nearbyTarget.kind==='gate'?'':'交互 · '}${nearbyTarget.name}` : '';
}
function updateInteractionResult() {
  const id=selectedPerson||selectedSite;
  $('#interaction-result').hidden=!lastInteraction||lastInteraction.target!==id;
  $('#world-goal').hidden=!$('#interaction-result').hidden;
  $('#person-dialogue').hidden=Boolean(selectedSite)||!$('#interaction-result').hidden;
  if(!$('#interaction-result').hidden)$('#interaction-result-copy').textContent=lastInteraction.text;
  const next=currentSteps.find(step=>!step.done&&!step.skipped);
  $('#interaction-next').hidden=!next||!lastInteraction||lastInteraction.target!==id;
  $('#interaction-next').textContent=next?.target==='advance'?'等候下一旬 →':`接下来 · ${next?.title || ''} →`;
}


function notice(text, bad = false) {
  $('#message').textContent = text;
  $('#message').classList.toggle('bad', bad);
}
function closePanel() {
  activePanel = null;
  $('#map-panel').hidden = true;
  document.querySelectorAll('[data-open-panel]').forEach(button => button.setAttribute('aria-pressed', 'false'));
}
function openPanel(name) {
  if(current?.battle)return;
  cancelPendingCommand();
  commandGeneration++;
  if (activePanel === name) { closePanel(); return; }
  world.clearSelection();
  activePanel = name;
  $('#map-panel').hidden = false;
  $('#panel-title').textContent = titles[name];
  document.querySelectorAll('[data-panel-content]').forEach(section => { section.hidden = section.dataset.panelContent !== name; });
  document.querySelectorAll('[data-open-panel]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.openPanel === name)));
  if (name === 'events') { newsCount=0; $('#news-count').hidden=true; }
}
function closePerson() {
  lastInteraction = null;
  selectedPerson = null;
  selectedSite = null;
  $('#world-person').hidden = true;
  document.body.classList.remove('interacting');
  updateNearbyPrompt();
  agentUI?.personChanged();
}
function actionMarkup(type) {
  const state = type === 'ask' ? { available: true, reason: '' } : current.actionOptions[type];
  const def = defs[type] || { title: '探问近况 · 人物交谈', cost: '无资源消耗', detail: '询问当前关切，可接着追问缘由或商量打算。' };
  return `<button type="button" class="context-action" data-world-action="${type}" ${state.available ? '' : 'disabled'}><span><b>${esc(def.title)}</b><small>${esc(def.cost)}</small></span><i>${state.available ? '↗' : '·'}</i><em>${esc(state.available ? def.detail : state.reason)}</em></button>`;
}
function relationship(trust) { return trust >= 20 ? '信任' : trust <= -30 ? '敌视' : trust < 0 ? '戒备' : '初识'; }
function showPerson(id, focusUI = true) {
  const roamer = current?.roamers.find(p => p.id === id);
  if(roamer) { showRoamer(roamer,focusUI); return; }
  const person = current?.people.find(p => p.id === id);
  if (!person) return;
  selectedPerson=id; selectedSite=null;
  if (focusUI) closePanel();
  const detail=PERSON_DETAILS[id];
  $('#world-person').hidden=false;
  document.body.classList.add('interacting');
  $('#world-person').style.setProperty('--person-color', detail.color);
  $('#person-seal').textContent=person.name[0];
  $('#world-role').textContent=person.role;
  $('#world-name').textContent=person.name;
  $('#person-meta').innerHTML=`<span>${esc(person.condition === '筑基初期' ? person.condition : detail.realm)}</span><span>${esc(relationship(person.trust))} ${person.trust > 0 ? '+' : ''}${person.trust}</span><span>${esc(person.condition)}</span>`;
  $('#world-goal').textContent=detail.bio;
  $('#person-dialogue').hidden=false;
  $('#person-dialogue').textContent=person.greeting || person.dialogue?.text || '';
  const options = PERSON_ACTIONS[id].filter(type => type !== 'buy_pill' || (id === 'lu' ? current.pill.ownerId === 'lu' : current.pill.ownerId !== 'lu'));
  $('#world-actions').innerHTML=options.map(actionMarkup).join('');
  $('#trade-form').hidden=!(id === 'shen' && current.pill.ownerId === 'shen' && current.player.place === 'market');
  const previousLeverage=$('#trade-leverage').value;
  $('#trade-leverage').innerHTML='<option value="none">仅凭报价</option>'+current.player.clues.map(clue => `<option value="${clue}">${clue === 'smuggling' ? '亮出货道证词' : '持真丹鉴定'}</option>`).join('');
  if([...$('#trade-leverage').options].some(option=>option.value===previousLeverage))$('#trade-leverage').value=previousLeverage;
  $('#person-memory').hidden=false;
  $('#memory-list').innerHTML=person.memories.map(event=>`<p><small>第 ${event.turn} 旬</small>${esc(event.text)}</p>`).join('') || '<p>尚无与你有关的往事。</p>';
  updateNearbyPrompt(); updateInteractionResult();
  if (focusUI) $('#world-person').scrollTop=0;
  $('#world-hint').textContent=`正在与${person.name}交谈。`;
  agentUI?.personChanged();
}
function showRoamer(enemy, focusUI = true) {
  selectedPerson=enemy.id;selectedSite=null;
  if(focusUI)closePanel();
  $('#world-person').hidden=false;
  document.body.classList.add('interacting');
  $('#world-person').style.setProperty('--person-color',enemy.color);
  $('#person-seal').textContent=enemy.defeated?'袋':enemy.name[0];
  $('#world-role').textContent=enemy.defeated?'林道遗落 · 储物袋':enemy.role;
  $('#world-name').textContent=enemy.defeated?`${enemy.name}的储物袋`:enemy.name;
  $('#person-meta').innerHTML=`<span>${enemy.realm}</span><span>${enemy.defeated?'已败退':`气血 ${enemy.hp} · 攻势 ${enemy.attack}`}</span>`;
  $('#world-goal').hidden=false;$('#world-goal').textContent=enemy.defeated?'散修已经负伤离去，只剩系着禁制绳结的储物袋。里面的物品尚未取出。':enemy.bio;
  $('#person-dialogue').hidden=Boolean(enemy.defeated);$('#person-dialogue').textContent=`「${enemy.quote}」`;
  $('#person-memory').hidden=true;$('#trade-form').hidden=true;$('#interaction-result').hidden=true;
  $('#world-actions').innerHTML=roamerActions(enemy,current.player.hp);
  if(focusUI)$('#world-person').scrollTop=0;
  $('#world-hint').textContent=enemy.defeated?'储物袋就在脚边。':`已靠近${enemy.name}。可观察后再决定是否斗法。`;
  updateNearbyPrompt();
  agentUI?.personChanged();
}
function showSite(id, focusUI = true) {
  const site=SITES[id];
  if (!site) return;
  selectedPerson=null;selectedSite=id;
  if (focusUI) closePanel();
  $('#world-person').hidden=false;
  document.body.classList.add('interacting');
  $('#world-person').style.setProperty('--person-color', '#c9bb82');
  $('#person-seal').textContent=id==='herbs'?'草':id==='camp'?'静':'阵';
  $('#world-role').textContent=site.role;
  $('#world-name').textContent=site.name;
  $('#world-goal').textContent=site.detail;
  const state=id==='herbs'?`可采 ${current.world.herbsRemaining} 株`:id==='formation'?(current.world.trapReady?'天雷符已布下':'阵位尚未布置'):`气血 ${current.player.hp} / 100`;
  $('#person-meta').innerHTML=`<span>${esc(state)}</span>`;
  $('#person-dialogue').hidden=true;$('#person-memory').hidden=true;$('#trade-form').hidden=true;
  $('#world-actions').innerHTML=site.actions.map(actionMarkup).join('');
  updateNearbyPrompt(); updateInteractionResult();
  if (focusUI) $('#world-person').scrollTop=0;
  $('#world-hint').textContent=`已到达${site.name}。${state}。`;
  agentUI?.personChanged();
}

const world=createWorld($('#world-canvas'), {
  onSelectPerson: showPerson, onSelectSite: showSite, onClearPerson: closePerson,
  miniMap: $('#mini-map'),
  onNavigation: state => {
    $('#navigation-status').hidden=!state;
    if(state){ $('#navigation-copy').textContent=`${state.stage} · ${state.name}`; $('#world-hint').textContent=`${state.stage} · ${state.name}`; $('#turn-summary').hidden=true; }
    else if (/^(正在前往|经过界门) · /.test($('#world-hint').textContent)) $('#world-hint').textContent='点击人物交谈，或继续探索这片天地。';
  },
  onNearby: target => { nearbyTarget=target; updateNearbyPrompt(); },
  onTravel: async place => {
    const arrived=await call('/api/action', { type:place==='woods'?'travel_woods':'travel_market' });
    if(arrived) $('#world-hint').textContent=place==='woods'?'散修出没于林道。点击人物观察，可斗法夺宝或去听雨亭调息。':'已回到地下坊市。交易与消息仍在继续。';
    return arrived;
  },
  onHint: text=>{ $('#world-hint').textContent=text; notice(text); }
});
const combatUI=createCombatUI({request:call,navigate,openInventory:()=>openPanel('self')});
agentUI=createAgentUI({
  getState:()=>({view:current,route:chosenRoute,personId:selectedPerson,busy}),
  navigate:target=>target==='events'?openPanel('events'):navigate(target),
  executeAction, notice,
  onStale:data=>{if(!busy&&data.view.revision!==current?.revision)render(data.view,data.modelName);}
});
commandUI=createCommandUI({
  getState:()=>({view:current,route:chosenRoute,busy:busy||commandPending}),
  submit:submitCommand,
  navigate:target=>target==='events'?openPanel('events'):navigate(target),
  notice
});

function updateQuest() {
  currentSteps=questSteps(current,chosenRoute);
  const done=currentSteps.filter(step=>step.done||step.skipped).length;
  const next=currentSteps.find(step=>!step.done&&!step.skipped);
  $('#quest-progress').textContent=`${done} / ${currentSteps.length}`;
  $('#quest-objective').textContent=`既定目标 · ${current.pill.ownerId==='xu'?'机缘已有归属':next?.title || '筑基已成'}`;
  $('#quest-facts').textContent=current.pill.price!==null?`现有 ${current.player.stones} 灵石 · 丹价 ${current.pill.price}${current.player.stones<current.pill.price?` · 尚差 ${current.pill.price-current.player.stones}`:''}`:current.pill.partnerDebt?`合资未偿 · ${current.pill.partnerDebt} 灵石`:current.outcome;
  $('#quest-title').textContent=next?.title || '筑基已成';
  $('#quest-detail').textContent=current.pill.ownerId==='xu'?'徐宁已经取得这枚丹。可在邸报复盘因果，重开尝试另一条路。':next?.detail || '道途继续，兑现承诺，或看看世界如何回应你。';
  $('#quest-track').textContent=current.pill.ownerId==='xu'?'查看因果账本':next?`追踪目标 ◇`:'查看未了因果';
  document.querySelectorAll('[data-route]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.route===chosenRoute)));
  $('#quest-steps').innerHTML=currentSteps.map((step,index)=>`<button type="button" data-quest-step="${index}" class="quest-step ${step.done||step.skipped?'done':''}"><b>${step.skipped?'—':step.done?'✓':index+1}</b><span><strong>${esc(step.title)}</strong><small>${step.skipped?'已取得机缘，此前置不再需要。':esc(step.detail)}</small></span></button>`).join('');
  agentUI?.guideChanged();
}
async function navigate(target) {
  if(busy||current?.battle)return false;
  closePanel();
  $('#turn-summary').hidden=true;
  if(target==='advance')return call('/api/advance');
  return world.goTo(target);
}
async function executeAction(action) {
  if(busy||!current||current.battle)return false;
  cancelPendingCommand();
  const routes={inspect_pill:'trade',partner:'trade',investigate_route:'report',report:'report',lure:'ambush',prepare_trap:'ambush',ambush:'ambush'};
  if(routes[action.type]&&!current.world.breakthrough)chooseRoute(routes[action.type]);
  closePanel();
  if(action.type==='travel_woods'||action.type==='travel_market') {
    const place=action.type==='travel_woods'?'woods':'market';
    if(current.player.place===place){notice('你已经在这里。');return false;}
    return world.goTo({kind:'gate',place,name:place==='woods'?'黑风林':'地下坊市'});
  }
  const target=actionTarget(action);
  if(!target){notice('这项行动暂时没有对应的地图目标。',true);return false;}
  if(!await world.goTo(target))return false;
  return call('/api/action',action);
}
async function submitCommand(text) {
  if(busy||commandPending||!current||current.battle)return;
  const ticket=++commandGeneration;
  const revision=current.revision,route=chosenRoute;
  const controller=new AbortController();commandController=controller;commandPending=true;
  commandUI.refresh();updateCommandStatus();
  try {
    const response=await fetch('/api/intent',{method:'POST',signal:controller.signal,headers:{'content-type':'application/json'},body:JSON.stringify({text,route,history:commandUI.history(),expectedRevision:revision})});
    const planned=await response.json();
    if(ticket!==commandGeneration)return;
    if(!response.ok){if(planned.view&&!busy)render(planned.view,planned.modelName);throw new Error(planned.error||'问计暂未完成。');}
    if(current.revision!==revision||chosenRoute!==route||busy)return;
    commandPending=false;commandController=null;
    currentModelName=planned.modelName;
    if(planned.reply){
      commandUI.show(text,planned.reply);
      notice(planned.reply.source==='model'?'可继续追问，或点击建议追踪目标。':'本次显示已知线索，可稍后重试。');
      if($('#command').value.trim()===text)$('#command').value='';
      return;
    }
    $('#command').blur();
    if(planned.action&&await executeAction(planned.action)&&$('#command').value.trim()===text)$('#command').value='';
  } catch(error) {
    if(ticket===commandGeneration&&error.name!=='AbortError')notice(error.message,true);
  } finally {
    if(commandController===controller){commandController=null;commandPending=false;}
    commandUI.refresh();updateCommandStatus();
  }
}
function render(view, modelName) {
  current=view;
  currentModelName=modelName;
  commandUI?.refresh();
  if(!busy)updateCommandStatus();
  world.sync(view);
  $('#world-location').textContent=view.player.place==='market'?'地下坊市':'黑风林';
  if(view.battle) { closePanel(); closePerson(); }
  if((selectedPerson&&[...view.people,...view.roamers].find(p=>p.id===selectedPerson)?.place!==view.player.place)||(selectedSite&&view.player.place!=='woods'))closePerson();
  else if(selectedPerson)showPerson(selectedPerson,false);
  else if(selectedSite)showSite(selectedSite,false);
  $('#turn').textContent=`第 ${view.turn} 旬`;
  $('#advance').title='推进时间，结算人物行动和世界事件';
  $('#realm').textContent=view.world.realm;
  $('#hud-stones').textContent=view.player.stones;$('#hud-hp').textContent=view.player.hp;$('#hud-reputation').textContent=view.player.reputation;
  $('#hp-fill').style.width=`${view.player.hp}%`;$('#hp-fill').classList.toggle('low',view.player.hp<60);
  $('#owner').textContent=view.pill.owner;$('#price').textContent=view.pill.price===null?'不在售':`${view.pill.price} 灵石`;
  $('#owner-detail').textContent=view.pill.owner;$('#price-detail').textContent=$('#price').textContent;
  $('#dispute').textContent=view.pill.disputed?'真伪争议中':'无公开争议';
  $('#outcome').textContent=view.outcome||'机缘仍在流转。人物的需求、钱财与消息会改变丹药的去向。';
  $('#outcome').classList.toggle('won',view.pill.ownerId==='player'||view.world.breakthrough);
  $('#opportunity-hint').textContent=view.world.breakthrough?'此丹已化为你的修为':view.pill.ownerId==='player'?'已入行囊 · 可前往听雨亭':'金色光环标记持丹者 ↗';
  $('#mode').textContent=modelName?`自然语言模型：${modelName}。可在心念传音中问计、追问或下达行动。`:'离线规则模式：可使用按钮或常见中文行动；问计显示已知线索。';
  const entries=[['境界',view.world.realm],['所在',view.player.place==='market'?'地下坊市':'黑风林'],['灵石',`${view.player.stones} 枚`],['气血',`${view.player.hp} / 100`],['声望',`${view.player.reputation} / 100`],['灵草',`${view.player.herbs} 株`],['天雷符',`${view.player.talismans} 张`],['空白印',`${view.player.seal} 枚`]];
  $('#stats').innerHTML=entries.map(([key,value])=>`<div><span>${key}</span><strong>${esc(value)}</strong></div>`).join('');
  $('#clues').innerHTML=`<h3>已知线索</h3>${view.player.clues.map(c=>`<span class="clue">${c==='authentic'?'真丹鉴定':'禁运货道证词'}</span>`).join('')||'<p>尚无证据。可从药师或传音客入手。</p>'}${view.pill.partnerDebt?`<p class="debt">与徐宁的承诺：尚欠 ${view.pill.partnerDebt} 灵石</p>`:''}`;
  $('#people').innerHTML=view.people.map(p=>`<button class="person" type="button" data-person="${p.id}"><span class="avatar" style="border-color:${PERSON_DETAILS[p.id].color}">${p.name[0]}</span><span class="person-main"><strong>${p.name}<small>${p.role}</small></strong><span>${esc(p.goal)} · ${esc(relationship(p.trust))}</span></span><span class="person-place">${p.place==='market'?'坊市':'林中'} ↗</span></button>`).join('');
  $('#events').innerHTML=view.events.map(event=>`<article class="event" id="event-${event.id}"><div class="event-meta"><span>第 ${event.turn} 旬 · ${esc(event.actor)}</span><b>#${event.id}</b></div><p>${esc(event.text)}</p>${event.causes.length?`<small>缘起：${event.causes.map(id=>`<a href="#event-${id}">事件 #${id}</a>`).join(' · ')}</small>`:''}</article>`).join('');
  $('#actions').innerHTML=ACTION_DEFS.filter(def=>def.place===view.player.place).map(def=>{
    const state=view.actionOptions[def.type];
    return `<button class="action ${state.available?'':'locked'}" data-locate-action="${def.type}" type="button" ${state.available?'':'disabled'}><strong>${esc(def.title)} <i>↗</i></strong><span>${esc(def.cost)}</span><small>${esc(state.available?def.detail:state.reason)}</small></button>`;
  }).join('');
  updateQuest();
  if(!view.roamers.some(enemy=>enemy.id===selectedPerson))updateInteractionResult();
  combatUI.render(view);
  agentUI?.personChanged();
  $('#advance').disabled=busy||Boolean(view.battle);
  $('#command').disabled=Boolean(view.battle);
}
function feedback(before,after) {
  const labels={stones:'灵石',hp:'气血',herbs:'灵草',talismans:'天雷符',reputation:'声望',seal:'鉴定印'};
  const changes=Object.entries(labels).map(([key,label])=>{const n=after.player[key]-before.player[key];return n?`<span class="${n<0?'loss':'gain'}">${label} ${n>0?'+':''}${n}</span>`:'';}).filter(Boolean);
  if(!changes.length)return;
  const item=document.createElement('div');item.className='resource-feedback';item.innerHTML=changes.join('');$('#feedback-stack').append(item);setTimeout(()=>item.remove(),4500);
}
function showTurnSummary(before,after) {
  const lastId=before.events[0]?.id||0;
  const events=after.events.filter(event=>event.id>lastId);
  newsCount+=events.length;$('#news-count').hidden=!newsCount;$('#news-count').textContent=newsCount;
  $('#summary-title').textContent=`第 ${after.turn} 旬 · ${events.length} 条新动向`;
  $('#summary-events').innerHTML=events.slice(0,2).map(event=>`<p><b>${esc(event.actor)}</b>${esc(event.text)}</p>`).join('')||'<p>风过坊市，本旬尚无新的公开动向。</p>';
  if(events.length>2)$('#summary-events').innerHTML+=`<small>其余 ${events.length-2} 条可在邸报查看。</small>`;
  $('#turn-summary').hidden=false;
  clearTimeout(summaryTimer); summaryTimer=setTimeout(()=>{ $('#turn-summary').hidden=true; },10000);
}
function updateCommandStatus() {
  $('#command-status').textContent=commandPending?'正在问计 · 可继续探索':busy?'正在结算…':currentModelName?'AI 问计 · 行动不限':'离线规则 · 模型未连接';
  $('#command-status').title=currentModelName||'在 .env.local 配置 DeepSeek 密钥后运行 npm start';
  $('#command-submit').disabled=busy||commandPending||Boolean(current?.battle);
  $('#command-form').setAttribute('aria-busy',String(busy||commandPending));
}
function cancelPendingCommand() {
  if(!commandPending)return;
  commandGeneration++;commandController?.abort();commandController=null;commandPending=false;
  commandUI?.refresh();updateCommandStatus();
}
async function call(path,payload={}) {
  if(busy||!current)return false;
  cancelPendingCommand();
  const before=current;
  busy=true;world.setBusy(true);updateNearbyPrompt();document.body.classList.add('busy');$('#command-form').setAttribute('aria-busy','true');
  commandUI.refresh();
  for(const id of ['#advance','#restart','#command-submit'])$(id).disabled=true;
  $('#command-status').textContent=path==='/api/intent'?'正在推敲你的计策……':'正在结算……';
  try {
    const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,expectedRevision:current.revision})});
    const data=await response.json();
    if(!response.ok){if(data.view)render(data.view,data.modelName);throw new Error(data.error||'行动未能执行');}
    if(path==='/api/reset'){world.reset();agentUI.reset();commandUI.reset();chooseRoute('trade');lastInteraction=null;}
    if(path==='/api/advance')lastInteraction=null;
    if(path==='/api/combat'&&payload.type==='turn') {
      world.sync(data.view);
      await world.combatReact(before,data.view,payload);
    }
    render(data.view,data.modelName);
    if(path==='/api/intent')return data;
    notice(data.result);feedback(before,data.view);
    if(path==='/api/combat'&&payload.type==='claim')$('#world-hint').textContent='战利品已收入行囊。可以研习功法、装备武器，再继续游历。';
    if(path==='/api/action'&&!data.actionType.startsWith('travel_')) {
      const target=actionTarget({...payload,type:data.actionType},before);
      lastInteraction={target,text:data.result}; updateInteractionResult();
      world.speak(target,data.result);
      $('#world-person').scrollTop=0;
    }
    world.react(data.actionType,before,data.view);
    if(path==='/api/command')$('#command').value='';
    if(path==='/api/advance')showTurnSummary(before,data.view);
    if(!before.world.breakthrough&&data.view.world.breakthrough){
      $('#ending-copy').textContent=data.result;
      $('#ending-stats').innerHTML=`<span>历时 <b>${data.view.turn} 旬</b></span><span>声望 <b>${data.view.player.reputation}</b></span><span>未偿承诺 <b>${data.view.pill.partnerDebt} 灵石</b></span>`;
      $('#ending').showModal();
    }
    return data;
  }catch(error){
    notice(error.message,true);$('#world-hint').textContent=error.message;
    if(path==='/api/combat')combatUI.showError(error.message);
    if(path==='/api/action'&&(selectedPerson||selectedSite)){lastInteraction={target:selectedPerson||selectedSite,text:error.message};updateInteractionResult();}
    return false;
  }
  finally{
    busy=false;world.setBusy(false);updateNearbyPrompt();document.body.classList.remove('busy');$('#command-form').setAttribute('aria-busy','false');updateCommandStatus();commandUI.refresh();
    for(const id of ['#advance','#restart','#command-submit'])$(id).disabled=Boolean(current?.battle);
  }
}

$('#world-actions').addEventListener('click',async event=>{
  const encounter=event.target.closest('[data-encounter]');
  if(encounter){
    if(busy||current.battle)return;
    const enemyId=encounter.dataset.enemyId,type=encounter.dataset.encounter;
    if(!await world.goTo(enemyId))return;
    const data=await call('/api/combat',{type,enemyId});
    if(data&&type==='claim')openPanel('self');
    return;
  }
  const button=event.target.closest('[data-world-action]');if(!button)return;const type=button.dataset.worldAction;
  if(type==='ask'){
    const target=selectedPerson;
    const data=await executeAction({type,target});
    if(data&&selectedPerson===target)agentUI.talk('近来有什么值得留意的事？结合我们之前的交谈，说说你的打算。');
    return;
  }
  executeAction({type});
});
$('#trade-form').addEventListener('submit',event=>{event.preventDefault();executeAction({type:'negotiate',offer:Number($('#trade-offer').value),leverage:$('#trade-leverage').value});});
$('#actions').addEventListener('click',event=>{const button=event.target.closest('[data-locate-action]');if(button){const def=defs[button.dataset.locateAction];executeAction({type:def.type});}});
$('#people').addEventListener('click',event=>{const button=event.target.closest('[data-person]');if(button)navigate(button.dataset.person);});
document.querySelectorAll('[data-open-panel]').forEach(button=>button.addEventListener('click',()=>openPanel(button.dataset.openPanel)));
document.querySelectorAll('[data-route]').forEach(button=>button.addEventListener('click',()=>{commandGeneration++;world.cancel();chooseRoute(button.dataset.route);}));
$('#quest-track').addEventListener('click',()=>{if(agentUI.track())return;const next=currentSteps.find(step=>!step.done&&!step.skipped);if(current.pill.ownerId==='xu'||!next)openPanel('events');else navigate(next.target);});
$('#quest-steps').addEventListener('click',event=>{const button=event.target.closest('[data-quest-step]');if(button)navigate(currentSteps[Number(button.dataset.questStep)].target);});
$('#panel-close').addEventListener('click',closePanel);
$('#person-close').addEventListener('click',()=>world.clearSelection());
$('#advance').addEventListener('click',()=>{world.cancel();call('/api/advance');});
$('#restart').addEventListener('click',()=>{if(confirm('重开会覆盖当前局的存档，确定吗？')){closePerson();closePanel();call('/api/reset');}});
$('#command-form').addEventListener('submit',event=>{event.preventDefault();if($('#command').value.trim())submitCommand($('#command').value.trim());});
$('#command').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('#command-form').requestSubmit();}});
$('#summary-close').addEventListener('click',()=>{$('#turn-summary').hidden=true;});
$('#summary-continue').addEventListener('click',()=>{$('#turn-summary').hidden=true;openPanel('events');});
$('#navigation-cancel').addEventListener('click',()=>{cancelPendingCommand();commandGeneration++;world.cancel();});
$('#nearby-interact').addEventListener('click',()=>world.interact());
$('#interaction-next').addEventListener('click',()=>{const next=currentSteps.find(step=>!step.done&&!step.skipped);if(next)navigate(next.target);});
$('#ending-close').addEventListener('click',()=>$('#ending').close());
$('#help-toggle').addEventListener('click',()=>{$('#help-card').hidden=!$('#help-card').hidden;});
$('#camera-left').addEventListener('click',()=>world.rotate(-Math.PI/6));$('#camera-right').addEventListener('click',()=>world.rotate(Math.PI/6));
$('#camera-in').addEventListener('click',()=>world.zoomBy(-3));$('#camera-out').addEventListener('click',()=>world.zoomBy(3));$('#camera-home').addEventListener('click',()=>world.recenter());
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!current?.battle){cancelPendingCommand();commandGeneration++;closePanel();world.clearSelection();$('#turn-summary').hidden=true;$('#help-card').hidden=true;}});

try{const response=await fetch('/api/state');if(!response.ok)throw new Error('无法读取游戏状态');const data=await response.json();render(data.view,data.modelName);}
catch(error){notice(`无法连接本地游戏服务：${error.message}`,true);}

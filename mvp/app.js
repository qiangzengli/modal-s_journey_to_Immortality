import { createWorld } from './world.js';
import { ACTION_DEFS, PERSON_ACTIONS, PERSON_DETAILS, SITES, questSteps } from './content.js';

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
let currentSteps = [];
let newsCount = 0;

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
  selectedPerson = null;
  selectedSite = null;
  $('#world-person').hidden = true;
}
function actionMarkup(type) {
  const state = type === 'ask' ? { available: true, reason: '' } : current.actionOptions[type];
  const def = defs[type] || { title: names[type], cost: '无资源消耗', detail: '听取对方当前的关切，记入往事。' };
  return `<button type="button" class="context-action" data-world-action="${type}" ${state.available ? '' : 'disabled'}><span><b>${esc(def.title)}</b><small>${esc(def.cost)}</small></span><i>${state.available ? '↗' : '·'}</i><em>${esc(state.available ? def.detail : state.reason)}</em></button>`;
}
function relationship(trust) { return trust >= 20 ? '信任' : trust <= -30 ? '敌视' : trust < 0 ? '戒备' : '初识'; }
function showPerson(id, focusUI = true) {
  const person = current?.people.find(p => p.id === id);
  if (!person) return;
  selectedPerson=id; selectedSite=null;
  if (focusUI) closePanel();
  const detail=PERSON_DETAILS[id];
  $('#world-person').hidden=false;
  $('#world-person').style.setProperty('--person-color', detail.color);
  $('#person-seal').textContent=person.name[0];
  $('#world-role').textContent=person.role;
  $('#world-name').textContent=person.name;
  $('#person-meta').innerHTML=`<span>${esc(person.condition === '筑基初期' ? person.condition : detail.realm)}</span><span>${esc(relationship(person.trust))} ${person.trust > 0 ? '+' : ''}${person.trust}</span><span>${esc(person.condition)}</span>`;
  $('#world-goal').textContent=detail.bio;
  $('#person-dialogue').hidden=!person.dialogue;
  $('#person-dialogue').textContent=person.dialogue ? `第 ${person.dialogue.turn} 旬 · ${person.dialogue.text}` : '';
  const options = PERSON_ACTIONS[id].filter(type => type !== 'buy_pill' || (id === 'lu' ? current.pill.ownerId === 'lu' : current.pill.ownerId !== 'lu'));
  $('#world-actions').innerHTML=options.map(actionMarkup).join('');
  $('#trade-form').hidden=!(id === 'shen' && current.pill.ownerId === 'shen' && current.player.place === 'market');
  $('#trade-leverage').innerHTML='<option value="none">仅凭报价</option>'+current.player.clues.map(clue => `<option value="${clue}">${clue === 'smuggling' ? '亮出货道证词' : '持真丹鉴定'}</option>`).join('');
  $('#person-memory').hidden=false;
  $('#memory-list').innerHTML=person.memories.map(event=>`<p><small>第 ${event.turn} 旬</small>${esc(event.text)}</p>`).join('') || '<p>尚无与你有关的往事。</p>';
  if (focusUI) $('#world-hint').textContent=`已走近${person.name}。先看清前提与代价，再落子。`;
}
function showSite(id, focusUI = true) {
  const site=SITES[id];
  if (!site) return;
  selectedPerson=null;selectedSite=id;
  if (focusUI) closePanel();
  $('#world-person').hidden=false;
  $('#world-person').style.setProperty('--person-color', '#c9bb82');
  $('#person-seal').textContent=id==='herbs'?'草':id==='camp'?'静':'阵';
  $('#world-role').textContent=site.role;
  $('#world-name').textContent=site.name;
  $('#world-goal').textContent=site.detail;
  const state=id==='herbs'?`可采 ${current.world.herbsRemaining} 株`:id==='formation'?(current.world.trapReady?'天雷符已布下':'阵位尚未布置'):`气血 ${current.player.hp} / 100`;
  $('#person-meta').innerHTML=`<span>${esc(state)}</span>`;
  $('#person-dialogue').hidden=true;$('#person-memory').hidden=true;$('#trade-form').hidden=true;
  $('#world-actions').innerHTML=site.actions.map(actionMarkup).join('');
  if (focusUI) $('#world-hint').textContent=`已到达${site.name}。${state}。`;
}

const world=createWorld($('#world-canvas'), {
  onSelectPerson: showPerson, onSelectSite: showSite, onClearPerson: closePerson,
  miniMap: $('#mini-map'),
  onTravel: async place => {
    const arrived=await call('/api/action', { type:place==='woods'?'travel_woods':'travel_market' });
    if(arrived) $('#world-hint').textContent=place==='woods'?'已进入黑风林。采药、设伏，或去听雨亭调息。':'已回到地下坊市。交易与消息仍在继续。';
    return arrived;
  },
  onHint: text=>{ $('#world-hint').textContent=text; notice(text); }
});

function updateQuest() {
  currentSteps=questSteps(current,chosenRoute);
  const done=currentSteps.filter(step=>step.done||step.skipped).length;
  const next=currentSteps.find(step=>!step.done&&!step.skipped);
  $('#quest-progress').textContent=`${done} / ${currentSteps.length}`;
  $('#quest-title').textContent=next?.title || '筑基已成';
  $('#quest-detail').textContent=current.pill.ownerId==='xu'?'徐宁已经取得这枚丹。可在邸报复盘因果，重开尝试另一条路。':next?.detail || '道途继续，兑现承诺，或看看世界如何回应你。';
  $('#quest-track').textContent=current.pill.ownerId==='xu'?'查看因果账本':next?`追踪目标 ◇`:'查看未了因果';
  document.querySelectorAll('[data-route]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.route===chosenRoute)));
  $('#quest-steps').innerHTML=currentSteps.map((step,index)=>`<button type="button" data-quest-step="${index}" class="quest-step ${step.done||step.skipped?'done':''}"><b>${step.skipped?'—':step.done?'✓':index+1}</b><span><strong>${esc(step.title)}</strong><small>${step.skipped?'已取得机缘，此前置不再需要。':esc(step.detail)}</small></span></button>`).join('');
}
function navigate(target) {
  closePanel();
  if(target==='advance'){ $('#advance').classList.remove('attention'); void $('#advance').offsetWidth; $('#advance').classList.add('attention');notice('右上角推进一旬，人物会按各自目标行动。');return; }
  const person=current.people.find(p=>p.id===target);
  if(person){
    if(person.place!==current.player.place){world.focusSite('gate');notice(`${person.name}在${person.place==='woods'?'黑风林':'坊市'}，先经过界门。`);}
    else world.focus(target);
  } else world.focusSite(target);
}
function render(view, modelName) {
  current=view;
  world.sync(view);
  $('#world-location').textContent=view.player.place==='market'?'地下坊市':'黑风林';
  if((selectedPerson&&view.people.find(p=>p.id===selectedPerson)?.place!==view.player.place)||(selectedSite&&view.player.place!=='woods'))closePerson();
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
  $('#mode').textContent=modelName?`自然语言模型：${modelName}。明确行动直接执行，自由表达由模型解析。`:'离线规则模式：可使用按钮或常见中文行动。';
  const entries=[['境界',view.world.realm],['所在',view.player.place==='market'?'地下坊市':'黑风林'],['灵石',`${view.player.stones} 枚`],['气血',`${view.player.hp} / 100`],['声望',`${view.player.reputation} / 100`],['灵草',`${view.player.herbs} 株`],['天雷符',`${view.player.talismans} 张`],['空白印',`${view.player.seal} 枚`]];
  $('#stats').innerHTML=entries.map(([key,value])=>`<div><span>${key}</span><strong>${esc(value)}</strong></div>`).join('');
  $('#clues').innerHTML=`<h3>已知线索</h3>${view.player.clues.map(c=>`<span class="clue">${c==='authentic'?'真丹鉴定':'禁运货道证词'}</span>`).join('')||'<p>尚无证据。可从药师或传音客入手。</p>'}${view.pill.partnerDebt?`<p class="debt">与徐宁的承诺：尚欠 ${view.pill.partnerDebt} 灵石</p>`:''}`;
  $('#people').innerHTML=view.people.map(p=>`<button class="person" type="button" data-person="${p.id}"><span class="avatar" style="border-color:${PERSON_DETAILS[p.id].color}">${p.name[0]}</span><span class="person-main"><strong>${p.name}<small>${p.role}</small></strong><span>${esc(p.goal)} · ${esc(relationship(p.trust))}</span></span><span class="person-place">${p.place==='market'?'坊市':'林中'} ↗</span></button>`).join('');
  $('#events').innerHTML=view.events.map(event=>`<article class="event" id="event-${event.id}"><div class="event-meta"><span>第 ${event.turn} 旬 · ${esc(event.actor)}</span><b>#${event.id}</b></div><p>${esc(event.text)}</p>${event.causes.length?`<small>缘起：${event.causes.map(id=>`<a href="#event-${id}">事件 #${id}</a>`).join(' · ')}</small>`:''}</article>`).join('');
  $('#actions').innerHTML=ACTION_DEFS.filter(def=>def.place===view.player.place).map(def=>{
    const state=view.actionOptions[def.type];
    return `<button class="action ${state.available?'':'locked'}" data-locate-action="${def.type}" type="button"><strong>${esc(def.title)} <i>↗</i></strong><span>${esc(def.cost)}</span><small>${esc(state.available?def.detail:state.reason)}</small></button>`;
  }).join('');
  updateQuest();
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
  $('#summary-events').innerHTML=events.slice(0,5).map(event=>`<p><b>${esc(event.actor)}</b>${esc(event.text)}</p>`).join('')||'<p>风过坊市，本旬尚无新的公开动向。</p>';
  if(events.length>5)$('#summary-events').innerHTML+=`<small>其余 ${events.length-5} 条可在邸报查看。</small>`;
  $('#turn-summary').hidden=false;
}
async function call(path,payload={}) {
  if(busy||!current)return false;
  const before=current;
  busy=true;world.setBusy(true);document.body.classList.add('busy');$('#command-form').setAttribute('aria-busy','true');
  $('#command-status').textContent=path==='/api/command'?'正在推敲你的计策……':'正在结算……';
  try {
    const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,expectedRevision:current.revision})});
    const data=await response.json();
    if(!response.ok){if(data.view)render(data.view,data.modelName);throw new Error(data.error||'行动未能执行');}
    render(data.view,data.modelName);notice(data.result);feedback(before,data.view);
    world.react(data.actionType,before,data.view);
    if(path==='/api/command')$('#command').value='';
    if(path==='/api/advance')showTurnSummary(before,data.view);
    if(!before.world.breakthrough&&data.view.world.breakthrough){
      $('#ending-copy').textContent=data.result;
      $('#ending-stats').innerHTML=`<span>历时 <b>${data.view.turn} 旬</b></span><span>声望 <b>${data.view.player.reputation}</b></span><span>未偿承诺 <b>${data.view.pill.partnerDebt} 灵石</b></span>`;
      $('#ending').showModal();
    }
    return true;
  }catch(error){notice(error.message,true);$('#world-hint').textContent=error.message;return false;}
  finally{busy=false;world.setBusy(false);document.body.classList.remove('busy');$('#command-form').setAttribute('aria-busy','false');$('#command-status').textContent='行动不限 · 时间手动推进';}
}

$('#world-actions').addEventListener('click',event=>{const button=event.target.closest('[data-world-action]');if(!button)return;const type=button.dataset.worldAction;call('/api/action',type==='ask'?{type,target:selectedPerson}:{type});});
$('#trade-form').addEventListener('submit',event=>{event.preventDefault();call('/api/action',{type:'negotiate',offer:Number($('#trade-offer').value),leverage:$('#trade-leverage').value});});
$('#actions').addEventListener('click',event=>{const button=event.target.closest('[data-locate-action]');if(button){const def=defs[button.dataset.locateAction];navigate(def.type==='buy_pill'&&current.pill.ownerId==='lu'?'lu':def.person||def.site);}});
$('#people').addEventListener('click',event=>{const button=event.target.closest('[data-person]');if(button)navigate(button.dataset.person);});
document.querySelectorAll('[data-open-panel]').forEach(button=>button.addEventListener('click',()=>openPanel(button.dataset.openPanel)));
document.querySelectorAll('[data-route]').forEach(button=>button.addEventListener('click',()=>{chosenRoute=button.dataset.route;updateQuest();}));
$('#quest-track').addEventListener('click',()=>{const next=currentSteps.find(step=>!step.done&&!step.skipped);if(current.pill.ownerId==='xu'||!next)openPanel('events');else navigate(next.target);});
$('#quest-steps').addEventListener('click',event=>{const button=event.target.closest('[data-quest-step]');if(button)navigate(currentSteps[Number(button.dataset.questStep)].target);});
$('#panel-close').addEventListener('click',closePanel);
$('#person-close').addEventListener('click',()=>world.clearSelection());
$('#advance').addEventListener('click',()=>call('/api/advance'));
$('#restart').addEventListener('click',()=>{if(confirm('重开会覆盖当前局的存档，确定吗？')){closePerson();closePanel();call('/api/reset');}});
$('#command-form').addEventListener('submit',event=>{event.preventDefault();if($('#command').value.trim())call('/api/command',{text:$('#command').value.trim()});});
$('#command').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('#command-form').requestSubmit();}});
for(const id of ['summary-close','summary-continue'])$('#'+id).addEventListener('click',()=>{$('#turn-summary').hidden=true;});
$('#ending-close').addEventListener('click',()=>$('#ending').close());
$('#help-toggle').addEventListener('click',()=>{$('#help-card').hidden=!$('#help-card').hidden;});
$('#camera-left').addEventListener('click',()=>world.rotate(-Math.PI/6));$('#camera-right').addEventListener('click',()=>world.rotate(Math.PI/6));
$('#camera-in').addEventListener('click',()=>world.zoomBy(-3));$('#camera-out').addEventListener('click',()=>world.zoomBy(3));$('#camera-home').addEventListener('click',()=>world.recenter());
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closePanel();world.clearSelection();$('#turn-summary').hidden=true;$('#help-card').hidden=true;}});

try{const response=await fetch('/api/state');if(!response.ok)throw new Error('无法读取游戏状态');const data=await response.json();render(data.view,data.modelName);}
catch(error){notice(`无法连接本地游戏服务：${error.message}`,true);}

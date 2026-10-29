import { gameRequest } from './api-client.js';
import {STORY_BEATS} from './story-beats.js';
import {createStorySceneUI} from './story-scene-ui.js';
import { createExperienceUI } from './experience-ui.js';
import { createStateLoader } from './state-loader.js';
import { createSectUI, affiliationText } from './sect-ui.js';
import { createWorld } from './world.js';
import { RETIRED_PILL_ACTIONS, ACTION_DEFS, PERSON_ACTIONS, PERSON_DETAILS, SITES } from './content.js';
import { createCombatUI, roamerActions } from './combat-ui.js';
import { createSocietyUI } from './society-ui.js';
import { createGardenUI } from './garden-ui.js';
import { createAgentUI } from './agent-ui.js';
import { createCommandUI } from './command-ui.js';
import { createPlanUI } from './plan-ui.js';
import { createCampaignUI } from './campaign-ui.js';
import { REGIONS, regionName } from './regions.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const names = Object.fromEntries(ACTION_DEFS.map(action => [action.type, action.title]));
names.ask = '探问近况';
const defs = Object.fromEntries(ACTION_DEFS.map(action => [action.type, action]));
const titles = { sects: '门派与道统', campaign: '天下与游历', opportunity: '筑基丹炼制', self: '人物与行囊', people: '修真界众生', actions: '行事之前', events: '修真邸报' };
let current;
let busy = false;
let selectedPerson = null;
let selectedSite = null;
let activePanel = null;
let newsCount = 0;
let summaryTimer;
let nearbyTarget = null;
let lastInteraction = null;
let commandGeneration = 0;
let commandPending = false;
let commandController = null;
let agentUI;
let gardenUI;
let societyUI;
let navigatingNow=false;
let planUI;
let commandUI;
let currentModelName = null;
let campaignUI;
let sectUI;
let experience;
let loadState;
let storyScene;
function actionTarget(action, view=current) {
  if(action.type==='ask')return action.target;
  if(view?.story&&defs[action.type]?.garden)return 'valley_bottle';
  if(action.type==='frontier_rest')return ({quarry:'workers',ruins:'memorial',yanbao:'yanbao_refuge'})[view.player.place] || 'infirmary';
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
  const next=current?.story&&!current.story.complete?current.story.next:planUI?.next();
  $('#interaction-next').hidden=!next||!lastInteraction||lastInteraction.target!==id;
  $('#interaction-next').textContent=next?.target==='advance'?'等候下一旬 →':`接下来 · ${next?.title || ''} →`;
  return !$('#world-person').hidden&&!$('#interaction-result').hidden&&$('#world-person').dataset.pane!=='about'&&!current?.battle;
}


function notice(text, bad = false) {
  experience?.toast(text,bad);
  $('#message').textContent = text;
  $('#message').classList.toggle('bad', bad);
}
function closePanel() {
  experience?.capture();
  activePanel = null;
  $('#map-panel').hidden = true;
  document.querySelectorAll('[data-open-panel]').forEach(button => button.setAttribute('aria-pressed', 'false'));
}
function openPanel(name) {
  experience?.capture();
  if(!current||current.battle)return;
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
  experience?.capture();
  lastInteraction = null;
  selectedPerson = null;
  selectedSite = null;
  $('#world-person').hidden = true;
  document.body.classList.remove('interacting');
  updateNearbyPrompt();
  agentUI?.personChanged();
  gardenUI?.render();
  societyUI?.render();
}
function actionMarkup(type) {
  const state = type === 'ask' ? { available: true, reason: '' } : current.actionOptions[type];
  const def = defs[type] || { title: '探问近况 · 人物交谈', cost: '无资源消耗', detail: '询问当前关切，可接着追问缘由或商量打算。' };
  return `<button type="button" class="context-action" data-world-action="${type}" ${state.available ? '' : 'disabled'}><span><b>${esc(def.title)}</b><small>${esc(def.cost)}</small></span><i>${state.available ? '↗' : '·'}</i><em>${esc(state.available ? def.detail : state.reason)}</em></button>`;
}
function relationship(trust) { return trust >= 20 ? '信任' : trust <= -30 ? '敌视' : trust < 0 ? '戒备' : '初识'; }
function showPerson(id, focusUI = true) {
  if(focusUI)experience?.capture();
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
  $('#person-meta').insertAdjacentHTML('beforeend', `<span>${esc(affiliationText(person.affiliation))}</span>`);
  $('#world-goal').textContent=detail.bio;
  $('#person-dialogue').hidden=false;
  $('#person-dialogue').textContent=person.agent?.speech || person.greeting || '';
  $('#npc-activity').textContent=person.agent?.activity ? `此刻 · ${person.agent.activity}` : '';
  $('#npc-activity').hidden=false;
  $('#npc-activity').hidden=false;
  const options = PERSON_ACTIONS[id].filter(type => type !== 'buy_pill' || (id === 'lu' ? current.pill.ownerId === 'lu' : current.pill.ownerId !== 'lu'));
  $('#world-actions').innerHTML=options.map(actionMarkup).join('') + (person.affiliation?.sectId&&current.sects.schools.some(s=>s.id===person.affiliation.sectId) ? `<button type="button" class="challenge-button" data-view-sect="${person.affiliation.sectId}">查看${esc(person.affiliation.name)}门规 →</button>` : '');
  $('#trade-form').hidden=true;
  const previousLeverage=$('#trade-leverage').value;
  $('#trade-leverage').innerHTML='<option value="none">仅凭报价</option>'+current.player.clues.map(clue => `<option value="${clue}">${clue === 'smuggling' ? '亮出货道证词' : '持真丹鉴定'}</option>`).join('');
  if([...$('#trade-leverage').options].some(option=>option.value===previousLeverage))$('#trade-leverage').value=previousLeverage;
  $('#person-memory').hidden=false;
  $('#memory-list').innerHTML=person.memories.map(event=>`<p><small>第 ${event.turn} 旬</small>${esc(event.text)}</p>`).join('') || '<p>尚无与你有关的往事。</p>';
  updateNearbyPrompt(); updateInteractionResult();

  $('#world-hint').textContent=`正在与${person.name}交谈。`;
  agentUI?.personChanged();
  gardenUI?.render();
  societyUI?.render();
}
function showRoamer(enemy, focusUI = true) {
  if(focusUI)experience?.capture();
  selectedPerson=enemy.id;selectedSite=null;
  if(focusUI)closePanel();
  $('#world-person').hidden=false;
  document.body.classList.add('interacting');
  $('#world-person').style.setProperty('--person-color',enemy.color);
  $('#person-seal').textContent=enemy.defeated?(enemy.reward?'果':'袋'):enemy.name[0];
  $('#world-role').textContent=enemy.defeated?(enemy.reward?'石殿主药 · 战后所得':'林道遗落 · 储物袋'):enemy.role;
  $('#world-name').textContent=enemy.defeated?(enemy.reward?'天灵果':enemy.rewardName||`${enemy.name}的储物袋`):enemy.name;
  $('#person-meta').innerHTML=`<span>${enemy.realm}</span><span>${enemy.kind==='beast'?'石殿妖兽':esc(affiliationText(enemy.affiliation))}</span><span>${enemy.defeated?'已败退':`气血 ${enemy.hp} · 攻势 ${enemy.attack}`}</span>`;
  $('#world-goal').hidden=false;$('#world-goal').textContent=enemy.defeated?(enemy.reward?'墨蛟已倒下，天灵果等待收取。主药将进入任务药囊。':`对手已败，${enemy.rewardName||'储物袋'}尚待亲自收取。`):enemy.bio;
  $('#person-dialogue').hidden=Boolean(enemy.defeated);$('#person-dialogue').textContent=enemy.agent?.speech || enemy.quote || '他正在观察来人，可以先交谈再决定是否动手。';
  $('#npc-activity').textContent=enemy.agent?.activity ? `此刻 · ${enemy.agent.activity}` : '';
  $('#npc-activity').hidden=Boolean(enemy.defeated);
  $('#person-memory').hidden=true;$('#trade-form').hidden=true;$('#interaction-result').hidden=true;
  $('#world-actions').innerHTML=roamerActions(enemy,current.player.hp);

  $('#world-hint').textContent=enemy.defeated?(enemy.reward?'天灵果就在石殿中。':'储物袋就在脚边。'):`已靠近${enemy.name}。可观察后再决定是否斗法。`;
  updateNearbyPrompt();
  agentUI?.personChanged();
  gardenUI?.render();
  societyUI?.render();
}
function showSite(id, focusUI = true) {
  if(focusUI)experience?.capture();
  const site=SITES[id];
  if (!site) return;
  selectedPerson=null;selectedSite=id;
  if (focusUI) closePanel();
  $('#world-person').hidden=false;
  document.body.classList.add('interacting');
  $('#world-person').style.setProperty('--person-color', '#c9bb82');
  $('#person-seal').textContent=site.seal || (id==='herbs'?'草':id==='camp'?'静':'阵');
  $('#world-role').textContent=site.role;
  $('#world-name').textContent=site.name;
  $('#world-goal').textContent=id==='herbs'&&current.garden.bottle?'小绿瓶在月华中凝液，灵圃会随旬数自行生长。成熟的灵草留在此地，等你游历归来收取。':site.detail;
  const state=site.place!=='woods'?`${regionName(site.place)} · 灵草 ${current.player.herbs} · 主药 ${(current.campaign.questHerbs||[]).length} 味`:id==='herbs'?`可采 ${current.world.herbsRemaining} 株`:id==='formation'?(current.world.trapReady?'天雷符已布下':'阵位尚未布置'):`气血 ${current.player.hp} / 100`;
  $('#person-meta').innerHTML=`<span>${esc(state)}</span>`;
  $('#person-dialogue').hidden=true;$('#person-memory').hidden=true;$('#trade-form').hidden=true;$('#npc-activity').hidden=true;
  $('#world-actions').innerHTML=site.actions.map(actionMarkup).join('') + (site.sect ? `<button type="button" class="challenge-button" data-view-sect="${site.sect}">查看门规与拜帖 →</button>` : '');
  updateNearbyPrompt(); updateInteractionResult();

  $('#world-hint').textContent=`已到达${site.name}。${state}。`;
  agentUI?.personChanged();
  gardenUI?.render();
  societyUI?.render();
}

const world=createWorld($('#world-canvas'), {
  onSelectPerson: showPerson, onSelectSite: showSite, onClearPerson: closePerson,
  miniMap: $('#mini-map'),
  onNavigation: state => {
    navigatingNow=Boolean(state);
    $('#navigation-status').hidden=!state;
    if(state){ $('#navigation-copy').textContent=`${state.stage} · ${state.name}`; $('#world-hint').textContent=`${state.stage} · ${state.name}`; $('#turn-summary').hidden=true; }
    else if (/^(正在前往|传送前往) · /.test($('#world-hint').textContent)) $('#world-hint').textContent='点击人物交谈，或继续探索这片天地。';
  },
  onNearby: target => { nearbyTarget=target; updateNearbyPrompt(); },
  onTravel: async place => {
    const arrived=await call('/api/action', { type:'travel_region',place });
    if(arrived) $('#world-hint').textContent=REGIONS[place].description;
    return arrived;
  },
  onHint: text=>{ $('#world-hint').textContent=text; notice(text); }
});
const combatUI=createCombatUI({request:call,navigate,openInventory:()=>openPanel('self')});
gardenUI=createGardenUI({getState:()=>({view:current,site:selectedSite,busy}),executeAction,navigate});
agentUI=createAgentUI({
  getState:()=>({view:current,plan:planUI?.context()||'',personId:selectedPerson,busy}),
  executeAction, notice,
  onStale:data=>{if(!busy&&data.view.revision!==current?.revision)render(data.view,data.modelName);}
});
commandUI=createCommandUI({
  getState:()=>({view:current,plan:planUI?.context()||'',busy:busy||commandPending}),
  submit:submitCommand,
  navigate:target=>target==='events'?openPanel('events'):navigate(target),
  notice
});

planUI=createPlanUI({
  getState:()=>({view:current,busy}), executeAction, advance:()=>call('/api/advance'), notice,
  onStale:data=>{if(!busy)render(data.view,data.modelName);},
  onChange:()=>{updateInteractionResult();commandUI?.refresh();}
});

societyUI=createSocietyUI({
  getState:()=>({view:current,personId:selectedPerson,siteId:selectedSite,panel:activePanel,blocked:document.body.dataset.uiBlocked==='true',busy,navigating:navigatingNow,chatPending:agentUI?.isPending()}),
  request:call,navigate,notice,
  sync:data=>{const before=current;render(data.view,data.modelName);if(before&&data.view.turn>before.turn)showTurnSummary(before,data.view);}
});

sectUI=createSectUI({element:$('#sect-content'),getState:()=>({view:current,busy}),request:call,navigate});

campaignUI=createCampaignUI({getState:()=>({view:current,busy}),navigate,executeAction});

function updateQuest() {
  const a=current.campaign.alchemy;
  $('#quest-facts').textContent=current.campaign.alternatePill||current.world.breakthrough||current.pill.ownerId==='player'?current.outcome:a.harvested?'成熟主药已采收 · 可按方炼丹':a.planted?`主药生长 ${a.growth}/${a.growthRequired} · ${a.ready?'可采收':'推进旬数继续培养'}`:'采集活株 → 留种培育 → 成熟采收 → 炼制';
  planUI?.changed();
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
  closePanel();
  if(['travel_woods','travel_market','travel_region'].includes(action.type)) {
    const place=action.type==='travel_region'?(action.place||action.target):action.type==='travel_woods'?'woods':'market';
    if(current.player.place===place){notice('你已经在这里。');return false;}
    return world.goTo({kind:'gate',place,name:regionName(place)});
  }
  const target=actionTarget(action);
  if(!target){notice('这项行动暂时没有对应的地图目标。',true);return false;}
  if(!await world.goTo(target))return false;
  if(STORY_BEATS[action.type]){
    const decision=await storyScene.choose(defs[action.type]);
    if(!decision)return false;
    if(decision.talk){
      if(decision.person&&current.people.some(p=>p.id===decision.person)){
        if(await navigate(decision.person))agentUI.talk(decision.question);
      }else await submitCommand(decision.question);
      return false;
    }
    action={...action,approach:decision.approach};
  }
  if(['restore_flow','lease_core','seal_core'].includes(action.type)&&!await experience.confirm({title:defs[action.type].title,text:`${defs[action.type].detail}。\n代价：${defs[action.type].cost}。\n这项抉择只能作出一次。`,action:'确认抉择'}))return false;
  return call('/api/action',action);
}
async function submitCommand(text) {
  if(busy||commandPending||!current||current.battle)return;
  const ticket=++commandGeneration;
  const revision=current.revision,plan=planUI?.context()||'';
  const controller=new AbortController();commandController=controller;commandPending=true;
  commandUI.refresh();updateCommandStatus();
  try {
    const response=await gameRequest('/api/intent',{method:'POST',signal:controller.signal,headers:{'content-type':'application/json'},body:JSON.stringify({text,plan,history:commandUI.history(),expectedRevision:revision})});
    const planned=await response.json();
    if(ticket!==commandGeneration)return;
    if(!response.ok){if(planned.view&&!busy)render(planned.view,planned.modelName);throw new Error(planned.error||'问计暂未完成。');}
    if(current.revision!==revision||busy)return;
    commandPending=false;commandController=null;
    currentModelName=planned.modelName;
    if(planned.reply){
      commandUI.show(text,planned.reply);
      notice(planned.reply.source==='model'?'可继续追问，或点击建议追踪目标。':'本次显示已知线索，可稍后重试。');
      if($('#command').value.trim()===text){$('#command').value='';$('#command').dispatchEvent(new Event('input'));}
      return;
    }
    $('#command').blur();
    if(planned.action&&await executeAction(planned.action)&&$('#command').value.trim()===text){$('#command').value='';$('#command').dispatchEvent(new Event('input'));}
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
  $('#world-location').textContent=regionName(view.player.place);
  if(view.battle) { closePanel(); closePerson(); }
  if((selectedPerson&&[...view.people,...view.roamers].find(p=>p.id===selectedPerson)?.place!==view.player.place)||(selectedSite&&view.player.place!==SITES[selectedSite].place))closePerson();
  else if(selectedPerson)showPerson(selectedPerson,false);
  else if(selectedSite)showSite(selectedSite,false);
  $('#turn').textContent=`第 ${view.turn} 旬`;
  $('#advance').title='主动听候一次众生决策；平时探索也会自动演化';
  $('#realm').textContent=view.world.realm;
  $('#hud-stones').textContent=view.player.stones;$('#hud-hp').textContent=view.player.hp;$('#hud-reputation').textContent=view.player.reputation;
  $('#hp-fill').style.width=`${view.player.hp}%`;$('#hp-fill').classList.toggle('low',view.player.hp<60);
  const ownPill=view.campaign.alternatePill||view.pill.ownerId==='player',alchemy=view.campaign.alchemy;
  $('#owner').textContent=view.world.breakthrough?'筑基已成':ownPill?'已炼成':alchemy.harvested?'待炼制':alchemy.planted?`培育 ${alchemy.growth}/${alchemy.growthRequired}`:'待培药';$('#price').textContent='自行炼制';
  $('#owner-detail').textContent=$('#owner').textContent;$('#price-detail').textContent=$('#price').textContent;
  $('#dispute').textContent='紫猴花 · 玉髓芝 · 天灵果';
  $('#outcome').textContent=view.outcome||'机缘仍在流转。人物的需求、钱财与消息会改变丹药的去向。';
  $('#outcome').classList.toggle('won',ownPill||view.world.breakthrough);
  $('#opportunity-hint').textContent=view.world.breakthrough?'此丹已化为你的修为':ownPill?'已入行囊 · 可前往听雨亭':'留种培育 → 成熟采收 → 炼制 ↗';
  $('#mode').textContent=modelName?`自然语言模型：${modelName}。可在心念传音中问计、追问或下达行动。`:'ChatGPT 暂未连接；可继续使用行动按钮，交谈恢复后再试。';
  const entries=[['境界',view.world.realm],['所在',regionName(view.player.place)],['灵石',`${view.player.stones} 枚`],['气血',`${view.player.hp} / 100`],['声望',`${view.player.reputation} / 100`],['灵草',`${view.player.herbs} 株`],['天雷符',`${view.player.talismans} 张`],['空白印',`${view.player.seal} 枚`]];
  $('#stats').innerHTML=entries.map(([key,value])=>`<div><span>${key}</span><strong>${esc(value)}</strong></div>`).join('');
  $('#clues').innerHTML=`<h3>已知线索</h3>${view.player.clues.map(c=>`<span class="clue">${c==='authentic'?'真丹鉴定':'禁运货道证词'}</span>`).join('')||'<p>尚无证据。可从药师或传音客入手。</p>'}${view.pill.partnerDebt?`<p class="debt">与吴风的承诺：尚欠 ${view.pill.partnerDebt} 灵石</p>`:''}`;
  $('#people').innerHTML=view.people.map(p=>`<button class="person" type="button" data-person="${p.id}"><span class="avatar" style="border-color:${PERSON_DETAILS[p.id].color}">${p.name[0]}</span><span class="person-main"><strong>${p.name}<small>${p.role}</small></strong><span>${esc(affiliationText(p.affiliation))}<br>${esc(p.agent?.activity || p.goal)} · ${esc(relationship(p.trust))}</span></span><span class="person-place">${regionName(p.place)} ↗</span></button>`).join('');
  $('#events').innerHTML=view.events.map(event=>`<article class="event" id="event-${event.id}"><div class="event-meta"><span>第 ${event.turn} 旬 · ${esc(event.actor)}</span><b>#${event.id}</b></div><p>${esc(event.text)}</p>${event.causes.length?`<small>缘起：${event.causes.map(id=>`<a href="#event-${id}">事件 #${id}</a>`).join(' · ')}</small>`:''}</article>`).join('');
  $('#actions').innerHTML=ACTION_DEFS.filter(def=>!RETIRED_PILL_ACTIONS.includes(def.type)&&def.type!=='partner'&&(def.place===view.player.place||(def.type==='frontier_rest'&&['quarry','ruins','yanbao'].includes(view.player.place)))&&!def.garden&&(!def.volume||view.story)).map(def=>{
    const state=view.actionOptions[def.type];
    return `<button class="action ${state.available?'':'locked'}" data-locate-action="${def.type}" type="button" ${state.available?'':'disabled'}><strong>${esc(def.title)} <i>↗</i></strong><span>${esc(def.cost)}</span><small>${esc(state.available?def.detail:state.reason)}</small></button>`;
  }).join('');
  $('#actions').insertAdjacentHTML('afterbegin','<button type="button" class="action" data-garden-open><strong>照看灵圃 ↗</strong><span>小绿瓶 · 自动培养</span><small>查看小绿瓶与灵圃、栽种或收取灵草</small></button>');
  updateQuest();
  campaignUI?.render();
  sectUI?.render();
  if(!view.roamers.some(enemy=>enemy.id===selectedPerson))updateInteractionResult();
  combatUI.render(view);
  agentUI?.personChanged();
  gardenUI?.render();
  societyUI?.render();
  $('#command').disabled=Boolean(view.battle);
  experience?.sync();
  storyScene?.sync();
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
  $('#command-status').textContent=commandPending?'正在问计 · 可继续探索':busy?'正在结算…':currentModelName?'AI 问计 · 行动不限':'ChatGPT 暂未连接';
  $('#command-status').title=currentModelName||'模型连接恢复后可继续问计';
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
  busy=true;experience.busy(true,'正在结算这一步',{showStatus:path!=='/api/combat'&&!defs[payload.type]?.encounter});world.setBusy(true);updateNearbyPrompt();document.body.classList.add('busy');$('#command-form').setAttribute('aria-busy','true');
  commandUI.refresh();
  planUI.refresh();
  for(const id of ['#advance','#restart','#command-submit'])$(id).disabled=true;
  $('#command-status').textContent=path==='/api/intent'?'正在推敲你的计策……':'正在结算……';
  try {
    const response=await gameRequest(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...payload,expectedRevision:current.revision})});
    const data=await response.json();
    if(!response.ok){if(data.view)render(data.view,data.modelName);throw new Error(data.error||'行动未能执行');}
    if(path==='/api/reset'){world.reset();experience.reset();agentUI.reset();commandUI.reset();planUI.reset();lastInteraction=null;}
    if(path==='/api/advance')lastInteraction=null;
    if(path==='/api/combat'&&payload.type==='turn') {
      render(data.view,data.modelName);
      await world.combatReact(before,data.view,payload);
    }else render(data.view,data.modelName);
    if(path==='/api/intent')return data;
    const chapterCompleted=!before.campaign.complete&&data.view.campaign.complete;
    const breakthrough=!before.world.breakthrough&&data.view.world.breakthrough;
    let resultInPanel=false;
    feedback(before,data.view);
    if(path==='/api/combat'&&payload.type==='claim')$('#world-hint').textContent=chapterCompleted?'第一章试炼完成。可继续游历，或回百药园培药炼丹。':'战利品已收入行囊。可以研习功法、装备武器，再继续游历。';
    if(path==='/api/action'&&!data.actionType.startsWith('travel_')) {
      const target=actionTarget({...payload,type:data.actionType},before);
      lastInteraction={target,text:data.result}; resultInPanel=updateInteractionResult();
      if(!defs[data.actionType]?.garden)$('#world-person').scrollTop=0;
    }
    // One result, one visible surface. A closed/hidden detail panel falls back to the toast.
    if(!chapterCompleted&&!breakthrough&&!resultInPanel&&!(path==='/api/combat'&&payload.type==='turn'))notice(data.result);
    world.react(data.actionType,before,data.view);
    if(path==='/api/command')$('#command').value='';
    if(path==='/api/advance')showTurnSummary(before,data.view);
    if(chapterCompleted){
      $('#ending .ending-seal').textContent='成';$('#ending .eyebrow').textContent='第一章 · 试炼完成';$('#ending h2').textContent='燕堡脱身，道途未尽。';
      $('#ending-copy').textContent=data.result;
      $('#ending-stats').innerHTML=`<span>终战 <b>鬼灵门 · 王蝉</b></span><span>历时 <b>${data.view.turn} 旬</b></span><span>凭证 <b>燕堡历练凭证</b></span>`;
      $('#ending').showModal();
    }else if(breakthrough){
      $('#ending .ending-seal').textContent='筑';$('#ending .eyebrow').textContent='道途初开';$('#ending h2').textContent='一念破境，因果未了。';
      $('#ending-copy').textContent=data.result;
      $('#ending-stats').innerHTML=`<span>历时 <b>${data.view.turn} 旬</b></span><span>声望 <b>${data.view.player.reputation}</b></span><span>未偿承诺 <b>${data.view.pill.partnerDebt} 灵石</b></span>`;
      $('#ending').showModal();
    }
    return data;
  }catch(error){
    let resultInPanel=false;
    if(path==='/api/action'&&(selectedPerson||selectedSite)){lastInteraction={target:selectedPerson||selectedSite,text:error.message};resultInPanel=updateInteractionResult();}
    if(!resultInPanel)notice(error.message,true);
    $('#world-hint').textContent=error.message;
    if(path==='/api/combat')combatUI.showError(error.message);
    return false;
  }
  finally{
    busy=false;experience.busy(false);world.setBusy(false);updateNearbyPrompt();document.body.classList.remove('busy');$('#command-form').setAttribute('aria-busy','false');updateCommandStatus();commandUI.refresh();planUI.refresh();gardenUI.render();societyUI.render();campaignUI.render();sectUI.render();
    for(const id of ['#restart','#command-submit'])$(id).disabled=Boolean(current?.battle);
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
document.addEventListener('click',event=>{const target=event.target.closest('[data-view-sect]');if(target){sectUI.select(target.dataset.viewSect);openPanel('sects');}});
document.querySelectorAll('[data-open-panel]').forEach(button=>button.addEventListener('click',()=>openPanel(button.dataset.openPanel)));
$('#panel-close').addEventListener('click',closePanel);
$('#person-close').addEventListener('click',()=>world.clearSelection());
$('#advance').addEventListener('click',()=>{world.cancel();societyUI.step();});
$('#restart').addEventListener('click',async()=>{if(!busy&&await experience.confirm({title:'重回七玄门',text:'当前存档会被新开局覆盖。新的一局将从七玄门入门考核开始，原有行囊与经历不会保留。',action:'确认重新开始',destructive:true})){closePerson();closePanel();await call('/api/reset');}});
$('#command-form').addEventListener('submit',event=>{event.preventDefault();if($('#command').value.trim())submitCommand($('#command').value.trim());});
$('#command').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('#command-form').requestSubmit();}});
$('#summary-close').addEventListener('click',()=>{$('#turn-summary').hidden=true;});
$('#summary-continue').addEventListener('click',()=>{$('#turn-summary').hidden=true;openPanel('events');});
$('#navigation-cancel').addEventListener('click',()=>{cancelPendingCommand();commandGeneration++;world.cancel();});
$('#nearby-interact').addEventListener('click',()=>world.interact());
$('#interaction-next').addEventListener('click',()=>current?.story&&!current.story.complete?executeAction({type:current.story.next.type}):planUI.run());
$('#ending-close').addEventListener('click',()=>$('#ending').close());
$('#help-toggle').addEventListener('click',()=>{$('#help-card').hidden=!$('#help-card').hidden;});
$('#camera-left').addEventListener('click',()=>world.rotate(-Math.PI/6));$('#camera-right').addEventListener('click',()=>world.rotate(Math.PI/6));
$('#camera-in').addEventListener('click',()=>world.zoomBy(-3));$('#camera-out').addEventListener('click',()=>world.zoomBy(3));$('#camera-home').addEventListener('click',()=>world.recenter());
experience=createExperienceUI({
  getState:()=>({view:current,panel:activePanel,personId:selectedPerson,siteId:selectedSite}),
  closePanel,closePerson:()=>world.clearSelection(),openPanel,
  cancelNavigation:()=>{cancelPendingCommand();world.cancel();},
  retryLoad:()=>loadState(),stopMovement:()=>world.stopMovement()
});
storyScene=createStorySceneUI({getState:()=>current,onSurfaceChange:()=>experience.sync(),stopMovement:()=>world.stopMovement(),notice});
loadState=createStateLoader({onStatus:(status,message)=>experience.connection(status,message),onLoad:data=>render(data.view,data.modelName)});
await loadState();

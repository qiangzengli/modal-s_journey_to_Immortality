import { gameRequest } from './api-client.js';
const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const sourceText = reply => reply.source === 'model' ? `AI · ${reply.modelName || '模型解读'}` : ({ offline: '未连接模型 · 已知线索', busy: '人物正在推敲 · 可稍后再问', timeout: '模型推敲超时 · 已知线索', invalid: '解读未通过核对 · 已知线索', unavailable: '模型暂未回应 · 已知线索' }[reply.reason] || '已知线索');

export function createAgentUI({ getState, executeAction, onStale, notice }) {
  let chatRequest = 0, chatController, chatPending = false;
  let pendingQuestion = null;
  let shownPerson = null, lastRevision = null, inputVersion=0, restoreScroll=false;
  const threads = new Map();
  const getThread = id => { if (!threads.has(id)) threads.set(id, { messages: [], reply: null, revision: null, draft:'', scroll:null }); return threads.get(id); };
  function discardPendingQuestion() {
    if (pendingQuestion) pendingQuestion.thread.messages = pendingQuestion.thread.messages.filter(message => message !== pendingQuestion.message);
    pendingQuestion = null;
  }
  async function request(input, signal) {
    const response = await gameRequest('/api/npc/dialogue', { method: 'POST', signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 409 && data.view) onStale(data);
      throw new Error(data.error || '暂时无法推敲，请稍后再问。');
    }
    return data;
  }
  function drawChat() {
    const { view, personId } = getState();
    const person = view && [...view.people,...view.roamers.filter(person=>!person.defeated&&person.kind!=='beast')].find(person => person.id === personId);
    $('#agent-dialogue').hidden = !person || Boolean(view.battle);
    if (!person) return;
    const thread = getThread(personId);
    if (!chatPending && person.agent?.conversation?.length && !thread.messages.length) thread.messages = person.agent.conversation.map(message=>({...message}));
    const log=$('#agent-chat-log'),pinned=log.scrollHeight-log.clientHeight-log.scrollTop<36,previousScroll=log.scrollTop;
    $('#agent-chat-log').innerHTML = thread.messages.map(message => `<p class="agent-message ${message.role}"><small>${message.role === 'user' ? '你' : esc(person.name)}</small>${esc(message.text)}</p>`).join('') || '<p class="agent-empty">问一问缘由、试探动机，或商量下一步。交谈不会直接完成任务。</p>';
    $('#agent-chat-source').textContent = chatPending ? `${person.name}正在斟酌…` : thread.reply ? sourceText(thread.reply) : '人物交谈';
    $('#agent-chat-source').title = thread.reply?.modelName || '';
    const fresh = thread.revision === view.revision;
    $('#agent-chat-followups').innerHTML = fresh && thread.reply ? thread.reply.followUps.map((text, index) => `<button type="button" data-chat-question="${index}" ${chatPending ? 'disabled' : ''}>${esc(text)}</button>`).join('') : '';
    $('#agent-chat-actions').innerHTML = fresh && thread.reply ? thread.reply.suggestions.map((suggestion, index) => `<button type="button" data-agent-action="${index}"><b>${esc(suggestion.label)}</b><small>${esc(suggestion.cost)} · 点击执行</small>${suggestion.budgetNote ? `<small>${esc(suggestion.budgetNote)}</small>` : ''}</button>`).join('') : '';
    $('#agent-chat-send').disabled = chatPending;
    $('#agent-chat-input').placeholder = `对${person.name}说些什么…`;
    log.scrollTop=restoreScroll?(thread.scroll??log.scrollHeight):pinned?log.scrollHeight:previousScroll;
    restoreScroll=false;
  }
  function personChanged() {
    const { view, personId } = getState();
    if (!view) return;
    if (shownPerson !== personId || lastRevision !== view.revision) {
      chatRequest++; chatController?.abort(); chatPending = false;
      discardPendingQuestion();
      $('#agent-chat-error').textContent = '';
      if(shownPerson!==personId){
        if(shownPerson){const previous=getThread(shownPerson);previous.draft=$('#agent-chat-input').value;previous.scroll=$('#agent-chat-log').scrollTop;}
        $('#agent-chat-input').value=personId?getThread(personId).draft:'';inputVersion++;restoreScroll=true;
      }
      shownPerson = personId; lastRevision = view.revision;
    }
    drawChat();
  }
  async function talk(text) {
    const { view, personId, plan, busy } = getState();
    if (chatPending || busy || view?.battle || ![...(view?.people||[]),...(view?.roamers||[]).filter(person=>!person.defeated&&person.kind!=='beast')].some(person => person.id === personId) || !text.trim()) return;
    const submittedVersion=inputVersion;
    const thread = getThread(personId), ticket = ++chatRequest, history = thread.messages.slice(-6);
    chatController?.abort(); chatController = new AbortController(); chatPending = true;
    const message = { role: 'user', text: text.trim() };
    pendingQuestion = { thread, message };
    thread.messages.push(message); thread.messages = thread.messages.slice(-10);
    thread.reply = null;
    $('#agent-chat-error').textContent = ''; drawChat();
    const log = $('#agent-chat-log'); log.scrollTop = log.scrollHeight;
    try {
      const reply = await request({ mode: 'dialogue', personId, plan, text, history, expectedRevision: view.revision }, chatController.signal);
      const latest = getState();
      if (ticket !== chatRequest || latest.personId !== personId || latest.view.revision !== view.revision || latest.busy) return;
      thread.messages.push({ role: 'assistant', text: reply.text }); thread.messages = thread.messages.slice(-10);
      thread.reply = reply; thread.revision = reply.revision;
      pendingQuestion = null;
      if(inputVersion===submittedVersion&&$('#agent-chat-input').value.trim()===text.trim()){$('#agent-chat-input').value='';thread.draft='';}
      if (reply.view) { lastRevision = reply.revision; chatPending = false; onStale({view:reply.view,modelName:reply.modelName}); }
    } catch (error) {
      if (ticket === chatRequest) { discardPendingQuestion(); if (error.name !== 'AbortError') $('#agent-chat-error').textContent = error.message; }
    } finally {
      if (ticket === chatRequest) { discardPendingQuestion(); chatPending = false; drawChat(); }
    }
  }
  $('#agent-chat-input').addEventListener('input',()=>{inputVersion++;const id=getState().personId;if(id)getThread(id).draft=$('#agent-chat-input').value;});
  $('#agent-chat-form').addEventListener('submit', event => { event.preventDefault(); talk($('#agent-chat-input').value.trim()); });
  $('#agent-chat-input').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('#agent-chat-form').requestSubmit(); } });
  $('#agent-chat-followups').addEventListener('click', event => { const button = event.target.closest('[data-chat-question]'); const thread = threads.get(getState().personId); if (button && thread?.reply) talk(thread.reply.followUps[Number(button.dataset.chatQuestion)]); });
  $('#agent-chat-actions').addEventListener('click', event => {
    const button = event.target.closest('[data-agent-action]'); if (!button) return;
    const { view, personId, busy } = getState(), thread = threads.get(personId);
    if (busy) return;
    if (!thread || thread.revision !== view.revision) { notice('局势已变化，请重新询问。'); return; }
    const choice = thread.reply?.suggestions[Number(button.dataset.agentAction)];
    if (choice?.action) executeAction(choice.action);
  });
  return {
    personChanged, talk,
    isPending:()=>chatPending,
    reset() { discardPendingQuestion(); threads.clear();shownPerson=null;lastRevision=null;$('#agent-chat-input').value='';inputVersion++; chatRequest++; chatController?.abort(); chatPending = false; }
  };
}

const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const sourceText = reply => reply.source === 'model' ? `AI · ${reply.modelName || '模型解读'}` : ({ offline: '未连接模型 · 已知线索', busy: '人物正在推敲 · 可稍后再问', timeout: '模型推敲超时 · 已知线索', invalid: '解读未通过核对 · 已知线索', unavailable: '模型暂未回应 · 已知线索' }[reply.reason] || '已知线索');

export function createAgentUI({ getState, navigate, executeAction, onStale, notice }) {
  let guideKey = '', guideReply = null, guideTimer, guideRequest = 0, guideController;
  let chatRequest = 0, chatController, chatPending = false;
  let pendingQuestion = null;
  let shownPerson = null, lastRevision = null;
  const threads = new Map();
  const getThread = id => { if (!threads.has(id)) threads.set(id, { messages: [], reply: null, revision: null }); return threads.get(id); };
  function discardPendingQuestion() {
    if (pendingQuestion) pendingQuestion.thread.messages = pendingQuestion.thread.messages.filter(message => message !== pendingQuestion.message);
    pendingQuestion = null;
  }
  async function request(input, signal) {
    const response = await fetch('/api/agent', { method: 'POST', signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 409 && data.view) onStale(data);
      throw new Error(data.error || '暂时无法推敲，请稍后再问。');
    }
    return data;
  }
  function drawGuide(reply) {
    $('#quest-title').textContent = reply.title;
    $('#quest-detail').textContent = reply.text;
    $('#agent-guide-source').textContent = sourceText(reply);
    $('#agent-guide-source').title = reply.modelName || '';
    $('#guide-followups').innerHTML = reply.followUps.map((text, index) => `<button type="button" data-guide-question="${index}">${esc(text)}</button>`).join('');
    $('#quest-track').textContent = reply.suggestions[0]?.label || '查看因果账本';
  }
  async function askGuide(text = '') {
    clearTimeout(guideTimer);
    const { view, route } = getState();
    if (!view || view.battle) return;
    const ticket = ++guideRequest, key = `${route}:${view.revision}`;
    guideController?.abort(); guideController = new AbortController();
    $('#agent-guide-source').textContent = '正在推敲线索…';
    $('#guide-send').disabled = true;
    try {
      const reply = await request({ mode: 'guide', route, text, expectedRevision: view.revision }, guideController.signal);
      const latest = getState();
      if (ticket !== guideRequest || key !== `${latest.route}:${latest.view.revision}` || latest.view.battle) return;
      guideReply = reply; drawGuide(reply);
    } catch (error) {
      if (ticket === guideRequest && error.name !== 'AbortError') $('#agent-guide-source').textContent = error.message;
    } finally { if (ticket === guideRequest) $('#guide-send').disabled = false; }
  }
  function guideChanged() {
    const { view, route } = getState();
    if (!view) return;
    if (view.battle) { guideController?.abort(); clearTimeout(guideTimer); guideRequest++; guideKey = ''; guideReply = null; return; }
    const key = `${route}:${view.revision}`;
    if (key === guideKey) { if (guideReply) drawGuide(guideReply); return; }
    guideKey = key; guideReply = null; guideRequest++; guideController?.abort();
    $('#guide-followups').replaceChildren();
    $('#agent-guide-source').textContent = '正在推敲线索…';
    clearTimeout(guideTimer); guideTimer = setTimeout(() => askGuide(), 600);
  }
  function drawChat() {
    const { view, personId } = getState();
    const person = view?.people.find(person => person.id === personId);
    $('#agent-dialogue').hidden = !person || Boolean(view.battle);
    if (!person) return;
    const thread = getThread(personId);
    $('#agent-chat-log').innerHTML = thread.messages.map(message => `<p class="agent-message ${message.role}"><small>${message.role === 'user' ? '你' : esc(person.name)}</small>${esc(message.text)}</p>`).join('') || '<p class="agent-empty">问一问缘由、试探动机，或商量下一步。交谈不会直接完成任务。</p>';
    $('#agent-chat-source').textContent = chatPending ? `${person.name}正在斟酌…` : thread.reply ? sourceText(thread.reply) : '人物交谈';
    $('#agent-chat-source').title = thread.reply?.modelName || '';
    const fresh = thread.revision === view.revision;
    $('#agent-chat-followups').innerHTML = fresh && thread.reply ? thread.reply.followUps.map((text, index) => `<button type="button" data-chat-question="${index}" ${chatPending ? 'disabled' : ''}>${esc(text)}</button>`).join('') : '';
    $('#agent-chat-actions').innerHTML = fresh && thread.reply ? thread.reply.suggestions.map((suggestion, index) => `<button type="button" data-agent-action="${index}"><b>${esc(suggestion.label)}</b><small>${esc(suggestion.cost)} · 点击执行</small>${suggestion.budgetNote ? `<small>${esc(suggestion.budgetNote)}</small>` : ''}</button>`).join('') : '';
    $('#agent-chat-send').disabled = chatPending;
    $('#agent-chat-input').placeholder = `对${person.name}说些什么…`;
  }
  function personChanged() {
    const { view, personId } = getState();
    if (!view) return;
    if (shownPerson !== personId || lastRevision !== view.revision) {
      chatRequest++; chatController?.abort(); chatPending = false;
      discardPendingQuestion();
      $('#agent-chat-error').textContent = '';
      if (shownPerson !== personId) $('#agent-chat-input').value = '';
      shownPerson = personId; lastRevision = view.revision;
    }
    drawChat();
  }
  async function talk(text) {
    const { view, personId, route, busy } = getState();
    if (chatPending || busy || view?.battle || !view?.people.some(person => person.id === personId) || !text.trim()) return;
    const thread = getThread(personId), ticket = ++chatRequest, history = thread.messages.slice(-6);
    chatController?.abort(); chatController = new AbortController(); chatPending = true;
    const message = { role: 'user', text: text.trim() };
    pendingQuestion = { thread, message };
    thread.messages.push(message); thread.messages = thread.messages.slice(-10);
    thread.reply = null;
    $('#agent-chat-error').textContent = ''; drawChat();
    const log = $('#agent-chat-log'); log.scrollTop = log.scrollHeight;
    try {
      const reply = await request({ mode: 'dialogue', personId, route, text, history, expectedRevision: view.revision }, chatController.signal);
      const latest = getState();
      if (ticket !== chatRequest || latest.personId !== personId || latest.view.revision !== view.revision || latest.busy) return;
      thread.messages.push({ role: 'assistant', text: reply.text }); thread.messages = thread.messages.slice(-10);
      thread.reply = reply; thread.revision = reply.revision;
      pendingQuestion = null;
      $('#agent-chat-input').value = '';
    } catch (error) {
      if (ticket === chatRequest) { discardPendingQuestion(); if (error.name !== 'AbortError') $('#agent-chat-error').textContent = error.message; }
    } finally {
      if (ticket === chatRequest) { discardPendingQuestion(); chatPending = false; drawChat(); log.scrollTop = log.scrollHeight; }
    }
  }
  $('#guide-rethink').addEventListener('click', () => askGuide());
  $('#guide-form').addEventListener('submit', event => { event.preventDefault(); const text = $('#guide-question').value.trim(); if (text) askGuide(text); });
  $('#guide-followups').addEventListener('click', event => { const button = event.target.closest('[data-guide-question]'); if (button && guideReply) askGuide(guideReply.followUps[Number(button.dataset.guideQuestion)]); });
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
    guideChanged, personChanged, talk,
    track() {
      const { view } = getState();
      if (!guideReply || guideReply.revision !== view.revision) return false;
      navigate(guideReply.suggestions[0]?.target || 'events'); return true;
    },
    reset() { discardPendingQuestion(); threads.clear(); guideKey = ''; guideReply = null; guideRequest++; chatRequest++; guideController?.abort(); chatController?.abort(); chatPending = false; }
  };
}

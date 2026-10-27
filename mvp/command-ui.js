import { sourceText } from './agent-ui.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function createCommandUI({ getState, submit, navigate, notice }) {
  let messages = [], reply = null, replyRoute = null;
  function refresh() {
    const { view, route, busy } = getState();
    const fresh = reply && reply.revision === view?.revision && route === replyRoute;
    $('#command-conversation').hidden = !messages.length;
    $('#command-clear').disabled = busy;
    $('#command-followups').innerHTML = fresh ? reply.followUps.map((text, index) => `<button type="button" data-command-question="${index}" ${busy ? 'disabled' : ''}>${esc(text)}</button>`).join('') : '';
    $('#command-suggestions').innerHTML = fresh ? reply.suggestions.map((suggestion, index) => `<button type="button" data-command-target="${index}" ${busy ? 'disabled' : ''}>${esc(suggestion.label)} ↗</button>`).join('') : '';
  }
  function reset() {
    messages = []; reply = null; replyRoute = null;
    $('#command-log').replaceChildren(); refresh();
  }
  $('#command-clear').addEventListener('click', reset);
  $('#command-followups').addEventListener('click', event => {
    const button = event.target.closest('[data-command-question]');
    if (button && !getState().busy && reply?.revision === getState().view.revision && replyRoute === getState().route) submit(reply.followUps[Number(button.dataset.commandQuestion)]);
  });
  $('#command-suggestions').addEventListener('click', event => {
    const button = event.target.closest('[data-command-target]');
    if (!button || getState().busy) return;
    if (reply?.revision !== getState().view.revision || replyRoute !== getState().route) { notice('局势已变化，请重新问计。'); return; }
    const target = reply.suggestions[Number(button.dataset.commandTarget)]?.target;
    if (target) navigate(target);
  });
  return {
    refresh, reset,
    history: () => messages.slice(-6).map(({ role, text }) => ({ role, text })),
    show(text, answer) {
      reply = answer; replyRoute = getState().route;
      messages.push({ role: 'user', text }, { role: 'assistant', text: answer.text, source: sourceText(answer) });
      messages = messages.slice(-10);
      $('#command-log').innerHTML = messages.map(message => `<p class="agent-message ${message.role}"><small>${message.role === 'user' ? '你' : esc(message.source)}</small>${esc(message.text)}</p>`).join('');
      $('#command-source').textContent = sourceText(answer);
      $('#command-source').title = answer.modelName || '';
      refresh();
      const log = $('#command-log'); log.scrollTop = log.scrollHeight;
    }
  };
}

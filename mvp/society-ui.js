const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function createSocietyUI({ getState, sync, request, navigate, notice }) {
  let clock = null, polling = false, stepping = false;
  function render() {
    const { view, personId, busy } = getState();
    if (!view) return;
    const paused = view.society.paused;
    const status = paused ? '世界已暂停' : ({ offline: '模型未连接 · 众生等待', engaged: '交互中 · 演化稍候', thinking: '众生正在思考…', unavailable: '人物暂未回应', changed: '局势变化 · 稍后重想' })[clock?.status] || `世界自主演化 · ${Math.ceil((clock?.remainingMs ?? 90000) / 1000)} 秒`;
    $('#world-clock-status').textContent = status;
    $('#world-clock-status').title = clock?.error || '前台探索每约 90 秒推演一次；交谈、斗法、隐藏页面时暂停。';
    $('#world-pause').textContent = paused ? '继续演化' : '暂停演化';
    $('#world-pause').disabled = busy;
    $('#world-rest').hidden = clock?.status !== 'offline' && !clock?.error;
    $('#world-rest').disabled = busy || stepping || Boolean(view.battle) || Boolean(clock?.generating);
    $('#advance').textContent = stepping || clock?.generating ? '众生思考中…' : '听候风声 →';
    $('#advance').disabled = busy || stepping || Boolean(view.battle) || Boolean(clock?.generating);
    $('#npc-commissions').hidden = !personId || Boolean(view.battle);
    const offers = view.society.offers;
    const markup = (offer, local) => `<article class="npc-offer"><small>${esc(offer.npcName)}的委托 · 第 ${offer.expires} 旬前</small><strong>${esc(offer.title)}</strong><p>${esc(offer.description)}</p><div>灵草 ${offer.quantity} 株 → ${offer.reward} 灵石 <em>报酬已托管</em></div>${local ? `<div class="npc-offer-buttons">${offer.status === 'open' ? `<button data-contract="accept" data-offer="${offer.id}">接下委托</button>` : `<button data-contract="deliver" data-offer="${offer.id}" ${view.player.herbs < offer.quantity ? 'disabled' : ''}>交付灵草 · 领取报酬</button>`}<button data-contract="decline" data-offer="${offer.id}">婉拒</button></div>` : `<button data-commission-person="${esc(offer.npcId)}">${offer.status === 'accepted' ? '前往交付' : '当面商议'} ↗</button>`}</article>`;
    $('#npc-commissions').innerHTML = offers.filter(offer => offer.npcId === personId).map(offer => markup(offer, true)).join('');
    $('#society-offers').innerHTML = offers.map(offer => markup(offer, false)).join('') || '<p class="panel-tip">尚无人物向你提出委托。你可以主动交谈，表明打算或提供帮助。</p>';
    $('#society-offers').querySelectorAll('button').forEach(button => { button.disabled ||= busy; });
    $('#npc-commissions').querySelectorAll('button').forEach(button => { button.disabled ||= busy; });
  }
  function receive(data) {
    clock = data.clock || clock;
    const { view, busy, chatPending } = getState();
    // 交谈的写入响应会自行同步，避免心跳抢先拿到同一版本而取消刚完成的回复。
    if (!busy && !chatPending && data.view?.revision > (view?.revision ?? -1)) sync(data);
    render();
  }
  async function pulse() {
    if (polling || document.hidden || !getState().view) return;
    polling = true;
    const state = getState();
    const engaged = Boolean(state.busy || state.personId || state.siteId || state.navigating || state.chatPending || state.view.battle || document.activeElement?.matches('input,textarea'));
    try {
      const response = await fetch('/api/world/pulse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ engaged }) });
      if (response.ok) receive(await response.json());
    } catch { $('#world-clock-status').textContent = '连接中断 · 演化暂停'; }
    finally { polling = false; }
  }
  async function step() {
    const { view, busy } = getState();
    if (busy || stepping || view.battle) return;
    stepping = true; render();
    try {
      const response = await fetch('/api/world/step', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expectedRevision: view.revision }) });
      const data = await response.json(); receive(data);
      if (!response.ok) throw new Error(data.error);
      if (!data.advanced) notice(data.clock.status === 'offline' ? '请先配置模型，人物自主决策需要模型连接。' : data.clock.error || '局势或交互已变化，本次推演未落地。');
      else notice('新的众生动向已写入邸报。地图上可查看人物的行动与委托。');
    } catch (error) { notice(error.message, true); }
    finally { stepping = false; render(); }
  }
  $('#world-pause').addEventListener('click', async () => { await request('/api/world/control', { paused: !getState().view.society.paused }); render(); });
  $('#world-rest').addEventListener('click', async () => {
    const result = await request('/api/advance');
    if (result) notice('静修一旬，灵圃与既有约定已结算；人物仍等待模型决策。');
  });
  $('#npc-commissions').addEventListener('click', async event => {
    const button = event.target.closest('[data-contract]');
    if (button && !getState().busy) { await request('/api/contracts', { type: button.dataset.contract, offerId: button.dataset.offer }); render(); }
  });
  $('#society-offers').addEventListener('click', event => { const button = event.target.closest('[data-commission-person]'); if (button) navigate(button.dataset.commissionPerson); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { void pulse(); return; }
    void fetch('/api/world/pulse', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ engaged: true }) }).catch(() => {});
  });
  setInterval(pulse, 4000);
  return { render, step };
}

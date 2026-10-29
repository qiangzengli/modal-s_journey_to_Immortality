import { sourceText } from './agent-ui.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function createPlanUI({ getState, executeAction, advance, onStale, onChange, notice }) {
  let reply = null, selectedId = null, selectedTitle = '', revision = null;
  let generation = 0, controller, timer, pending = false, executing = false, preference = '';
  try { preference = localStorage.getItem('niminglu-plan-preference') || ''; } catch {}
  $('#guide-question').value = preference;
  const selected = () => reply?.plans.find(plan => plan.id === selectedId);
  const fresh = () => reply?.revision === getState().view?.revision && !pending;
  function draw() {
    const { view, busy } = getState();
    const plan = fresh() ? selected() : null;
    $('#plan-options').innerHTML = fresh() ? reply.plans.map(item => `<button type="button" data-plan="${esc(item.id)}" aria-pressed="${item.id === selectedId}"><strong>${esc(item.title)}</strong><small>${item.steps.length} 步 · ${item.forecast.turns ? `${item.forecast.turns} 旬` : '无需等待'}</small></button>`).join('') : '';
    $('#quest-progress').textContent = plan ? (plan.checkpoint?`${plan.steps.length} 步至斗法 · 获胜后继续`:`${plan.steps.length} 步可取丹`) : view?.pill.ownerId === 'player' || view?.world.breakthrough ? '已达成' : '动态规划';
    $('#quest-objective').textContent = '目标 · 取得筑基丹';
    $('#quest-title').textContent = pending ? '正在设计取丹方案' : plan?.title || '取丹方案';
    $('#quest-detail').textContent = pending ? '正在结合人物、资源与局势，比较不同的获取方式……' : plan?.rationale || reply?.text || '可提出你的偏好，让模型规划获取方式。';
    $('#plan-risk').textContent = plan ? `取舍 · ${plan.risk}` : '';
    $('#plan-forecast').textContent = plan ? `${plan.checkpoint?'战前预计资源':'预计取丹后'}：${plan.forecast.stones} 灵石 · 气血 ${plan.forecast.hp} · 声望 ${plan.forecast.reputation}${plan.forecast.debt ? ` · 欠款 ${plan.forecast.debt}` : ''}${plan.checkpoint?' · 需赢下斗法并收取主药，战后重新规划':''}` : '';
    $('#quest-track').disabled = !plan || busy || executing || Boolean(view?.battle);
    $('#quest-track').textContent = executing ? '正在执行这一步…' : plan ? `执行：${plan.steps[0].title} →` : '等待可行方案';
    $('#guide-send').disabled = pending || executing;
    $('#guide-rethink').disabled = pending || executing;
    $('#agent-guide-source').textContent = pending ? 'DeepSeek 正在规划…' : reply ? sourceText(reply) : '等待规划';
    $('#agent-guide-source').title = reply?.modelName || '';
    $('#guide-followups').innerHTML = fresh() ? reply.followUps.map((text, index) => `<button type="button" data-plan-question="${index}">${esc(text)}</button>`).join('') : '';
    $('#quest-steps').innerHTML = plan ? plan.steps.map((step, index) => `<button type="button" data-plan-step="${index}" class="quest-step" ${index || busy || executing ? 'disabled' : ''}><b>${index + 1}</b><span><strong>${esc(step.title)}</strong><small>${esc(step.travel || '')} ${esc(step.detail)}</small><small>${index ? '先完成前序步骤' : '点击执行当前一步'} · 预计结果，尚未发生</small></span></button>`).join('') : `<p class="panel-tip">${esc(pending ? '正在重新计算当前可行的方案。' : reply?.text || '在修行手札中生成取丹方案。')}</p>`;
    onChange?.();
  }
  async function ask(refresh = false) {
    clearTimeout(timer);
    const { view } = getState();
    if (!view || (view.story&&!view.story.complete) || view.battle || executing) return;
    const ticket = ++generation, expectedRevision = view.revision;
    controller?.abort(); controller = new AbortController(); pending = true; draw();
    try {
      const response = await fetch('/api/plans', { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: preference, preferredPlan: selectedTitle, refresh, expectedRevision }) });
      const result = await response.json();
      if (ticket !== generation) return;
      if (!response.ok) { if (result.view) onStale(result); throw new Error(result.error || '取丹规划暂未完成。'); }
      if (getState().view.revision !== expectedRevision || getState().view.battle) return;
      reply = result;
      const chosen = result.plans.find(plan => plan.id === selectedId) || result.plans.find(plan => plan.title === selectedTitle) || result.plans[0];
      selectedId = chosen?.id || null; selectedTitle = chosen?.title || '';
    } catch (error) {
      if (ticket === generation && error.name !== 'AbortError') reply = { plans: [], followUps: [], revision: expectedRevision, source: 'rules', reason: 'unavailable', text: error.message };
    } finally { if (ticket === generation) { pending = false; draw(); } }
  }
  function changed() {
    const { view } = getState();
    if (!view) return;
    if (view.battle || (view.story&&!view.story.complete)) { controller?.abort(); clearTimeout(timer); generation++; pending = false; revision = null; reply = null; draw(); return; }
    if (view.revision === revision) { draw(); return; }
    revision = view.revision; controller?.abort(); clearTimeout(timer); generation++; pending = false;
    draw();
    if (!executing) timer = setTimeout(() => ask(), 600);
  }
  async function run() {
    const { view, busy } = getState(), plan = selected();
    if (!fresh() || !plan || busy || executing || view.battle) { notice('局势已变化，请等待方案重新规划。'); return; }
    const action = plan.steps[0].action;
    executing = true; draw();
    try { await (action.type === 'advance' ? advance() : executeAction(action)); }
    finally { executing = false; draw(); if (reply?.revision !== getState().view.revision) ask(); }
  }
  $('#plan-options').addEventListener('click', event => {
    const button = event.target.closest('[data-plan]');
    if (!button || !fresh() || executing || getState().busy) return;
    selectedId = button.dataset.plan; selectedTitle = selected()?.title || ''; draw();
  });
  $('#quest-track').addEventListener('click', run);
  $('#quest-steps').addEventListener('click', event => { if (event.target.closest('[data-plan-step="0"]')) run(); });
  $('#guide-rethink').addEventListener('click', () => ask(true));
  function setPreference(text) {
    preference = text.trim(); selectedTitle = ''; selectedId = null;
    $('#guide-question').value = preference;
    try { localStorage.setItem('niminglu-plan-preference', preference); } catch {}
    ask(true);
  }
  $('#guide-form').addEventListener('submit', event => { event.preventDefault(); setPreference($('#guide-question').value); });
  $('#guide-followups').addEventListener('click', event => { const button = event.target.closest('[data-plan-question]'); if (button && fresh()) setPreference(reply.followUps[Number(button.dataset.planQuestion)]); });
  return {
    changed, run, refresh: draw,
    next: () => fresh() ? selected()?.steps[0] : null,
    context: () => fresh() && selected() ? `${selected().title}：${selected().rationale}`.slice(0, 280) : '',
    reset() { controller?.abort(); clearTimeout(timer); generation++; pending = false; reply = null; revision = null; selectedId = null; selectedTitle = ''; }
  };
}

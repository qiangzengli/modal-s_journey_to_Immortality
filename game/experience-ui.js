const $ = selector => document.querySelector(selector);
const editable = target => Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]'));

export function shortcutIntent(event, { dialog = false, battle = false } = {}) {
  if (event.isComposing || event.repeat || dialog) return null;
  if (event.key === 'Escape') return 'escape';
  if (battle || event.altKey || editable(event.target)) return null;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') return 'command';
  if (event.ctrlKey || event.metaKey) return null;
  return ({ i: 'self', j: 'campaign', n: 'people', l: 'events', '/': 'command', '?': 'help' })[event.key.toLowerCase()] || null;
}

export function createExperienceUI({ getState, closePanel, closePerson, openPanel, cancelNavigation, retryLoad, stopMovement }) {
  const cleanup=[];
  const listen=(target,event,handler,options)=>{target.addEventListener(event,handler,options);cleanup.push(()=>target.removeEventListener(event,handler,options));};
  const host = $('.world-panel');
  host.insertAdjacentHTML('beforeend', `
    <button id="surface-backdrop" class="surface-backdrop" type="button" tabindex="-1" aria-label="返回地图" hidden></button>
    <section id="connection-screen" class="connection-screen" aria-live="polite"><div class="connection-seal" aria-hidden="true">逆</div><small>逆命录 · 道途未尽</small><h1 id="connection-title">正在回到修真界</h1><p id="connection-copy">读取你的行囊、机缘与众生往事…</p><button id="connection-retry" type="button" hidden>重新连接</button></section>
    <div id="operation-status" class="operation-status" role="status" hidden><span class="operation-spinner" aria-hidden="true"></span><span id="operation-copy"></span></div>
    <div id="notice-stack" class="notice-stack" aria-label="操作消息"></div>
    <dialog id="decision-dialog" class="decision-dialog" aria-labelledby="decision-title" aria-describedby="decision-copy"><form method="dialog"><span class="eyebrow">落子之前</span><h2 id="decision-title"></h2><p id="decision-copy"></p><div><button value="cancel" class="decision-cancel" autofocus>再想一想</button><button id="decision-confirm" value="confirm" class="primary">确定</button></div></form></dialog>
    <p id="first-steps" class="first-steps" hidden><span>点击人物走近交谈；打开「天下」查看旅途目标。</span><button type="button">知道了</button></p>`);
  $('#person-meta').insertAdjacentHTML('afterend', '<nav id="person-tabs" class="person-tabs" aria-label="人物交互"><button type="button" data-person-pane="talk" aria-pressed="true">交谈</button><button type="button" data-person-pane="actions" aria-pressed="false">事务与委托</button><button type="button" data-person-pane="about" aria-pressed="false">见闻</button></nav>');
  $('.journey-heading').insertAdjacentHTML('beforeend', '<button id="plan-expand" type="button" aria-expanded="false" aria-label="展开取丹方案细节">比较方案 ▾</button>');
  $('.command-caption').insertAdjacentHTML('beforeend', '<button id="command-expand" type="button" aria-expanded="false" aria-label="展开心念传音记录">展开问答 ↑</button>');
  $('#command-form').insertAdjacentHTML('afterend', '<div class="composer-help"><span>Enter 发送 · Shift Enter 换行</span><span id="command-length">0 / 280</span></div>');
  $('#agent-chat-form').insertAdjacentHTML('afterend', '<div class="composer-help"><span>Enter 发送 · Shift Enter 换行</span><span>交谈后可选择行动</span></div>');
  $('#help-card').insertAdjacentHTML('beforeend', '<div class="shortcut-guide"><span><kbd>I</kbd> 行囊</span><span><kbd>J</kbd> 天下</span><span><kbd>N</kbd> 人物</span><span><kbd>L</kbd> 邸报</span><span><kbd>/</kbd> 心念传音</span><span><kbd>Esc</kbd> 返回</span></div>');
  $('#panel-title').tabIndex = -1;
  $('#world-name').tabIndex = -1;
  $('#map-panel').setAttribute('aria-labelledby', 'panel-title');
  $('#world-person').setAttribute('aria-labelledby', 'world-name');
  const panes = new Map(), positions = new Map();
  let activeKey = null, activeRoot = null, returnFocus = null, ready = false, running = false;
  let busyTimer, slowTimer, resolveDecision = null, captured=false;
  const inertWhileLoading = [...document.querySelectorAll('.topbar,.map-nav,.command-dock,.journey-card,.mini-map-panel,.society-clock,#campaign-track,.opportunity-chip,#help-toggle')];
  const notifications = new Map();

  function setPane(pane) {
    const state = getState(), key = state.personId || state.siteId;
    if (!key) return;
    const person = [...(state.view?.people || []), ...(state.view?.roamers || [])].find(person => person.id === state.personId);
    if (pane === 'talk' && (!person || person.defeated)) pane = 'actions';
    panes.set(key, pane);
    $('#world-person').dataset.pane = pane;
    document.querySelectorAll('[data-person-pane]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.personPane === pane));
      button.hidden = button.dataset.personPane === 'talk' && (!person || person.defeated);
    });
  }
  function capture() {if(activeKey&&activeRoot){positions.set(activeKey,(activeRoot.querySelector('.panel-scroll')||activeRoot).scrollTop);captured=true;}}
  function sync() {
    const state = getState(), panel = $('#map-panel'), person = $('#world-person');
    const overlay = !panel.hidden ? 'journal' : !person.hidden ? 'person' : 'none';
    const key = overlay === 'journal' ? `panel:${state.panel}` : overlay === 'person' ? `person:${state.personId || state.siteId}` : null;
    document.body.dataset.surface = overlay;
    document.body.dataset.uiBlocked = String(!ready || overlay !== 'none' || Boolean(document.querySelector('dialog[open]')) || !$('#help-card').hidden);
    $('#surface-backdrop').hidden = overlay !== 'journal';
    const root = overlay === 'journal' ? panel : overlay === 'person' ? person : null;
    panel.inert=overlay==='person';person.inert=overlay==='journal';
    for(const node of inertWhileLoading)node.inert=!ready||(overlay!=='none'&&node.matches('.journey-card,.command-dock,.mini-map-panel,.opportunity-chip,.society-clock,#campaign-track'));
    if (key !== activeKey) {
      if (!captured && activeKey && activeRoot) positions.set(activeKey, (activeRoot.querySelector('.panel-scroll') || activeRoot).scrollTop);
      if (!activeKey && key) returnFocus = document.activeElement;
      if (key) {
        stopMovement?.();
        (root.querySelector('.panel-scroll') || root).scrollTop = positions.get(key) || 0;
        if (!editable(document.activeElement)||!root.contains(document.activeElement)) (overlay === 'journal' ? $('#panel-title') : $('#world-name')).focus({ preventScroll: true });
      } else if (returnFocus?.isConnected && !returnFocus.disabled && !returnFocus.closest('[hidden],[inert]')) {
        returnFocus.focus({ preventScroll: true }); returnFocus = null;
      }
      activeKey = key; activeRoot = root;
      captured=false;
    }
    if (overlay === 'person') setPane(panes.get(state.personId || state.siteId) || 'talk');
    for (const node of document.querySelectorAll('#world-actions,#trade-form,#npc-commissions,#garden-card,#actions')) node.inert = running;
    const count = $('#command').value.length;
    $('#command-length').textContent = `${count} / 280`;
  }
  function toast(text, bad = false) {
    if (!text) return;
    const key = `${bad}:${text}`;
    if (notifications.has(key)) return;
    const node = document.createElement('div'); node.className = `notice ${bad ? 'notice-error' : 'notice-success'}`;
    node.setAttribute('role', bad ? 'alert' : 'status');
    const symbol = document.createElement('span'); symbol.className = 'notice-symbol'; symbol.textContent = bad ? '!' : '✓'; symbol.setAttribute('aria-hidden','true');
    const copy = document.createElement('p'); copy.textContent = text;
    const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.textContent = '×'; dismiss.setAttribute('aria-label','关闭这条消息');
    node.append(symbol, copy, dismiss); $('#notice-stack').append(node);
    let timer;
    const close = () => { clearTimeout(timer); node.remove(); notifications.delete(key); };
    notifications.set(key, close);
    dismiss.addEventListener('click', close);
    const schedule = () => { if (!bad) timer = setTimeout(close, 6500); };
    node.addEventListener('pointerenter', () => clearTimeout(timer)); node.addEventListener('focusin', () => clearTimeout(timer));
    node.addEventListener('pointerleave', schedule); node.addEventListener('focusout', schedule); schedule();
    while (notifications.size > 3) notifications.values().next().value();
  }
  function connection(status, message = '') {
    ready = status === 'ready';
    document.body.dataset.connection = status;
    $('#connection-screen').hidden = ready;
    $('#connection-title').textContent = status === 'error' ? '暂时未能连接修真界' : '正在回到修真界';
    $('#connection-copy').textContent = message || '读取你的行囊、机缘与众生往事…';
    $('#connection-retry').hidden = status !== 'error';
    $('#connection-screen').classList.toggle('failed', status === 'error');
    inertWhileLoading.forEach(node => { node.inert = !ready; });
    sync();
    if (ready && getState().view?.revision === 0) {
      try { $('#first-steps').hidden = localStorage.getItem('niminglu-intro-seen') === '1'; } catch {}
    }
  }
  function busy(value, label = '正在结算这一步', {showStatus=true}={}) {
    running = value; clearTimeout(busyTimer); clearTimeout(slowTimer);
    $('#operation-status').hidden = true;
    if (value && showStatus) {
      busyTimer = setTimeout(() => { $('#operation-copy').textContent = label; $('#operation-status').hidden = false; }, 450);
      slowTimer = setTimeout(() => { $('#operation-copy').textContent = `${label} · 仍在处理中，请勿重复提交`; }, 8000);
    }
    sync();
  }
  function confirm({ title, text, action = '确认', destructive = false }) {
    if (resolveDecision) return Promise.resolve(false);
    const dialog = $('#decision-dialog');
    $('#decision-title').textContent = title; $('#decision-copy').textContent = text; $('#decision-confirm').textContent = action;
    dialog.classList.toggle('destructive', destructive); dialog.returnValue = '';
    stopMovement?.(); dialog.showModal(); sync();
    return new Promise(resolve => { resolveDecision = resolve; });
  }
  listen($('#decision-dialog'), 'close', () => {
    const resolve = resolveDecision; resolveDecision = null; sync(); resolve?.($('#decision-dialog').returnValue === 'confirm');
  });
  listen($('#connection-retry'), 'click', retryLoad);
  listen($('#surface-backdrop'), 'click', closePanel);
  listen($('#person-tabs'), 'click', event => { const button = event.target.closest('[data-person-pane]'); if (button) setPane(button.dataset.personPane); });
  listen($('#plan-expand'), 'click', () => {
    const expanded = $('.journey-card').dataset.expanded !== 'true';
    $('.journey-card').dataset.expanded = String(expanded); $('#plan-expand').setAttribute('aria-expanded', String(expanded));
    $('#plan-expand').textContent = expanded ? '收起方案 ▴' : '比较方案 ▾';
  });
  function expandCommand(value) {
    $('.command-dock').dataset.expanded = String(value); $('#command-expand').setAttribute('aria-expanded',String(value));
    $('#command-expand').textContent = value ? '收起问答 ↓' : '展开问答 ↑';
  }
  listen($('#command-expand'), 'click', () => expandCommand($('.command-dock').dataset.expanded !== 'true'));
  listen($('#command'), 'input', () => {
    $('#command-length').textContent = `${$('#command').value.length} / 280`;
    try { sessionStorage.setItem('niminglu-command-draft', $('#command').value); } catch {}
  });
  try { $('#command').value = sessionStorage.getItem('niminglu-command-draft') || ''; } catch {}
  listen($('#first-steps button'), 'click', () => { $('#first-steps').hidden = true; try { localStorage.setItem('niminglu-intro-seen','1'); } catch {} });
  listen(document, 'keydown', event => {
    const state = getState();
    const intent = shortcutIntent(event, { dialog: Boolean(document.querySelector('dialog[open]')), battle: Boolean(state.view?.battle) });
    if (!intent || !ready) return;
    if (intent === 'escape') {
      if (!$('#help-card').hidden) $('#help-card').hidden = true;
      else if (!$('#map-panel').hidden) closePanel();
      else if (!$('#world-person').hidden) closePerson();
      else if (!$('#turn-summary').hidden) $('#turn-summary').hidden = true;
      else if ($('.command-dock').dataset.expanded === 'true') expandCommand(false);
      else cancelNavigation();
    } else if (intent === 'command') { closePanel(); closePerson(); sync(); expandCommand(true); $('#command').focus(); }
    else if (intent === 'help') $('#help-card').hidden = !$('#help-card').hidden;
    else openPanel(intent);
    event.preventDefault(); event.stopPropagation(); sync();
  }, true);
  // Avoid camera shortcuts while keyboard focus is anywhere in a game panel.
  listen(document, 'focusin', event => { if (event.target.closest('#map-panel,#world-person,.command-dock,dialog,#help-card')) stopMovement?.(); });
  const observer = new MutationObserver(sync);
  for (const selector of ['#map-panel','#world-person','#combat-stage','#help-card','#ending']) observer.observe($(selector), { attributes:true,attributeFilter:['hidden','open'] });
  observer.observe($('#panel-title'), {childList:true}); observer.observe($('#world-name'), {childList:true});
  const replyObserver = new MutationObserver(() => { if (!$('#command-conversation').hidden) expandCommand(true); });
  replyObserver.observe($('#command-log'), {childList:true});
  listen(window, 'offline', () => toast('网络已断开。已保存的进度不受影响，待连接恢复后再继续操作。', true));
  listen(window, 'online', () => { if (!ready) retryLoad(); else toast('网络已恢复，可以继续游历。'); });
  for (const [panel,key] of Object.entries({self:'I',campaign:'J',people:'N',events:'L'})) document.querySelectorAll(`[data-open-panel="${panel}"]`).forEach(node => { node.title = `${node.textContent.trim()} · ${key}`; node.setAttribute('aria-keyshortcuts',key); });
  connection('connecting');
  return { sync, capture, toast, connection, busy, confirm,
    reset() { $('#command').value=''; for(const close of [...notifications.values()])close(); panes.clear(); positions.clear(); activeKey = null; expandCommand(false); try { sessionStorage.removeItem('niminglu-command-draft'); } catch {} },
    dispose() { for(const remove of cleanup)remove();resolveDecision?.(false);resolveDecision=null;observer.disconnect(); replyObserver.disconnect(); clearTimeout(busyTimer); clearTimeout(slowTimer); for (const close of [...notifications.values()]) close(); }
  };
}

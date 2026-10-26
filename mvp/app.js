const actions = [
  { group: '消息与交易', type: 'inspect_pill', title: '请白芷验丹', detail: '花 10 灵石，取得真伪记录', place: 'market' },
  { group: '消息与交易', type: 'investigate_route', title: '查货道', detail: '找宁素取得可核对的线索', place: 'market' },
  { group: '消息与交易', type: 'partner', title: '找徐宁合资', detail: '凭鉴定记录争取 100 灵石', place: 'market' },
  { group: '消息与交易', type: 'sell_herbs', title: '卖出灵草', detail: '向白芷出售，换 80 灵石', place: 'market' },
  { group: '消息与交易', type: 'buy_pill', title: '购买筑基丹', detail: '按当前售价交易', place: 'market' },
  { group: '布局与争夺', type: 'report', title: '向陆执事举报', detail: '需先取得货道证词', place: 'market' },
  { group: '布局与争夺', type: 'buy_seal', title: '买空白鉴定印', detail: '向青闻支付 25 灵石', place: 'market' },
  { group: '布局与争夺', type: 'forge_poison', title: '伪造有毒鉴定', detail: '将假消息交给宁素传播', place: 'market' },
  { group: '布局与争夺', type: 'lure', title: '约沈秋出城', detail: '下旬赴黑风林验货', place: 'market' },
  { group: '布局与争夺', type: 'travel_woods', title: '前往黑风林', detail: '城外险地', place: 'market' },
  { group: '布局与争夺', type: 'travel_market', title: '返回坊市', detail: '回到交易中心', place: 'woods' },
  { group: '布局与争夺', type: 'gather_herbs', title: '采集灵草', detail: '林道最多可再采两株', place: 'woods' },
  { group: '布局与争夺', type: 'prepare_trap', title: '布下天雷符', detail: '消耗一张符箓', place: 'woods' },
  { group: '布局与争夺', type: 'ambush', title: '拦截夺丹', detail: '有受伤与被追查风险', place: 'woods' },
  { group: '承诺', type: 'honor_partner', title: '结清合资承诺', detail: '向徐宁偿付约定灵石', place: 'market' }
];

const $ = selector => document.querySelector(selector);
const el = {
  turn: $('#turn'), ap: $('#ap'), owner: $('#owner'), price: $('#price'), dispute: $('#dispute'),
  outcome: $('#outcome'), stats: $('#stats'), clues: $('#clues'), people: $('#people'),
  events: $('#events'), actions: $('#actions'), message: $('#message'), mode: $('#mode'),
  command: $('#command'), form: $('#command-form'), advance: $('#advance'), restart: $('#restart')
};
let current;
let busy = false;

function esc(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function notice(text, bad = false) {
  el.message.textContent = text;
  el.message.classList.toggle('bad', bad);
}

function render(view, modelEnabled) {
  current = view;
  el.turn.textContent = `第 ${view.turn} 旬`;
  el.ap.textContent = view.ap;
  el.owner.textContent = view.pill.owner;
  el.price.textContent = view.pill.price === null ? '不在售' : `${view.pill.price} 灵石`;
  el.dispute.textContent = view.pill.disputed ? '真伪争议中' : '无公开争议';
  el.outcome.textContent = view.outcome || '机缘仍在流转。观察人物目标，再决定下一步。';
  el.outcome.classList.toggle('won', view.pill.ownerId === 'player');
  el.mode.textContent = modelEnabled ? '模型解析已接入' : '离线规则模式';

  const place = view.player.place === 'market' ? '地下坊市' : '黑风林';
  el.stats.innerHTML = [
    ['所在', place], ['灵石', `${view.player.stones} 枚`], ['气血', `${view.player.hp} / 100`],
    ['声望', `${view.player.reputation} / 100`], ['灵草', `${view.player.herbs} 株`],
    ['天雷符', `${view.player.talismans} 张`], ['空白印', `${view.player.seal} 枚`]
  ].map(([label, value]) => `<div><span>${label}</span><strong>${esc(value)}</strong></div>`).join('');
  const clueNames = { authentic: '真丹鉴定', smuggling: '禁运货道证词' };
  el.clues.innerHTML = `<h3>已知线索</h3>${view.player.clues.length ? view.player.clues.map(c => `<span class="clue">${esc(clueNames[c] || c)}</span>`).join('') : '<p>尚无证据。先从人物交谈或调查开始。</p>'}${view.pill.partnerDebt ? `<p class="debt">待履约：徐宁 ${view.pill.partnerDebt} 灵石</p>` : ''}`;

  el.people.innerHTML = view.people.map(person => `<button class="person" type="button" data-person="${person.id}" ${person.place !== view.player.place || !view.ap ? 'disabled' : ''}><span class="avatar">${esc(person.name[0])}</span><span class="person-main"><strong>${esc(person.name)} <small>${esc(person.role)}</small></strong><span>${esc(person.goal)}</span></span><span class="person-place">${person.place === 'market' ? '坊市' : '林中'}</span></button>`).join('');

  el.events.innerHTML = view.events.map(event => `<article class="event" id="event-${event.id}"><div class="event-meta"><span>第 ${event.turn} 旬 · ${esc(event.actor)}</span><b>#${event.id}</b></div><p>${esc(event.text)}</p>${event.causes.length ? `<small>缘起：${event.causes.map(id => `<a href="#event-${id}">事件 #${id}</a>`).join(' · ')}</small>` : ''}</article>`).join('');

  let lastGroup = '';
  el.actions.innerHTML = actions.filter(action => action.place === view.player.place).map(action => {
    const heading = action.group !== lastGroup ? `<h3>${action.group}</h3>` : '';
    lastGroup = action.group;
    return `${heading}<button class="action" data-action="${action.type}" type="button" ${!view.ap ? 'disabled' : ''}><strong>${action.title}</strong><span>${action.detail}</span></button>`;
  }).join('');
}

async function call(path, payload = {}) {
  if (busy) return;
  busy = true;
  document.body.classList.add('busy');
  try {
    const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '操作失败');
    render(data.view, data.modelEnabled);
    notice(data.result);
    if (path === '/api/command') el.command.value = '';
  } catch (error) {
    notice(error.message, true);
  } finally {
    busy = false;
    document.body.classList.remove('busy');
  }
}

el.actions.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) call('/api/action', { type: button.dataset.action });
});
el.people.addEventListener('click', event => {
  const button = event.target.closest('[data-person]');
  if (button) call('/api/action', { type: 'ask', target: button.dataset.person });
});
el.advance.addEventListener('click', () => call('/api/advance'));
el.restart.addEventListener('click', () => {
  if (confirm('重开会清除当前局的存档，确定吗？')) call('/api/reset');
});
el.form.addEventListener('submit', event => {
  event.preventDefault();
  if (el.command.value.trim()) call('/api/command', { text: el.command.value.trim() });
});
el.command.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    el.form.requestSubmit();
  }
});

try {
  const response = await fetch('/api/state');
  if (!response.ok) throw new Error('无法读取游戏状态');
  const data = await response.json();
  render(data.view, data.modelEnabled);
} catch (error) {
  notice(`无法连接本地游戏服务：${error.message}`, true);
}

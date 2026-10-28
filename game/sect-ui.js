import { regionName } from './regions.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function affiliationText(identity) {
  return identity?.sectId ? `${identity.name} · ${identity.alignmentName}` : '散修 · 无门无派';
}

export function createSectUI({ element, getState, request, navigate }) {
  let selected = null, filter = 'all', pending = false, confirmLeave = false, error = '';
  const drafts = new Map();
  function render() {
    const { view, busy } = getState();
    if (!view?.sects) return;
    const { player, schools, application } = view.sects;
    selected ??= application?.sectId || player.sectId || schools[0].id;
    const school = schools.find(sect => sect.id === selected) || schools[0];
    const own = player.sectId === school.id;
    const here = school.representative.place === view.player.place;
    const destination = view.campaign.regions.find(region => region.id === school.representative.place);
    const canVisit = destination?.available !== false;
    const waiting = ['pending', 'invited'].includes(application?.status);
    const localApplication = application?.sectId === school.id ? application : null;
    const locked = busy || pending || Boolean(view.battle);
    const names = new Map([...view.people, ...view.roamers].map(person => [person.id, person.name]));
    const disabled = value => value ? 'disabled' : '';
    const candidates = schools.filter(sect => filter === 'all' || sect.alignment === filter);
    element.innerHTML = `<section class="sect-player"><small>我的道途</small><strong>${esc(affiliationText(player))}</strong><p>${player.sectId ? `${esc(player.rank)} · 第 ${view.sects.joinedTurn} 旬入门` : '尚未拜入门派，可自由游历后再作选择。'}</p></section>
      <p class="panel-tip">宗门采用原著设定。这里的“正道”指越国七派一侧，并非正道盟；入门交互由本局人物自主决定。</p>
      <nav class="sect-filters" aria-label="道统筛选">${[['all', '全部'], ['righteous', '正道'], ['demonic', '魔道']].map(([id, name]) => `<button type="button" data-sect-filter="${id}" aria-pressed="${filter === id}">${name}</button>`).join('')}</nav>
      <div class="sect-directory">${candidates.map(sect => `<button type="button" class="sect-card" data-sect-select="${sect.id}" aria-pressed="${school.id === sect.id}" style="--sect-color:${sect.color}"><small>${esc(sect.alignmentName)}${player.sectId === sect.id ? ' · 本门' : ''}</small><strong>${esc(sect.name)}</strong><span>${esc(sect.specialty)}</span><em>接引 · ${esc(sect.representative.name)} / ${esc(regionName(sect.representative.place))}</em></button>`).join('')}</div>
      <section class="sect-detail" aria-label="门派详情" style="--sect-color:${school.color}"><small>${esc(school.alignmentName)} · ${esc(school.faction)}</small><h3>${esc(school.name)}</h3><p>${esc(school.doctrine)}</p><p class="panel-tip">${esc(school.approach)}</p>
      <div class="sect-members"><strong>已知门人</strong>${school.members.map(member => `<button type="button" data-sect-person="${member.actorId}" ${disabled(locked)}>${esc(names.get(member.actorId))}<small>${esc(member.rank)}</small></button>`).join('')}</div>
      <div class="sect-representative"><span>接引人 · ${esc(school.representative.name)}<small>当前在${esc(regionName(school.representative.place))}${canVisit ? '' : ' · 需' + esc(destination.requiredRealm)}</small></span><button type="button" data-sect-person="${school.representative.id}" ${disabled(locked || !canVisit)}>${canVisit ? '前往交谈 ↗' : '需' + esc(destination.requiredRealm)}</button></div>
      ${own ? `<p class="sect-state">你已是本门${esc(player.rank)}。门派归属与功法修行分别记录，入门不直接赠送属性或重置旧债。</p><div class="sect-buttons">${confirmLeave ? `<p>退出后成为散修，往事仍会被记住。确认退出${esc(school.name)}？</p><button type="button" data-sect-action="leave" ${disabled(locked)}>确认退出</button><button type="button" data-sect-cancel ${disabled(locked)}>继续留在本门</button>` : `<button type="button" data-sect-leave ${disabled(locked)}>离开门派…</button>`}</div>` : player.sectId ? '<p class="sect-state">你已有门派归属，可先了解此门门规。若要转投，须先退出原门派。</p>' : localApplication && ['pending', 'invited'].includes(localApplication.status) ? `<article class="sect-application"><strong>${localApplication.status === 'invited' ? '已获接引邀请 · 尚未入门' : '拜帖待审'}</strong><p>${esc(localApplication.message || '拜帖已递交，等待接引人回应。')}</p>${localApplication.status === 'pending' && !localApplication.failureReason ? '<p>可先交谈，再请接引人审阅；也可撤回后改写拜帖。</p>' : ''}<small>${localApplication.reviewSource === 'model' ? '接引人自主决定' : '尚未取得接引人的决定'}</small><div class="sect-buttons"><button type="button" data-sect-action="${localApplication.status === 'invited' ? 'join' : 'review'}" ${disabled(locked || !here)}>${pending ? '接引人正在回应…' : localApplication.status === 'invited' ? `接受邀请，拜入${esc(school.name)}` : '再请接引人审阅'}</button><button type="button" data-sect-action="withdraw" ${disabled(locked)}>撤回拜帖</button></div>${!here ? '<p>请先前往接引人所在区域，当面确认。</p>' : ''}</article>` : waiting ? '<p class="sect-state">已有另一门派的拜帖待处理，请先处理或撤回，再另投门庭。</p>' : `<form class="sect-application" data-sect-form>${localApplication?.status === 'declined' ? `<p>此前未获接引：${esc(localApplication.message)}</p>` : ''}<label for="sect-reason">拜师缘由</label><textarea id="sect-reason" name="reason" maxlength="160" rows="3" placeholder="为何选择此门？可结合经历、打算或与接引人的交谈。" ${disabled(locked)}>${esc(drafts.get(school.id) || '')}</textarea><p>递帖不收费。接引人会邀请、婉拒或暂缓；获邀后由你确认入门。</p><button type="submit" ${disabled(locked || !here)}>${pending ? '接引人正在回应…' : here ? '递交拜帖，请其审阅' : `先前往${esc(school.representative.name)}所在区域`}</button></form>`}
      <p class="sect-error" role="alert" ${error ? '' : 'hidden'}>${esc(error)}</p></section>`;
  }
  async function act(type) {
    const { view, busy } = getState();
    if (busy || pending || view.battle) return;
    pending = true; error = ''; render();
    try {
      const result = await request('/api/sects', { type, sectId: selected, ...(type === 'apply' ? { reason: drafts.get(selected) || '' } : {}) });
      if (!result) error = '本次事务未完成，请查看提示后重试。';
      else { confirmLeave = false; if (type === 'join') drafts.delete(selected); }
    } catch { error = '门派事务未能完成，请稍后重试。'; }
    finally { pending = false; render(); }
  }
  element.addEventListener('input', event => { if (event.target.matches('[name="reason"]')) drafts.set(selected, event.target.value.slice(0, 160)); });
  element.addEventListener('submit', event => { if (event.target.matches('[data-sect-form]')) { event.preventDefault(); void act('apply'); } });
  element.addEventListener('click', event => {
    const { view, busy } = getState();
    if (!view || busy || pending || view.battle) return;
    const target = event.target.closest('button'); if (!target || target.disabled) return;
    if (target.dataset.sectFilter && ['all', 'righteous', 'demonic'].includes(target.dataset.sectFilter)) {
      filter = target.dataset.sectFilter;
      if (filter !== 'all' && view.sects.schools.find(s => s.id === selected)?.alignment !== filter) selected = view.sects.schools.find(s => s.alignment === filter).id;
      confirmLeave = false; error = ''; render();
    } else if (view.sects.schools.some(s => s.id === target.dataset.sectSelect)) {
      selected = target.dataset.sectSelect; confirmLeave = false; error = ''; render();
    } else if (target.dataset.sectPerson) navigate(target.dataset.sectPerson);
    else if (target.hasAttribute('data-sect-leave')) { confirmLeave = true; render(); }
    else if (target.hasAttribute('data-sect-cancel')) { confirmLeave = false; render(); }
    else if (['review', 'join', 'withdraw', 'leave'].includes(target.dataset.sectAction)) void act(target.dataset.sectAction);
  });
  return { render, select(id) { if (getState().view?.sects.schools.some(s=>s.id===id)) {selected=id;filter='all';confirmLeave=false;error='';render();} } };
}

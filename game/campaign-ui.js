import { volumeMarkup } from './volume-ui.js';
import { REGIONS,regionName } from './regions.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function campaignMarkup(view,busy=false) {
  const c=view.campaign;
  const task=o=>`<article class="volume-task ${o.done?'done':''}"><span>${o.done?'✓':o.skipped||o.missed?'—':'◇'}</span><div><strong>${esc(o.title)}</strong><p>${esc(o.detail)}</p><small>${esc(regionName(o.place))} · ${o.done?'已完成':o.missed?'本次试炼已错过':o.skipped?'已有筑基机缘，可直接拜师':esc(o.cost)}</small></div><button type="button" data-campaign-${o.done?'target':'action'}="${o.done?o.target:o.type}" ${busy||o.skipped||o.missed||(!o.done&&!o.unlocked)?'disabled':''}>${o.done?'重访':o.missed?'已错过':'前往并行动 →'}</button></article>`;
  return `<section class="volume-journal" aria-label="黄枫谷主线"><div class="volume-heading"><small>韩立 · 越国修仙界</small><h2>${esc(c.title)}</h2><p>${esc(c.summary)}</p></div>
    <div class="volume-chapters">${c.chapters.map(ch=>`<div class="${ch.done?'done':''}"><span>${ch.done?'✓':ch.skipped?'—':'○'}</span><strong>${esc(ch.title)}</strong><p>${esc(ch.summary)}${ch.skipped?' 已从其他途径筑基。':''}</p></div>`).join('')}</div>
    <h3>当前主线</h3>${c.complete?'<article class="campaign-ending"><h3>筑基拜师，道途初成</h3><p>你已拜入李化元门下，青元剑诀收入行囊。可继续研习功法、处理旧约与游历。</p></article>':c.next?task(c.next):''}
    ${!view.world.breakthrough&&(c.alternatePill||view.pill.ownerId==='player')?'<article class="campaign-aside"><strong>筑基丹已入手</strong><p>气血至少 60 时可闭关筑基，完成后回黄枫谷拜师李化元。</p><button data-campaign-target="camp" type="button" '+(busy?'disabled':'')+'>前往闭关处 ↗</button></article>':''}
    <div class="campaign-resources"><span>任务药囊 <b>${esc(c.questHerbs.join('、')||'暂无主药')}</b></span>${c.alternatePill?'<span>筑基丹 <b>宗门所得 · 1 枚</b></span>':''}</div>
    <h3>禁地支线 · 银色书页</h3><p class="panel-tip">循银剑痕迹寻找巨剑门修士。可以绕开，不影响采药交付；试炼结束前须赢下斗法并取袋。所得书页可在出禁地后继续研究。</p>${c.objectives.filter(o=>o.thread==='silver_page').map(task).join('')}
    <details class="volume-history"><summary>黄枫谷全部经历</summary>${c.objectives.map(task).join('')}</details>
    <h3>天下行旅</h3><p class="panel-tip">${esc(REGIONS[view.player.place].description)} 当前境界：${esc(view.world.realm)}。选择已开放区域即可传送。</p>
    <div class="travel-atlas" role="group" aria-label="越国与天罗国行旅地图">${c.regions.filter(r=>!['qixuan','shenshou','jiayuan','tainan'].includes(r.id)).map(r=>`<button type="button" data-region="${r.id}" class="travel-node ${r.current?'current':''} ${!r.available?'locked':''}" style="left:${r.mapPosition[0]}%;top:${r.mapPosition[1]}%" ${busy||r.current||!r.available?'disabled':''} title="${esc(r.reason||r.description)}"><strong>${esc(r.name)}</strong><small>${r.current?'此地':r.available?'传送 ↗':esc(r.requiredRealm)}</small></button>`).join('')}</div>
    <p class="panel-tip">筑基丹既可经坊市交易取得，也可通过禁地采药向宗门领取。问计会依据你的资产、已知事实与偏好，由模型设计可行路线。</p></section>`;
}
export function createCampaignUI({getState,navigate,executeAction}) {
  const root=document.querySelector('#campaign-content'),banner=document.querySelector('#campaign-track');
  function render(){
    const {view,busy}=getState();if(!view?.campaign)return;
    const opening=Boolean(view.story&&!view.story.complete),c=opening?view.story:view.campaign;
    document.body.classList.toggle('story-opening',opening);document.body.classList.toggle('exploring-frontier',!opening);banner.hidden=false;
    banner.querySelector('.eyebrow').textContent=c.title;banner.querySelector('strong').textContent=c.next?.title||(c.complete?'筑基拜师已成':c.title);banner.querySelector('small').textContent=c.summary;
    root.innerHTML=opening?volumeMarkup(view,busy):campaignMarkup(view,busy)+(view.story?`<details class="volume-history"><summary>七玄问道 · 已完成经历</summary>${volumeMarkup(view,busy)}</details>`:'');
  }
  root.addEventListener('click',event=>{
    const {view,busy}=getState();if(busy||view?.battle)return;
    const region=event.target.closest('[data-region]');if(region)return navigate(`region:${region.dataset.region}`);
    const target=event.target.closest('[data-campaign-target]');if(target)return navigate(target.dataset.campaignTarget);
    const action=event.target.closest('[data-campaign-action]');if(action)return executeAction({type:action.dataset.campaignAction});
  });
  return {render};
}

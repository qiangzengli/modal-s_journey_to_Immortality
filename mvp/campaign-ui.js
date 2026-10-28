import { REGIONS, regionName } from './regions.js';
import { FRONTIER_ACTIONS } from './campaign-data.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const endingTypes=['restore_flow','lease_core','seal_core'];

export function createCampaignUI({getState,navigate,executeAction}) {
  const root=document.querySelector('#campaign-content');
  const banner=document.querySelector('#campaign-track');
  function render(){
    const {view,busy}=getState();if(!view?.campaign)return;
    const c=view.campaign,chapter=c.chapters.find(item=>!item.done),next=c.objectives.find(item=>!item.done&&!item.title.includes('可选'));
    const exploring=Boolean(c.ending||c.flags.manifest||c.flags.water||c.flags.vein)||!['market','woods'].includes(view.player.place)||view.world.breakthrough||['xu','consumed'].includes(view.pill.ownerId)||c.alternatePill;
    document.body.classList.toggle('exploring-frontier',exploring);
    banner.hidden=!exploring;
    banner.querySelector('strong').textContent=c.ending?c.ending.title:chapter?.title||'卷一 · 枯潮来信';
    banner.querySelector('small').textContent=c.ending?'旧契已有归属 · 继续游历':c.flags.truth?'三种归途，等你作出抉择':next?.title||'打开天下，选择下一个去处';
    root.innerHTML=`<p class="campaign-lead">${esc(c.title)}<span>五地相连 · 行动不限</span></p><p class="panel-tip">${esc(REGIONS[view.player.place].description)} 点击区域自动沿路前往，方向键或「停止」可随时中断。</p>
      <div class="campaign-regions">${c.regions.map((r,i)=>`<button type="button" data-region="${r.id}" class="region-card ${r.current?'current':''}" ${busy||r.current?'disabled':''}><span class="region-index">0${i+1}</span><span><strong>${esc(r.name)} <em>${r.current?'此地':r.visited?'已游历':'未踏足'}</em></strong><small>${esc(r.description)}</small><small class="region-risk">${esc(r.risk)}</small></span><b>→</b></button>`).join('')}</div>
      <div class="campaign-resources"><span>赤砂灵矿 <b>${c.ore}</b></span><span>矿层余 <b>${c.minesRemaining}</b> 次</span><span>药田余 <b>${c.reedsRemaining}</b> 次</span>${c.alternatePill?'<span>归脉丹 <b>可筑基</b></span>':''}</div>
      ${c.ending?`<article class="campaign-ending"><small>卷一已完成 · ${c.flags.names?'旧史得以保存':'碑林尚待拓印'}</small><h3>${esc(c.ending.title)}</h3><p>${esc(c.ending.text)}</p><p>仍可游历、交谈、斗法与培养灵草。</p></article>`:''}
      ${c.ending?`<h3>众生余波</h3><p class="panel-tip">人物会记得你的选择。可与他们商议、履行委托，再听候风声，观察各自的打算；并非每个人都会愿意出手。</p><div class="campaign-objectives">${(c.aftermath||[]).map(item=>`<button type="button" data-campaign-target="${item.target}" ${busy?'disabled':''}><span>${item.done?'✓':'◇'}</span><span>${esc(item.title)}<small>${item.done?'已有行动 · 返回交谈':'尚无行动 · 当面探问'}</small></span><b>↗</b></button>`).join('')}</div>`:''}
      <h3>游历手记</h3><div class="campaign-chapters">${c.chapters.map(ch=>`<article><strong>${ch.done?'✓':'◇'} ${esc(ch.title)}</strong><p>${esc(ch.summary)}</p><button type="button" data-campaign-target="${ch.target}" ${busy?'disabled':''}>前往${esc(regionName(ch.id))} ↗</button></article>`).join('')}</div>
      <div class="campaign-objectives">${c.objectives.map(o=>`<button type="button" data-campaign-target="${o.target}" ${busy?'disabled':''}><span>${o.done?'✓':'○'}</span><span>${esc(o.title)}<small>${o.done?'已记录，可重访':'追踪到地点，再确认行动'}</small></span><b>↗</b></button>`).join('')}</div>
      ${!view.world.breakthrough&&view.pill.ownerId!=='player'?`<article class="campaign-aside"><strong>机缘不止一枚丹</strong><p>查明水样和矿纹后，在回澜药庐用 3 株灵草、2 块灵矿与 80 灵石炼制归脉丹，再回听雨亭筑基。</p><button type="button" data-campaign-target="${c.alternatePill?'camp':'infirmary'}" ${busy?'disabled':''}>${c.alternatePill?'前往听雨亭':'查看归脉丹方'} ↗</button></article>`:''}
      ${c.flags.truth&&!c.ending?`<h3>万息归谁 · 本卷抉择</h3><p class="panel-tip">三种归途只能选择一次。前往灵枢后确认，所需资源与府库奖励由规则结算。</p><div class="campaign-choices">${FRONTIER_ACTIONS.filter(a=>endingTypes.includes(a.type)).map(a=>`<button type="button" data-campaign-action="${a.type}" ${busy?'disabled':''}><strong>${esc(a.title)}</strong><span>${esc(a.detail)}</span><small>${esc(a.cost)}</small></button>`).join('')}</div>`:''}`;
  }
  root.addEventListener('click',event=>{
    const {view,busy}=getState();if(busy||view?.battle)return;
    const region=event.target.closest('[data-region]');if(region)return navigate(`region:${region.dataset.region}`);
    const target=event.target.closest('[data-campaign-target]');if(target)return navigate(target.dataset.campaignTarget);
    const action=event.target.closest('[data-campaign-action]');if(action)return executeAction({type:action.dataset.campaignAction});
  });
  return {render};
}

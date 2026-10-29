import {storyMemoryMarkup} from './story-scene-ui.js';
import { regionName } from './regions.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export function volumeMarkup(view,busy) {
  const s=view.story;if(!s)return '';
  const task=o=>`<article class="volume-task ${o.done?'done':''}"><span aria-hidden="true">${o.done?'✓':o.unlocked?'◇':'·'}</span><div><strong>${esc(o.title)}</strong><p>${esc(o.detail)}</p><small>${esc(regionName(o.place))} · ${o.done?(o.legacy?'旧历衔接':'已完成'):o.missed?'张铁已遭变故 · 此段经历错过':o.unlocked?o.cost:'完成前序任务后开放'}</small></div><button type="button" data-campaign-${o.done?'target':'action'}="${o.done?o.target:o.type}" ${busy||!o.unlocked?'disabled':''}>${o.done?'重访':o.unlocked?(o.encounter?'前往交战 →':'前往并行动 →'):o.missed?'已错过':'待开启'}</button></article>`;
  return `<section class="volume-journal" aria-label="第一卷任务"><div class="volume-heading"><small>韩立 · 从江湖入仙途</small><h2>${esc(s.title)}</h2><p>${esc(s.summary)}</p><div class="volume-progress" role="progressbar" aria-label="第一卷主线进度" aria-valuemin="0" aria-valuemax="${s.total}" aria-valuenow="${s.completed}"><span style="width:${s.completed/s.total*100}%"></span></div><small>${s.completed} / ${s.total} 段主线经历 · 进度自动保存</small></div>
  ${s.complete?'<article class="campaign-ending"><h3>江湖渐远，仙途初开</h3><p>七玄门、墨府与太南小会已写入经历。升仙令已收好，接下来前往黄枫谷山门，开启百药园与血色禁地的修行。</p></article>':''}
  <div class="volume-chapters">${s.chapters.map(c=>`<div class="${c.done?'done':''}"><span>${c.done?'✓':'○'}</span><strong>${esc(c.title)}</strong><p>${esc(c.summary)}</p></div>`).join('')}</div>
  <h3>当前主线</h3>${s.next?task(s.next):'<p class="panel-tip">本卷主线已完成，可重访旧地、补完支线。</p>'}
  <h3>故人支线</h3><div>${s.objectives.filter(o=>o.optional).map(task).join('')}</div>
  ${storyMemoryMarkup(s.decisions)}<details class="volume-history"><summary>全部主线 · ${s.completed} 段已完成</summary>${s.objectives.filter(o=>!o.optional).map(task).join('')}</details>
  <h3>第一卷行旅</h3><div class="volume-destinations">${view.campaign.regions.filter(r=>['qixuan','shenshou','jiayuan','tainan'].includes(r.id)).map(r=>`<button type="button" data-region="${r.id}" ${busy||!r.available||r.current?'disabled':''}><strong>${esc(r.name)}</strong><small>${r.current?'当前所在':r.available?'传送前往 ↗':'推进主线后开放'}</small></button>`).join('')}</div></section>`;
}

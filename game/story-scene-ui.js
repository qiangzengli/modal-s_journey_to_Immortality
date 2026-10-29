import {STORY_BEATS} from './story-beats.js';
import {regionName} from './regions.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

export function storyMemoryMarkup(decisions=[]) {
  if(!decisions.length)return '';
  return `<details class="volume-history story-memories"><summary>我的取舍 · ${decisions.length} 段经历</summary>${decisions.slice(-8).reverse().map(d=>`<article><small>第 ${d.completedTurn} 旬 · ${esc(d.title)}</small><strong>${esc(d.label)}</strong><p>${esc(d.detail)}</p></article>`).join('')}</details>`;
}

export function createStorySceneUI({getState,onSurfaceChange,stopMovement,notice}) {
  const dialog=document.createElement('dialog');
  dialog.id='story-scene';dialog.className='decision-dialog story-scene';
  dialog.setAttribute('aria-labelledby','story-scene-title');dialog.setAttribute('aria-describedby','story-scene-copy');
  document.querySelector('.world-panel').append(dialog);
  let pending=null,revision=null,selected=null,beat=null;
  const close=value=>dialog.close(value);
  dialog.addEventListener('click',event=>{
    const choice=event.target.closest('[data-story-choice]');
    if(choice){
      selected=beat.choices.find(c=>c.id===choice.dataset.storyChoice);if(!selected)return;
      dialog.querySelectorAll('[data-story-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b===choice)));
      dialog.querySelector('#story-scene-confirm').disabled=false;
      const offers=getState()?.society?.offers||[];
      const expiring=offers.filter(o=>o.status==='accepted'&&o.expires<getState().turn+selected.turns);
      dialog.querySelector('#story-scene-time').textContent=selected.turns?`经过 ${selected.turns} 旬，灵圃、气血恢复和已有约定照常结算。${expiring.length?`其中 ${expiring.length} 份已接委托将在这段时间内到期。`:''}`:'此番选择不推进旬数。';
    }
    if(event.target.closest('[data-story-cancel]'))close('cancel');
    if(event.target.closest('[data-story-talk]'))close('talk');
    if(event.target.closest('#story-scene-confirm')&&selected)close('choice:'+selected.id);
  });
  dialog.addEventListener('close',()=>{
    const resolve=pending;pending=null;onSurfaceChange?.();
    resolve?.(dialog.returnValue==='talk'?{talk:true,person:beat.person,question:beat.question}:dialog.returnValue.startsWith('choice:')?{approach:dialog.returnValue.slice(7)}:null);
  });
  return {
    choose(definition) {
      if(pending)return Promise.resolve(null);
      beat=STORY_BEATS[definition.type];if(!beat)return Promise.resolve({});
      const view=getState();revision=view.revision;selected=null;
      const person=view.people.find(p=>p.id===beat.person);
      dialog.innerHTML=`<div class="story-scene-heading"><span class="eyebrow">${esc(regionName(view.player.place))} · 一段经历</span><small>第 ${view.turn} 旬</small></div>
        <h2 id="story-scene-title">${esc(definition.title)}</h2><p id="story-scene-copy">${esc(beat.scene)}</p>
        <div class="story-scene-objective"><span>此行所为</span><p>${esc(definition.detail)}</p><small>${esc(definition.cost)}</small></div>
        <div class="story-choices" role="group" aria-label="选择这次的做法">${beat.choices.map(c=>`<button type="button" data-story-choice="${esc(c.id)}" aria-pressed="false"><strong>${esc(c.title)}</strong><span>${esc(c.detail)}</span><small>${c.turns?`时间 · ${c.turns} 旬`:'不推进旬数'}${c.trust&&person?` · ${esc(person.name)}信任 +${c.trust}`:''}</small></button>`).join('')}</div>
        <p id="story-scene-time" role="status">选好做法后再继续，也可以先去准备。</p>
        <button type="button" class="story-scene-talk" data-story-talk>${person?`先向${esc(person.name)}问询`:'先问计，再决定'} ↗</button>
        <div class="story-scene-footer"><button type="button" data-story-cancel autofocus>先做准备</button><button type="button" id="story-scene-confirm" class="primary" disabled>按此做法继续</button></div>`;
      dialog.returnValue='';stopMovement?.();dialog.showModal();onSurfaceChange?.();
      return new Promise(resolve=>{pending=resolve;});
    },
    sync() {
      if(pending&&getState()?.revision!==revision){close('stale');notice?.('局势已有变化，请重新查看这段经历再作决定。');}
    },
    dispose() {if(pending)close('cancel');dialog.remove();}
  };
}

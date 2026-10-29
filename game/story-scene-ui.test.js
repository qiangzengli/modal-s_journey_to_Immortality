import test from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './ui-test-dom.js';
import {createStorySceneUI,storyMemoryMarkup} from './story-scene-ui.js';
import {getView} from './engine.js';
import {ACTION_DEFS} from './content.js';
import {throughOpening} from './canon-test-helpers.js';

test('场景须明确选择才确认，取消不提交；耗时、到期提醒和问询正确',async t=>{
  const {$,dialogMethods}=installDOM(t);
  let view=getView(throughOpening('test_green_dew')),stops=0;
  view.society.offers=[{status:'accepted',expires:view.turn+4}];
  const snapshot=structuredClone(view),ui=createStorySceneUI({getState:()=>view,stopMovement:()=>stops++});dialogMethods();
  const definition=ACTION_DEFS.find(a=>a.type==='cultivate_changchun');
  let pending=ui.choose(definition);assert.equal($('#story-scene-confirm').disabled,true);
  $('[data-story-choice="patient"]').click();assert.match($('#story-scene-time').textContent,/6 旬.*1 份/);
  $('[data-story-cancel]').click();assert.equal(await pending,null);assert.deepEqual(view,snapshot);
  pending=ui.choose(definition);$('[data-story-choice="secluded"]').click();assert.doesNotMatch($('#story-scene-time').textContent,/份/);
  $('#story-scene-confirm').click();assert.deepEqual(await pending,{approach:'secluded'});
  pending=ui.choose(ACTION_DEFS.find(a=>a.type==='learn_medicine'));$('[data-story-talk]').click();
  assert.equal((await pending).person,'modafu');assert.equal(stops,3);ui.dispose();
});

test('局势更新关闭过期选择，Escape/关闭不复用上次做法；手记转义存档文字',async t=>{
  const {$,dialogMethods}=installDOM(t);let view=getView(throughOpening('apprentice_mo')),message;
  const ui=createStorySceneUI({getState:()=>view,notice:text=>message=text});dialogMethods();
  const def=ACTION_DEFS.find(a=>a.type==='learn_medicine');
  let pending=ui.choose(def);$('[data-story-choice="catalogue"]').click();view={...view,revision:view.revision+1};ui.sync();
  assert.equal(await pending,null);assert.match(message,/局势已有变化/);
  pending=ui.choose(def);$('#story-scene').close();assert.equal(await pending,null);
  assert.equal(storyMemoryMarkup([]),'');
  assert.doesNotMatch(storyMemoryMarkup([{title:'<img>',label:'<script>',detail:'<b>',completedTurn:1}]),/<script>|<img>|<b>/);ui.dispose();
});

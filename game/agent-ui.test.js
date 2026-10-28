import test from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './ui-test-dom.js';
import {createAgentUI} from './agent-ui.js';
import {setImmediate} from 'node:timers/promises';

test('人物草稿跨切换保留，迟到回复不覆盖新草稿，读旧消息时不强制跳底',async t=>{
 const {$,window}=installDOM(t);let pending;
 t.mock.method(globalThis,'fetch',async()=>new Promise(resolve=>pending=resolve));
 let state={personId:'mo',busy:false,view:{revision:1,people:[{id:'mo',name:'墨大夫'},{id:'li',name:'厉飞雨'}],roamers:[]}};
 const ui=createAgentUI({getState:()=>state,onStale:()=>{},executeAction:()=>{},notice:()=>{}});
 ui.personChanged();$('#agent-chat-input').value='问功法';$('#agent-chat-input').dispatchEvent(new window.Event('input'));
 state.personId='li';ui.personChanged();assert.equal($('#agent-chat-input').value,'');$('#agent-chat-input').value='问近况';
 state.personId='mo';ui.personChanged();assert.equal($('#agent-chat-input').value,'问功法');
 const request=ui.talk('问功法');$('#agent-chat-input').value='下一句草稿';$('#agent-chat-input').dispatchEvent(new window.Event('input'));
 const log=$('#agent-chat-log');log.scrollHeight=800;log.clientHeight=200;log.scrollTop=100;
 pending({ok:true,json:async()=>({text:'先练长春功。',revision:1,source:'model',followUps:[],suggestions:[]})});await request;
 assert.equal($('#agent-chat-input').value,'下一句草稿');assert.equal(log.scrollTop,100);assert.match(log.textContent,/先练长春功/);
 const stale=ui.talk('新的问题');state.personId='li';ui.personChanged();pending({ok:true,json:async()=>({text:'迟到回答',revision:1,followUps:[],suggestions:[]})});await stale;
 assert.doesNotMatch(log.textContent,/迟到回答/);assert.equal($('#agent-chat-input').value,'问近况');
 ui.reset();await setImmediate();
});

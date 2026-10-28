import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {shortcutIntent,createExperienceUI} from './experience-ui.js';
import {createStateLoader} from './state-loader.js';
import {installDOM} from './ui-test-dom.js';

test('快捷键避开输入法、文本框、修饰键、斗法和原生对话框',()=>{
 const event=(key,extra={})=>({key,target:{closest:()=>null},...extra});
 assert.equal(shortcutIntent(event('J')),'campaign');assert.equal(shortcutIntent(event('k',{ctrlKey:true})),'command');
 for(const e of [event('i',{isComposing:true}),event('i',{repeat:true}),event('i',{altKey:true}),event('i',{target:{closest:()=>({})}})])assert.equal(shortcutIntent(e),null);
 assert.equal(shortcutIntent(event('i'),{battle:true}),null);assert.equal(shortcutIntent(event('Escape'),{dialog:true}),null);
});
test('加载失败可重试、并发读取合并，成功后才启用游戏；读取超时可恢复',async()=>{
 const statuses=[],loaded=[];let resolve;
 const load=createStateLoader({request:()=>new Promise(r=>resolve=r),onStatus:s=>statuses.push(s),onLoad:d=>loaded.push(d)});
 const first=load();assert.equal(load(),first);resolve({ok:false});assert.equal(await first,false);assert.deepEqual(statuses,['connecting','error']);
 const second=load();resolve({ok:true,json:async()=>({view:{player:{},people:[]}})});assert.equal(await second,true);assert.equal(loaded.length,1);assert.equal(statuses.at(-1),'ready');
 const timeout=createStateLoader({timeoutMs:5,request:(_,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error(),{name:'AbortError'})))),onStatus:s=>statuses.push(s),onLoad:()=>assert.fail()});
 assert.equal(await timeout(),false);assert.equal(statuses.at(-1),'error');
});
test('表面切换阻止背后操作、记忆页签与滚动；结算可关闭，确认与取消分别返回',async t=>{
 const {$,document,window,dialogMethods}=installDOM(t);let state={view:{revision:1,people:[{id:'mo'}],roamers:[]},panel:null,personId:null},retry=0;
 const ui=createExperienceUI({getState:()=>state,closePanel:()=>{$('#map-panel').hidden=true;state.panel=null;},closePerson:()=>{$('#world-person').hidden=true;state.personId=null;},openPanel:name=>{state.panel=name;$('#map-panel').hidden=false;},cancelNavigation:()=>{},retryLoad:()=>retry++,stopMovement:()=>{}});
 dialogMethods();t.after(()=>ui.dispose());
 assert.equal(document.body.dataset.uiBlocked,'true');ui.connection('error','连接失败');$('#connection-retry').click();assert.equal(retry,1);
 ui.connection('ready');$('#map-panel').hidden=false;state.panel='self';ui.sync();assert.equal(document.body.dataset.surface,'journal');assert.equal($('.command-dock').inert,true);
 $('.panel-scroll').scrollTop=123;$('#map-panel').hidden=true;ui.sync();$('#map-panel').hidden=false;ui.sync();assert.equal($('.panel-scroll').scrollTop,123);
 ui.busy(true);assert.equal($('#actions').inert,true);assert.notEqual($('#panel-close').inert,true);ui.busy(false);assert.equal($('#actions').inert,false);
 $('#map-panel').hidden=true;state.personId='mo';$('#world-person').hidden=false;ui.sync();assert.equal($('#world-person').dataset.pane,'talk');
 $('[data-person-pane="actions"]').click();ui.sync();assert.equal($('#world-person').dataset.pane,'actions');
 const cancelled=ui.confirm({title:'重开',text:'覆盖存档'});$('#decision-dialog').close('cancel');assert.equal(await cancelled,false);
 const confirmed=ui.confirm({title:'重开',text:'覆盖存档'});$('#decision-dialog').close('confirm');assert.equal(await confirmed,true);
 const key=new window.Event('keydown',{bubbles:true});Object.defineProperty(key,'key',{value:'/'});document.body.dispatchEvent(key);assert.equal(document.body.dataset.surface,'none');assert.equal(document.activeElement,$('#command'));
 $('#command').value='保留我的想法';$('#command').dispatchEvent(new window.Event('input'));assert.equal(sessionStorage.getItem('niminglu-command-draft'),'保留我的想法');
 ui.toast('<img onerror=bad()>',true);assert.equal($('#notice-stack img'),null);ui.toast('<img onerror=bad()>',true);assert.equal($('#notice-stack').children.length,1);
 await setImmediate();
});

import {parseHTML} from 'linkedom';
import {readFileSync} from 'node:fs';
// DOM behavior tests; this helper does not render pixels or emulate WebGL.
export function installDOM(t) {
 const {window,document}=parseHTML(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 const saved=new Map();
 const expose=(name,value)=>{saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});};
 for(const [name,value]of Object.entries({window,document,MutationObserver:window.MutationObserver,Event:window.Event}))expose(name,value);
 for(const name of ['localStorage','sessionStorage']){const entries=new Map();expose(name,{getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,String(value)),removeItem:key=>entries.delete(key)});}
 Object.defineProperty(document,'activeElement',{configurable:true,writable:true,value:document.body});
 window.HTMLElement.prototype.focus=function(){document.activeElement=this;};
 window.HTMLElement.prototype.blur=function(){document.activeElement=document.body;};
 const dialogMethods=()=>{for(const node of document.querySelectorAll('dialog')){
 Object.defineProperty(node,'open',{configurable:true,get(){return this.hasAttribute('open');}});
 node.showModal=function(){this.setAttribute('open','');};node.close=function(value=''){this.returnValue=value;this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
 }};
 t.after(()=>{for(const [name,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}});
 return {document,window,dialogMethods,$:selector=>document.querySelector(selector)};
}

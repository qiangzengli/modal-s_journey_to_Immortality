// Only GET is timed out/retried. Mutations must not be retried automatically.
export function createStateLoader({request=fetch,onStatus,onLoad,timeoutMs=12000}) {
  let pending;
  return function load() {
    if(pending)return pending;
    onStatus('connecting');
    pending=(async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
      try {
        const response=await request('/api/state',{signal:controller.signal});
        if(!response.ok)throw new Error('无法读取游戏状态，请确认服务仍在运行。');
        const data=await response.json();
        if(!data.view?.player||!Array.isArray(data.view.people))throw new Error('游戏状态不完整，请重新连接。');
        await onLoad(data);
        onStatus('ready');return true;
      }catch(error){onStatus('error',error.name==='AbortError'?'读取超时，点击重新连接即可重试。':error.message);return false;}
      finally{clearTimeout(timer);pending=null;}
    })();
    return pending;
  };
}

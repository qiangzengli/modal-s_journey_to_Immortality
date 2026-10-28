// 由前台页面心跳驱动，关闭/隐藏页面不补算离线时间；多标签共用同一时钟。
export function createWorldClock({ getGame, decide, apply, commit, isLocked, modelEnabled, intervalMs = 90000, now = Date.now }) {
  let elapsed = 0, lastPulse = null, running = null, generation = 0, status = 'idle', error = null;
  let holdUntil = 0, retryAt = 0, stopped = false, manual = false;
  function view() {
    return { status: !modelEnabled ? 'offline' : getGame().society?.paused ? 'paused' : now() < holdUntil ? 'engaged' : status,
      error, remainingMs: Math.max(0, intervalMs - elapsed), intervalMs, generating: Boolean(running) };
  }
  function hold() { holdUntil = now() + 7000; lastPulse = null; if (!manual) generation++; }
  async function step(force = false) {
    if (running) return running;
    if (!modelEnabled || stopped || isLocked() || getGame().exploration?.battle || (!force && (getGame().society?.paused || now() < holdUntil || now() < retryAt))) return false;
    const snapshot = getGame(), ticket = generation;
    status = 'thinking'; error = null; manual = force;
    running = (async () => {
      try {
        const decisions = await decide(snapshot);
        if (stopped || ticket !== generation || snapshot !== getGame() || isLocked() || getGame().exploration?.battle) { status = 'changed'; return false; }
        const result = apply(snapshot, decisions);
        if (!await commit(snapshot, result)) { status = 'changed'; return false; }
        elapsed = 0; status = 'idle'; return true;
      } catch (failure) {
        status = 'unavailable'; error = '人物暂未完成思考，世界保持原状；可稍后重试。';
        retryAt = now() + 30000;
        return false;
      } finally { running = null; manual = false; lastPulse = null; }
    })();
    return running;
  }
  return {
    view, hold,
    changed() { generation++; lastPulse = null; },
    reset() { generation++; elapsed = 0; lastPulse = null; error = null; retryAt = 0; status = 'idle'; },
    pulse(engaged = false) {
      if (engaged) { hold(); return view(); }
      const current = now();
      if (!running && modelEnabled && !getGame().society?.paused && !getGame().exploration?.battle && !isLocked() && current >= holdUntil && current >= retryAt) {
        if (lastPulse !== null) elapsed += Math.min(6000, Math.max(0, current - lastPulse));
        lastPulse = current;
        if (elapsed >= intervalMs) void step();
      } else lastPulse = null;
      return view();
    },
    step,
    stop() { stopped = true; generation++; }
  };
}

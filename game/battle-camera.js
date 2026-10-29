const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const defaultElevation = Math.atan2(9.1, 15);

// Camera state is local to the arena; snapshots and attack animations never reset it.
export function createBattleCamera(camera, { stage, getFocusPoint = () => null } = {}) {
  let width = 1200, height = 800, battleId = null;
  let azimuth = 0, elevation = defaultElevation, zoom = 1, focus = 'arena';
  const cleanup = [], pointers = new Map();
  let surface, controls, panel, toggle;
  function setControlsOpen(open) {
    if(!panel)return;
    panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
  }
  function update(shake = 0) {
    const point = focus === 'arena' ? null : getFocusPoint(focus);
    const x = point?.x || 0, z = point?.z || 0;
    const y = point ? .9 : width < 700 ? -.3 : -.6;
    const radius = Math.hypot(15, 9.1), horizontal = radius * Math.cos(elevation);
    camera.position.set(x + Math.sin(azimuth) * horizontal + Math.cos(azimuth) * shake,
      y + radius * Math.sin(elevation), z + Math.cos(azimuth) * horizontal - Math.sin(azimuth) * shake);
    camera.lookAt(x, y, z);
    camera.updateMatrixWorld();
  }
  function project() {
    const lens = (width < 700 ? 12 : 10.5) / zoom, aspect = width / height;
    camera.left = -lens * aspect / 2; camera.right = lens * aspect / 2;
    camera.top = lens / 2; camera.bottom = -lens / 2;
    camera.updateProjectionMatrix(); update();
  }
  function rotate(dx, dy = 0) {
    if (!battleId) return;
    azimuth = (azimuth + dx) % (Math.PI * 2);
    elevation = clamp(elevation + dy, Math.PI / 10, Math.PI * .4);
    update();
  }
  function zoomBy(factor) {
    if (!battleId || !Number.isFinite(factor) || factor <= 0) return;
    zoom = clamp(zoom * factor, .65, 2.4); project();
  }
  function setFocus(value) {
    if (!battleId || !['arena', 'player', 'enemy'].includes(value)) return;
    focus = value;
    controls?.querySelectorAll('[data-battle-focus]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.battleFocus === value)));
    update();
  }
  function reset() {
    azimuth = 0; elevation = defaultElevation; zoom = 1; focus = 'arena';
    controls?.querySelectorAll('[data-battle-focus]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.battleFocus === 'arena')));
    project();
  }
  function releasePointers() {
    for (const id of [...pointers.keys()]) if (surface?.hasPointerCapture?.(id)) surface.releasePointerCapture(id);
    pointers.clear(); surface?.classList.remove('dragging');
  }
  function sync(battle) {
    const nextId = battle?.enemyId || null;
    if (nextId !== battleId) { releasePointers();setControlsOpen(false); battleId = nextId; reset(); }
  }
  if (stage) {
    surface = document.createElement('div');
    surface.className = 'battle-orbit-surface'; surface.tabIndex = 0;
    surface.setAttribute('role', 'group'); surface.setAttribute('aria-label', '斗法视角：拖动旋转，方向键调整，滚轮缩放');
    stage.prepend(surface);
    controls = document.createElement('nav'); controls.className = 'battle-camera-controls'; controls.setAttribute('aria-label', '斗法视角控制');
    controls.innerHTML = `<button type="button" class="battle-camera-toggle" data-battle-camera="toggle" aria-expanded="false" aria-controls="battle-camera-panel">视角</button><div id="battle-camera-panel" class="battle-camera-panel" hidden><div class="battle-camera-buttons">
      <button type="button" data-battle-camera="left" aria-label="向左旋转斗法视角" title="左转 · Q">↶</button>
      <button type="button" data-battle-camera="right" aria-label="向右旋转斗法视角" title="右转 · E">↷</button>
      <button type="button" data-battle-camera="in" aria-label="拉近斗法视角">＋</button>
      <button type="button" data-battle-camera="out" aria-label="拉远斗法视角">−</button>
      <button type="button" data-battle-camera="reset" aria-label="复位斗法视角">复位</button>
      <span class="battle-camera-focus"><button type="button" data-battle-focus="arena" aria-pressed="true">全景</button><button type="button" data-battle-focus="player" aria-pressed="false">主角</button><button type="button" data-battle-focus="enemy" aria-pressed="false">对手</button></span>
      </div><small>拖动旋转 · 滚轮 / 双指缩放 · Q / E 转向</small></div>`;
    panel=controls.querySelector('.battle-camera-panel');toggle=controls.querySelector('.battle-camera-toggle');
    stage.append(controls);
    const listen = (target, type, handler, options) => { target.addEventListener(type, handler, options); cleanup.push(() => target.removeEventListener(type, handler, options)); };
    const enabled = () => Boolean(battleId) && !stage.hidden && !document.querySelector('dialog[open]');
    listen(controls, 'click', event => {
      if (!enabled()) return;
      const button = event.target.closest('button'); if (!button) return;
      if(button===toggle){setControlsOpen(panel.hidden);return;}
      if (button.dataset.battleFocus) { setFocus(button.dataset.battleFocus); return; }
      ({ left: () => rotate(-Math.PI / 8), right: () => rotate(Math.PI / 8), in: () => zoomBy(1.18), out: () => zoomBy(1 / 1.18), reset })[button.dataset.battleCamera]?.();
    });
    listen(controls,'keydown',event=>{if(event.key==='Escape'&&!panel.hidden){setControlsOpen(false);toggle.focus();event.preventDefault();event.stopPropagation();}});
    listen(stage,'pointerdown',event=>{if(!controls.contains(event.target))setControlsOpen(false);});
    listen(surface, 'pointerdown', event => {
      if (!enabled() || event.button !== 0) return;
      event.preventDefault(); surface.focus({ preventScroll: true });
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      surface.setPointerCapture?.(event.pointerId); surface.classList.add('dragging');
    });
    const distance = () => { const [a, b] = [...pointers.values()]; return b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
    listen(surface, 'pointermove', event => {
      const previous = pointers.get(event.pointerId); if (!previous || !enabled()) return;
      const before = distance();
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) rotate(-(event.clientX - previous.x) * .008, (event.clientY - previous.y) * .006);
      else if (before > 1) zoomBy(distance() / before);
      event.preventDefault();
    });
    const end = event => {
      pointers.delete(event.pointerId);
      if (surface.hasPointerCapture?.(event.pointerId)) surface.releasePointerCapture(event.pointerId);
      if (!pointers.size) surface.classList.remove('dragging');
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(surface, type, end);
    listen(surface, 'wheel', event => {
      if (!enabled()) return;
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
      zoomBy(Math.exp(-clamp(pixels, -240, 240) * .0015));
    }, { passive: false });
    listen(window, 'blur', releasePointers);
    listen(document, 'visibilitychange', () => { if (document.hidden) releasePointers(); });
    listen(window, 'keydown', event => {
      if (!enabled() || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === 'q' || key === 'e') { rotate(key === 'q' ? -.15 : .15); event.preventDefault(); }
      else if (event.target === surface) {
        const actions = { arrowleft: () => rotate(-.15), arrowright: () => rotate(.15), arrowup: () => rotate(0, .08), arrowdown: () => rotate(0, -.08), '+': () => zoomBy(1.1), '-': () => zoomBy(1 / 1.1), home: reset };
        if (actions[key]) { actions[key](); event.preventDefault(); }
      }
    });
  }
  project();
  return { sync, rotate, zoomBy, setFocus, reset, update,
    resize(w, h) { width = Math.max(1, w); height = Math.max(1, h); project(); },
    dispose() { releasePointers(); for (const remove of cleanup) remove(); surface?.remove(); controls?.remove(); }
  };
}

// 跨图直接传送，落地后才在本图步行；取消不会执行旧目标的后续操作。
import { regionPath } from './regions.js';
export function createNavigator({ getPlace, locate, walk, stop, cross, waitForTransition, onChange, onArrive }) {
  let generation = 0;
  let active = false;
  function cancel() {
    generation++;
    active = false;
    stop();
    onChange(null);
  }
  return {
    cancel,
    get active() { return active; },
    async go(target) {
      cancel();
      const ticket = generation;
      const valid = () => ticket === generation;
      let goal = locate(target);
      if (!goal) return false;
      active = true;
      try {
        if (waitForTransition) {
          await waitForTransition();
          if (!valid()) return false;
          goal = locate(target);
          if (!goal) return false;
        }
        const itinerary = regionPath(getPlace(),goal.place);
        if(!itinerary)return false;
        for (const next of itinerary) {
          onChange({ name: goal.name, stage: '传送前往' });
          if (!await cross(next) || !valid()) return false;
        }
        if (goal.kind !== 'gate') {
          goal = locate(target);
          if (!goal || goal.place !== getPlace()) return false;
          onChange({ name: goal.name, stage: '正在前往' });
          if (!await walk(goal) || !valid()) return false;
          const latest = locate(target);
          if (!latest || latest.place !== getPlace() || Math.hypot(latest.x-goal.x, latest.z-goal.z)>0.5) return false;
          onArrive(latest);
        }
        return true;
      } finally {
        if (valid()) { active = false; onChange(null); }
      }
    }
  };
}

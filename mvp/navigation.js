// 一次寻路可以跨过界门；新目标和手动移动会取消旧目标的后续操作。
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
        if (goal.place !== getPlace()) {
          onChange({ name: goal.name, stage: '经过界门' });
          if (!await walk({ kind: 'point', x: getPlace() === 'market' ? -2.2 : 2.2, z: 0 }) || !valid()) return false;
          if (!await cross(goal.place) || !valid()) return false;
        }
        if (goal.kind !== 'gate') {
          goal = locate(target);
          if (!goal || goal.place !== getPlace()) return false;
          onChange({ name: goal.name, stage: '正在前往' });
          if (!await walk(goal) || !valid()) return false;
          onArrive(goal);
        }
        return true;
      } finally {
        if (valid()) { active = false; onChange(null); }
      }
    }
  };
}

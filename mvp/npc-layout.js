// Shared, deterministic spacing; no game state or rendering objects are mutated.
export const NPC_SPACING = 2.8;
const offsets = [[0, 0]];
for (let ring = 1; ring <= 20; ring++) {
  const edge = [];
  for (let x = -ring; x <= ring; x++) for (let z = -ring; z <= ring; z++) {
    if (Math.max(Math.abs(x), Math.abs(z)) === ring) edge.push([x, z]);
  }
  edge.sort((a, b) => a[0] ** 2 + a[1] ** 2 - b[0] ** 2 - b[1] ** 2 || a[0] - b[0] || a[1] - b[1]);
  offsets.push(...edge);
}

export function stationOffset(index) {
  const point = offsets[index];
  return point ? point.map(value => value * NPC_SPACING) : null;
}

export function placeNpcs(actors, canStand) {
  const placed = new Map();
  // Keep home positions first. Stable IDs make repeated renders independent of API order.
  const ordered = [...actors].filter(actor => !actor.looted).sort((a, b) => Number(Boolean(b.home)) - Number(Boolean(a.home)) || a.id.localeCompare(b.id));
  for (const actor of ordered) {
    for (const [dx, dz] of offsets) {
      const x = actor.point[0] + dx * NPC_SPACING, z = actor.point[1] + dz * NPC_SPACING;
      if (!canStand(actor.place, x, z)) continue;
      if ([...placed.values()].some(other => other.place === actor.place && Math.hypot(x - other.x, z - other.z) < NPC_SPACING - 1e-6)) continue;
      placed.set(actor.id, { x, z, place: actor.place });
      break;
    }
  }
  return placed;
}

// Screen-space labels remain readable as the camera rotates or zooms out.
export function arrangeNameplates(labels, width, height) {
  const placed = new Map();
  const ordered = [...labels].sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.id.localeCompare(b.id));
  for (const label of ordered) {
    if (label.x < -label.width || label.x > width + label.width || label.y < -label.height || label.y > height + label.height) continue;
    const candidates = [label.y];
    for (const other of placed.values()) {
      const gap = (label.height + other.height) / 2 + 5;
      candidates.push(other.y-gap, other.y+gap);
    }
    candidates.sort((a,b) => Math.abs(a-label.y)-Math.abs(b-label.y) || a-b);
    for (const y of candidates) {
      const x = Math.max(label.width / 2 + 4, Math.min(width - label.width / 2 - 4, label.x));
      if (y - label.height / 2 < 4 || y + label.height / 2 > height - 4) continue;
      const candidate = { x, y, width: label.width, height: label.height };
      if ([...placed.values()].some(other => Math.abs(x - other.x) < (candidate.width + other.width) / 2 + 4 && Math.abs(y - other.y) < (candidate.height + other.height) / 2 + 4)) continue;
      placed.set(label.id, candidate);
      break;
    }
  }
  return placed;
}

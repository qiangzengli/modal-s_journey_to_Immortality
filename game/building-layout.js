// Shared by rendering and movement: a house has walls and furniture, not a solid footprint.
export function buildingLayout({ x, z, width, depth, title, place }) {
  const facing = z > 0 ? -1 : 1;
  const doorWidth = Math.min(2.2, width * .44), wall = .18;
  const sideWidth = (width - doorWidth) / 2;
  const walls = [
    [-width / 2, 0, wall / 2, depth / 2], [width / 2, 0, wall / 2, depth / 2],
    [0, -depth / 2, width / 2, wall / 2],
    [-(doorWidth + sideWidth) / 2, depth / 2, sideWidth / 2, wall / 2],
    [(doorWidth + sideWidth) / 2, depth / 2, sideWidth / 2, wall / 2]
  ];
  const furniture = [
    { kind: 'cabinet', rect: [-width / 2 + .65, -depth / 2 + 1, .4, .65] },
    { kind: 'desk', rect: [0, -depth / 2 + .6, Math.min(1.2, width / 4), .35] },
    { kind: 'bed', rect: [width / 2 - .8, -.2, .5, .8] }
  ];
  const layout = { id: `${place}:${x}:${z}`, place, x, z, width, depth, title, facing, doorWidth, walls, furniture };
  layout.entry = roomPoint(layout, 0, depth / 2 + 1);
  layout.inside = roomPoint(layout, 0, .3);
  return layout;
}

export const roomPoint = (room, x, z) => ({ x: room.x + x * room.facing, z: room.z + z * room.facing });
export const roomLocal = (room, x, z) => ({ x: (x - room.x) * room.facing, z: (z - room.z) * room.facing });
export function insideRoom(room, x, z) {
  const point = roomLocal(room, x, z);
  return Math.abs(point.x) < room.width / 2 - .1 && Math.abs(point.z) < room.depth / 2 - .1;
}
export function buildingWalkable(room, x, z, radius = .32) {
  const point = roomLocal(room, x, z);
  return ![...room.walls, ...room.furniture.map(item => item.rect)].some(([cx, cz, rx, rz]) =>
    Math.abs(point.x - cx) < rx + radius && Math.abs(point.z - cz) < rz + radius);
}

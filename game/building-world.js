import { buildingLayout, insideRoom, roomLocal } from './building-layout.js';

export function createBuildingWorld({ THREE, put, material, label, regionAt }) {
  const buildings = [];
  function makeBuilding(scene, x, z, width, depth, roofColor, title) {
    const room = buildingLayout({ x, z, width, depth, title, place: regionAt(x) });
    const root = new THREE.Group(); root.position.set(x, 0, z); root.rotation.y = room.facing < 0 ? Math.PI : 0; scene.add(root);
    const walls = new THREE.Group(), roof = new THREE.Group(), doors = [];
    root.add(walls, roof);
    const floor = put(root, new THREE.BoxGeometry(width + .35, .1, depth + .35), material(0x9b8d70), 0, -.05, 0);
    floor.userData.walkableSurface = true;
    for (let i = 0; i < Math.ceil(width); i++) put(root, new THREE.BoxGeometry(.025, .01, depth - .2), material(0x77674e), -width / 2 + i, .006, 0).userData.walkableSurface = true;
    const baseHeight = .32, wallTop = 3.4;
    for (const [wx, wz, rx, rz] of room.walls) {
      // Stack the wall on the base: overlapping side faces cause visible z-fighting.
      put(walls, new THREE.BoxGeometry(rx * 2, wallTop - baseHeight, rz * 2), material(0x595744), wx, (wallTop + baseHeight) / 2, wz);
      put(root, new THREE.BoxGeometry(rx * 2, baseHeight, rz * 2), material(0x796b51), wx, baseHeight / 2, wz);
    }
    // Door jambs and lintel surround a real gap. Doors open before the player reaches it.
    for (const side of [-1, 1]) {
      put(walls, new THREE.BoxGeometry(.15, 2.6, .3), material(0x73553c), side * (room.doorWidth / 2 + .08), 1.3, depth / 2);
      const hinge = new THREE.Group(); hinge.position.set(side * room.doorWidth / 2, 0, depth / 2); root.add(hinge);
      put(hinge, new THREE.BoxGeometry(room.doorWidth / 2, 2.5, .1), material(0x6f4930), -side * room.doorWidth / 4, 1.25, 0);
      put(hinge, new THREE.SphereGeometry(.07, 8, 6), material(0xc8af75), -side * (room.doorWidth / 2 - .13), 1.2, .1);
      doors.push({ hinge, side });
    }
    put(walls, new THREE.BoxGeometry(room.doorWidth + .3, .8, .25), material(0x73553c), 0, 3, depth / 2);
    for (const side of [-1, 1]) {
      const wx = side * (width / 4 + room.doorWidth / 4);
      put(walls, new THREE.BoxGeometry(.7, .85, .05), material(0xd2bd8d), wx, 2, depth / 2 + .1);
      for (const offset of [-.23, 0, .23]) put(walls, new THREE.BoxGeometry(.04, .9, .08), material(0x4c3f2f), wx + offset, 2, depth / 2 + .12);
    }
    const shape = new THREE.Shape();
    shape.moveTo(-width * .64, .12); shape.lineTo(-width * .46, .28); shape.lineTo(0, 1.65); shape.lineTo(width * .46, .28);
    shape.lineTo(width * .64, .12); shape.lineTo(width * .58, -.12); shape.lineTo(0, 1.33); shape.lineTo(-width * .58, -.12); shape.closePath();
    put(roof, new THREE.ExtrudeGeometry(shape, { depth: depth * 1.28, bevelEnabled: false }), material(roofColor), 0, 3.45, -depth * .64);
    put(roof, new THREE.CylinderGeometry(.11, .11, depth * 1.4, 8), material(0xb29b70), 0, 5.1, 0).rotation.x = Math.PI / 2;
    for (let rz = -depth * .63; rz <= depth * .64; rz += .38) {
      const points = [[-width * .63, 3.59, rz], [0, 5.12, rz], [width * .63, 3.59, rz]].map(p => new THREE.Vector3(...p));
      roof.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x35473f, transparent: true, opacity: .5 })));
    }
    const medicine = /药|医|草/.test(title), study = /阁|堂|司|府|殿/.test(title);
    for (const item of room.furniture) {
      const [fx, fz, rx, rz] = item.rect;
      if (item.kind === 'cabinet') {
        put(root, new THREE.BoxGeometry(rx * 2, 2.2, rz * 2), material(0x634e39), fx, 1.1, fz);
        for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
          put(root, new THREE.BoxGeometry(.3, .5, .04), material(medicine ? 0x9b8559 : 0x7f7a5c), fx - .2 + col * .4, .45 + row * .65, fz + rz + .04);
          put(root, new THREE.SphereGeometry(.035, 6, 5), material(0xd0bc89), fx - .2 + col * .4, .45 + row * .65, fz + rz + .09);
        }
      } else if (item.kind === 'desk') {
        put(root, new THREE.BoxGeometry(rx * 2, .14, rz * 2), material(0x876441), fx, .9, fz);
        for (const side of [-1, 1]) put(root, new THREE.BoxGeometry(.15, .85, .5), material(0x634e39), fx + side * (rx - .15), .42, fz);
        for (let n = 0; n < 3; n++) {
          if (medicine) put(root, new THREE.CylinderGeometry(.1, .14, .3, 10), material(0x81a191), fx - .55 + n * .5, 1.1, fz);
          else put(root, new THREE.BoxGeometry(.35, .06, .4), material(study ? 0xbfb18b : 0x9c966f), fx - .55 + n * .5, 1.02 + n * .03, fz);
        }
      } else {
        put(root, new THREE.BoxGeometry(rx * 2, .35, rz * 2), material(0x6e543d), fx, .18, fz);
        put(root, new THREE.BoxGeometry(rx * 1.8, .1, rz * 1.8), material(medicine ? 0x91aa92 : 0x8f8c6c), fx, .42, fz);
        put(root, new THREE.BoxGeometry(.65, .15, .35), material(0xd2c7a5), fx, .53, fz - .5);
      }
    }
    const mat = put(root, new THREE.CircleGeometry(.65, 20), material(0xb3a16f), 0, .02, .3); mat.rotation.x = -Math.PI / 2; mat.userData.walkableSurface = true;
    const lamp = put(root, new THREE.SphereGeometry(.18, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffda8d, emissive: 0xc88b32, emissiveIntensity: .7 }), -width / 2 + .7, 2.6, depth / 2 - .6);
    const sign = label(`${title} · 入内`, { width: 320, font: 29 }); sign.position.set(0, 3.15, depth / 2 + .3); root.add(sign);
    root.traverse(object => { object.userData.buildingId = room.id; });
    root.userData.building = room;
    const building = { room, root, roof, walls, doors, floor, sign, lamp };
    buildings.push(building);
    return root;
  }
  function update(place, position, dt) {
    let current = null;
    for (const building of buildings) {
      const { room, roof, walls, doors, sign } = building;
      const inside = room.place === place && insideRoom(room, position.x, position.z);
      const local = roomLocal(room, position.x, position.z);
      const nearDoor = room.place === place && Math.abs(local.x) < room.doorWidth + .4 && Math.abs(local.z - room.depth / 2) < 2.8;
      roof.visible = walls.visible = !inside;
      sign.visible = !inside;
      for (const { hinge, side } of doors) hinge.rotation.y += ((inside || nearDoor ? side * Math.PI * .52 : 0) - hinge.rotation.y) * Math.min(1, dt * 12);
      if (inside) current = room;
    }
    return current;
  }
  return { buildings, makeBuilding, update };
}

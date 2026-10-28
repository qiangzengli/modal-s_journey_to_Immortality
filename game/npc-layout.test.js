import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getView } from './engine.js';
import { npcPosition } from './npc-state.js';
import { WANDERERS } from './combat-data.js';
import { NPC_SPACING, stationOffset, placeNpcs, arrangeNameplates } from './npc-layout.js';

function separated(points) {
  for (let i = 0; i < points.length; i++) for (const other of points.slice(i + 1)) {
    if (points[i].place === other.place) assert.ok(Math.hypot(points[i].x-other.x, points[i].z-other.z) >= NPC_SPACING-1e-6);
  }
}

test('同站点八人不再复用六个落点；查看与重载不修改存档', () => {
  const game = createGame();
  const ids = Object.keys(game.people).slice(0, 8);
  for (const id of ids) { game.people[id].place = 'market'; game.society.minds[id].station = 'square'; }
  const before = structuredClone(game);
  const view = getView(game);
  const points = ids.map(id => view.people.find(person => person.id === id).position);
  assert.equal(new Set(points.map(point => JSON.stringify(point))).size, ids.length);
  separated(points.map(([x,z]) => ({ x, z, place: 'market' })));
  assert.deepEqual(game, before);
  assert.deepEqual(ids.map(id => npcPosition(JSON.parse(JSON.stringify(game)), id, 'market')), points);
  assert.equal(npcPosition(game, 'missing', 'market'), null);
  assert.equal(npcPosition(game, ids[0], 'woods'), null);
});

test('人数增长和散修共站不产生取模重叠，分配不依赖人物对象顺序', () => {
  const game = createGame();
  for (const npc of Object.values(game.people)) { npc.place = 'woods'; game.society.minds[npc.id].station = 'trail'; }
  for (const npc of WANDERERS) if (!npc.place || npc.place === 'woods') game.society.minds[npc.id].station = 'trail';
  const ids = [...Object.keys(game.people), ...WANDERERS.filter(npc => !npc.place || npc.place === 'woods').map(npc => npc.id)];
  const positions = ids.map(id => npcPosition(game,id,'woods'));
  separated(positions.map(([x,z]) => ({x,z,place:'woods'})));
  game.people = Object.fromEntries(Object.entries(game.people).reverse());
  assert.deepEqual(ids.map(id => npcPosition(game,id,'woods')), positions);
  const offsets = Array.from({length:80}, (_,i) => stationOffset(i));
  assert.equal(new Set(offsets.map(point => JSON.stringify(point))).size, 80);
  separated(offsets.map(([x,z])=>({x,z,place:'market'})));
});

test('旧密集坐标、相邻站点与常驻人物一起避让，落点保持可行走且不越界', () => {
  const canStand = (place,x,z) => x >= -26 && x <= -2.3 && z >= -10 && z <= 10 && !(x < -20 && z < -3);
  const actors = [
    {id:'resident',place:'market',point:[-6,-4],home:true},
    ...Array.from({length:15},(_,i)=>({id:`npc-${i}`,place:'market',point:[i<9?-4:-6,0]})),
    {id:'looted',place:'market',point:[-4,0],looted:true}
  ];
  const before = structuredClone(actors);
  const result = placeNpcs(actors,canStand);
  assert.equal(result.size,16);
  assert.deepEqual(result.get('resident'),{x:-6,z:-4,place:'market'});
  assert.equal(result.has('looted'),false);
  for (const position of result.values()) assert.ok(canStand(position.place,position.x,position.z));
  separated([...result.values()]);
  assert.deepEqual(placeNpcs([...actors].reverse(),canStand),result);
  assert.deepEqual(actors,before);
  assert.equal(placeNpcs(actors,()=>false).size,0);
});

test('不同区域可独立布置，已取空的储物袋不占站位', () => {
  const result = placeNpcs([
    {id:'a',place:'market',point:[0,0]}, {id:'b',place:'woods',point:[0,0]},
    {id:'gone',place:'woods',point:[0,0],looted:true}
  ],()=>true);
  assert.equal(result.size,2); assert.equal(result.get('a').x,result.get('b').x);
});

test('姓名牌在屏幕空间错开；拥挤边缘优先保留当前目标，不改投影数据', () => {
  const labels = Array.from({length:8},(_,i)=>({id:`npc-${i}`,x:200+i*2,y:280+i,width:100,height:32,priority:i===7?3:0}));
  const before=structuredClone(labels);
  const result=arrangeNameplates(labels,500,620);
  assert.equal(result.size,8);
  const points=[...result.values()];
  for(let i=0;i<points.length;i++) for(const other of points.slice(i+1)) {
    assert.ok(Math.abs(points[i].x-other.x)>=(points[i].width+other.width)/2+4 || Math.abs(points[i].y-other.y)>=(points[i].height+other.height)/2+4);
  }
  assert.deepEqual(labels,before);
  assert.deepEqual(arrangeNameplates([...labels].reverse(),500,620),result);
  const edge=arrangeNameplates(labels.map(label=>({...label,x:10,y:20})),160,200);
  assert.ok(edge.has('npc-7'));
  for(const label of edge.values()){assert.ok(label.x-label.width/2>=0);assert.ok(label.x+label.width/2<=160);assert.ok(label.y-label.height/2>=0);assert.ok(label.y+label.height/2<=200);}
});

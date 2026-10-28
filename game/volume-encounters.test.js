import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningGame,applyAction,getView} from './engine.js';
import {combatAction} from './combat.js';
import {applyVolumeAction,ensureVolume} from './volume.js';
import {travel,act,winOpeningFight,openingMove,openingComplete} from './canon-test-helpers.js';
function beforeSiege(){
 let g=createOpeningGame();g=act(g,'qixuan_exam');g=travel(g,'shenshou');
 for(const type of ['apprentice_mo','study_changchun','find_green_bottle','test_green_dew','investigate_mo','confront_mo'])g=act(g,type);
 return travel(g,'qixuan');
}
test('金光上人须调查后开战；战斗占据真实回合，护罩先吸收伤害，不能点击跳过',()=>{
 let g=beforeSiege();assert.throws(()=>combatAction(g,{type:'start',enemyId:'story_jinguang'}),/战前调查/);
 g=act(g,'scout_jinguang');assert.ok(g.exploration.learned.includes('object_control'));
 assert.throws(()=>applyVolumeAction(structuredClone(g),'defend_qixuan'),/亲自赢下/);
 const before=structuredClone(g);g=act(g,'defend_qixuan');assert.equal(g.exploration.battle.enemyId,'story_jinguang');
 assert.equal(g.volume.flags.defend_qixuan,undefined);assert.equal(g.exploration.inventory.ascension_token,undefined);assert.equal(g.player.hp,before.player.hp);
 const hp=g.exploration.battle.enemyHp;g=combatAction(g,{type:'turn',move:'attack'},()=>.5).game;
 assert.equal(g.exploration.battle.enemyHp,hp);assert.equal(g.exploration.battle.ward,9);assert.ok(g.player.hp<before.player.hp);
 assert.throws(()=>act(g,'defend_qixuan'),/斗法/);
 g=winOpeningFight(g);assert.ok(g.volume.flags.defend_qixuan);assert.equal(g.exploration.inventory.ascension_token,1);assert.equal(g.exploration.inventory.sword_talisman,1);
 assert.throws(()=>act(g,'defend_qixuan'),/已经完成/);assert.throws(()=>combatAction(g,{type:'claim',enemyId:'story_jinguang'}),/取空/);
});
test('逃跑或败退不解围，不发信物；疗伤后可重新开战，战斗中途存档保留护罩和冷却',()=>{
 let g=act(beforeSiege(),'scout_jinguang');g=act(g,'defend_qixuan');
 g=combatAction(g,{type:'turn',move:'escape'},()=>0).game;assert.equal(g.exploration.battle.status,'escaped');assert.equal(g.volume.flags.defend_qixuan,undefined);
 g=combatAction(g,{type:'leave'}).game;g=act(g,'defend_qixuan');g.player.hp=1;
 g=combatAction(g,{type:'turn',move:'attack'},()=>.5).game;assert.equal(g.exploration.battle.status,'lost');assert.equal(g.player.hp,25);assert.equal(g.exploration.inventory.ascension_token,undefined);
 g=combatAction(g,{type:'leave'}).game;g=act(travel(g,'shenshou'),'valley_rest');g=act(travel(g,'qixuan'),'defend_qixuan');
 g=combatAction(g,{type:'turn',move:'skill',skillId:'object_control'},()=>.5).game;
 assert.deepEqual(getView(JSON.parse(JSON.stringify(g))).battle,getView(g).battle);
});
test('太南散修围堵有先后两阵，中间可休养，未突围不能持令结束第一卷',()=>{
 let g=act(beforeSiege(),'scout_jinguang');g=winOpeningFight(act(g,'defend_qixuan'));
 g=travel(g,'jiayuan');g=act(act(g,'deliver_mo_letter'),'cure_cold_poison');g=travel(g,'tainan');g=act(act(g,'meet_wan'),'trade_tainan');
 assert.throws(()=>act(g,'enter_xianmen'),/先完成/);assert.throws(()=>act(g,'fight_hupinggu'),/战前调查/);
 g=act(g,'probe_tainan');g=act(g,'fight_qingwen');assert.equal(g.exploration.battle.enemyId,'story_qingwen');
 g=winOpeningFight(g);assert.ok(g.volume.flags.fight_qingwen);assert.equal(g.volume.flags.fight_hupinggu,undefined);
 const hp=g.player.hp;g=act(g,'tainan_rest');assert.equal(g.player.hp,Math.min(100,hp+35));
 g=winOpeningFight(act(g,'fight_hupinggu'));g=act(g,'enter_xianmen');assert.equal(getView(g).story.complete,true);
 assert.ok(!getView(g).roamers.some(e=>['luohu','mochi'].includes(e.id)));
});
test('原先已完成的开篇存档不被新战斗倒退，未完成太南章节的存档需经历围堵',()=>{
 const old=openingComplete();old.volume.version=1;delete old.volume.flags.probe_tainan;delete old.volume.flags.fight_qingwen;delete old.volume.flags.fight_hupinggu;
 delete old.exploration.enemies.story_jinguang;
 const inventory=structuredClone(old.exploration.inventory),events=structuredClone(old.events);ensureVolume(old);
 assert.ok(!getView(old).roamers.some(e=>e.id==='story_jinguang'));
 assert.throws(()=>combatAction(travel(old,'qixuan'),{type:'start',enemyId:'story_jinguang'}),/战前调查/);
 assert.equal(getView(old).story.complete,true);assert.equal(getView(old).story.next,undefined);assert.deepEqual(old.exploration.inventory,inventory);assert.deepEqual(old.events,events);
 const ongoing=structuredClone(old);ongoing.volume.version=1;delete ongoing.volume.flags.enter_xianmen;ensureVolume(ongoing);assert.deepEqual(ongoing.volume.legacyCompleted,[]);assert.equal(getView(ongoing).story.next.type,'probe_tainan');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getView, applyAction } from './engine.js';
import { ensureNpcState, remember } from './npc-state.js';
import { SECTS, SECT_PEOPLE } from './sect-data.js';
import { ensureSects, affiliationFor, sectAction, reviewSectApplication, admissionContext } from './sects.js';
import { societyContext } from './npc-agent.js';
import { agentContext } from './story-agent.js';
import { combatAction } from './combat.js';
import { regionPath, REGIONS } from './regions.js';

const action = (game, type, extra = {}) => sectAction(game, { type, sectId:'qinglan', ...extra }).game;
const travel = (game, place) => applyAction(game, { type:'travel_region', place }).game;
const model = decision => async () => ({ content: JSON.stringify({ decision, message: '我已听过你的打算，愿按门规认真对待。' }) });
function applicant() { return action(travel(createGame(),'qinglan'),'apply',{reason:'我希望研习剑术，守住自己的承诺。'}); }

test('四门派各有道统、独立山门与接引人，旧档补充不改变玩家身份和资源', () => {
  const old = createGame(); delete old.sects;
  for (const person of SECT_PEOPLE) { delete old.people[person.id]; delete old.society.minds[person.id]; }
  const before = structuredClone(old);
  ensureNpcState(old);
  for (const key of ['player','pill','flags','events','exploration','garden']) assert.deepEqual(old[key],before[key]);
  assert.equal(affiliationFor(old).sectId,null);
  const once=structuredClone(old);ensureSects(old);ensureNpcState(old);assert.deepEqual(old,once);
  const view=getView(old);assert.equal(view.campaign.regions.length,9);
  assert.equal(view.sects.schools.filter(s=>s.alignment==='righteous').length,2);
  assert.equal(view.sects.schools.filter(s=>s.alignment==='demonic').length,2);
  for(const [id,sect] of Object.entries(SECTS)) {
    const rep=view.people.find(p=>p.id===sect.representative);
    assert.equal(rep.place,id);assert.equal(rep.affiliation.sectId,id);
    assert.ok(REGIONS[id]);assert.ok(view.sects.schools.find(s=>s.id===id).members.some(m=>m.actorId===rep.id));
  }
  assert.equal(view.people.find(p=>p.id==='xu').affiliation.sectId,null);
  assert.deepEqual(old,once);
});

test('递帖、Agent邀请、确认入门和退出持久化，入门不送资源也不改变原剧情', async () => {
  let game=applicant();const before=structuredClone(game);
  assert.throws(()=>action(game,'join'),/邀请/);
  await reviewSectApplication(game,model('invite'));
  assert.equal(game.sects.membership,null);assert.equal(game.sects.application.status,'invited');
  game=action(JSON.parse(JSON.stringify(game)),'join');
  assert.equal(affiliationFor(game).alignment,'righteous');assert.equal(getView(game).sects.player.name,'青岚剑宗');
  for(const key of ['player','pill','flags','exploration','garden','campaign'])assert.deepEqual(game[key],before[key]);
  assert.throws(()=>action(game,'join'),/邀请/);
  assert.throws(()=>action(game,'apply',{reason:'再入门'}),/归属/);
  const members=structuredClone(game);
  assert.equal(getView(JSON.parse(JSON.stringify(game))).sects.player.sectId,'qinglan');
  game=action(game,'leave');assert.equal(affiliationFor(game).alignment,'unaffiliated');
  assert.ok(game.events.some(e=>e.text.includes('退出青岚剑宗')));
  assert.equal(members.sects.membership.sectId,'qinglan');
});

test('断线、非法输出、婉拒与暂缓都不会自动入门；可重审或撤回，非法请求不改原档', async () => {
  let game=applicant();
  await reviewSectApplication(game,null);assert.equal(game.sects.application.reviewSource,'offline');
  await reviewSectApplication(game,async()=>({content:'{"decision":"invite","message":"入门吧","stones":999}'}));
  assert.equal(game.sects.application.reviewSource,'unavailable');assert.equal(game.sects.application.status,'pending');
  await reviewSectApplication(game,model('consider'));assert.equal(game.sects.application.status,'pending');
  game=action(game,'review');await reviewSectApplication(game,model('decline'));
  assert.equal(game.sects.application.status,'declined');assert.equal(game.sects.membership,null);
  assert.throws(()=>action(game,'join'),/邀请/);
  game=action(game,'apply',{reason:'我重新考虑了门规。'});
  const snapshot=structuredClone(game);
  for(const input of [{type:'apply',sectId:'xuanming',reason:'换个门派'}, {type:'join',sectId:'__proto__'}, {type:'join',sectId:'qinglan',status:'invited'}, {type:'leave',sectId:'qinglan'}]) {
    assert.throws(()=>sectAction(game,input));assert.deepEqual(game,snapshot);
  }
  game=action(game,'withdraw');assert.equal(game.sects.application,null);
});

test('入门必须与正确接引人同区域，邀请不能转门派；斗法期间不能借门派事务脱身', async () => {
  let game=applicant();await reviewSectApplication(game,model('invite'));
  const other=travel(game,'xuanming');
  assert.throws(()=>action(other,'join'),/所在区域/);
  assert.throws(()=>action(other,'join',{sectId:'xuanming'}),/邀请/);
  const fighting=combatAction(travel(game,'woods'),{type:'start',enemyId:'luohu'}).game;
  for(const type of ['withdraw','review','join','leave','apply'])assert.throws(()=>action(fighting,type,{reason:'test'}),/斗法/);
});

test('所有跨图入口共用修为校验，直接传送不访问中间地图、不扣时间和资源', () => {
  const game=createGame();const before=structuredClone(game);
  for(const id of ['lingshu','jinhuo'])assert.throws(()=>travel(game,id),/筑基/);
  for(const id of ['__proto__','constructor','nowhere'])assert.throws(()=>travel(game,id),/目的地/);
  const remote=travel(game,'xuanming');
  assert.deepEqual(regionPath('market','xuanming'),['xuanming']);
  assert.equal(remote.turn,game.turn);assert.equal(remote.player.stones,game.player.stones);
  assert.deepEqual(remote.campaign.visited,['market','woods','xuanming']);
  assert.deepEqual(game,before);
  const advanced=structuredClone(game);advanced.flags.playerBreakthrough=1;
  for(const id of Object.keys(REGIONS))if(id!=='market')assert.equal(travel(advanced,id).player.place,id);
  assert.equal(applyAction(remote,{type:'travel_market'}).game.player.place,'market');
});

test('Agent知道自身和玩家道统，拜帖只交给接引人；私人对话不会泄露给别门', async () => {
  let game=applicant();remember(game,'shen','只告诉丹商的私事','conversation');
  const context=admissionContext(game);
  assert.doesNotMatch(JSON.stringify(context),/只告诉丹商的私事/);
  assert.equal(context.sect.alignment,'正道');
  const sent=[];await reviewSectApplication(game,async messages=>{sent.push(messages);return {content:'{"decision":"invite","message":"我愿接引，等你决定。"}'};});
  assert.match(sent[0][0].content,/不得自动加入玩家/);
  const own=agentContext(getView(game),{mode:'dialogue',personId:'gu',text:'我获邀了吗？'});
  assert.equal(own.facts.sects.application.status,'invited');
  const elsewhere=travel(game,'market');
  const stranger=agentContext(getView(elsewhere),{mode:'dialogue',personId:'shen',text:'你属于哪个门派？'});
  assert.equal(stranger.facts.sects.application,null);assert.equal(stranger.facts.people[0].affiliation.sectId,'jinhuo');
  game=action(game,'join');
  const all=societyContext(game);
  assert.equal(all.actors.find(a=>a.id==='wen').affiliation.alignment,'demonic');
  assert.equal(all.actors.find(a=>a.id==='wen').playerAffiliation.sectId,'qinglan');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getView, applyAction, parseLocal } from './engine.js';
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
  const view=getView(old);assert.equal(view.campaign.regions.length,14);
  assert.equal(view.sects.schools.filter(s=>s.alignment==='righteous').length,2);
  assert.equal(view.sects.schools.filter(s=>s.alignment==='demonic').length,2);
  for(const [id,sect] of Object.entries(SECTS)) {
    const rep=view.people.find(p=>p.id===sect.representative);
    assert.equal(rep.place,id);assert.equal(rep.affiliation.sectId,id);
    assert.ok(REGIONS[id]);assert.ok(view.sects.schools.find(s=>s.id===id).members.some(m=>m.actorId===rep.id));
  }
  assert.equal(view.people.find(p=>p.id==='xu').affiliation.sectId,'qinglan');
  assert.deepEqual(old,once);
});

test('递帖、Agent邀请、确认入门和退出持久化，入门不送资源也不改变原剧情', async () => {
  let game=applicant();const before=structuredClone(game);
  assert.throws(()=>action(game,'join'),/邀请/);
  await reviewSectApplication(game,model('invite'));
  assert.equal(game.sects.membership,null);assert.equal(game.sects.application.status,'invited');
  game=action(JSON.parse(JSON.stringify(game)),'join');
  assert.equal(affiliationFor(game).alignment,'righteous');assert.equal(getView(game).sects.player.name,'黄枫谷');
  for(const key of ['player','pill','flags','exploration','garden','campaign'])assert.deepEqual(game[key],before[key]);
  assert.throws(()=>action(game,'join'),/邀请/);
  assert.throws(()=>action(game,'apply',{reason:'再入门'}),/归属/);
  const members=structuredClone(game);
  assert.equal(getView(JSON.parse(JSON.stringify(game))).sects.player.sectId,'qinglan');
  game=action(game,'leave');assert.equal(affiliationFor(game).alignment,'unaffiliated');
  assert.ok(game.events.some(e=>e.text.includes('退出黄枫谷')));
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
  game.flags.playerBreakthrough=1;const other=travel(game,'xuanming');
  assert.throws(()=>action(other,'join'),/所在区域/);
  assert.throws(()=>action(other,'join',{sectId:'xuanming'}),/邀请/);
  const fighting=combatAction(travel(game,'woods'),{type:'start',enemyId:'luohu'}).game;
  for(const type of ['withdraw','review','join','leave','apply'])assert.throws(()=>action(fighting,type,{reason:'test'}),/斗法/);
});

test('所有跨图入口共用修为校验，直接传送不访问中间地图、不扣时间和资源', () => {
  const game=createGame();const before=structuredClone(game);
  for(const id of ['lingshu','jinhuo'])assert.throws(()=>travel(game,id),/筑基/);
  for(const id of ['__proto__','constructor','nowhere'])assert.throws(()=>travel(game,id),/目的地/);
  const remote=travel(game,'qinglan');
  assert.deepEqual(regionPath('market','xuanming'),['xuanming']);
  assert.equal(remote.turn,game.turn);assert.equal(remote.player.stones,game.player.stones);
  assert.deepEqual(remote.campaign.visited,['market','woods','qinglan']);
  assert.deepEqual(game,before);
  const advanced=structuredClone(game);advanced.flags.playerBreakthrough=1;advanced.campaign.storyFlags={huangfeng_register:1,forbidden_enlist:1,enter_forbidden:1};
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
  assert.equal(stranger.facts.sects.application,null);assert.equal(stranger.facts.people[0].affiliation.sectId,null);
  game=action(game,'join');
  const all=societyContext(game);
  assert.equal(all.actors.find(a=>a.id==='wen').affiliation.alignment,'demonic');
  assert.equal(all.actors.find(a=>a.id==='wen').playerAffiliation.sectId,'qinglan');
});


test('旧门派存档更新原著身份，拜帖、归属、资产、进度和因果编号均保留', () => {
  const game=applicant(); delete game.sects.catalogVersion;
  game.sects.membership={sectId:'qinglan',joinedTurn:2};
  game.sects.application.status='invited';game.sects.application.message='顾长青愿接引你拜入青岚剑宗';
  Object.assign(game.people.gu,{name:'顾长青',goal:'以剑护道',bio:'旧设定',role:'青岚接引长老'});
  game.society.minds.gu.goal='旧人物执念';game.society.minds.gu.memories.push({turn:3,text:'顾长青记得递交拜帖',kind:'sect'});
  const before=structuredClone(game);ensureNpcState(game);
  for(const key of ['player','flags','pill','exploration','garden','campaign'])assert.deepEqual(game[key],before[key]);
  assert.deepEqual(game.sects.membership,before.sects.membership);
  assert.equal(game.sects.application.status,'invited');assert.equal(game.sects.application.reason,before.sects.application.reason);
  assert.equal(game.people.gu.name,'钟灵道');assert.equal(game.people.gu.role,'黄枫谷掌门');
  assert.equal(game.society.minds.gu.memories.at(-1).text,'钟灵道记得递交拜帖');
  assert.deepEqual(game.events.map(e=>[e.id,e.causes]),before.events.map(e=>[e.id,e.causes]));
  const once=structuredClone(game);ensureNpcState(game);assert.deepEqual(game,once);
  const serialized=JSON.stringify(getView(game));assert.doesNotMatch(serialized,/青岚|灵枢谷|灵枢山门|烬火|玄冥阁|顾长青|柳闻溪|晏赤霄|闻夜/);
  assert.deepEqual(Object.values(SECTS).map(s=>s.name),['黄枫谷','掩月宗','魔焰门','鬼灵门']);
});

test('模型计费、权限、限流、超时等错误与接引人的决定分离，重试成功清除故障', async () => {
  for(const [error,reason,pattern] of [[new Error('model_http_402'),'billing',/额度不足.*402/], [new Error('model_http_401'),'auth',/API Key/], [new Error('model_http_429'),'rate_limit',/限流/], [new DOMException('secret','TimeoutError'),'timeout',/超时/], [new SyntaxError('secret'),'invalid_response',/有效/], [new Error('secret-key-value'),'unavailable',/连接/]]) {
    const game=applicant(), events=structuredClone(game.events);
    await reviewSectApplication(game,async()=>{throw error;});
    assert.equal(game.sects.application.status,'pending');assert.equal(game.sects.membership,null);
    assert.equal(game.sects.application.failureReason,reason);assert.match(game.sects.application.message,pattern);
    assert.doesNotMatch(game.sects.application.message,/secret/);assert.deepEqual(game.events,events);
    await reviewSectApplication(game,model('invite'));
    assert.equal(game.sects.application.status,'invited');assert.equal(game.sects.application.failureReason,undefined);
  }
});


test('原著宗门名可直接用于自然语言传送', () => {
  for(const [id,sect] of Object.entries(SECTS)) assert.deepEqual(parseLocal('传送到'+sect.name),{type:'travel_region',place:id});
});


test('迁移不改写拜师缘由、聊天原文或引用玩家原话的对话记忆', () => {
  const game=applicant();delete game.sects.catalogVersion;
  const words='我想拜入青岚剑宗，曾在灵枢谷求药。';
  game.sects.application.reason=words;
  game.society.minds.gu.conversation=[{role:'user',text:words},{role:'assistant',text:'我记住了。'}];
  game.society.minds.gu.memories=[{kind:'conversation',turn:1,text:`玩家说：「${words}」；我回应：「我记住了。」`},{kind:'event',turn:1,text:'万息灵枢尚待调查'}];
  const memories=structuredClone(game.society.minds.gu.memories);
  ensureNpcState(game);
  assert.equal(game.sects.application.reason,words);assert.equal(game.society.minds.gu.conversation[0].text,words);
  assert.deepEqual(game.society.minds.gu.memories,memories);
});

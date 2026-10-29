import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,advanceTurn,getView} from './engine.js';
import {ensureNpcState} from './npc-state.js';
import {STORY_BRIDGES} from './story-beats.js';
import {agentContext} from './story-agent.js';
import {combatAction} from './combat.js';
import {throughOpening,throughCampaign,act,openingMove} from './canon-test-helpers.js';

test('经历选择真实结算时间、灵圃和约定，非法/重复选择不改原档',()=>{
  const source=throughOpening('test_green_dew');
  source.society.offers.push({id:'pacing',npcId:'modafu',title:'旧约',status:'accepted',expires:source.turn+4,reward:9});
  const before=structuredClone(source);
  assert.throws(()=>applyAction(source,{type:'cultivate_changchun',approach:'grant_reward'}),/可用的做法/);
  assert.deepEqual(source,before);
  for(const [approach,turns]of [['patient',6],['secluded',3]]){
    const result=applyAction(source,{type:'cultivate_changchun',approach}).game;
    let expected=source;for(let i=0;i<turns;i++)expected=advanceTurn(expected).game;
    assert.equal(result.turn,source.turn+turns);assert.deepEqual(result.garden,expected.garden);
    assert.deepEqual(result.society.offers,expected.society.offers);
    assert.equal(result.people.modafu.stones,expected.people.modafu.stones);
    assert.equal(getView(result).world.realm,'炼气四层');
    assert.equal(result.volume.decisions.cultivate_changchun.approach,approach);
    assert.equal(result.volume.decisions.cultivate_changchun.completedTurn,result.turn);
    const snapshot=structuredClone(result);
    assert.throws(()=>applyAction(result,{type:'cultivate_changchun',approach}),/已经完成/);
    assert.deepEqual(result,snapshot);
  }
  assert.deepEqual(source,before);
});

test('取舍进入对应人物记忆，秘密选择不注入其他人物上下文',()=>{
  const source=throughOpening('apprentice_mo');
  const careful=applyAction(source,{type:'learn_medicine',approach:'catalogue'}).game;
  const practical=applyAction(source,{type:'learn_medicine',approach:'practice'}).game;
  assert.equal(careful.people.modafu.trust-practical.people.modafu.trust,3);
  assert.match(careful.society.minds.modafu.memories.at(-1).text,/逐味核对药性/);
  assert.equal(agentContext(getView(careful),{mode:'dialogue',personId:'modafu',text:'你还记得我是怎么学医的吗？'}).facts.pastChoices.at(-1).approach,'catalogue');
  const secret=throughOpening('observe_bottle');
  const playerContext=agentContext(getView(secret),{mode:'guide'});
  assert.ok(playerContext.facts.pastChoices.some(d=>d.type==='observe_bottle'));
  const dialogue=agentContext(getView(secret),{mode:'dialogue',personId:'modafu',text:'近来怎样？'});
  assert.ok(!dialogue.facts.pastChoices.some(d=>d.type==='observe_bottle'));
  assert.doesNotMatch(JSON.stringify(dialogue),/保留了一份秘密观察记录/);
  assert.equal(dialogue.facts.currentExperience,null);
  const later=throughOpening();later.player.place='jiayuan';
  const reunion=agentContext(getView(later),{mode:'dialogue',personId:'mocaihuan',text:'还记得我来墨府的时候吗？'});
  assert.ok(reunion.facts.pastChoices.some(d=>d.type==='inquire_mofu'));
  assert.ok(!reunion.facts.pastChoices.some(d=>d.type==='observe_bottle'));
});

function oldSave(source) {
  const old=structuredClone(source);
  old.volume.version=2;delete old.volume.decisions;old.volume.legacyCompleted=[];
  delete old.campaign.pacingVersion;delete old.campaign.decisions;delete old.campaign.legacyCompleted;
  for(const key of Object.keys(STORY_BRIDGES.volume))delete old.volume.flags[key];
  for(const key of Object.keys(STORY_BRIDGES.campaign))delete old.campaign.storyFlags[key];
  return old;
}

test('旧章节中途迁移只衔接已过去的经历，保留资产/债务/时间/历史且幂等',()=>{
  const cases=[
    [throughOpening('scout_jinguang'),'defend_qixuan'],
    [throughOpening('defend_qixuan'),'settle_qixuan'],
    [throughOpening('trade_tainan'),'practice_fireball'],
    [throughOpening('probe_tainan'),'fight_qingwen'],
    [throughCampaign('garden_duty'),'inspect_garden'],
    [throughCampaign('garden_cultivate'),'forbidden_enlist'],
    [throughCampaign('meet_nangong'),'fight_mojiao'],
    [throughCampaign('harvest_pill_herbs'),'prepare_alchemy'],
    [throughCampaign('refine_foundation_pill'),'take_master']
  ];
  for(const [source,next]of cases){
    const old=oldSave(source);old.flags.partnerDebt=120;
    const before=structuredClone(old),realm=getView(source).world.realm;
    ensureNpcState(old);
    for(const key of ['player','pill','flags','exploration','events','garden','society','turn','nextId'])assert.deepEqual(old[key],before[key],key);
    const view=getView(old);
    assert.equal((view.story.complete?view.campaign:view.story).next.type,next);
    assert.equal(view.world.realm,realm);
    const migrated=structuredClone(old);ensureNpcState(old);getView(old);assert.deepEqual(old,migrated);
  }
});

test('旧档正在对阵和胜利待取袋可继续，新增经历不吞掉原奖励',()=>{
  for(const [source,type]of [[throughOpening('investigate_mo'),'confront_mo'],[throughOpening('scout_jinguang'),'defend_qixuan'],[throughCampaign('meet_nangong'),'fight_mojiao']]){
    let game=oldSave(act(source,type));ensureNpcState(game);
    assert.equal(game.exploration.battle.status,'active');
    for(let i=0;game.exploration.battle.status==='active'&&i<60;i++)game=combatAction(game,openingMove(getView(game)),()=>.5).game;
    assert.equal(game.exploration.battle.status,'won');
    const enemyId=game.exploration.battle.enemyId;
    game=oldSave(game);ensureNpcState(game);
    const result=combatAction(game,{type:'claim',enemyId}).game;
    assert.ok(result.volume.flags[type]||result.campaign.storyFlags[type]);
    assert.equal(result.exploration.enemies[enemyId].looted,true);
    assert.throws(()=>combatAction(result,{type:'claim',enemyId}),/取空|已经收取/);
  }
});

test('备药与温炉不提前发丹，缺资源不能通过新经历绕过规则',()=>{
  const source=throughCampaign('inspect_garden');source.player.herbs=0;
  assert.throws(()=>act(source,'prepare_cultivation_medicine'),/灵草/);
  assert.throws(()=>act(source,'garden_first_retreat'),/先完成/);
  const harvested=throughCampaign('harvest_pill_herbs');
  assert.throws(()=>act(harvested,'refine_foundation_pill'),/先完成/);
  const prepared=act(harvested,'prepare_alchemy');
  assert.equal(prepared.campaign.alchemy.harvested,true);assert.equal(prepared.campaign.alternatePill,false);
  assert.equal(prepared.turn,harvested.turn+1);
  assert.equal(act(prepared,'refine_foundation_pill').campaign.alternatePill,true);
});

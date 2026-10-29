import {STORY_BEATS} from './story-beats.js';
import {VOLUME_ACTIONS} from './volume-data.js';
import {ACTION_DEFS} from './content.js';
import {combatAction} from './combat.js';
import {createOpeningGame,applyAction,getView,advanceTurn} from './engine.js';
export const act=(g,type)=>applyAction(g,{type,...(STORY_BEATS[type]?{approach:STORY_BEATS[type].choices[0].id}:{})}).game;
export const travel=(g,place)=>g.player.place===place?g:applyAction(g,{type:'travel_region',place}).game;
export function throughOpening(end='enter_xianmen'){
  let g=createOpeningGame();
  for(const action of VOLUME_ACTIONS.filter(a=>!a.optional&&!a.repeatable)){
    g=act(travel(g,action.place),action.type);if(g.exploration.battle)g=winOpeningFight(g);
    if(action.type===end)break;
  }return g;
}
export const openingComplete=()=>throughOpening();
export const CANON_ROUTE=['huangfeng_register','learn_valley_rules','garden_duty','inspect_garden','prepare_cultivation_medicine','garden_first_retreat','garden_cultivate','forbidden_enlist','trial_briefing','enter_forbidden','survey_forbidden','gather_monkey_flower','gather_jade_mushroom','read_stone_gate','meet_nangong','fight_mojiao','leave_forbidden','sort_trial_gains','deliver_spirit_herbs','plant_pill_herbs','advance','advance','harvest_pill_herbs','prepare_alchemy','refine_foundation_pill'];
export function throughCampaign(end='refine_foundation_pill',source=openingComplete()){
  let g=source;
  for(const type of CANON_ROUTE){
    g=type==='advance'?advanceTurn(g).game:act(travel(g,ACTION_DEFS.find(a=>a.type===type).place),type);
    if(g.exploration.battle)g=winOpeningFight(g);
    if(type===end)break;
  }
  return g;
}

export function openingMove(view) {
  const ready=id=>view.skills.some(s=>s.id===id&&!s.remaining&&view.battle.mana>=s.cost);
  if(view.player.hp<40){
    if(view.inventory.some(i=>i.id==='healing_pill'&&i.quantity>0))return {type:'turn',move:'item',itemId:'healing_pill'};
    if(ready('changchun'))return {type:'turn',move:'skill',skillId:'changchun'};
  }
  if(ready('object_control'))return {type:'turn',move:'skill',skillId:'object_control'};
  return {type:'turn',move:'attack'};
}
export function winOpeningFight(source) {
  let g=source;
  for(let round=0;g.exploration.battle?.status==='active'&&round<50;round++)g=combatAction(g,openingMove(getView(g)),()=>.5).game;
  if(g.exploration.battle?.status!=='won')throw new Error('Opening encounter was not won');
  return combatAction(g,{type:'claim',enemyId:g.exploration.battle.enemyId}).game;
}

import {combatAction} from './combat.js';
import {createOpeningGame,applyAction,getView} from './engine.js';
export const act=(g,type)=>applyAction(g,{type}).game;
export const travel=(g,place)=>g.player.place===place?g:applyAction(g,{type:'travel_region',place}).game;
export function openingComplete(){
  let g=createOpeningGame();
  for(const [place,types]of [['qixuan',['qixuan_exam']],['shenshou',['apprentice_mo','study_changchun','find_green_bottle','test_green_dew','investigate_mo','confront_mo']],['qixuan',['scout_jinguang','defend_qixuan']],['jiayuan',['deliver_mo_letter','cure_cold_poison']],['tainan',['meet_wan','trade_tainan','probe_tainan','fight_qingwen','fight_hupinggu','enter_xianmen']]]){
    g=travel(g,place);for(const type of types){g=act(g,type);if(g.exploration.battle)g=winOpeningFight(g);}
  }return g;
}
export const CANON_ROUTE=['huangfeng_register','garden_duty','garden_cultivate','forbidden_enlist','enter_forbidden','gather_monkey_flower','gather_jade_mushroom','meet_nangong','fight_mojiao','leave_forbidden','deliver_spirit_herbs'];
const places=['qinglan','river','river','qinglan','quarry','quarry','quarry','ruins','ruins','ruins','qinglan'];
export function throughCampaign(end='deliver_spirit_herbs',source=openingComplete()){
  let g=source;
  for(let i=0;i<CANON_ROUTE.length;i++){g=act(travel(g,places[i]),CANON_ROUTE[i]);if(g.exploration.battle)g=winOpeningFight(g);if(CANON_ROUTE[i]===end)break;}
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

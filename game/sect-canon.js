import { SECT_PEOPLE } from './sect-data.js';

const OLD_NAMES = {
  青岚剑宗:'黄枫谷', 青岚山门:'太岳山脉 · 黄枫谷', 青岚正殿:'黄枫谷大殿', 青岚:'黄枫谷',
  灵枢谷:'掩月宗', 灵枢山门:'掩月宗山门',
  烬火门:'魔焰门', 烬火山门:'魔焰门山门', 烬火:'魔焰门',
  玄冥阁:'鬼灵门', 玄冥山门:'鬼灵门山门', 玄冥:'鬼灵门',
  顾长青:'钟灵道', 柳闻溪:'宣乐', 晏赤霄:'怜飞花', 闻夜:'王蝉',
  问剑台:'黄枫谷山门', 丹医堂:'掩月宗山门', 炉心殿:'魔焰门山门', 明契阁:'鬼灵门山门'
};
const rename = text => typeof text === 'string' ? Object.entries(OLD_NAMES).reduce((value, [old, name]) => value.replaceAll(old, name), text) : text;

// Stable actor/region/sect IDs preserve pending invitations, inventory, quests and causal links.
export function ensureSectCanon(game) {
  if (game.sects.catalogVersion === 1) return;
  for (const actor of SECT_PEOPLE) {
    const person = game.people[actor.id];
    if (!person) continue;
    const oldIdentity = person.name !== actor.name;
    for (const field of ['name', 'role', 'bio', 'realm', 'temperament', 'color']) person[field] = actor[field];
    if (oldIdentity) {
      person.goal = actor.goal; person.publicGoal = actor.publicGoal; person.links = [...actor.links];
      const mind = game.society?.minds[actor.id];
      if (mind) { mind.goal = actor.goal; mind.temperament = actor.temperament; mind.speech = ''; mind.activity = '接待山门来客'; }
    }
  }
  // Keep historical actions and event IDs; update obsolete proper names in generated records only.
  for (const event of game.events || []) { event.actor = rename(event.actor); event.text = rename(event.text); }
  for (const mind of Object.values(game.society?.minds || {})) {
    for (const field of ['goal', 'temperament', 'activity', 'speech']) mind[field] = rename(mind[field]);
    for (const memory of mind.memories || []) if (memory.kind !== 'conversation') memory.text = rename(memory.text);
    for (const line of mind.conversation || []) if (line.role !== 'user') {
      if (line.content !== undefined) line.content = rename(line.content);
      if (line.text !== undefined) line.text = rename(line.text);
    }
  }
  for (const offer of game.society?.offers || []) offer.npcName = rename(offer.npcName);
  if (game.sects.application) game.sects.application.message = rename(game.sects.application.message);
  game.sects.catalogVersion = 1;
}

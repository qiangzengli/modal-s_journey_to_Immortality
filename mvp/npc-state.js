import { WANDERERS } from './combat-data.js';
import { GameError } from './errors.js';

export const STATIONS = {
  market: { square: [-11, 0], gate: [-4, 0], west: [-22, 0] },
  woods: { trail: [8, 0], herbs: [18, 0], camp: [25, -3.5] }
};
const TEMPERAMENTS = {
  shen: '关心师弟生死，急于筹钱，但有尊严，会权衡风险', bai: '严谨、珍惜声誉，先核实再表态',
  xu: '寿元焦虑，但重承诺，会根据玩家态度调整打算', lu: '讲证据和秩序，不凭空定罪',
  qing: '精明、逐利，重视长期回报，不白送钱', wei: '守信护商，记得谁伤过雇主',
  han: '警惕而贪利，会试探，不盲目出手', ning: '关注消息可信度，担心假消息反噬自己'
};
export function ensureNpcState(game) {
  game.society ??= { paused: false, epoch: 0, minds: {}, offers: [], nextOffer: 1 };
  for (const npc of [...Object.values(game.people), ...WANDERERS]) {
    game.society.minds[npc.id] ??= {
      goal: npc.goal || `在黑风林生存，精进${npc.role}的技艺，保护自己的物品`,
      temperament: TEMPERAMENTS[npc.id] || npc.bio,
      activity: '观察周围局势', speech: '', station: null, memories: [], conversation: [],
      decisionTurn: null, herbs: 0, stones: npc.loot?.stones || 0
    };
  }
  return game;
}
export function npcActors(game) {
  return [...Object.values(game.people), ...WANDERERS.filter(npc => !game.exploration?.enemies[npc.id]?.defeated).map(npc => ({ ...npc, place: 'woods', goal: game.society?.minds[npc.id]?.goal }))];
}
export function npcPosition(game, id, place) {
  const station = game.society?.minds[id]?.station;
  const point = STATIONS[place]?.[station];
  if (!point) return null;
  const index = [...Object.keys(game.people), ...WANDERERS.map(npc => npc.id)].indexOf(id);
  return [point[0] + (index % 3 - 1) * .65, point[1] + (Math.floor(index / 3) % 2 ? .8 : -.8)];
}
export function remember(game, id, text, kind = 'event') {
  const mind = game.society.minds[id];
  mind.memories.push({ turn: game.turn, text: text.slice(0, 400), kind });
  mind.memories = mind.memories.slice(-16);
}
export function npcWallet(game, id) { return game.people[id] || game.society.minds[id]; }
export function npcPublic(game, id) {
  const mind = game.society?.minds[id];
  return mind ? { activity: mind.activity, speech: mind.speech, decisionTurn: mind.decisionTurn, conversation: structuredClone(mind.conversation) } : null;
}
export function societyView(game) {
  const state = game.society;
  return { paused: state?.paused || false, epoch: state?.epoch || 0, offers: structuredClone(state?.offers || []).filter(offer => ['open', 'accepted'].includes(offer.status)) };
}
export function expireOffers(game) {
  ensureNpcState(game);
  for (const offer of game.society.offers) {
    if (!['open', 'accepted'].includes(offer.status) || offer.expires >= game.turn) continue;
    npcWallet(game, offer.npcId).stones += offer.reward;
    offer.status = 'expired';
    remember(game, offer.npcId, `委托「${offer.title}」期限已过，托管的 ${offer.reward} 灵石已退回。`);
  }
  game.society.offers = game.society.offers.filter(offer => ['open', 'accepted'].includes(offer.status) || offer.expires >= game.turn - 6);
}
export function withdrawNpcOffers(game, npcId) {
  ensureNpcState(game);
  for (const offer of game.society.offers) {
    if (offer.npcId !== npcId || !['open', 'accepted'].includes(offer.status)) continue;
    npcWallet(game, npcId).stones += offer.reward;
    offer.status = 'withdrawn';
    game.events.push({ id: game.nextId++, turn: game.turn, actor: offer.npcName,
      text: `${offer.npcName}败退，委托「${offer.title}」撤回，托管灵石退回其储物袋。`, causes: [], scope: 'player' });
  }
}
export function contractAction(source, input) {
  const game = ensureNpcState(structuredClone(source));
  if (game.exploration?.battle) throw new GameError('请先结束斗法再处理委托。');
  const offer = game.society.offers.find(offer => offer.id === input.offerId);
  if (!offer || offer.expires < game.turn) throw new GameError('这份委托已经失效。');
  const actor = npcActors(game).find(npc => npc.id === offer.npcId);
  if (!actor || actor.place !== game.player.place) throw new GameError('请先找到委托人，当面商议或交付。');
  let text;
  if (input.type === 'accept' && offer.status === 'open') {
    offer.status = 'accepted';
    text = `接下${actor.name}的委托「${offer.title}」。报酬 ${offer.reward} 灵石已托管，交付 ${offer.quantity} 株灵草后领取。`;
  } else if (input.type === 'deliver' && offer.status === 'accepted') {
    if (game.player.herbs < offer.quantity) throw new GameError(`需要 ${offer.quantity} 株灵草，当前不足。`);
    game.player.herbs -= offer.quantity;
    game.player.stones += offer.reward;
    game.society.minds[actor.id].herbs += offer.quantity;
    offer.status = 'complete';
    text = `向${actor.name}交付 ${offer.quantity} 株灵草，收到「${offer.title}」的 ${offer.reward} 灵石报酬。`;
    if (game.people[actor.id]) game.people[actor.id].trust += 5;
  } else if (input.type === 'decline' && ['open', 'accepted'].includes(offer.status)) {
    npcWallet(game, actor.id).stones += offer.reward;
    offer.status = 'declined';
    text = `你婉拒了「${offer.title}」，托管灵石退还${actor.name}。`;
  } else throw new GameError('不能重复领取或处理这份委托。');
  remember(game, actor.id, text);
  game.events.push({ id: game.nextId++, turn: game.turn, actor: actor.name, text, causes: [], scope: 'player' });
  return { game, result: text };
}

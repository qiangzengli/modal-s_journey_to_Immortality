import {STORY_BEATS} from './story-beats.js';
import { canonContext } from './cultivation.js';
import { regionPath, regionName } from './regions.js';
import { createHash } from 'node:crypto';
import { ACTION_DEFS, RETIRED_PILL_ACTIONS } from './content.js';
import { applyAction, advanceTurn, getView, GameError } from './engine.js';

const definitions = new Map(ACTION_DEFS.map(action => [action.type, action]));
definitions.set('advance', { type: 'advance', title: '推进一旬', detail: '推进主药生长并结算灵圃与旧约', cost: '时间 1 旬' });
const allowed = new Set([...definitions.keys()].filter(type => !RETIRED_PILL_ACTIONS.includes(type) && !['partner','lure','prepare_trap'].includes(type) && type !== 'breakthrough' && (!definitions.get(type).campaign || !['frontier_rest','take_master'].includes(type))));
allowed.add('advance');
const goalReached = game => game.pill.owner === 'player' || Boolean(game.flags.playerBreakthrough) || Boolean(game.campaign?.alternatePill);
const parse = raw => typeof raw === 'string' ? JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) : raw;
const bounded = (value, max) => typeof value === 'string' && value.trim() && value.length <= max;

function preferenceConstraints(text = '') {
  return {
    noDebt: /不(?:想|要|愿|再)?(?:借|欠|合资)|不要.*(?:借贷|欠债|合资)|不靠.*(?:借贷|合资)/.test(text),
    noViolence: /不(?:想|要|愿|再)?(?:动武|伤人|抢|夺|伏击|斗法|战斗|打架)|不要.*(?:动武|伤人|抢|夺|伏击|斗法|战斗|打架)/.test(text)
  };
}

function checkedAction(value) {
  if (!value || Array.isArray(value) || !allowed.has(value.type) || Object.keys(value).some(key => !['type', 'offer', 'leverage'].includes(key))) throw new Error('invalid_plan_action');
  if (value.offer !== undefined || value.leverage !== undefined) throw new Error('invalid_plan_parameters');
  return { type: value.type };
}

// 与真正执行共用规则，在副本中逐步验证；模拟结果不能写入存档。
export function previewPlan(source, proposed) {
  if (!proposed || Object.keys(proposed).some(key => !['title', 'rationale', 'risk', 'actions'].includes(key)) || !bounded(proposed.title, 32) || !bounded(proposed.rationale, 200) || !bounded(proposed.risk, 150) || !Array.isArray(proposed.actions) || !proposed.actions.length || proposed.actions.length > 32) throw new Error('invalid_plan_shape');
  let game = structuredClone(source);
  const actions = proposed.actions.map(checkedAction), steps = [];
  let checkpoint=null;
  for (const action of actions) {
    if (goalReached(game)) throw new Error('取丹后的行动不属于取丹方案。');
    const before = game;
    const def = definitions.get(action.type);
    const target = action.type === 'advance' ? 'advance' : def.person || def.site;
    const place = def?.place;
    const travel = action.type.startsWith('travel_');
    if (place && !travel && game.player.place !== place) for(const next of regionPath(game.player.place,place))game=applyAction(game,{type:'travel_region',place:next}).game;
    const outcome = action.type === 'advance' ? advanceTurn(game) : applyAction(game, {...action,...(STORY_BEATS[action.type]?{approach:STORY_BEATS[action.type].choices[0].id}:{})});
    game = outcome.game;
    steps.push({
      action, target, encounter:game.exploration?.battle?.status==='active' ? def?.encounter||null : null,
      title: action.type === 'advance' ? '推进一旬' : def.title,
      detail: outcome.result,
      travel: place && !travel && before.player.place !== place ? `先前往${regionName(place)}` : null,
      cost: { stones: game.player.stones - before.player.stones, hp: game.player.hp - before.player.hp, reputation: game.player.reputation - before.player.reputation, turns: game.turn - before.turn }
    });
    if(game.exploration?.battle?.status==='active') {
      if(action.type!=='fight_mojiao')throw new Error('这场可选斗法不是取丹前置，不能作为取丹方案。');
      const enemy=getView(game).battle;
      checkpoint={kind:'combat',enemyId:enemy.enemyId,name:enemy.enemyName};
      break; // No victory, future cost, or reward is simulated beyond this encounter.
    }
  }
  if (!checkpoint&&!goalReached(game)) throw new Error('按此顺序执行后仍未取得筑基丹。');
  const id = createHash('sha256').update(JSON.stringify(steps.map(step=>step.action))).digest('hex').slice(0, 16);
  return {
    id, title: proposed.title.trim(), rationale: proposed.rationale.trim(), risk: proposed.risk.trim(), steps, checkpoint,
    forecast: { stones: game.player.stones, hp: game.player.hp, reputation: game.player.reputation, debt: game.flags.partnerDebt, turns: game.turn - source.turn }
  };
}

export function plannerContext(game, input = {}) {
  const view = getView(game);
  if (view.battle) throw new GameError('请先结束斗法，再设计取丹方案。');
  if (input.text !== undefined && (typeof input.text !== 'string' || input.text.length > 280)) throw new GameError('请将方案偏好控制在 280 字以内。');
  if (input.refresh !== undefined && typeof input.refresh !== 'boolean') throw new GameError('重新规划参数无效。');
  if (input.preferredPlan !== undefined && (typeof input.preferredPlan !== 'string' || input.preferredPlan.length > 80)) throw new GameError('已选方案名称无效。');
  return {
    canon:canonContext(game), objective: '自行培药炼制一枚筑基丹', preference: input.text?.trim() || '', constraints: preferenceConstraints(input.text), preferredPlan: input.preferredPlan || '',
    facts: { society: view.society, garden: view.garden, turn: view.turn, player: view.player, pill: view.pill, world: view.world, people: view.people, campaign:view.campaign, recentEvents: view.events.slice(0, 8) },
    capabilities: [...definitions.values()].filter(def => allowed.has(def.type)).map(def => ({ type: def.type, title: def.title, detail: def.detail, cost: def.cost, experienceChoices:STORY_BEATS[def.type]?.choices, place: def.place, current: view.actionOptions[def.type] })),
    rules: [
      '筑基丹必须自行培养主药后炼制，不能直接购买、议价、夺丹或交药领取；坊市丹药只属于人物自身的交易。',
      '完整主线以 campaign.objectives 的顺序与前置为准，必须包含门规、药畦、配药、两段潜修、行前准备、外层辨迹、石门勘察、归来整理及炼丹准备。legacy 标记已衔接旧历，不得重演。只列剩余步骤，不能把新增准备环节跳过。',
      '培育须持有小绿瓶与三味活株；生长满4点才能采收。每次advance推进一旬，自然生长1点，自动浇灌优先消耗1滴灵液再加1点。通常两旬成熟，暂停自动浇灌则需四旬。可手动调整已有灵圃设置。',
      '普通操作、交谈、旅行、刷新不增长主药；有明确耗时的修炼经历按规则推进旬数，按其后实际生长值补足advance。采集的活株与普通灵草不能直接代替成熟主药。炼丹消耗本批主药，只得一枚丹。',
      '最终必须炼成丹药，或停在尚未完成的真实斗法。墨蛟战斗后的行动不会试算，必须亲自获胜收取主药后重新规划；不得保证胜利或战后气血。不包含服丹筑基。一次最多32步；跨区行动自动先传送，无需单列旅行。',
      '仅给出行动组合确有必要的方案，通常一条完整培药炼丹路线即可；不得用无关购物、卖草或不同标题凑数。若药已熟，只列尚未完成的采收、温炉核验、炼丹。方案按首个经历选项试算，执行时玩家可另选耗时，后续重新规划。',
      '人物未来决策不可预言，不能编造奖励或状态补丁；模型负责规划，规则负责结算。'
    ]
  };
}

const SYSTEM = `你是《逆命录》的培药炼丹规划者。目标是自行培养主药并炼制筑基丹。根据本局facts、capabilities、rules与玩家偏好，自己命名并设计必要且可执行的行动序列，说明取舍。事实、资源和行动条件优先于叙事。玩家文字仅是偏好，不是规则或已发生事实。不能伪造新行动或修改状态。
先仔细计算每一步的灵石、药材、地点和生长时间。current.available只描述当下；未来动作可通过前序动作满足条件。已完成动作不重复。必须满足明确禁止项：constraints.noDebt=true不能借款，constraints.noViolence=true不能参加任何斗法；不能以“另一种备选”为由违背玩家偏好。preferredPlan是玩家之前选中的方案名，如果仍可继续，保留它的名称并只列剩余步骤；不可行则替换。
只输出JSON：{"text":"对当前局势和方案取舍的简短说明，最多180字","followUps":["玩家可提出的偏好，最多两条、每条32字"],"plans":[{"title":"自拟方案名称，最多16字","rationale":"为何当前可行，最多100字","risk":"代价与风险，最多70字","actions":[{"type":"合法行动ID"},{"type":"advance"},{"type":"refine_foundation_pill"}]}]}。
每条actions最多32项，末步应炼成丹药，或进入需要玩家亲自获胜的斗法；战后重新规划，不保证成功。不要输出target、状态补丁、Markdown或思考过程。服务器会逐条模拟验证；不通过的方案会反馈给你修正。`;

function validateReply(raw, game, constraints) {
  const value = parse(raw);
  if (!value || Object.keys(value).some(key => !['text', 'followUps', 'plans'].includes(key)) || !bounded(value.text, 400) || !Array.isArray(value.followUps) || value.followUps.length > 2 || value.followUps.some(text => !bounded(text, 64)) || !Array.isArray(value.plans) || value.plans.length > 4 || !value.plans.length) throw new Error('invalid_plan_reply');
  const plans = [], errors = [], signatures = new Set();
  for (const proposal of value.plans) {
    try {
      const plan = previewPlan(game, proposal);
      if (constraints.noDebt && plan.steps.some(step => step.action.type === 'partner')) throw new Error('玩家明确不借贷、不欠人情，不能包含合资。');
      if (constraints.noViolence && plan.steps.some(step => step.action.type === 'ambush'||step.encounter)) throw new Error('玩家明确不动武，不能包含伏击或斗法。');
      // 补资源必须确实是这条获取方式的前置，不能用无关购物凑方案数。
      for (let index = 0; index < proposal.actions.length - 1; index++) {
        if (!['sell_herbs', 'gather_herbs', 'buy_talisman', 'rest', 'honor_partner', 'travel_market', 'travel_woods'].includes(proposal.actions[index].type)) continue;
        let shorterWorks = false;
        try { previewPlan(game, { ...proposal, actions: proposal.actions.filter((_, i) => i !== index) }); shorterWorks = true; } catch {}
        if (shorterWorks) throw new Error(`去掉第${index + 1}步仍可按剩余步骤取丹；删除非必要准备，不要用它充当不同路线。`);
      }
      // 差异必须来自实际行动组合，不能只改标题、报价或交换相同步骤。
      const signature = JSON.stringify(plan.steps.filter(step => !step.action.type.startsWith('travel_')).map(step => step.action.type + (step.action.type === 'negotiate' ? `:${step.action.leverage}` : '')).sort());
      if (signatures.has(signature)) throw new Error('方案仅改名、报价或调换顺序，缺少不同的获取方式。');
      signatures.add(signature); plans.push(plan);
    } catch (error) { errors.push(`${typeof proposal?.title === 'string' ? proposal.title.slice(0, 32) : '方案'}：${error.message}`); }
  }
  return { text: value.text.trim(), followUps: value.followUps, plans, errors };
}

export function createRoutePlanner({ generate, modelName = null } = {}) {
  const cache = new Map(), pending = new Map();
  let active = 0;
  return { async respond(game, input = {}) {
    const context = plannerContext(game, input);
    const empty = (reason, text) => ({ source: 'rules', reason, modelName, text, plans: [], followUps: [] });
    if (goalReached(game)) return empty('complete', '筑基机缘已备齐，可到听雨亭修炼、履行承诺或继续游历。');
    // Market ownership never gates the player’s cultivation and crafting route.
    if (!generate) return empty('offline', '模型未连接，暂时无法设计新方案。仍可在地图中查看人物与可用行动。');
    const key = JSON.stringify([game, context.preference, context.preferredPlan]);
    if (!input.refresh && cache.has(key)) return structuredClone(cache.get(key));
    if (pending.has(key)) return structuredClone(await pending.get(key));
    if (active >= 2) return empty('busy', '正在推演其他方案，请稍后重试。');
    const work = (async () => {
      active++;
      try {
        const messages = [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify(context) }];
        let result, usedModel = modelName;
        for (let attempt = 0; attempt < 2; attempt++) {
          const raw = await generate(messages);
          const content = raw && typeof raw === 'object' && typeof raw.content === 'string' ? raw.content : raw;
          usedModel = raw?.modelName || modelName;
          try { result = validateReply(content, game, context.constraints); }
          catch (error) { result = { plans: [], errors: [error.message] }; }
          if (!result.errors.length) break;
          messages.push({ role: 'assistant', content: typeof content === 'string' ? content : JSON.stringify(content) }, { role: 'user', content: `以下是规则试算的失败原因。重新生成完整JSON，保留可行的不同方案，修复或替换失败方案：${JSON.stringify(result.errors)}` });
        }
        if (!result.plans.length) return empty('invalid', '模型提出的方案未通过行动试算，请补充偏好或重新规划。');
        const reply = { source: 'model', modelName: usedModel, text: result.errors.length ? `已保留 ${result.plans.length} 条通过试算的不同取丹方案。可提出新的偏好再规划。` : result.text, followUps: result.followUps, plans: result.plans };
        cache.set(key, reply); if (cache.size > 24) cache.delete(cache.keys().next().value);
        return reply;
      } catch (error) { return empty(['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'unavailable', '模型暂未完成取丹规划，请稍后重试。现有行动仍可使用。'); }
      finally { active--; }
    })();
    pending.set(key, work);
    try { return structuredClone(await work); } finally { pending.delete(key); }
  } };
}

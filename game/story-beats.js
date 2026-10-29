// 原著舞台上的游戏化经历；处境与收益是规则数据，人物对话由 Agent 生成。
const choice=(id,title,detail,turns=0,trust=0)=>({id,title,detail,turns,trust});
const beat=(scene,person,question,choices)=>({scene,person,question,choices});
export const STORY_BEATS={
  learn_medicine:beat('药庐里，口诀与医书摆在同一张案上。墨大夫没有解释修炼的用途，只要你认清药性、记准分量。你需要先学会在谷中自处。','modafu','学医与长春功有什么关系？',[
    choice('catalogue','逐味核对药性','你逐项核对药柜与医书，墨大夫记住了你的认真。',1,3),choice('practice','先练切药配药','你从日常药事入手，把不懂的地方另记下来。',1)]),
  study_changchun:beat('口诀看似寻常，吐纳却总在同一处滞涩。张铁仍在练他的功法，药庐外的日子悄悄过去；第一缕灵力需要亲自磨出来。','modafu','练功时气息总会散掉，该如何调整？',[
    choice('steady','按口诀循序渐进','你宁可放慢进度，也不以蛮力冲关。',3,2),choice('notes','逐日记录吐纳变化','你独自整理每次吐纳的变化，找到了适合自己的节律。',3)]),
  observe_bottle:beat('小瓶打不开，也看不出用途。你没有贸然服用其中之物，而是将它放在隐蔽处，留意夜色与瓶壁的变化。',null,'怎样在不暴露小瓶的情况下验证它的用途？',[
    choice('watch','连夜观察瓶壁','你留意月下的光点与凝液，保留了一份秘密观察记录。',1),choice('compare','对照阴晴做记录','你把不同夜晚的变化分开记录，确认异常并非偶然。',1)]),
  cultivate_changchun:beat('药草有了稳定来路，长春功仍不会自己精进。你需要在看诊和练功之间安排一段潜修，也要把小瓶与灵药的秘密藏好。',null,'有了药草，我该怎样安排潜修而不露出破绽？',[
    choice('patient','以药辅助，稳扎稳打','你将药性与吐纳配合，逐步稳固炼气四层的根基。',6),choice('secluded','闭门专心修炼','你暂缓杂事，集中三个旬日磨炼功法，随后重新检查药圃。',3)]),
  trace_zhang:beat('张铁有些日子没有出现了。练功的旧处还在，留下的物件却无人收拾。贸然质问只会惊动别人，你决定先把见到的事情拼起来。',null,'核对张铁失踪前后的痕迹时，该怎样分清事实与猜测？',[
    choice('traces','循练功旧处查访','你核对张铁最后出现的地方，记住失踪前后的变化。'),choice('records','核对同门留下的记载','你从日常记录中寻找断点，没有把猜测当成结论。')]),
  read_mo_letter:beat('危局过去，遗书仍在手中。有关墨府、寒毒和解毒之物的交代不能只听一遍便忘；张铁的遭遇也值得认真收束。',null,'遗书中哪些事情需要先核实？',[
    choice('verify','逐项核对遗书与信物','你把嘉元城墨府、暖阳宝玉与寒毒的线索分别记下。'),choice('remember','先整理同门旧物','你收起旧物，再记下遗书中的去向，没有把这段往事轻轻揭过。')]),
  settle_qixuan:beat('金光上人已败，山门里的人却还在清点伤者。离开前，你可以把这一场江湖风波收好，让故人知道你将往何处去。','lifeiyu','你准备如何安顿山门，今后又有什么打算？',[
    choice('friends','与厉飞雨交代去向','你认真与厉飞雨话别，把七玄门的旧交放在心上。',0,4),choice('quiet','低调收拾行装','你不宣扬所得的信物，只把该交代的事情交代清楚。')]),
  inquire_mofu:beat('嘉元城里，墨府的门庭仍在，府中人对来客却各有顾虑。遗书不能让你立刻取得信任，先听清她们眼下所忧，才知道该如何开口。','mocaihuan','墨府近来有什么变化，你最担心什么？',[
    choice('listen','先听墨彩环说明近况','你耐心听取墨府近况，只说明可以核实的来意。',0,4),choice('observe','先核对门庭与旧信物','你留意府中态度，再以信物表明身份，没有贸然许诺。')]),
  negotiate_mofu:beat('严氏关心遗书是否可信，也关心墨府往后如何自处。你需要说明能做到什么、不能承诺什么，再谈寒毒与暖阳宝玉。','yanshi','怎样交代遗书，才足以让你相信我的来意？',[
    choice('candid','坦陈来路与自身寒毒','你把有凭据的经历说清，严氏记住你没有夸大承诺。',0,4),choice('evidence','先凭信物逐项说明','你以信物和遗书交代为依据，保留无关的修炼秘密。',0,2)]),
  learn_tainan_rules:beat('太南小会里，说话的分寸与一株灵草的价钱同样要紧。修仙者以物易物，热络的邀请未必可靠，升仙令更不宜随意示人。','wanxiaoshan','小会上交易和结伴，有哪些事情需要留心？',[
    choice('ask','向万小山核实规矩','你请教交易与结伴的分寸，万小山记住你的谨慎。',0,3),choice('watch','先旁观几场交换','你将交易与吹嘘分开看，明白了财不露白的道理。')]),
  practice_fireball:beat('法术口诀已经换到手，临敌时能否使出来却是另一回事。你找了空处练习起势、收势与灵力控制，不急着接受谷外的邀约。',null,'火弹术应该怎样练习，才能用于真正的交锋？',[
    choice('control','先练稳定凝火','你反复练习收放，火弹术已经可以在斗法中使用。',1),choice('distance','练习在进退间施法','你熟悉了起手与退步的节奏，火弹术已经可以在斗法中使用。',1)]),
  prepare_departure:beat('摆脱围堵并不等于已经准备好入仙门。你回顾小会所见、整理法术和升仙令，留出一段时间继续修炼，才决定下一程。',null,'入黄枫谷前，还该怎样整理功法与行囊？',[
    choice('settle','休整后稳步潜修','你借这段清静修炼长春功，稳固炼气九层的修为。',6),choice('focus','收束杂事，集中修炼','你把需要办理的事情逐项收束，再集中潜修至炼气九层。',3)]),
  learn_valley_rules:beat('有了黄枫谷门籍，也只是刚刚入门。丹药如何分配、差事如何领取，都与往日江湖不同；你先理清自己能走的路。','gu','新入门弟子该怎样选择差事和修炼资源？',[
    choice('rules','向门中核实差事规矩','你记清门规与差事边界，避免把别人的药材视作己有。',0,3),choice('quiet','选择少受打扰的差事','你把清静修炼放在首位，决定先打理百药园。')]),
  inspect_garden:beat('药园并不是任你取用的药库。接手后，旧药畦、领用份额和自己的种苗都须分清，这才有长期安静修炼的可能。',null,'药园差事有哪些必须分清的账目？',[
    choice('ledger','逐畦登记药性与份额','你把公私药材分开登记，留下可供管事核验的账目。'),choice('beds','先整理自己的药畦','你划清自己的种植位置，没有挪用药园公物。')]),
  prepare_cultivation_medicine:beat('丹方上的剂量必须落到手里的药材上。你先备好一份修炼用药，避免闭关时才发现药性与分量不合。',null,'黄龙丹与金髓丸的用药准备要注意什么？',[
    choice('measure','按丹方逐项配比','你消耗一株自有灵草，备好了这次潜修所需的修炼用药。',1),choice('sort','先辨药性再配制','你消耗一株自有灵草，将药性记录与实际用药核对清楚。',1)]),
  garden_first_retreat:beat('百药园的清静终于换来一段完整修炼时间。丹药只是助力，你仍要一遍遍运转长春功，确认灵力没有虚浮。',null,'这次闭关该怎样检验自己的根基？',[
    choice('steady','每旬检查，再推进功法','你以稳定为先，逐步达到炼气十层。',6),choice('focus','安排连续的专注修行','你集中三个旬日修炼，再复查灵力运转，达到炼气十层。',3)]),
  garden_cultivate:beat('炼气十层之后，先前的经验不能代替新的修炼。你仍留在百药园，用自有药材继续磨炼功法，同时权衡筑基资源的来路。',null,'继续修炼与争取筑基机缘，应该怎样安排？',[
    choice('steady','继续稳固，逐步精进','你将第二株灵草用于修炼，经过潜修达到炼气十一层。',6),choice('focus','专注突破眼前瓶颈','你集中修行并核验药效，以第二株灵草助力，达到炼气十一层。',3)]),
  trial_briefing:beat('七派采药试炼不是一次普通出游。你需要认准三味主药与中心区域的危险，也要把退路想在入谷之前。','lihuayuan','禁地采药的轻重缓急与退路，应该如何判断？',[
    choice('herbs','先核对三味主药的特征','你记清紫猴花、玉髓芝与天灵果的特征，避免把寻常药草当成主药。',0,2),choice('route','先记入口与中心区方位','你把入口、密林、寒潭和中心区域分开记下，决定随实际局势调整路线。')]),
  survey_forbidden:beat('踏入禁地后，同门未必仍在身旁。地面有折断的草茎和新留下的斗法痕迹，你决定先辨清周围，而不是径直扑向灵药。',null,'这些痕迹能说明什么，怎样接近药材更稳妥？',[
    choice('tracks','顺痕迹辨认危险','你分清较新的斗法痕迹与旧路，把密林与寒潭的目标记入手记。'),choice('cover','借遮蔽核对地形','你沿遮蔽处观察两处采药方向，为进退留出余地。')]),
  read_stone_gate:beat('两味外层主药已经入囊，中心石门后却不再是熟悉的密林。石面上的痕迹与远处动静提醒你，必须先看清环境再深入。',null,'进入石殿前，有哪些线索值得先查看？',[
    choice('marks','察看石门与交战痕迹','你从石门附近的痕迹判断危险所在，做好与其他修士接触的准备。'),choice('retreat','先记可用退路','你先记下入口和能退回的位置，再向石殿靠近。')]),
  sort_trial_gains:beat('离开禁地后，收获不能只算作几株药。哪些是活株、哪些必须留种，途中见闻有哪些可以公开，都需要重新整理。',null,'回宗前应该怎样整理活株和采药记录？',[
    choice('seeds','先检查三味活株的根系','你分开包扎活株，明确它们将用于自己的种苗培育。'),choice('records','先梳理可交代的采药记录','你整理可核实的见闻，保留与自身秘密无关的采药记录。')]),
  prepare_alchemy:beat('亲手培育的主药终于成熟。药性、炉温与下药次序需要先安排好，不能把一批得来不易的主药当作试错材料。',null,'主药已成熟，正式炼制前应该如何准备？',[
    choice('sequence','核对药性与下药次序','你将成熟主药逐项核对，记下正式开炉的次序。',1),choice('furnace','先温炉，再复核丹方','你完成温炉并复核丹方，主药仍保留到正式炼制时才消耗。',1)])
};

// Only experiences already passed in an older save are bridged, without rewards.
export const STORY_BRIDGES={
  volume:{learn_medicine:['study_changchun'],observe_bottle:['test_green_dew'],cultivate_changchun:['investigate_mo'],trace_zhang:['investigate_mo'],read_mo_letter:['scout_jinguang'],settle_qixuan:['deliver_mo_letter'],inquire_mofu:['deliver_mo_letter'],negotiate_mofu:['deliver_mo_letter'],learn_tainan_rules:['trade_tainan'],practice_fireball:['probe_tainan'],prepare_departure:['enter_xianmen']},
  campaign:{learn_valley_rules:['garden_duty'],inspect_garden:['garden_cultivate'],prepare_cultivation_medicine:['garden_cultivate'],garden_first_retreat:['garden_cultivate'],trial_briefing:['enter_forbidden'],survey_forbidden:['gather_monkey_flower','gather_jade_mushroom','meet_nangong'],read_stone_gate:['meet_nangong'],sort_trial_gains:['deliver_spirit_herbs'],prepare_alchemy:['refine_foundation_pill']}
};
export function bridgeStory(scope,kind,completed) {
  scope.legacyCompleted??=[];
  for(const [type,anchors]of Object.entries(STORY_BRIDGES[kind]))if(completed||anchors.some(key=>scope[kind==='volume'?'flags':'storyFlags']?.[key])){
    if(!scope[kind==='volume'?'flags':'storyFlags']?.[type]&&!scope.legacyCompleted.includes(type))scope.legacyCompleted.push(type);
  }
}
export const storyDone=(scope,key)=>Boolean(scope?.flags?.[key]||scope?.storyFlags?.[key]||scope?.legacyCompleted?.includes(key));

export const FRONTIER_PEOPLE=[
  {id:'lihuayuan',name:'李化元',role:'黄枫谷结丹修士',place:'qinglan',spot:[221,8],stones:120,goal:'带队禁地试炼，考察可收入门下的弟子',publicGoal:'考察后辈修行',links:['gu','wei'],color:'#91c4bf',realm:'结丹中期',bio:'黄枫谷结丹修士，居绿波洞；韩立筑基后可拜入其门下。',temperament:'重视宗门利益，也会照拂门下弟子'},
  {id:'yue',name:'陈巧倩',role:'黄枫谷弟子',place:'river',spot:[42,7],stones:110,goal:'精进修为，筹备禁地之行',publicGoal:'准备试炼',links:['bai'],color:'#78b6bd',realm:'炼气十一层',bio:'黄枫谷女弟子，有自己的修炼打算。',temperament:'谨慎，重视亲身经历'},
  {id:'tao',name:'菡云芝',role:'灵兽山弟子',place:'quarry',spot:[91,7],stones:150,goal:'在禁地中采药并平安返回',publicGoal:'寻找灵药',links:['qiao'],color:'#b4c48b',realm:'炼气期',bio:'灵兽山女弟子，也曾在太南小会上与韩立交易。',temperament:'温和，珍惜信任'},
  {id:'song',name:'向之礼',role:'黄枫谷弟子',place:'quarry',spot:[98,9],stones:95,goal:'探查禁地，隐藏自己的底细',publicGoal:'寻找修炼机缘',links:['yue'],color:'#c69e75',realm:'炼气期（表面）',bio:'同往禁地的年长弟子，看似不起眼，不轻易透露自己的来历。',temperament:'老练，深藏不露'},
  {id:'qiao',name:'钟吾',role:'灵兽山弟子',place:'quarry',spot:[116,-7],stones:200,goal:'争夺禁地灵药',publicGoal:'搜寻灵药',links:['tao'],color:'#b99a68',realm:'炼气十三层',bio:'灵兽山参与血色禁地的弟子，善用灵兽。',temperament:'警惕而重利'},
  {id:'ji',name:'南宫婉',role:'掩月宗修士',place:'ruins',spot:[144,-6],stones:85,goal:'带领同门探索禁地，设法应对妖兽',publicGoal:'探查中心区域',links:['liu'],color:'#abb9d7',realm:'炼气十三层（禁地中）',bio:'掩月宗修士，在禁地中与韩立相遇。当前所见并不等于她全部的修为。',temperament:'沉着，有自己的判断'},
  {id:'yuan',name:'雷万鹤',role:'黄枫谷结丹修士',place:'qinglan',spot:[229,9],stones:60,goal:'为宗门培育后辈，寻求合用的灵药',publicGoal:'留意门中人才',links:['gu'],color:'#c5c1ab',realm:'结丹中期',bio:'黄枫谷结丹修士，擅长雷系法术。',temperament:'看重资质与实际所得'}
];
export const FRONTIER_SITES={
  yanbao_gate:{name:'燕家堡门楼',role:'燕家堡 · 赴宴',place:'yanbao',spot:[684,5],seal:'燕',detail:'禁地归来后受邀赴燕家堡，入堡前先辨清局势。',actions:['enter_yanbao']},
  yanbao_court:{name:'燕堡血灵阵',role:'鬼灵门 · 第一章终战',place:'yanbao',spot:[704,0],seal:'阵',detail:'宴席背后暗藏血灵阵。查明王蝉的布置，击退鬼灵门少主，闯出燕家堡。',actions:['investigate_yanbao','fight_wangchan']},
  yanbao_refuge:{name:'燕堡侧院',role:'燕家堡 · 战前调息',place:'yanbao',spot:[681,11],seal:'息',detail:'远离血灵阵的侧院，可花费少量灵石调息，再准备迎战。',actions:['frontier_rest']},
  sword_trace:{name:'禁地斗法痕迹',role:'禁地 · 银剑争药',place:'ruins',spot:[148,1],seal:'剑',detail:'碎裂的法器与银剑留下的痕迹通向一名赤脚修士。先观察再决定是否交手，此事不阻拦采药主线。',actions:['sword_trace','fight_swordsman']},
  ferry:{name:'百药园入口',role:'黄枫谷 · 药园差事',place:'river',spot:[42,-6],seal:'园',detail:'接下马师兄看管药园的差事，取得安静修炼的机会。',actions:['garden_duty','examine_silver_page']},
  spring:{name:'百药园药圃',role:'黄枫谷 · 培药修行',place:'river',spot:[64,11],seal:'药',detail:'在自己的药畦留种培育筑基主药，以小绿瓶灵液催熟，成熟后亲手采收。',actions:['garden_cultivate','gather_reeds','plant_pill_herbs','harvest_pill_herbs']},
  infirmary:{name:'药园静室',role:'黄枫谷 · 炼丹与调息',place:'river',spot:[69,-11],seal:'静',detail:'按筑基丹方，将亲手培育采收的三味成熟主药炼制成丹。',actions:['refine_foundation_pill','frontier_rest']},
  ore:{name:'禁地密林',role:'血色禁地 · 外层灵药',place:'quarry',spot:[104,-11],seal:'林',detail:'紫猴花藏在密林中。搜寻要付出气血，且须先参加禁地试炼。',actions:['gather_monkey_flower']},
  workers:{name:'禁地入口',role:'血色禁地 · 七派试炼',place:'quarry',spot:[91,11],seal:'禁',detail:'七派弟子在禁制开启后入内，各自寻找筑基丹的主药。',actions:['enter_forbidden','aid_hanyunzhi','frontier_rest']},
  sluice:{name:'寒潭药坡',role:'血色禁地 · 玉髓芝',place:'quarry',spot:[119,10],seal:'芝',detail:'潭边生着玉髓芝，附近妖兽留下了痕迹。',actions:['gather_jade_mushroom']},
  archive:{name:'中心区石门',role:'血色禁地 · 中心区',place:'ruins',spot:[141,5],seal:'门',detail:'向中心区深入，与掩月宗修士相遇。',actions:['meet_nangong']},
  core:{name:'地下石殿',role:'血色禁地 · 墨蛟',place:'ruins',spot:[162,-6],seal:'蛟',detail:'与南宫婉共同应对墨蛟，取到天灵果后尽快离开禁地。',actions:['fight_mojiao']},
  memorial:{name:'禁地出口',role:'血色禁地 · 返回宗门',place:'ruins',spot:[171,11],seal:'归',detail:'带着灵药活株离开，回宗研习丹方，再自行培药炼丹。',actions:['leave_forbidden','frontier_rest']}
};
const action=(type,title,detail,cost,place,site,requires=[],extra={})=>({type,title,detail,cost,place,site,requires,campaign:true,...extra});
export const FRONTIER_ACTIONS=[
  action('huangfeng_register','入门黄枫谷','凭升仙令登记入门；已有黄枫谷身份也可登记','升仙令或黄枫谷门籍','qinglan','sect_qinglan'),
  action('learn_valley_rules','熟悉黄枫谷门规','核对差事与修炼资源的规矩，选择安静的修行去处','一次经历','qinglan','sect_qinglan',['huangfeng_register']),
  action('garden_duty','领百药园差事','接下马师兄安排的看园差事，领取修炼药材','一次经历','river','ferry',['learn_valley_rules']),
  action('inspect_garden','核对百药园药畦','分清公私药材与差事份额，整理自己的药畦','一次经历','river','ferry',['garden_duty']),
  action('prepare_cultivation_medicine','调制修炼用药','按丹方配比自有药材，准备潜修所需的用药','灵草 1 · 备药 1 旬','river','infirmary',['inspect_garden']),
  action('garden_first_retreat','百药园初次闭关','以准备好的修炼用药辅助长春功，先修至炼气十层','潜修 3～6 旬','river','spring',['prepare_cultivation_medicine']),
  action('garden_cultivate','百药园潜修','用药草炼制黄龙丹、金髓丸，潜修至炼气十一层','灵草 1 · 潜修 3～6 旬','river','spring',['garden_first_retreat']),
  action('forbidden_enlist','报名血色禁地','随李化元带领的队伍，参加七派采药试炼','炼气修士参加','qinglan','sect_qinglan',['garden_cultivate']),
  action('trial_briefing','核对禁地行前见闻','认准三味主药与中心区危险，记清进退方向','一次经历','qinglan','sect_qinglan',['forbidden_enlist']),
  action('enter_forbidden','踏入血色禁地','进入外层，搜寻筑基丹主药','一次经历','quarry','workers',['trial_briefing']),
  action('survey_forbidden','辨察禁地外层','先看清新旧痕迹与采药方向，再接近主药','一次经历','quarry','workers',['enter_forbidden']),
  action('gather_monkey_flower','采集紫猴花','取得一份筑基丹主药；收入独立的任务药囊','气血 8','quarry','ore',['survey_forbidden']),
  action('gather_jade_mushroom','采集玉髓芝','在寒潭附近取得另一份筑基丹主药','气血 8','quarry','sluice',['survey_forbidden']),
  action('aid_hanyunzhi','援手菡云芝','交出一株灵草，留下禁地中的一份交情','灵草 1 · 可选','quarry','workers',['enter_forbidden'],{optional:true}),
  action('read_stone_gate','勘察中心石门','携外层两味主药抵达石门，察看痕迹与退路','收齐外层两味主药','ruins','archive',['gather_monkey_flower','gather_jade_mushroom']),
  action('meet_nangong','相遇南宫婉','深入中心区域，与掩月宗修士共同探查石殿','收齐外层两味主药','ruins','archive',['read_stone_gate']),
  action('fight_mojiao','合力应对墨蛟','与南宫婉合力斗法，击败墨蛟后收取天灵果','回合斗法 · 气血至少 20','ruins','core',['meet_nangong'],{encounter:'story_mojiao'}),
  action('leave_forbidden','携药离开禁地','将三味主药活株带出禁地，留待自行培育','一次经历','ruins','memorial',['fight_mojiao']),
  action('enter_yanbao','赴燕家堡之约','禁地归来后前往燕家堡，探明鬼灵门介入的缘由','已离开血色禁地','yanbao','yanbao_gate',[],{thread:'yanbao'}),
  action('investigate_yanbao','察破燕堡血灵阵','辨明王蝉设下的血灵阵与撤离路线，准备正面斗法','一次经历','yanbao','yanbao_court',['enter_yanbao'],{thread:'yanbao'}),
  action('fight_wangchan','迎战鬼灵门王蝉','击退鬼灵门少主王蝉并结算战后所得，完成第一章试炼','BOSS 回合斗法 · 气血至少 20','yanbao','yanbao_court',['investigate_yanbao'],{thread:'yanbao',encounter:'wen'}),
  action('sort_trial_gains','整理禁地所得','核对三味活株与可交代的采药记录，留好自己的种苗','一次经历','qinglan','sect_qinglan',['leave_forbidden']),
  action('deliver_spirit_herbs','研习筑基丹方','核对采药记录，研习丹方，保留三味活株自行培育','三味任务主药','qinglan','sect_qinglan',['sort_trial_gains']),
  action('plant_pill_herbs','留种培育筑基主药','将三味活株栽入自己的药畦，随旬数培养；灵液可催熟','三味活株 · 小绿瓶','river','spring',['deliver_spirit_herbs']),
  action('harvest_pill_herbs','采收成熟筑基主药','亲手采收培育至成熟的紫猴花、玉髓芝、天灵果','主药生长 4/4','river','spring',['plant_pill_herbs']),
  action('prepare_alchemy','温炉核验主药','先核对成熟主药与下药次序，主药留到正式开炉才消耗','准备 1 旬','river','infirmary',['harvest_pill_herbs']),
  action('refine_foundation_pill','炼制筑基丹','按丹方消耗三味亲手培育的成熟主药，炼成一枚筑基丹','三味成熟主药','river','infirmary',['prepare_alchemy']),
  action('take_master','拜师李化元','完成筑基后，拜李化元为师并取得青元剑诀','筑基初期 · 黄枫谷弟子','qinglan','sect_qinglan'),
  action('sword_trace','察看银剑争斗','发现巨剑门赤脚大汉，可先交谈或避开争斗','无资源消耗 · 可选','ruins','sword_trace',['enter_forbidden'],{optional:true,thread:'silver_page'}),
  action('fight_swordsman','迎战赤脚大汉','亲自斗法，胜利后搜取储物袋；可逃跑后再来','实际斗法 · 可选','ruins','sword_trace',['sword_trace'],{optional:true,thread:'silver_page',encounter:'trial_swordsman'}),
  action('examine_silver_page','研究银色书页','带着所得书页返回百药园，检视其奇异花纹','银色书页 · 出禁地后','river','ferry',['fight_swordsman','leave_forbidden'],{optional:true,thread:'silver_page'}),
  action('compare_sword_pages','参悟书页关联','拜师并研习青元剑诀后，在黄枫谷核对书页线索','筑基 · 已研习青元剑诀','qinglan','sect_qinglan',['examine_silver_page','take_master'],{optional:true,thread:'silver_page'}),
  action('gather_reeds','采收药园灵草','取得 2 株灵草，共可采收 3 次','已接百药园差事','river','spring',['garden_duty'],{repeatable:true,utility:true}),
  action('frontier_rest','借静地调息','恢复最多 35 气血','灵石 8','river','infirmary',[],{repeatable:true,utility:true})
];
export const ENDINGS={};

// New chapter experiences share the existing, reachable map locations.
for(const action of FRONTIER_ACTIONS)if(FRONTIER_SITES[action.site]&&!FRONTIER_SITES[action.site].actions.includes(action.type))FRONTIER_SITES[action.site].actions.push(action.type);

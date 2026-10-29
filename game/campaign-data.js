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
  ferry:{name:'百药园入口',role:'黄枫谷 · 药园差事',place:'river',spot:[42,-6],seal:'园',detail:'接下马师兄看管药园的差事，取得安静修炼的机会。',actions:['garden_duty']},
  spring:{name:'百药园药圃',role:'黄枫谷 · 炼气修行',place:'river',spot:[64,11],seal:'药',detail:'以已有药草炼药修行；小绿瓶的秘密由你独自保管。',actions:['garden_cultivate','gather_reeds']},
  infirmary:{name:'药园静室',role:'黄枫谷 · 调息',place:'river',spot:[69,-11],seal:'静',detail:'整理丹方与行囊，休整后再踏入禁地。',actions:['frontier_rest']},
  ore:{name:'禁地密林',role:'血色禁地 · 外层灵药',place:'quarry',spot:[104,-11],seal:'林',detail:'紫猴花藏在密林中。搜寻要付出气血，且须先参加禁地试炼。',actions:['gather_monkey_flower']},
  workers:{name:'禁地入口',role:'血色禁地 · 七派试炼',place:'quarry',spot:[91,11],seal:'禁',detail:'七派弟子在禁制开启后入内，各自寻找筑基丹的主药。',actions:['enter_forbidden','aid_hanyunzhi','frontier_rest']},
  sluice:{name:'寒潭药坡',role:'血色禁地 · 玉髓芝',place:'quarry',spot:[119,10],seal:'芝',detail:'潭边生着玉髓芝，附近妖兽留下了痕迹。',actions:['gather_jade_mushroom']},
  archive:{name:'中心区石门',role:'血色禁地 · 中心区',place:'ruins',spot:[141,5],seal:'门',detail:'向中心区深入，与掩月宗修士相遇。',actions:['meet_nangong']},
  core:{name:'地下石殿',role:'血色禁地 · 墨蛟',place:'ruins',spot:[162,-6],seal:'蛟',detail:'与南宫婉共同应对墨蛟，取到天灵果后尽快离开禁地。',actions:['fight_mojiao']},
  memorial:{name:'禁地出口',role:'血色禁地 · 返回宗门',place:'ruins',spot:[171,11],seal:'归',detail:'带着灵药离开，回黄枫谷按门规交药领取筑基丹。',actions:['leave_forbidden','frontier_rest']}
};
const action=(type,title,detail,cost,place,site,requires=[],extra={})=>({type,title,detail,cost,place,site,requires,campaign:true,...extra});
export const FRONTIER_ACTIONS=[
  action('huangfeng_register','入门黄枫谷','凭升仙令登记入门；已有黄枫谷身份也可登记','升仙令或黄枫谷门籍','qinglan','sect_qinglan'),
  action('garden_duty','领百药园差事','接下马师兄安排的看园差事，领取修炼药材','一次经历','river','ferry',['huangfeng_register']),
  action('garden_cultivate','百药园潜修','用药草炼制黄龙丹、金髓丸，潜修至炼气十一层','灵草 2','river','spring',['garden_duty']),
  action('forbidden_enlist','报名血色禁地','随李化元带领的队伍，参加七派采药试炼','炼气修士参加','qinglan','sect_qinglan',['garden_cultivate']),
  action('enter_forbidden','踏入血色禁地','进入外层，搜寻筑基丹主药','一次经历','quarry','workers',['forbidden_enlist']),
  action('gather_monkey_flower','采集紫猴花','取得一份筑基丹主药；收入独立的任务药囊','气血 8','quarry','ore',['enter_forbidden']),
  action('gather_jade_mushroom','采集玉髓芝','在寒潭附近取得另一份筑基丹主药','气血 8','quarry','sluice',['enter_forbidden']),
  action('aid_hanyunzhi','援手菡云芝','交出一株灵草，留下禁地中的一份交情','灵草 1 · 可选','quarry','workers',['enter_forbidden'],{optional:true}),
  action('meet_nangong','相遇南宫婉','深入中心区域，与掩月宗修士共同探查石殿','收齐外层两味主药','ruins','archive',['gather_monkey_flower','gather_jade_mushroom']),
  action('fight_mojiao','合力应对墨蛟','与南宫婉合力斗法，击败墨蛟后收取天灵果','回合斗法 · 气血至少 20','ruins','core',['meet_nangong'],{encounter:'story_mojiao'}),
  action('leave_forbidden','携药离开禁地','将三味主药带出禁地，准备回宗交付','一次经历','ruins','memorial',['fight_mojiao']),
  action('deliver_spirit_herbs','交药领取筑基丹','向宗门交付紫猴花、玉髓芝、天灵果，领取一枚筑基丹','三味任务主药','qinglan','sect_qinglan',['leave_forbidden']),
  action('take_master','拜师李化元','完成筑基后，拜李化元为师并取得青元剑诀','筑基初期 · 黄枫谷弟子','qinglan','sect_qinglan'),
  action('gather_reeds','采收药园灵草','取得 2 株灵草，共可采收 3 次','已接百药园差事','river','spring',['garden_duty'],{repeatable:true,utility:true}),
  action('frontier_rest','借静地调息','恢复最多 35 气血','灵石 8','river','infirmary',[],{repeatable:true,utility:true})
];
export const ENDINGS={};

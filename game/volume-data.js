// 第一卷的公开舞台与行动。奖励和前置条件只在 volume.js 结算。
export const VOLUME_REGIONS = {
  qixuan: {name:'七玄门',short:'七玄门',bounds:[432,478,-19,19],entry:[436,0],color:'#51664f',description:'镜州彩霞山，山路尽头便是七玄门。少年韩立从这里踏上求生与修行之路。',risk:'江湖门派',mapPosition:[18,20]},
  shenshou: {name:'神手谷',short:'神手谷',bounds:[492,538,-19,19],entry:[496,0],color:'#4d715d',description:'墨大夫的药庐隐在竹林中。长春功、失踪的同门与一只不起眼的小瓶，逐渐改变你的命运。',risk:'药庐与隐秘',mapPosition:[50,20]},
  jiayuan: {name:'嘉元城·墨府',short:'嘉元城',bounds:[552,598,-19,19],entry:[556,0],color:'#756450',description:'墨府门庭仍在，旧日恩怨未散。一封遗书把你引向墨家的家事与解毒之物。',risk:'江湖旧债',mapPosition:[82,20]},
  tainan: {name:'太南谷',short:'太南谷',bounds:[612,658,-19,19],entry:[616,0],color:'#576d77',description:'太南小会聚集各地散修。符箓、法术与升仙令，第一次让修仙界的门径清晰起来。',risk:'散修交易',mapPosition:[50,70]}
};
const person=(id,name,role,place,spot,bio,goal,color='#a8b68e')=>({id,name,role,place,spot,bio,goal,publicGoal:goal,color,realm:'凡人',stones:40,links:[],temperament:bio});
export const VOLUME_PEOPLE = [
  person('wangjuechu','王绝楚','七玄门掌门','qixuan',[463,-6],'掌管七玄门，重视门中存续与弟子的本事。','考察新弟子，保住山门','#be9b70'),
  person('zhangtie','张铁','同门少年','shenshou',[502,8],'朴实厚道，与你一道拜入墨大夫门下。尚不明白修炼背后的代价。','与同门一起通过考验'),
  person('lifeiyu','厉飞雨','七玄门弟子','qixuan',[455,8],'性情爽快，为争一口气苦练武功。抽髓丸留下的隐患被他藏在笑容之后。','守住朋友与习武的尊严','#b8adca'),
  person('modafu','墨大夫','神手谷医师','shenshou',[522,-6],'寡言严厉，对长春功的进展格外执着；他的真实打算必须靠调查揭开。','督促弟子修炼长春功','#9aa69a'),
  person('mocaihuan','墨彩环','墨府三小姐','jiayuan',[574,8],'向往谷外天地，却被家门与身世牵住。她会记得来客是否真心相助。','打听父亲消息，照顾家人','#d1b299'),
  person('yanshi','严氏','墨府主母','jiayuan',[582,-7],'面对内外压力仍维持着墨府，谈及遗书时更看重可信的凭证。','核验遗书，安顿墨府','#a8a2c3'),
  {...person('wanxiaoshan','万小山','太南小会散修','tainan',[632,8],'热心谈起修仙门派与升仙大会，对初入修仙界的同道颇为友善。','结交同道，交流修仙见闻','#a2b8cb'),realm:'炼气期'}
];
export const VOLUME_SITES = {
  qixuan_trial:{name:'彩霞山试炼道',role:'七玄门 · 入门考核',place:'qixuan',spot:[446,-7],seal:'试',detail:'山路与绳桥考验脚力。通过考核，才有机会被门内长辈选中。',actions:['qixuan_exam','help_zhang']},
  qixuan_square:{name:'落日峰演武场',role:'七玄门 · 山门危局',place:'qixuan',spot:[469,7],seal:'武',detail:'野狼帮逼近山门。先查清金光上人的护身手段，再决定如何迎敌。',actions:['scout_jinguang','defend_qixuan','settle_qixuan']},
  valley_room:{name:'神手谷药庐',role:'神手谷 · 拜师与修行',place:'shenshou',spot:[518,-13.7],room:'shenshou:518:-14',seal:'药',detail:'墨大夫留下的无名口诀名为长春功。练功之外，留意药柜与同门的变化。',actions:['learn_medicine','study_changchun','cultivate_changchun','trace_zhang','investigate_mo','confront_mo','read_mo_letter','valley_rest']},
  valley_bottle:{name:'谷中石径',role:'神手谷 · 小绿瓶',place:'shenshou',spot:[514,8],seal:'瓶',detail:'石缝里的小瓶似乎会在月下变化。谨慎试验，别把秘密轻易告诉别人。',actions:['find_green_bottle','observe_bottle','test_green_dew']},
  mofu_letter:{name:'墨府内堂',role:'嘉元城 · 遗书与解毒',place:'jiayuan',spot:[578,-13.7],room:'jiayuan:578:-14',seal:'书',detail:'遗书是你与墨府交涉的凭据。完成交代，才能取得暖阳宝玉化解旧患。',actions:['deliver_mo_letter','cure_cold_poison']},
  tainan_fair:{name:'太南小会',role:'太南谷 · 修仙之门',place:'tainan',spot:[640,-7],seal:'会',detail:'会场以物易物。向万小山了解修仙界，再以灵草换取法术与丹方。',actions:['trade_tainan','practice_fireball','prepare_departure','probe_tainan','fight_qingwen','fight_hupinggu','tainan_rest','enter_xianmen']}
};
const step=(type,title,detail,place,target,requires=[],extra={})=>({type,title,detail,place,...(VOLUME_SITES[target]?{site:target}:{person:target}),requires,cost:'一次经历 · 无灵石消耗',volume:true,...extra});
export const VOLUME_ACTIONS = [
  step('qixuan_exam','参加七玄门考核','走完试炼山道，取得入门资格','qixuan','qixuan_trial',[],{cost:'气血 8'}),
  step('help_zhang','照应张铁','回望来时山路，照应落后的同伴','qixuan','qixuan_trial',['qixuan_exam'],{optional:true}),
  step('apprentice_mo','拜师墨大夫','与张铁一同入神手谷，接受长春功考验','shenshou','modafu',['qixuan_exam']),
  step('learn_medicine','学医辨药','先认清药性与配药规矩，再开始长春功的正式修炼','shenshou','valley_room',['apprentice_mo'],{cost:'学医 1 旬'}),
  step('study_changchun','修炼长春功','练出第一缕灵力，获得可研习的长春功册','shenshou','valley_room',['learn_medicine'],{cost:'修炼 3 旬'}),
  step('find_green_bottle','拾取小绿瓶','在谷中石径发现小瓶，秘密保管','shenshou','valley_bottle',['study_changchun']),
  step('observe_bottle','月下观察小瓶','先记录凝液变化，不贸然服用，再决定如何试验','shenshou','valley_bottle',['find_green_bottle'],{cost:'观察 1 旬'}),
  step('test_green_dew','月下试验绿液','观察凝液并试验催生药草，开启灵圃','shenshou','valley_bottle',['observe_bottle']),
  step('aid_lifeiyu','为厉飞雨配药','用催生药草帮助朋友缓解抽髓丸的伤害','qixuan','lifeiyu',['test_green_dew'],{optional:true,cost:'灵草 1'}),
  step('cultivate_changchun','秘密潜修长春功','借自有灵药稳固根基，逐步修炼至炼气四层','shenshou','valley_room',['test_green_dew'],{cost:'潜修 3～6 旬'}),
  step('trace_zhang','追寻张铁行迹','核对同门失踪前后的见闻，不把猜测当成事实','shenshou','valley_room',['cultivate_changchun']),
  step('investigate_mo','查探药庐隐情','核对药柜记录与张铁去向，掌握墨大夫的异常','shenshou','valley_room',['trace_zhang']),
  step('confront_mo','应对墨大夫危局','调查后亲自迎战墨大夫，击败并收取遗书，解开师徒暗局','shenshou','valley_room',['investigate_mo'],{cost:'独立对阵 · 胜利后取得遗书',encounter:'modafu'}),
  step('read_mo_letter','细读墨大夫遗书','核对寒毒、墨府与暖阳宝玉的线索，收束同门旧事','shenshou','valley_room',['confront_mo']),
  step('scout_jinguang','探查金光上人','从交战痕迹辨认护罩与符宝，备好破敌之策','qixuan','qixuan_square',['read_mo_letter']),
  step('defend_qixuan','解七玄门之围','亲自迎战金光上人，击破护罩；胜利后收取升仙令','qixuan','qixuan_square',['scout_jinguang'],{cost:'回合战斗 · 可疗伤与撤退',encounter:'story_jinguang'}),
  step('settle_qixuan','安顿山门旧事','为七玄门风波收尾，向故人交代去向','qixuan','qixuan_square',['defend_qixuan']),
  step('inquire_mofu','探问墨府近况','先听清墨府众人的顾虑，再说明遗书来意','jiayuan','mocaihuan',['settle_qixuan']),
  step('negotiate_mofu','与严氏商谈来意','以信物为据，说明能做到的事情与自身寒毒','jiayuan','yanshi',['inquire_mofu']),
  step('deliver_mo_letter','向墨府交付遗书','凭墨大夫遗书与严氏交涉，取得暖阳宝玉','jiayuan','mofu_letter',['negotiate_mofu']),
  step('comfort_caihuan','与墨彩环话别','把来路说明白，留下相识与告别的记忆','jiayuan','mocaihuan',['deliver_mo_letter'],{optional:true}),
  step('cure_cold_poison','以暖阳宝玉解毒','化去体内寒毒，了结墨府一段因果','jiayuan','mofu_letter',['deliver_mo_letter']),
  step('meet_wan','向万小山请教','了解灵根、修仙门派和升仙大会','tainan','wanxiaoshan',['cure_cold_poison']),
  step('learn_tainan_rules','了解小会规矩','熟悉交易分寸、结伴风险与升仙令的用途','tainan','wanxiaoshan',['meet_wan']),
  step('trade_tainan','在小会交换法术','以一株催生灵草换取火弹术与黄龙丹方','tainan','tainan_fair',['learn_tainan_rules'],{cost:'灵草 1'}),
  step('practice_fireball','演练火弹术','亲手练习凝火与收势，使新法术能用于斗法','tainan','tainan_fair',['trade_tainan'],{cost:'演练 1 旬'}),
  step('probe_tainan','辨察散修邀约','离开小会前核对青纹一行的邀请，准备应对谷外围堵','tainan','tainan_fair',['practice_fireball']),
  step('fight_qingwen','迎战青纹道士','青纹一行露出劫修本相；用已学法术与丹药应敌','tainan','tainan_fair',['probe_tainan'],{cost:'回合战斗 · 第一阵',encounter:'story_qingwen'}),
  step('fight_hupinggu','突破胡萍姑阻截','青纹败退后先整顿伤势，再突破同行劫修的阻截','tainan','tainan_fair',['fight_qingwen'],{cost:'回合战斗 · 第二阵',encounter:'story_hupinggu'}),
  step('tainan_rest','小会歇脚疗伤','在小会歇脚处恢复 35 气血，可在两阵交锋之间使用','tainan','tainan_fair',['meet_wan'],{repeatable:true}),
  step('prepare_departure','整理仙途行装','突围后休整潜修，稳固炼气九层，再决定入门去向','tainan','tainan_fair',['fight_hupinggu'],{cost:'休整潜修 3～6 旬'}),
  step('enter_xianmen','持升仙令问道','带着升仙令与新见闻，准备前往黄枫谷；第一卷完成','tainan','tainan_fair',['prepare_departure']),
  step('valley_rest','在药庐休养','不耗灵石，恢复 35 气血，可重复使用','shenshou','valley_room',['apprentice_mo'],{repeatable:true})
];
export const VOLUME_CHAPTERS = [
  {title:'一 · 七玄初入',summary:'从彩霞山入门考核开始，认识同门与江湖。',end:'qixuan_exam'},
  {title:'二 · 神手谷中',summary:'拜师墨大夫，修炼长春功，亲手发现小绿瓶。',end:'test_green_dew'},
  {title:'三 · 师徒暗局',summary:'追查张铁去向，以自己的准备应对墨大夫危局。',end:'confront_mo'},
  {title:'四 · 七玄风云',summary:'探查金光上人的手段，解围并取得升仙令。',end:'defend_qixuan'},
  {title:'五 · 墨府旧事',summary:'把遗书送到嘉元城，与墨府交涉，化去寒毒。',end:'cure_cold_poison'},
  {title:'六 · 太南问道',summary:'结识万小山、交换法术，再亲历青纹一行的围堵，认识修仙界的险恶。',end:'enter_xianmen'}
];

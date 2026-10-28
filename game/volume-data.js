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
  qixuan_square:{name:'落日峰演武场',role:'七玄门 · 山门危局',place:'qixuan',spot:[469,7],seal:'武',detail:'野狼帮逼近山门。先查清金光上人的护身手段，再决定如何迎敌。',actions:['scout_jinguang','defend_qixuan']},
  valley_room:{name:'神手谷药庐',role:'神手谷 · 拜师与修行',place:'shenshou',spot:[518,-13.7],room:'shenshou:518:-14',seal:'药',detail:'墨大夫留下的无名口诀名为长春功。练功之外，留意药柜与同门的变化。',actions:['study_changchun','investigate_mo','confront_mo','valley_rest']},
  valley_bottle:{name:'谷中石径',role:'神手谷 · 小绿瓶',place:'shenshou',spot:[514,8],seal:'瓶',detail:'石缝里的小瓶似乎会在月下变化。谨慎试验，别把秘密轻易告诉别人。',actions:['find_green_bottle','test_green_dew']},
  mofu_letter:{name:'墨府内堂',role:'嘉元城 · 遗书与解毒',place:'jiayuan',spot:[578,-13.7],room:'jiayuan:578:-14',seal:'书',detail:'遗书是你与墨府交涉的凭据。完成交代，才能取得暖阳宝玉化解旧患。',actions:['deliver_mo_letter','cure_cold_poison']},
  tainan_fair:{name:'太南小会',role:'太南谷 · 修仙之门',place:'tainan',spot:[640,-7],seal:'会',detail:'会场以物易物。向万小山了解修仙界，再以灵草换取法术与丹方。',actions:['trade_tainan','enter_xianmen']}
};
const step=(type,title,detail,place,target,requires=[],extra={})=>({type,title,detail,place,...(VOLUME_SITES[target]?{site:target}:{person:target}),requires,cost:'一次经历 · 无灵石消耗',volume:true,...extra});
export const VOLUME_ACTIONS = [
  step('qixuan_exam','参加七玄门考核','走完试炼山道，取得入门资格','qixuan','qixuan_trial',[],{cost:'气血 8'}),
  step('help_zhang','照应张铁','回望来时山路，照应落后的同伴','qixuan','qixuan_trial',['qixuan_exam'],{optional:true}),
  step('apprentice_mo','拜师墨大夫','与张铁一同入神手谷，接受长春功考验','shenshou','modafu',['qixuan_exam']),
  step('study_changchun','修炼长春功','练出第一缕灵力，获得可研习的长春功册','shenshou','valley_room',['apprentice_mo']),
  step('find_green_bottle','拾取小绿瓶','在谷中石径发现小瓶，秘密保管','shenshou','valley_bottle',['study_changchun']),
  step('test_green_dew','月下试验绿液','观察凝液并试验催生药草，开启灵圃','shenshou','valley_bottle',['find_green_bottle']),
  step('aid_lifeiyu','为厉飞雨配药','用催生药草帮助朋友缓解抽髓丸的伤害','qixuan','lifeiyu',['test_green_dew'],{optional:true,cost:'灵草 1'}),
  step('investigate_mo','查探药庐隐情','核对药柜记录与张铁去向，掌握墨大夫的异常','shenshou','valley_room',['test_green_dew']),
  step('confront_mo','应对墨大夫危局','以修行与调查所得设防，渡过夺舍危机，取得遗书','shenshou','valley_room',['investigate_mo'],{cost:'气血 12 · 剧情交锋'}),
  step('scout_jinguang','探查金光上人','从交战痕迹辨认护罩与符宝，备好破敌之策','qixuan','qixuan_square',['confront_mo']),
  step('defend_qixuan','解七玄门之围','把握护罩变化，以御剑之术破局，取得升仙令','qixuan','qixuan_square',['scout_jinguang'],{cost:'气血 10 · 剧情交锋'}),
  step('deliver_mo_letter','向墨府交付遗书','凭墨大夫遗书与严氏交涉，取得暖阳宝玉','jiayuan','mofu_letter',['defend_qixuan']),
  step('comfort_caihuan','与墨彩环话别','把来路说明白，留下相识与告别的记忆','jiayuan','mocaihuan',['deliver_mo_letter'],{optional:true}),
  step('cure_cold_poison','以暖阳宝玉解毒','化去体内寒毒，了结墨府一段因果','jiayuan','mofu_letter',['deliver_mo_letter']),
  step('meet_wan','向万小山请教','了解灵根、修仙门派和升仙大会','tainan','wanxiaoshan',['cure_cold_poison']),
  step('trade_tainan','在小会交换法术','以一株催生灵草换取火弹术与黄龙丹方','tainan','tainan_fair',['meet_wan'],{cost:'灵草 1'}),
  step('enter_xianmen','持升仙令问道','带着升仙令与新见闻，准备前往黄枫谷；第一卷完成','tainan','tainan_fair',['trade_tainan']),
  step('valley_rest','在药庐休养','不耗灵石，恢复 35 气血，可重复使用','shenshou','valley_room',['apprentice_mo'],{repeatable:true})
];
export const VOLUME_CHAPTERS = [
  {title:'一 · 七玄初入',summary:'从彩霞山入门考核开始，认识同门与江湖。',end:'qixuan_exam'},
  {title:'二 · 神手谷中',summary:'拜师墨大夫，修炼长春功，亲手发现小绿瓶。',end:'test_green_dew'},
  {title:'三 · 师徒暗局',summary:'追查张铁去向，以自己的准备应对墨大夫危局。',end:'confront_mo'},
  {title:'四 · 七玄风云',summary:'探查金光上人的手段，解围并取得升仙令。',end:'defend_qixuan'},
  {title:'五 · 墨府旧事',summary:'把遗书送到嘉元城，与墨府交涉，化去寒毒。',end:'cure_cold_poison'},
  {title:'六 · 太南问道',summary:'结识万小山，交换法术，从江湖走向修仙界。',end:'enter_xianmen'}
];

export const FRONTIER_PEOPLE = [
  { id:'yue', name:'越青舟', role:'云渡船主', place:'river', spot:[42,7], stones:110, goal:'让渡河重新通航，查清失踪药船的去向', publicGoal:'寻找断流原因', links:['tao','ning'], color:'#78b6bd', realm:'炼气八层', bio:'空渡船系在浅滩。他认得每一趟药船，却不肯替商盟隐瞒空缺的货单。', temperament:'直率、顾念渡口生计，对愿意查证的人有耐心' },
  { id:'tao', name:'陶晚', role:'河谷医修', place:'river', spot:[65,-8], stones:150, goal:'救治矿工，以河水和矿样查清枯脉病', publicGoal:'寻找治病药引', links:['bai','song'], color:'#b4c48b', realm:'炼气圆满', bio:'药箱里只剩半卷丹方。她不愿用一个人的命去换另一个人的突破。', temperament:'重视生命与证据，会向可信的游历者求助' },
  { id:'song', name:'宋砚', role:'矿工领班', place:'quarry', spot:[91,7], stones:95, goal:'护住矿工，修好废弃分流闸，不让矿场被一封了之', publicGoal:'保住工棚众人', links:['tao','qiao'], color:'#c69e75', realm:'炼气九层', bio:'掌心嵌着洗不掉的赤砂。他知道矿机有问题，也知道停工后大家拿什么活。', temperament:'务实、护短，受过帮助会报答，但不接受空口许诺' },
  { id:'qiao', name:'乔衡', role:'商盟监工', place:'quarry', spot:[116,-7], stones:200, goal:'保住矿契和商路，控制抽脉证据外流', publicGoal:'维持矿场经营', links:['shen','song'], color:'#b99a68', realm:'筑基初期', bio:'账册记着每个人的工钱，也记着上缴宗门的灵石。他认为断矿会让更多人活不下去。', temperament:'精于计算，愿用条件交换合作，害怕失去经营权' },
  { id:'ji', name:'纪霜', role:'遗府守契人', place:'ruins', spot:[144,-6], stones:85, goal:'让来者看清旧约代价，再决定灵枢归属', publicGoal:'守护古契', links:['yuan'], color:'#abb9d7', realm:'筑基中期', bio:'她不是古府的主人，只是最后一位守契人的后裔。她既守门，也等待有人能提出新的答案。', temperament:'寡言、重誓约，会考察证据与行动，不盲从祖训' },
  { id:'yuan', name:'元照', role:'旧宗记录官', place:'ruins', spot:[165,9], stones:60, goal:'保存归墟旧史，让牺牲者的名字不再被抹去', publicGoal:'守住旧史', links:['ji','lu'], color:'#c5c1ab', realm:'炼气圆满', bio:'玉简里的姓名比功法更令他在意。他会提供解读，也会质疑以大局为名的牺牲。', temperament:'记忆敏锐，珍惜真实记录，反对毁掉所有证据' }
];
export const FRONTIER_SITES = {
  ferry: { name:'搁浅渡口', role:'云渡 · 失踪药船', place:'river', spot:[42,-6], seal:'舟', detail:'旧货单的收货地不是坊市，而是赤砂矿场。泥滩里还能找到船只停靠的刻痕。', actions:['read_manifest'] },
  spring: { name:'枯泉药田', role:'云渡 · 调查与采集', place:'river', spot:[64,11], seal:'泉', detail:'泉眼已经断流，残存的月露草却仍保有生机。可留取水样与药草。', actions:['sample_water','gather_reeds'] },
  infirmary: { name:'回澜药庐', role:'云渡 · 炼丹与歇脚', place:'river', spot:[69,-11], seal:'药', detail:'炉中留着一份替代丹方。即使错失坊市筑基丹，也能凭药草与赤砂灵矿重开道途。', actions:['brew_trace_pill','frontier_rest'] },
  ore: { name:'赤砂矿脉', role:'矿场 · 灵矿与证据', place:'quarry', spot:[104,-11], seal:'矿', detail:'矿壁上的阵纹向东延伸。凿取灵矿会损伤气血，普通灵矿可以留作修闸或开府。', actions:['inspect_vein','mine_ore'] },
  workers: { name:'风尘工棚', role:'矿场 · 矿工与补给', place:'quarry', spot:[91,11], seal:'棚', detail:'灵草能压住矿尘引发的旧伤，工棚还保留着废弃水闸的修理图。', actions:['aid_workers','frontier_rest'] },
  sluice: { name:'分流旧闸', role:'矿场 · 河谷命脉', place:'quarry', spot:[119,10], seal:'闸', detail:'换上两块灵矿，再用灵草过滤赤尘，可以让河谷恢复一股细流。', actions:['repair_sluice'] },
  archive: { name:'归墟石门', role:'遗府 · 旧契入口', place:'ruins', spot:[141,5], seal:'门', detail:'门锁认得河谷与矿场的两份实证。补足阵源，或取得守契人的援助，便可进入灵枢。', actions:['open_archive'] },
  core: { name:'万息灵枢', role:'遗府 · 本卷抉择', place:'ruins', spot:[162,-6], seal:'枢', detail:'古府从地脉收集灵气，也在夺走河谷的生机。先读取旧契，再决定归还、承包或封存。', actions:['read_core','restore_flow','lease_core','seal_core'] },
  memorial: { name:'无名碑林', role:'遗府 · 旧史与休憩', place:'ruins', spot:[171,11], seal:'碑', detail:'每一道刻痕都是曾为古府供息的人。碑林仍留有供游历者调息的静地。', actions:['read_names','frontier_rest'] }
};
const action=(type,title,detail,cost,place,site)=>({type,title,detail,cost,place,site,campaign:true});
export const FRONTIER_ACTIONS = [
  action('read_manifest','查验旧货单','取得药船与矿场有关的实证','首次调查','river','ferry'),
  action('sample_water','留取枯泉水样','确认断流并非自然枯水','首次调查','river','spring'),
  action('gather_reeds','采集月露草','收入 2 株灵草；河谷共可采 3 次','无资源消耗','river','spring'),
  action('brew_trace_pill','炼制归脉丹','坊市机缘失去后仍可筑基，须掌握河谷与矿场实证','灵草 3 · 灵矿 2 · 灵石 80','river','infirmary'),
  action('frontier_rest','借静地调息','恢复最多 35 气血；新区域都有歇脚处','灵石 8','river','infirmary'),
  action('inspect_vein','辨认抽脉阵纹','取得赤砂矿场与遗府有关的实证','首次调查','quarry','ore'),
  action('mine_ore','开采赤砂灵矿','获得 2 块灵矿；共 6 次矿层，气血至少 20','气血 8','quarry','ore'),
  action('aid_workers','为工棚配药','减轻矿工病痛，获得修闸图与信任','灵草 2 · 一次援助','quarry','workers'),
  action('repair_sluice','修复分流旧闸','让河谷恢复支流，保留后续三种抉择','灵矿 2 · 灵草 1','quarry','sluice'),
  action('open_archive','开启归墟石门','需货单/水样/矿纹中的任意两份实证；守契援助可代替灵矿','灵矿 2 或人物援助','ruins','archive'),
  action('read_core','读取万息旧契','揭开断流与坊市丹药的真正联系','石门已开启','ruins','core'),
  action('read_names','拓印无名碑','保存供息者姓名，为结局留下另一份证词','石门已开启','ruins','memorial'),
  action('restore_flow','归还地脉','小绿瓶辅助导流；获回春玉简、灵草 4、府库灵石 60、声望 +12','小绿瓶 · 灵矿 2 · 灵草 2 · 本卷结局','ruins','core'),
  action('lease_core','承下灵枢矿契','保留集中抽脉；获赤炎剑、府库灵石 140，声望 -8','灵矿 2 · 本卷结局','ruins','core'),
  action('seal_core','封存万息灵枢','停止抽脉但药田仍需恢复；获惊雷真解、府库灵石 90、声望 +4','天雷符 1 · 气血 20 · 本卷结局','ruins','core')
];
export const ENDINGS = {
  restore: { title:'一河新生', text:'古瓶的灵液引出一线活水，万息灵枢重新向地脉归还灵气。河谷开始复苏，矿场却必须寻找新的生计。你没有让所有人满意，但终于让枯潮停下。' },
  lease: { title:'掌灯之人', text:'你接过矿契，以灵矿稳定灵枢。商路与丹炉得以继续，河谷仍在承受代价。如今控制阀门的人是你，下一次短缺也会成为你的责任。' },
  seal: { title:'万息长寂', text:'天雷符切断旧阵，万息灵枢沉入长寂。抽脉停止，库存丹药也随之成为绝响。没有人能再借它夺取生机，但治病与修行仍需要新的路。' }
};

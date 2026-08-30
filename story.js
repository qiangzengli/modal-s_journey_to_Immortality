export const PORTRAITS = {
  韩立: './assets/generated/hanli.png',
  墨大夫: './assets/generated/modafu.png',
  墨彩环: './assets/generated/mocaihuan.png'
};

export const STORY = [
  {
    id: 'entrance-test', title: '山门试炼', location: '七玄门山门', objective: '前往山门，与七玄门执事交谈', target: 'examiner', prompt: '参加考核', realm: '凡人', party: [['韩立', '少年']],
    dialogue: [['七玄门执事', '想入七玄门，先过山道与根骨两关。资质不是唯一，心性也很重要。'], ['张铁', '韩立，我们一起坚持到最后。'], ['韩立', '既然已经来到这里，就不能空手回去。']], reward: '通过入门考核'
  },
  {
    id: 'meet-doctor', title: '神手谷拜师', location: '神手谷', objective: '与墨大夫交谈，成为记名弟子', target: 'modafu', prompt: '拜见师父', realm: '凡人', party: [['韩立', '记名弟子'], ['张铁', '同门']],
    dialogue: [['墨大夫', '你与张铁各有所长。今后留在神手谷，按我的法门修习。'], ['韩立', '弟子记下了。'], ['墨大夫', '这册长春功不可外传，修炼进度也要如实禀报。']], reward: '获得功法：长春功'
  },
  {
    id: 'cultivate', title: '长春功', location: '神手谷药园', objective: '前往修炼台，运转长春功', target: 'altar', prompt: '开始修炼', realm: '炼气期一层', party: [['韩立', '记名弟子'], ['张铁', '同门']],
    dialogue: [['韩立', '这门功法与寻常内功截然不同，气息运转后，五感也更加敏锐。'], ['系统', '灵力完成第一次周天运转。'], ['韩立', '墨大夫如此在意修炼进度，背后恐怕另有缘故。']], reward: '境界提升：炼气期一层'
  },
  {
    id: 'green-bottle', title: '神秘小瓶', location: '神手谷药园', objective: '查看夜间出现异象的绿色小瓶', target: 'bottle', prompt: '拾取小瓶', realm: '炼气期一层', party: [['韩立', '独自行动']],
    dialogue: [['韩立', '此瓶能够凝聚绿液，还能催熟草药。'], ['韩立', '在弄清它的来历之前，绝不能让任何人知道。'], ['系统', '掌天瓶功能解锁：灵药催熟。']], reward: '获得关键道具：神秘小瓶'
  },
  {
    id: 'li-feiyu', title: '厉飞雨之约', location: '七玄门演武场', objective: '找到厉飞雨，交换药物与情报', target: 'lifeiyu', prompt: '交谈', realm: '炼气期一层', party: [['韩立', '药园弟子'], ['厉飞雨', '暂时同行']],
    dialogue: [['厉飞雨', '你给的药很管用。以后在门中遇到麻烦，可以报我的名字。'], ['韩立', '我只需要你替我留意神手谷和张铁的消息。'], ['厉飞雨', '成交。你这人年纪不大，做事倒比谁都谨慎。']], reward: '厉飞雨成为剧情盟友'
  },
  {
    id: 'zhang-tie-missing', title: '失踪的张铁', location: '神手谷偏院', objective: '调查张铁留下的痕迹', target: 'letter', prompt: '调查痕迹', realm: '炼气期二层', party: [['韩立', '独自调查']],
    dialogue: [['韩立', '张铁没有下山。他最后出现的地方，仍然是神手谷。'], ['韩立', '墨大夫的说辞漏洞越来越多，我必须提前准备解毒与保命手段。'], ['系统', '获得线索：密室药味、残破衣物、陌生脚印。']], reward: '主线线索更新'
  },
  {
    id: 'confrontation', title: '墨大夫的真意', location: '神手谷密室', objective: '赴约进入密室，面对墨大夫', target: 'modafu', prompt: '进入密室', realm: '炼气期三层', party: [['韩立', '独自应战']],
    dialogue: [['墨大夫', '你修炼得比我预想中更快，老夫这些年的等待总算没有白费。'], ['韩立', '张铁去了哪里？你传我长春功，又到底为了什么？'], ['墨大夫', '知道得太多已经没有意义，把你的身体交出来吧。']], battle: { enemy: '墨大夫', hp: 160, attack: 15, portrait: './assets/generated/modafu.png' }
  },
  {
    id: 'last-letter', title: '墨大夫遗书', location: '神手谷密室', objective: '检查墨大夫留下的遗物与书信', target: 'letter', prompt: '阅读遗书', realm: '炼气期三层', party: [['韩立', '独自行动']],
    dialogue: [['韩立', '墨大夫已经身死，但余子童与修仙界的秘密才刚刚显露。'], ['系统', '书信提到了嘉元城墨府，以及需要交还给墨家的信物。'], ['韩立', '这一趟必须去。既是了结因果，也能借机确认书信中隐藏的内容。']], reward: '解锁目的地：嘉元城墨府'
  },
  {
    id: 'arrive-mo-estate', title: '夜入墨府', location: '嘉元城墨府', objective: '找到墨府并表明来意', target: 'mocaihuan', prompt: '登门拜访', realm: '炼气期三层', party: [['韩立', '墨府来客'], ['墨彩环', '剧情同行']], scene: 'mofu',
    dialogue: [['墨彩环', '你就是父亲信中提到的韩立？墨府如今局势混乱，不能轻信外人。'], ['韩立', '信物和书信都在这里。是真是假，看过以后自然明白。'], ['墨彩环', '跟我来，母亲和姐姐正在内院等你。']], reward: '进入墨府内院'
  },
  {
    id: 'mo-estate-crisis', title: '墨府危局', location: '墨府内院', objective: '击退闯入墨府的惊蛟会高手', target: 'gangmaster', prompt: '迎战', realm: '炼气期三层', party: [['韩立', '主战'], ['墨彩环', '剧情援护']], scene: 'mofu',
    dialogue: [['惊蛟会高手', '墨府已经失去靠山，交出信物还能留你们一命。'], ['韩立', '受人所托，至少要把该说的话带到。'], ['墨彩环', '韩公子，小心！']], battle: { enemy: '惊蛟会高手', hp: 120, attack: 12, portrait: './assets/generated/gangmaster.png' }
  },
  {
    id: 'decode-letter', title: '遗言真相', location: '墨府书房', objective: '与墨彩环共同解读书信和信物', target: 'letter', prompt: '解读书信', realm: '炼气期三层', party: [['韩立', '主角'], ['墨彩环', '剧情同行']], scene: 'mofu',
    dialogue: [['墨彩环', '父亲在信里承认了自己的选择，也为墨府留下了最后安排。'], ['韩立', '我能做的只有将遗物送到。往后的路，墨家还要自己走。'], ['系统', '墨大夫事件的全部线索已经解读。']], reward: '完成墨大夫遗愿'
  },
  {
    id: 'farewell', title: '仙凡之别', location: '墨府别院', objective: '在离开前与墨彩环告别', target: 'mocaihuan', prompt: '告别', realm: '炼气期三层', party: [['韩立', '即将启程'], ['墨彩环', '最后同行']], scene: 'mofu',
    dialogue: [['墨彩环', '韩公子，你还会回来吗？'], ['韩立', '修仙之路没有归期。墨姑娘，照顾好自己。'], ['墨彩环', '那便珍重。至少这一程，我会记得。'], ['系统', '第一章完成：七玄门与墨府。新的修仙世界已经向韩立展开。']], reward: '第一章完成', complete: true
  }
];

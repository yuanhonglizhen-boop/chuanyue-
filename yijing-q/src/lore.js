// 考据资料。凡引原文都注明出处；游戏玩法是本作原创改编，界面中明确标注，不冒充古籍原意。
// 爻序：自下而上，依次称初、二、三（三画卦）。1 = 阳爻（—），0 = 阴爻（- -）。

export const TRIGRAMS={
  qian:{name:'乾',lines:[1,1,1],image:'天',song:'乾三连',dir:'西北'},
  kun:{name:'坤',lines:[0,0,0],image:'地',song:'坤六断',dir:'西南',dirNote:'《说卦传》未直言坤之方位，西南为后世通行之说'},
  zhen:{name:'震',lines:[1,0,0],image:'雷',song:'震仰盂',dir:'东'},
  xun:{name:'巽',lines:[0,1,1],image:'风',song:'巽下断',dir:'东南'},
  kan:{name:'坎',lines:[0,1,0],image:'水',song:'坎中满',dir:'北'},
  li:{name:'离',lines:[1,0,1],image:'火',song:'离中虚',dir:'南'},
  gen:{name:'艮',lines:[0,0,1],image:'山',song:'艮覆碗',dir:'东北'},
  dui:{name:'兑',lines:[1,1,0],image:'泽',song:'兑上缺',dir:'西'},
};

export const SOURCES={
  shuogua:'《周易·说卦传》',
  song:'朱熹《周易本义》卷首《八卦取象歌》',
  tuan:'《周易》卦辞',
  xiang:'《周易·象传》（大象）',
};

// 每一境的考据卡片
export const LORE={
  kan:{
    trigram:'kan',hexagram:'坎为水（第二十九卦，又称"习坎"）',
    quotes:[
      {text:'坎为水。',src:SOURCES.shuogua},
      {text:'坎者，水也，正北方之卦也。',src:SOURCES.shuogua},
      {text:'坎中满。',src:SOURCES.song,note:'上下两爻为阴，中间一爻为阳'},
      {text:'习坎：有孚，维心亨，行有尚。',src:SOURCES.tuan},
      {text:'水洊至，习坎。君子以常德行，习教事。',src:SOURCES.xiang},
    ],
    rule:'本境玩法（原创）：三座爻台自下而上对应初、二、三爻。跳上爻台可在阴、阳之间切换，排成坎卦，水上石桥便会升起。',
  },
  li:{
    trigram:'li',hexagram:'离为火（第三十卦）',
    quotes:[
      {text:'离为火。',src:SOURCES.shuogua},
      {text:'离也者，明也，万物皆相见，南方之卦也。',src:SOURCES.shuogua},
      {text:'离中虚。',src:SOURCES.song,note:'上下两爻为阳，中间一爻为阴'},
      {text:'离：利贞，亨。畜牝牛，吉。',src:SOURCES.tuan},
      {text:'明两作，离。大人以继明照于四方。',src:SOURCES.xiang},
    ],
    rule:'本境玩法（原创）：三座火台自下而上对应初、二、三爻。点燃记为阳爻，熄灭记为阴爻。从火塘取火，送到火台上点燃；按 E 可盖灭火台。落水、或火苗在路上烧尽，就要回火塘重新取火。',
  },
};

export const ABOUT={
  title:'关于考据',
  body:[
    '八卦取象依《说卦传》：乾为天、坤为地、震为雷、巽为风、坎为水、离为火、艮为山、兑为泽。这八句在原文中分见各节，不是连续的一段话；巽一节原文作"巽为木，为风"。',
    '八卦方位依《说卦传》"帝出乎震"一节，即通常所说的后天八卦方位：震东、巽东南、离南、兑西（原文作"正秋"）、乾西北、坎北、艮东北；坤西南为后世通行之说。',
    '卦画自下而上读，爻位依次称初、二、三。',
    '爻台切换、点火为阳等，都是本作为了好玩而设计的原创规则，并非古籍中的占法或仪轨。',
  ],
};

// 后天八卦方位（用于世界地图），角度：北为上
export const WORLD_ORDER=['kan','gen','zhen','xun','li','kun','dui','qian'];// 自北起顺时针：北、东北、东、东南、南、西南、西、西北

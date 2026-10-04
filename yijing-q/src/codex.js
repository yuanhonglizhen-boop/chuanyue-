// 图鉴：入门级知识卡。每张卡：拼音、一句话白话、口诀/要点、原文（注明出处）、在游戏里的对应。
// 原文只引有把握的句子；没有可靠古籍出处的卡片明确写"无古籍引文"。
export const CODEX=[
  {id:'kan',group:'卦',title:'坎',pinyin:'kǎn',lines:[0,1,0],
    one:'坎代表水。上下两条断开、中间一条连着——像两岸之间流着的河水。',
    key:'口诀：坎中满',
    quotes:[{t:'坎为水。',s:'《周易·说卦传》'},{t:'坎中满。',s:'朱熹《周易本义》卷首《八卦取象歌》'}],
    game:'第一境：跳上爻台排出坎卦，水中的石桥就升起来了。',hint:'在第一境读石碑或解开坎卦'},
  {id:'li',group:'卦',title:'离',pinyin:'lí',lines:[1,0,1],
    one:'离代表火，也代表光明。上下两条连着、中间一条断开。',
    key:'口诀：离中虚',
    quotes:[{t:'离为火。',s:'《周易·说卦传》'},{t:'离也者，明也，万物皆相见，南方之卦也。',s:'《周易·说卦传》'}],
    game:'第二境：点燃火台为阳、熄灭为阴，排出离卦。',hint:'在第二境读石碑或解开离卦'},
  {id:'jiji',group:'卦',title:'既济',pinyin:'jì jì',lines:[1,0,1,0,1,0],
    one:'第六十三卦。坎在上、离在下，"水在火上"。六爻阴阳相间，每一爻都在合适的位置上。',
    key:'要点：事情办成之后，更要提前防备出乱子',
    quotes:[{t:'既济：亨小，利贞。初吉终乱。',s:'《周易》既济卦辞'},{t:'水在火上，既济。君子以思患而豫防之。',s:'《周易·象传》'}],
    game:'第三境：把六块爻块放进当位的爻座，再化解"终乱"的三处乱子。',hint:'通过第三境'},
  {id:'weiji',group:'卦',title:'未济',pinyin:'wèi jì',lines:[0,1,0,1,0,1],
    one:'第六十四卦，也是最后一卦。离在上、坎在下，"火在水上"，正好和既济倒过来，六爻都不在合适的位置。',
    key:'要点：《周易》不以"完成"结尾，而以"未完成"结尾',
    quotes:[{t:'火在水上，未济。君子以慎辨物居方。',s:'《周易·象传》'},{t:'物不可穷也，故受之以未济终焉。',s:'《周易·序卦传》'}],
    game:'第三境最高处的云上祭坛，把卦翻过来就是未济。',hint:'找到第三境的秘密祭坛'},
  {id:'yaowei',group:'知识',title:'爻位',pinyin:'yáo wèi',
    one:'卦画要从下往上读。三画的卦，三条爻依次叫"初、二、三"；六画的卦叫"初、二、三、四、五、上"。',
    key:'要点：最下面的一爻叫"初"，最上面的叫"上"',
    quotes:[{t:'《周易》爻辞以"初九""九二"……"上九"（阳爻）、"初六""六二"……"上六"（阴爻）标明每一爻的位置。',s:'据《周易》经文爻题'}],
    game:'爻台和火台上的"初、二、三"，就是爻位。',hint:'第一次切换爻台'},
  {id:'dangwei',group:'知识',title:'当位',pinyin:'dāng wèi',
    one:'六爻里，初、三、五是"阳位"，二、四、上是"阴位"。阳爻在阳位、阴爻在阴位，叫"当位"。',
    key:'要点：既济六爻全部当位，未济六爻全部不当位',
    quotes:[{t:'刚柔正而位当也。',s:'《周易》既济《彖传》'}],
    game:'第三境：阳爻块要放初、三、五位，阴爻块要放二、四、上位，放错会提示"不当位"。',hint:'在第三境往爻座上放爻块'},
  {id:'wuyin',group:'知识',title:'五音',pinyin:'gōng shāng jué zhǐ yǔ',
    one:'宫、商、角、徵、羽是中国传统的五个音，大致相当于 do、re、mi、sol、la。本作的音乐全用这五个音写成。',
    key:'要点：古人把五音和四季、五行对应起来',
    quotes:[{t:'孟冬之月……其音羽。……盛德在水。',s:'《礼记·月令》'},{t:'孟夏之月……其音徵。……盛德在火。',s:'《礼记·月令》'}],
    game:'第一境（水）的音乐以"羽"为主音，第二境（火）以"徵"为主音。',hint:'通过第一境'},
  {id:'c-yao',group:'角色',title:'爻爻 · 玉',pinyin:'yáo yáo',char:'yao',
    one:'玉做的小团子。古人认为玉温润而有光泽，常拿玉来比喻君子的品德。',
    key:'',quotes:[{t:'夫昔者，君子比德于玉焉：温润而泽，仁也。',s:'《礼记·聘义》'}],game:'默认角色。',hint:'默认解锁'},
  {id:'c-nuo',group:'角色',title:'糯糯 · 玉兔',pinyin:'nuò nuò',char:'nuo',
    one:'糯米团子做的小兔子。古人想象月亮里有一只捣药的白兔，后来常称"玉兔"。',
    key:'',quotes:[{t:'月中何有？白兔捣药。',s:'晋·傅玄《拟天问》'}],game:'可选角色。',hint:'在标题页选择糯糯'},
  {id:'c-lin',group:'角色',title:'麟麟 · 麒麟',pinyin:'lín lín',char:'lin',
    one:'软糖做的小麒麟。麒麟是古人心目中的瑞兽，被称为"仁兽"。',
    key:'',quotes:[{t:'麟者，仁兽也。',s:'《春秋公羊传·哀公十四年》'}],game:'可选角色。',hint:'在标题页选择麟麟'},
  {id:'c-koi',group:'角色',title:'鲤鲤 · 锦鲤',pinyin:'lǐ lǐ',char:'koi',
    one:'果冻做的小锦鲤。锦鲤颜色鲜艳，是人们喜爱的观赏鱼；"鲤鱼跳龙门"是流传很广的民间传说。',
    key:'',quotes:[],noQuote:'此卡无古籍引文。',game:'可选角色。',hint:'在标题页选择鲤鲤'},
];

// 存档：只用于本机，读写失败时游戏照常运行。
// 在小红书小工具里，启动脚本（minitool/boot.js）会先用容器的 Storage 读出存档放进 window.__YQ_SAVE_JSON，
// 写存档时同时写容器 Storage（9.46+）与浏览器本地存储；普通网页里这两项都不存在，只用浏览器本地存储。
const KEY='yijing-q-save-v1';
function readRaw(){if(typeof window!=='undefined'&&typeof window.__YQ_SAVE_JSON==='string')return window.__YQ_SAVE_JSON;try{return localStorage.getItem(KEY);}catch{return null;}}
export function loadSave(){try{const s=JSON.parse(readRaw()||'{}');return {codex:s.codex||['c-yao'],stars:s.stars||{},best:s.best||{},char:s.char||'yao',challenge:!!s.challenge,music:s.music!==false,sfx:s.sfx!==false};}catch{return {codex:['c-yao'],stars:{},best:{},char:'yao',challenge:false,music:true,sfx:true};}}
export function writeSave(s){let json;try{json=JSON.stringify(s);}catch{return;}
  if(typeof window!=='undefined'){window.__YQ_SAVE_JSON=json;const store=window.__YQ_STORE;if(store){try{const r=store.setStorage({key:KEY,data:json});if(r&&r.catch)r.catch(()=>{});}catch{}}}
  try{localStorage.setItem(KEY,json);}catch{}}

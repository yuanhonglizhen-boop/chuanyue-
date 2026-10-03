import * as THREE from '../../vendor/three.module.js';
import {corridor,DIRS,TRI,dirMarks} from './r2.js';
import {trigramTex,glyphTex} from '../textures.js';

// 第三间 · 后天室：学后天八卦方位（《说卦传》"帝出乎震"一节）。
// 第一步「依文点灯」：八盏铜灯摆在后天方位上，灯前挂着卦牌。照原文的卦名次序（震巽离坤兑乾坎艮）点亮，点错全灭。
//   点完会看到：八卦从东起，顺着绕了一圈——这就是后天方位，是自己看出来的。
// 第二步「阁主三问」：卦牌翻面隐去，阁主问三题，点对应方位的灯作答（坎在何方；先天乾在南，后天在哪；先天离在东，后天在哪）。
// 坤的方位《说卦传》没有明说，所以题目避开坤。
export const R3={cx:0,cz:-25,w:11,d:11,h:4.6};
const ORDER=[2,1,0,7,6,5,4,3];// 原文次序对应的方位编号（见 r2.DIRS）：东、东南、南、西南、西、西北、北、东北
const GUA=['震','巽','离','坤','兑','乾','坎','艮'];// 原文次序
const GUA_AT=['离','巽','震','艮','坎','乾','兑','坤'];// 每个方位上的卦（后天）：南离 东南巽 东震 东北艮 北坎 西北乾 西兑 西南坤
const QUIZ=[
  {q:'坎在何方？点亮那盏灯。',k:4,ok:'对。"坎者，水也，正北方之卦也。"'},
  {q:'先天八卦里，乾在正南。到了后天，乾移到了哪里？点亮那盏灯。',k:5,ok:'对。"乾，西北之卦也。"先天乾南，后天乾西北。'},
  {q:'先天八卦里，离在正东。到了后天，离在何方？点亮那盏灯。',k:0,ok:'对。"离也者，明也……南方之卦也。"先天离东，后天离南。'}];

export function buildRoom3(ctx){
  const {world:W,sfx}=ctx;const T=THREE,{cx,cz}=R3;
  W.room({...R3,doors:[{side:'s',at:0,width:1.8},{side:'n',at:0,width:1.8}],floor:'wood'});
  corridor(W,-18,-19.5);
  W.plaque('后天',0,3.75,cz+5.38,Math.PI,{w:2.2,h:.58});
  W.rug(cx,cz,3.4,3.4);
  W.lantern(cx-3,3.6,cz+3,{intensity:3});W.lantern(cx+3,3.6,cz-3,{intensity:3});
  dirMarks(W,ctx,cx,cz,4.6);

  // ---------- 八盏铜灯（后天方位），灯前挂卦牌 ----------
  const lamps=DIRS.map((dir,k)=>{const a=k*Math.PI/4,x=cx+Math.sin(a)*3.7,z=cz+Math.cos(a)*3.7,gua=GUA_AT[k];
    const g=new T.Group();g.position.set(x,0,z);W.root.add(g);
    W.mesh(new T.CylinderGeometry(.26,.32,.1,10),W.M.bronze,0,.05,0,g);W.mesh(new T.CylinderGeometry(.05,.06,1.15,10),W.M.bronze,0,.62,0,g);
    W.mesh(new T.CylinderGeometry(.24,.12,.12,12),W.M.bronze,0,1.24,0,g);
    const shade=W.mesh(new T.CylinderGeometry(.2,.24,.42,12,1,true),new T.MeshStandardMaterial({color:'#e8d6ad',emissive:'#ffb050',emissiveIntensity:0,roughness:.8,side:T.DoubleSide,transparent:true,opacity:.9}),0,1.52,0,g);
    shade.userData.noInk=true;/* 水墨下也保留灯罩的暖光，点亮才看得出 */
    W.mesh(new T.TorusGeometry(.22,.015,6,20),W.M.gold,0,1.74,0,g).rotation.x=Math.PI/2;
    // 卦牌：挂在灯柱朝屋心的一面，正反都画
    const card=new T.Group();card.position.set(0,.78,0);card.rotation.y=a+Math.PI;g.add(card);
    const faceMat=new T.MeshStandardMaterial({map:trigramTex(TRI[gua],{name:gua}),roughness:.4});
    const blankMat=new T.MeshStandardMaterial({map:glyphTex('？',{bg:'#1a1410',fg:'#6a5a40',size:120}),roughness:.4});
    W.mesh(new T.BoxGeometry(.46,.58,.04),W.M.gold,0,0,.1,card);
    const faces=[W.mesh(new T.PlaneGeometry(.4,.5),faceMat,0,0,.125,card),W.mesh(new T.PlaneGeometry(.4,.5),faceMat,0,0,.075,card)];faces[1].rotation.y=Math.PI;
    const blanks=[W.mesh(new T.PlaneGeometry(.4,.5),blankMat,0,0,.126,card),W.mesh(new T.PlaneGeometry(.4,.5),blankMat,0,0,.074,card)];blanks[1].rotation.y=Math.PI;blanks.forEach(m=>m.visible=false);
    const light=new T.PointLight('#ffb35c',0,5.5,1.8);light.position.y=1.55;g.add(light);
    W.addCyl(x,z,.34,'lamp');
    const L={k,dir,gua,group:g,shade,light,faces,blanks,lit:false,glow:0};
    W.interact(g,{get label(){return quiz<0?'铜灯 · '+gua:'铜灯（'+dir+'）';},range:2.8,enabled:()=>!ctx.flag('lamps'),onClick:()=>press(L)});return L;});

  /* 按游戏时间计时（暂停、测试推进时都一致） */
  const timers=[];const later=(sec,fn)=>timers.push({t:sec,fn});
  let step=0,resetIn=0,quiz=-1;// quiz = -1 第一步；0..2 第几问；3 全部答完
  function press(L){
    if(quiz<0){if(L.lit)return;
      if(L.k===ORDER[step]){L.lit=true;step++;sfx.toggle(true);
        if(step===8){ctx.setFlag('lamps1');ctx.milestone(6);sfx.solve();ctx.unlockNote('houtian');
          ctx.toast('八灯次第而明。看：从东边的震起，顺着绕了一圈，到东北的艮——这就是后天八卦的方位。',7000);
          later(2.6,()=>startQuiz(0));}}
      else{L.lit=true;resetIn=.3;step=0;sfx.wrong();ctx.toast('次序不对，灯都灭了。从「震」重新开始。');}
      return;}
    if(quiz>2)return;
    const Q=QUIZ[quiz];
    if(L.k===Q.k){L.lit=true;sfx.unlock_();ctx.toast(Q.ok,5000);ctx.setFlag('quiz'+(quiz+1));
      if(quiz===2){quiz=3;ctx.setQuest(null);finish();}else later(1.8,()=>startQuiz(quiz+1));}
    else{sfx.wrong();ctx.toast('不是这盏。这是'+L.dir+'。');}}
  function startQuiz(n){quiz=n;
    if(n===0){lamps.forEach(l=>{l.lit=false;l.faces.forEach(m=>m.visible=false);l.blanks.forEach(m=>m.visible=true);});sfx.page();}
    ctx.setQuest('阁主问（'+(n+1)+' / 3）',QUIZ[n].q);}
  function finish(){lamps.forEach(l=>{l.lit=true;l.faces.forEach(m=>m.visible=true);l.blanks.forEach(m=>m.visible=false);});
    ctx.setFlag('lamps');ctx.milestone(7);sfx.solve();ctx.unlockNote('xianhou');door.openDoor();sfx.door();
    later(1.6,()=>ctx.toast('三问皆答。卦牌翻回来了，北面的门开了。',5000));}
  W.updaters.push((dt,t)=>{for(let i=timers.length-1;i>=0;i--){if((timers[i].t-=dt)<=0){const f=timers[i].fn;timers.splice(i,1);f();}}
    if(resetIn>0){resetIn-=dt;if(resetIn<=0)lamps.forEach(l=>l.lit=false);}for(const l of lamps){const tg=l.lit?1:0;l.glow+=(tg-l.glow)*Math.min(1,dt*5);l.shade.material.emissiveIntensity=l.glow*1.6;l.light.intensity=l.glow*2.4*(.94+Math.sin(t*9+l.k)*.05);}});

  // ---------- 墙上的文字 ----------
  const north=W.hangingScroll(cx-2.8,2.3,cz-5.38,0,['帝出乎震','齐乎巽','相见乎离','致役乎坤','说言乎兑','战乎乾','劳乎坎','成言乎艮'],{w:1.9,h:2.2});
  W.interact(north.group,{label:'读挂轴',range:3.2,onClick:()=>ctx.read('houtian')});
  const east=W.hangingScroll(cx+5.38,2.3,cz,-Math.PI/2,['万物出乎震','震东方也','齐乎巽','巽东南也','离也者明也','南方之卦也'],{w:1.3,h:2.1});
  W.interact(east.group,{label:'读挂轴',range:3.2,onClick:()=>ctx.read('houtian')});
  const west=W.hangingScroll(cx-5.38,2.3,cz,Math.PI/2,['兑正秋也','战乎乾','乾西北之卦也','坎者水也','正北方之卦也','艮东北之卦也'],{w:1.3,h:2.1});
  W.interact(west.group,{label:'读挂轴',range:3.2,onClick:()=>ctx.read('houtian')});

  // ---------- 北门（解开后打开）与门后 ----------
  const door=W.door({x:cx,z:cz-5.5,side:'n'});W.plaque('爻位',cx,3.75,cz-5.38,0,{w:2,h:.5});
  W.interact(door.group,{label:'北门',range:2.4,onClick:()=>{if(!door.open)ctx.toast('这扇门没有锁孔。也许要让屋里的灯说话。');}});
  // 门后：尚未建成的下一间
  const beyond=new T.Group();beyond.position.set(cx,0,cz-7);W.root.add(beyond);
  for(const s of [-1,1]){W.mesh(new T.BoxGeometry(.2,3.1,3),W.M.lacquer,s*1.1,1.55,0,beyond);W.addBox(cx+s*1.1,cz-7,.12,1.5,'corridor');}
  const f=W.mesh(new T.PlaneGeometry(2.2,3),W.M.darkWood,0,.005,0,beyond);f.rotation.x=-Math.PI/2;f.userData.floor=true;
  W.mesh(new T.BoxGeometry(2.4,3.1,.2),W.M.darkWood,0,1.55,-1.5,beyond);W.addBox(cx,cz-8.5,1.1,.12,'end');
  W.plaque('未完待续',cx,1.9,cz-8.38,0,{w:1.8,h:.48});
  W.lantern(cx,2.6,cz-7.2,{intensity:2.5,distance:4});

  function restore(f){
    if(f.lamps){quiz=3;step=8;lamps.forEach(l=>{l.lit=true;l.glow=1;});door.openDoor();door.t=1;return;}
    if(f.lamps1){step=8;let n=0;while(n<3&&f['quiz'+(n+1)])n++;startQuiz(n);for(let i=0;i<n;i++){const L=lamps[QUIZ[i].k];L.lit=true;L.glow=1;}}}
  return {id:'r3',name:'后天室',theme:'hou',scrolls:[north.group,east.group,west.group],bounds:{x0:-5.5,x1:5.5,z0:cz-5.5,z1:cz+5.5},lamps,door,restore,order:ORDER,gua:GUA,endZ:cz-6.9,
    quiz:QUIZ,get quizStep(){return quiz;},
    hint:f=>!f.lamps1?'lamps':!f.lamps?('quiz'+(([1,2,3].find(i=>!f['quiz'+i]))||3)):null};
}

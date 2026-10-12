// 第四境「火水未济」自动通关（不瞬移）：游水、躲暗流、跟鱼群渡海沟、「震」开贝壳和石缝、带光珠穿暗洞、石碑综/错、浮出水面、过卦门。
// 可单独运行：npm run build && node tools/verify-weiji.cjs；也由 tools/verify.cjs 调用。
// 水下航点：{x,z} 水平目标；y 有值时按住上浮直到这个高度、没有就松手下沉落底；lane 鱼群航道里按航道高度上浮；
//   waitCalm 出发前等暗流停；slam 到达后「震」；act 到达后按 E；expect 到达后必须成立；until 自定义完成条件；tol 水平到达半径；max 超时秒数
async function swim(p,points,label,check){
  for(const [i,w] of points.entries()){
    const r=await p.evaluate(async(w)=>{
      const Q=__Q,P=Q.player,L=Q.level,start=Q.game.time,tol=w.tol??.45,max=w.max??16,falls0=Q.game.falls;
      if(w.waitCalm){while(L.surging&&Q.game.time-start<8)Q.step(1/30,{draw:false});}
      const t0=Q.game.time;let ok=false;
      while(Q.game.time-t0<max){
        if(Q.game.falls>falls0)return {ok:false,why:'fell',pos:[P.x,P.y,P.z].map(v=>+v.toFixed(2))};
        const dx=w.x-P.x,dz=w.z-P.z,l=Math.hypot(dx,dz);
        let up=false;if(w.lane){const n=L._laneNear(P.x,P.y+.45,P.z);up=P.y+.45<L._laneSamples[n.i].p.y;}else if(w.y!==undefined)up=P.y<w.y;
        if(w.until){if(eval(w.until)){ok=true;break;}}
        else if(l<tol&&(w.y!==undefined?Math.abs(P.y-w.y)<.5||P.y>w.y:P.grounded)){ok=true;break;}
        Q.step(1/60,{move:l<tol?{x:0,z:0}:{x:dx/l,z:dz/l},up,draw:false});
      }
      if(!ok)return {ok:false,why:'timeout',pos:[P.x,P.y,P.z].map(v=>+v.toFixed(2)),zone:L.zone,objective:L.objective()};
      if(w.slam){Q.slam();for(let k=0;k<120&&!P.grounded;k++)Q.step(1/60,{draw:false});Q.step(.2,{draw:false});}
      if(w.act){for(let k=0;k<3;k++){Q.interact();Q.step(.1,{draw:false});if(!w.expect||eval(w.expect))break;}}
      if(w.expect&&!eval(w.expect))return {ok:false,why:'expect',expect:w.expect,pos:[P.x,P.y,P.z].map(v=>+v.toFixed(2)),near:Q.nearestInteractable()?.label,objective:L.objective()};
      return {ok:true};
    },w);
    if(!r.ok){check(`${label}: 航点 ${i} (${w.x},${w.z}${w.y!==undefined?','+w.y:''}) 到达`,false,r);return false;}
  }
  check(`${label}: 全部 ${points.length} 个航点到达（无瞬移、未被卷走）`,true);return true;
}

async function runWeiji(p,check,shot){
  const S=(pts,label)=>swim(p,pts,label,check);
  // 0. 基本手感：按住上浮、松开下沉；小狐狸在身边
  const feel=await p.evaluate(()=>{const Q=__Q,P=Q.player;Q.step(.3,{draw:false});const y0=P.y;Q.step(1,{up:true,draw:false});const y1=P.y;Q.step(1.6,{draw:false});const y2=P.y;Q.step(2,{draw:false});
    const F=Q.level.fox;return {swim:P.swim,rise:+(y1-y0).toFixed(2),sinking:+(y1-y2).toFixed(2),landed:P.grounded,fox:+Math.hypot(F.x-P.x,F.y-P.y,F.z-P.z).toFixed(2)};});
  check('第四境：水下游动——按住「跳」1 秒上浮 >2.5 米，松开慢慢下沉、落回海底；小狐狸跟在身边（<3 米）',feel.swim&&feel.rise>2.5&&feel.sinking>.5&&feel.landed&&feel.fox<3,feel);
  await shot('w0-start');
  // 1. 初六：游上石台拿爻玉，翻过石墙
  await S([{x:-4.6,z:7.6,y:4.1},{x:-4.6,z:6.4,tol:.3},{x:0,z:3,y:3.3},{x:0,z:-.6,y:3.3},{x:0,z:-1.6}],'第四境·初六（学游水、翻石墙）');
  // 2. 九二：等暗流停了再走，车轮顶上有爻玉
  await S([{x:3.4,z:-5.2,waitCalm:true,max:6},{x:3.4,z:-6.6,y:3.25,waitCalm:true},{x:3.4,z:-7.6,tol:.25,until:"Q.level.gems.find(g=>g.id==='wheel').taken"},{x:0,z:-13.6,waitCalm:true,max:12}],'第四境·九二（等暗流停、车轮上的爻玉）');
  await shot('w1-wheels');
  // 九二：暗流——漂着会被冲回去，贴底只滑一点
  const cur=await p.evaluate(()=>{const Q=__Q,P=Q.player,L=Q.level;let g=0;while(!L.surging&&g++<600)Q.step(1/60,{draw:false});Q.step(.6,{draw:false});
    const z0=P.z;Q.step(.6,{draw:false});const ground=+(P.z-z0).toFixed(2);const ya=P.y;let n=0;while(L.surging&&n++<40)Q.step(1/60,{up:true,draw:false});const z1=P.z;Q.step(.5,{up:true,draw:false});const floating=L.surging?+(P.z-z1).toFixed(2):null;
    for(let k=0;k<300&&!P.grounded;k++)Q.step(1/60,{draw:false});return {ground,floating,obj:L.objective()};});
  check('第四境·九二：暗流来时，漂着被冲回去（>1.5 米/0.5 秒），贴着海底几乎不动（<0.6 米/0.6 秒）',cur.ground<.6&&(cur.floating===null||cur.floating>1.5),cur);
  // 3. 六三：不跟鱼群直接游——被暗流拖下海沟，回到岸边
  const solo=await p.evaluate(()=>{const Q=__Q,P=Q.player;const f0=Q.game.falls;for(let i=0;i<60*16&&Q.game.falls===f0;i++)Q.step(1/60,{move:{x:0,z:-1},up:true,draw:false});Q.step(.5,{draw:false});return {fell:Q.game.falls-f0,back:[+P.x.toFixed(1),+P.y.toFixed(1),+P.z.toFixed(1)],toast:document.getElementById('toast').textContent};});
  check('第四境·六三：不跟鱼群、直接往前游——被暗流拖下海沟，回到岸边（未济，征凶）',solo.fell===1&&solo.back[2]>-15.5,solo);
  await p.evaluate(()=>{__Q.game.levelFalls=0;});// 这一下是故意的，不算星
  await S([{x:-4.1,z:-14.4,y:2.8},{x:-3.4,z:-37.8,lane:true,until:'P.z<-36.4',max:16},{x:-3.4,z:-38.6}],'第四境·六三（跟着鱼群渡海沟）');
  const lane=await p.evaluate(()=>({gem:__Q.level.gems.find(g=>g.id==='lane').taken,zone:__Q.level.zone,falls:__Q.game.levelFalls}));
  check('第四境·六三：跟着鱼群渡过海沟，途中拿到鱼群里的爻玉',lane.gem&&lane.zone===3&&lane.falls===0,lane);
  await shot('w2-lane');
  // 4. 九四：震开三个大贝壳，拿爻玉和光珠；震散石缝里的鱼群
  await S([{x:-4.6,z:-38.4,y:2.4,slam:true,expect:'Q.level.clams[0].open'},{x:-4.6,z:-40.2,y:1.1,tol:.3,until:"Q.level.gems.find(g=>g.id==='clamA').taken"},
    {x:3,z:-40.2,y:2.4,slam:true,expect:'Q.level.clams[1].open'},{x:4.6,z:-41.4,y:1.1,tol:.3,until:"Q.level.gems.find(g=>g.id==='clamB').taken"},
    {x:0,z:-44.6,y:2.4,slam:true,expect:'Q.level.clams[2].open'},{x:0,z:-46.6,y:.9,tol:.3,until:"Q.level.pearl==='held'"},
    {x:0,z:-49.6,slam:true,expect:'Q.level.crackOpen'}],'第四境·九四（震开贝壳、震散鱼群）');
  await shot('w3-crack');
  // 5. 六五：带着光珠穿过暗洞，放上石台，洞亮门开；拿洞角的爻玉
  await S([{x:0,z:-53.8},{x:0,z:-62.9,act:true,expect:'Q.level.caveLit'},{x:-6.6,z:-64.6,until:"Q.level.gems.find(g=>g.id==='cave').taken",max:10}],'第四境·六五（光珠照亮暗洞）');
  await p.evaluate(()=>__Q.step(1.5,{draw:false}));await shot('w4-cave');
  // 6. 上九：综——把石碑整块倒过来
  await S([{x:0,z:-69.5},{x:0,z:-75.6,act:true}],'第四境·上九（把石碑倒过来）');
  const tab=await p.evaluate(()=>{__Q.step(1.6,{draw:false});return {lines:__Q.level.tablet.join(),method:__Q.level.method,codex:['cuo','zong','xiangying','weiji'].filter(c=>__Q.save.codex.includes(c))};});
  check('第四境·上九：石碑倒过来（综），既济 [阳阴阳阴阳阴] → 未济 [阴阳阴阳阴阳]，解锁"错卦""综卦""相应"图鉴',tab.lines==='0,1,0,1,0,1'&&tab.method==='zong'&&tab.codex.length===4,tab);
  await p.evaluate(()=>__Q.step(2.6));await shot('w5-xiangying');
  await p.evaluate(()=>__Q.step(4.5,{draw:false}));
  const open=await p.evaluate(()=>({surface:__Q.level.surfaceOpen,gate:__Q.level.gate.active,gems:__Q.level.gems.filter(g=>g.taken).length}));
  check('第四境：相应演示结束，水面打开，卦门亮起',open.surface&&open.gate&&open.gems>=3,open);
  // 7. 浮出水面，跳上小岛，走进卦门
  await S([{x:3.3,z:-78.6,y:15.2,until:'!P.swim&&P.y>14',max:12},{x:7,z:-78.6,until:"Q.game.mode!=='play'",max:6}],'第四境·浮出水面，走进卦门');
}

// 错：六爻逐一阴阳互变，也能把既济变成未济（直接调用交互，不走路）
async function checkCuo(p,check){
  const r=await p.evaluate(()=>{const Q=__Q;Q.start(3);Q.step(.3,{draw:false});const L=Q.level;
    for(const name of ['初','二','三','四','五','上']){const it=L.interactables.find(i=>i.label.startsWith('错：变「'+name+'」'));if(!it)return {missing:name};it.act();Q.step(.5,{draw:false});}
    Q.step(.6,{draw:false});return {lines:L.tablet.join(),method:L.method};});
  check('第四境·上九：错——六爻逐一阴阳互变，同样得到未济',r.lines==='0,1,0,1,0,1'&&r.method==='cuo',r);
  // 水母：碰到会把光珠碰掉
  const j=await p.evaluate(()=>{const Q=__Q;Q.start(3);Q.step(.3,{draw:false});const L=Q.level,P=Q.player;
    Q.teleport(0,2,-44);Q.step(.2,{draw:false});Q.slam();for(let i=0;i<120&&!P.grounded;i++)Q.step(1/60,{draw:false});Q.step(.3,{draw:false});
    Q.teleport(0,.3,-46.6);Q.step(.3,{draw:false});const held=L.pearl;const jl=L.jellies[1];Q.teleport(jl.pos.x,jl.pos.y-.4,jl.pos.z);Q.step(.1,{draw:false});return {held,after:L.pearl,clam:L.clams[2].open};});
  check('第四境·六五：被水母碰到，光珠会掉',j.held==='held'&&j.after==='free',j);
}
module.exports={runWeiji,checkCuo,swim};

if(require.main===module){
  const {chromium}=require('playwright'),path=require('node:path'),{pathToFileURL}=require('node:url'),fs=require('node:fs');
  const out=path.join(__dirname,'..','docs','verification');fs.mkdirSync(out,{recursive:true});let fails=0;
  const check=(n,ok,d)=>{if(!ok)fails++;console.log((ok?'PASS ':'FAIL ')+n+(d!==undefined?'  '+JSON.stringify(d):''));return ok;};
  (async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:800}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
    await p.goto(pathToFileURL(path.join(__dirname,'..','dist','易境-爻爻.html')).href);await p.waitForFunction(()=>window.__Q?.ready,null,{timeout:180000});
    await p.evaluate(()=>{__Q.manual=true;__Q.start(3);__Q.step(.5,{draw:false});});
    await runWeiji(p,check,async n=>{await p.evaluate(()=>{const Q=__Q,P=Q.player;Q.cam.focus.set(P.x,P.y+1.1,P.z);Q.step(.05);});await p.screenshot({path:path.join(out,n+'.png')});});
    await p.waitForFunction(()=>__Q.game.mode==='clear',null,{timeout:20000}).catch(()=>{});
    check('第四境：结算出现，第三颗星写"不被卷走"',await p.evaluate(()=>__Q.game.mode==='clear'&&/不被卷走/.test(document.getElementById('clear-stars').textContent)),await p.evaluate(()=>({levelTime:Math.round(__Q.game.levelTime)})));
    await checkCuo(p,check);
    check('无运行时错误',errs.length===0,errs);await b.close();console.log(fails?'FAILED '+fails:'ALL PASSED');process.exit(fails?1:0);})().catch(e=>{console.error(e);process.exit(1);});
}

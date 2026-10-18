// 第五境「乾」试玩段自动通关（不瞬移）：等时辰上龙台 → 骑龙潜行 → 拜见放牛老人得编磬 → 三次唱和（桥 / 升 / 扫）→ 卦门。
// 可单独运行：npm run build && node tools/verify-qian.cjs；也由 tools/verify.cjs 调用。
const {route}=require('./route.cjs');
async function runQian(p,check,shot){
  const L=(pts,label)=>route(p,pts,label,check);
  const wait=(cond,sec)=>p.evaluate(([cond,sec])=>{const Q=__Q,P=Q.player,L=Q.level;for(let i=0;i<sec*60;i++){if(eval(cond))return true;Q.step(1/60,{draw:false});}return eval(cond);},[cond,sec]);
  const sing=()=>p.evaluate(()=>{const L=__Q.level,notes=L.song.notes.slice();notes.forEach(n=>L.chime(n));__Q.step(.2,{draw:false});return {notes,act:L.act};});
  // 初九：站上龙台，等到时辰
  await L([{x:0,z:5.6,minY:.7}],'第五境·初九：走上龙台');
  const sun=await p.evaluate(()=>({inWin:__Q.level.sunIn,obj:__Q.level.objective()}));
  const rode=await wait("L.phase==='ride'",35);
  check('第五境·初九：在龙台上等到"龙"的时辰，小龙浮上来驮人（骑行时位置被锁定，不能乱跳）',rode,sun);
  await shot('q1-ride');
  const landed=await wait("L.phase==='field'&&P.grounded",16);
  const st=await p.evaluate(()=>({gem:__Q.level.gems.find(g=>g.id==='ride').taken,pos:[__Q.player.x,__Q.player.y,__Q.player.z].map(v=>+v.toFixed(1)),falls:__Q.game.levelFalls}));
  check('第五境·初九：潜行到云田，途中拿到爻玉，没掉进云海',landed&&st.gem&&st.falls===0,st);
  // 九二：拜见老人，得到编磬
  await L([{x:-3.2,z:-20.6,act:true,expect:'Q.level.hasChime'},{x:-4.4,z:-23.4}],'第五境·九二：拜见放牛老人（得编磬），拿田里的爻玉');
  // 唱和一：桥
  await L([{x:0,z:-25.2}],'第五境·九二：走到小龙身边');
  const s1=await wait('L.chimeOn',12);const wrong=await p.evaluate(()=>{const L=__Q.level,n=(L.song.notes[0]+1)%5;L.chime(n);__Q.step(.1,{draw:false});return {shook:L.dragon.shakeT>0,toast:document.getElementById('toast-text').textContent};});
  check('第五境·九二：小龙唱完出现编磬；敲错了它摇头、再唱一遍',s1&&wrong.shook&&/再唱/.test(wrong.toast),wrong);
  await wait('L.chimeOn',8);const r1=await sing();
  check('第五境·九二：照着敲对（同声相应），小龙盘成桥',r1.act==='桥',r1);
  await p.evaluate(()=>__Q.step(1.8,{draw:false}));await shot('q2-bridge');
  await L([{x:0,z:-29},{x:0,z:-31.5},{x:0,z:-37.8}],'第五境·九二：走过龙身桥（桥上有爻玉）');
  // 唱和二：升
  await L([{x:0,z:-42.6}],'第五境·九二：走到第二处');
  await wait('L.chimeOn',12);const r2=await sing();
  check('第五境·九二：第二段唱和，小龙低头当升降台',r2.act==='升',r2);
  await L([{x:0,z:-44.5,until:'P.y>9.6',max:12,tol:.25},{x:0,z:-47.6,until:'P.grounded&&P.y>9.5&&P.z<-46.6',max:6}],'第五境·九二：站上龙头被托上高台');
  await shot('q3-lift');
  // 唱和三：扫开云墙
  await L([{x:-1.4,z:-49.2}],'第五境·九二：走到第三处');
  await wait('L.chimeOn',12);const r3=await sing();
  const done=await wait("L.phase==='done'",8);
  check('第五境·九二：第三段四个音，小龙摆尾扫开云墙',r3.act==='扫'&&done,{r3,done});
  await L([{x:3.4,z:-49.2},{x:0,z:-55,until:"Q.game.mode!=='play'",max:8}],'第五境：拿高台上的爻玉，走进卦门');
}
module.exports={runQian};
if(require.main===module){
  const {chromium}=require('playwright'),path=require('node:path'),{pathToFileURL}=require('node:url'),fs=require('node:fs');
  const out=path.join(__dirname,'..','docs','verification');fs.mkdirSync(out,{recursive:true});let fails=0;
  const check=(n,ok,d)=>{if(!ok)fails++;console.log((ok?'PASS ':'FAIL ')+n+(d!==undefined?'  '+JSON.stringify(d):''));return ok;};
  (async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:800}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
    await p.goto(pathToFileURL(path.join(__dirname,'..','dist','易境-爻爻.html')).href);await p.waitForFunction(()=>window.__Q?.ready,null,{timeout:180000});
    await p.evaluate(()=>{__Q.manual=true;__Q.start(4);__Q.step(.5,{draw:false});});
    await runQian(p,check,async n=>{await p.evaluate(()=>{const Q=__Q,P=Q.player;Q.cam.focus.set(P.x,P.y+1.1,P.z);Q.step(.05);});await p.screenshot({path:path.join(out,n+'.png')});});
    await p.waitForFunction(()=>__Q.game.mode==='clear',null,{timeout:20000}).catch(()=>{});
    check('第五境：结算出现，第三颗星写"不掉进云海"，解锁"乾""同声相应"',await p.evaluate(()=>__Q.game.mode==='clear'&&/云海/.test(document.getElementById('clear-stars').textContent)&&['qian','tongsheng'].every(c=>__Q.save.codex.includes(c))));
    check('无运行时错误',errs.length===0,errs);await b.close();console.log(fails?'FAILED '+fails:'ALL PASSED');process.exit(fails?1:0);})().catch(e=>{console.error(e);process.exit(1);});
}

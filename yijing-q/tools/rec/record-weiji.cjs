// 录制第四境「火水未济」更新攻略视频（横屏）：真实操作角色走一遍新内容，逐帧截图，再用 finish.cjs 合成原声与 mp4。
// 用法：npm run build && node tools/rec/record-weiji.cjs && NAME=易境-爻爻-第四境更新 node tools/rec/finish.cjs
//   DRY=1   只跑流程、不截图；OUT=目录（默认 docs/video-weiji）；HTML=要录的单文件（默认 dist/易境-爻爻.html）
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..','..'),DRY=!!process.env.DRY;
const out=process.env.OUT||path.join(root,'docs','video-weiji'),framesDir=path.join(out,'frames');
const html=process.env.HTML||path.join(root,'dist','易境-爻爻.html');
const W=1280,H=720,DSF=1.5,F=1/30;

(async()=>{
  fs.mkdirSync(framesDir,{recursive:true});if(!DRY)for(const f of fs.readdirSync(framesDir))fs.unlinkSync(path.join(framesDir,f));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:DSF});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(pathToFileURL(html).href);await p.waitForFunction(()=>window.__Q?.ready,null,{timeout:180000});
  await p.evaluate(()=>{try{localStorage.clear();}catch{}});await p.reload();await p.waitForFunction(()=>window.__Q?.ready,null,{timeout:180000});
  await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'agent.js'),'utf8')});
  let n=0;const t0=Date.now();
  const ev=(fn,arg)=>p.evaluate(fn,arg);
  async function fr(gdt){const r=await ev(([g,d])=>__R.frame(g,{draw:d}),[gdt,!DRY]);if(!DRY)await p.screenshot({path:path.join(framesDir,'f'+String(n).padStart(5,'0')+'.jpg'),type:'jpeg',quality:92});n++;
    if(n%150===0)console.log(`  ${(n/30).toFixed(0)} 秒成片，已用 ${((Date.now()-t0)/60000).toFixed(1)} 分钟`);return r;}
  const play=async(sec,speed=1)=>{for(let i=0,m=Math.round(sec/F);i<m;i++)await fr(speed*F);};
  const go=async(pts,speed=1)=>{await ev(pts=>__R.route(pts),pts);for(;;){const r=await fr(speed*F);if(!r.busy)break;}};
  const cut=async pts=>{await ev(pts=>{__R.route(pts);__R.skipRoute();},pts);};
  const cap=(h,pos)=>ev(([h,p])=>__R.caption(h,p),[h||null,pos||null]);
  const speed=x=>ev(x=>__R.speed(x),x);
  const until=async(cond,speed=1,max=40)=>{for(let i=0;i<max/F;i++){if(await ev(c=>{const Q=__Q,P=Q.player;return !!eval(c);},cond))return;await fr(speed*F);}throw Error('until timeout: '+cond);};
  const fade=async(sec,from,to)=>{const m=Math.round(sec/F);for(let i=1;i<=m;i++){await ev(v=>__R.fade(v),from+(to-from)*i/m);await fr(F);}};
  const section=name=>console.log('— '+name+'（成片 '+(n/30).toFixed(1)+' 秒）');
  const MANTA='({x:Q.level.life.manta.pos.x,z:Q.level.life.manta.pos.z})',U='(Q.game.time%22)';

  // ================= 开场 =================
  section('intro');
  await ev(()=>{__Q.start(3);__R.keys(true);__R.keyF(false);document.querySelector('#rec-keys .f').textContent='震';__R.snapCam(0,.36,9.5);});
  await ev(()=>__R.fade(1));await play(.2);await fade(.8,1,0);
  await cap('第四境 · 火水未济<br><b>更新攻略</b>：新玩法、新伙伴，顺便修了一堆 bug');await play(3.2);
  // ================= 游泳 =================
  section('swim');
  await cap('水下：按住 <b>空格</b> 往上游，松开就慢慢沉到海底');
  await go([{x:-4.6,z:7.6,y:4.1},{x:-4.6,z:6.4,tol:.3}]);
  await cap('白色<b>软糖小狐狸</b>一路陪着你，会翻跟头、会转圈');await play(1.6);
  await go([{x:0,z:3,y:3.3},{x:0,z:-.6,y:3.3},{x:0,z:-1.6}]);
  await cap('<b>暗流</b>来了就贴着海底走，或者躲到车轮后面；等它停了再过');await speed(2);
  await go([{x:3.4,z:-5.2,waitCalm:true,max:6},{x:3.4,z:-6.6,y:3.25,waitCalm:true},{x:3.4,z:-7.6,tol:.25,until:"Q.level.gems.find(g=>g.id==='wheel').taken"},{x:0,z:-13.6,waitCalm:true,max:12}],2);
  await speed(1);
  // ================= 大鳐鱼 =================
  section('manta');
  await cap('<b>新</b>：海沟太宽？岸边的<b>大鳐鱼</b>会来回摆渡');
  await go([{x:5.2,z:-11.6,tol:.3}]);await play(.8);await fade(.35,0,1);
  await ev(u=>{const Q=__Q;for(let i=0;i<60*24&&!(eval(u)>19.6&&eval(u)<20.4);i++)__R.skip(1/60);},U);await fade(.35,1,0);// 剪掉等鳐鱼回来的那段
  await cap('等它停在岸边，游上去落到它背上——<b>什么都不用按</b>');
  await go([{x:5.2,z:-13.2,y:3.7,target:MANTA,until:'P.grounded&&P.ground===Q.level.life.manta.col',tol:.3,max:12}]);
  await cap('它背上还驮着一枚<b>贝壳</b>，顺手就拿到了');await play(2.6);
  await ev(()=>{__Q.cam.targetPitch=.12;});
  await cap('抬头看——一头<b>大鲸</b>正从头顶游过');await until(`${U}>10.8`);
  await ev(()=>{__Q.cam.targetPitch=.36;});
  await cap('鳐鱼靠岸。旁边的<b>海葵</b>是蹦床，落上去会被弹起来');
  await go([{x:6.6,z:-37.4,y:3.2,tol:.3},{x:6.6,z:-37.4,until:'P.vy>4',max:6}]);await play(2.4);
  // ================= 震 =================
  section('slam');
  await ev(()=>__R.keyF(true));
  await cap('<b>震</b>（<b>F</b> 键 / 手机「震」按钮）：游到高处再往下砸');
  await go([{x:3,z:-40.2,y:2.4,slam:true,expect:'Q.level.clams[1].open'}]);
  await cap('能震开<b>大贝壳</b>，里面有爻玉');
  await go([{x:4.6,z:-41.4,y:1.1,tol:.3,until:"Q.level.gems.find(g=>g.id==='clamB').taken"}]);await play(.6);
  await cap('<b>新</b>：带亮裂纹的石头也能震碎，石缝小洞里藏着贝壳');
  await go([{x:-1,z:-38.6,y:2.2},{x:-5.2,z:-38.6,y:2.2,tol:.3,slam:true,expect:'Q.level.life.rocks[0].broken'}]);
  await go([{x:-8.6,z:-38.6,until:'Q.level.life.shells.filter(s=>s.taken).length>=2',max:8}]);
  await cap('挡住视线的石头会变成<b>网点半透明</b>，钻进洞里也看得见自己');await play(1.8);
  await go([{x:-4.6,z:-38.4,y:2.4,slam:true,expect:'Q.level.clams[0].open'},{x:-4.6,z:-40.2,y:1.1,tol:.3,until:"Q.level.gems.find(g=>g.id==='clamA').taken"}]);
  await cap('再震开中间的大贝壳，拿到<b>光珠</b>');
  await go([{x:0,z:-44.6,y:2.4,slam:true,expect:'Q.level.clams[2].open'},{x:0,z:-46.6,y:.9,tol:.3,until:"Q.level.pearl==='held'"}]);
  await cap('<b>新</b>：洞口睡着一只<b>大海龟</b>，在它旁边震一下');
  await go([{x:-3.6,z:-48.9,y:2.2,tol:.3,slam:true,expect:"Q.level.life.turtle.state!=='sleep'"}]);await play(3.2);
  await cap('它游开了，身后的小洞里又有一枚贝壳');
  const sh=await ev(()=>__Q.level.life.shells.filter(s=>s.taken).length);
  await go([{x:-8.6,z:-48.9,until:`Q.level.life.shells.filter(s=>s.taken).length>${sh}`,max:8}]);await play(.8);
  await cap('前面石缝被鱼群堵住：<b>震</b>一下，鱼群就散开');
  await go([{x:-1,z:-48.6},{x:0,z:-49.6,slam:true,expect:'Q.level.crackOpen'}]);await play(1.4);
  // ================= 暗洞 =================
  section('cave');
  await cap('<b>新</b>：暗洞里有三盏<b>灯座</b>，带着光珠，<b>灯笼鱼</b>会跟着你');
  await go([{x:0,z:-53.8},{x:6.6,z:-54.4,until:"Q.level.lanterns!==undefined||true",tol:.6}]);
  await cap('靠近灯座，三条灯笼鱼游进去，灯就亮了');
  await go([{x:-7.5,z:-54.6,until:'Q.level.litCount>=1',max:12}]);await play(1.2);
  await cap('左边墙上有<b>壁画</b>：灯越亮，画越清楚');await ev(()=>{__Q.cam.targetYaw=Math.PI*.5;});
  await go([{x:-4.6,z:-57.6}]);await play(2.6);
  await cap('当心<b>水母</b>：被碰到，光珠会掉');await speed(2);
  await go([{x:7.5,z:-55.5},{x:7.5,z:-58.4,until:'Q.level.litCount>=2',max:10},{x:7.6,z:-61.8},{x:5.6,z:-65.5},{x:-7,z:-65.5},{x:-7.5,z:-62.2,until:'Q.level.litCount>=3',max:10}],2);
  await speed(1);
  await cap('三盏都亮了，按 <b>E</b> 把光珠放上石台，洞全亮、石门升起');
  await go([{x:0,z:-62.9,act:true,expect:'Q.level.caveLit'}]);await play(2.6);
  await speed(2);await go([{x:-6.6,z:-64.6,until:"Q.level.gems.find(g=>g.id==='cave').taken",max:10},{x:2,z:-65.6},{x:.6,z:-69.5}],2);await speed(1);
  // ================= 出洞：章鱼、螃蟹、石碑 =================
  section('tablet');
  await cap('罐子里住着一只害羞的<b>小章鱼</b>，走近它就缩回去');
  await go([{x:-5,z:-72.6},{x:-5.6,z:-73.4,until:'Math.hypot(P.x+7.4,P.z+73.6)<2.7',max:6}]);await play(2);
  // ================= 通用更新：复位 / 提示关掉 =================
  section('general');
  await cap('<b>新</b>：卡住了？点右上角 <b>🚩</b>（或按 <b>T</b>），回到刚才站稳的地方，进度都保留');
  await ev(()=>document.getElementById('btn-reset').classList.add('nudge'));await play(1.6);
  await ev(()=>{__Q.resetToSafe();document.getElementById('btn-reset').classList.remove('nudge');});await play(2.6);
  await cap('推着方向几秒还走不动，会自动提示你点 🚩');await play(2.2);
  await cap('<b>新</b>：顶上的提示文字，点一下右边的 <b>×</b> 就关掉（或按 Esc）');
  await ev(()=>__Q.toast('像这样的提示，嫌挡就点 × 关掉',8000));await play(1.8);
  await ev(()=>document.getElementById('toast-x').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));await play(1.4);
  await cap('最后的石碑：把「既济」变成「未济」');
  await go([{x:-4.4,z:-71},{x:-.4,z:-71.4},{x:0,z:-75.6}]);
  await cap('两种办法：<b>错</b>——六爻逐一阴阳互换；<b>综</b>——整块倒过来');await play(2.2);
  await cap('这次选<b>综</b>：按 <b>E</b> 把石碑倒过来');await ev(()=>__R.interact());await play(3.2);
  await cap('<b>相应</b>：初与四、二与五、三与上，一阴一阳才相应');await play(4.2);
  await cap(null);await play(2.6);
  await cap('<b>新</b>：12 枚贝壳都找齐，小狐狸会戴上<b>珊瑚发卡</b>，图鉴解锁「贝」');
  await ev(()=>{const Q=__Q,life=Q.level.life;for(const s of life.shells){if(!s.taken&&s.carrier!=='manta'){const P=Q.player,x=P.x,y=P.y,z=P.z;Q.teleport(s.pos.x,s.pos.y-.46,s.pos.z);Q.step(1/60,{draw:false});Q.teleport(x,y,z);}}});
  await play(3.4);
  await cap('水面打开了，一直往上游，跳上小岛进卦门');
  await go([{x:3.3,z:-78.6,y:15.2,until:'!P.swim&&P.y>14',max:14}]);
  await cap(null);
  await go([{x:7,z:-78.6,until:"Q.game.mode!=='play'",max:8}]);await play(2.4);
  await cap('第四境 · 火水未济 —— 去海底见见新朋友吧');await play(2.6);
  await fade(1,0,1);

  const log=await ev(()=>__R.log),videoT=await ev(()=>__R.videoT);
  fs.writeFileSync(path.join(out,'audio-events.json'),JSON.stringify({videoT,log}));
  console.log(`共 ${n} 帧，${(n/30).toFixed(1)} 秒；声音事件 ${log.length} 个；耗时 ${((Date.now()-t0)/60000).toFixed(1)} 分钟`);
  if(errs.length)console.log('页面报错：',errs);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});

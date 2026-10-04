// 录制宣传 / 攻略视频：脚本真实操作角色（不瞬移），逐帧截图，离线合成游戏原声，ffmpeg 合成 mp4。
// 用法：npm run build && node tools/rec/record.cjs
//   DRY=1        只跑流程、不截图（几分钟内验证整条路线，并统计成片时长）
//   UPTO=kan     只录到某一段为止（title / kan / li / jiji / end），用于出样片
//   OUT=目录      输出目录（默认 docs/video）
const {spawn,execFileSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..','..'),DRY=!!process.env.DRY,UPTO=process.env.UPTO||'end';
const out=process.env.OUT||path.join(root,'docs','video'),framesDir=path.join(out,'frames');
const W=1920,H=1080,F=1/30,MAXF=process.env.MAXSEC?Math.round(+process.env.MAXSEC*30):0;
class Stop extends Error{}

// ---------- 路线（与 tools/verify*.cjs 相同的航点） ----------
const K=[0,1,2,3,4,5].map(k=>({x:+(Math.sin(k*Math.PI/3)*3.3).toFixed(3),z:+(-23+Math.cos(k*Math.PI/3)*3.3).toFixed(3),top:3.6+k*.7}));
const toDing=[{x:0,z:-9.3},{x:0,z:-11.4,jump:true},{x:-.8,z:-13.6,jump:true},{x:0,z:-15.8,jump:true},{x:0,z:-17.8,jump:true,minY:2.9}];
const fromDing=[{x:0,z:-17.4},{x:0,z:-15.8,jump:true},{x:-.8,z:-13.6,jump:true},{x:0,z:-11.4,jump:true},{x:0,z:-8.8,jump:true}];
function climbTo(k,expectSlot,act=true){const pts=[{x:1.2,z:-18.4}];
  for(let i=0;i<=k;i++){if(i>0){const a=K[i-1],b=K[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);pts.push({x:+(a.x+dx/l*.65).toFixed(3),z:+(a.z+dz/l*.65).toFixed(3),tol:.3,minY:a.top-.05,max:6});}
    pts.push({x:K[i].x,z:K[i].z,jump:true,tol:.45,minY:K[i].top-.05,max:8});}
  if(act){pts[pts.length-1].act=true;pts[pts.length-1].expect=`Q.level.slots[${expectSlot}].block!==null`;}return pts;}
const OFF=[[0,-17.9],[4.6,-21.8],[4.4,-25.6],[-2.2,-27.8],[-4.4,-25.6],[-4.4,-20.4]];
const offRing=k=>[{x:OFF[k][0],z:OFF[k][1],until:'P.grounded&&P.y<3.3',tol:.3}];
const SOUTH={east:[{x:4.8,z:-24},{x:4.8,z:-21},{x:1.8,z:-18},{x:0,z:-17.4}],west:[{x:-3.6,z:-27.4},{x:-4.8,z:-24},{x:-4.8,z:-21},{x:-1.8,z:-18},{x:0,z:-17.4}]};
const toSouth=k=>k===0?[{x:0,z:-17.4}]:k<=2?SOUTH.east.slice(k===1?1:0):k===5?SOUTH.west.slice(3):SOUTH.west;
const down=k=>[...offRing(k),...toSouth(k)];
const hold=yang=>`Q.level.held&&Q.level.held.yang===${yang}`;

(async()=>{
  fs.mkdirSync(framesDir,{recursive:true});if(!DRY)for(const f of fs.readdirSync(framesDir))fs.unlinkSync(path.join(framesDir,f));
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:W,height:H}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(pathToFileURL(path.join(root,'dist','易境-爻爻.html')).href);await p.waitForFunction(()=>window.__Q?.ready,null,{timeout:180000});
  await p.evaluate(()=>{try{localStorage.clear();}catch{}});await p.reload();await p.waitForFunction(()=>window.__Q?.ready,null,{timeout:180000});
  await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'agent.js'),'utf8')});
  let n=0;const t0=Date.now();
  const ev=(fn,arg)=>p.evaluate(fn,arg);
  async function fr(gdt){if(MAXF&&n>=MAXF)throw new Stop();const r=await ev(([g,d])=>__R.frame(g,{draw:d}),[gdt,!DRY]);if(!DRY)await p.screenshot({path:path.join(framesDir,'f'+String(n).padStart(5,'0')+'.jpg'),type:'jpeg',quality:92});n++;
    if(n%150===0)console.log(`  ${(n/30).toFixed(0)} 秒成片，已用 ${((Date.now()-t0)/60000).toFixed(1)} 分钟`);return r;}
  const play=async(sec,speed=1)=>{for(let i=0,m=Math.round(sec/F);i<m;i++)await fr(speed*F);};
  const go=async(pts,speed=1)=>{await ev(pts=>__R.route(pts),pts);for(;;){const r=await fr(speed*F);if(!r.busy)break;}};
  const cut=async pts=>{await ev(pts=>{__R.route(pts);__R.skipRoute();},pts);};
  const cap=html=>ev(h=>__R.caption(h),html||null);
  const speed=x=>ev(x=>__R.speed(x),x);
  const until=async(cond,speed=1,max=30)=>{for(let i=0;i<max/F;i++){if(await ev(c=>{const Q=__Q,P=Q.player;return !!eval(c);},cond))return;await fr(speed*F);}throw Error('until timeout: '+cond);};
  const closeDlg=()=>ev(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
  const section=async name=>{console.log('— '+name+'（成片 '+(n/30).toFixed(1)+' 秒）');return name;};
  const stop=s=>UPTO===s;

  try{
  // ================= 开场：选角色 =================
  await section('title');
  await cap('先选一个小团子，四个角色本领一样，<b>手感</b>不同');
  await play(1.2);
  for(const k of ['nuo','lin','koi','yao']){await ev(k=>__Q.selectCharacter(k),k);await play(1.3);}
  await cap(null);await play(.3);
  if(!stop('title')){
  // ================= 第一境 · 坎 =================
  await section('kan');
  await ev(()=>{__Q.start(0);__R.keys(true);__R.snapCam(0,.42,9);});
  await play(2.4);
  await cap('<b>WASD</b> 移动，走路会自己蹦');
  await go([{x:2.1,z:2.9}]);
  await cap('靠近石碑按 <b>E</b>，看这一关要排的卦');await play(.5);
  await ev(()=>__R.interact());await play(4.6);await closeDlg();
  await cap('<b>空格</b>跳，空中再按一次是二段跳');
  await go([{x:1.8,z:.8},{x:6.2,z:-2.7},{x:8.4,z:-3.6,jump:true},{x:9.9,z:-5.3,jump:true},{x:12.3,z:-7.4,jump:true},{x:14.3,z:-9.4}]);
  await cap('一路收集<b>爻玉</b>，凑够三枚，终点的卦门才会亮');await play(1.2);
  await cut([{x:11,z:-6.6},{x:9.9,z:-5.3,jump:true},{x:8.4,z:-3.6,jump:true},{x:6,z:-2.6,jump:true},{x:4.4,z:-1.1}]);
  await ev(()=>__R.snapCam(Math.PI*0.05,.42,9));
  await speed(2);await go([{x:-.9,z:-6.2},{x:-1.2,z:-8.4,jump:true},{x:.9,z:-10.6,jump:true,tol:.6},{x:-.4,z:-12.8,jump:true},{x:-.2,z:-15,jump:true},{x:-3.6,z:-15.8}],2);await speed(1);
  await cap('跳上<b>爻台</b>会切换阴阳。坎卦是 阴·阳·阴');
  await go([{x:-3.6,z:-17.6,jump:true},{x:-3.6,z:-20.6,jump:true},{x:-3.6,z:-23.6,jump:true}]);
  await play(2.6);
  await cap('卦对了，石桥就从水里升起来');await ev(()=>{__Q.cam.targetYaw=-.6;});await play(2);
  await cap('去高台再拿一枚爻玉，然后过桥');await speed(2);
  await go([{x:-1,z:-23.6},{x:4.3,z:-23.8},{x:7.6,z:-27.3,until:'P.grounded&&P.y>3.9&&Math.hypot(P.x-7.6,P.z+27.3)<1.1',max:8},{x:3.5,z:-25,jump:true},{x:.3,z:-24.6},{x:0,z:-28.2},{x:0,z:-29.6},{x:.8,z:-31.7},{x:.73,z:-33.8},{x:-.14,z:-35.9},{x:-.86,z:-38},{x:0,z:-39.4}],2);
  await speed(1);await cap(null);
  await go([{x:0,z:-42.5,until:"Q.game.mode!=='play'",max:6}]);
  await cap('过关有三颗星：<b>通关</b>、<b>爻玉收齐</b>、<b>不落水</b>');await play(3);
  await cap(null);await ev(()=>document.getElementById('btn-next').click());await play(1.6);
  if(!stop('kan')){
  // ================= 第二境 · 离 =================
  await section('li');
  await ev(()=>__R.snapCam(0,.42,9));await play(2.4);
  await cap('第二境先读碑：离卦是 阳·阴·阳');
  await go([{x:-2.2,z:-1.1}]);await ev(()=>__R.interact());await play(4.4);await closeDlg();
  await cap('到<b>火塘</b>取火种，火种会慢慢烧完，得赶快');
  await go([{x:0,z:-.2,until:'Q.level.carry>0'}]);await play(.6);
  await speed(2);await go([{x:3,z:1.2},{x:5.4,z:-.9},{x:7.6,z:-1.9},{x:10.2,z:-2.8},{x:11.3,z:-1.8}],2);await speed(1);
  await cap('靠近火台按 <b>E</b> 点燃');
  await go([{x:12.9,z:-2.9,until:'Q.level.braziers[0].lit'}]);await play(1.2);
  await cap('升降台、横移石：看准时机再跳');await speed(2);
  await go([{x:10.2,z:-2.8},{x:7.6,z:-1.9},{x:4.5,z:-.6},{x:1.4,z:-1.8,until:'Q.level.carry>20'},{x:0,z:-5.9},
    {x:0,z:-8.4,waitLift:true,jump:true,tol:.7},{x:0,z:-8.4,waitLiftTop:true,until:'Q.level._liftTop()>3.25'},
    {x:1.2,z:-11.4,jump:true,tol:.55},{x:0,z:-14,onSlider:true,waitSlider:true,jump:true,tol:.5,until:'P.grounded&&P.y>3.9&&Math.abs(P.z+14)<1.1'},{x:.4,z:-16.9,jump:true,tol:.55},{x:0,z:-19.8,jump:true},{x:1.6,z:-22},{x:.9,z:-23.4,until:'Q.level.braziers[2].lit'}],2);
  await speed(1);await play(.8);
  await cap('离卦中间是阴：中间那座火台要按 <b>E</b> 盖灭');
  await cut([{x:-3.2,z:-22.6},{x:-5.4,z:-21.2,jump:true},{x:-6.3,z:-18.4,jump:true},{x:-6.8,z:-15.5,jump:true},{x:-8.2,z:-13.6,jump:true},{x:-10.2,z:-11.6,jump:true}]);
  await ev(()=>__R.snapCam(.9,.5,9));
  await go([{x:-10.2,z:-7.6},{x:-10.6,z:-9.2}]);await ev(()=>__R.interact());await play(3);
  await cap(null);
  await cut([{x:-8.4,z:-6},{x:-6.9,z:-3.9,jump:true},{x:-5.4,z:-3,jump:true},{x:-3,z:1.5},{x:3,z:1.5},{x:4.5,z:-.6},{x:7.6,z:-1.9},{x:11.5,z:-5.6},{x:13.4,z:-8.6,jump:true},{x:14,z:-10.8},{x:14.6,z:-13}]);
  await ev(()=>__R.snapCam(.2,.42,9));
  await go([{x:15,z:-16,jump:true},{x:15.3,z:-20.6,until:"Q.game.mode!=='play'",max:6}]);
  await play(2);await ev(()=>document.getElementById('btn-next').click());await play(1.6);
  if(!stop('li')){
  // ================= 第三境 · 水火既济 =================
  await section('jiji');
  await ev(()=>__R.snapCam(0,.42,9));await play(2.4);
  await cap('第三境：把六个爻块放回原位，排成「既济」');
  await go([{x:2.3,z:14.9}]);await ev(()=>__R.interact());await play(4.4);await closeDlg();
  await cap('按 <b>F</b> 变身：原形 → 水态 → 火态');
  await go([{x:0,z:6},{x:7.6,z:-1.1}]);
  await cap('<b>水态</b>能穿过火墙');
  await go([{x:10,z:-1,form:'water'},{x:13,z:-1},{x:17.6,z:-1.1},{x:20.6,z:.4}]);
  await cap('按 <b>E</b> 拿起爻块');
  await go([{x:18.5,z:-1.4,act:true,expect:hold(true)}]);await play(.8);
  await cut([{x:13,z:-1},{x:9.6,z:-1},{x:4,z:-2,form:'normal'},...toDing]);
  await ev(()=>__R.snapCam(.6,.5,10));
  await cap('先故意放错：拿着<b>阳爻</b>去「二」位');
  await go(climbTo(1,1,false));await ev(()=>__R.interact());await play(3.2);
  await cap('阳爻放阳位、阴爻放阴位，才算<b>当位</b>');
  await cut([...offRing(1),...toSouth(1)]);await ev(()=>__R.snapCam(.6,.5,10));
  await go(climbTo(0,0));await play(2);
  await cap('其余五块：有的在瀑布顶上、有的被冰封着，要用对形态');await speed(3);
  // 阳②：水态走瀑布上去
  await cut([...down(0),...fromDing.slice(1),{x:-4,z:-.5}]);await ev(()=>__R.snapCam(-.8,.45,9));
  await go([{x:-6,z:.6,form:'water',until:'P.grounded&&P.y>7.9',max:12},{x:-5.2,z:-3.6},{x:-6.3,z:-5.7,act:true,expect:hold(true)}],3);
  await cut([{x:-2.2,z:-2.6,until:'P.grounded&&P.y<1',max:8,form:'normal'},{x:-1,z:-6},...toDing,...climbTo(2,2)]);
  // 阳③：火态踩蒸汽口弹上北方高岛
  await cut([...offRing(2),{x:1.7,z:-27.4,form:'fire'}]);await ev(()=>__R.snapCam(0,.5,10));
  await go([{x:0,z:-28.2,until:'P.y>6',max:10,tol:.15},{x:0,z:-31,until:'P.grounded&&P.y>7.8',max:4},{x:0,z:-33.3,jump:true,minY:8.9}],3);
  await cut([{x:3.6,z:-39.6,form:'fire'},{x:5.8,z:-41.5,jump:true,dj:true,minY:10.9,tol:.6,max:6,act:true,expect:"Q.save.codex.includes('weiji')"},{x:2.4,z:-38.6,until:'P.grounded&&P.y<9.2&&P.y>8.8',max:6},
    {x:-.9,z:-37.6,act:true,expect:hold(true)},{x:0,z:-32.2},{x:-1.6,z:-27.6,until:'P.grounded&&P.y<3.4',max:8},...SOUTH.west,...climbTo(4,4)]);
  // 阴①：西岛，水态撞火灵，火态融冰
  await cut([...down(4),...fromDing.slice(1),{x:-7.8,z:-1.5},{x:-12,z:-1.9}]);await ev(()=>__R.snapCam(Math.PI/2,.45,9));
  await go([{x:-15.2,z:-2.1,form:'water'},{x:-18,z:-2,target:"(()=>{const e=Q.level.enemies.find(e=>e.home.x<-10&&e.alive);return e?{x:e.pos.x,z:e.pos.z}:null;})()",until:'!Q.level.enemies.some(e=>e.home.x<-10&&e.alive)',max:15},{x:-16.2,z:-2.2,form:'fire'},{x:-18.3,z:-2.4,form:'fire',until:'Q.level.blocks[1].lock.melted',max:8},
    {x:-18.6,z:-2.4,form:'water',act:true,expect:hold(false)}],3);
  await cut([{x:-12,z:-1.9},{x:-7.8,z:-1.5},{x:-1,z:-6,form:'normal'},...toDing,...climbTo(1,1),
    ...down(1),...fromDing.slice(1),{x:0,z:6,form:'water'},{x:5.2,z:12.6},{x:7.4,z:13.5,jump:true},{x:9.3,z:13.5,jump:true},{x:11.2,z:13.6,jump:true},{x:13.4,z:15.6},{x:14,z:14,act:true,expect:hold(false)},
    {x:11.2,z:13.6},{x:9.3,z:13.5,jump:true},{x:7.4,z:13.5,jump:true},{x:5.2,z:13.2,jump:true},{x:0,z:6,form:'normal'},{x:0,z:-6},...toDing,...climbTo(3,3),
    ...down(3),...fromDing.slice(1),{x:-4,z:-.5},{x:-6,z:.6,form:'water',until:'P.grounded&&P.y>7.9',max:12},{x:-2.6,z:-4.6},{x:2.6,z:-4.4},{x:4.4,z:-4.2,form:'fire'}]);
  // 阴③：火态点亮两盏石灯，石莲花打开
  await ev(()=>__R.snapCam(-.4,.5,9));
  await go([{x:4.6,z:-5.4,until:'Q.level.held===null&&P.grounded&&Math.hypot(P.x-4.6,P.z+6.4)<1.6',max:6},{x:8.6,z:-5,until:'P.grounded&&Math.hypot(P.x-9.6,P.z+5)<1.6',max:6},{x:5.4,z:-2.4},{x:6.7,z:-3.2,act:true,expect:hold(false)}],3);
  await speed(1);await cap(null);
  await cut([{x:2.9,z:-2.3,until:'P.grounded&&P.y<1',max:8,form:'normal'},{x:-1,z:-6},...toDing]);await ev(()=>__R.snapCam(.6,.5,10));
  await cap('六爻当位：阳阴阳阴阳阴，水在火上');
  await go(climbTo(5,5));await play(2.6);
  await cap('最后一关「终乱」：限时内把乱子都平掉');await play(2.4);
  await cap('<b>水态</b>撞火灵，<b>火态</b>撞水泡');await speed(2);
  const fireLuan="(()=>{if(!Q.level.hazards)return null;const e=Q.level.hazards.list[2].enemies.find(e=>e.alive&&e.type==='fire');return e?{x:e.pos.x,z:e.pos.z}:null;})()";
  const waterLuan="(()=>{if(!Q.level.hazards)return null;const e=Q.level.hazards.list[2].enemies.find(e=>e.alive&&e.type==='water');return e?{x:e.pos.x,z:e.pos.z}:null;})()";
  await go([{x:-.6,z:-22.2,until:'P.grounded&&P.y<3.3',tol:.3},{x:0,z:-23,form:'water',target:fireLuan,until:"!Q.level.hazards.list[2].enemies.some(e=>e.alive&&e.type==='fire')",max:20},
    {x:0,z:-23,form:'fire',target:waterLuan,until:'Q.level.hazards.list[2].done',max:20}],2);
  await cap('再下山：<b>火态</b>融开结冰的瀑布，<b>水态</b>浇灭鼎足的火');
  await cut([{x:1.5,z:-20.4},{x:1.6,z:-18.5},{x:0,z:-17.4},...fromDing.slice(1)]);await ev(()=>__R.snapCam(-.3,.45,9));
  await go([{x:-5.4,z:-.2,form:'fire',until:'Q.level.hazards.list[1].done',max:10},{x:3.6,z:-5.8,form:'water',until:'Q.level.hazards.list[0].done',max:10}],2);
  await speed(1);await play(2.4);
  await cap(null);
  await cut([{x:0,z:-6,form:'normal'},...toDing,{x:1.6,z:-18.5}]);await ev(()=>__R.snapCam(.3,.45,9));
  await go([{x:1.5,z:-20.4},{x:0,z:-23,until:"Q.game.mode!=='play'",max:6}]);
  await play(2);await ev(()=>{document.getElementById('btn-next').click();});await play(1.4);
  if(!stop('jiji')){
  // ================= 结尾：方位图与图鉴 =================
  await section('end');
  await ev(()=>__R.keys(false));
  await cap('三境通关，八卦方位图上点亮坎、离');await play(4);
  await cap('一路读到的卦和知识，都收进<b>图鉴</b>');
  await ev(()=>{document.getElementById('end').hidden=true;__Q.openCodex();});await play(2.4);
  await ev(()=>document.querySelector('[data-card="jiji"]').click());await play(3.6);
  await cap(null);await play(.6);
  }}}}
  }catch(e){if(!(e instanceof Stop))throw e;console.log('到达 MAXSEC，停止');}
  // ---------- 结束：导出声音事件 ----------
  const log=await ev(()=>__R.log),videoT=await ev(()=>__R.videoT);
  fs.writeFileSync(path.join(out,'audio-events.json'),JSON.stringify({videoT,log}));
  console.log(`共 ${n} 帧，${(n/30).toFixed(1)} 秒；声音事件 ${log.length} 个；耗时 ${((Date.now()-t0)/60000).toFixed(1)} 分钟`);
  if(errs.length)console.log('页面报错：',errs);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});

// 第三境「水火既济」自动通关（不瞬移）：走、跳、变身、搬爻块、放爻座、化解终乱、过卦门。
// 可单独运行：npm run build && node tools/verify-jiji.cjs；也由 tools/verify.cjs 调用。
const {route}=require('./route.cjs');
const K=[0,1,2,3,4,5].map(k=>({x:+(Math.sin(k*Math.PI/3)*3.3).toFixed(3),z:+(-23+Math.cos(k*Math.PI/3)*3.3).toFixed(3),top:3.6+k*.7}));
// 从起点岛 / 主岛去鼎山、从鼎山回主岛
const toDing=[{x:0,z:-9.3},{x:0,z:-11.4,jump:true},{x:-.8,z:-13.6,jump:true},{x:0,z:-15.8,jump:true},{x:0,z:-17.8,jump:true,minY:2.9}];
const fromDing=[{x:0,z:-17.4},{x:0,z:-15.8,jump:true},{x:-.8,z:-13.6,jump:true},{x:0,z:-11.4,jump:true},{x:0,z:-8.8,jump:true}];
// 沿环形爻座往上爬到第 k 个（逐级起跳），然后放下手里的爻块
function climbTo(k,expectSlot){const pts=[{x:1.2,z:-18.4}];
  for(let i=0;i<=k;i++){
    if(i>0){const a=K[i-1],b=K[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);pts.push({x:+(a.x+dx/l*.65).toFixed(3),z:+(a.z+dz/l*.65).toFixed(3),tol:.3,minY:a.top-.05,max:6});}// 先走到台边助跑
    pts.push({x:K[i].x,z:K[i].z,jump:true,tol:.45,minY:K[i].top-.05,max:8});}
  pts[pts.length-1].act=true;pts[pts.length-1].expect=`Q.level.slots[${expectSlot}].block!==null`;return pts;}
// 从第 k 个爻座跳下到鼎山地面，再沿外圈绕回南侧入口（避开其他爻座和蒸汽口）
const OFF=[[0,-17.9],[4.6,-21.8],[4.4,-25.6],[-2.2,-27.8],[-4.4,-25.6],[-4.4,-20.4]];
const offRing=(k)=>[{x:OFF[k][0],z:OFF[k][1],until:'P.grounded&&P.y<3.3',tol:.3}];
const SOUTH={east:[{x:4.8,z:-24},{x:4.8,z:-21},{x:1.8,z:-18},{x:0,z:-17.4}],west:[{x:-3.6,z:-27.4},{x:-4.8,z:-24},{x:-4.8,z:-21},{x:-1.8,z:-18},{x:0,z:-17.4}]};
const toSouth=(k)=>k===0?[{x:0,z:-17.4}]:k<=2?SOUTH.east.slice(k===1?1:0):k===5?SOUTH.west.slice(3):SOUTH.west;
const down=(k)=>[...offRing(k),...toSouth(k)];
const hold=(yang)=>`Q.level.held&&Q.level.held.yang===${yang}`;

async function runJiji(p,check,shot){
  const L=(pts,label)=>route(p,pts,label,check);
  // 1. 东岛：水态穿火墙，拿阳①，放「初」
  await L([{x:0,z:6},{x:7.6,z:-1.1},{x:10,z:-1,form:'water'},{x:13,z:-1},{x:17.6,z:-1.1},{x:20.6,z:.4},{x:18.5,z:-1.4,act:true,expect:hold(true)}],'第三境·阳①：水态穿过火墙，拿起阳爻块');
  // 当位规则：拿着阳爻块去放「二」位（阴位），应被拒绝并提示"不当位"
  const wrong=await p.evaluate(()=>{const Q=__Q,it=Q.level.interactables.find(i=>i.label==='放进「二」位');it.act();Q.step(.05);return {slot:Q.level.slots[1].block,held:!!Q.level.held,toast:document.getElementById('toast').textContent,codex:Q.save.codex.includes('dangwei')};});
  check('第三境：阳爻块放进「二」位被拒绝，提示"不当位"，并解锁"当位"图鉴',wrong.slot===null&&wrong.held&&/不当位/.test(wrong.toast)&&wrong.codex,wrong);
  await L([{x:13,z:-1},{x:9.6,z:-1},{x:4,z:-2,form:'normal'},...toDing,...climbTo(0,0)],'第三境·阳① → 鼎山「初」位');
  await shot('j1-chu');
  // 2. 上层：水态走瀑布上去，拿阳②，跳下，放「三」
  await L([...down(0),...fromDing.slice(1),{x:-4,z:-.5},{x:-6,z:.6,form:'water',until:'P.grounded&&P.y>7.9',max:12},{x:-5.2,z:-3.6},{x:-6.3,z:-5.7,act:true,expect:hold(true)},
    {x:-2.2,z:-2.6,until:'P.grounded&&P.y<1',max:8,form:'normal'},{x:-1,z:-6},...toDing,...climbTo(2,2)],'第三境·阳②（瀑布上的水域）→「三」');
  await shot('j2-san');
  // 3. 北方高岛：火态，踩蒸汽口弹上去，水泡碰火态即消，拿阳③，跳回鼎山，放「五」
  await L([...offRing(2),{x:1.7,z:-27.4,form:'fire'},{x:0,z:-28.2,until:'P.y>6',max:10,tol:.15},{x:0,z:-31,until:'P.grounded&&P.y>7.8',max:4},{x:0,z:-33.3,jump:true,minY:8.9},
    {x:3.6,z:-39.6,form:'fire'},{x:5.8,z:-41.5,jump:true,dj:true,minY:10.9,tol:.6,max:6,act:true,expect:"Q.save.codex.includes('weiji')"},{x:2.4,z:-38.6,until:'P.grounded&&P.y<9.2&&P.y>8.8',max:6},
    {x:-.9,z:-37.6,act:true,expect:hold(true)},{x:0,z:-32.2},{x:-1.6,z:-27.6,until:'P.grounded&&P.y<3.4',max:8},...SOUTH.west,...climbTo(4,4)],'第三境·阳③（蒸汽口 → 北方高岛）→「五」');
  await shot('j3-wu');
  // 4. 西岛：火态融冰，再变水态（火灵碰水态即消），拿阴①，放「二」
  await L([...down(4),...fromDing.slice(1),{x:-7.8,z:-1.5},{x:-12,z:-1.9},{x:-15.2,z:-2.1,form:'water'},{x:-18,z:-2,target:"(()=>{const e=Q.level.enemies.find(e=>e.home.x<-10&&e.alive);return e?{x:e.pos.x,z:e.pos.z}:null;})()",until:'!Q.level.enemies.some(e=>e.home.x<-10&&e.alive)',max:15},{x:-16.2,z:-2.2,form:'fire'},{x:-17.9,z:-2.3,until:'Q.level.blocks[1].lock.melted',max:8},
    {x:-18.6,z:-2.4,form:'water',act:true,expect:hold(false)},{x:-12,z:-1.9},{x:-7.8,z:-1.5},{x:-1,z:-6,form:'normal'},...toDing,...climbTo(1,1)],'第三境·阴①（西岛冰封）→「二」');
  await shot('j4-er');
  // 5. 东南岛：水态（火灵碰到就消），拿阴②，放「四」
  await L([...down(1),...fromDing.slice(1),{x:0,z:6,form:'water'},{x:5.2,z:12.6},{x:7.4,z:13.5,jump:true},{x:9.3,z:13.5,jump:true},{x:11.2,z:13.6,jump:true},{x:13.4,z:15.6},{x:14,z:14,act:true,expect:hold(false)},
    {x:11.2,z:13.6},{x:9.3,z:13.5,jump:true},{x:7.4,z:13.5,jump:true},{x:5.2,z:13.2,jump:true},{x:0,z:6,form:'normal'},{x:0,z:-6},...toDing,...climbTo(3,3)],'第三境·阴②（东南岛火灵）→「四」');
  await shot('j5-si');
  // 6. 上层石龛：水态上瀑布 → 云桥 → 火态点两盏石灯 → 拿阴③ → 跳下，放「上」
  await L([...down(3),...fromDing.slice(1),{x:-4,z:-.5},{x:-6,z:.6,form:'water',until:'P.grounded&&P.y>7.9',max:12},{x:-2.6,z:-4.6},{x:2.6,z:-4.4},{x:4.4,z:-4.2,form:'fire'},
    {x:4.6,z:-5.4,until:'Q.level.held===null&&__Q.level.interactables&&true&&P.grounded&&Math.hypot(P.x-4.6,P.z+6.4)<1.6',max:6},{x:8.6,z:-5,until:'P.grounded&&Math.hypot(P.x-9.6,P.z+5)<1.6',max:6},
    {x:5.4,z:-2.4},{x:6.7,z:-3.2,act:true,expect:hold(false)},{x:2.9,z:-2.3,until:'P.grounded&&P.y<1',max:8,form:'normal'},{x:-1,z:-6},...toDing,...climbTo(5,5)],'第三境·阴③（上层石龛）→「上」');
  await shot('j6-shang');
  const st=await p.evaluate(()=>{__Q.step(2.2,{draw:false});return {placed:__Q.level.slots.map(s=>s.block?(s.block.yang?1:0):null),phase:__Q.level.phase};});
  check('第三境：六爻当位，排成既济 [阳,阴,阳,阴,阳,阴]，进入"终乱"',st.placed.join()==='1,0,1,0,1,0'&&st.phase==='luan',st);
  await shot('j7-luan');
  if(st.phase!=='luan')return;
  // 7. 终乱：鼎山上的乱乱（水态灭火灵、火态灭水泡）→ 下山火态融冰 → 水态灭鼎足之火
  const fireLuan="(()=>{if(!Q.level.hazards)return null;const e=Q.level.hazards.list[2].enemies.find(e=>e.alive&&e.type==='fire');return e?{x:e.pos.x,z:e.pos.z}:null;})()";
  const waterLuan="(()=>{if(!Q.level.hazards)return null;const e=Q.level.hazards.list[2].enemies.find(e=>e.alive&&e.type==='water');return e?{x:e.pos.x,z:e.pos.z}:null;})()";
  await L([{x:-.6,z:-22.2,until:'P.grounded&&P.y<3.3',tol:.3},{x:0,z:-23,form:'water',target:fireLuan,until:"!Q.level.hazards.list[2].enemies.some(e=>e.alive&&e.type==='fire')",max:20},
    {x:0,z:-23,form:'fire',target:waterLuan,until:'Q.level.hazards.list[2].done',max:20},{x:1.5,z:-20.4},{x:1.6,z:-18.5},{x:0,z:-17.4},...fromDing.slice(1),
    {x:-5.4,z:-.2,form:'fire',until:'Q.level.hazards.list[1].done',max:10},{x:3.6,z:-5.8,form:'water',until:'Q.level.hazards.list[0].done',max:10}],'第三境·终乱（限时化解三处）');
  const st2=await p.evaluate(()=>({phase:__Q.level.phase,gems:__Q.level.gems.filter(g=>g.taken).map(g=>g.id),gate:__Q.level.gate.active,left:Math.round(__Q.level.luanLeft)}));
  check('第三境："思患而豫防之"——三处乱子在限时内化解，卦门亮起',st2.phase==='done'&&st2.gate,st2);
  await L([{x:0,z:-6,form:'normal'},...toDing,{x:1.6,z:-18.5},{x:1.5,z:-20.4},{x:0,z:-23,until:"Q.game.mode!=='play'",max:6}],'第三境·走进鼎山中央的卦门');
}
module.exports={runJiji};

if(require.main===module){
  const {chromium}=require('playwright'),path=require('node:path'),{pathToFileURL}=require('node:url'),fs=require('node:fs');
  const out=path.join(__dirname,'..','docs','verification');fs.mkdirSync(out,{recursive:true});let fails=0;
  const check=(n,ok,d)=>{if(!ok)fails++;console.log((ok?'PASS ':'FAIL ')+n+(d!==undefined?'  '+JSON.stringify(d):''));return ok;};
  (async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:800}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
    await p.goto(pathToFileURL(path.join(__dirname,'..','dist','易境-爻爻.html')).href);await p.waitForFunction(()=>window.__Q?.ready,null,{timeout:180000});
    await p.evaluate(()=>{__Q.start(2);__Q.step(.5,{draw:false});});
    await runJiji(p,check,async n=>{await p.evaluate(()=>__Q.step(.05));await p.screenshot({path:path.join(out,n+'.png')});});
    check('无运行时错误',errs.length===0,errs);await b.close();console.log(fails?'FAILED '+fails:'ALL PASSED');process.exit(fails?1:0);})().catch(e=>{console.error(e);process.exit(1);});
}

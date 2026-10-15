// 顺滑度回归测试：按手机常见刷新率（60 帧带抖动 / 90 / 120）逐帧推进真实主循环，往后退、转镜头，
// 测角色在屏幕上、镜头在世界里的逐帧"加速度"（越小越顺）。用法：npm run build && node tools/test-smooth.cjs
const {chromium}=require('playwright');const {pathToFileURL}=require('url');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:640,height:360}});
await p.goto(pathToFileURL(require('node:path').join(__dirname,'..','dist','易境-爻爻.html')).href);await p.waitForFunction(()=>window.__Q?.ready,null,{timeout:180000});
const rows=[];
for(const [lv,pos] of [[3,[0,0,-6]],[0,[0,0,3]]])for(const act of ['back','turn','backturn'])for(const hz of ['60j','90','120']){
  const keys=act==='back'?['s']:act==='turn'?['q']:['s','q'];
  await p.evaluate(([lv,pos])=>{const Q=__Q;Q.manual=true;if(Q.game.levelIndex!==lv||Q.game.mode!=='play')Q.start(lv);Q.teleport(...pos);Q.cam.targetYaw=Q.cam.yaw=0;for(let i=0;i<30;i++)Q.tick(1/60);},[lv,pos]);
  for(const k of keys)await p.keyboard.down(k);
  const r=await p.evaluate((hz)=>{const Q=__Q,THREE_V=Q.camera.position.constructor;const v=new THREE_V(),w=new THREE_V();let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    const sp=[],bg=[];for(let i=0;i<150;i++){const dt=hz==='60j'?1/60+(rnd()-.5)*.004:hz==='90'?1/90:1/120;Q.tick(dt);
      v.copy(Q.mascot.root.position);v.y+=.5;v.project(Q.camera);sp.push([v.x*320,v.y*180,dt]);bg.push([Q.camera.position.x*100,Q.camera.position.z*100+Q.camera.position.y*100,dt]);}
    // 抖动：相邻两帧屏幕速度的变化（像素/帧），越小越顺
    const jit=a=>{let s=0,n=0,mx=0;for(let i=2;i<a.length;i++){const v1x=(a[i][0]-a[i-1][0])/a[i][2],v1y=(a[i][1]-a[i-1][1])/a[i][2],v0x=(a[i-1][0]-a[i-2][0])/a[i-1][2],v0y=(a[i-1][1]-a[i-2][1])/a[i-1][2];const d=Math.hypot(v1x-v0x,v1y-v0y)*a[i][2];s+=d;n++;mx=Math.max(mx,d);}return [+(s/n).toFixed(2),+mx.toFixed(2)];};
    return {char:jit(sp.slice(40)),bg:jit(bg.slice(40))};},hz);
  for(const k of keys)await p.keyboard.up(k);
  rows.push([lv===3?'第四境':'第一境',act,hz,'角色 '+r.char.join('/'),'镜头 '+r.bg.join('/')].join('  '));}
console.log(rows.join('\n'));
  // 第四境：角色平均抖动 < 0.2 像素/帧，单帧最大 < 3；镜头单帧最大 < 6
  const bad=rows.filter(r=>r.startsWith('第四境')).filter(r=>{const m=r.match(/角色 ([\d.]+)\/([\d.]+)  镜头 ([\d.]+)\/([\d.]+)/);return !(+m[1]<.2&&+m[2]<3&&+m[4]<6);});
  console.log(bad.length?'FAILED '+bad.length:'ALL PASSED');await b.close();process.exit(bad.length?1:0);})();

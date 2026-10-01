// 易境 · 爻爻 — 自动验证。
// 1) 用 npm start 的页面与 dist 离线页分别加载，检查无报错、无失败请求；
// 2) 不瞬移：自动走位 + 跳跃，按真实路线打通两境（解卦、收爻玉、过卦门），并检查弹跳形变、二段跳、落水重生；
// 3) 截图与 JSON 报告写入 docs/verification/。
// 物理以固定步长推进（__Q.step），结果不受机器帧率影响。用法：npm run build && npm run verify
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..'),out=path.join(root,'docs','verification'),port=8520;fs.mkdirSync(out,{recursive:true});
const report={time:new Date().toISOString(),checks:[]};
const check=(name,ok,detail)=>{report.checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+(detail!==undefined?'  '+JSON.stringify(detail):''));return ok;};

// 在页面里跑一段路线。每个航点：{x,z,jump,dj,tol,max,until}
async function route(p,points,label){
  for(const [i,w] of points.entries()){
    const r=await p.evaluate(async(w)=>{
      const Q=__Q,P=Q.player,start=Q.game.time,tol=w.tol??.45,max=w.max??12,falls0=Q.game.falls;
      const dir=()=>{const dx=w.x-P.x,dz=w.z-P.z,l=Math.hypot(dx,dz)||1;return {x:dx/l,z:dz/l,l};};
      if(w.waitLift){while(Q.game.time-start<20){const top=Q.level._liftTop();if(top<.45)break;Q.step(.05,{draw:false});}}
      if(w.waitLiftTop){while(Q.game.time-start<20){const top=Q.level._liftTop();if(top>3.25)break;Q.step(.05,{draw:false});}}
      if(w.waitSlider){while(Q.game.time-start<20){if(Q.level._sliderX()>.45&&Q.level._sliderX()<.75)break;Q.step(1/60,{draw:false});}}
      if(w.onSlider)w.x=Q.level._sliderX();
      if(w.jump){const d=dir();Q.step(1/120,{jump:true,move:d,draw:false});}
      let dj=!!w.dj;
      while(Q.game.time-start<max){
        if(w.onSlider)w.x=Q.level._sliderX();
        const d=dir();
        if(dj&&Q.game.time-start>.24){Q.step(1/120,{jump:true,move:d,draw:false});dj=false;continue;}
        if(Q.game.falls>falls0)return {ok:false,why:'fell',pos:[P.x,P.y,P.z]};
        if(w.until){if(eval(w.until))return {ok:true,t:Q.game.time-start,pos:[P.x,P.y,P.z]};}
        else if(d.l<tol&&P.grounded&&(w.minY===undefined||P.y>w.minY))return {ok:true,t:Q.game.time-start,pos:[+P.x.toFixed(2),+P.y.toFixed(2),+P.z.toFixed(2)]};
        Q.step(1/60,{move:d.l<tol?{x:0,z:0}:d,draw:false});
      }
      return {ok:false,why:'timeout',pos:[P.x,P.y,P.z]};
    },w);
    if(!r.ok){check(`${label}: 航点 ${i} (${w.x},${w.z}) 到达`,false,r);return false;}
  }
  check(`${label}: 全部 ${points.length} 个航点到达（无瞬移、无落水）`,true);return true;
}

(async()=>{
  const server=spawn(process.execPath,[path.join(root,'server.cjs')],{cwd:root,stdio:['ignore','pipe','inherit']});
  await new Promise((res,rej)=>{server.stdout.on('data',d=>{if(String(d).includes('http://'))res();});server.on('exit',c=>rej(Error('server exited '+c)));});
  const b=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});
  try{
    for(const [label,url] of [['server',`http://127.0.0.1:${port}/`],['dist',pathToFileURL(path.join(root,'dist','易境-爻爻.html')).href]]){
      const p=await b.newPage({viewport:{width:1280,height:800}}),errors=[],failed=[];
      p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('requestfailed',r=>failed.push(r.url()));
      if(label==='dist')await p.route(/^https?:/,r=>r.abort());
      await p.goto(url);await p.waitForFunction(()=>window.__Q?.ready,null,{timeout:180000});
      check(label+': 页面加载完成',true);check(label+': 无失败请求',failed.length===0,failed);
      if(label==='server'){await p.waitForTimeout(800);await p.screenshot({path:path.join(out,'01-title.png')});check(label+': 无运行时错误',errors.length===0,errors);await p.close();continue;}

      // ---------- dist：完整流程 ----------
      await p.evaluate(()=>{try{localStorage.clear();}catch{}});await p.reload();await p.waitForFunction(()=>window.__Q?.ready,null,{timeout:180000});
      // 四个角色：逐个选择，截图；能力一致（同样输入，同样位移）
      const chars={};
      for(const k of ['nuo','lin','koi','yao']){await p.click(`[data-char="${k}"]`);await p.evaluate(()=>__Q.step(.8));await p.screenshot({path:path.join(out,'00-char-'+k+'.png')});
        chars[k]=await p.evaluate(()=>{const Q=__Q,P=Q.player;Q.game.mode='play';Q.teleport(0,0,3.5);Q.step(.2,{draw:false});for(let i=0;i<60;i++)Q.step(1/60,{move:{x:0,z:-1},draw:false});const r={kind:Q.mascot.kind,z:+P.z.toFixed(3)};Q.showTitle();return r;});}
      check('四个角色都能选择并显示',Object.values(chars).map(c=>c.kind).join()==='nuo,lin,koi,yao',chars);
      check('四个角色能力完全一致（同样输入位移相同）',new Set(Object.values(chars).map(c=>c.z)).size===1,chars);
      check('选中的角色记入存档',await p.evaluate(()=>__Q.save.char==='yao'));
      await p.click('[data-char="nuo"]');
      await p.click('#btn-start');
      await p.evaluate(()=>__Q.step(.6));
      await p.screenshot({path:path.join(out,'02-kan-start.png')});
      await p.waitForTimeout(1200);
      const music=await p.evaluate(()=>__Q.sfx._debug());
      check('音乐：第一境播放坎（羽调）主题，并在推进',music.ctx&&music.themeName==='kan'&&music.step>4,music);
      // 弹跳形变：走路时自动小跳，身体在压扁与拉长之间变化
      const bounce=await p.evaluate(()=>{const Q=__Q,P=Q.player,sq=Q.mascot.root.children[0].children[0];let hops=0,wasG=true,minS=9,maxS=0;const x0=P.x,z0=P.z;
        for(let i=0;i<72;i++){Q.step(1/60,{move:{x:0,z:-1},draw:false});if(wasG&&!P.grounded)hops++;wasG=P.grounded;minS=Math.min(minS,sq.scale.y);maxS=Math.max(maxS,sq.scale.y);}
        for(let i=0;i<40;i++)Q.step(1/60,{draw:false});const moved=Math.hypot(P.x-x0,P.z-z0);return {hops,minScaleY:+minS.toFixed(3),maxScaleY:+maxS.toFixed(3),moved:+moved.toFixed(2)};});
      check('走路 1.2 秒：移动并自动蹦跳',bounce.moved>4&&bounce.hops>=3,bounce);
      check('果冻形变：落地压扁 <0.92、腾空拉长 >1.05',bounce.minScaleY<.92&&bounce.maxScaleY>1.05,bounce);
      const jumps=await p.evaluate(()=>{const Q=__Q,P=Q.player;Q.teleport(0,0,3.5);Q.step(.3,{draw:false});let h1=0,h2=0;Q.step(1/120,{jump:true,draw:false});for(let i=0;i<90;i++){Q.step(1/120,{draw:false});h1=Math.max(h1,P.y);}Q.step(1.2,{draw:false});
        Q.step(1/120,{jump:true,draw:false});for(let i=0;i<30;i++)Q.step(1/120,{draw:false});Q.step(1/120,{jump:true,draw:false});for(let i=0;i<90;i++){Q.step(1/120,{draw:false});h2=Math.max(h2,P.y);}Q.step(1.2,{draw:false});return {single:+h1.toFixed(2),double:+h2.toFixed(2)};});
      check('跳跃与二段跳（二段跳更高）',jumps.single>1.2&&jumps.double>jumps.single+.6,jumps);
      const fall=await p.evaluate(()=>{const Q=__Q,P=Q.player;Q.teleport(0,0,3.5);Q.step(.3,{draw:false});const f0=Q.game.falls;Q.teleport(0,.5,9.5);P.checkpoint={x:0,y:0,z:3.5};Q.step(1.5,{draw:false});return {falls:Q.game.falls-f0,pos:[+P.x.toFixed(2),+P.y.toFixed(2),+P.z.toFixed(2)]};});
      check('掉进水里会回到最近站稳处',fall.falls===1&&fall.pos[1]>=0,fall);
      await p.evaluate(()=>{__Q.start(0);__Q.step(.4,{draw:false});});

      // 第一境 路线：东岛爻玉 → 回起点 → 过河（浮石爻玉）→ 三座爻台 → 云垫上高台（爻玉）→ 升起的石桥 → 卦门
      const kan1=await route(p,[
        {x:6.2,z:-2.7},{x:8.4,z:-3.6,jump:true},{x:9.9,z:-5.3,jump:true},{x:12.3,z:-7.4,jump:true},{x:14.3,z:-9.4},
        {x:11,z:-6.6},{x:9.9,z:-5.3,jump:true},{x:8.4,z:-3.6,jump:true},{x:6,z:-2.6,jump:true},
        {x:4.4,z:-1.1},{x:-.9,z:-6.2},{x:-1.2,z:-8.4,jump:true},{x:.9,z:-10.6,jump:true,tol:.6},{x:-.4,z:-12.8,jump:true},{x:-.2,z:-15,jump:true},
      ],'第一境·前半');
      const st1=await p.evaluate(()=>({gems:__Q.level.gems.filter(g=>g.taken).map(g=>g.id),altars:__Q.level.altars.map(a=>a.yang?1:0)}));
      check('第一境：途中拾得东岛与浮石上的爻玉',st1.gems.includes('east')&&st1.gems.includes('bob'),st1);
      await p.evaluate(()=>__Q.step(.05));await p.screenshot({path:path.join(out,'03-kan-altars-before.png')});
      const kan2=await route(p,[{x:-3.6,z:-15.8},{x:-3.6,z:-17.6,jump:true},{x:-3.6,z:-20.6,jump:true},{x:-3.6,z:-23.6,jump:true}],'第一境·爻台');
      const st2=await p.evaluate(()=>({altars:__Q.level.altars.map(a=>a.yang?1:0),solved:__Q.level.solved}));
      check('第一境：三座爻台排成坎卦 [阴,阳,阴]，石桥升起',st2.solved&&st2.altars.join()==='0,1,0',st2);
      await p.evaluate(()=>{__Q.step(2,{draw:false});__Q.cam.targetYaw=__Q.cam.yaw=-.6;__Q.step(.1);});await p.screenshot({path:path.join(out,'04-kan-solved.png')});
      const kan3=await route(p,[{x:-1,z:-23.6},{x:4.3,z:-23.8},{x:7.6,z:-27.3,until:'P.grounded&&P.y>3.9&&Math.hypot(P.x-7.6,P.z+27.3)<1.1',max:8},{x:3.5,z:-25,jump:true},{x:.3,z:-24.6},{x:0,z:-28.2}],'第一境·云垫与高台');
      const st3=await p.evaluate(()=>({gems:__Q.level.gems.filter(g=>g.taken).map(g=>g.id),gate:__Q.level.gate.active}));
      check('第一境：拿到 3 枚以上爻玉，卦门亮起',st3.gems.length>=3&&st3.gate,st3);
      const kan4=await route(p,[{x:0,z:-29.6},{x:.8,z:-31.7},{x:.73,z:-33.8},{x:-.14,z:-35.9},{x:-.86,z:-38},{x:0,z:-39.4}],'第一境·石桥');
      await p.evaluate(()=>{__Q.cam.targetYaw=__Q.cam.yaw=.3;__Q.step(.3);});await p.screenshot({path:path.join(out,'05-kan-gate.png')});
      await p.evaluate(()=>{const Q=__Q;for(let i=0;i<240&&Q.game.mode==='play';i++)Q.step(1/60,{move:{x:0,z:-1},draw:false});});
      await p.waitForFunction(()=>__Q.game.mode==='clear',null,{timeout:60000});await p.waitForTimeout(500);
      const clear1=await p.evaluate(()=>({stars:[...document.querySelectorAll('#clear-stars li')].map(l=>l.className==='on'),saved:__Q.save.stars.kan,codex:__Q.save.codex.slice()}));
      check('第一境：走进卦门，出现结算（通关星亮、星数记入存档）',clear1.stars[0]&&clear1.saved>=1,clear1);
      check('图鉴：第一境解锁 爻位 / 坎 / 五音',['yaowei','kan','wuyin'].every(i=>clear1.codex.includes(i)),clear1.codex);
      await p.screenshot({path:path.join(out,'05b-kan-clear.png')});
      await p.click('#btn-next');
      await p.waitForFunction(()=>__Q.game.levelIndex===1&&__Q.game.mode==='play',null,{timeout:60000});
      check('第一境：点「继续」进入第二境',true,{cleared:await p.evaluate(()=>__Q.game.cleared)});
      await p.waitForTimeout(800);check('音乐：第二境切换为离（徵调）主题',await p.evaluate(()=>__Q.sfx._debug().themeName==='li'));
      await p.evaluate(()=>__Q.step(.6));await p.screenshot({path:path.join(out,'06-li-start.png')});

      // 第二境 路线：火塘取火 → 木桥 → 点燃「初」→ 回火塘 → 升降台 → 横移石 → 点燃「三」→ 石阶下山 → 盖灭「二」→ 回起点 → 石墩 → 卦门
      const li1=await route(p,[{x:0,z:-.2,until:'Q.level.carry>0'},{x:3,z:1.2},{x:5.4,z:-.9},{x:7.6,z:-1.9},{x:10.2,z:-2.8},{x:11.3,z:-1.8},{x:12.9,z:-2.9,until:'Q.level.braziers[0].lit'}],'第二境·点燃初');
      await p.evaluate(()=>{__Q.cam.targetYaw=__Q.cam.yaw=-.9;__Q.cam.targetDist=__Q.cam.dist=7;__Q.step(.3);});await p.screenshot({path:path.join(out,'07-li-first-fire.png')});
      await p.evaluate(()=>{__Q.cam.targetDist=9;});
      const li2=await route(p,[{x:10.2,z:-2.8},{x:7.6,z:-1.9},{x:4.5,z:-.6},{x:1.4,z:-1.8,until:'Q.level.carry>20'},{x:0,z:-5.9},
        {x:0,z:-8.4,waitLift:true,jump:true,tol:.7},{x:0,z:-8.4,waitLiftTop:true,until:'Q.level._liftTop()>3.25'},
        {x:1.2,z:-11.4,jump:true,tol:.55},{x:0,z:-14,onSlider:true,waitSlider:true,jump:true,tol:.5,until:'P.grounded&&P.y>3.9&&Math.abs(P.z+14)<1.1'},{x:.4,z:-16.9,jump:true,tol:.55},{x:0,z:-19.8,jump:true},{x:1.6,z:-22},{x:.9,z:-23.4,until:'Q.level.braziers[2].lit'}],'第二境·点燃三');
      await p.evaluate(()=>{__Q.cam.targetYaw=__Q.cam.yaw=.5;__Q.step(.3);});await p.screenshot({path:path.join(out,'08-li-high-fire.png')});
      const li3=await route(p,[{x:-3.2,z:-22.6},{x:-5.4,z:-21.2,jump:true},{x:-6.3,z:-18.4,jump:true},{x:-6.8,z:-15.5,jump:true},{x:-8.2,z:-13.6,jump:true},{x:-10.2,z:-11.6,jump:true},{x:-10.2,z:-7.6},{x:-10.6,z:-9.2}],'第二境·下山到二');
      const ext=await p.evaluate(()=>{__Q.interact();__Q.step(.2);return __Q.level.braziers.map(b=>b.lit?1:0);});
      const st4=await p.evaluate(()=>({braziers:__Q.level.braziers.map(b=>b.lit?1:0),solved:__Q.level.solved,gems:__Q.level.gems.filter(g=>g.taken).map(g=>g.id),gate:__Q.level.gate.active}));
      check('第二境：按 E 盖灭「二」，三座火台排成离卦 [阳,阴,阳]',st4.solved&&ext.join()==='1,0,1',st4);
      check('第二境：拿到 3 枚以上爻玉，卦门亮起',st4.gems.length>=3&&st4.gate,st4);
      const li4=await route(p,[{x:-8.4,z:-6},{x:-6.9,z:-3.9,jump:true},{x:-5.4,z:-3,jump:true},{x:-3,z:1.5},{x:3,z:1.5},{x:4.5,z:-.6},{x:7.6,z:-1.9},{x:11.5,z:-5.6},{x:13.4,z:-8.6,jump:true},{x:14,z:-10.8},{x:14.6,z:-13},{x:15,z:-16,jump:true}],'第二境·去卦门');
      await p.evaluate(()=>{__Q.cam.targetYaw=__Q.cam.yaw=.2;__Q.step(.3);});await p.screenshot({path:path.join(out,'09-li-gate.png')});
      await p.evaluate(()=>{const Q=__Q;for(let i=0;i<300&&Q.game.mode==='play';i++){const P=Q.player,dx=15.3-P.x,dz=-20.6-P.z,l=Math.hypot(dx,dz)||1;Q.step(1/60,{move:{x:dx/l,z:dz/l},draw:false});}});
      await p.waitForFunction(()=>__Q.game.mode==='clear',null,{timeout:60000});await p.click('#btn-next');
      await p.waitForFunction(()=>__Q.game.mode==='end',null,{timeout:60000});await p.waitForTimeout(400);
      const end=await p.evaluate(()=>({mode:__Q.game.mode,cleared:__Q.game.cleared,gems:document.getElementById('end-gems').textContent,map:[...document.querySelectorAll('#end-map .node.done > b')].map(b=>b.textContent)}));
      check('第二境：走进卦门，出现结局与八卦方位图（坎、离点亮）',end.mode==='end'&&end.map.join()==='坎,离',end);
      await p.screenshot({path:path.join(out,'10-end.png')});
      // 考据弹窗
      await p.evaluate(()=>{document.getElementById('end').hidden=true;});await p.click('#btn-lore');await p.waitForTimeout(300);await p.screenshot({path:path.join(out,'11-lore.png')});
      const lore=await p.evaluate(()=>document.getElementById('lore-quotes').innerText);check('考据弹窗：引文均注明出处',/说卦传/.test(lore)&&/象传/.test(lore)&&/八卦取象歌/.test(lore),lore.split('\n').slice(0,4));
      // 图鉴
      await p.evaluate(()=>{document.getElementById('lore').close();__Q.openCodex();});await p.waitForTimeout(300);await p.screenshot({path:path.join(out,'11b-codex.png')});
      await p.click('[data-card="wuyin"]');await p.waitForTimeout(300);await p.screenshot({path:path.join(out,'11c-codex-wuyin.png')});
      const card=await p.evaluate(()=>document.getElementById('codex-detail').innerText);check('图鉴卡：五音卡引《礼记·月令》',/礼记·月令/.test(card)&&/其音羽/.test(card),card.split('\n').slice(0,3));
      await p.evaluate(()=>document.getElementById('codex').close());
      // 挑战模式：显示计时；落水回到本境起点；超时重开
      const ch=await p.evaluate(()=>{const Q=__Q;Q.setChallenge(true);Q.start(0);Q.step(.3,{draw:false});const timer=!document.getElementById('timer').hidden;
        Q.teleport(-1.2,.2,-8.4);Q.step(.4,{draw:false});Q.player.checkpoint={x:-1.2,y:.2,z:-8.4};Q.teleport(3,.5,-9.5);Q.step(1.6,{draw:false});const back=[+Q.player.x.toFixed(2),+Q.player.z.toFixed(2)];
        Q.game.levelTime=Q.game.timeLimit-.05;Q.step(.2,{draw:false});const reset=Q.game.levelTime<1;Q.setChallenge(false);return {timer,back,reset};});
      check('挑战模式：计时显示、落水回本境起点、超时重开',ch.timer&&Math.hypot(ch.back[0]-0,ch.back[1]-3.5)<.6&&ch.reset,ch);
      // 近景：玉团子
      await p.evaluate(()=>{__Q.start(0);const c=__Q.cam;c.targetDist=c.dist=3.6;c.targetPitch=c.pitch=.22;c.targetYaw=c.yaw=.35;__Q.step(.5);});
      await p.screenshot({path:path.join(out,'12-yaoyao-closeup.png')});
      check('dist: 全程无运行时错误',errors.length===0,errors);
      await p.close();
      // 手机（触屏模拟）
      const m=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const merr=[];m.on('pageerror',e=>merr.push(String(e)));await m.route(/^https?:/,r=>r.abort());
      await m.goto(url);await m.waitForFunction(()=>window.__Q?.ready,null,{timeout:180000});await m.waitForTimeout(500);
      check('390px 手机：无横向溢出',await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await m.screenshot({path:path.join(out,'13-mobile-title.png')});
      await m.tap('#btn-start');await m.evaluate(()=>__Q.step(.4));
      const hud=await m.evaluate(()=>{const r=id=>document.getElementById(id).getBoundingClientRect();const t=document.querySelector('.badge strong');return {joystick:getComputedStyle(document.getElementById('joystick')).display!=='none',jump:getComputedStyle(document.getElementById('btn-jump')).display!=='none',titleOneLine:t.getBoundingClientRect().height<30,gemsOneLine:r('gems').height<30};});
      check('手机：显示摇杆与跳跃键，顶栏不折行',hud.joystick&&hud.jump&&hud.titleOneLine&&hud.gemsOneLine,hud);
      const x0=await m.evaluate(()=>__Q.player.z);const jb=await m.locator('#joystick').boundingBox();
      // 真实触摸事件（CDP）：按住摇杆中心，向上拖到边缘
      const cdp=await m.context().newCDPSession(m),cx=jb.x+jb.width/2,cy=jb.y+jb.height/2;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:cy,id:1}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx,y:cy-60,id:1}]});
      await m.evaluate(()=>__Q.step(.6));
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const x1=await m.evaluate(()=>__Q.player.z);check('手机：摇杆向上推，团子向前走',x0-x1>1.5,{before:+x0.toFixed(2),after:+x1.toFixed(2)});
      await m.screenshot({path:path.join(out,'14-mobile-play.png')});
      check('手机：无运行时错误',merr.length===0,merr);await m.close();
    }
  }finally{await b.close();server.kill();}
  report.passed=report.checks.every(c=>c.ok);fs.writeFileSync(path.join(out,'verify-report.json'),JSON.stringify(report,null,2));
  console.log(report.passed?'ALL PASSED ('+report.checks.length+')':'FAILED');if(!report.passed)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});

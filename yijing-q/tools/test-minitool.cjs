// 小工具包的浏览器自测（不能代替创服平台模拟器与真机验证，只用来尽早发现明显问题）。
// 用 file:// 打开 dist-minitool/index.html，模拟手机视口；网络请求一律拦截（小工具不联网）。
// 用法：node tools/build-minitool.cjs && node tools/test-minitool.cjs
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..'),url=pathToFileURL(path.join(root,'dist-minitool','index.html')).href,out=path.join(root,'docs','minitool');
fs.mkdirSync(out,{recursive:true});
let fails=0;const check=(n,ok,d)=>{if(!ok)fails++;console.log((ok?'PASS ':'FAIL ')+n+(d!==undefined?'  '+JSON.stringify(d):''));};
const phone={viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true};
// 模拟容器注入的 window.xhs（客户端 9.46.2，带 Storage）
const fakeXhs=`window.__store={};window.xhs={launchOptions:{miniToolEnv:{buildVersion:'9462004',userDataPath:'/usr'}},miniTool:{
  getStorage:({key})=>Promise.resolve({errMsg:'getStorage:ok',data:key in window.__store?window.__store[key]:null}),
  setStorage:({key,data})=>{window.__store[key]=data;return Promise.resolve({errMsg:'setStorage:ok'});}}};`;

async function open(b,{init='',label}){const ctx=await b.newContext(phone);await ctx.route(/^https?:/,r=>r.abort());const p=await ctx.newPage();const errs=[],reqs=[];
  p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});p.on('request',r=>{if(!r.url().startsWith('file:'))reqs.push(r.url());});
  if(init)await p.addInitScript(init);await p.goto(url);return {ctx,p,errs,reqs,label};}

(async()=>{
  const b=await chromium.launch();
  try{
    // 1. 正常启动 + 真实操作
    {const {ctx,p,errs,reqs}=await open(b,{init:fakeXhs});
      await p.waitForFunction(()=>window.__Q&&window.__Q.ready,null,{timeout:180000});
      const st=await p.evaluate(()=>({title:!document.getElementById('title').hidden,glnote:document.getElementById('glnote').hidden,scripts:[...document.scripts].map(s=>s.getAttribute('src')),store:!!window.__YQ_STORE,pr:__Q.renderer.getPixelRatio(),buf:[__Q.renderer.domElement.width,__Q.renderer.domElement.height]}));
      check('启动：经典脚本按顺序加载（polyfills → boot → main），出现标题页',st.title&&st.glnote&&st.scripts.join()==='./polyfills.js,./boot.js,./main.js',st);
      check('WebGL 预算：像素倍数 ≤ 1.5，绘制缓冲 ≤ 约 200 万像素',st.pr<=1.5&&st.buf[0]*st.buf[1]<=2.1e6,{pr:st.pr,buf:st.buf});
      await p.screenshot({path:path.join(out,'01-title.png')});
      await p.tap('#btn-start');
      const r=await p.evaluate(()=>{const Q=__Q,P=Q.player;Q.manual=true;Q.step(.4,{draw:false});const z0=P.z;for(let i=0;i<90;i++)Q.step(1/60,{move:{x:0,z:-1},draw:false});Q.step(1/120,{jump:true,draw:false});let h=0;for(let i=0;i<60;i++){Q.step(1/120,{draw:false});h=Math.max(h,P.y);}Q.step(1);Q.render();
        return {moved:+(z0-P.z).toFixed(2),jump:+h.toFixed(2),mode:Q.game.mode,calls:Q.renderer.info.render.calls};});
      check('第一境：能走、能跳',r.moved>3&&r.jump>1&&r.mode==='play',r);
      check('每帧绘制次数 ≤ 100（静态装饰已合并）',r.calls<=100,{calls:r.calls});
      await p.screenshot({path:path.join(out,'02-play.png')});
      // 第四境（水下）：按住跳上浮；六段水域里每帧绘制次数都 ≤ 100
      const w=await p.evaluate(()=>{const Q=__Q;Q.start(3);const P=Q.player;Q.step(.5,{draw:false});const y0=P.y;Q.step(1,{up:true,draw:false});const rise=P.y-y0;const calls=[];
        for(const [x,y,z] of [[0,0,14],[0,3,-6],[-3,5,-22],[0,0,-42],[0,0,-58],[0,0,-72],[5,15,-78]]){Q.teleport(x,y,z);Q.step(.3,{draw:false});Q.cam.focus.set(x,y+1,z);Q.render();calls.push(Q.renderer.info.render.calls);}
        return {rise:+rise.toFixed(2),swim:P.swim!==undefined,calls,max:Math.max(...calls)};});
      check('第四境：水下能游（按住跳上浮），六段水域每帧绘制次数都 ≤ 100',w.rise>2&&w.max<=100,w);
      const q=await p.evaluate(()=>{const Q=__Q;Q.start(4);Q.step(.5,{draw:false});const calls=[];
        for(const [x,y,z] of [[0,.6,12],[0,1.2,-20],[0,1.6,-40],[0,9.6,-50]]){Q.teleport(x,y,z);Q.step(.3,{draw:false});for(const yaw of [0,3.14]){Q.cam.yaw=Q.cam.targetYaw=yaw;Q.cam.focus.set(x,y+1,z);Q.render();calls.push(Q.renderer.info.render.calls);}}
        return {calls,max:Math.max(...calls),sundial:!document.getElementById('sundial').hidden};});
      check('第五境（试玩）：日晷显示，每帧绘制次数 ≤ 100',q.max<=100&&q.sundial,q);
      await p.screenshot({path:path.join(out,'08-weiji.png')});
      // 提示框能关掉：点 ×
      await p.evaluate(()=>{__Q.toast('九四 · 震用伐鬼方。这是一段很长的提示文字，用来测试能不能关掉。',60000);__Q.render();});await p.waitForTimeout(350);
      await p.screenshot({path:path.join(out,'09-toast.png')});await p.tap('#toast-x');await p.evaluate(()=>__Q.render());await p.waitForTimeout(350);
      const closed=await p.evaluate(()=>!document.getElementById('toast').classList.contains('show'));
      check('提示框：点 × 立刻关掉',closed,await p.evaluate(()=>({cls:document.getElementById('toast').className,op:getComputedStyle(document.getElementById('toast')).opacity,txt:document.getElementById('toast-text').textContent.slice(0,12)})));
      // 存档：选角色写入容器 Storage，刷新后读回
      await p.evaluate(()=>{__Q.showTitle();__Q.selectCharacter('koi');});
      const saved=await p.evaluate(()=>window.__store['yijing-q-save-v1']||null);
      check('存档：写入容器 Storage（客户端 9.46+）',!!saved&&JSON.parse(saved).char==='koi',saved&&JSON.parse(saved).char);
      await p.evaluate(()=>localStorage.clear());await p.addInitScript(s=>{window.__store={'yijing-q-save-v1':s};},saved);await p.reload();
      await p.waitForFunction(()=>window.__Q&&window.__Q.ready,null,{timeout:180000});
      check('存档：刷新后从容器 Storage 读回（浏览器本地存储已清空）',await p.evaluate(()=>__Q.save.char==='koi'));
      check('不联网：没有发出任何网络请求',reqs.length===0,reqs);
      check('无运行时错误',errs.length===0,errs);await ctx.close();}
    // 1b. 横屏模式（小红书锁竖屏，靠页面整体旋转）：摇杆、镜头方向正确，弹窗居中完整，选择写入存档
    {const {ctx,p,errs}=await open(b,{init:fakeXhs});await p.waitForFunction(()=>window.__Q&&window.__Q.ready,null,{timeout:180000});
      await p.tap('#btn-orient');const cls=await p.evaluate(()=>document.documentElement.className);
      await p.screenshot({path:path.join(out,'06-land-title.png')});
      await p.tap('#btn-start');await p.evaluate(()=>{__Q.manual=true;__Q.step(.5,{draw:false});});
      const jb=await p.locator('#joystick').boundingBox(),cdp=await ctx.newCDPSession(p),cx=jb.x+jb.width/2,cy=jb.y+jb.height/2;
      const z0=await p.evaluate(()=>__Q.player.z);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:cy,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx+50,y:cy,id:1}]});
      await p.evaluate(()=>__Q.step(.6,{draw:false}));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const fwd=await p.evaluate(z0=>z0-__Q.player.z,z0);
      const y0=await p.evaluate(()=>__Q.cam.targetYaw);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:650,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y:710,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      const dyaw=await p.evaluate(y0=>__Q.cam.targetYaw-y0,y0);
      check('横屏模式：页面整体旋转；手指往"上"推摇杆向前走，往"右"拖镜头右转（与竖屏手感一致）',/\bland\b/.test(cls)&&fwd>1&&dyaw<0,{cls,fwd:+fwd.toFixed(2),dyaw:+dyaw.toFixed(3)});
      await p.evaluate(()=>{__Q.toast('横屏下的提示，也能关掉。',60000);__Q.render();});await p.waitForTimeout(350);
      {const xb=await p.locator('#toast-x').boundingBox();await p.touchscreen.tap(xb.x+xb.width/2,xb.y+xb.height/2);await p.evaluate(()=>__Q.render());}
      check('横屏模式：提示框点 × 也能关掉',await p.evaluate(()=>!document.getElementById('toast').classList.contains('show')),await p.evaluate(()=>{const b=document.getElementById('toast-x').getBoundingClientRect();const e=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return {b:[b.left,b.top,b.width,b.height].map(Math.round),hit:e&&(e.id||e.className),cls:document.getElementById('toast').className};}));
      await p.evaluate(()=>{__Q.step(.1);document.getElementById('btn-lore').click();});await p.waitForTimeout(300);
      const lr=await p.evaluate(()=>{const r=document.getElementById('lore').getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom,W:innerWidth,H:innerHeight};});
      await p.screenshot({path:path.join(out,'07-land-lore.png')});
      check('横屏模式：碑文弹窗居中、完整在屏幕内',lr.l>=0&&lr.t>=0&&lr.r<=lr.W&&lr.b<=lr.H&&Math.abs((lr.l+lr.r)/2-lr.W/2)<2,lr);
      await p.evaluate(()=>document.getElementById('lore').close());
      const saved=await p.evaluate(()=>JSON.parse(window.__store['yijing-q-save-v1']||'{}').land);
      check('横屏模式：选择写入存档，下次打开保持',saved===true,{saved});
      check('横屏模式：无运行时错误',errs.length===0,errs);await ctx.close();}
    // 2. 没有容器（普通浏览器 / 低版本）：退回浏览器本地存储
    {const {ctx,p,errs}=await open(b,{});await p.waitForFunction(()=>window.__Q&&window.__Q.ready,null,{timeout:180000});
      await p.evaluate(()=>__Q.selectCharacter('lin'));const ls=await p.evaluate(()=>JSON.parse(localStorage.getItem('yijing-q-save-v1')||'{}').char);
      check('无容器 Storage 时：存档写入浏览器本地存储',ls==='lin'&&errs.length===0,{ls,errs});await ctx.close();}
    // 3. 不支持 WebGL 2：显示说明，不白屏、不报错循环
    {const {ctx,p,errs}=await open(b,{init:`(()=>{const g=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t==='webgl2'?null:g.call(this,t,...a);};})();`});
      await p.waitForTimeout(1500);const fb=await p.evaluate(()=>({note:document.getElementById('glnote').hidden?null:document.getElementById('glnote').textContent,game:!!(window.__Q&&window.__Q.ready),main:[...document.scripts].some(s=>s.getAttribute('src')==='./main.js')}));
      await p.screenshot({path:path.join(out,'03-no-webgl2.png')});
      check('不支持 WebGL 2：显示说明文字，不加载游戏',!!fb.note&&!fb.game&&!fb.main,fb);check('不支持 WebGL 2：无报错',errs.length===0,errs);await ctx.close();}
    // 4. 旧内核 Flex gap 回退：强制 .no-flexgap，界面不挤在一起
    {const {ctx,p}=await open(b,{});await p.waitForFunction(()=>window.__Q&&window.__Q.ready,null,{timeout:180000});
      const gapOn=await p.evaluate(()=>{const r=[...document.querySelectorAll('.chars button')].map(b=>b.getBoundingClientRect());return Math.round(r[1].left-r[0].right);});
      await p.evaluate(()=>{document.documentElement.classList.add('no-flexgap');document.querySelectorAll('.chars,.chapters').forEach(e=>e.style.gap='0');});await p.waitForTimeout(400);/* 按钮有 .15s 过渡 */
      const gapOff=await p.evaluate(()=>{const r=[...document.querySelectorAll('.chars button')].map(b=>b.getBoundingClientRect());return Math.round(r[1].left-r[0].right);});
      await p.screenshot({path:path.join(out,'04-no-flexgap.png')});
      check('Flex gap 回退：关掉 gap 后按钮之间仍有间距',gapOn>0&&gapOff>0,{gapOn,gapOff});await ctx.close();}
  }finally{await b.close();}
  console.log(fails?'FAILED '+fails:'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});

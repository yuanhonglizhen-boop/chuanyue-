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
      // 存档：选角色写入容器 Storage，刷新后读回
      await p.evaluate(()=>{__Q.showTitle();__Q.selectCharacter('koi');});
      const saved=await p.evaluate(()=>window.__store['yijing-q-save-v1']||null);
      check('存档：写入容器 Storage（客户端 9.46+）',!!saved&&JSON.parse(saved).char==='koi',saved&&JSON.parse(saved).char);
      await p.evaluate(()=>localStorage.clear());await p.addInitScript(s=>{window.__store={'yijing-q-save-v1':s};},saved);await p.reload();
      await p.waitForFunction(()=>window.__Q&&window.__Q.ready,null,{timeout:180000});
      check('存档：刷新后从容器 Storage 读回（浏览器本地存储已清空）',await p.evaluate(()=>__Q.save.char==='koi'));
      check('不联网：没有发出任何网络请求',reqs.length===0,reqs);
      check('无运行时错误',errs.length===0,errs);await ctx.close();}
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

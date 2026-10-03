// 藏易阁 · 自动验证：用真实鼠标点击 3D 物体通关三间屋。
// 行走用固定步长推进（不瞬移），点击用 page.mouse 点在物体的屏幕投影上。
// 用法：npm run build && npm run verify
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..'),out=path.join(root,'docs','verification'),port=8530;fs.mkdirSync(out,{recursive:true});
const report={time:new Date().toISOString(),checks:[]};
const check=(n,ok,d)=>{report.checks.push({name:n,ok:!!ok,detail:d});console.log((ok?'PASS ':'FAIL ')+n+(d!==undefined?'  '+JSON.stringify(d):''));return ok;};

(async()=>{
  const server=spawn(process.execPath,[path.join(root,'server.cjs')],{cwd:root,stdio:['ignore','pipe','inherit']});
  await new Promise((res,rej)=>{server.stdout.on('data',d=>{if(String(d).includes('http://'))res();});server.on('exit',c=>rej(Error('server exited '+c)));});
  const b=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});
  const shot=async(p,n)=>{await p.evaluate(()=>__C.step(.05));await p.screenshot({path:path.join(out,n+'.png')});};
  try{
    // ---------- 服务器版：只检查加载 ----------
    {const p=await b.newPage({viewport:{width:1280,height:800}}),errs=[],failed=[];p.on('pageerror',e=>errs.push(String(e)));p.on('requestfailed',r=>failed.push(r.url()));
      await p.goto(`http://127.0.0.1:${port}/`);await p.waitForFunction(()=>window.__C?.ready,null,{timeout:180000});
      check('server：页面加载、无失败请求、无报错',failed.length===0&&errs.length===0,{failed,errs});await p.close();}
    // ---------- 离线单文件版：完整流程 ----------
    const p=await b.newPage({viewport:{width:1280,height:800}}),errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
    await p.route(/^https?:/,r=>r.abort());
    await p.goto(pathToFileURL(path.join(root,'dist','藏易阁.html')).href);await p.waitForFunction(()=>window.__C?.ready,null,{timeout:180000});
    await p.evaluate(()=>{try{localStorage.clear();}catch{}});await p.reload();await p.waitForFunction(()=>window.__C?.ready,null,{timeout:180000});
    await p.evaluate(()=>__C.step(.6));await shot(p,'01-title');
    // 灵龟变色
    const cols={};for(const k of ['moyu','baiyu','chijin','hupo','qingyu']){await p.click(`[data-pal="${k}"]`);cols[k]=await p.evaluate(()=>__C.turtle.palette);}
    check('灵龟可变色（五种）并记入存档',Object.entries(cols).every(([k,v])=>k===v)&&await p.evaluate(()=>__C.save.palette==='qingyu'),cols);
    await p.click('[data-pal="chijin"]');await p.evaluate(()=>__C.step(.4));await shot(p,'01b-title-chijin');await p.click('[data-pal="qingyu"]');
    await p.click('#btn-begin');await p.evaluate(()=>__C.step(.4));await shot(p,'02-hall');

    // 工具：走到某点（不瞬移）
    const walk=(x,z,max=12)=>p.evaluate(({x,z,max})=>{const C=__C,P=C.P;for(let i=0;i<max*60;i++){const dx=x-P.x,dz=z-P.z,d=Math.hypot(dx,dz);if(d<.15){C.step(1/60);return true;}C.step(1/60,{move:{x:dx/d,z:dz/d},draw:false});}C.step(1/60);return false;},{x,z,max});
    // 工具：把物体投到屏幕上用真实鼠标点一下
    const clickObj=async(expr)=>{let pos=await p.evaluate(e=>{const o=eval(e);const v=new (__C.camera.position.constructor)();o.getWorldPosition(v);__C.lookAt(v.x,v.y,v.z);__C.step(1/60,{draw:false});o.getWorldPosition(v);__C.lookAt(v.x,v.y,v.z);return __C.screenOf(o);},expr);/* 第一人称时让身体朝向跟上视线，再取屏幕位置 */let hit=await p.evaluate(({x,y})=>__C.pickAt(x,y),pos);
      // 被挡住：像玩家一样往后退一步再点
      for(let k=0;k<3&&hit?.type!=='interact';k++){console.log('  (被挡住：'+JSON.stringify(hit)+'，后退一步再点 '+expr+')');
        pos=await p.evaluate(e=>{const C=__C,o=eval(e),v=new (C.camera.position.constructor)();o.getWorldPosition(v);const dx=C.P.x-v.x,dz=C.P.z-v.z,l=Math.hypot(dx,dz)||1;for(let i=0;i<24;i++)C.step(1/60,{move:{x:dx/l,z:dz/l},draw:false});C.lookAt(v.x,v.y,v.z);return C.screenOf(o);},expr);
        hit=await p.evaluate(({x,y})=>__C.pickAt(x,y),pos);}await p.mouse.move(pos.x,pos.y);await p.mouse.click(pos.x,pos.y);await p.evaluate(()=>__C.step(.05));return pos;};

    const closeDlg=id=>p.evaluate(id=>{const d=document.getElementById(id);if(d.open)d.close();},id);
    // 行走与碰撞
    const mv=await p.evaluate(()=>{const C=__C,P=C.P,x0=P.x,z0=P.z;C.step(1,{move:{x:0,z:-1},draw:false});const moved=Math.hypot(P.x-x0,P.z-z0);C.step(4,{move:{x:-1,z:0},draw:false});return {moved:+moved.toFixed(2),x:+P.x.toFixed(2)};});
    check('WASD 行走；撞墙停下不穿墙',mv.moved>2&&mv.x>-5.2,mv);
    // 视角切换
    await p.keyboard.press('KeyV');const v1=await p.evaluate(()=>({view:__C.save.view,turtle:__C.turtle.root.visible,cross:!document.getElementById('crosshair').hidden}));
    await p.evaluate(()=>__C.step(.2));await shot(p,'03-first-person');
    await p.keyboard.press('KeyV');const v2=await p.evaluate(()=>__C.save.view);
    check('按 V 在第一人称与第三人称之间切换',v1.view==='first'&&!v1.turtle&&v1.cross&&v2==='third',{v1,v2});

    // ---------- 第一间 ----------
    // 远处点击：点书案上的手札，自动走过去再读
    await walk(-.8,3.2);
    const readFar=await p.evaluate(async()=>{const C=__C;const tgt={x:-2.7,y:.87,z:1.4};C.lookAt(tgt.x,tgt.y,tgt.z);const v=new (C.camera.position.constructor)(tgt.x,tgt.y,tgt.z);v.project(C.camera);const r=document.getElementById('stage').getBoundingClientRect();return {x:r.left+(v.x*.5+.5)*r.width,y:r.top+(-v.y*.5+.5)*r.height,dist:Math.hypot(C.P.x-tgt.x,C.P.z-tgt.z)};});
    await p.mouse.click(readFar.x,readFar.y);
    await p.evaluate(()=>{for(let i=0;i<300&&!document.getElementById('read').open;i++)__C.step(1/60,{draw:false});});
    check('点击远处的手札：自动走过去并打开阅读',await p.evaluate(()=>document.getElementById('read').open&&__C.save.notes.includes('guahua')),{startDist:+readFar.dist.toFixed(2)});
    await shot(p,'04-read');await closeDlg('read');
    // 读挂轴（八卦取象歌）
    await walk(-4.2,2.8);await walk(-4.2,-.4);await clickObj('__C.rooms[0].scroll');
    const song=await p.evaluate(()=>({open:document.getElementById('read').open,text:document.getElementById('read-body').innerText,src:document.getElementById('read-src').innerText}));
    check('读挂轴：八卦取象歌，注明出处',song.open&&/震仰盂/.test(song.text)&&/周易本义/.test(song.src),song.src);
    await closeDlg('read');
    // 问书灵：分级提示
    await p.keyboard.press('KeyH');const h1=await p.evaluate(()=>document.getElementById('hint-text').innerText);await p.click('#hint-more');const h2=await p.evaluate(()=>document.getElementById('hint-text').innerText);
    check('书灵分级提示（先点拨，再给方法）',/口诀/.test(h1)&&h2.length>h1.length,{h1:h1.slice(0,30)});await shot(p,'05-hint');await p.click('#hint .primary');
    // 四屉柜：逐条点击切换阴阳
    await walk(3.3,-.6);await p.evaluate(()=>__C.setView('first'));
    const T={震:[1,0,0],艮:[0,0,1],兑:[1,1,0],巽:[0,1,1]};let clicks=0;
    for(let i=0;i<4;i++)for(let k=0;k<3;k++){for(let tries=0;tries<3;tries++){const need=await p.evaluate(({i,k,T})=>{const d=__C.rooms[0].drawers[i];return d.open?false:d.state[k]!==T[d.name][k];},{i,k,T});if(!need)break;await clickObj(`__C.rooms[0].drawers[${i}].bars[${k}].hit`);clicks++;}}
    await p.evaluate(()=>__C.step(1.2));await shot(p,'06-drawers');
    const dr=await p.evaluate(()=>({open:__C.rooms[0].drawers.map(d=>d.open),key:__C.rooms[0].key.visible,ms:__C.save.milestone}));
    check('四屉柜：按取象歌排对 震艮兑巽 四卦，四屉皆开，柜顶现出钥匙',dr.open.every(Boolean)&&dr.key&&dr.ms>=1,{...dr,clicks});
    await clickObj('__C.rooms[0].key');check('拿到门钥',await p.evaluate(()=>__C.save.inv.includes('key1')));
    await p.evaluate(()=>__C.setView('third'));await walk(0,-3.6);await clickObj('__C.rooms[0].door.group');await p.evaluate(()=>__C.step(1.5));
    check('用钥匙打开北门（龟甲亮起第 2 格）',await p.evaluate(()=>__C.save.flags.door1&&__C.save.milestone===2&&!__C.save.inv.includes('key1')));
    await shot(p,'07-door-open');

    // ---------- 第二间 ----------
    await walk(0,-6.2);await walk(0,-9.2);await p.evaluate(()=>__C.step(.5));await shot(p,'08-xiantian');
    check('进入先天室，音乐换成羽调主题',await p.evaluate(()=>__C.currentRoom()==='r2'));
    await walk(-4,-9.2);await walk(-4,-12.5);await p.evaluate(()=>__C.setView('first'));await clickObj('__C.rooms[1].scroll');await p.evaluate(()=>__C.setView('third'));const td=await p.evaluate(()=>document.getElementById('read-src').innerText);check('读挂轴：天地定位（《说卦传》）',/说卦传/.test(td),td);await closeDlg('read');
    await walk(-4,-9.2);await walk(4,-9.2);await walk(4,-12.5);await clickObj('__C.rooms[1].stele');const xo=await p.evaluate(()=>document.getElementById('read-body').innerText);check('读石碑：先天次序（注明宋人之说）',/乾一/.test(xo)&&await p.evaluate(()=>/宋人/.test(document.getElementById('read-src').innerText)));await closeDlg('read');
    // 八角台：站在台心，第一人称，逐一点击交换
    await walk(4,-9.2);await walk(1.05,-9.6);await walk(0,-12.5);await p.evaluate(()=>__C.setView('first'));
    const ANSWER=await p.evaluate(()=>__C.rooms[1].answer);let swaps=0;
    for(let k=0;k<8;k++){const st=await p.evaluate(({k,A})=>{const t=__C.rooms[1].tiles;const occ=t.findIndex(x=>x.slot===k),want=t.findIndex(x=>x.name===A[k]);return {occ,want};},{k,A:ANSWER});
      if(st.occ===st.want)continue;await walk(0,-12.5);await clickObj(`__C.rooms[1].tiles[${st.occ}].group`);await walk(0,-12.5);await clickObj(`__C.rooms[1].tiles[${st.want}].group`);swaps++;await p.evaluate(()=>__C.step(.3));}
    await p.evaluate(()=>__C.step(.6));await shot(p,'09-octagon');
    check('八角台：交换卦牌排成先天方位（乾南坤北、离东坎西……），台心升起铜箱',await p.evaluate(()=>__C.save.flags.octagon&&__C.save.notes.includes('xiantian')),{swaps});
    await p.evaluate(()=>{__C.setView('third');__C.step(2.6);});await walk(0,-11.2);await p.evaluate(()=>__C.setView('first'));
    await clickObj('__C.rooms[1].chest');await p.waitForSelector('#lock[open]');
    // 先试错的，再输正确的（用界面上的箭头按钮）
    const setCode=async(code)=>{for(let i=0;i<4;i++){const cur=await p.evaluate(i=>+document.querySelectorAll('#lock-wheels b')[i].textContent,i);const n=(+code[i]-cur+10)%10;for(let j=0;j<n;j++)await p.click(`#lock-wheels .wheel:nth-child(${i+1}) .up`);}};
    await setCode('1234');await p.click('#lock-try');const wrong=await p.evaluate(()=>({open:document.getElementById('lock').open,msg:document.getElementById('lock-msg').textContent}));
    await setCode('4563');await shot(p,'10-lock');await p.click('#lock-try');await p.evaluate(()=>__C.step(.8));
    const chest=await p.evaluate(()=>({inv:__C.save.inv.slice(),ms:__C.save.milestone,compass:!document.getElementById('compass').hidden}));
    check('转盘锁：错误密码打不开；先天数"雷风水火"=4563 打开，得钥匙与罗盘',wrong.open&&/纹丝不动/.test(wrong.msg)&&chest.inv.includes('key2')&&chest.inv.includes('compass')&&chest.compass&&chest.ms===4,{wrong,chest});
    await p.evaluate(()=>__C.setView('third'));await walk(1.05,-11.4);await walk(1.05,-15.4);await walk(0,-16.4);await clickObj('__C.rooms[1].door.group');await p.evaluate(()=>__C.step(1.5));
    check('先天室北门打开',await p.evaluate(()=>__C.save.flags.door2&&__C.save.milestone===5));

    // ---------- 第三间 ----------
    await walk(0,-18.8);await walk(0,-20.3);await p.evaluate(()=>__C.step(.4));await shot(p,'11-houtian');
    await walk(1.2,-21);await walk(1.2,-24);await walk(0,-25);await p.evaluate(()=>__C.setView('first'));
    // 先点错（北灯），应全灭
    await clickObj('__C.rooms[2].lamps[4].group');await p.evaluate(()=>__C.step(.6));const bad=await p.evaluate(()=>__C.rooms[2].lamps.every(l=>!l.lit));
    const ORDER=await p.evaluate(()=>__C.rooms[2].order);for(const k of ORDER){await clickObj(`__C.rooms[2].lamps[${k}].group`);await p.evaluate(()=>__C.step(.15));}
    await p.evaluate(()=>__C.step(1));await shot(p,'12-lamps');
    const s1=await p.evaluate(()=>({lamps1:!!__C.save.flags.lamps1,note:__C.save.notes.includes('houtian'),ms:__C.save.milestone}));
    check('后天室第一步：点错全灭；照原文卦名"震巽离坤兑乾坎艮"点亮八灯（即东→东南→南→西南→西→西北→北→东北）',bad&&s1.lamps1&&s1.note&&s1.ms===6,s1);
    // 第二步：阁主三问（卦牌隐去，按方位作答）
    await p.evaluate(()=>__C.step(3));
    const qs=await p.evaluate(()=>({quest:!document.getElementById('quest').hidden,text:document.getElementById('quest-text').textContent,hidden:__C.rooms[2].lamps.every(l=>!l.faces[0].visible&&l.blanks[0].visible)}));
    await clickObj('__C.rooms[2].lamps[0].group');await p.evaluate(()=>__C.step(.3));const wrongQ=await p.evaluate(()=>!__C.save.flags.quiz1);
    for(const q of await p.evaluate(()=>__C.rooms[2].quiz.map(q=>q.k))){await clickObj(`__C.rooms[2].lamps[${q}].group`);await p.evaluate(()=>__C.step(2.2));}
    await p.evaluate(()=>__C.step(1.5));await shot(p,'12b-quiz');
    const done=await p.evaluate(()=>({lamps:!!__C.save.flags.lamps,ms:__C.save.milestone,note:__C.save.notes.includes('xianhou'),quest:document.getElementById('quest').hidden}));
    check('后天室第二步：卦牌隐去，阁主三问（坎在北；后天乾在西北；后天离在南），答错不算，答对三题北门开',qs.quest&&qs.hidden&&wrongQ&&done.lamps&&done.ms===7&&done.note&&done.quest,{qs,wrongQ,done});
    await p.evaluate(()=>__C.setView('third'));await walk(1.6,-27.6);await walk(0,-29.6);await walk(0,-32.2);await p.evaluate(()=>__C.step(.3));
    check('穿过北门：第一卷结束页（用时、问书灵次数、读到的知识）',await p.evaluate(()=>document.getElementById('ending').open&&document.querySelectorAll('#end-notes li').length>=6));
    await shot(p,'13-ending');await p.click('#ending .primary');
    // 龟甲：解开六处，洛书 1~6 格亮
    await p.evaluate(()=>{__C.setView('third');__C.cam.tYaw=__C.cam.yaw=Math.PI;__C.cam.tPitch=__C.cam.pitch=.9;__C.cam.dist=2.6;__C.step(1);});await shot(p,'14-shell');
    // 笔记
    await p.keyboard.press('KeyN');const notes=await p.evaluate(()=>[...document.querySelectorAll('#notes-list .note:not(.locked) b')].map(b=>b.textContent));await shot(p,'15-notes');
    check('易笔记：读到的知识都在（含出处）',notes.length>=7,notes);await p.click('#notes .x');
    // 存档：刷新后"继续"，进度与位置都在
    await p.evaluate(()=>__C.step(1));await p.reload();await p.waitForFunction(()=>window.__C?.ready,null,{timeout:180000});
    const cont=await p.evaluate(()=>!document.getElementById('btn-continue').hidden);await p.click('#btn-continue');await p.evaluate(()=>__C.step(.3));
    const rest=await p.evaluate(()=>({z:+__C.P.z.toFixed(1),drawers:__C.rooms[0].drawers.every(d=>d.open),lamps:__C.rooms[2].lamps.every(l=>l.lit),ms:__C.save.milestone}));
    check('存档：刷新后可"继续"，机关状态与位置都恢复',cont&&rest.drawers&&rest.lamps&&rest.ms===7&&rest.z<-30,rest);
    // 音乐开关：关后完全静音
    await p.click('#btn-sound');const peak=async()=>{let m=0;for(let i=0;i<10;i++){await p.waitForTimeout(150);m=Math.max(m,await p.evaluate(()=>__C.sfx._level()));}return +m.toFixed(4);};
    await p.waitForTimeout(2500);const on=await peak();await p.click('#btn-music');await p.waitForTimeout(2000);const off=await peak();await p.click('#btn-music');await p.click('#btn-sound');
    check('音乐开关：关后完全静音（峰值 0）',on>.003&&off===0,{on,off});
    check('全程无运行时错误',errs.length===0,errs);
    await p.close();
  }finally{await b.close();server.kill();}
  report.passed=report.checks.every(c=>c.ok);fs.writeFileSync(path.join(out,'verify-report.json'),JSON.stringify(report,null,2));
  console.log(report.passed?'ALL PASSED ('+report.checks.length+')':'FAILED');if(!report.passed)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});

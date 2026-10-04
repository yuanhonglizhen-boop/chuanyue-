// 录制代理（注入页面运行）：接管时钟，按路线逐帧操作角色，叠加字幕 / 按键 / 倍速标记，并记下所有声音事件。
// 时间有两条：game（游戏内时间，提示、动画、计时都跟它走）与 video（成片时间，只在录制的帧里前进，用来对齐音轨）。
(()=>{
  const Q=window.__Q;Q.manual=true;
  // ---------- 虚拟时钟 ----------
  let vnow=0,videoT=0;
  performance.now=()=>vnow;
  const timers=[];let tid=1e6;const realClear=window.clearTimeout.bind(window);
  window.setTimeout=(fn,ms=0,...a)=>{const id=++tid;timers.push({id,at:vnow+(+ms||0),fn:()=>fn(...a)});return id;};
  window.clearTimeout=id=>{const i=timers.findIndex(t=>t.id===id);if(i>=0)timers.splice(i,1);else realClear(id);};
  function runTimers(){for(;;){let k=-1;for(let i=0;i<timers.length;i++)if(timers[i].at<=vnow&&(k<0||timers[i].at<timers[k].at))k=i;if(k<0)break;const t=timers.splice(k,1)[0];t.fn();}}
  // CSS 动画 / 过渡：暂停后按游戏时间手动推进
  function advanceAnims(ms){for(const a of document.getAnimations()){if(a._vt===undefined){a._vt=0;try{a.pause();}catch{}}else a._vt+=ms;try{a.currentTime=a._vt;}catch{}}}

  // ---------- 声音事件 ----------
  const log=[{t:0,n:'playTheme',a:['title']},{t:0,n:'setLayer',a:[2]}];let capturing=false;const S=Q.sfx;
  const STATE=['playTheme','setLayer','setVoice','stopMusic'];
  S.unlock=()=>{};// 不在页面里真的发声：音轨录完后离线合成
  for(const n of ['hop','jump','land','bounce','toggle','gem','pickup','solve','gate','portal','clear','fall','splash','ui',...STATE]){
    const orig=S[n];S[n]=function(...a){if(capturing||STATE.includes(n))log.push({t:+videoT.toFixed(4),n,a});return orig.apply(S,a);};}

  // ---------- 叠加层：字幕、按键、倍速 ----------
  const css=`#rec-cap{position:fixed;left:50%;bottom:118px;transform:translateX(-50%);max-width:70%;padding:12px 30px;border-radius:18px;background:rgba(24,46,41,.78);color:#fff;font-size:38px;line-height:1.45;font-weight:600;letter-spacing:.04em;text-align:center;z-index:60;box-shadow:0 8px 30px rgba(0,0,0,.18)}
  #rec-cap b{color:#ffd879}#rec-cap[hidden]{display:none}
  #rec-keys{position:fixed;right:34px;bottom:34px;display:grid;grid-template-columns:repeat(3,64px);grid-template-rows:64px 64px 52px;gap:8px;z-index:60}
  #rec-keys i{font-style:normal;display:grid;place-items:center;border-radius:12px;background:rgba(255,252,244,.72);color:#24413c;font:700 24px/1 system-ui,sans-serif;box-shadow:0 4px 0 rgba(36,65,60,.25);transition:none}
  #rec-keys i.on{background:#3fae8a;color:#fff;transform:translateY(3px);box-shadow:0 1px 0 rgba(36,65,60,.35)}
  #rec-keys .w{grid-column:2}#rec-keys .a{grid-column:1;grid-row:2}#rec-keys .s{grid-column:2;grid-row:2}#rec-keys .d{grid-column:3;grid-row:2}
  #rec-keys .sp{grid-column:1/3;grid-row:3;font-size:18px}#rec-keys .e{grid-column:3;grid-row:3;font-size:20px}#rec-keys .f{grid-column:3;grid-row:1;font-size:20px}
  #rec-speed{position:fixed;left:24px;top:96px;padding:6px 16px;border-radius:999px;background:rgba(24,46,41,.78);color:#fff;font:700 26px/1.2 system-ui,sans-serif;z-index:60}#rec-speed[hidden],#rec-keys[hidden]{display:none}
  #rec-black{position:fixed;inset:0;background:#fffaf0;opacity:0;z-index:70;pointer-events:none}`;
  const st=document.createElement('style');st.textContent=css;document.head.append(st);
  const cap=document.createElement('div');cap.id='rec-cap';cap.hidden=true;document.body.append(cap);
  const keysEl=document.createElement('div');keysEl.id='rec-keys';keysEl.hidden=true;keysEl.innerHTML='<i class="f">F</i><i class="w">W</i><i class="a">A</i><i class="s">S</i><i class="d">D</i><i class="sp">空格</i><i class="e">E</i>';document.body.append(keysEl);
  const speedEl=document.createElement('div');speedEl.id='rec-speed';speedEl.hidden=true;document.body.append(speedEl);
  const black=document.createElement('div');black.id='rec-black';document.body.append(black);
  const flash={sp:0,e:0,f:0};let lastMove={x:0,z:0},moveAge=9;
  function drawKeys(dtv){for(const k in flash)flash[k]=Math.max(0,flash[k]-dtv);moveAge+=dtv;
    const s=Math.sin(Q.cam.yaw),c=Math.cos(Q.cam.yaw),m=moveAge<.12?lastMove:{x:0,z:0};// 世界方向 → 相对镜头的 WASD
    const x=m.x*c-m.z*s,z=m.x*s+m.z*c;
    const on={w:z<-.38,s:z>.38,a:x<-.38,d:x>.38,sp:flash.sp>0,e:flash.e>0,f:flash.f>0};
    for(const k in on)keysEl.querySelector('.'+k).classList.toggle('on',on[k]);}

  // ---------- 操作封装（记录按键） ----------
  const step=(dt,o={})=>{if(o.move&&(o.move.x||o.move.z)){lastMove=o.move;moveAge=0;}if(o.jump)flash.sp=.22;Q.step(dt,{...o,draw:false});};
  const interact=()=>{flash.e=.3;Q.interact();};
  const setForm=f=>{if(Q.game.form!==f){flash.f=.35;}Q.setForm(f);};

  // ---------- 路线（与 tools/route.cjs 同一套航点格式，改成逐帧推进） ----------
  let cur=null;
  function fail(why,w){const P=Q.player;const e=new Error('route '+why+' @'+(cur?.i)+' '+JSON.stringify({w,pos:[+P.x.toFixed(2),+P.y.toFixed(2),+P.z.toFixed(2)],obj:Q.level.objective?.(),near:Q.nearestInteractable?.()?.label}));cur=null;throw e;}
  function sub(){
    const P=Q.player,w=cur.pts[cur.i];
    const goal=()=>{if(w.target){const t=eval(w.target);if(t){w.x=t.x;w.z=t.z;}}return w;};
    const dir=()=>{const g=goal(),dx=g.x-P.x,dz=g.z-P.z,l=Math.hypot(dx,dz)||1;return {x:dx/l,z:dz/l,l};};
    const T=()=>Q.game.time-cur.start;
    switch(cur.phase){
      case 'init':cur.start=Q.game.time;cur.falls0=Q.game.falls;cur.dj=!!w.dj;cur.actN=0;if(w.form)setForm(w.form);cur.phase='wait';return 0;
      case 'wait':
        if(w.waitLift&&T()<20&&!(Q.level._liftTop()<.45)){step(.05);return .05;}
        if(w.waitLiftTop&&T()<20&&!(Q.level._liftTop()>3.25)){step(.05);return .05;}
        if(w.waitSlider&&T()<20&&!(Q.level._sliderX()>.45&&Q.level._sliderX()<.75)){step(1/60);return 1/60;}
        if(w.onSlider)w.x=Q.level._sliderX();
        cur.phase='main';if(w.jump){step(1/120,{jump:true,move:dir()});return 1/120;}return 0;
      case 'main':{
        if(T()>=(w.max??14))fail('timeout',w);
        if(w.onSlider)w.x=Q.level._sliderX();
        const d=dir(),tol=w.tol??.45;
        if(cur.dj&&T()>.24){step(1/120,{jump:true,move:d});cur.dj=false;return 1/120;}
        if(Q.game.falls>cur.falls0)fail('fell',w);
        const ok=w.until?eval(w.until):(d.l<tol&&P.grounded&&(w.minY===undefined||P.y>w.minY));
        if(ok){cur.phase='act';return 0;}
        step(1/60,{move:(!w.until&&d.l<tol)||(w.until&&d.l<(w.tol??.2))?{x:0,z:0}:d});return 1/60;}
      case 'act':
        if(w.act&&(cur.actN===0||(cur.actN<3&&w.expect&&!eval(w.expect)))){interact();cur.actN++;step(.1);return .1;}
        if(w.expect&&!eval(w.expect))fail('expect',w);
        cur.i++;cur.phase='init';if(cur.i>=cur.pts.length)cur=null;return 0;}
  }
  // 镜头：像玩家一样，慢慢转到角色身后
  let sv={x:0,z:0},autoCam=true;
  function camFollow(dtv){if(!autoCam)return;const P=Q.player,k=1-Math.exp(-dtv*1.1);sv.x+=(P.vx-sv.x)*k;sv.z+=(P.vz-sv.z)*k;
    if(Math.hypot(sv.x,sv.z)>1.4){const want=Math.atan2(-sv.x,-sv.z);let d=want-Q.cam.targetYaw;d=Math.atan2(Math.sin(d),Math.cos(d));const r=.9*dtv;Q.cam.targetYaw+=Math.max(-r,Math.min(r,d));}}

  // ---------- 对外接口 ----------
  window.__R={
    route(pts){cur={pts:pts.map(p=>({...p})),i:0,phase:'init'};},
    get busy(){return !!cur;},
    // 推进一帧：游戏前进 gameDt 秒；capture=true 时成片前进 1/30 秒
    frame(gameDt,{capture=true,videoDt=1/30,draw=true}={}){
      capturing=capture;let used=0;
      if(cur){while(cur&&used<gameDt-1e-9)used+=sub();}
      if(used<gameDt-1e-9){step(gameDt-used);used=gameDt;}
      vnow+=used*1000;runTimers();advanceAnims(used*1000);
      if(capture){videoT+=videoDt;camFollow(videoDt);drawKeys(videoDt);if(draw)Q.render(videoDt);}
      return {busy:!!cur,mode:Q.game.mode,t:videoT};},
    // 不录制、快进（剪掉的部分）：只推进游戏
    skip(gameSec){capturing=false;let used=0;while(used<gameSec-1e-9){if(cur)used+=sub();else{step(1/60);used+=1/60;}}
      vnow+=used*1000;runTimers();advanceAnims(used*1000);return {busy:!!cur};},
    skipRoute(){capturing=false;let used=0;while(cur){used+=sub();}vnow+=used*1000;runTimers();advanceAnims(used*1000);const P=Q.player;Q.cam.focus.set(P.x,P.y+1.1,P.z);return used;},
    caption(html){if(!html){cap.hidden=true;return;}cap.innerHTML=html;cap.hidden=false;},
    keys(on){keysEl.hidden=!on;},
    keyF(on){keysEl.querySelector('.f').style.visibility=on?'':'hidden';},
    speed(x){speedEl.hidden=!(x>1);speedEl.textContent='▶▶ ×'+x;},
    fade(v){black.style.opacity=v;},
    autoCam(v){autoCam=v;},
    snapCam(yaw,pitch,dist){const c=Q.cam;if(yaw!=null)c.yaw=c.targetYaw=yaw;if(pitch!=null)c.pitch=c.targetPitch=pitch;if(dist!=null)c.dist=c.targetDist=dist;const P=Q.player;c.focus.set(P.x,P.y+1.1,P.z);sv={x:0,z:0};},
    interact,setForm,
    get log(){return log;},get videoT(){return videoT;},
  };
})();

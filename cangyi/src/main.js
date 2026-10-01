import * as THREE from '../vendor/three.module.js';
import {createWorld} from './world.js';
import {createTurtle,PALETTES} from './turtle.js';
import {buildRoom1} from './rooms/r1.js';
import {buildRoom2} from './rooms/r2.js';
import {buildRoom3} from './rooms/r3.js';
import {NOTES,HINTS} from './lore.js';
import {createAudio} from './audio.js';

const $=id=>document.getElementById(id);
const SAVE_KEY='cangyi-save-v1';
const DEFAULTS={flags:{},inv:[],notes:[],milestone:0,palette:'qingyu',view:'third',fov:62,sens:1,music:true,sfx:true,hintLv:{},hintsUsed:0,time:0,pos:null,started:false};
function loadSave(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');return {...structuredClone(DEFAULTS),...s};}catch{return structuredClone(DEFAULTS);}}
let save=loadSave();
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch{}}
const ITEMS={key1:{name:'门钥',icon:'钥'},key2:{name:'后门钥匙',icon:'钥'},compass:{name:'罗盘',icon:'盘'}};

// ---------- 渲染 ----------
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;renderer.outputColorSpace=THREE.SRGBColorSpace;
$('stage').append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#0b0705');scene.fog=new THREE.Fog('#0b0705',16,42);
const camera=new THREE.PerspectiveCamera(save.fov,1,.05,120);
scene.add(new THREE.HemisphereLight('#ffdcb0','#2a160e',.5));scene.add(new THREE.AmbientLight('#ffe8c8',.12));
// 环境反射：一圈暖光，让金器、漆面有光泽
{const pm=new THREE.PMREMGenerator(renderer),es=new THREE.Scene();es.background=new THREE.Color('#1c1009');
  for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(4,2),new THREE.MeshBasicMaterial({color:i%2?'#ffcf8a':'#ff9a4a',side:THREE.DoubleSide}));const a=i/6*Math.PI*2;m.position.set(Math.cos(a)*8,2+i%2*3,Math.sin(a)*8);m.lookAt(0,2,0);es.add(m);}
  scene.environment=pm.fromScene(es,.04).texture;pm.dispose();}
const sfx=createAudio();sfx.setMuted(!save.sfx);sfx.setMusicMuted(!save.music);

// ---------- 世界与房间 ----------
const W=createWorld(scene);
const flags=save.flags;
const ctx={world:W,sfx,toast,read,unlockNote,openLock,
  inv:{has:id=>save.inv.includes(id),add:id=>{if(!save.inv.includes(id))save.inv.push(id);persist();renderInv();},remove:id=>{save.inv=save.inv.filter(x=>x!==id);persist();renderInv();}},
  flag:k=>!!flags[k],setFlag:k=>{flags[k]=true;persist();},
  milestone:n=>{if(n>save.milestone){save.milestone=n;persist();turtle.setProgress(n);turtle.celebrate();}},
  labelOf:(obj,label)=>obj.traverse(o=>{if(o.userData.interact)o.userData.interact.label=label;})};
const rooms=[buildRoom1(ctx),buildRoom2(ctx),buildRoom3(ctx)];
rooms.forEach(r=>r.restore(flags));

// ---------- 灵龟 ----------
const turtle=createTurtle({palette:save.palette,envMap:scene.environment});scene.add(turtle.root);turtle.setProgress(save.milestone);
turtle.root.traverse(o=>o.userData.noPick=true);
const P={x:0,z:3.4,yaw:0,vx:0,vz:0,speed:0};
const cam={yaw:0,pitch:.42,dist:4.6,fpPitch:.08,tYaw:0,tPitch:.38,focus:new THREE.Vector3()};
let view=save.view;

// ---------- 状态 ----------
const game={mode:'title',time:0,toastUntil:0,walkTo:null,pending:null,stuck:0,ended:false};
function currentRoom(){for(const r of rooms){const b=r.bounds;if(P.z<=b.z1+.75&&P.z>=b.z0-.75&&P.x>=b.x0&&P.x<=b.x1)return r;}return rooms[rooms.length-1];}

// ---------- 输入 ----------
const keys=new Set();
addEventListener('keydown',e=>{if(e.target.closest?.('dialog,input'))return;keys.add(e.code);
  if(game.mode!=='play')return;
  if(e.code==='KeyV')toggleView();if(e.code==='KeyE'&&!e.repeat)interactFront();if(e.code==='KeyN')openNotes();if(e.code==='KeyH')openHint();});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());
const stage=$('stage');let down=null;
const ndcOf=(cx,cy)=>{const r=stage.getBoundingClientRect();return new THREE.Vector2((cx-r.left)/r.width*2-1,-(cy-r.top)/r.height*2+1);};
stage.addEventListener('pointerdown',e=>{if(game.mode!=='play')return;down={x:e.clientX,y:e.clientY,moved:false,btn:e.button,id:e.pointerId};try{stage.setPointerCapture(e.pointerId);}catch{}});
stage.addEventListener('pointermove',e=>{
  if(down&&down.id===e.pointerId){const dx=e.clientX-down.x,dy=e.clientY-down.y;if(!down.moved&&Math.hypot(dx,dy)>5)down.moved=true;
    if(down.moved){const k=.0042*save.sens;cam.tYaw-=dx*k;if(view==='third')cam.tPitch=THREE.MathUtils.clamp(cam.tPitch+dy*k*.8,.05,1.15);else cam.fpPitch=THREE.MathUtils.clamp(cam.fpPitch+dy*k*.8,-1.1,1.1);down.x=e.clientX;down.y=e.clientY;stage.classList.add('dragging');}}
  else hover(e.clientX,e.clientY);});
stage.addEventListener('pointerup',e=>{if(!down)return;const wasDrag=down.moved;down=null;stage.classList.remove('dragging');if(!wasDrag&&game.mode==='play')clickAt(e.clientX,e.clientY);});
stage.addEventListener('pointercancel',()=>{down=null;});
stage.addEventListener('wheel',e=>{if(view==='third'){cam.dist=THREE.MathUtils.clamp(cam.dist+e.deltaY*.004,2.6,7);e.preventDefault();}},{passive:false});
stage.addEventListener('contextmenu',e=>e.preventDefault());

// ---------- 拾取 ----------
const ray=new THREE.Raycaster();
function visibleChain(o){for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;}
function pick(ndc){ray.setFromCamera(ndc,camera);ray.far=40;const hits=ray.intersectObjects(W.root.children,true);
  for(const h of hits){const o=h.object;if(o.userData.noPick||!visibleChain(o))continue;const it=o.userData.interact;
    if(it){if(it.enabled&&!it.enabled())continue;return {type:'interact',it,point:h.point};}
    if(o.userData.floor)return {type:'floor',point:h.point};
    return {type:'block',point:h.point};}
  return null;}
let lastHover=0;
function hover(cx,cy){if(game.mode!=='play'||performance.now()-lastHover<40)return;lastHover=performance.now();const h=pick(ndcOf(cx,cy)),tip=$('tip');
  if(h?.type==='interact'){tip.textContent=h.it.label;tip.style.left=cx+'px';tip.style.top=cy+'px';tip.hidden=false;stage.style.cursor='pointer';}else{tip.hidden=true;stage.style.cursor='';}}
function distTo(p){return Math.hypot(P.x-p.x,P.z-p.z);}
function doInteract(it,point){const range=it.range||2.4;
  if(distTo(point)<=range){it.onClick();return;}
  // 太远：先走过去，到了再做
  const dx=point.x-P.x,dz=point.z-P.z,l=Math.hypot(dx,dz)||1;game.walkTo={x:point.x-dx/l*Math.min(range*.75,l),z:point.z-dz/l*Math.min(range*.75,l)};game.pending={it,point};game.stuck=0;}
function clickAt(cx,cy){const h=pick(ndcOf(cx,cy));game.lastClick={type:h?.type,label:h?.it?.label,t:game.time};if(!h)return;
  if(h.type==='interact')doInteract(h.it,h.point);
  else if(h.type==='floor'){game.walkTo={x:h.point.x,z:h.point.z};game.pending=null;game.stuck=0;marker(h.point);}}
function interactFront(){
  if(view==='first'){const h=pick(new THREE.Vector2(0,0));if(h?.type==='interact')doInteract(h.it,h.point);return;}
  // 第三人称：取身前最近的一个
  let best=null,bd=2.6;const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),v=new THREE.Vector3();
  for(const m of W.interactables){const it=m.userData.interact;if(!visibleChain(m)||(it.enabled&&!it.enabled()))continue;m.getWorldPosition(v);const dx=v.x-P.x,dz=v.z-P.z,d=Math.hypot(dx,dz);if(d<bd&&(dx*fx+dz*fz)/(d||1)>.3){bd=d;best={it,point:v.clone()};}}
  if(best)doInteract(best.it,best.point);}
// 点地面的落点标记
const mk=new THREE.Mesh(new THREE.RingGeometry(.18,.24,32),new THREE.MeshBasicMaterial({color:'#e8c26a',transparent:true,opacity:0,depthWrite:false}));mk.rotation.x=-Math.PI/2;scene.add(mk);
function marker(p){mk.position.set(p.x,.02,p.z);mk.material.opacity=.9;mk.scale.setScalar(1);}

// ---------- 视角 ----------
function setView(v){view=v;save.view=v;persist();turtle.root.visible=v==='third';$('crosshair').hidden=v!=='first';$('btn-view').textContent=v==='first'?'第一人称':'第三人称';
  if(v==='first'){cam.tYaw=P.yaw;}else{cam.tYaw=P.yaw;cam.tPitch=.42;}}
function toggleView(){setView(view==='first'?'third':'first');sfx.click();toast(view==='first'?'第一人称（觉得晕就按 V 切回第三人称）':'第三人称');}
$('btn-view').onclick=()=>{if(game.mode==='play')toggleView();};

// ---------- 界面 ----------
function toast(t,ms=3800){const el=$('toast');el.textContent=t;el.classList.add('show');game.toastUntil=performance.now()+ms;}
function unlockNote(id){if(save.notes.includes(id))return false;save.notes.push(id);persist();$('btn-notes').classList.add('new');toast('易笔记新增：'+NOTES[id].title+'（按 N 查看）',4200);return true;}
function read(id){const n=NOTES[id];unlockNote(id);sfx.page();$('read-title').textContent=n.title;$('read-body').innerHTML=n.body.map(p=>'<p>'+p+'</p>').join('');$('read-src').textContent='出处：'+n.src;$('read').showModal();}
function openNotes(){sfx.page();$('btn-notes').classList.remove('new');
  $('notes-list').innerHTML=Object.entries(NOTES).map(([id,n])=>{const ok=save.notes.includes(id);return '<button class="note'+(ok?'':' locked')+'" data-note="'+id+'"'+(ok?'':' disabled')+'><b>'+(ok?n.title:'？？？')+'</b><small>'+(ok?n.src:'尚未读到')+'</small></button>';}).join('');
  $('notes-list').querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>{$('notes').close();read(b.dataset.note);});$('notes').showModal();}
function hintKey(){const r=currentRoom();let k=r.hint(flags);if(k)return k;for(const x of rooms){k=x.hint(flags);if(k)return k;}return null;}
function openHint(){const k=hintKey();sfx.page();
  if(!k){$('hint-text').textContent='三间都已解开。北面那扇门后，还有路。';$('hint-more').hidden=true;$('hint').showModal();return;}
  const lv=save.hintLv[k]||0;showHint(k,Math.max(lv,1));}
function showHint(k,lv){const arr=HINTS[k];if((save.hintLv[k]||0)<lv){save.hintLv[k]=lv;save.hintsUsed++;persist();}
  $('hint-level').textContent='提示 '+lv+' / '+arr.length;$('hint-text').innerHTML=arr.slice(0,lv).map((t,i)=>'<p class="lv'+(i+1)+'">'+t+'</p>').join('');
  $('hint-more').hidden=lv>=arr.length;$('hint-more').onclick=()=>showHint(k,lv+1);if(!$('hint').open)$('hint').showModal();}
function renderInv(){$('inv').innerHTML=save.inv.map(id=>'<div class="item" title="'+ITEMS[id].name+'"><i>'+ITEMS[id].icon+'</i><small>'+ITEMS[id].name+'</small></div>').join('')||'<span class="empty">行囊空空</span>';$('compass').hidden=!save.inv.includes('compass')||game.mode!=='play';}
// 转盘锁
function openLock({title,riddle,digits=4,answer}){return new Promise(res=>{const vals=Array(digits).fill(0);$('lock-title').textContent=title;$('lock-riddle').textContent=riddle;
  const wrap=$('lock-wheels');wrap.innerHTML=vals.map((v,i)=>'<div class="wheel" data-i="'+i+'"><button class="up" aria-label="加">▲</button><b>0</b><button class="down" aria-label="减">▼</button></div>').join('');
  const sync=()=>wrap.querySelectorAll('.wheel').forEach((w,i)=>w.querySelector('b').textContent=vals[i]);
  wrap.querySelectorAll('.wheel').forEach((w,i)=>{w.querySelector('.up').onclick=()=>{vals[i]=(vals[i]+1)%10;sync();sfx.click();};w.querySelector('.down').onclick=()=>{vals[i]=(vals[i]+9)%10;sync();sfx.click();};});
  const d=$('lock');let done=false;
  $('lock-try').onclick=()=>{if(vals.join('')===answer){done=true;d.close();res(true);}else{sfx.wrong();d.classList.remove('shake');void d.offsetWidth;d.classList.add('shake');$('lock-msg').textContent='锁纹丝不动。';}};
  d.onclose=()=>{if(!done)res(false);};$('lock-msg').textContent='';d.showModal();
  window.__lockSet=(code)=>{[...code].forEach((c,i)=>vals[i]=+c);sync();};});}
$('btn-notes').onclick=openNotes;$('btn-hint').onclick=openHint;
$('btn-settings').onclick=()=>{$('fov').value=save.fov;$('sens').value=save.sens;$('settings').showModal();};
$('fov').oninput=e=>{save.fov=+e.target.value;camera.fov=save.fov;camera.updateProjectionMatrix();persist();};
$('sens').oninput=e=>{save.sens=+e.target.value;persist();};
$('btn-reset').onclick=()=>{if(confirm('清除存档，从头开始？')){try{localStorage.removeItem(SAVE_KEY);}catch{}location.reload();}};
function syncAudio(){$('btn-music').classList.toggle('off',sfx.musicMuted);$('btn-sound').classList.toggle('off',sfx.muted);}
$('btn-music').onclick=()=>{sfx.setMusicMuted(!sfx.musicMuted);save.music=!sfx.musicMuted;persist();syncAudio();};
$('btn-sound').onclick=()=>{sfx.setMuted(!sfx.muted);save.sfx=!sfx.muted;persist();syncAudio();};
$('btn-home').onclick=()=>showTitle();
document.querySelectorAll('dialog').forEach(d=>d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close()));

// ---------- 标题 / 开始 / 结局 ----------
function showTitle(){game.mode='title';$('title').hidden=false;$('hud').hidden=true;$('crosshair').hidden=true;$('compass').hidden=true;turtle.root.visible=true;
  $('btn-continue').hidden=!save.started;$('btn-begin').textContent=save.started?'重新开始':'开始';sfx.play('hall');}
function startGame(fresh){sfx.unlock();
  if(fresh&&save.started){try{localStorage.removeItem(SAVE_KEY);}catch{}const keep={palette:save.palette,view:save.view,fov:save.fov,sens:save.sens,music:save.music,sfx:save.sfx};save={...structuredClone(DEFAULTS),...keep};location.reload();return;}
  save.started=true;persist();game.mode='play';$('title').hidden=true;$('hud').hidden=false;
  const p=save.pos||rooms[0].spawn;P.x=p.x;P.z=p.z;P.yaw=p.yaw||0;cam.yaw=cam.tYaw=P.yaw;setView(view);renderInv();
  if(!save.pos)toast('拖动画面看四周，点击物品互动；WASD 走动。V 切换视角，H 问书灵。',6000);}
$('btn-begin').onclick=()=>startGame(true);$('btn-continue').onclick=()=>startGame(false);
$('swatches').innerHTML=Object.entries(PALETTES).map(([k,p])=>'<button data-pal="'+k+'" style="--c:'+p.shell+';--c2:'+p.plate+'" aria-pressed="'+(k===save.palette)+'"><i></i>'+p.name+'</button>').join('');
$('swatches').querySelectorAll('[data-pal]').forEach(b=>b.onclick=()=>{save.palette=b.dataset.pal;persist();turtle.setPalette(save.palette);turtle.celebrate();sfx.unlock();sfx.click();$('swatches').querySelectorAll('[data-pal]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
document.querySelectorAll('[data-view]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.view===view));b.onclick=()=>{view=b.dataset.view;save.view=view;persist();document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};});
function showEnding(){game.ended=true;sfx.solve();const secs=Math.round(save.time);
  $('end-time').textContent=Math.floor(secs/60)+' 分 '+(secs%60)+' 秒';$('end-hints').textContent=save.hintsUsed;$('end-notes').innerHTML=save.notes.map(id=>'<li>'+NOTES[id].title+'<small>'+NOTES[id].src+'</small></li>').join('');$('ending').showModal();}

// ---------- 主循环 ----------
const clock=new THREE.Clock();const FIXED=1/60;let acc=0,testMove=null;
function step(dt){
  game.time+=dt;
  if(game.mode==='play'){save.time+=dt;
    // 输入：键盘（相对镜头）或点地面行走
    let ix=0,iz=0;if(keys.has('KeyW')||keys.has('ArrowUp'))iz-=1;if(keys.has('KeyS')||keys.has('ArrowDown'))iz+=1;if(keys.has('KeyA')||keys.has('ArrowLeft'))ix-=1;if(keys.has('KeyD')||keys.has('ArrowRight'))ix+=1;
    const s=Math.sin(cam.yaw),c=Math.cos(cam.yaw);let mx=ix*c+iz*s,mz=-ix*s+iz*c;
    if(testMove){mx=testMove.x;mz=testMove.z;}
    if(mx||mz){game.walkTo=null;game.pending=null;}
    else if(game.walkTo){const dx=game.walkTo.x-P.x,dz=game.walkTo.z-P.z,d=Math.hypot(dx,dz);
      if(d<.18){game.walkTo=null;}else{mx=dx/d;mz=dz/d;}}
    const l=Math.hypot(mx,mz),run=keys.has('ShiftLeft')||keys.has('ShiftRight'),sp=(run?4:2.7)*(l?1:0);
    const tvx=l?mx/l*sp:0,tvz=l?mz/l*sp:0,a=1-Math.exp(-dt*12);P.vx+=(tvx-P.vx)*a;P.vz+=(tvz-P.vz)*a;
    /* 已经和某物重叠（比如铜箱刚好升在脚下）时，忽略它，让角色能走出来 */
    const inside=W.blocked(P.x,P.z);
    const ox=P.x,oz=P.z,nx=P.x+P.vx*dt,nz=P.z+P.vz*dt,bx=W.blocked(nx,P.z,.42,inside);if(!bx)P.x=nx;const bz=W.blocked(P.x,nz,.42,inside);if(!bz)P.z=nz;
    /* 撞到圆柱（柱、灯、石座）时沿切线滑过去，不会卡住 */
    const hit=bx||bz;if(hit){let ok=false;if(hit.kind==='cyl'){const dx=P.x-hit.x,dz=P.z-hit.z,l=Math.hypot(dx,dz)||1,ux=dx/l,uz=dz/l,dot=P.vx*ux+P.vz*uz;if(dot<0){const tx=P.vx-dot*ux,tz=P.vz-dot*uz,sx=P.x+tx*dt,sz=P.z+tz*dt;if(!W.blocked(sx,sz,.42,inside)){P.x=sx;P.z=sz;ok=true;}}}if(!ok){if(bx)P.vx*=.2;if(bz)P.vz*=.2;}}
    P.speed=Math.hypot(P.x-ox,P.z-oz)/dt;
    if(game.walkTo){if(P.speed<.3){game.stuck+=dt;if(game.stuck>.8){game.walkTo=null;game.pending=null;}}else game.stuck=0;}
    if(view==='first')P.yaw=cam.yaw;else if(P.speed>.2){const ty=Math.atan2(-P.vx,-P.vz);let d=ty-P.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));P.yaw+=d*Math.min(1,dt*10);}
    // 走到了：执行之前点的互动
    if(game.pending){const {it,point}=game.pending;if(distTo(point)<=(it.range||2.4)){game.pending=null;game.walkTo=null;if(!it.enabled||it.enabled())it.onClick();}else if(!game.walkTo)game.pending=null;}
    if(Math.round(game.time*2)!==Math.round((game.time-dt)*2)){save.pos={x:P.x,z:P.z,yaw:P.yaw};persist();}
    sfx.play(currentRoom().theme);
    if(!game.ended&&flags.lamps&&P.z<rooms[2].endZ)showEnding();
  }
  W.update(dt,game.time);turtle.update(dt,{speed:game.mode==='play'?P.speed:0});
  mk.material.opacity=Math.max(0,mk.material.opacity-dt*1.5);mk.scale.multiplyScalar(1+dt*.6);
}
function render(dt){
  turtle.root.position.set(P.x,0,P.z);turtle.root.rotation.y=P.yaw;
  const e=1-Math.exp(-dt*10);let dy=cam.tYaw-cam.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));cam.yaw+=dy*e;cam.pitch+=(cam.tPitch-cam.pitch)*e;
  if(keys.has('KeyQ'))cam.tYaw+=dt*1.6;if(keys.has('KeyR'))cam.tYaw-=dt*1.6;
  if(game.mode==='title'){// 标题：镜头对着灵龟，缓缓环绕
    const a=Math.PI+Math.sin(game.time*.2)*.45,r=2.4;cam.focus.set(P.x,.5,P.z+.4);camera.position.set(P.x+Math.sin(a)*r,1.05,P.z+Math.cos(a)*r);camera.lookAt(cam.focus);/* 在灵龟正前方，背景是南墙匾额与格窗 */
    const R=stage.getBoundingClientRect(),wide=R.width>820;camera.setViewOffset(R.width,R.height,wide?-R.width*.18:0,wide?0:R.height*.22,R.width,R.height);}
  else{camera.clearViewOffset();
    if(view==='first'){const hx=P.x-Math.sin(P.yaw)*.42,hz=P.z-Math.cos(P.yaw)*.42;camera.position.set(hx,turtle.eyeHeight,hz);
      const cp=Math.cos(cam.fpPitch);camera.lookAt(hx-Math.sin(cam.yaw)*cp,turtle.eyeHeight-Math.sin(cam.fpPitch),hz-Math.cos(cam.yaw)*cp);}
    else{cam.focus.lerp(new THREE.Vector3(P.x,1,P.z),1-Math.exp(-dt*8));
      let d=cam.dist;const dirx=Math.sin(cam.yaw)*Math.cos(cam.pitch),diry=Math.sin(cam.pitch),dirz=Math.cos(cam.yaw)*Math.cos(cam.pitch);
      // 镜头不穿墙：沿镜头方向逐步检测
      for(let s=.4;s<=cam.dist;s+=.1){if(W.blocked(cam.focus.x+dirx*s,cam.focus.z+dirz*s,.12)){d=Math.max(.6,s-.25);break;}}
      camera.position.set(cam.focus.x+dirx*d,Math.min(4.2,cam.focus.y+diry*d),cam.focus.z+dirz*d);camera.lookAt(cam.focus);}}
  if(!$('compass').hidden)$('compass-dial').style.transform='rotate('+(cam.yaw*180/Math.PI)+'deg)';
  if(performance.now()>game.toastUntil)$('toast').classList.remove('show');
  renderer.render(scene,camera);
}
function resize(){const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}
addEventListener('resize',resize);
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.1);acc+=dt;let n=0;while(acc>=FIXED&&n<8){step(FIXED);acc-=FIXED;n++;}if(n===8)acc=0;render(dt);}
resize();syncAudio();renderInv();showTitle();frame();$('loading').hidden=true;
addEventListener('pointerdown',()=>sfx.unlock(),{once:true});addEventListener('keydown',()=>sfx.unlock(),{once:true});

// 测试接口：固定步长推进；把世界坐标投到屏幕上，供测试用真实鼠标去点
window.__C={get save(){return save;},get P(){return P;},get game(){return game;},rooms,camera,cam,sfx,turtle,start:startGame,setView,toggleView,openHint,currentRoom:()=>currentRoom().id,
  step(sec,{move=null,draw=true}={}){testMove=move;for(let t=0;t<sec-1e-9;t+=FIXED)step(FIXED);testMove=null;if(draw)render(1/60);},
  screenOf(obj){const v=new THREE.Vector3();obj.getWorldPosition(v);v.project(camera);const r=stage.getBoundingClientRect();return {x:r.left+(v.x*.5+.5)*r.width,y:r.top+(-v.y*.5+.5)*r.height,inView:v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1};},
  lookAt(x,y,z){const dx=x-P.x,dz=z-P.z;cam.yaw=cam.tYaw=Math.atan2(dx,dz)+Math.PI;cam.pitch=cam.tPitch;cam.focus.set(P.x,1,P.z);if(view==='first'){const d=Math.hypot(dx,dz);cam.fpPitch=Math.atan2(turtle.eyeHeight-y,d);}render(1/60);},/* 测试用：镜头立即到位，不做缓动 */
  pickAt(cx,cy){const h=pick(ndcOf(cx,cy));return h?{type:h.type,label:h.it?.label,point:[h.point.x,h.point.y,h.point.z].map(v=>+v.toFixed(2))}:null;},
  ready:true};

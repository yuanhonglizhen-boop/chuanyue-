import * as THREE from '../vendor/three.module.js';
import {createWorld,seeded} from './world.js';
import {createPhysics,createController} from './physics.js';
import {createMascot} from './mascot.js';
import {createKit} from './kit.js';
import {buildKan} from './levels/kan.js';
import {buildLi} from './levels/li.js';
import {LORE,TRIGRAMS,ABOUT,WORLD_ORDER} from './lore.js';
import {createAudio} from './audio.js';

const $=id=>document.getElementById(id);
const LEVELS=[buildKan,buildLi];
const touch=matchMedia('(pointer: coarse)').matches;

// ---------- 渲染器 ----------
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
$('stage').append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(46,1,.1,600);
const sfx=createAudio();

// ---------- 状态 ----------
const game={mode:'title',levelIndex:0,level:null,startedAt:0,levelTime:0,totalGems:0,gemsByLevel:[0,0],cleared:[false,false],time:0,toastUntil:0,lastGateHint:0,falls:0};
let scene,physics,world,kit,ctrl,mascot,shadowBlob,sun,hemi;
const cam={yaw:0,pitch:.42,dist:9,targetYaw:0,targetPitch:.42,targetDist:9,focus:new THREE.Vector3()};

function toast(text,ms=3600){const el=$('toast');el.textContent=text;el.classList.add('show');game.toastUntil=performance.now()+ms;}

function burst(pos,opts){world?.burst(pos,opts);}

// ---------- 关卡加载 ----------
function loadLevel(i){
  if(scene){scene.traverse(o=>{o.geometry?.dispose?.();});}
  game.levelIndex=i;scene=new THREE.Scene();scene.userData.camera=camera;
  physics=createPhysics();const rng=seeded(17+i*101);
  world=createWorld({scene,physics,renderer,rng});kit=createKit({world,physics,scene});
  hemi=new THREE.HemisphereLight(i===1?'#ffe0c4':'#e8f6ff',i===1?'#6b5a7a':'#6f8f7c',i===1?1.25:1.45);scene.add(hemi);
  sun=new THREE.DirectionalLight(i===1?'#ffc58f':'#fff3dc',i===1?2.1:2.4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:60});sun.shadow.bias=-.0005;sun.shadow.normalBias=.04;scene.add(sun);scene.add(sun.target);
  scene.add(new THREE.AmbientLight('#ffffff',.18));
  const envMap=world.makeEnv();
  mascot=createMascot({envMap});scene.add(mascot.root);
  shadowBlob=new THREE.Mesh(new THREE.CircleGeometry(.5,24),new THREE.MeshBasicMaterial({color:'#1f3a36',transparent:true,opacity:.28,depthWrite:false}));shadowBlob.rotation.x=-Math.PI/2;shadowBlob.renderOrder=1;scene.add(shadowBlob);
  ctrl=createController({physics,
    onHop:()=>{mascot.impulse(1.2);sfx.hop();},
    onJump:(n)=>{mascot.impulse(n===1?2.6:3.2);sfx.jump(n);if(n===2)burst(new THREE.Vector3(ctrl.p.x,ctrl.p.y+.2,ctrl.p.z),{color:'#e9fff6',n:8,speed:1.6,up:.5,life:.45,size:.3,gravity:0});},
    onLand:(col,impact,hop)=>{mascot.impulse(-Math.min(6,impact*.62));if(!hop&&impact>5){sfx.land(impact);burst(new THREE.Vector3(ctrl.p.x,ctrl.p.y+.05,ctrl.p.z),{color:'#f4ead2',n:8,speed:2,up:.8,life:.4,size:.3});}if(col.bounce){sfx.bounce();burst(new THREE.Vector3(col.x,col.top+.2,col.z),{color:'#ffffff',n:14,speed:2.5,up:1});}game.level?.onLand?.(col,impact);}});
  const ctx={world,kit,physics,scene,toast,sfx,rng,burst,mascot,openLore};
  game.level=LEVELS[i](ctx);
  const L=game.level;mascot.setTrigram(L.lines);
  ctrl.place(L.spawn.x,L.spawn.y,L.spawn.z,L.spawn.yaw);
  cam.yaw=cam.targetYaw=L.camYaw;cam.focus.set(L.spawn.x,L.spawn.y+1,L.spawn.z);
  game.levelTime=0;game.gemsByLevel[i]=0;
  $('level-glyph').innerHTML=glyph(L.lines);$('level-title').textContent=L.title;$('level-sub').textContent=L.subtitle;
  document.body.dataset.level=L.id;
  updateHud(true);
}

// ---------- 输入 ----------
const keys=new Set();let jumpPressed=false;const joy={x:0,z:0,active:false};
addEventListener('keydown',e=>{if(e.target.closest?.('dialog'))return;keys.add(e.code);
  if((e.code==='Space'||e.code==='KeyK')&&!e.repeat){jumpPressed=true;e.preventDefault();}
  if(e.code==='KeyE'&&!e.repeat)interact();
  if(e.code==='Escape')closeDialogs();});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>keys.clear());
function inputVector(){
  let x=0,z=0;if(keys.has('KeyW')||keys.has('ArrowUp'))z-=1;if(keys.has('KeyS')||keys.has('ArrowDown'))z+=1;if(keys.has('KeyA')||keys.has('ArrowLeft'))x-=1;if(keys.has('KeyD')||keys.has('ArrowRight'))x+=1;
  if(joy.active){x+=joy.x;z+=joy.z;}
  // 相对镜头方向
  const s=Math.sin(cam.yaw),c=Math.cos(cam.yaw);return {x:x*c+z*s,z:-x*s+z*c};
}
// 鼠标/手指拖动转镜头
const stage=$('stage');let drag=null;
const capture=(el,id)=>{try{el.setPointerCapture(id);}catch{}};// 个别浏览器/合成事件下会抛错，不影响操作
stage.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.clientX<innerWidth*.45)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};capture(stage,e.pointerId);});
stage.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;cam.targetYaw-=(e.clientX-drag.x)*.006;cam.targetPitch=THREE.MathUtils.clamp(cam.targetPitch+(e.clientY-drag.y)*.004,.12,1.25);drag.x=e.clientX;drag.y=e.clientY;});
stage.addEventListener('pointerup',()=>drag=null);stage.addEventListener('pointercancel',()=>drag=null);
stage.addEventListener('wheel',e=>{cam.targetDist=THREE.MathUtils.clamp(cam.targetDist+e.deltaY*.01,5,18);e.preventDefault();},{passive:false});
// 触屏摇杆
const pad=$('joystick'),knob=$('knob');let padId=null,padCenter={x:0,y:0};
function padMove(e){const dx=e.clientX-padCenter.x,dy=e.clientY-padCenter.y,l=Math.hypot(dx,dy),m=48,k=Math.min(1,l/m);const nx=l?dx/l*k:0,ny=l?dy/l*k:0;joy.x=nx;joy.z=ny;joy.active=true;knob.style.transform=`translate(${nx*m}px,${ny*m}px)`;}
pad.addEventListener('pointerdown',e=>{padId=e.pointerId;const r=pad.getBoundingClientRect();padCenter={x:r.left+r.width/2,y:r.top+r.height/2};capture(pad,e.pointerId);padMove(e);});
pad.addEventListener('pointermove',e=>{if(e.pointerId===padId)padMove(e);});
const padEnd=()=>{padId=null;joy.active=false;joy.x=joy.z=0;knob.style.transform='';};pad.addEventListener('pointerup',padEnd);pad.addEventListener('pointercancel',padEnd);
$('btn-jump').addEventListener('pointerdown',e=>{e.preventDefault();jumpPressed=true;});
$('btn-act').addEventListener('pointerdown',e=>{e.preventDefault();interact();});

// ---------- 交互 ----------
function nearestInteractable(){const p=ctrl.p;let best=null,bd=2.3;for(const it of game.level.interactables){const d=Math.hypot(p.x-it.pos.x,p.z-it.pos.z);if(d<bd&&Math.abs(p.y-it.pos.y)<2){bd=d;best=it;}}return best;}
function interact(){if(game.mode!=='play')return;const it=nearestInteractable();if(it)it.act();}

// ---------- 对话框 ----------
function glyph(lines,cls=''){return '<span class="glyph '+cls+'">'+lines.slice().reverse().map(y=>'<i class="'+(y?'yang':'yin')+'"><b></b><b></b></i>').join('')+'</span>';}
function openLore(id){
  const L=LORE[id],T=TRIGRAMS[L.trigram];
  $('lore-title').innerHTML=glyph(T.lines,'big')+'<span>'+T.name+' · '+T.image+'<small>'+L.hexagram+'</small></span>';
  $('lore-quotes').innerHTML=L.quotes.map(q=>'<li><q>'+q.text+'</q><cite>'+q.src+(q.note?'　<em>'+q.note+'</em>':'')+'</cite></li>').join('');
  $('lore-rule').textContent=L.rule;$('lore').showModal();sfx.ui();
}
$('btn-lore').onclick=()=>openLore(game.level.id);
$('btn-about').onclick=()=>{$('about-body').innerHTML=ABOUT.body.map(p=>'<p>'+p+'</p>').join('');$('about').showModal();sfx.ui();};
$('btn-help').onclick=()=>{$('help').showModal();sfx.ui();};
$('btn-sound').onclick=()=>{sfx.setMuted(!sfx.muted);$('btn-sound').textContent=sfx.muted?'🔇':'🔊';$('btn-sound').setAttribute('aria-pressed',String(!sfx.muted));};
$('btn-restart').onclick=()=>{loadLevel(game.levelIndex);toast('重新开始本境。');};
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
document.querySelectorAll('dialog').forEach(d=>d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close()));

// ---------- 标题 / 过场 / 结局 ----------
function startGame(i=0){sfx.unlock();$('title').hidden=true;$('end').hidden=true;game.mode='play';game.startedAt=performance.now();game.totalGems=0;game.cleared=[false,false];loadLevel(i);showCard();}
$('btn-start').onclick=()=>startGame(0);
document.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>startGame(Number(b.dataset.chapter)));
function showCard(){const L=game.level;$('card-glyph').innerHTML=glyph(L.lines,'big');$('card-title').textContent=L.title;$('card-sub').textContent=L.subtitle;const c=$('card');c.classList.remove('show');void c.offsetWidth;c.classList.add('show');}
function nextLevel(){
  game.mode='transition';game.cleared[game.levelIndex]=true;sfx.portal();$('fade').classList.add('on');
  setTimeout(()=>{if(game.levelIndex+1<LEVELS.length){loadLevel(game.levelIndex+1);game.mode='play';showCard();}else showEnd();$('fade').classList.remove('on');},900);
}
function showEnd(){
  game.mode='end';const secs=Math.round((performance.now()-game.startedAt)/1000);
  $('end-time').textContent=Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0');$('end-gems').textContent=game.gemsByLevel.reduce((a,b)=>a+b,0)+' / 12';
  $('end-map').innerHTML=WORLD_ORDER.map((id,k)=>{const T=TRIGRAMS[id],a=k/8*Math.PI*2,x=50+Math.sin(a)*38,y=50-Math.cos(a)*38,done=(id==='kan'&&game.cleared[0])||(id==='li'&&game.cleared[1]);
    return '<div class="node'+(done?' done':'')+'" style="left:'+x+'%;top:'+y+'%">'+glyph(T.lines)+'<b>'+T.name+'</b><small>'+T.image+' · '+T.dir+'</small></div>';}).join('')+'<div class="hub">后天八卦方位<br><small>北在上</small></div>';
  $('end').hidden=false;
}
$('btn-again').onclick=()=>startGame(0);

// ---------- HUD ----------
let lastObjective='';
function updateHud(force){
  const L=game.level;const got=L.gems.filter(g=>g.taken).length;$('gems').textContent=got+' / '+L.gems.length;
  const o=L.objective();if(o!==lastObjective||force){$('objective').textContent=o;lastObjective=o;}
  const it=game.mode==='play'?nearestInteractable():null;$('prompt').hidden=!it;if(it)$('prompt-label').textContent=it.label;$('btn-act').classList.toggle('ready',!!it);
  if(performance.now()>game.toastUntil)$('toast').classList.remove('show');
}

// ---------- 主循环 ----------
const clock=new THREE.Clock();let acc=0,testMove=null;const FIXED=1/120;
function step(dt){
  game.time+=dt;game.levelTime+=dt;const L=game.level,p=ctrl.p;
  const input=game.mode!=='play'?{x:0,z:0}:testMove?{...testMove}:inputVector();input.jump=game.mode==='play'&&jumpPressed;jumpPressed=false;
  L.update(dt,game.time,p);
  ctrl.update(dt,input);
  if(p.y<L.killY){game.falls++;sfx.splash();burst(new THREE.Vector3(p.x,-.5,p.z),{color:'#e9fbff',n:18,speed:3,up:4});L.onFall?.();ctrl.place(p.checkpoint.x,p.checkpoint.y+.3,p.checkpoint.z,p.yaw);mascot.impulse(-3);}
  for(const g of L.gems){if(!g.taken&&Math.hypot(p.x-g.pos.x,p.z-g.pos.z)<.9&&Math.abs(g.pos.y-(p.y+.46))<1.2){g.taken=true;game.gemsByLevel[game.levelIndex]++;sfx.gem();mascot.cheer();burst(g.pos,{color:'#bff5dd',n:16,speed:2.2,up:2.5});const n=L.gems.filter(x=>x.taken).length;toast('得到爻玉 '+n+' / '+L.gems.length);}g.update(dt,game.time);}
  if(game.mode==='play'&&L.gate.inside(p)){if(L.gate.active)nextLevel();else if(game.time-game.lastGateHint>3){game.lastGateHint=game.time;toast(L.solved?'卦门还没亮：还需要 '+(3-L.gems.filter(g=>g.taken).length)+' 枚爻玉。':'卦门还没亮：先解开本境的卦象。');}}
  world.update(dt,game.time);
  mascot.update(dt,{vel:new THREE.Vector3(p.vx,p.vy,p.vz),grounded:p.grounded,yaw:p.yaw});
}
function render(dt){
  const p=ctrl.p;
  mascot.root.position.set(p.x,p.y,p.z);mascot.root.rotation.y=p.yaw;
  const g=physics.groundAt(p.x,p.z,p.y+.01);shadowBlob.visible=g.col!==null;if(g.col){shadowBlob.position.set(p.x,g.h+.02,p.z);const h=Math.max(0,p.y-g.h);shadowBlob.scale.setScalar(Math.max(.35,1-h*.12));shadowBlob.material.opacity=Math.max(.08,.3-h*.04);}
  // 镜头：平滑跟随
  const e=1-Math.exp(-dt*6);cam.yaw+=(cam.targetYaw-cam.yaw)*e;cam.pitch+=(cam.targetPitch-cam.pitch)*e;cam.dist+=(cam.targetDist-cam.dist)*e;
  if(keys.has('KeyQ'))cam.targetYaw+=dt*1.8;if(keys.has('KeyR'))cam.targetYaw-=dt*1.8;
  cam.focus.lerp(new THREE.Vector3(p.x+p.vx*.25,p.y+1.1,p.z+p.vz*.25),1-Math.exp(-dt*5));
  camera.position.set(cam.focus.x+Math.sin(cam.yaw)*Math.cos(cam.pitch)*cam.dist,cam.focus.y+Math.sin(cam.pitch)*cam.dist,cam.focus.z+Math.cos(cam.yaw)*Math.cos(cam.pitch)*cam.dist);camera.lookAt(cam.focus);
  sun.position.set(p.x-12,p.y+22,p.z+8);sun.target.position.set(p.x,p.y,p.z);
  world.sky.position.copy(camera.position);
  renderer.render(scene,camera);
}
function resize(){const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}
addEventListener('resize',resize);
function frame(){
  requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.1);
  if(game.mode==='play'||game.mode==='title'||game.mode==='transition'){acc+=dt;let n=0;while(acc>=FIXED&&n<16){step(FIXED);acc-=FIXED;n++;}if(n===16)acc=0;}
  if(game.mode==='title'){cam.targetYaw+=dt*.12;}
  render(dt);updateHud();
}

loadLevel(0);resize();cam.targetDist=cam.dist=11;frame();
$('loading').hidden=true;

// 测试接口：确定性推进，不依赖帧率
window.__Q={
  get game(){return game;},get level(){return game.level;},get player(){return ctrl.p;},get mascot(){return mascot;},get physics(){return physics;},camera,renderer,cam,
  start:startGame,loadLevel,
  // 以固定步长推进 seconds 秒；input: {x,z,jump}（相对镜头）或 keys 数组
  // move：世界坐标方向 {x,z}，用于自动走位测试
  step(seconds,{keys:k=[],jump=false,move=null,draw=true}={}){k.forEach(c=>keys.add(c));testMove=move;let first=true;for(let t=0;t<seconds-1e-9;t+=FIXED){if(first&&jump)jumpPressed=true;first=false;step(FIXED);}testMove=null;k.forEach(c=>keys.delete(c));if(draw){render(1/60);updateHud(true);}},
  jump(){jumpPressed=true;},interact,
  teleport(x,y,z){ctrl.place(x,y,z);},
  render(){render(1/60);},
  ready:true,
};

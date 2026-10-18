import * as THREE from '../vendor/three.module.js';
import {createWorld,seeded} from './world.js';
import {createPhysics,createController} from './physics.js';
import {createMascot,CHARACTERS,CHARACTER_ORDER} from './mascot.js';
import {createKit} from './kit.js';
import {buildKan} from './levels/kan.js';
import {buildLi} from './levels/li.js';
import {buildJiji} from './levels/jiji.js';
import {buildWeiji} from './levels/weiji.js';
import {LORE,TRIGRAMS,ABOUT,WORLD_ORDER} from './lore.js';
import {CODEX,loadSave,writeSave} from './codex.js';
import {createAudio} from './audio.js';

const $=id=>document.getElementById(id);
const LEVELS=[buildKan,buildLi,buildJiji,buildWeiji];const LEVEL_IDS=['kan','li','jiji','weiji'];
const save=loadSave();

// ---------- 渲染器 ----------
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.shadowMap.enabled=true;/* 像素倍数在 resize() 里按预算设定 */renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
$('stage').append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(46,1,.1,600);
const sfx=createAudio();sfx.setMuted(!save.sfx);sfx.setMusicMuted(!save.music);

// ---------- 状态 ----------
const game={mode:'title',levelIndex:0,level:null,startedAt:0,levelTime:0,gemsByLevel:[0,0,0,0],cleared:[false,false,false,false],starsRun:[null,null,null,null],form:'normal',time:0,toastUntil:0,lastGateHint:0,falls:0,levelFalls:0,challenge:save.challenge};
let camBlocks=[],scene,physics,world,kit,ctrl,mascot,shadowBlob,sun,hemi,envMap;
const cam={yaw:0,pitch:.42,dist:9,targetYaw:0,targetPitch:.42,targetDist:9,focus:new THREE.Vector3()};

function toast(text,ms=3600){const el=$('toast');$('toast-text').textContent=text;el.classList.add('show');game.toastUntil=performance.now()+ms;}
// 提示随时能关：点 ×、点提示框任何地方，或按 Esc
function hideToast(){$('toast').classList.remove('show');game.toastUntil=0;}
$('toast').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();hideToast();});
function burst(pos,opts){world?.burst(pos,opts);}
function persist(){writeSave(save);}

// ---------- 图鉴 ----------
function unlock(id,quiet=false){if(save.codex.includes(id))return false;save.codex.push(id);persist();const c=CODEX.find(c=>c.id===id);if(c&&!quiet){toast('图鉴解锁：'+c.title+'（点右上角「鉴」查看）',4200);$('btn-codex').classList.add('new');}return true;}

// ---------- 角色 ----------
function spawnMascot(kind){
  if(mascot)scene.remove(mascot.root);
  mascot=createMascot({envMap,kind});scene.add(mascot.root);sfx.setVoice(CHARACTERS[kind].voice);
  if(game.level)mascot.setTrigram(game.level.lines);
}
function selectCharacter(kind){
  if(!CHARACTERS[kind])return;save.char=kind;persist();spawnMascot(kind);mascot.cheer();sfx.jump(1);
  if(kind!=='yao')unlock('c-'+kind,true);
  document.querySelectorAll('[data-char]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.char===kind)));
  $('char-desc').textContent=CHARACTERS[kind].name+'：'+CHARACTERS[kind].desc;
}

// ---------- 水火变身 ----------
const FORM_ORDER=['normal','water','fire'],FORM_NAME={normal:'原形',water:'水态',fire:'火态'};
function setForm(f){if(!game.level?.forms)f='normal';game.form=f;mascot?.setForm(f);if(physics)physics.state.form=f;const el=$('form');el.dataset.form=f;el.querySelector('b').textContent=FORM_NAME[f];}
// F / 触屏键：第三境变身；第四境（水下）是「震」
function formKey(){if(game.mode!=='play')return;if(game.level.slam){if(game.level.slam(ctrl.p))ctrl.p.slamReq=true;}else cycleForm();}
function cycleForm(){if(game.mode!=='play'||!game.level.forms)return;const f=FORM_ORDER[(FORM_ORDER.indexOf(game.form)+1)%3];setForm(f);sfx.toggle(f!=='normal');burst(new THREE.Vector3(ctrl.p.x,ctrl.p.y+.5,ctrl.p.z),{color:f==='water'?'#bfe6ff':f==='fire'?'#ffc58a':'#ffffff',n:14,speed:2,up:1.5});mascot.impulse(-2.5);}

// ---------- 关卡加载 ----------
function loadLevel(i){
  if(scene){scene.traverse(o=>{o.geometry?.dispose?.();});}
  game.levelIndex=i;scene=new THREE.Scene();scene.userData.camera=camera;
  physics=createPhysics();const rng=seeded(17+i*101);
  world=createWorld({scene,physics,renderer,rng});kit=createKit({world,physics,scene});
  hemi=new THREE.HemisphereLight(i===1?'#ffe0c4':'#e8f6ff',i===1?'#6b5a7a':'#6f8f7c',i===1?1.25:1.45);scene.add(hemi);
  sun=new THREE.DirectionalLight(i===1?'#ffc58f':'#fff3dc',i===1?2.1:2.4);sun.castShadow=perf.tier<2;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:60});sun.shadow.bias=-.0005;sun.shadow.normalBias=.04;scene.add(sun);scene.add(sun.target);
  scene.add(new THREE.AmbientLight('#ffffff',.18));
  envMap=world.makeEnv();game.level=null;mascot=null;spawnMascot(save.char);
  shadowBlob=new THREE.Mesh(new THREE.CircleGeometry(.5,24),new THREE.MeshBasicMaterial({color:'#1f3a36',transparent:true,opacity:.28,depthWrite:false}));shadowBlob.rotation.x=-Math.PI/2;shadowBlob.renderOrder=1;scene.add(shadowBlob);
  ctrl=createController({physics,
    onHop:()=>{mascot.impulse(1.2);sfx.hop();},
    onJump:(n)=>{mascot.impulse(n===1?2.6:3.2);sfx.jump(n);if(n===2)burst(new THREE.Vector3(ctrl.p.x,ctrl.p.y+.2,ctrl.p.z),{color:'#e9fff6',n:8,speed:1.6,up:.5,life:.45,size:.3,gravity:0});},
    onSlam:(col,still)=>{const p=ctrl.p;mascot.impulse(-6);sfx.thud();burst(new THREE.Vector3(p.x,p.y+.15,p.z),{color:'#e8fbff',n:18,speed:4,up:1.2,life:.6,size:.4,gravity:-1});game.level?.onSlam?.(p,col,still);},
    onLand:(col,impact,hop)=>{mascot.impulse(-Math.min(6,impact*.62));if(!hop&&impact>5){sfx.land(impact);burst(new THREE.Vector3(ctrl.p.x,ctrl.p.y+.05,ctrl.p.z),{color:'#f4ead2',n:8,speed:2,up:.8,life:.4,size:.3});}if(col.bounce){sfx.bounce();burst(new THREE.Vector3(col.x,col.top+.2,col.z),{color:'#ffffff',n:14,speed:2.5,up:1});}game.level?.onLand?.(col,impact);}});
  const ctx={world,kit,physics,scene,toast,sfx,rng,burst,lights:{hemi,sun},camera,envMap,get mascot(){return mascot;},get player(){return ctrl.p;},getForm:()=>game.form,setForm,openLore,unlock,challenge:game.challenge,flags:save.flags,persist};
  game.level=LEVELS[i](ctx);world.bake();camBlocks=physics.colliders.filter(c=>c.camBlock);cam.k=1;perf.grace=4;/* 静态装饰合并成少数网格 */
  const L=game.level;mascot.setTrigram(L.lines);
  ctrl.place(L.spawn.x,L.spawn.y,L.spawn.z,L.spawn.yaw);Object.assign(prevP,{x:L.spawn.x,y:L.spawn.y,z:L.spawn.z,yaw:L.spawn.yaw});
  try{renderer.compile(scene,camera);}catch{}/* 进关时一次编好所有着色器，别在路上边走边编、一卡一卡 */
  cam.yaw=cam.targetYaw=L.camYaw;cam.focus.set(L.spawn.x,L.spawn.y+1,L.spawn.z);
  game.levelTime=0;game.gemsByLevel[i]=0;game.levelFalls=0;game.timeLimit=game.challenge?L.timeLimit:0;
  $('level-glyph').innerHTML=glyph(L.lines);$('level-title').textContent=L.title;$('level-sub').textContent=L.subtitle;
  document.body.dataset.level=L.id;$('timer').hidden=!game.challenge;$('form').hidden=!L.forms;document.body.classList.toggle('forms',!!L.forms);document.body.classList.toggle('slam',!!L.slam);$('btn-form').textContent=L.slam?'震':'变';setForm('normal');
  if(game.mode!=='title'){sfx.playTheme(L.id);sfx.setLayer(2);}
  updateHud(true);
}

// ---------- 输入 ----------
const keys=new Set();let jumpPressed=false,jumpHeld=false;const joy={x:0,z:0,active:false};
addEventListener('keydown',e=>{if(e.target.closest?.('dialog'))return;keys.add(e.code);
  if((e.code==='Space'||e.code==='KeyK')&&!e.repeat){jumpPressed=true;e.preventDefault();}
  if(e.code==='KeyE'&&!e.repeat)interact();
  if(e.code==='KeyF'&&!e.repeat)formKey();
  if(e.code==='KeyT'&&!e.repeat)resetToSafe();
  if(e.code==='Escape'){if($('toast').classList.contains('show'))hideToast();closeDialogs();}});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{keys.clear();jumpHeld=false;});
function inputVector(){
  let x=0,z=0;if(keys.has('KeyW')||keys.has('ArrowUp'))z-=1;if(keys.has('KeyS')||keys.has('ArrowDown'))z+=1;if(keys.has('KeyA')||keys.has('ArrowLeft'))x-=1;if(keys.has('KeyD')||keys.has('ArrowRight'))x+=1;
  if(joy.active){x+=joy.x;z+=joy.z;}
  const s=Math.sin(cam.yaw),c=Math.cos(cam.yaw);return {x:x*c+z*s,z:-x*s+z*c};
}
const stage=$('stage');let drag=null;
// ---------- 横屏模式 ----------
// 小红书小工具锁竖屏。打开「横屏」后整页顺时针转 90°：玩家把手机逆时针横握（充电口在右手边）时画面是正的。
// 屏幕坐标 (X,Y) 与页面坐标 (x,y) 的关系：X = 屏宽 - y，Y = x。所以手指移动 (dX,dY) 对应页面里的 (dY,-dX)。
const landMQ=window.matchMedia?matchMedia('(orientation: landscape) and (max-height: 540px)'):null;
const toLocal=(dx,dy)=>save.land?{x:dy,y:-dx}:{x:dx,y:dy};
function applyOrientation(){
  const de=document.documentElement,b=document.body,W=innerWidth,H=innerHeight;
  de.classList.toggle('land',!!save.land);de.classList.toggle('landui',!!save.land||!!(landMQ&&landMQ.matches));
  de.style.setProperty('--sw',W+'px');de.style.setProperty('--sh',H+'px');
  if(save.land){Object.assign(b.style,{position:'fixed',left:'0',top:'0',width:H+'px',height:W+'px',transformOrigin:'0 0',transform:'translateX('+W+'px) rotate(90deg)'});}
  else{for(const k of ['position','left','top','width','height','transformOrigin','transform'])b.style[k]='';}
  const label=save.land?'⇋ 竖屏玩':'⇋ 横屏玩';$('btn-orient').textContent=label;$('btn-orient2').title=save.land?'切回竖屏':'切换横屏';
  resize();
}
function setLand(v){save.land=!!v;persist();applyOrientation();if(game.mode==='title')framing();sfx.ui();}
$('btn-orient').onclick=()=>setLand(!save.land);$('btn-orient2').onclick=()=>setLand(!save.land);
if(landMQ&&landMQ.addListener)landMQ.addListener(()=>applyOrientation());
const capture=(el,id)=>{try{el.setPointerCapture(id);}catch{}};// 个别浏览器/合成事件下会抛错，不影响操作
stage.addEventListener('pointerdown',e=>{if(game.mode!=='play')return;if(e.pointerType==='touch'&&(save.land?e.clientY/innerHeight:e.clientX/innerWidth)<.45)return;/* 左侧留给摇杆 */drag={id:e.pointerId,x:e.clientX,y:e.clientY};capture(stage,e.pointerId);});
stage.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const d=toLocal(e.clientX-drag.x,e.clientY-drag.y);cam.targetYaw-=d.x*.006;cam.targetPitch=THREE.MathUtils.clamp(cam.targetPitch+d.y*.004,.12,1.25);drag.x=e.clientX;drag.y=e.clientY;});
stage.addEventListener('pointerup',()=>drag=null);stage.addEventListener('pointercancel',()=>drag=null);
stage.addEventListener('wheel',e=>{if(game.mode!=='play')return;cam.targetDist=THREE.MathUtils.clamp(cam.targetDist+e.deltaY*.01,5,18);e.preventDefault();},{passive:false});
const pad=$('joystick'),knob=$('knob');let padId=null,padCenter={x:0,y:0};
function padMove(e){const d=toLocal(e.clientX-padCenter.x,e.clientY-padCenter.y),dx=d.x,dy=d.y,l=Math.hypot(dx,dy),m=48,k=Math.min(1,l/m);const nx=l?dx/l*k:0,ny=l?dy/l*k:0;joy.x=nx;joy.z=ny;joy.active=true;knob.style.transform=`translate(${nx*m}px,${ny*m}px)`;}
pad.addEventListener('pointerdown',e=>{padId=e.pointerId;const r=pad.getBoundingClientRect();padCenter={x:r.left+r.width/2,y:r.top+r.height/2};capture(pad,e.pointerId);padMove(e);});
pad.addEventListener('pointermove',e=>{if(e.pointerId===padId)padMove(e);});
const padEnd=()=>{padId=null;joy.active=false;joy.x=joy.z=0;knob.style.transform='';};pad.addEventListener('pointerup',padEnd);pad.addEventListener('pointercancel',padEnd);
$('btn-jump').addEventListener('pointerdown',e=>{e.preventDefault();jumpPressed=true;jumpHeld=true;});
for(const ev of ['pointerup','pointercancel','pointerleave'])$('btn-jump').addEventListener(ev,()=>{jumpHeld=false;});/* 水中：按住上浮 */
$('btn-act').addEventListener('pointerdown',e=>{e.preventDefault();interact();});
$('btn-form').addEventListener('pointerdown',e=>{e.preventDefault();formKey();});$('form').addEventListener('click',cycleForm);

// ---------- 交互 ----------
function nearestInteractable(){const p=ctrl.p;let best=null,bd=2.3,fallback=null;for(const it of game.level.interactables){if(it.far){fallback=it;continue;}const d=Math.hypot(p.x-it.pos.x,p.z-it.pos.z);if(d<bd&&Math.abs(p.y-it.pos.y)<2){bd=d;best=it;}}return best||fallback;}
function interact(){if(game.mode!=='play')return;const it=nearestInteractable();if(it)it.act();}

// ---------- 对话框 ----------
function glyph(lines,cls=''){if(lines.length>3&&!cls.includes('hex'))cls+=' hex';return '<span class="glyph '+cls+'">'+lines.slice().reverse().map(y=>'<i class="'+(y?'yang':'yin')+'"><b></b><b></b></i>').join('')+'</span>';}
function openLore(id){
  const L=LORE[id],T=L.lines?{lines:L.lines,name:L.name,image:L.image}:TRIGRAMS[L.trigram];if(id!=='jiji')unlock(id);
  $('lore-title').innerHTML=glyph(T.lines,'big')+'<span>'+T.name+' · '+T.image+'<small>'+L.hexagram+'</small></span>';
  $('lore-quotes').innerHTML=L.quotes.map(q=>'<li><q>'+q.text+'</q><cite>'+q.src+(q.note?'　<em>'+q.note+'</em>':'')+'</cite></li>').join('');
  $('lore-rule').textContent=L.rule;$('lore').showModal();sfx.ui();
}
function openCodex(){
  $('btn-codex').classList.remove('new');const groups=['卦','知识','角色'];
  $('codex-count').textContent=save.codex.length+' / '+CODEX.length;
  $('codex-grid').innerHTML=groups.map(g=>'<h3>'+g+'</h3><div class="cards">'+CODEX.filter(c=>c.group===g).map(c=>{const open=save.codex.includes(c.id);
    return '<button class="card'+(open?'':' locked')+'" data-card="'+c.id+'"'+(open?'':' aria-disabled="true"')+'>'+(c.lines?glyph(c.lines,c.lines.length>3?'hex':''):c.char?'<i class="char-dot char-'+c.char+'"></i>':'<i class="know">'+c.title[0]+'</i>')+'<b>'+(open?c.title:'？')+'</b><small>'+(open?c.pinyin:c.hint)+'</small></button>';}).join('')+'</div>').join('');
  $('codex-grid').querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{if(save.codex.includes(b.dataset.card))showCard(b.dataset.card);});
  $('codex-detail').hidden=true;$('codex-grid').hidden=false;if(!$('codex').open)$('codex').showModal();sfx.ui();
}
function showCard(id){const c=CODEX.find(c=>c.id===id);
  $('codex-detail').innerHTML='<button class="back" id="codex-back">← 返回</button><div class="detail-head">'+(c.lines?glyph(c.lines,'big'+(c.lines.length>3?' hex':'')):c.char?'<i class="char-dot big char-'+c.char+'"></i>':'')+'<div><h3>'+c.title+'</h3><small>'+c.pinyin+'</small></div></div>'+
    '<p class="one">'+c.one+'</p>'+(c.key?'<p class="key">'+c.key+'</p>':'')+
    (c.quotes.length?'<ol class="quotes">'+c.quotes.map(q=>'<li><q>'+q.t+'</q><cite>'+q.s+'</cite></li>').join('')+'</ol>':'<p class="note">'+c.noQuote+'</p>')+
    (c.noteAfter?'<p class="note">'+c.noteAfter+'</p>':'')+'<p class="rule">在游戏里：'+c.game+'</p>';
  $('codex-grid').hidden=true;$('codex-detail').hidden=false;$('codex-back').onclick=openCodex;sfx.ui();}
$('btn-codex').onclick=openCodex;
// 选关：随时跳到任意一境
const LEVEL_INFO=[{lines:[0,1,0],title:'第一境 · 习坎',sub:'坎 · 水'},{lines:[1,0,1],title:'第二境 · 继明',sub:'离 · 火'},{lines:[1,0,1,0,1,0],title:'第三境 · 既济',sub:'水在火上'},{lines:[0,1,0,1,0,1],title:'第四境 · 未济',sub:'火在水上'}];
function openLevels(){
  $('level-list').innerHTML=LEVEL_INFO.map((L,i)=>{const id=LEVEL_IDS[i],st=save.stars[id]||0,best=save.best[id];
    return '<button data-goto="'+i+'">'+glyph(L.lines)+'<span><b>'+L.title+'</b><small>'+L.sub+(best?' · 最佳 '+fmt(best):'')+'</small></span><em>'+'★'.repeat(st)+'☆'.repeat(3-st)+'</em></button>';}).join('');
  $('level-list').querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>{$('levels').close();startGame(Number(b.dataset.goto));});
  $('levels').showModal();sfx.ui();}
$('btn-levels').onclick=openLevels;
$('btn-home').onclick=()=>{closeDialogs();$('fade').classList.remove('on');sfx.ui();showTitle();};$('btn-codex-title').onclick=openCodex;
$('btn-lore').onclick=()=>openLore(game.level.id);
$('btn-about').onclick=()=>{$('about-body').innerHTML=ABOUT.body.map(p=>'<p>'+p+'</p>').join('');$('about').showModal();sfx.ui();};
$('btn-help').onclick=()=>{$('help').showModal();sfx.ui();};
function syncAudioButtons(){$('btn-sound').textContent=sfx.muted?'🔇':'🔊';$('btn-sound').setAttribute('aria-pressed',String(!sfx.muted));$('btn-music').classList.toggle('off',sfx.musicMuted);$('btn-music').setAttribute('aria-pressed',String(!sfx.musicMuted));}
$('btn-sound').onclick=()=>{sfx.setMuted(!sfx.muted);save.sfx=!sfx.muted;persist();syncAudioButtons();};
$('btn-music').onclick=()=>{sfx.setMusicMuted(!sfx.musicMuted);save.music=!sfx.musicMuted;persist();syncAudioButtons();};
$('btn-restart').onclick=()=>{loadLevel(game.levelIndex);toast('重新开始本境。');};
// 复位（像赛车游戏）：回到最近站稳过、离这里至少 1.5 米、本身不挡人的位置；爻玉、机关、手里的东西都保留
function resetToSafe(){if(game.mode!=='play')return false;const p=ctrl.p,L=game.level;
  let spot=null;for(let i=p.spots.length-1;i>=0;i--){const s=p.spots[i];if(Math.hypot(s.x-p.x,s.z-p.z)<1.5)continue;const g=physics.groundAt(s.x,s.z,s.y+.1);if(!g.col||physics.blocked(s.x,s.z,s.y))continue;spot=s;break;}
  if(!spot)spot={x:L.spawn.x,y:L.spawn.y,z:L.spawn.z,yaw:L.spawn.yaw};
  ctrl.place(spot.x,spot.y+.15,spot.z,spot.yaw??p.yaw);Object.assign(prevP,{x:spot.x,y:spot.y,z:spot.z});cam.focus.set(spot.x,spot.y+1.1,spot.z);
  stuck.t=0;stuck.ref=null;$('btn-reset').classList.remove('nudge');mascot.impulse(-3);sfx.portal();burst(new THREE.Vector3(spot.x,spot.y+.5,spot.z),{color:'#ffffff',n:14,speed:2,up:2});
  toast('已复位到刚才站稳的地方，进度都还在。',2600);return true;}
$('btn-reset').onclick=()=>resetToSafe();
// 卡住了自动提示：一直在推方向却几乎没挪动，提示用 🚩 复位
const stuck={t:0,ref:null,hintAt:-99};
function watchStuck(dt,input){const p=ctrl.p;if(game.mode!=='play'||Math.hypot(input.x,input.z)<.3||p.stun>0){stuck.t=0;stuck.ref=null;return;}
  if(!stuck.ref){stuck.ref={x:p.x,y:p.y,z:p.z};stuck.t=0;}stuck.t+=dt;
  if(Math.hypot(p.x-stuck.ref.x,p.z-stuck.ref.z)>.5||Math.abs(p.y-stuck.ref.y)>.8){stuck.ref=null;return;}
  if(stuck.t>2.6&&game.time-stuck.hintAt>20){stuck.hintAt=game.time;$('btn-reset').classList.remove('nudge');void $('btn-reset').offsetWidth;$('btn-reset').classList.add('nudge');toast('卡住了？点右上角的 🚩 复位，回到刚才站稳的地方（进度都保留）。',5200);}}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
document.querySelectorAll('dialog').forEach(d=>d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close()));

// ---------- 标题 / 过关 / 结局 ----------
function setChallenge(on){game.challenge=on;save.challenge=on;persist();document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.mode==='challenge')===on)));$('mode-desc').textContent=on?'挑战：每境限时；落水回到本境起点；火种只燃 18 秒。':'普通：落水回到最近站稳处，不限时。';}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{setChallenge(b.dataset.mode==='challenge');sfx.ui();});
document.querySelectorAll('[data-char]').forEach(b=>b.onclick=()=>{sfx.unlock();selectCharacter(b.dataset.char);});
function startGame(i=0){sfx.unlock();$('title').hidden=true;$('end').hidden=true;$('clear').hidden=true;document.body.classList.remove('titling');camera.clearViewOffset();game.mode='play';game.startedAt=performance.now();game.cleared=[false,false,false,false];game.starsRun=[null,null,null,null];game.gemsByLevel=[0,0,0,0];
  cam.targetDist=cam.dist=9;cam.targetPitch=cam.pitch=.42;loadLevel(i);showLevelCard();}
$('btn-start').onclick=()=>startGame(0);
function renderChapterStars(){document.querySelectorAll('[data-chapter]').forEach(b=>{const id=LEVEL_IDS[b.dataset.chapter],s=save.stars[id]||0;b.querySelector('.stars').textContent='★'.repeat(s)+'☆'.repeat(3-s);});}
document.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>startGame(Number(b.dataset.chapter)));
function showLevelCard(){const L=game.level;$('card-glyph').innerHTML=glyph(L.lines,'big');$('card-title').textContent=L.title;$('card-sub').textContent=L.subtitle;const c=$('card');c.classList.remove('show');void c.offsetWidth;c.classList.add('show');}
function fmt(s){s=Math.max(0,Math.round(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}

// 过卦门 → 结算：三颗星 = 通关 / 六枚爻玉全收 / 本境不落水
function levelClear(){
  const L=game.level,got=L.gems.filter(g=>g.taken).length,stars=[true,got===L.gems.length,game.levelFalls===0];
  const n=stars.filter(Boolean).length;game.cleared[game.levelIndex]=true;game.starsRun[game.levelIndex]=n;
  save.stars[L.id]=Math.max(save.stars[L.id]||0,n);const best=save.best[L.id];if(!best||game.levelTime<best)save.best[L.id]=game.levelTime;persist();
  if(L.id==='kan')unlock('wuyin');unlock(L.id);
  game.mode='clear';sfx.clear();sfx.setLayer(3);mascot.cheer();
  $('clear-title').textContent=L.title+' · 已通';$('clear-glyph').innerHTML=glyph(L.lines,'big');
  $('clear-stars').innerHTML=['通关','爻玉 '+got+' / '+L.gems.length,L.noFallLabel||'不落水'].map((t,i)=>'<li class="'+(stars[i]?'on':'')+'"><span>'+(stars[i]?'★':'☆')+'</span>'+t+'</li>').join('');
  $('clear-time').textContent=fmt(game.levelTime)+(game.challenge?'（挑战）':'');$('clear-best').textContent=fmt(save.best[L.id]);
  $('clear').hidden=false;$('btn-next').focus();
}
$('btn-next').onclick=()=>{$('clear').hidden=true;nextLevel();};
function nextLevel(){
  game.mode='transition';sfx.portal();$('fade').classList.add('on');
  setTimeout(()=>{if(game.levelIndex+1<LEVELS.length){game.mode='play';loadLevel(game.levelIndex+1);showLevelCard();}else showEnd();$('fade').classList.remove('on');},900);
}
function showEnd(){
  game.mode='end';sfx.playTheme('end');sfx.setLayer(2);const secs=(performance.now()-game.startedAt)/1000;
  $('end-time').textContent=fmt(secs);$('end-gems').textContent=game.gemsByLevel.reduce((a,b)=>a+b,0)+' / '+LEVELS.length*6;$('end-stars').textContent=game.starsRun.reduce((a,b)=>a+(b||0),0)+' / '+LEVELS.length*3;
  $('end-map').innerHTML=WORLD_ORDER.map((id,k)=>{const T=TRIGRAMS[id],a=k/8*Math.PI*2,x=50+Math.sin(a)*38,y=50-Math.cos(a)*38,done=(id==='kan'&&game.cleared[0])||(id==='li'&&game.cleared[1]);
    return '<div class="node'+(done?' done':'')+'" style="left:'+x+'%;top:'+y+'%">'+glyph(T.lines)+'<b>'+T.name+'</b><small>'+T.image+' · '+T.dir+'</small></div>';}).join('')+'<div class="hub">'+(game.cleared[2]?'<span class="hubhex">'+glyph([1,0,1,0,1,0])+(game.cleared[3]?glyph([0,1,0,1,0,1]):'')+'</span><br>既济'+(game.cleared[3]?' · 未济':' · 水在火上')+'<br>':'')+'后天八卦方位<br><small>北在上</small></div>';
  $('end').hidden=false;
}
$('btn-again').onclick=()=>{showTitle();};
function showTitle(){game.mode='title';$('end').hidden=true;$('clear').hidden=true;$('title').hidden=false;document.body.classList.add('titling');renderChapterStars();loadLevel(0);framing();sfx.playTheme('title');sfx.setLayer(2);}

// ---------- HUD ----------
let lastObjective='';
function updateHud(force){
  const L=game.level;const got=L.gems.filter(g=>g.taken).length;$('gems').textContent=got+' / '+L.gems.length;$('shells-box').hidden=!L.shellTotal;if(L.shellTotal)$('shells').textContent=L.shellCount+' / '+L.shellTotal;
  const o=L.objective();if(o!==lastObjective||force){$('objective').textContent=o;lastObjective=o;}
  const it=game.mode==='play'?nearestInteractable():null;$('prompt').hidden=!it;if(it)$('prompt-label').textContent=it.label;$('btn-act').classList.toggle('ready',!!it);
  if(game.challenge){const left=game.timeLimit-game.levelTime;$('timer').textContent='⏱ '+fmt(left);$('timer').classList.toggle('low',left<30);}
  if(performance.now()>game.toastUntil)$('toast').classList.remove('show');
}

// ---------- 主循环 ----------
// 画面插值：物理每秒固定 120 步，屏幕刷新是 60 / 90 / 120 帧不等；画的时候在上一步和这一步之间按比例取位置，不然会一顿一顿
const prevP={x:0,y:0,z:0,yaw:0},ip={x:0,y:0,z:0,yaw:0,vx:0,vy:0,vz:0};
const clock=new THREE.Clock();let acc=0,testMove=null,testUp=false;const FIXED=1/120;
function step(dt){
  game.time+=dt;const L=game.level,p=ctrl.p,playing=game.mode==='play';if(playing)game.levelTime+=dt;
  const input=!playing?{x:0,z:0}:testMove?{...testMove}:inputVector();input.jump=playing&&jumpPressed;jumpPressed=false;input.up=playing&&(testUp||jumpHeld||keys.has('Space')||keys.has('KeyK'));
  prevP.x=p.x;prevP.y=p.y;prevP.z=p.z;prevP.yaw=p.yaw;
  L.update(dt,game.time,p);
  ctrl.update(dt,input);
  watchStuck(dt,input);
  if(p.y<L.killY){
    game.falls++;game.levelFalls++;sfx.splash();sfx.fall();burst(new THREE.Vector3(p.x,-.5,p.z),{color:'#e9fbff',n:18,speed:3,up:4});L.onFall?.();
    const c=game.challenge?{x:L.spawn.x,y:L.spawn.y,z:L.spawn.z}:p.checkpoint;ctrl.place(c.x,c.y+.3,c.z,p.yaw);mascot.impulse(-3);if(game.challenge)toast('挑战模式：落水回到本境起点。');}
  for(const g of L.gems){if(!g.taken&&Math.hypot(p.x-g.pos.x,p.z-g.pos.z)<.9&&Math.abs(g.pos.y-(p.y+.46))<1.2){g.taken=true;game.gemsByLevel[game.levelIndex]++;sfx.gem();mascot.cheer();burst(g.pos,{color:'#bff5dd',n:16,speed:2.2,up:2.5});const n=L.gems.filter(x=>x.taken).length;toast('得到爻玉 '+n+' / '+L.gems.length);}g.update(dt,game.time);}
  if(playing&&L.solved&&sfx.layer<3)sfx.setLayer(3);
  if(playing&&L.gate.inside(p)){if(L.gate.active)levelClear();else if(game.time-game.lastGateHint>3){game.lastGateHint=game.time;toast(L.solved?'卦门还没亮：还需要 '+(3-L.gems.filter(g=>g.taken).length)+' 枚爻玉。':'卦门还没亮：先解开本境的卦象。');}}
  if(playing&&game.challenge&&game.levelTime>=game.timeLimit){toast('时间到！本境重新开始。',4200);loadLevel(game.levelIndex);}
  world.update(dt,game.time);
  mascot.update(dt,{vel:new THREE.Vector3(p.vx,p.vy,p.vz),grounded:p.grounded,yaw:p.yaw});
}
// 标题页：镜头靠近角色，画面偏移，让角色站在标题框旁边
function framing(){const L=game.level;ctrl.place(L.spawn.x,L.spawn.y,L.spawn.z,0);const narrow=stage.clientWidth<=760;cam.targetYaw=cam.yaw=.25;cam.targetPitch=cam.pitch=narrow?.22:.16;cam.targetDist=cam.dist=narrow?7.5:4.4;/* 手机竖屏：拉远一些，角色站在标题框上方 */cam.focus.set(L.spawn.x,L.spawn.y+.75,L.spawn.z);}
function interp(){const p=ctrl.p;let a=Math.min(1,Math.max(0,acc/FIXED));if(Math.hypot(p.x-prevP.x,p.y-prevP.y,p.z-prevP.z)>2.5)a=1;/* 瞬移、复活：不插值 */
  ip.x=prevP.x+(p.x-prevP.x)*a;ip.y=prevP.y+(p.y-prevP.y)*a;ip.z=prevP.z+(p.z-prevP.z)*a;let dy=p.yaw-prevP.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));ip.yaw=prevP.yaw+dy*a;ip.vx=p.vx;ip.vy=p.vy;ip.vz=p.vz;ip.swim=p.swim;ip.grounded=p.grounded;return ip;}
const camGoal=new THREE.Vector3(),camLead={x:0,z:0};
function render(dt){
  const p=interp();
  mascot.root.position.set(p.x,p.y,p.z);mascot.root.rotation.y=game.mode==='title'?Math.sin(game.time*.6)*.35+.25:p.yaw;
  const g=physics.groundAt(p.x,p.z,p.y+.01);shadowBlob.visible=g.col!==null;if(g.col){shadowBlob.position.set(p.x,g.h+.02,p.z);const h=Math.max(0,p.y-g.h);shadowBlob.scale.setScalar(Math.max(.35,1-h*.12));shadowBlob.material.opacity=Math.max(.08,.3-h*.04);}
  const e=1-Math.exp(-dt*6);cam.yaw+=(cam.targetYaw-cam.yaw)*e;cam.pitch+=(cam.targetPitch-cam.pitch)*e;cam.dist+=(cam.targetDist-cam.dist)*e;
  if(keys.has('KeyQ'))cam.targetYaw+=dt*1.8;if(keys.has('KeyR'))cam.targetYaw-=dt*1.8;
  if(game.mode!=='title'){const kl=1-Math.exp(-dt*6);camLead.x+=(p.vx*.25-camLead.x)*kl;camLead.z+=(p.vz*.25-camLead.z)*kl;/* 镜头往前看一点；撞墙急停时慢慢收回，不跳 */cam.focus.lerp(camGoal.set(p.x+camLead.x,p.y+1.1,p.z+camLead.z),1-Math.exp(-dt*5));}
  camera.position.set(cam.focus.x+Math.sin(cam.yaw)*Math.cos(cam.pitch)*cam.dist,cam.focus.y+Math.sin(cam.pitch)*cam.dist,cam.focus.z+Math.cos(cam.yaw)*Math.cos(cam.pitch)*cam.dist);if(game.level.camBlock&&game.mode!=='title'){/* 镜头钻进高墙时，沿视线往回收到墙外（矮墙不管，镜头从上面越过去）；连续地收，不一档一档跳 */
    const f=cam.focus,P=camera.position,inside=t=>{const x=f.x+(P.x-f.x)*t,y=f.y+(P.y-f.y)*t,z=f.z+(P.z-f.z)*t;for(const c of camBlocks)if(y<c.top+.3&&y>c.bottom-.3&&physics.contains(c,x,z,.45))return true;return false;};
    let k=1;if(inside(1)){let lo=.1,hi=1;for(let i=0;i<10;i++){const m=(lo+hi)/2;if(inside(m))hi=m;else lo=m;}k=lo;}
    const ck=cam.k??1;cam.k=ck+(k-ck)*Math.min(1,dt*(k<ck?14:3));P.lerpVectors(f,P,Math.max(.1,cam.k));}
  if(game.level.camMaxY){const my=game.level.camMaxY(p);if(camera.position.y>my)camera.position.y=my;}camera.lookAt(cam.focus);
  if(game.mode==='title'){const r={width:stage.clientWidth,height:stage.clientHeight},wide=r.width>760;camera.setViewOffset(r.width,r.height,wide?-r.width*.2:0,wide?0:r.height*.3,r.width,r.height);}
  sun.position.set(p.x-12,p.y+22,p.z+8);sun.target.position.set(p.x,p.y,p.z);
  world.sky.position.copy(camera.position);
  renderer.render(scene,camera);
}
// 画质：0 = 默认（像素倍数 ≤1.5、总像素 ≤约 200 万、有阴影）；1 = 像素倍数 1；2 = 再关阴影。持续卡顿时自动逐级降档
const perf={tier:0,acc:0,n:0,lost:0};
function pixelRatio(w,h){const cap=perf.tier>=1?1:1.5;return Math.max(.5,Math.min(devicePixelRatio||1,cap,Math.sqrt((perf.tier>=1?1e6:2e6)/Math.max(1,w*h))));}
function adapt(dt){if(game.mode!=='play'||perf.tier>=2)return;if(perf.grace>0){perf.grace-=dt;return;}if(dt>.25)return;/* 刚进关的几秒（编译着色器）和偶发的长停顿不算 */perf.acc+=dt;perf.n++;if(perf.acc<3)return;const avg=perf.acc/perf.n;perf.acc=0;perf.n=0;
  if(avg>1/22){perf.tier++;if(perf.tier===1)resize();else{renderer.shadowMap.enabled=false;if(sun)sun.castShadow=false;scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});}}}
function resize(){const r={width:stage.clientWidth||innerWidth,height:stage.clientHeight||innerHeight};renderer.setPixelRatio(pixelRatio(r.width,r.height));renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}
addEventListener('resize',()=>applyOrientation());
function frame(){
  requestAnimationFrame(frame);if(window.__Q?.manual||document.hidden||perf.glLost){clock.getDelta();return;}/* 录制模式 / 切到后台 / 图形上下文丢失：不推进 */tick(Math.min(clock.getDelta(),.1));}
// 一帧：按真实间隔推进固定步长的物理，再画一帧（测试里也直接调用，模拟不同刷新率）
function tick(dt){adapt(dt);
  if(game.mode!=='end'){acc+=dt;let n=0;while(acc>=FIXED&&n<16){step(FIXED);acc-=FIXED;n++;}if(n===16)acc=0;}
  if(game.level.frame)game.level.frame(dt,game.time+acc,interp());/* 纯画面的东西（鱼群、气泡、水母……）每帧更新一次，用插值后的位置和时间 */
  if(game.mode==='title'&&Math.random()<dt*.25)mascot.cheer();
  render(dt);updateHud();
}

// 切到后台：暂停声音；回来时丢掉这段时间差，不补算
document.addEventListener('visibilitychange',()=>{sfx.setPaused(document.hidden);clock.getDelta();acc=0;});
// 图形上下文丢失：停止渲染并提示；恢复后继续。反复丢失时不再重试，提示重新打开
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();perf.glLost=true;perf.lost++;
  $('glnote').textContent=perf.lost>=3?'设备图形资源不足，请关闭后重新打开。':'画面暂停了，正在恢复……';$('glnote').hidden=false;},false);
renderer.domElement.addEventListener('webglcontextrestored',()=>{if(perf.lost>=3)return;perf.glLost=false;$('glnote').hidden=true;clock.getDelta();},false);
// 启动
document.querySelectorAll('[data-char]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.char===save.char));});
setChallenge(save.challenge);syncAudioButtons();
applyOrientation();showTitle();selectCharacter(save.char);frame();
// 横屏时目标提示只显示一行，点一下展开 / 收起
document.querySelector('.objective').addEventListener('click',e=>e.currentTarget.classList.toggle('open'));
$('loading').hidden=true;
// 第一次点击页面任意处即解锁声音（浏览器要求）
addEventListener('pointerdown',()=>sfx.unlock(),{once:true});addEventListener('keydown',()=>sfx.unlock(),{once:true});

// 测试接口：确定性推进，不依赖帧率
window.__Q={
  get game(){return game;},get level(){return game.level;},get player(){return ctrl.p;},get mascot(){return mascot;},get physics(){return physics;},camera,renderer,cam,save,sfx,
  start:startGame,loadLevel,openLevels,selectCharacter,openCodex,unlock,setChallenge,showTitle,setForm,cycleForm,nearestInteractable,
  step(seconds,{keys:k=[],jump=false,move=null,up=false,draw=true}={}){k.forEach(c=>keys.add(c));testMove=move;testUp=up;let first=true,n=0;for(let t=0;t<seconds-1e-9;t+=FIXED){if(first&&jump)jumpPressed=true;first=false;step(FIXED);if(++n%2===0&&game.level.frame)game.level.frame(FIXED*2,game.time,interp());}testMove=null;testUp=false;k.forEach(c=>keys.delete(c));if(draw){render(1/60);updateHud(true);}},
  jump(){jumpPressed=true;},interact,toast,resetToSafe,slam(){formKey();},
  teleport(x,y,z){ctrl.place(x,y,z);Object.assign(prevP,{x,y,z});},
  render(dt=1/60){render(dt);updateHud(true);},manual:false,tick,
  ready:true,
};

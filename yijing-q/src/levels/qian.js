import * as THREE from '../../vendor/three.module.js';
import {createDragon} from '../dragon.js';

// 第五境 · 乾为天（试玩：初九、九二）。骨架是《彖传》"时乘六龙以御天"：
//   日轨：天上的太阳一直在转（天行健），龙只在它的时辰到来；错过了就等下一圈
//   初九 潜龙勿用：站上龙台，等到时辰，小龙从云海里浮上来驮你潜行。骑着时只能坐稳，不能乱跳
//   九二 见龙在田，利见大人：云田里遇到放牛老人，得到编磬。小龙唱几个音，你在编磬上敲出同样的音（同声相应），
//        它就照做：盘成桥 → 托你上高处 → 摆尾扫开云墙
// 玩法都是本作原创；引文见 lore.js。
export const NOTE_NAMES=['宫','商','角','徵','羽'];
export function buildQian(ctx){
  const {world,kit,physics,toast,sfx,burst,scene}=ctx;
  const LINES=[1,1,1,1,1,1];
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const rng=ctx.rng;

  // ---------- 天、云海、远山 ----------
  const U=world.skyUniforms;U.top.value.set('#7fb8ea');U.mid.value.set('#eaf3ff');U.bottom.value.set('#ffffff');U.sunColor.value.set('#fff1c4');
  scene.fog=new THREE.Fog('#eaf3ff',40,170);
  world.farMountains('#a9c2d8',26,150);world.addClouds(18,'#ffffff');
  // 云海：一大片缓缓翻涌的白（掉下去就回到站稳处）
  const seaMat=new THREE.ShaderMaterial({fog:true,uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{t:{value:0}}]),
    vertexShader:'#include <fog_pars_vertex>\nvarying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader:'#include <fog_pars_fragment>\nuniform float t;varying vec3 vW;float n(vec2 p){return sin(p.x*.23+t*.25)*sin(p.y*.19-t*.2)+.6*sin((p.x+p.y)*.11+t*.15)+.35*sin(p.x*.6-p.y*.5+t*.4);}void main(){float v=n(vW.xz);vec3 c=mix(vec3(.82,.88,.97),vec3(1.,1.,1.),smoothstep(-.6,1.1,v));c=mix(c,vec3(1.,.97,.9),smoothstep(1.,1.6,v)*.6);gl_FragColor=vec4(c,1.);\n#include <fog_fragment>\n}'});
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(600,600),seaMat);sea.rotation.x=-Math.PI/2;sea.position.y=0;scene.add(sea);
  // 云海上鼓起的一团团云（一次绘制）
  {const puffs=new THREE.InstancedMesh(new THREE.SphereGeometry(1,14,10),world.toon('#ffffff'),110),dm=new THREE.Object3D();
    for(let i=0;i<110;i++){const a=rng()*Math.PI*2,r=9+rng()*60;dm.position.set(Math.cos(a)*r*.7,-.4+rng()*.3,-20+Math.sin(a)*r);const s=1.2+rng()*2.6;dm.scale.set(s*1.4,s*.55,s);dm.updateMatrix();puffs.setMatrixAt(i,dm.matrix);}
    puffs.frustumCulled=false;world.root.add(puffs);}

  // ---------- 岛 ----------
  const G1='#bfe3a8',G2='#cfe9b0',EARTH='#b9a68a',ROCK='#a59a8a';
  const S0=world.island({x:0,z:10,r:5.5,top:.6,grass:G1,earth:EARTH,rock:ROCK});
  const T1=world.island({x:0,z:-21,r:6,top:1.2,grass:G2,earth:EARTH,rock:ROCK});
  const T1b=world.island({x:8.4,z:-21,r:2.2,top:1.8,grass:G1,earth:EARTH,rock:ROCK});
  const T2=world.island({x:0,z:-41,r:5,top:1.6,grass:G2,earth:EARTH,rock:ROCK});
  const T3=world.island({x:0,z:-51,r:5,top:9.6,grass:G1,earth:EARTH,rock:ROCK});
  // 云田：岛上一圈圈的梯田埂（装饰）
  for(const [isl,n] of [[T1,3],[T2,2]])for(let k=1;k<=n;k++){const m=world.markStatic(world.mesh(new THREE.TorusGeometry(isl.r*(k/(n+1)),.06,6,40),world.toon('#9fcf84'),isl.col.x,isl.top+.03,isl.col.z));m.rotation.x=Math.PI/2;m.castShadow=false;}
  world.meadow([S0,T1,T1b,T2,T3].map(i=>({x:i.col.x,z:i.col.z,r:i.r,top:i.top})),520,['#a6d98a','#b9e39c'],['#ffffff','#ffe6a8','#ffd1dc']);
  world.pine(-3.8,.6,12.6,1);world.roundTree(3.6,.6,13,.9,'#9fd88a');world.rock(3.8,.6,7.4,.8,ROCK);
  world.pine(4.4,1.2,-17,.9);world.roundTree(-4.6,1.2,-24.6,1,'#a8dc8a');world.bamboo(4.6,1.6,-38.4,4,'#86c79a');world.pine(-3.4,9.6,-48.2,.9);

  // ---------- 日轨：太阳在天上绕圈，30 秒一圈 ----------
  const DAY=30,WIN=60*Math.PI/180;// 龙的时辰：一圈里 60° 的一段（约 5 秒）
  const sunG=new THREE.Group();scene.add(sunG);
  const sun=new THREE.Mesh(new THREE.SphereGeometry(4,20,14),new THREE.MeshBasicMaterial({color:'#fff3c4',fog:false}));sunG.add(sun);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,240,190,1)');gr.addColorStop(.4,'rgba(255,225,150,.4)');gr.addColorStop(1,'rgba(255,225,150,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})(),transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));halo.scale.setScalar(26);sunG.add(halo);
  const sunAngle=t=>((t/DAY)%1)*Math.PI*2;// 0 = 正东升起
  const DRAGON_AT=Math.PI*.5;// 龙的时辰：太阳走到正南最高处那一段（"午"）
  const inWindow=a=>{let d=a-DRAGON_AT;d=Math.atan2(Math.sin(d),Math.cos(d));return Math.abs(d)<WIN/2;};
  const toWindow=a=>{let d=DRAGON_AT-WIN/2-a;while(d<0)d+=Math.PI*2;return d/(Math.PI*2)*DAY;};// 离下一次时辰还有几秒
  const sundial=document.getElementById('sundial'),sdc=sundial&&sundial.getContext('2d');
  function drawSundial(a){if(!sdc)return;const W=sundial.width,c=W/2,R=W*.42;sdc.clearRect(0,0,W,W);
    sdc.fillStyle='rgba(255,252,244,.88)';sdc.beginPath();sdc.arc(c,c,R+W*.06,0,Math.PI*2);sdc.fill();
    sdc.fillStyle=inWindow(a)?'#ffd36b':'#f6d98e';sdc.beginPath();sdc.moveTo(c,c);sdc.arc(c,c,R,-(DRAGON_AT+WIN/2),-(DRAGON_AT-WIN/2));sdc.closePath();sdc.fill();
    sdc.strokeStyle='#5b4a1e';sdc.lineWidth=W*.02;for(let k=0;k<12;k++){const b=k/12*Math.PI*2;sdc.beginPath();sdc.moveTo(c+Math.cos(b)*R*.82,c-Math.sin(b)*R*.82);sdc.lineTo(c+Math.cos(b)*R,c-Math.sin(b)*R);sdc.stroke();}
    sdc.fillStyle='#5b4a1e';sdc.font='bold '+Math.round(W*.2)+'px serif';sdc.textAlign='center';sdc.textBaseline='middle';sdc.fillText('龙',c+Math.cos(DRAGON_AT)*R*.55,c-Math.sin(DRAGON_AT)*R*.55);
    sdc.strokeStyle='#c8452f';sdc.lineWidth=W*.05;sdc.lineCap='round';sdc.beginPath();sdc.moveTo(c,c);sdc.lineTo(c+Math.cos(a)*R*.95,c-Math.sin(a)*R*.95);sdc.stroke();
    sdc.fillStyle='#ffb52e';sdc.beginPath();sdc.arc(c+Math.cos(a)*R*.95,c-Math.sin(a)*R*.95,W*.07,0,Math.PI*2);sdc.fill();}

  // ---------- 龙台（初九） ----------
  const altar=world.stone({x:0,z:5.6,r:1.6,top:.78,color:'#e8e0c8'});
  {const ring=world.markStatic(world.mesh(new THREE.TorusGeometry(1.3,.06,6,36),world.toon('#c9a54a'),0,.8,5.6));ring.rotation.x=Math.PI/2;}
  const altarMark=new THREE.Mesh(new THREE.CircleGeometry(1.2,36,Math.PI*.5-WIN/2,WIN),new THREE.MeshBasicMaterial({color:'#ffd36b',transparent:true,opacity:.75}));altarMark.rotation.x=-Math.PI/2;altarMark.position.set(0,.8,5.6);world.root.add(altarMark);// 龙台上画着龙的时辰
  const stele=kit.stele({x:-3.2,z:9.2,top:.6,lines:LINES,facing:.5});

  // ---------- 小龙 ----------
  const dragon=createDragon({world,envMap:ctx.envMap});scene.add(dragon.root);
  const DIVE=V(0,-2.6,6.8);// 潜在云海下
  dragon.place(DIVE.clone(),V(0,0,-1));
  // 骑行路线：贴着云海潜行（身子没在云里，只露出背），从龙台到云田
  const ride=new THREE.CatmullRomCurve3([V(0,-.25,5.4),V(1.6,-.3,0),V(2.4,-.3,-6),V(-.6,-.35,-11),V(0,-.15,-15.4)]);
  const RIDE_T=12;
  // 九二的三处唱和
  const SPOTS=[
    {name:'桥',at:V(0,2.2,-26.2),song:[0,2,3],say:'小龙唱了三个音。在编磬上照着敲一遍，它就会帮你。'},
    {name:'升',at:V(0,2.6,-44.4),song:[3,1,4],say:'这次的三个音不一样，仔细听。'},
    {name:'扫',at:V(-1.6,10.8,-50.2),song:[4,3,2,0],say:'最后一段，四个音。'},
  ];
  // 桥：龙身横在 T1 与 T2 之间；升：龙头当升降台，从 T2 托到 T3；扫：摆尾扫开云墙
  const bridgeCol=physics.add({kind:'box',x:0,z:-31.5,hw:.75,hd:5.2,top:1.5,bottom:.9,safe:true,disabled:true});
  const liftCol=physics.add({kind:'cyl',x:0,z:-44.5,r:1,top:1.75,bottom:1.2,safe:false,disabled:true});
  let liftY=1.75;
  // 云墙（挡在天门前）
  const wallCol=physics.add({kind:'box',x:0,z:-53,hw:5.2,hd:.5,top:16,bottom:8,safe:false});
  const wallPuffs=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshToonMaterial({color:'#ffffff',transparent:true,opacity:.96}),16);
  {const dm=new THREE.Object3D();for(let i=0;i<16;i++){dm.position.set(-4.6+(i%8)*1.3+(rng()-.5)*.4,10.3+Math.floor(i/8)*1.6,-53+(rng()-.5)*.5);dm.scale.setScalar(1+rng()*.5);dm.updateMatrix();wallPuffs.setMatrixAt(i,dm.matrix);}wallPuffs.frustumCulled=false;world.root.add(wallPuffs);}
  let wallFade=1;

  // ---------- 放牛老人（"大人"）和牛 ----------
  {const g=new THREE.Group();g.position.set(-3.2,1.2,-19);g.rotation.y=.9;world.root.add(g);const mk=(geo,color,x,y,z,s=[1,1,1])=>{const m=world.markStatic(world.mesh(geo,world.toon(color),x,y,z,g));m.scale.set(...s);return m;};
    mk(new THREE.CylinderGeometry(.22,.34,.8,10),'#8a6d4e',0,.4,0);mk(new THREE.SphereGeometry(.2,14,10),'#f1d2b0',0,.95,0);mk(new THREE.ConeGeometry(.42,.22,14),'#d9b56a',0,1.15,0);// 身子、头、斗笠
    mk(new THREE.SphereGeometry(.14,10,8),'#ffffff',0,.82,.12,[1,1.2,.7]);// 白胡子
    mk(new THREE.CylinderGeometry(.025,.025,1.3,6),'#7a5a3a',.35,.6,.1);// 牧杖
    // 牛：趴着
    mk(new THREE.SphereGeometry(.6,16,12),'#c99a6e',1.6,.45,.4,[1.5,.75,.9]);mk(new THREE.SphereGeometry(.32,14,10),'#c99a6e',2.55,.6,.45,[1,.9,.9]);mk(new THREE.SphereGeometry(.16,10,8),'#f0d7c0',2.82,.52,.45);
    for(const s of [-1,1])mk(new THREE.ConeGeometry(.06,.25,8),'#efe3c8',2.5,.92,.45+s*.22,[1,1,1]);}
  physics.add({kind:'cyl',x:-3.2,z:-19,r:.5,top:2.4,bottom:0,safe:false});physics.add({kind:'cyl',x:-2.2,z:-17.7,r:1.1,top:2,bottom:0,safe:false});

  // ---------- 爻玉 ----------
  const pillar=world.stone({x:-3.4,z:8.2,r:.9,top:2.2,h:2.2,color:ROCK});
  const gems=[kit.gem({x:-3.4,y:3.1,z:8.2,id:'pillar'}),kit.gem({x:2.4,y:1.05,z:-6,id:'ride'}),kit.gem({x:-4.4,y:2.1,z:-23.4,id:'field'}),
    kit.gem({x:8.4,y:2.7,z:-21,id:'side'}),kit.gem({x:0,y:2.3,z:-31.5,id:'bridge'}),kit.gem({x:3.4,y:10.5,z:-49.2,id:'high'})];
  const gate=kit.gate({x:0,z:-55,top:9.6,lines:LINES});

  // ---------- 状态 ----------
  let phase='start',rideT=0,surfaceT=0,missedSaid=-99,hasChime=false,spot=0,song=null,input=[],singT=0,act=null,actT=0,said=new Set(),notes=[];
  const P=()=>ctx.player;
  const near=(p,v,r,dy=1.8)=>Math.hypot(p.x-v.x,p.z-v.z)<r&&Math.abs(p.y-v.y)<dy;
  // 唱出来的音：在龙头上方飘一个字
  const noteSprites=NOTE_NAMES.map((n,i)=>{const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d');g.fillStyle=['#ff9a7a','#ffd36b','#9fe0a8','#8fc8ff','#d5a6ff'][i];g.beginPath();g.arc(48,48,42,0,Math.PI*2);g.fill();g.fillStyle='#3a2a1a';g.font='bold 52px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(n,48,52);return new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false});});
  function floatNote(i,from){const s=new THREE.Sprite(noteSprites[i]);s.scale.setScalar(.8);s.position.copy(from);scene.add(s);notes.push({s,t:0});}
  function sing(){if(!song)return;singT=0;input=[];song.sang=0;}
  function startSpot(k){spot=k;song={notes:SPOTS[k].song,sang:-1};const s=SPOTS[k];dragon.pose=null;flyTo=s.at.clone();}
  let flyTo=null;
  function chime(i){// 玩家敲编磬
    if(!hasChime||!song||song.sang>=0&&song.sang<song.notes.length)return;sfx.note(i,'bell');
    const pp=P();floatNote(i,V(pp.x,pp.y+1.7,pp.z));input.push(i);const k=input.length-1;
    if(input[k]!==song.notes[k]){input=[];dragon.shake();sfx.fall();toast('小龙摇摇头：不对。它再唱一遍，仔细听。',2600);singAgainT=1.4;return;}
    if(input.length===song.notes.length){song=null;input=[];act=SPOTS[spot].name;actT=0;sfx.solve();ctx.unlock('tongsheng');
      toast({桥:'同声相应——小龙听懂了，盘成一座桥！',升:'小龙低下头：站上去，它托你上去。',扫:'小龙一摆尾巴，扫开了云墙！'}[act],3800);}}
  let singAgainT=-1;

  const level={
    id:'qian',index:4,lines:LINES,title:'第五境 · 乾（试玩）',subtitle:'时乘六龙以御天',forms:false,
    spawn:{x:0,y:.6,z:12.6,yaw:0},killY:-4,camYaw:0,timeLimit:600,gems,gate,dragon,
    get solved(){return phase==='done';},get phase(){return phase;},get hasChime(){return hasChime;},get spot(){return spot;},get song(){return song;},get act(){return act;},
    get sunIn(){return inWindow(sunAngle(ctx.time()));},chime,
    // 编磬面板：拿到编磬、在唱和的地方、龙唱完了才显示
    get chimeOn(){return hasChime&&!!song&&song.sang>=song.notes.length&&near(P(),SPOTS[spot].at,6,4);},
    noFallLabel:'不掉进云海',
    get interactables(){const list=[{pos:stele.pos,label:'读石碑',act:()=>ctx.openLore('qian')}];
      if(!hasChime)list.push({pos:V(-3.2,1.2,-19),label:'拜见放牛老人',act:()=>{hasChime=true;startSpot(0);sfx.gate();toast('老人："见龙在田，利见大人。龙听得懂五音——它唱什么，你就在这编磬上敲什么。"（得到编磬）',7000);}});
      else if(song&&song.sang>=song.notes.length&&near(P(),SPOTS[spot].at,6,4))list.push({pos:P().clone?P().clone():V(P().x,P().y,P().z),label:'请小龙再唱一遍',act:()=>sing(),far:true});
      return list;},
    onFall(){toast('掉进云海了……回到刚才站稳的地方。',3000);},
    objective(){const got=gems.filter(g=>g.taken).length;const left=Math.ceil(toWindow(sunAngle(ctx.time())));
      if(phase==='start')return inWindow(sunAngle(ctx.time()))?'初九 · 潜龙勿用：龙的时辰到了！快站上龙台。':'初九 · 潜龙勿用：站上龙台，等太阳走到右上角日晷的「龙」字（还有 '+left+' 秒）。';
      if(phase==='ride')return '初九 · 潜龙勿用：坐稳了，小龙驮着你在云海里潜行。';
      if(!hasChime)return '九二 · 见龙在田，利见大人：去拜见田边的放牛老人。';
      if(phase==='field'){const s=SPOTS[spot];if(act)return '小龙照做了——跟上它。';return song&&song.sang>=song.notes.length?'同声相应：在下方编磬上敲出小龙唱的 '+song.notes.length+' 个音（'+song.notes.map(n=>'？').join(' ')+'）。听不清可以按 E 请它再唱。':'走到小龙身边，听它唱。';}
      if(got<3)return '云墙散了。再收集 '+(3-got)+' 枚爻玉（已得 '+got+'/6），卦门才会亮起。';
      return '走进卦门。（试玩到这里结束，后面的四爻正在做）';},
    update(dt,t,p){
      gate.update(dt,t);
      const a=sunAngle(t);
      // ----- 初九：等时辰 -----
      if(phase==='start'){
        const onAltar=p.grounded&&near(p,V(0,.78,5.6),1.5,.6);
        if(inWindow(a)){surfaceT=Math.min(1,surfaceT+dt*1.2);if(onAltar&&surfaceT>.85){phase='ride';rideT=0;p.locked=true;sfx.splash();burst(V(0,.4,5),{color:'#ffffff',n:22,speed:3,up:3});toast('初九 · 潜龙勿用。小龙从云海里浮上来，驮着你潜行——坐稳，别乱动。',5200);}}
        else{if(surfaceT>.5&&!onAltar&&t-missedSaid>8){missedSaid=t;toast('错过龙的时辰了，小龙又潜回云海。等太阳再转一圈。',3600);}surfaceT=Math.max(0,surfaceT-dt*.8);}
        const sp=V(0,-2.6+surfaceT*2.5,6.6);dragon.headPos.lerp(sp,Math.min(1,dt*4));dragon.headDir.set(Math.sin(t*.7)*.4,surfaceT*.6,-1).normalize();
        if(!said.has('start')&&t>1.2){said.add('start');toast('初九 · 潜龙勿用。云海里潜着一条小龙，它只在自己的时辰出来——看右上角的日晷。',6500);}}
      // ----- 骑龙潜行 -----
      else if(phase==='ride'){rideT+=dt;const k=Math.min(1,rideT/RIDE_T),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;const hp=ride.getPointAt(Math.min(1,e+.06));const tg=ride.getTangentAt(Math.min(.999,e+.06));
        dragon.headPos.copy(hp);dragon.headPos.y+=Math.sin(rideT*2)*.06;dragon.headDir.copy(tg);
        const s=dragon.saddle();p.x=s.x;p.y=s.y;p.z=s.z;p.yaw=Math.atan2(tg.x,tg.z);p.vx=tg.x*3;p.vz=tg.z*3;p.vy=0;
        if(k>=1){phase='field';p.locked=false;p.vx=p.vz=0;ctrl_place(p,0,1.25,-16.6);sfx.bounce();toast('九二 · 见龙在田，利见大人。小龙落在云田里——去拜见田边的放牛老人。',6000);flyTo=V(1.8,2.3,-18.2);}}
      // ----- 九二：唱和 -----
      else if(phase==='field'){
        if(flyTo&&!act){dragon.headPos.lerp(flyTo,Math.min(1,dt*1.6));const d=V().subVectors(flyTo,dragon.headPos);if(d.length()>.2)dragon.headDir.lerp(d.normalize(),Math.min(1,dt*3));dragon.headPos.y+=Math.sin(t*1.8)*.004;}
        if(song&&song.sang<0&&near(p,SPOTS[spot].at,5,4)){if(!said.has('s'+spot)){said.add('s'+spot);toast(SPOTS[spot].say,3600);}sing();}
        if(song&&song.sang>=0&&song.sang<song.notes.length){singT+=dt;const i=Math.floor(singT/.62);if(i>song.sang&&i<=song.notes.length){const n=song.notes[i-1];sfx.note(n,'flute');floatNote(n,dragon.headPos.clone().add(V(0,.9,0)));song.sang=i;}}
        if(singAgainT>0){singAgainT-=dt;if(singAgainT<=0)sing();}
        // 小龙照做
        if(act==='桥'){actT+=dt;if(!dragon.pose){const pts=[];for(let i=0;i<=dragon.N;i++)pts.push(V(Math.sin(i*.9)*.12,1.15+Math.sin(i/dragon.N*Math.PI)*.15,-26.4-i*(10.2/dragon.N)));dragon.pose=pts;}
          if(actT>1.2&&bridgeCol.disabled){bridgeCol.disabled=false;}
          if(p.z<-36.6&&p.grounded&&actT>2){act=null;dragon.pose=null;bridgeCol.disabled=true;startSpot(1);}}
        if(act==='升'){actT+=dt;if(!dragon.pose){const pts=[];for(let i=0;i<=dragon.N;i++){const a2=i*.7;pts.push(V(Math.cos(a2)*1.1,1.4-i*.05,-44.5+Math.sin(a2)*1.1));}dragon.pose=pts;liftCol.disabled=false;liftY=1.75;}
          const onLift=p.grounded&&p.ground===liftCol;
          if(onLift||liftY>1.8){const ny=Math.min(10.1,liftY+dt*2.2);liftCol.dy=ny-liftY;liftY=ny;}else liftCol.dy=0;
          liftCol.top=liftY;liftCol.bottom=liftY-.6;dragon.pose[0].set(0,liftY-.45,-44.5);for(let i=1;i<dragon.pose.length;i++){const a2=i*.7,yy=Math.max(1.3,liftY-.6-i*.55);dragon.pose[i].set(Math.cos(a2)*1.1,yy,-44.5+Math.sin(a2)*1.1);}
          if(p.y>9.4&&p.grounded&&p.ground!==liftCol){act=null;liftCol.disabled=true;liftCol.dy=0;dragon.pose=null;startSpot(2);}}
        if(act==='扫'){actT+=dt;if(!dragon.pose){const pts=[];for(let i=0;i<=dragon.N;i++)pts.push(V(-4.8+i*.62,11.2+Math.sin(i*.8)*.3,-52.4));dragon.pose=pts;dragon.poseK=1.6;}
          wallFade=Math.max(0,wallFade-dt*.6);if(wallFade<.4&&!wallCol.disabled){wallCol.disabled=true;}
          if(wallFade===0){act=null;dragon.pose=null;dragon.poseK=3;phase='done';flyTo=V(3.4,11.4,-47.4);toast('云墙散了，天门就在前面。',3600);}}
      }
      else if(phase==='done'){if(flyTo){dragon.headPos.lerp(flyTo,Math.min(1,dt*1.4));}if(gems.filter(g=>g.taken).length>=3&&!gate.active){gate.activate();sfx.gate();toast('卦门亮起来了！',2600);}}
    },
    frame(dt,t,p){
      const a=sunAngle(t);
      sunG.position.set(Math.cos(a)*90,40+Math.sin(a)*38,-30-Math.sin(a)*20);
      U.sun.value.copy(sunG.position).normalize();
      drawSundial(a);
      seaMat.uniforms.t.value=t;
      altarMark.material.opacity=inWindow(a)?.6+Math.sin(t*8)*.3:.45;
      dragon.update(dt,t);
      wallPuffs.material.opacity=.96*wallFade;wallPuffs.visible=wallFade>0;
      for(let i=notes.length-1;i>=0;i--){const n=notes[i];n.t+=dt;n.s.position.y+=dt*.8;n.s.material.opacity=1;n.s.scale.setScalar(.8*(1-Math.max(0,n.t-1.1)));if(n.t>1.8){scene.remove(n.s);notes.splice(i,1);}}
    },
    debugSolve(){phase='done';wallCol.disabled=true;wallFade=0;gems.slice(0,3).forEach(g=>{});},
    _sun:{DAY,inWindow,sunAngle,toWindow},_spots:SPOTS,_lift:()=>liftY,
  };
  function ctrl_place(p,x,y,z){p.x=x;p.y=y;p.z=z;p.vx=p.vy=p.vz=0;p.grounded=false;p.checkpoint={x,y,z};}
  return level;
}

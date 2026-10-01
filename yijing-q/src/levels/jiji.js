import * as THREE from '../../vendor/three.module.js';

// 第三境 · 水火既济（第六十三卦，坎上离下）。
// 下层火域、上层水域，中间是鼎山。把三块阳爻、三块阴爻搬上鼎山，放进初～上六个爻座：
// 初、三、五为阳位，二、四、上为阴位（当位）。六爻齐，"初吉终乱"——限时化解三处乱子后，卦门才开。
// 新机制：水火变身（F / 「变」）、搬运爻块、乱乱（小怪）、火墙、冰封、瀑布、蒸汽口、石灯。
export function buildJiji(ctx){
  const {world,kit,physics,toast,sfx,burst}=ctx;
  const LINES=[1,0,1,0,1,0];
  const POS=['初','二','三','四','五','上'];
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  world.skyUniforms.top.value.set('#9ec4ee');world.skyUniforms.mid.value.set('#ffe1c6');world.skyUniforms.bottom.value.set('#ffc69e');world.skyUniforms.sun.value.set(-.5,.35,-.8).normalize();world.skyUniforms.sunColor.value.set('#fff0c8');
  ctx.scene.fog=new THREE.Fog('#ffe1c6',50,170);
  world.farMountains('#d9b6a6',22,170);world.addClouds(16,'#fff6ee');
  world.water({y:-.65,deep:'#ff7a3a',shallow:'#ffc45a',foam:'#fff2c8'});// 下界是熔岩海（软萌版）

  const fireG='#f0c79a',fireE='#a8604a',waterG='#bfe6d8',waterE='#8fb5c9',bronze='#9a8a63';
  // ---------- 下层：火域 ----------
  const A=world.island({x:0,z:13.5,r:6,top:0,grass:fireG,earth:fireE,rock:'#7a5a52'});
  const H=world.island({x:0,z:-1,r:9,top:.3,grass:'#f3d2a6',earth:fireE,rock:'#7a5a52'});
  const E1=world.island({x:19,z:-1,r:5,top:.8,grass:fireG,earth:fireE,rock:'#7a5a52'});
  const W1=world.island({x:-19,z:-2,r:5,top:.8,grass:fireG,earth:fireE,rock:'#7a5a52'});
  const S2=world.island({x:14,z:13.5,r:4,top:.5,grass:fireG,earth:fireE,rock:'#7a5a52'});
  world.bridge({from:[8.6,-1],to:[14.3,-1],top:.55});world.bridge({from:[-8.6,-1.5],to:[-14.2,-2],top:.55});
  world.stone({x:7.4,z:13.5,r:.9,top:.3,color:'#e8c9a8'});world.stone({x:9.3,z:13.5,r:.9,top:.5,color:'#e8c9a8'});
  // 鼎山：青铜色台地 + 三足
  const D=world.island({x:0,z:-23,r:6,top:3,grass:'#c9b98c',earth:bronze,rock:'#6f6448',depth:5});
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2+.5;const leg=world.mesh(new THREE.CylinderGeometry(.9,1.3,6,10),world.toon('#7d6e4c'),Math.sin(a)*4,-2.5,-23+Math.cos(a)*4);leg.castShadow=false;}
  {const ring=world.mesh(new THREE.TorusGeometry(6.05,.18,8,48),world.toon('#b39a5c'),0,3,-23);ring.rotation.x=Math.PI/2;}
  [[0,-11.4,.9],[-.8,-13.6,1.6],[0,-15.8,2.3]].forEach(([x,z,top])=>world.stone({x,z,r:1,top,color:'#e3cfa7'}));
  // ---------- 上层：水域 ----------
  const U1=world.island({x:-6,z:-5,r:4,top:8,grass:waterG,earth:waterE,rock:'#7f9fb3'});
  const U2=world.island({x:6.5,z:-4,r:4,top:8.5,grass:waterG,earth:waterE,rock:'#7f9fb3'});
  world.box({x:.25,z:-4.5,w:5,d:1.6,top:8.25,color:'#e9f4f2'});// 云桥
  const U3=world.island({x:0,z:-37,r:5,top:9,grass:waterG,earth:waterE,rock:'#7f9fb3'});
  world.stone({x:0,z:-31,r:1.2,top:7.9,color:'#e9f4f2'});
  const secret=world.stone({x:5.8,z:-41.5,r:1.3,top:11,color:'#ffffff'});
  // 湖面（装饰）
  for(const [x,y,z,r] of [[-6.6,8.02,-6,1.6],[0,9.02,-38.5,2]]){const m=world.mesh(new THREE.CircleGeometry(r,32),new THREE.MeshToonMaterial({color:'#7fd0e6',transparent:true,opacity:.85}),x,y,z);m.rotation.x=-Math.PI/2;m.castShadow=false;}

  // ---------- 部件 ----------
  const anim=[];const flameMat=()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{t:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float t;varying vec2 vUv;void main(){float n=sin(vUv.x*18.+t*6.)*.08+sin(vUv.x*31.-t*9.)*.05;float h=vUv.y+n;float a=smoothstep(1.,.2,h)*smoothstep(0.,.08,vUv.y);vec3 c=mix(vec3(1.,.55,.15),vec3(1.,.92,.5),smoothstep(.6,0.,h));gl_FragColor=vec4(c,a*.9);}'});
  // 火墙：只有水态能穿过
  function firewall(x,z,{w=2.6,rot=0}={}){const col=physics.add({kind:'box',x,z,hw:.25,hd:w/2,rot,top:3.6,bottom:-1,pass:'water',noGround:true,safe:false});/* 二段跳也跳不过 */
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,2.4,1,1),flameMat());m.position.set(x,.55+1.2,z);m.rotation.y=Math.PI/2+rot;world.root.add(m);anim.push(t=>m.material.uniforms.t.value=t);return {col,mesh:m,pos:V(x,.5,z)};}
  // 冰：火态碰到即融化；里面锁着的爻块要等冰化了才能拿
  function ice(x,y,z,r=1.1){const col=physics.add({kind:'cyl',x,z,r,top:y+2.2,bottom:y-1,safe:false});
    const m=world.mesh(new THREE.IcosahedronGeometry(r*1.05,1),new THREE.MeshPhysicalMaterial({color:'#cdefff',roughness:.1,clearcoat:1,transparent:true,opacity:.62}),x,y+1,z);m.scale.y=1.15;
    const it={col,mesh:m,pos:V(x,y,z),r,melted:false,shrink:1};
    it.melt=()=>{if(it.melted)return;it.melted=true;physics.remove(col);sfx.toggle(true);burst(V(x,y+1,z),{color:'#e8f8ff',n:20,speed:2.5,up:3});};
    it.freeze=()=>{if(!it.melted)return;it.melted=false;physics.colliders.push(col);it.shrink=1;m.visible=true;m.scale.set(1,1.15,1);};
    anim.push((t,dt)=>{if(it.melted&&m.visible){it.shrink=Math.max(0,it.shrink-dt*2);m.scale.set(it.shrink,it.shrink*1.15,it.shrink);if(it.shrink===0)m.visible=false;}});return it;}
  // 瀑布：水态能逆流而上；火态碰到会被浇回原形
  function waterfall(x,z,bottom,top,exit){
    const m=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,top-bottom+1.2,24,1,true),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{t:{value:0},frozen:{value:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'uniform float t;uniform float frozen;varying vec2 vUv;void main(){float s=fract(vUv.y*6.+t*mix(1.6,0.,frozen)+sin(vUv.x*25.)*.1);vec3 c=mix(vec3(.45,.78,.95),vec3(.92,.98,1.),smoothstep(.75,1.,s));c=mix(c,vec3(.85,.95,1.),frozen*.6);gl_FragColor=vec4(c,.62+frozen*.25);}'}));
    m.position.set(x,(top+bottom)/2+.6,z);world.root.add(m);
    const it={pos:V(x,bottom,z),top,bottom,exit,frozen:false,mesh:m};anim.push(t=>{m.material.uniforms.t.value=t;m.material.uniforms.frozen.value+=((it.frozen?1:0)-m.material.uniforms.frozen.value)*.05;});return it;}
  // 蒸汽口：每 3 秒喷 1.5 秒，喷的时候踩上去会被弹到高处
  function vent(x,z,top){const s=world.stone({x,z,r:.9,top,color:'#8b7d72',safe:false});const it={col:s.col,pos:V(x,top,z),on:false};return it;}
  // 爻块：阳爻一整条（重，走得慢、不能二段跳），阴爻两段（轻一些）
  function block(yang,x,y,z){
    const g=new THREE.Group();world.root.add(g);const mat=new THREE.MeshToonMaterial({color:yang?'#ffcf6e':'#7fd1c2',emissive:yang?'#7a4b00':'#0f5a50',emissiveIntensity:.35});
    if(yang){const b=new THREE.Mesh(new THREE.BoxGeometry(1.1,.3,.46),mat);b.castShadow=true;g.add(b);}
    else for(const sx of [-1,1]){const b=new THREE.Mesh(new THREE.BoxGeometry(.46,.3,.46),mat);b.position.x=sx*.32;b.castShadow=true;g.add(b);}
    const halo=new THREE.Mesh(new THREE.RingGeometry(.75,.85,28),new THREE.MeshBasicMaterial({color:yang?'#ffe9b0':'#c8fff2',transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));halo.rotation.x=-Math.PI/2;halo.position.y=-.14;g.add(halo);
    const it={yang,group:g,home:V(x,y,z),pos:V(x,y,z),held:false,slot:-1,lock:null,halo};g.position.copy(it.pos).y+=.15;return it;}
  // 小怪"乱乱"：火灵怕水态，水泡怕火态；从上面踩也能踩扁
  function luanluan(type,hx,hz,hr){
    const g=new THREE.Group();world.root.add(g);const fire=type==='fire';
    const bodyM=fire?new THREE.MeshBasicMaterial({color:'#ff8a3d'}):new THREE.MeshPhysicalMaterial({color:'#9fd9ff',roughness:.05,clearcoat:1,transparent:true,opacity:.75});
    const b=new THREE.Mesh(new THREE.SphereGeometry(.36,18,14),bodyM);b.position.y=.36;b.castShadow=true;g.add(b);
    if(fire){const tip=new THREE.Mesh(new THREE.ConeGeometry(.25,.5,12),new THREE.MeshBasicMaterial({color:'#ffd36b'}));tip.position.y=.82;g.add(tip);}
    else{const sh=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:'#ffffff'}));sh.position.set(.14,.55,.24);g.add(sh);}
    const eyeM=new THREE.MeshBasicMaterial({color:'#2a1a1a'});for(const s of [-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),eyeM);e.position.set(s*.12,.42,.31);e.scale.y=1.3;g.add(e);const brow=new THREE.Mesh(new THREE.BoxGeometry(.11,.025,.02),eyeM);brow.position.set(s*.12,.53,.32);brow.rotation.z=s*.35;g.add(brow);}
    const hy=(physics.groundAt(hx,hz,60).h)||0;// 出生在所在岛的地面上
    const it={type,group:g,pos:V(hx,hy,hz),home:V(hx,hy,hz),hr,alive:true,respawn:0,ang:Math.random()*6,hitCD:0,phase:Math.random()*6};
    it.kill=()=>{it.alive=false;it.respawn=it.noRespawn?Infinity:18;g.visible=false;burst(it.pos.clone().setY(it.pos.y+.5),{color:fire?'#ffd6a8':'#e8f6ff',n:16,speed:2.4,up:2.5});sfx.bounce();};
    return it;}
  // 爻座：鼎山上环形的六级台，自下而上为初～上
  const slots=POS.map((name,k)=>{const a=k*Math.PI/3,x=Math.sin(a)*3.3,z=-23+Math.cos(a)*3.3,top=3.6+k*.7;
    const g=new THREE.Group();g.position.set(x,top,z);world.root.add(g);
    world.mesh(new THREE.CylinderGeometry(1.15,1.25,top-2.5,20),world.toon('#d9ccaa'),0,-(top-2.5)/2,0,g);/* 台面放大，搬着重爻块也跳得过去 */
    const ring=world.mesh(new THREE.TorusGeometry(.85,.06,6,24),world.toon('#8c7a4a'),0,.02,0,g);ring.rotation.x=Math.PI/2;
    const col=physics.add({kind:'cyl',x,z,r:1.15,top,bottom:2,safe:true});
    kit.label(name,{x:x*1.28,y:top+1.1,z:-23+(z+23)*1.28,size:.6,color:'#5b4a1e'});
    return {k,name,yang:k%2===0,pos:V(x,top,z),col,block:null,ring};});

  // ---------- 布置 ----------
  const walls=[firewall(11.4,-1)];
  const iceW=ice(-19.5,.8,-2.5);
  const fall=waterfall(-6,.6,.3,8.4,V(0,0,-1));
  const steam=vent(0,-28.2,3.05);
  const blocks=[
    block(true,19.5,.8,-1.5),   // 阳① 东岛，火墙后
    block(false,-19.5,.8,-2.5), // 阴① 西岛，冰里
    block(false,14.8,.5,14.2),  // 阴② 东南岛，火灵守着
    block(true,-7,8,-6.5),      // 阳② 上层水域（走瀑布上去）
    block(false,7.6,8.5,-3),    // 阴② 上层石龛（点亮两盏石灯开龛）
    block(true,-1,9,-38.5),     // 阳③ 北方高岛（蒸汽口弹上去），水泡守着
  ];
  blocks[1].lock=iceW;
  // 石龛：两盏石灯都点亮后，罩着阴爻块的石莲花才打开
  const lamps=[kit.brazier({x:4.6,z:-6.4,top:8.5,lit:false}),kit.brazier({x:9.6,z:-5,top:8.5,lit:false})];
  const shell={col:physics.add({kind:'cyl',x:7.6,z:-3,r:1,top:10.6,bottom:7,safe:false}),open:false,t:0};
  const shellMesh=new THREE.Group();shellMesh.position.set(7.6,8.5,-3);world.root.add(shellMesh);
  for(let i=0;i<6;i++){const p=world.mesh(new THREE.SphereGeometry(.7,12,8,0,Math.PI*2,0,Math.PI/2),world.toon('#d8d2c4'),0,0,0,shellMesh);p.rotation.set(-.35,i/6*Math.PI*2,0,'YXZ');p.position.set(Math.sin(i/6*Math.PI*2)*.25,.2,Math.cos(i/6*Math.PI*2)*.25);p.scale.set(.7,1.6,.5);}
  blocks[4].lock=shell;

  const enemies=[luanluan('fire',14,13.5,3.2),luanluan('fire',14,13.5,3.2),luanluan('fire',-18.4,.6,2.6),luanluan('water',0,-37,4.2),luanluan('water',0,-37,4.2)];
  enemies.forEach((e,i)=>{e.ang=i*2.1;});

  // 石碑与秘密祭坛
  const stele=kit.stele({x:3.3,z:14.5,top:0,lines:LINES,facing:-.5});
  const altar=new THREE.Group();altar.position.set(5.8,11,-41.5);world.root.add(altar);
  world.mesh(new THREE.CylinderGeometry(.5,.6,.5,12),world.toon('#e9e4d4'),0,.25,0,altar);
  const hexSign=new THREE.Group();hexSign.position.y=1.2;altar.add(hexSign);
  function drawHex(lines){hexSign.clear();lines.forEach((y,i)=>{const b=kit.yaoBar(y,{w:.7,h:.08,d:.05,color:'#5b4a1e'});b.position.y=-.32+i*.13;hexSign.add(b);});}
  drawHex(LINES);let flipped=false;

  // 爻玉
  world.stone({x:-3.6,z:15.2,r:.75,top:2.1,color:'#e3cfa7',h:2.2});
  const gems=[
    kit.gem({x:-3.6,y:3.3,z:15.2,id:'pillar'}),
    kit.gem({x:20.6,y:2,z:.4,id:'east'}),
    kit.gem({x:13.4,y:1.7,z:15.6,id:'southeast'}),
    kit.gem({x:-5.2,y:9.2,z:-3.6,id:'upper'}),
    kit.gem({x:5.4,y:9.7,z:-2.4,id:'shrine'}),
    kit.gem({x:5.8,y:12.2,z:-41.5,id:'secret'}),
  ];
  const gate=kit.gate({x:0,z:-23,top:3,lines:LINES});

  // 装饰
  world.meadow([A,H,E1,W1,S2].map(i=>({x:i.col.x,z:i.col.z,r:i.r,top:i.top})),700,['#e3c08a','#d8b47e'],['#ff9b7a','#ffd36b','#fff3e0']);
  world.meadow([U1,U2,U3].map(i=>({x:i.col.x,z:i.col.z,r:i.r,top:i.top})),260,['#9fd6c2','#b8e6d4'],['#ffffff','#cfe9ff','#ffd8e4']);
  world.roundTree(-4.3,0,10.6,1,'#e98a5a');world.roundTree(4.6,0,10.2,.9,'#f0a463');world.rock(2.4,0,16.8,.7,'#9a7a6a');
  [[-2.5,-8],[2.5,-8],[-6.4,4.4],[6.4,4.4]].forEach(([x,z])=>world.lantern(x,.3,z,'#ffb35c'));
  world.roundTree(21.6,.8,-3.4,.9,'#e98a5a');world.rock(17.2,.8,1.8,.8,'#9a7a6a');world.roundTree(-21,.8,.4,.9,'#f0a463');world.roundTree(16.2,.5,11.2,.7,'#e98a5a');
  world.pine(-7.6,8,-3.4,.8,'#5f9f8f');world.bamboo(8.6,8.5,-1.6,4,'#7cc0a4');world.pine(3.4,9,-40,.9,'#5f9f8f');world.bamboo(-3.4,9,-35,4,'#7cc0a4');

  // ---------- 状态 ----------
  let held=null,phase='build',luanT=0,hazards=null,last=null,hintAt=0,ventOn=false,luanDelay=-1;
  const LUAN_TIME=ctx.challenge?60:90;
  const near=(p,v,r,dy=1.6)=>Math.hypot(p.x-v.x,p.z-v.z)<r&&Math.abs(p.y-v.y)<dy;
  function setHeld(b){held=b;const P=ctx.player;if(P){P.speedMul=b?(b.yang?.72:.9):1;P.noDouble=!!(b&&b.yang);}}
  function drop(p,reset=false){if(!held)return;const b=held;setHeld(null);b.held=false;if(reset){b.pos.copy(b.home);}else{const g=physics.groundAt(p.x,p.z,p.y+.1);b.pos.set(p.x,g.col?g.h:p.y,p.z);}b.group.position.copy(b.pos).y+=.15;}
  function placed(){return slots.filter(s=>s.block).length;}
  function tryPlace(slot){
    const b=held;ctx.unlock('dangwei');
    if(slot.block){toast('「'+slot.name+'」位已经放好了。');return;}
    if(b.yang!==slot.yang){sfx.fall();toast('此爻不当位：「'+slot.name+'」是'+(slot.yang?'阳位，要放阳爻（一整条）':'阴位，要放阴爻（断成两段）')+'。');return;}
    setHeld(null);b.held=false;b.slot=slot.k;slot.block=b;b.pos.copy(slot.pos);b.group.position.copy(slot.pos).y+=.17;b.halo.visible=false;
    slot.col.top+=.32;sfx.toggle(b.yang);burst(slot.pos.clone().setY(slot.pos.y+.4),{color:b.yang?'#ffe39a':'#c8fff2',n:16,speed:2});
    const n=placed();toast(n<6?'「'+slot.name+'」位当位！已放 '+n+' / 6。':'六爻当位——水在火上，既济初成！');
    if(n===6){sfx.solve();luanDelay=1.8;}
  }
  // 终乱：三处乱子，限时化解
  function startLuan(){
    if(phase!=='build')return;phase='luan';luanT=LUAN_TIME;sfx.playTheme('luan');sfx.setLayer(3);
    const fireH={id:'fire',name:'鼎足起火',pos:V(4.5,.3,-6.5),need:'water',done:false};
    const fg=new THREE.Group();fg.position.copy(fireH.pos);world.root.add(fg);
    const fm=new THREE.Mesh(new THREE.ConeGeometry(1,2.4,14,1,true),flameMat());fm.position.y=1.2;fg.add(fm);fireH.mesh=fg;anim.push(t=>fm.material.uniforms.t.value=t);
    const iceH={id:'ice',name:'瀑布冻住了',pos:V(-6,.3,.6),need:'fire',done:false};fall.frozen=true;
    const lu=[luanluan('fire',0,-23,1.4),luanluan('water',0,-23,1.4),luanluan('fire',0,-23,1.4)];lu.forEach((e,i)=>{e.noRespawn=true;e.ang=i*2.1;e.pos.set(Math.sin(i*2.1),3,-23+Math.cos(i*2.1));});/* 出生在卦门两柱之间的空地上 */enemies.push(...lu);
    hazards={list:[fireH,iceH,{id:'luan',name:'鼎山上的三个乱乱',done:false,enemies:lu}],reset(){fireH.done=false;fg.visible=true;iceH.done=false;fall.frozen=true;lu.forEach(e=>{e.alive=true;e.group.visible=true;e.pos.set(e.home.x+Math.sin(e.ang),3,e.home.z+Math.cos(e.ang));});this.list[2].done=false;}};
    toast('初吉终乱！鼎足起火、瀑布结冰、乱乱闯上鼎山——'+LUAN_TIME+' 秒内化解！',5200);
  }
  function luanUpdate(dt,p){
    const [fireH,iceH,lu]=hazards.list,form=ctx.getForm();
    if(!fireH.done&&near(p,fireH.pos,1.7,2)){if(form==='water'){fireH.done=true;fireH.mesh.visible=false;sfx.splash();burst(fireH.pos.clone().setY(1),{color:'#ffffff',n:24,speed:3,up:3});toast('水态扑灭了鼎足的火。');}else if(hintAt<luanT-3){hintAt=luanT;toast('这团火要用水态（F）去扑灭。');}}
    if(!iceH.done&&near(p,iceH.pos,1.9,2.4)){if(form==='fire'){iceH.done=true;fall.frozen=false;sfx.toggle(true);burst(iceH.pos.clone().setY(1.5),{color:'#e8f8ff',n:24,speed:3,up:3});toast('火态融开了冻住的瀑布。');}else if(hintAt<luanT-3){hintAt=luanT;toast('冻住的瀑布要用火态（F）融化。');}}
    if(!lu.done&&lu.enemies.every(e=>!e.alive)){lu.done=true;toast('鼎山上的乱乱都收拾好了。');}
    luanT-=dt;
    if(hazards.list.every(h=>h.done)){phase='done';sfx.solve();sfx.playTheme('jiji');sfx.setLayer(3);ctx.unlock('jiji');toast('思患而豫防之——乱子已平，既济乃成！',5000);}
    else if(luanT<=0){luanT=LUAN_TIME;hazards.reset();sfx.fall();toast('时间到，乱子又起来了——再来一次！',4200);}
  }

  const level={
    id:'jiji',index:2,lines:LINES,title:'第三境 · 既济',subtitle:'水在火上，既济',forms:true,
    spawn:{x:0,y:0,z:15.5,yaw:0},killY:-1.4,camYaw:0,timeLimit:600,gems,gate,blocks,slots,enemies,
    get solved(){return phase==='done';},get phase(){return phase;},get held(){return held;},get luanLeft(){return luanT;},get hazards(){return hazards;},
    get interactables(){
      const list=[{pos:stele.pos,label:'读石碑',act:()=>ctx.openLore('jiji')}];
      if(held){for(const s of slots)if(!s.block)list.push({pos:s.pos,label:'放进「'+s.name+'」位',act:()=>tryPlace(s)});list.push({pos:ctx.player?V(ctx.player.x,ctx.player.y,ctx.player.z):V(),label:'放下爻块',act:()=>drop(ctx.player),far:true});}
      else for(const b of blocks)if(!b.held&&b.slot<0)list.push({pos:b.pos,label:b.lock&&!b.lock.melted&&!b.lock.open?(b.lock===shell?'石莲花关着（点亮两盏石灯）':'被冰封着（用火态融化）'):'拿起'+(b.yang?'阳爻块':'阴爻块'),act:()=>{if(b.lock&&!(b.lock.melted||b.lock.open)){toast(b.lock===shell?'石莲花闭着：先用火态点亮旁边两盏石灯。':'冰封着：变成火态（F）碰一碰就化了。');return;}setHeld(b);b.held=true;sfx.pickup();toast(b.yang?'拿起阳爻块（重：走得慢，不能二段跳）':'拿起阴爻块');}});
      list.push({pos:V(5.8,11,-41.5),label:flipped?'未济':'翻转祭坛上的卦',act:()=>{if(flipped)return;flipped=true;drawHex([0,1,0,1,0,1]);ctx.unlock('weiji');sfx.gate();toast('卦翻过来，火在水上——未济。"物不可穷也，故受之以未济终焉。"',6000);}});
      return list;
    },
    onLand(col){last=col;},
    onFall(){if(held){drop(ctx.player,true);toast('爻块掉下去了，已回到原处。');}},
    objective(){
      const got=gems.filter(g=>g.taken).length,n=placed(),f={normal:'原形',water:'水态',fire:'火态'}[ctx.getForm()];
      if(phase==='build')return '把阳爻块、阴爻块搬上鼎山，放进当位的爻座（已放 '+n+' / 6）。按 F 变身，现在：'+f+(held?'；手里：'+(held.yang?'阳爻块':'阴爻块'):'')+'。';
      if(phase==='luan'){const left=hazards.list.filter(h=>!h.done).map(h=>h.name).join('、');return '初吉终乱！还剩 '+Math.ceil(luanT)+' 秒：'+left+'。现在：'+f+'。';}
      if(got<3)return '既济已成。再收集 '+(3-got)+' 枚爻玉（已得 '+got+'/6），卦门才会亮起。';
      return '卦门已亮，走进鼎山中央的卦门。';
    },
    update(dt,t,p){
      const form=ctx.getForm();
      anim.forEach(f=>f(t,dt));gate.update(dt,t);lamps.forEach(l=>l.update(dt,t));
      // 拿着的爻块跟在头顶
      if(held){held.pos.set(p.x,p.y+1.15,p.z);held.group.position.copy(held.pos);held.group.rotation.y=p.yaw;}
      for(const b of blocks)if(!b.held&&b.slot<0){b.group.position.y=b.pos.y+.15+Math.sin(t*2+b.home.x)*.05;b.halo.material.opacity=.35+Math.sin(t*3)*.15;}
      // 火墙：水态穿过时冒蒸汽
      for(const w of walls)if(form==='water'&&near(p,w.pos,.8,2.5)&&Math.random()<dt*20)burst(V(p.x,p.y+.6,p.z),{color:'#ffffff',n:2,speed:1,up:2,life:.5});
      // 冰：火态碰到就化
      if(!iceW.melted&&form==='fire'&&near(p,iceW.pos,iceW.r+.8,2.4)){iceW.melt();toast('冰化了，阴爻块可以拿了。');}
      // 石灯：火态碰到就点亮；两盏都亮，石莲花打开
      for(const l of lamps)if(!l.lit&&form==='fire'&&near(p,l.pos,1.5,1.8)){l.set(true);sfx.toggle(true);burst(l.pos.clone().setY(l.pos.y+1.2),{color:'#ffb347',n:14,up:3});toast(lamps.every(x=>x.lit)?'两盏石灯都亮了，石莲花开了！':'点亮一盏石灯，还有一盏。');}
      if(!shell.open&&lamps.every(l=>l.lit)){shell.open=true;physics.remove(shell.col);}
      if(shell.open&&shell.t<1){shell.t=Math.min(1,shell.t+dt*.8);shellMesh.children.forEach((c,i)=>{c.rotation.x=-.35-shell.t*1.1;});shellMesh.scale.y=1-shell.t*.5;}
      // 瀑布：水态逆流而上；火态被浇回原形
      if(Math.hypot(p.x-fall.pos.x,p.z-fall.pos.z)<1.15&&p.y>fall.bottom-.4&&p.y<fall.top+.5){
        if(form==='water'&&!fall.frozen){if(p.y>fall.top-.35){p.vy=5;p.vx=fall.exit.x*4.2;p.vz=fall.exit.z*4.2;p.stun=.3;p.grounded=false;}else{p.vy=Math.max(p.vy,6.5);p.grounded=false;if(Math.random()<dt*10)burst(V(p.x,p.y,p.z),{color:'#dff4ff',n:2,speed:1,up:1,life:.4});}}
        else if(form==='fire'&&!fall.frozen){ctx.setForm('normal');sfx.splash();burst(V(p.x,p.y+.6,p.z),{color:'#ffffff',n:18,speed:2.5,up:2.5});const dx=p.x-fall.pos.x,dz=p.z-fall.pos.z,l=Math.hypot(dx,dz)||1;p.vx=dx/l*6;p.vz=dz/l*6;p.vy=4;p.stun=.3;p.grounded=false;toast('呲——火态被瀑布浇回了原形。');}
      }
      // 蒸汽口
      const on=(t%3)<1.5;if(on!==ventOn){ventOn=on;steam.col.bounce=on?16:0;}
      if(on&&Math.random()<dt*14)burst(steam.pos.clone().setY(steam.pos.y+.2),{color:'#ffffff',n:2,speed:.6,up:5,life:.8,gravity:-1,size:.5});
      if(on&&p.grounded&&p.ground===steam.col){p.vy=16;p.grounded=false;p.jumps=1;sfx.bounce();}
      // 乱乱
      for(const e of enemies){
        if(!e.alive){e.respawn-=dt;if(e.respawn<=0){e.alive=true;e.group.visible=true;e.pos.set(e.home.x,e.home.y,e.home.z);}continue;}
        e.hitCD=Math.max(0,e.hitCD-dt);
        const g=physics.groundAt(e.pos.x,e.pos.z,e.pos.y+3);const gy=g.col?g.h:e.pos.y;
        const dx=p.x-e.pos.x,dz=p.z-e.pos.z,d=Math.hypot(dx,dz),chase=d<4.5&&Math.abs(p.y-gy)<2&&Math.hypot(p.x-e.home.x,p.z-e.home.z)<e.hr+1.5;
        let tx,tz;if(chase){tx=dx/d;tz=dz/d;}else{e.ang+=dt*.6;const wx=e.home.x+Math.sin(e.ang)*e.hr*.6-e.pos.x,wz=e.home.z+Math.cos(e.ang)*e.hr*.6-e.pos.z,l=Math.hypot(wx,wz)||1;tx=wx/l;tz=wz/l;}
        const sp=(chase?2.4:1.4)*dt;let nx=e.pos.x+tx*sp,nz=e.pos.z+tz*sp;if(Math.hypot(nx-e.home.x,nz-e.home.z)>e.hr){nx=e.pos.x;nz=e.pos.z;}
        const ng=physics.groundAt(nx,nz,gy+.5);if(ng.col&&Math.abs(ng.h-gy)<.5&&(!physics.blocked(nx,nz,gy,.32)||physics.blocked(e.pos.x,e.pos.z,gy,.32))){e.pos.x=nx;e.pos.z=nz;}else e.ang+=dt*3;/* 小怪也绕开实体障碍 */
        e.pos.y=gy;e.group.position.set(e.pos.x,gy+Math.abs(Math.sin(t*6+e.phase))*.25,e.pos.z);e.group.rotation.y=Math.atan2(tx,tz);
        // 与团子接触
        if(d<.85&&p.y<gy+1.1&&p.y>gy-.6){
          if(p.vy<-1&&p.y>gy+.3){e.kill();p.vy=8;p.grounded=false;}
          else if((e.type==='fire'&&form==='water')||(e.type==='water'&&form==='fire'))e.kill();
          else if(e.hitCD<=0){e.hitCD=1.2;const l=d||1;p.vx=dx/l*5;p.vz=dz/l*5;p.vy=4.2;p.grounded=false;p.stun=.32;/* 击退不太狠，避免一碰就飞出岛 */sfx.land(8);ctx.mascot.impulse(-4);
            if(held){drop(p);toast('被乱乱撞了一下，爻块掉在地上了！');}else toast(e.type==='fire'?'小火灵！从上面踩，或者变水态碰它。':'小水泡！从上面踩，或者变火态碰它。');}
        }
      }
      if(luanDelay>0){luanDelay-=dt;if(luanDelay<=0)startLuan();}
      if(phase==='luan')luanUpdate(dt,p);
      if(phase==='done'&&gems.filter(g=>g.taken).length>=3&&!gate.active){gate.activate();sfx.gate();toast('卦门亮起来了！');}
    },
    debugLuan(){startLuan();},// 仅供测试：直接进入终乱
    debugSolve(){slots.forEach((s,i)=>{if(!s.block){const b=blocks.find(b=>b.yang===s.yang&&b.slot<0);if(b){b.held=false;b.slot=s.k;s.block=b;b.pos.copy(s.pos);b.group.position.copy(s.pos);s.col.top+=.32;}}});phase='done';},
  };
  return level;
}

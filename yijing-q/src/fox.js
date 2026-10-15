import * as THREE from '../vendor/three.module.js';

// 白色软糖小狐狸（第四境的向导）。
// 用骨骼动起来：身子、头、两只耳朵、两只眼睛、四只爪子、两节尾巴；同一种材质的部件合成一个网格，所以总共只有几次绘制。
// 动作全部由弹簧和简单的周期运动合成：
//   身体：加速时拉长、急停时压扁、转弯时往里倾、软糖似的晃；上游抬头、下沉低头
//   爪子：游动时前后交替划水，越快划得越快；悬停时慢慢蹬
//   耳朵、尾巴：有惯性，转弯往外甩，加速往后贴
//   脸：眨眼，头先转向你，偶尔东张西望
//   小性子：你停下来时它会转圈、翻跟头、追泡泡；拿到爻玉转个圈；说话时歪头；靠近水母会发抖
// 三种造型（正式用哪种由 style 指定）：
//   mochi 糯米团：奶白、几乎不透明，大圆头、小鼓包嘴、大眼睛、短圆耳朵、腮边两撮软毛
//   knot  红绳结：糯米团 + 脖子上一个红色中国结
//   ice   冰糖：更透、偏冷白，肚子里透一点粉，眼睛更大
export const FOX_STYLES=['mochi','knot','ice'];
export function createFox({world,envMap,style='mochi'}){
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const ICE=style==='ice',EYE=ICE?1.15:1;
  const root=new THREE.Group();const lean=new THREE.Group();root.add(lean);const squash=new THREE.Group();lean.add(squash);

  // ---------- 骨骼（绝对位置，自动换成相对父骨骼） ----------
  const defs={body:[null,0,.17,0],head:['body',0,.3,.08],earL:['head',-.15,.6,.06],earR:['head',.15,.6,.06],eyeL:['head',-.11,.44,.345],eyeR:['head',.11,.44,.345],
    pawFL:['body',-.09,.1,.1],pawFR:['body',.09,.1,.1],pawBL:['body',-.09,.1,-.12],pawBR:['body',.09,.1,-.12],tail:['body',0,.2,-.17],tailTip:['tail',0,.42,-.5],pin:['head',.14,.66,.16]};
  const bones={},list=[],abs={};
  for(const [name,[parent,x,y,z]] of Object.entries(defs)){const b=new THREE.Bone();b.name=name;abs[name]=V(x,y,z);b.position.copy(abs[name]);if(parent)b.position.sub(abs[parent]);(parent?bones[parent]:squash).add(b);bones[name]=b;list.push(b);}
  const idx={};list.forEach((b,i)=>{idx[b.name]=i;});

  // ---------- 材质：靠表面光泽和亮边显"软糖"，不靠透明（透明在水下会发灰） ----------
  const skin=new THREE.MeshPhysicalMaterial({color:ICE?'#f7fbff':'#fff9f2',roughness:.2,metalness:0,clearcoat:1,clearcoatRoughness:.12,sheen:.8,sheenColor:new THREE.Color(ICE?'#e6f4ff':'#fff1e6'),sheenRoughness:.35,
    transparent:true,opacity:ICE?.86:.985,emissive:new THREE.Color(ICE?'#e3efff':'#fff1e4'),emissiveIntensity:ICE?.4:.5,envMap,envMapIntensity:1});
  const wet=new THREE.MeshPhysicalMaterial({color:'#bfe8ff',roughness:.08,clearcoat:1,clearcoatRoughness:.05,transparent:true,opacity:.7,emissive:new THREE.Color('#7fc4ef'),emissiveIntensity:.35,envMap,envMapIntensity:1.3});
  const rim=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{color:{value:new THREE.Color(ICE?'#dff2ff':'#fff6ea')}},
    vertexShader:'#include <common>\n#include <skinning_pars_vertex>\nvarying vec3 vN;varying vec3 vV;void main(){\n#include <skinbase_vertex>\n#include <beginnormal_vertex>\n#include <skinnormal_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>\nvec4 mv=modelViewMatrix*vec4(transformed,1.);vN=normalize(normalMatrix*objectNormal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 color;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-max(dot(normalize(vN),normalize(vV)),0.),2.6);gl_FragColor=vec4(color*f*.7,1.);}'});
  const pink=new THREE.MeshBasicMaterial({color:'#ffadc0',transparent:true,opacity:.85,depthWrite:false}),dark=new THREE.MeshBasicMaterial({color:'#231c1a'}),shine=new THREE.MeshBasicMaterial({color:'#ffffff'}),red=new THREE.MeshToonMaterial({color:'#e3473c',emissive:'#5a0e08',emissiveIntensity:.3});

  // ---------- 部件：几何体放在静止姿态的位置上，绑到骨骼 ----------
  const pieces={skin:[],pink:[],dark:[],shine:[],wet:[],red:[],coral:[]};
  const tmp=new THREE.Object3D();
  function add(key,geo,bone,{p=[0,0,0],s=[1,1,1],r=[0,0,0]}={},weight=null){
    tmp.position.set(...p);tmp.scale.set(...s);tmp.rotation.set(...r);tmp.updateMatrix();const g=(geo.index?geo.toNonIndexed():geo.clone()).applyMatrix4(tmp.matrix);
    if(g.attributes.uv)g.deleteAttribute('uv');
    const n=g.attributes.position.count,si=new Uint16Array(n*4),sw=new Float32Array(n*4);
    for(let i=0;i<n;i++){if(weight){const [a,b,w]=weight(g.attributes.position.getX(i),g.attributes.position.getY(i),g.attributes.position.getZ(i));si[i*4]=idx[a];si[i*4+1]=idx[b];sw[i*4]=1-w;sw[i*4+1]=w;}else{si[i*4]=idx[bone];sw[i*4]=1;}}
    g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));pieces[key].push(g);}
  const sph=new THREE.SphereGeometry(.2,24,16);
  // 水滴形（圆底、圆尖）：耳朵和腮毛都用它，不用尖锥
  const drop=(r,h)=>new THREE.LatheGeometry([[0,0],[r*.55,r*.12],[r*.9,r*.45],[r,r*.9],[r*.86,h*.5],[r*.55,h*.74],[r*.22,h*.92],[r*.06,h*.99],[0,h]].map(([x,y])=>new THREE.Vector2(x,y)),22);
  const earGeo=drop(.12,.27),tuftGeo=drop(.05,.13);
  add('skin',sph,'body',{p:[0,.17,-.01],s:[.78,.72,.88]});// 小圆身子
  add('skin',sph,'head',{p:[0,.45,.12],s:[1.35,1.18,1.22]});// 大圆头（糯米团）
  add('skin',new THREE.SphereGeometry(.085,16,12),'head',{p:[0,.385,.33],s:[1.25,.8,1]});// 小鼓包嘴
  add('dark',new THREE.SphereGeometry(.03,10,8),'head',{p:[0,.41,.42],s:[1.2,.9,1]});// 小黑鼻头
  add('dark',new THREE.TorusGeometry(.022,.006,4,10,Math.PI),'head',{p:[0,.36,.405],r:[0,0,Math.PI]});// ω 嘴
  for(const [s,side] of [[-1,'L'],[1,'R']]){
    // 短而圆的耳朵（球压扁成三角水滴）+ 粉色耳内
    add('skin',earGeo,'ear'+side,{p:[s*.15,.57,.05],s:[1,1,.55],r:[-.12,0,-s*.42]});
    add('pink',earGeo,'ear'+side,{p:[s*.165,.6,.095],s:[.58,.72,.2],r:[-.12,0,-s*.42]});
    // 大圆眼睛 + 两个高光
    add('dark',new THREE.SphereGeometry(.055*EYE,16,12),'eye'+side,{p:[s*.11,.44,.345],s:[1,1.15,.5]});
    add('shine',new THREE.SphereGeometry(.019*EYE,8,6),'eye'+side,{p:[s*.11+.018,.465,.372]});add('shine',new THREE.SphereGeometry(.009*EYE,6,4),'eye'+side,{p:[s*.11-.016,.42,.372]});
    add('pink',new THREE.CircleGeometry(.045,16),'head',{p:[s*.19,.375,.29],s:[1,.62,1],r:[0,s*.62,0]});// 腮红
    // 腮边两撮软毛：狐狸的辨识度
    add('skin',tuftGeo,'head',{p:[s*.255,.37,.13],s:[1,1,.7],r:[0,0,s*(Math.PI/2+.55)]});add('skin',tuftGeo,'head',{p:[s*.235,.31,.12],s:[.8,.8,.6],r:[0,0,s*(Math.PI/2+.95)]});
    // 短胖小爪
    add('skin',new THREE.SphereGeometry(.058,12,8),'pawF'+side,{p:[s*.09,.04,.1],s:[1,.72,1.15]});add('skin',new THREE.SphereGeometry(.058,12,8),'pawB'+side,{p:[s*.09,.04,-.12],s:[1,.72,1.15]});}
  // 大尾巴：比身子还大，蓬松，往后上方翘；沿长度在两节尾巴骨骼之间过渡，能弯
  {const tg=new THREE.LatheGeometry([[0,0],[.07,.02],[.14,.1],[.19,.24],[.185,.37],[.13,.49],[.05,.56],[0,.575]].map(([r,y])=>new THREE.Vector2(r,y)),28);tg.rotateX(-1.0);
    add('skin',tg,null,{p:[0,.2,-.17]},(x,y,z)=>{const t=THREE.MathUtils.clamp(-(z+.17)/.5,0,1);return ['tail','tailTip',t*t];});
    add('wet',new THREE.SphereGeometry(.09,16,12),'tailTip',{p:[0,.2+.56*Math.cos(1.0),-.17-.56*Math.sin(1.0)],s:[1,.9,1]});}// 尾巴尖：湿的（濡其尾）
  if(style==='knot'){// 脖子上的红绳结：一圈红绳 + 胸前一个小结 + 两条穗子
    add('red',new THREE.TorusGeometry(.17,.016,6,28),'body',{p:[0,.29,.05],s:[1,1,.95],r:[Math.PI/2-.25,0,0]});
    add('red',new THREE.SphereGeometry(.035,10,8),'body',{p:[0,.255,.21]});
    for(const s of [-1,1]){add('red',new THREE.TorusGeometry(.03,.012,6,12),'body',{p:[s*.045,.26,.205],r:[0,0,s*.4]});add('red',new THREE.CylinderGeometry(.008,.014,.08,6),'body',{p:[s*.018,.2,.215],r:[0,0,s*.25]});}}

  // 珊瑚小发卡（找齐 12 枚贝壳的奖励）：别在右耳根，三根短枝 + 小圆头
  for(const [dx,dy,rz,h] of [[0,0,-.2,.12],[.05,.02,-.8,.09],[-.04,.03,.5,.08]]){add('coral',new THREE.CylinderGeometry(.016,.024,h,6),'pin',{p:[.14+dx+Math.sin(-rz)*h/2,.66+dy+Math.cos(rz)*h/2,.16],r:[0,0,rz]});add('coral',new THREE.SphereGeometry(.026,8,6),'pin',{p:[.14+dx+Math.sin(-rz)*h,.66+dy+Math.cos(rz)*h,.16]});}
  root.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(list);
  function merge(gs){let n=0;for(const g of gs)n+=g.attributes.position.count;const out=new THREE.BufferGeometry();
    for(const [name,size,Arr] of [['position',3,Float32Array],['normal',3,Float32Array],['skinIndex',4,Uint16Array],['skinWeight',4,Float32Array]]){const a=new Arr(n*size);let o=0;for(const g of gs){a.set(g.attributes[name].array,o);o+=g.attributes[name].array.length;}out.setAttribute(name,new THREE.BufferAttribute(a,size));}
    out.computeBoundingSphere();return out;}
  const mk=(geo,mat,order)=>{const m=new THREE.SkinnedMesh(geo,mat);m.frustumCulled=false;m.castShadow=false;m.renderOrder=order;squash.add(m);m.bind(skeleton);return m;};
  const skinGeo=merge(pieces.skin);
  mk(merge(pieces.dark),dark,0);mk(merge(pieces.shine),shine,0);mk(skinGeo,skin,2);mk(skinGeo,rim,3);mk(merge(pieces.pink),pink,3);mk(merge(pieces.wet),wet,2);
  if(pieces.red.length)mk(merge(pieces.red),red,0);
  const pinMesh=mk(merge(pieces.coral),new THREE.MeshToonMaterial({color:'#ff8fa6',emissive:'#6a1a2a',emissiveIntensity:.25}),0);pinMesh.visible=false;
  if(ICE){const core=new THREE.Mesh(new THREE.SphereGeometry(.11,14,10),new THREE.MeshBasicMaterial({color:'#ffc6d4',transparent:true,opacity:.42,depthWrite:false}));core.position.set(0,0,-.01);core.renderOrder=1;bones.body.add(core);}// 肚子里一点粉
  root.scale.setScalar(1.25);

  // ---------- 动作状态 ----------
  const sp=(k,d)=>({x:0,v:0,k,d,step(target,dt){this.v+=((target-this.x)*this.k-this.v*this.d)*dt;this.x+=this.v*dt;return this.x;}});
  const S={stretch:sp(110,9),squash:sp(160,8),roll:sp(70,7),pitch:sp(60,8),wobX:sp(220,5),wobZ:sp(220,5),earL:sp(80,5),earR:sp(80,5),tailY:sp(45,4),tailX:sp(45,4),tipY:sp(70,4),headY:sp(40,7),headZ:sp(50,6)};
  const fox={root,pos:V(),vel:V(),yaw:0,paddle:0,blinkAt:1.5,blink:0,trick:null,trickT:0,talkT:0,scared:0,idleT:0,nextTrick:4,glance:0,glanceAt:3,prevVel:V(),acc:V()};

  // 小把戏：spin 原地转一圈；flip 翻跟头；hop 一蹦（软糖压扁再弹起）
  fox.doTrick=name=>{if(fox.trick)return;fox.trick=name;fox.trickT=0;if(name==='hop'||name==='spin')S.squash.v-=5;};
  fox.talk=sec=>{fox.talkT=sec;S.squash.v-=3.5;};
  fox.update=(dt,t,{target,look,idle=false,scared=false,maxSpeed=9})=>{
    dt=Math.min(dt,.05);let jumped=false;
    // 位置：弹簧跟随；离得太远（被暗流冲开、穿墙）直接回到目标
    if(fox.pos.distanceTo(target)>9){fox.pos.copy(target);fox.vel.set(0,0,0);jumped=true;}
    else{const a=target.clone().sub(fox.pos).multiplyScalar(16).addScaledVector(fox.vel,-7.5);fox.vel.addScaledVector(a,dt);if(fox.vel.length()>maxSpeed)fox.vel.setLength(maxSpeed);fox.pos.addScaledVector(fox.vel,dt);}
    fox.acc.copy(fox.vel).sub(fox.prevVel).divideScalar(Math.max(dt,1e-3));fox.prevVel.copy(fox.vel);
    root.position.copy(fox.pos);
    const speed=Math.hypot(fox.vel.x,fox.vel.z),cos=Math.cos(fox.yaw),sin=Math.sin(fox.yaw);
    const fwdAcc=fox.acc.x*sin+fox.acc.z*cos;
    // 朝向：游得快时朝前，慢时看着你
    const want=speed>.6?Math.atan2(fox.vel.x,fox.vel.z):Math.atan2(look.x-fox.pos.x,look.z-fox.pos.z);let dy=want-fox.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));
    const turn=dy*Math.min(1,dt*5);fox.yaw+=turn;const turnRate=turn/Math.max(dt,1e-3);
    // 小把戏
    let trickYaw=0,trickPitch=0,trickY=0;
    if(fox.trick){fox.trickT+=dt;const T={spin:.75,flip:.9,hop:.5}[fox.trick],k=Math.min(1,fox.trickT/T),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      if(fox.trick==='spin')trickYaw=e*Math.PI*2;if(fox.trick==='flip'){trickPitch=-e*Math.PI*2;trickY=Math.sin(k*Math.PI)*.35;}if(fox.trick==='hop')trickY=Math.sin(k*Math.PI)*.4;
      if(k>=1){fox.trick=null;S.squash.v-=3;}}
    if(idle){fox.idleT+=dt;if(fox.idleT>fox.nextTrick&&!fox.trick){fox.doTrick(['spin','flip','hop'][Math.floor(Math.random()*3)]);fox.idleT=0;fox.nextTrick=4+Math.random()*4;}}else fox.idleT=0;
    root.rotation.y=fox.yaw+trickYaw;root.position.y+=trickY;
    // 身体：倾斜、俯仰、拉长压扁、软糖晃动
    const roll=S.roll.step(THREE.MathUtils.clamp(-turnRate*.18,-.6,.6),dt),pitch=S.pitch.step(THREE.MathUtils.clamp(-fox.vel.y*.12,-.45,.45),dt);
    const wx=S.wobX.step(0,dt),wz=S.wobZ.step(0,dt);S.wobX.v+=THREE.MathUtils.clamp(fwdAcc,-40,40)*dt*.9;S.wobZ.v+=THREE.MathUtils.clamp(turnRate,-8,8)*dt*1.4;
    lean.rotation.set(pitch+wx+trickPitch,0,roll+wz);
    const st=S.stretch.step(THREE.MathUtils.clamp(speed*.035+Math.max(0,fwdAcc)*.006,0,.3),dt),sq=S.squash.step(0,dt);
    const sy=Math.max(.6,1+sq-st*.4),sxz=1/Math.sqrt(sy);squash.scale.set(sxz*(1-st*.25),sy,sxz*(1+st));
    squash.position.y=Math.sin(t*2.6)*.04;
    // 害怕：缩成一团发抖
    fox.scared+=((scared?1:0)-fox.scared)*Math.min(1,dt*4);if(fox.scared>.05){lean.rotation.z+=Math.sin(t*55)*.05*fox.scared;squash.scale.multiplyScalar(1-.08*fox.scared);}
    // 爪子：划水
    fox.paddle+=dt*(3+speed*2.6);const amp=.35+Math.min(.6,speed*.15);
    bones.pawFL.rotation.x=Math.sin(fox.paddle)*amp;bones.pawFR.rotation.x=Math.sin(fox.paddle+Math.PI)*amp;
    bones.pawBL.rotation.x=Math.sin(fox.paddle+Math.PI*.5)*amp*.8;bones.pawBR.rotation.x=Math.sin(fox.paddle+Math.PI*1.5)*amp*.8;
    // 头：先转向你 / 东张西望；说话时歪头
    fox.glanceAt-=dt;if(fox.glanceAt<0){fox.glance=speed<1?(Math.random()-.5)*1.4:0;fox.glanceAt=1.5+Math.random()*3;}
    const toLook=Math.atan2(look.x-fox.pos.x,look.z-fox.pos.z);let hl=toLook-fox.yaw;hl=Math.atan2(Math.sin(hl),Math.cos(hl));
    fox.talkT=Math.max(0,fox.talkT-dt);const talking=fox.talkT>0;
    bones.head.rotation.y=S.headY.step(THREE.MathUtils.clamp((speed<1.2?hl:dy*.6)+fox.glance*(talking?0:1),-.7,.7),dt);
    bones.head.rotation.z=S.headZ.step(talking?.32+Math.sin(t*5)*.06:0,dt);bones.head.rotation.x=-pitch*.5+(talking?Math.sin(t*9)*.05:0);
    // 耳朵：加速往后贴，转弯往外甩，偶尔抖一下；害怕时压平
    const earBase=-THREE.MathUtils.clamp(fwdAcc*.02,-.5,.6)-fox.scared*.8;const twitch=Math.sin(t*1.3)>.97?Math.sin(t*60)*.25:0;
    bones.earL.rotation.x=S.earL.step(earBase+twitch,dt);bones.earR.rotation.x=S.earR.step(earBase,dt);bones.earL.rotation.z=-wz*.6+roll*.4;bones.earR.rotation.z=-wz*.6+roll*.4;
    // 尾巴：像舵，转弯往外甩、慢慢回来；尾巴尖再晚一点
    bones.tail.rotation.y=S.tailY.step(THREE.MathUtils.clamp(-turnRate*.35,-.9,.9)+Math.sin(t*(speed>1?6:2.2))*(speed>1?.18:.28),dt);
    bones.tail.rotation.x=S.tailX.step(THREE.MathUtils.clamp(fox.vel.y*.1,-.4,.4)+(speed>2?.25:0)-fox.scared*.5,dt);
    bones.tailTip.rotation.y=S.tipY.step(bones.tail.rotation.y*.9,dt);
    // 眨眼
    if(t>fox.blinkAt){fox.blink=.13;fox.blinkAt=t+1.8+Math.random()*3;}fox.blink=Math.max(0,fox.blink-dt);const ey=fox.blink>0?.12:1;
    bones.eyeL.scale.y+=(ey-bones.eyeL.scale.y)*Math.min(1,dt*40);bones.eyeR.scale.y=bones.eyeL.scale.y;
    return {jumped,speed};
  };
  fox.setPin=v=>{pinMesh.visible=!!v;};
  fox.bones=bones;fox.squash=squash;fox.lean=lean;
  return fox;
}

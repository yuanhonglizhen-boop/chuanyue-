import * as THREE from '../vendor/three.module.js';

// 白色软糖小狐狸（第四境的向导）。
// 用骨骼动起来：身子、头、两只耳朵、两只眼睛、四只爪子、两节尾巴；同一种材质的部件合成一个网格，所以总共只有几次绘制。
// 动作全部由弹簧和简单的周期运动合成：
//   身体：加速时拉长、急停时压扁、转弯时往里倾、软糖似的晃；上游抬头、下沉低头
//   爪子：游动时前后交替划水，越快划得越快；悬停时慢慢蹬
//   耳朵、尾巴：有惯性，转弯往外甩，加速往后贴
//   脸：眨眼，头先转向你，偶尔东张西望
//   小性子：你停下来时它会转圈、翻跟头、追泡泡；拿到爻玉转个圈；说话时歪头；靠近水母会发抖
export function createFox({world,envMap}){
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const root=new THREE.Group();const lean=new THREE.Group();root.add(lean);const squash=new THREE.Group();lean.add(squash);

  // ---------- 骨骼（绝对位置，自动换成相对父骨骼） ----------
  const defs={body:[null,0,.2,0],head:['body',0,.34,.12],earL:['head',-.13,.6,.17],earR:['head',.13,.6,.17],eyeL:['head',-.09,.48,.4],eyeR:['head',.09,.48,.4],
    pawFL:['body',-.1,.12,.16],pawFR:['body',.1,.12,.16],pawBL:['body',-.1,.12,-.17],pawBR:['body',.1,.12,-.17],tail:['body',0,.25,-.24],tailTip:['tail',0,.38,-.48]};
  const bones={},list=[],abs={};
  for(const [name,[parent,x,y,z]] of Object.entries(defs)){const b=new THREE.Bone();b.name=name;abs[name]=V(x,y,z);b.position.copy(abs[name]);if(parent)b.position.sub(abs[parent]);(parent?bones[parent]:squash).add(b);bones[name]=b;list.push(b);}
  const idx={};list.forEach((b,i)=>{idx[b.name]=i;});

  // ---------- 材质 ----------
  const skin=new THREE.MeshPhysicalMaterial({color:'#fffaf6',roughness:.16,metalness:0,clearcoat:1,clearcoatRoughness:.1,sheen:.6,sheenColor:new THREE.Color('#ffffff'),sheenRoughness:.4,transparent:true,opacity:.93,emissive:new THREE.Color('#eef4ff'),emissiveIntensity:.38,envMap,envMapIntensity:1.1});
  const wet=new THREE.MeshPhysicalMaterial({color:'#bfe8ff',roughness:.08,clearcoat:1,clearcoatRoughness:.05,transparent:true,opacity:.66,emissive:new THREE.Color('#7fc4ef'),emissiveIntensity:.3,envMap,envMapIntensity:1.3});
  const rim=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{color:{value:new THREE.Color('#ffffff')}},
    vertexShader:'#include <common>\n#include <skinning_pars_vertex>\nvarying vec3 vN;varying vec3 vV;void main(){\n#include <skinbase_vertex>\n#include <beginnormal_vertex>\n#include <skinnormal_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>\nvec4 mv=modelViewMatrix*vec4(transformed,1.);vN=normalize(normalMatrix*objectNormal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 color;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-max(dot(normalize(vN),normalize(vV)),0.),2.4);gl_FragColor=vec4(color*f*.75,1.);}'});
  const pink=new THREE.MeshBasicMaterial({color:'#ffb3c4',transparent:true,opacity:.8,depthWrite:false}),dark=new THREE.MeshBasicMaterial({color:'#2b2320'}),shine=new THREE.MeshBasicMaterial({color:'#ffffff'});

  // ---------- 部件：几何体放在静止姿态的位置上，绑到骨骼 ----------
  const pieces={skin:[],pink:[],dark:[],shine:[],wet:[]};
  const tmp=new THREE.Object3D();
  function add(key,geo,bone,{p=[0,0,0],s=[1,1,1],r=[0,0,0]}={},weight=null){
    tmp.position.set(...p);tmp.scale.set(...s);tmp.rotation.set(...r);tmp.updateMatrix();const g=(geo.index?geo.toNonIndexed():geo.clone()).applyMatrix4(tmp.matrix);
    const n=g.attributes.position.count,si=new Uint16Array(n*4),sw=new Float32Array(n*4);
    for(let i=0;i<n;i++){if(weight){const [a,b,w]=weight(g.attributes.position.getX(i),g.attributes.position.getY(i),g.attributes.position.getZ(i));si[i*4]=idx[a];si[i*4+1]=idx[b];sw[i*4]=1-w;sw[i*4+1]=w;}else{si[i*4]=idx[bone];sw[i*4]=1;}}
    g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));pieces[key].push(g);}
  const sph=new THREE.SphereGeometry(.2,20,14),ear=new THREE.ConeGeometry(.11,.3,12);
  add('skin',sph,'body',{p:[0,.2,-.02],s:[.9,.85,1.2]});
  add('skin',sph,'head',{p:[0,.44,.2],s:[1.12,1,1.02]});
  add('skin',new THREE.ConeGeometry(.115,.2,16),'head',{p:[0,.39,.41],s:[1,1,.75],r:[Math.PI/2,0,0]});add('skin',new THREE.SphereGeometry(.04,10,8),'head',{p:[0,.39,.5]});
  add('dark',new THREE.SphereGeometry(.03,8,6),'head',{p:[0,.395,.535]});// 鼻子
  for(const [s,side] of [[-1,'L'],[1,'R']]){
    add('skin',ear,'ear'+side,{p:[s*.13,.7,.16],s:[1,1,.6],r:[-.12,0,-s*.32]});add('pink',new THREE.ConeGeometry(.065,.2,10),'ear'+side,{p:[s*.132,.69,.195],s:[1,1,.35],r:[-.12,0,-s*.32]});
    add('dark',new THREE.SphereGeometry(.036,12,8),'eye'+side,{p:[s*.09,.48,.405],s:[1,1.35,.6]});add('shine',new THREE.SphereGeometry(.012,6,4),'eye'+side,{p:[s*.09+.012,.5,.43]});
    add('pink',new THREE.CircleGeometry(.04,14),'head',{p:[s*.16,.4,.37],s:[1,.6,1],r:[0,s*.5,0]});
    add('skin',new THREE.SphereGeometry(.065,10,8),'pawF'+side,{p:[s*.1,.05,.16],s:[1,.75,1.2]});add('skin',new THREE.SphereGeometry(.065,10,8),'pawB'+side,{p:[s*.1,.05,-.17],s:[1,.75,1.2]});}
  // 大尾巴：一整条由细到粗再收尖，沿着长度在两节尾巴骨骼之间过渡，能弯
  {const tg=new THREE.LatheGeometry([[0,0],[.06,.02],[.115,.1],[.15,.22],[.145,.33],[.1,.43],[.035,.49],[0,.5]].map(([r,y])=>new THREE.Vector2(r,y)),18);tg.rotateX(-1.05);
    add('skin',tg,null,{p:[0,.25,-.24]},(x,y,z)=>{const t=THREE.MathUtils.clamp(-(z+.24)/.45,0,1);return ['tail','tailTip',t*t];});}
  add('wet',new THREE.SphereGeometry(.075,14,10),'tailTip',{p:[0,.25+.5*Math.cos(1.05)-.01,-.24-.5*Math.sin(1.05)]});

  root.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(list);
  function merge(gs){let n=0;for(const g of gs)n+=g.attributes.position.count;const out=new THREE.BufferGeometry();
    for(const [name,size,Arr] of [['position',3,Float32Array],['normal',3,Float32Array],['skinIndex',4,Uint16Array],['skinWeight',4,Float32Array]]){const a=new Arr(n*size);let o=0;for(const g of gs){a.set(g.attributes[name].array,o);o+=g.attributes[name].array.length;}out.setAttribute(name,new THREE.BufferAttribute(a,size));}
    out.computeBoundingSphere();return out;}
  const mk=(geo,mat,order)=>{const m=new THREE.SkinnedMesh(geo,mat);m.frustumCulled=false;m.castShadow=false;m.renderOrder=order;squash.add(m);m.bind(skeleton);return m;};
  const skinGeo=merge(pieces.skin);
  mk(merge(pieces.dark),dark,0);mk(merge(pieces.shine),shine,0);mk(skinGeo,skin,2);mk(skinGeo,rim,3);mk(merge(pieces.pink),pink,3);mk(merge(pieces.wet),wet,2);
  const core=new THREE.Mesh(new THREE.SphereGeometry(.13,14,10),new THREE.MeshBasicMaterial({color:'#ffc6d4',transparent:true,opacity:.42,depthWrite:false}));core.position.set(0,.02,-.02);core.renderOrder=1;bones.body.add(core);// 肚子里一点粉
  root.scale.setScalar(1.2);

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
  fox.bones=bones;fox.squash=squash;fox.lean=lean;
  return fox;
}

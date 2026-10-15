import * as THREE from '../../vendor/three.module.js';

// 第四境的海底生物与可玩的东西（玩法都是本作原创）：
//   大鳐鱼：定时在海沟上方来回，落到它背上就被驮过去（六三"利涉大川"的第二种渡法）
//   "震"的新用处：震碎裂纹石，露出小洞；震醒堵在洞口睡觉的大海龟，它会游开
//   海葵：落上去会被弹起来；螃蟹：横着走，被吓到就钻进沙里；罐子里的小章鱼会探头、躲起来
//   头顶偶尔游过一头鲸；海星；12 枚贝壳（找齐给小狐狸一枚珊瑚发卡）
export function createSeaLife(env){
  const {world,physics,scene,toast,sfx,burst,rng,V,dummy,cT,bubble,cullable,S,SURF,unlock,flags,persist,onShellsDone}=env;

  // 顶点着色的合并几何体：[几何体, 颜色, {p,s,r}]；可选 shade(g, i) 改单个顶点的颜色
  function vc(parts){const o=new THREE.Object3D();let n=0;const gs=[];
    for(const [geo,color,{p=[0,0,0],s=[1,1,1],r=[0,0,0]}={},shade] of parts){o.position.set(...p);o.scale.set(...s);o.rotation.set(...r);o.updateMatrix();
      const g=(geo.index?geo.toNonIndexed():geo.clone()).applyMatrix4(o.matrix);const c=new THREE.Color(color),c2=new THREE.Color(),cnt=g.attributes.position.count,col=new Float32Array(cnt*3);
      for(let i=0;i<cnt;i++){c2.copy(c);if(shade)shade(c2,g.attributes.position,g.attributes.normal,i);col[i*3]=c2.r;col[i*3+1]=c2.g;col[i*3+2]=c2.b;}
      g.setAttribute('color',new THREE.BufferAttribute(col,3));gs.push(g);n+=cnt;}
    const out=new THREE.BufferGeometry();for(const [name,size] of [['position',3],['normal',3],['color',3]]){const a=new Float32Array(n*size);let k=0;for(const g of gs){a.set(g.attributes[name].array,k);k+=g.attributes[name].array.length;}out.setAttribute(name,new THREE.BufferAttribute(a,size));}
    out.computeBoundingSphere();return out;}
  const belly=(white)=>(c,P,N,i)=>{if(N.getY(i)<-.15)c.lerp(new THREE.Color(white),.85);};// 肚子浅
  // 卡通材质 + 顶点着色；wave：顶点着色器里的摆动（鳐鱼扇翅、鲸摆尾、海龟划鳍）
  function mat(wave){const m=new THREE.MeshToonMaterial({vertexColors:true});if(wave){m.onBeforeCompile=sh=>{sh.uniforms.cT=cT;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float cT;').replace('#include <begin_vertex>','#include <begin_vertex>\n'+wave);};m.customProgramCacheKey=()=>'life'+wave.length;}return m;}
  const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;

  // ================= 大鳐鱼 =================
  const mantaFwd=new THREE.CatmullRomCurve3([V(5.2,2.6,-13.2),V(5.6,4,-19),V(4.6,4.6,-25),V(5.6,4,-31),V(5,2.6,-37.6)]);
  const mantaRet=new THREE.CatmullRomCurve3([V(5,2.6,-37.6),V(6.8,-1,-34),V(7,-4,-27.5),V(7,-4,-21),V(6.8,-1,-16),V(5.6,1.6,-14.2),V(5.2,2.6,-13.2)]);
  const MANTA_T=22;// 岸边停 3.5 秒 → 渡沟 7 秒 → 对岸停 2.5 秒 → 从海沟深处绕回 9 秒
  function mantaAt(t,out,tan){const u=((t%MANTA_T)+MANTA_T)%MANTA_T;
    if(u<3.5){mantaFwd.getPointAt(0,out);mantaFwd.getTangentAt(0,tan);out.y+=Math.sin(t*1.4)*.08;return 'wait';}
    if(u<10.5){const k=ease((u-3.5)/7);mantaFwd.getPointAt(k,out);mantaFwd.getTangentAt(Math.min(.999,Math.max(.001,k)),tan);return 'go';}
    if(u<13){mantaFwd.getPointAt(1,out);mantaFwd.getTangentAt(.999,tan);out.y+=Math.sin(t*1.4)*.08;return 'drop';}
    const k=ease((u-13)/9);mantaRet.getPointAt(k,out);mantaRet.getTangentAt(Math.min(.999,Math.max(.001,k)),tan);return 'back';}
  const mantaGeo=vc([
    [new THREE.SphereGeometry(1,28,12),'#3f6d93',{s:[1.65,.2,1.05]},belly('#eef6f8')],// 菱形大翅膀（扁球）
    [new THREE.SphereGeometry(.42,14,10),'#3f6d93',{p:[0,.1,.55],s:[1,.55,1.1]},belly('#eef6f8')],// 背上鼓起的身子
    [new THREE.ConeGeometry(.12,.45,8),'#35607f',{p:[-.32,0,1.05],r:[Math.PI/2,0,.2]}],[new THREE.ConeGeometry(.12,.45,8),'#35607f',{p:[.32,0,1.05],r:[Math.PI/2,0,-.2]}],// 头鳍
    [new THREE.CylinderGeometry(.035,.01,1.9,6),'#35607f',{p:[0,0,-1.85],r:[Math.PI/2,0,0]}],// 细尾巴
    [new THREE.SphereGeometry(.07,10,8),'#141a22',{p:[-.36,.13,.88]}],[new THREE.SphereGeometry(.07,10,8),'#141a22',{p:[.36,.13,.88]}],
    [new THREE.SphereGeometry(.025,6,4),'#ffffff',{p:[-.38,.19,.93]}],[new THREE.SphereGeometry(.025,6,4),'#ffffff',{p:[.38,.19,.93]}],
    [new THREE.CircleGeometry(.12,16),'#f6b2c0',{p:[-.55,.15,.6],r:[-Math.PI/2,0,0],s:[1,.6,1]}],[new THREE.CircleGeometry(.12,16),'#f6b2c0',{p:[.55,.15,.6],r:[-Math.PI/2,0,0],s:[1,.6,1]}],// 腮红
  ]);
  const manta=new THREE.Mesh(mantaGeo,mat('float ax=abs(position.x);transformed.y+=sin(cT*2.3-ax*1.4)*.26*ax*ax*.6;'));manta.frustumCulled=false;world.root.add(manta);
  const mPos=V(),mTan=V(),mPrev=V();mantaAt(0,mPos,mTan);mPrev.copy(mPos);
  const mantaCol=physics.add({kind:'box',x:mPos.x,z:mPos.z,hw:1.35,hd:1,rot:0,top:mPos.y+.22,bottom:mPos.y-.35,safe:false,tag:'manta'});
  cullable.push({o:manta,p:V(5,0,-25),r:42});

  // ================= 小洞（裂纹石 / 海龟堵着） =================
  // 贴着峡谷石壁的一个有顶的小洞：两侧石墙、顶、洞口一块挡路的东西（side：-1 左壁，1 右壁）
  const ROCKC=['#5f8d8f','#4a7275'];
  function grotto(side,z){const xw=side*9.4,xo=side*7,cx=(xw+xo)/2;
    for(const dz of [-1.5,1.5]){physics.add({kind:'box',x:cx,z:z+dz,hw:1.25,hd:.28,top:3.2,bottom:-1,safe:true});const m=S(world.mesh(new THREE.DodecahedronGeometry(1,0),world.toon(ROCKC[dz>0?0:1]),cx,1.3,z+dz*1.05));m.scale.set(1.35,1.5,.55);m.rotation.y=rng();}
    physics.add({kind:'box',x:cx,z,hw:1.3,hd:1.8,top:3.4,bottom:2.4,safe:true});{const m=S(world.mesh(new THREE.DodecahedronGeometry(1,0),world.toon(ROCKC[0]),cx,2.95,z));m.scale.set(1.45,.55,1.95);}
    return {side,x:xo,z,inner:V(side*8.4,.4,z)};}
  // 裂纹石：带几道发亮的裂缝，"震"一下就碎
  const crackMat=world.toon('#86aaa8'),crackLine=new THREE.MeshBasicMaterial({color:'#bff3ff'});
  function crackRock(g){const grp=new THREE.Group();grp.position.set(g.x,1.15,g.z);world.root.add(grp);
    const r=new THREE.Mesh(new THREE.DodecahedronGeometry(1,1),crackMat);r.scale.set(.62,1.12,1.25);grp.add(r);
    const lines=[];for(const [y,z,rz,l] of [[.3,-.2,.5,.9],[-.15,.35,-.6,.8],[.55,.45,1.2,.5],[-.45,-.5,.9,.6]]){const b=new THREE.Mesh(new THREE.BoxGeometry(.04,l,.04),crackLine);b.position.set(-g.side*.6,y,z);b.rotation.x=rz;lines.push(b);}
    const lm=new THREE.Mesh(world.mergeGeos(lines,grp),crackLine);grp.add(lm);
    const col=physics.add({kind:'box',x:g.x,z:g.z,hw:.5,hd:1.32,top:2.4,bottom:-1,safe:false});cullable.push({o:grp,p:V(g.x,0,g.z),r:34});
    return {kind:'crack',g,grp,col,broken:false};}
  const gA=grotto(-1,-38.6),gB=grotto(1,-45.6),gT=grotto(-1,-48.9);
  const rocks=[crackRock(gA),crackRock(gB)];

  // ================= 大海龟 =================
  const turtleGeo=vc([
    [new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2),'#6f9a58',{s:[1.05,.62,1.25]}],// 背甲
    [new THREE.SphereGeometry(1,24,8,0,Math.PI*2,Math.PI/2,Math.PI/2),'#efe1b0',{s:[1.02,.2,1.22]}],// 腹甲
    [new THREE.TorusGeometry(.98,.07,6,30),'#55804a',{r:[Math.PI/2,0,0],s:[1.05,1.25,1]}],// 甲边
    ...[[0,.58,0],[.42,.45,.45],[-.42,.45,.45],[.42,.45,-.45],[-.42,.45,-.45]].map(([x,y,z])=>[new THREE.CircleGeometry(.24,6),'#86b06c',{p:[x,y+.02,z],r:[-Math.PI/2+(z>0?.35:z<0?-.35:0),0,x>0?-.35:x<0?.35:0]}]),// 甲纹
    [new THREE.SphereGeometry(.3,16,12),'#a8c88a',{p:[0,.1,1.45],s:[1,.85,1.15]}],// 头
    [new THREE.SphereGeometry(.06,8,6),'#1b1f1a',{p:[-.17,.2,1.65]}],[new THREE.SphereGeometry(.06,8,6),'#1b1f1a',{p:[.17,.2,1.65]}],
    [new THREE.SphereGeometry(.022,6,4),'#ffffff',{p:[-.18,.24,1.7]}],[new THREE.SphereGeometry(.022,6,4),'#ffffff',{p:[.16,.24,1.7]}],
    [new THREE.SphereGeometry(.4,12,8),'#a8c88a',{p:[-1.25,-.05,.6],s:[1.5,.25,.75],r:[0,.5,0]}],[new THREE.SphereGeometry(.4,12,8),'#a8c88a',{p:[1.25,-.05,.6],s:[1.5,.25,.75],r:[0,-.5,0]}],// 前鳍
    [new THREE.SphereGeometry(.28,10,8),'#a8c88a',{p:[-.9,-.05,-1.05],s:[1.3,.25,.8],r:[0,-.5,0]}],[new THREE.SphereGeometry(.28,10,8),'#a8c88a',{p:[.9,-.05,-1.05],s:[1.3,.25,.8],r:[0,.5,0]}],
  ]);
  const turtle=new THREE.Mesh(turtleGeo,mat('float fx=smoothstep(.95,1.5,abs(position.x));transformed.y+=sin(cT*2.6)*.28*fx;'));turtle.frustumCulled=false;world.root.add(turtle);
  const T={state:'sleep',t:0,pos:V(-6.1,.55,gT.z),yaw:Math.PI/2,from:V(),col:physics.add({kind:'cyl',x:-6.1,z:gT.z,r:1.32,top:1.5,bottom:-1,safe:true}),orbit:0};
  turtle.position.copy(T.pos);turtle.rotation.y=T.yaw;cullable.push({o:turtle,p:V(-4,0,-46),r:40});

  // ================= 海葵蹦床 =================
  const anemoneSpots=[[3.2,7.6,'#ff8fb1'],[-6.2,-6.9,'#b48cff'],[6.6,-37.4,'#ffb070'],[-5.8,-71.2,'#7fe0c8']];
  const TENT=22,tentGeo=new THREE.CapsuleGeometry(.055,.42,3,6);tentGeo.translate(0,.26,0);
  const tentMat=new THREE.MeshToonMaterial({color:'#ffffff'});tentMat.onBeforeCompile=sh=>{sh.uniforms.cT=cT;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float cT;').replace('#include <begin_vertex>','#include <begin_vertex>\nfloat ph=instanceMatrix[3].x*3.1+instanceMatrix[3].z*2.3;transformed.x+=sin(cT*2.2+ph+position.y*3.)*.12*position.y*2.;transformed.z+=cos(cT*1.7+ph)*.06*position.y*2.;');};tentMat.customProgramCacheKey=()=>'anemone';
  const tents=new THREE.InstancedMesh(tentGeo,tentMat,anemoneSpots.length*TENT);tents.frustumCulled=false;world.root.add(tents);
  const anemones=anemoneSpots.map(([x,z,color],k)=>{const base=S(world.mesh(new THREE.CylinderGeometry(.5,.62,.4,16),world.toon(color),x,.2,z));base.castShadow=false;
    const col=physics.add({kind:'cyl',x,z,r:.85,top:.55,bottom:-1,safe:true,bounce:8.5,tag:'anemone'});const c=new THREE.Color(color),ct=new THREE.Color();
    const tl=[];for(let i=0;i<TENT;i++){const a=i/TENT*Math.PI*2*2.6,r=.12+.38*(i/TENT);tl.push({x:x+Math.cos(a)*r,z:z+Math.sin(a)*r,tilt:r*1.1,a});tents.setColorAt(k*TENT+i,ct.copy(c).lerp(new THREE.Color('#ffffff'),(i%3)*.15));}
    return {x,z,col,tl,squish:0,k};});
  function drawAnemone(an){const sq=1-Math.sin(Math.min(1,an.squish)*Math.PI)*.45;an.tl.forEach((tt,i)=>{dummy.position.set(tt.x,.38,tt.z);dummy.rotation.set(Math.sin(tt.a)*tt.tilt,0,-Math.cos(tt.a)*tt.tilt,'YXZ');dummy.scale.set(1,sq,1);dummy.updateMatrix();tents.setMatrixAt(an.k*TENT+i,dummy.matrix);});tents.instanceMatrix.needsUpdate=true;}
  anemones.forEach(drawAnemone);

  // ================= 螃蟹 =================
  const crabGeo=vc([
    [new THREE.SphereGeometry(.22,16,10),'#ff7448',{p:[0,.12,0],s:[1.1,.5,.8]}],
    [new THREE.SphereGeometry(.09,10,8),'#ff8654',{p:[-.29,.12,.16],s:[1,.75,1.2]}],[new THREE.SphereGeometry(.09,10,8),'#ff8654',{p:[.29,.12,.16],s:[1,.75,1.2]}],
    [new THREE.CylinderGeometry(.018,.018,.12,5),'#e8643a',{p:[-.07,.23,.1]}],[new THREE.CylinderGeometry(.018,.018,.12,5),'#e8643a',{p:[.07,.23,.1]}],
    [new THREE.SphereGeometry(.045,8,6),'#ffffff',{p:[-.07,.3,.11]}],[new THREE.SphereGeometry(.045,8,6),'#ffffff',{p:[.07,.3,.11]}],
    [new THREE.SphereGeometry(.026,6,4),'#1a1a1a',{p:[-.07,.305,.15]}],[new THREE.SphereGeometry(.026,6,4),'#1a1a1a',{p:[.07,.305,.15]}],
    ...[[-1,-.08],[-1,0],[-1,.08],[1,-.08],[1,0],[1,.08]].map(([s,z])=>[new THREE.CylinderGeometry(.016,.012,.22,4),'#e8643a',{p:[s*.26,.06,z],r:[0,0,s*1.1]}]),
  ]);
  const crabDefs=[[-3.2,11.2,-.8,12.6],[4.6,4.6,5.8,5.2],[1.2,-12.2,3.2,-12.8],[3.8,-70.4,5.4,-71],[-3.2,-80,-1.4,-79.6]];
  const crabMesh=new THREE.InstancedMesh(crabGeo,new THREE.MeshToonMaterial({vertexColors:true}),crabDefs.length);crabMesh.frustumCulled=false;world.root.add(crabMesh);
  const crabs=crabDefs.map(([x0,z0,x1,z1],i)=>({a:V(x0,0,z0),b:V(x1,0,z1),ph:rng()*6,pos:V(x0,0,z0),hide:0,dig:0}));

  // ================= 罐子里的小章鱼 =================
  const pot=new THREE.LatheGeometry([[.0,0],[.38,.02],[.5,.25],[.52,.55],[.36,.86],[.3,.98],[.38,1.05],[.34,1.08]].map(([r,y])=>new THREE.Vector2(r,y)),22);
  S(world.mesh(pot,world.toon('#c9774a',{side:THREE.DoubleSide}),-7.4,0,-73.6)).rotation.z=.12;
  physics.add({kind:'cyl',x:-7.4,z:-73.6,r:.55,top:1.08,bottom:-1,safe:true});
  const octoGeo=vc([[new THREE.SphereGeometry(.28,20,14),'#e48ad8',{s:[1,1.15,1]}],
    [new THREE.SphereGeometry(.075,10,8),'#ffffff',{p:[-.11,.02,.24]}],[new THREE.SphereGeometry(.075,10,8),'#ffffff',{p:[.11,.02,.24]}],[new THREE.SphereGeometry(.045,8,6),'#1a1420',{p:[-.11,.02,.305]}],[new THREE.SphereGeometry(.045,8,6),'#1a1420',{p:[.11,.02,.305]}],
    [new THREE.CircleGeometry(.05,12),'#ff9fc0',{p:[-.19,-.07,.21],r:[0,-.6,0]}],[new THREE.CircleGeometry(.05,12),'#ff9fc0',{p:[.19,-.07,.21],r:[0,.6,0]}],
    ...[0,1,2,3].map(k=>[new THREE.TorusGeometry(.13,.045,6,14,Math.PI*1.3),'#e48ad8',{p:[Math.cos(k*1.6)*.3,-.26,Math.sin(k*1.6)*.3+.05],r:[0,-k*1.6,Math.PI*.5]}])]);
  const octo=new THREE.Mesh(octoGeo,new THREE.MeshToonMaterial({vertexColors:true}));octo.position.set(-7.4,.85,-73.6);octo.rotation.y=.9;world.root.add(octo);cullable.push({o:octo,p:V(-7.4,0,-73.6),r:30});
  const O={peek:1,shy:false,said:false};

  // ================= 鲸（远远游过的大影子） =================
  const whaleGeo=vc([
    [new THREE.LatheGeometry([[0,0],[.14,0],[.4,.8],[.8,2.2],[1.2,4.2],[1.25,5.6],[1.05,6.9],[.62,7.7],[0,8.05]].map(([r,y])=>new THREE.Vector2(r,y)),24),'#466a86',{p:[0,0,-4],r:[Math.PI/2,0,0],s:[1,.85,1]},belly('#cfe2ec')],
    [new THREE.SphereGeometry(1,16,8),'#3c5f7a',{p:[0,0,-4.3],s:[1.7,.08,.55]}],// 尾鳍
    [new THREE.SphereGeometry(.7,12,8),'#3c5f7a',{p:[-1.25,-.45,1.2],s:[1.3,.1,.5],r:[0,.5,-.3]}],[new THREE.SphereGeometry(.7,12,8),'#3c5f7a',{p:[1.25,-.45,1.2],s:[1.3,.1,.5],r:[0,-.5,.3]}],
    [new THREE.SphereGeometry(.09,8,6),'#10161c',{p:[-.86,.05,2.6]}],[new THREE.SphereGeometry(.09,8,6),'#10161c',{p:[.86,.05,2.6]}],
  ]);
  const whale=new THREE.Mesh(whaleGeo,mat('float wz=position.z;transformed.y+=sin(cT*1.1-wz*.35)*.32*smoothstep(1.5,-4.5,wz);'));whale.frustumCulled=false;whale.visible=false;world.root.add(whale);
  const W={on:false,t:0,next:-1,seen:false};

  // ================= 海星（静态，用珊瑚的颜色，和珊瑚合并成同几次绘制） =================
  {const sh=new THREE.Shape();for(let i=0;i<10;i++){const a=i/10*Math.PI*2+Math.PI/2,r=i%2?.09:.22;i?sh.lineTo(Math.cos(a)*r,Math.sin(a)*r):sh.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
    const g=new THREE.ExtrudeGeometry(sh,{depth:.05,bevelEnabled:true,bevelThickness:.03,bevelSize:.03,bevelSegments:2});g.rotateX(-Math.PI/2);
    [[-1.6,12.8,'#ff8a7a'],[5.4,10,'#ffb37a'],[-7.2,2.4,'#c58bf0'],[2.6,-4.6,'#ff8a7a'],[-4.4,-13.8,'#ffb37a'],[3.2,-43.2,'#c58bf0'],[-2.4,-50.4,'#ff8a7a'],[5.6,-65.6,'#ffb37a'],[2.2,-80.6,'#c58bf0'],[-3.4,-68.2,'#ff8a7a']].forEach(([x,z,c])=>{const m=S(world.mesh(g,world.toon(c),x,.04,z));m.rotation.y=rng()*6;m.scale.setScalar(.9+rng()*.5);m.castShadow=false;});}

  // ================= 贝壳（12 枚） =================
  const shellGeo=vc([[new THREE.SphereGeometry(.21,16,6,0,Math.PI*2,0,Math.PI/2.1),'#ffffff',{s:[1,.42,.92]},(c,P,N,i)=>{const a=Math.atan2(P.getX(i),P.getZ(i));c.multiplyScalar(.82+.18*Math.abs(Math.cos(a*7)));}],// 扇贝：带放射纹
    [new THREE.BoxGeometry(.15,.05,.08),'#ffffff',{p:[0,.01,-.2]}]]);
  const SHELLS=[{x:3,y:12.1,z:9},{x:-8.3,y:.45,z:14.6},{x:-3.2,y:.45,z:-2.1},{x:6.6,y:2.95,z:1},{x:0,y:0,z:0,carrier:'manta'},{x:-1.9,y:11.6,z:-29.5},
    {x:gA.inner.x,y:.45,z:gA.z},{x:gB.inner.x,y:.45,z:gB.z},{x:gT.inner.x,y:.45,z:gT.z},{x:7.9,y:.45,z:-54.4},{x:3.4,y:.45,z:-59.6},{x:-6.6,y:.45,z:-72.9}];
  const shellMesh=new THREE.InstancedMesh(shellGeo,new THREE.MeshToonMaterial({vertexColors:true}),SHELLS.length);shellMesh.frustumCulled=false;world.root.add(shellMesh);
  const pastel=['#ffc4d0','#ffe0a8','#c9e6ff','#ffd2b8','#e4d0ff','#c8f0dc'],cc=new THREE.Color();
  const shells=SHELLS.map((s,i)=>{shellMesh.setColorAt(i,cc.set(pastel[i%pastel.length]));return {...s,pos:V(s.x,s.y,s.z),taken:false,shrink:1};});
  let shellCount=0;

  const life={
    shells,get shellCount(){return shellCount;},shellTotal:shells.length,manta:{pos:mPos,col:mantaCol},rocks,turtle:T,anemones,crabs,whale:W,
    // 逻辑：每个固定步长一次
    update(dt,t,p,zone){
      // 鳐鱼：算出这一步的位移，交给物理（站在背上就跟着走）
      mPrev.copy(mPos);mantaAt(t,mPos,mTan);mantaCol.dx=mPos.x-mPrev.x;mantaCol.dy=mPos.y-mPrev.y;mantaCol.dz=mPos.z-mPrev.z;mantaCol.x=mPos.x;mantaCol.z=mPos.z;mantaCol.top=mPos.y+.22;mantaCol.bottom=mPos.y-.35;mantaCol.rot=-Math.atan2(mTan.x,mTan.z);
      if(!life.saidManta&&zone===2&&Math.hypot(p.x-mPos.x,p.z-mPos.z)<6){life.saidManta=true;toast('一只大鳐鱼在岸边慢慢扇着翅膀——落到它背上，它会驮你渡过海沟。',4800);}
      if(p.grounded&&p.ground===mantaCol&&!life.rodeManta){life.rodeManta=true;sfx.bounce();toast('坐稳了！大鳐鱼驮着你渡海沟——利涉大川。',3600);}
      // 海龟醒了：先浮起来，再在九四上方慢慢绕圈
      if(T.state==='wake'){T.t+=dt;const k=Math.min(1,T.t/4),e=ease(k);T.pos.lerpVectors(T.from,V(-3,8,-45),e);T.yaw=Math.PI/2+e*1.2;if(k>=1){T.state='swim';T.orbit=0;}}
      else if(T.state==='swim'){T.orbit+=dt*.18;const a=T.orbit;T.pos.set(-3+Math.sin(a)*4,8+Math.sin(t*.6)*.4,-41-Math.cos(a)*4);T.yaw=Math.atan2(Math.cos(a),Math.sin(a));}// 绕着 (-3, 8, -41) 转圈，起点正好是浮上来的位置
      // 海葵被踩
      for(const an of anemones)if(an.squish>0){an.squish+=dt*2.6;if(an.squish>=1)an.squish=0;}
      // 螃蟹：横着走；你靠近就钻进沙里，过一会儿再出来
      crabs.forEach(c=>{if(c.hide>0){c.hide-=dt;c.dig=Math.min(1,c.dig+dt*5);if(c.hide<=0)c.hide=0;}else{c.dig=Math.max(0,c.dig-dt*2);
        const near=Math.hypot(p.x-c.pos.x,p.z-c.pos.z)<2.1&&Math.abs(p.y-c.pos.y)<2;if(near&&c.dig===0){c.hide=3.5;burst(V(c.pos.x,.2,c.pos.z),{color:'#e8dcb0',n:10,speed:1.4,up:1.2,life:.5,size:.25});}}
        if(c.dig<.01){const k=(Math.sin(t*.55+c.ph)+1)/2;c.pos.lerpVectors(c.a,c.b,k);}});
      // 小章鱼：你靠近就缩回罐子
      O.shy=Math.hypot(p.x+7.4,p.z+73.6)<2.8;if(O.shy&&!O.said){O.said=true;toast('罐子里的小章鱼害羞地缩了回去。',2600);}
      // 鲸：第一次游到海沟上方时游过一次，以后每隔一段时间再来
      if(!W.on&&((zone===2&&!W.seen)||(W.next>0&&t>W.next&&zone>=1&&zone<=3))){W.on=true;W.t=0;if(!W.seen){W.seen=true;toast('头顶上，一头大鲸慢悠悠地游过……',4200);}}
      if(W.on){W.t+=dt;if(W.t>32){W.on=false;W.next=t+60;}}
      // 贝壳
      for(const s of shells){if(s.taken)continue;if(s.carrier==='manta')s.pos.set(mPos.x,mPos.y+.33,mPos.z);
        if(Math.hypot(p.x-s.pos.x,p.z-s.pos.z)<.9&&Math.abs(s.pos.y-(p.y+.46))<1.1){s.taken=true;shellCount++;sfx.pickup();burst(s.pos.clone(),{color:'#fff0e0',n:12,speed:1.8,up:1.6,gravity:-1});
          if(shellCount<shells.length)toast('拾到一枚贝壳（'+shellCount+' / '+shells.length+'）',2400);else{toast('12 枚贝壳都找齐了！小狐狸戴上了珊瑚小发卡。图鉴解锁：贝',5200);onShellsDone();}}}
    },
    onLand(col){const an=anemones.find(a=>a.col===col);if(an){an.squish=.001;bubble(an.x,.6,an.z,{n:6,spread:.6,up:1.6});}},
    // "震"：碎石、叫醒海龟
    onSlam(p){let hit=false;
      for(const r of rocks)if(!r.broken&&Math.hypot(p.x-r.g.x,p.z-r.g.z)<3.4&&p.y<3){r.broken=true;hit=true;physics.remove(r.col);r.grp.visible=false;cullable.splice(cullable.findIndex(c=>c.o===r.grp),1);
        for(let i=0;i<3;i++)burst(V(r.g.x,.6+i*.6,r.g.z),{color:'#9fbdbd',n:14,speed:3,up:2,life:.8,size:.45});bubble(r.g.x,1,r.g.z,{n:16,spread:1.4,up:1.6});toast('裂纹石被震碎了，后面是个小洞！',3200);}
      if(T.state==='sleep'&&Math.hypot(p.x-T.pos.x,p.z-T.pos.z)<3.8&&p.y<3){T.state='wake';T.t=0;T.from.copy(T.pos);hit=true;physics.remove(T.col);bubble(T.pos.x,1,T.pos.z,{n:14,spread:1.2,up:1.5});toast('大海龟被震醒了，打了个哈欠，慢悠悠地游开——它身后有个小洞。',4600);}
      return hit;},
    // 画面：每帧一次（插值后的时间）
    frame(dt,t,p){
      const pos=V(),tan=V();mantaAt(t,pos,tan);manta.position.copy(pos);manta.rotation.set(-Math.asin(Math.max(-1,Math.min(1,tan.y)))*.6,Math.atan2(tan.x,tan.z),0,'YXZ');
      if(T.state==='sleep'){turtle.position.set(T.pos.x,T.pos.y+Math.sin(t*.9)*.02,T.pos.z);turtle.rotation.y=T.yaw;if(rng()<dt*.8)bubble(T.pos.x+.4,1.2,T.pos.z+.2,{n:1,spread:.1,up:.7,life:2});/* 睡觉冒泡泡 */}
      else{turtle.position.copy(T.pos);turtle.rotation.y=T.yaw;turtle.rotation.z=Math.sin(t*1.3)*.08;}
      for(const an of anemones)if(an.squish>0||an.redraw){drawAnemone(an);an.redraw=an.squish>0;}
      crabs.forEach((c,i)=>{const w=Math.cos(t*.55+c.ph);dummy.position.set(c.pos.x,-c.dig*.32+Math.abs(Math.sin(t*9+i))*.02*(1-c.dig),c.pos.z);const dir=Math.atan2(c.b.x-c.a.x,c.b.z-c.a.z);dummy.rotation.set(0,dir+Math.PI/2,Math.sin(t*9+i)*.06*(1-c.dig));dummy.scale.setScalar(c.dig>.98?0:1);dummy.updateMatrix();crabMesh.setMatrixAt(i,dummy.matrix);});crabMesh.instanceMatrix.needsUpdate=true;
      O.peek+=((O.shy?0:1)-O.peek)*Math.min(1,dt*(O.shy?7:1.5));octo.position.y=.42+O.peek*.46+Math.sin(t*1.6)*.03*O.peek;octo.rotation.z=Math.sin(t*1.2)*.12*O.peek;octo.scale.set(1,.85+.15*O.peek,1);
      whale.visible=W.on;if(W.on){const k=W.t/32;whale.position.set(Math.sin(k*3)*1.2,10.4+Math.sin(W.t*.4)*.3,9-k*60);whale.rotation.y=Math.PI+Math.cos(k*3)*.12;}
      shells.forEach((s,i)=>{if(s.taken)s.shrink=Math.max(0,s.shrink-dt*4);const d=Math.hypot(s.pos.x-p.x,s.pos.z-p.z);dummy.position.set(s.pos.x,s.pos.y+.08+Math.sin(t*2+i)*.05+(s.taken?(1-s.shrink)*.8:0),s.pos.z);dummy.rotation.set(-.35,t*.9+i,0);dummy.scale.setScalar(d>36?0:s.shrink*(1+Math.sin(t*3+i)*.06));dummy.updateMatrix();shellMesh.setMatrixAt(i,dummy.matrix);});shellMesh.instanceMatrix.needsUpdate=true;
    },
  };
  return life;
}

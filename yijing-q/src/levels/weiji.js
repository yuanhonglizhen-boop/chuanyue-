import * as THREE from '../../vendor/three.module.js';
import {WEIJI_YAO} from '../lore.js';
import {createFox} from '../fox.js';

// 第四境 · 火水未济（第六十四卦，离上坎下）。整境在水下，水面上漂着河灯——"火在水上"。
// 六段水域依次对应未济六爻的爻辞（对应关系是本作的联想，界面里标明"原创"）：
//   初六 濡其尾：学游水（按住跳上浮，松开下沉），小狐狸带路
//   九二 曳其轮：一阵一阵的暗流往回冲，松手沉底（"拖住车轮"）、躲在车轮后面才稳
//   六三 未济征凶，利涉大川：海沟里暗流往下拖，独自游不过去；跟着鱼群（或气泡柱）渡过去
//   九四 震：空中连按两下跳，向下猛砸——震开大贝壳、吓散堵路的鱼群
//   六五 君子之光：带着光珠穿过暗洞，水母会把光珠碰掉；光珠放上石台，洞里亮起来
//   上九 濡其首：把"既济"石碑变成"未济"——整块倒过来（综）或六爻一一变过来（错），然后浮出水面
export function buildWeiji(ctx){
  const {world,kit,physics,toast,sfx,burst,scene,lights}=ctx;
  const LINES=[0,1,0,1,0,1],JIJI=[1,0,1,0,1,0];
  const SURF=14;// 水面高度
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const rng=ctx.rng;

  // ---------- 水下的光与雾 ----------
  const SKY_W={top:'#9fe3ec',mid:'#2f8ea3',bottom:'#0d3442',fog:'#2f8ea3'},SKY_A={top:'#f2b27a',mid:'#ffd9ad',bottom:'#2a7f98',fog:'#ffd9ad'};
  const U=world.skyUniforms;U.sun.value.set(0,1,0);U.sunColor.value.set('#e9fdff');
  scene.fog=new THREE.Fog(SKY_W.fog,7,50);const fogW=new THREE.Color(SKY_W.fog),fogDark=new THREE.Color('#071b22'),fogA=new THREE.Color(SKY_A.fog);
  lights.hemi.color.set('#c9f6ff');lights.hemi.groundColor.set('#1f5d6b');const HEMI=1.35,SUN=1.7;
  lights.sun.color.set('#e8fbff');lights.sun.castShadow=false;/* 水下光很散，省掉阴影那一遍绘制 */
  function setSky(above){const S=above?SKY_A:SKY_W;U.top.value.set(S.top);U.mid.value.set(S.mid);U.bottom.value.set(S.bottom);}
  setSky(false);

  // 焦散：给沙地和岩石的材质加一层游动的光纹（按世界坐标算，合并后的网格也有效）
  const cT={value:0},cK={value:1};
  function causticize(mat,k){mat.onBeforeCompile=sh=>{sh.uniforms.cT=cT;sh.uniforms.cK=cK;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCW;varying float vCN;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvCW=(modelMatrix*vec4(transformed,1.)).xyz;vCN=normalize(mat3(modelMatrix)*objectNormal).y;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCW;varying float vCN;uniform float cT;uniform float cK;\nfloat cau(vec2 p){float v=sin(p.x*1.7+cT*1.1)+sin(p.y*1.5-cT*1.3)+sin((p.x+p.y)*1.2+cT*.8)+sin((p.x-p.y)*1.9-cT);return pow(max(0.,1.-abs(v)*.8),9.);}')
      .replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.rgb+=vec3(.7,.95,1.)*cau(vCW.xz*.9)*cK*'+k.toFixed(2)+'*smoothstep(.2,.9,vCN);');};
    mat.customProgramCacheKey=()=>'caustic'+k;return mat;}
  const SAND='#d8c99e',SAND2='#cbb98c',ROCK='#5f8d8f',ROCK2='#4a7275',DARK='#3b5c60';
  causticize(world.toon(SAND),.32);causticize(world.toon(SAND2),.32);causticize(world.toon(ROCK),.2);causticize(world.toon(ROCK2),.2);

  // ---------- 地形 ----------
  const S=world.markStatic;
  const cullable=[];// 远处的小物件不画（雾里本来也看不清），省绘制次数
  // 平整的海床（盒子），厚一点，在海沟两侧就是悬崖
  function floor(z0,z1,{h=1.2,color=SAND}={}){const b=world.box({x:0,z:(z0+z1)/2,w:23,d:Math.abs(z0-z1),top:0,h,color});S(b.body);return b;}
  floor(25,1);floor(1,-15,{h:20});floor(-35,-51.5,{h:20,color:SAND2});floor(-51.5,-67,{color:SAND2});floor(-67,-82,{color:SAND});
  // 两侧峭壁 + 尽头的石壁（物理是长方体，外观是一串大石块）
  function cliffRocks(x,z0,z1){for(let z=z0;z>z1;z-=3.2){for(const [y,k] of [[2.5,1],[8.5,1.1],[13.8,.9]]){const m=S(world.mesh(new THREE.DodecahedronGeometry(2.6,0),world.toon(rng()<.5?ROCK:ROCK2),x+(rng()-.5)*.6,y+(rng()-.5)*1.4,z+(rng()-.5)*1.2));m.scale.set(1.3,1.35*k,1.25);m.rotation.set(rng()*3,rng()*3,rng()*3);m.castShadow=false;}}}
  for(const s of [-1,1]){physics.add({kind:'box',x:s*11.6,z:-29,hw:2.2,hd:56,top:40,bottom:-40,safe:false,noGround:true,camBlock:true});cliffRocks(s*12.5,26,-83);}
  physics.add({kind:'box',x:0,z:25.6,hw:14,hd:1.2,top:40,bottom:-40,safe:false,noGround:true,camBlock:true});
  physics.add({kind:'box',x:0,z:-83,hw:14,hd:1.2,top:40,bottom:-40,safe:false,noGround:true,camBlock:true});
  for(let x=-10;x<=10;x+=3.4){for(const [z,y] of [[26.4,3],[26.4,9.5],[26.4,14],[-84,3],[-84,9.5],[-84,14]]){const m=S(world.mesh(new THREE.DodecahedronGeometry(2.7,0),world.toon(rng()<.5?ROCK:ROCK2),x,y,z));m.scale.set(1.3,1.4,1.1);m.rotation.set(rng()*3,rng()*3,0);m.castShadow=false;}}
  // 海沟的底：看不见底的深蓝
  {const m=S(world.mesh(new THREE.PlaneGeometry(26,24),new THREE.MeshBasicMaterial({color:'#0b2a35'}),0,-15,-25));m.rotation.x=-Math.PI/2;m.castShadow=false;}
  // 墙：box 物理 + 外观
  function wall({x,z,w,d,top,bottom=-1,color=ROCK2}){const h=top-bottom;const b=world.box({x,z,w,d,top,h,color});b.col.camBlock=true;S(b.body);b.body.castShadow=false;return b;}
  wall({x:0,z:1,w:20,d:1.4,top:2.6});// 初六 → 九二：要游上去才能翻过
  for(let x=-9;x<=9;x+=2.6){const m=S(world.mesh(new THREE.DodecahedronGeometry(.8,0),world.toon(ROCK),x,2.5,1));m.scale.set(1.3,.6,1);m.rotation.y=rng()*3;}
  // 九四 → 六五：石壁中间一道窄缝（被鱼群堵着）
  wall({x:-6.25,z:-51.5,w:10.1,d:1.4,top:14.6});wall({x:6.25,z:-51.5,w:10.1,d:1.4,top:14.6});wall({x:0,z:-51.5,w:2.6,d:1.4,top:14.6,bottom:4.6});
  // 六五：暗洞（顶在 5 米高）
  const roof=wall({x:0,z:-59.3,w:23,d:14.4,top:14.6,bottom:5,color:DARK});
  // 洞底的石门（光珠放上石台后升起）
  wall({x:-5.8,z:-67,w:8.4,d:1.4,top:14.6,color:DARK});wall({x:5.8,z:-67,w:8.4,d:1.4,top:14.6,color:DARK});wall({x:0,z:-67,w:3.2,d:1.4,top:14.6,bottom:4.2,color:DARK});
  const doorCol=physics.add({kind:'box',x:0,z:-67,hw:1.6,hd:.6,top:4.2,bottom:-1,safe:false,camBlock:true});
  const door=world.mesh(new THREE.BoxGeometry(3.2,4.2,.9),world.toon('#7e6f5a'),0,2.1,-67);
  {const hb=kit.hexBars(LINES,{w:1.6,h:.16,d:.05,gap:.55,color:'#ffe9a8'});hb.position.set(0,-.07,.47);door.add(hb);}// 门上刻着未济

  // ---------- 水面、河灯、光柱 ----------
  const surfMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:true,uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{t:{value:0}}]),
    vertexShader:'#include <fog_pars_vertex>\nvarying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
    fragmentShader:'#include <fog_pars_fragment>\nuniform float t;varying vec3 vW;void main(){float n=sin(vW.x*.8+t*1.2)*sin(vW.z*.6-t*.9)+.5*sin((vW.x-vW.z)*1.7+t*1.7);float fire=smoothstep(.82,1.,sin(vW.x*.33+t*.4)*sin(vW.z*.27-t*.3));vec4 c;'+
      'if(gl_FrontFacing){c=vec4(mix(vec3(.12,.45,.55),vec3(.4,.75,.82),.5+.3*n),.88);c.rgb=mix(c.rgb,vec3(1.,.7,.35),fire*.45);}'+
      'else{c=vec4(mix(vec3(.5,.86,.93),vec3(.96,1.,1.),smoothstep(.5,1.4,n)),.72);c.rgb=mix(c.rgb,vec3(1.,.62,.25),fire*.75);}gl_FragColor=c;\n#include <fog_fragment>\n}'});
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(30,108),surfMat);surface.rotation.x=-Math.PI/2;surface.position.set(0,SURF,-32);surface.renderOrder=3;scene.add(surface);
  // 河灯：莲花灯座 + 火苗（两组实例，各一次绘制）
  const NL=14,lampSpots=[];for(let i=0;i<NL;i++)lampSpots.push({x:(rng()-.5)*15,z:16-i*7-rng()*3,ph:rng()*6});lampSpots.push({x:3.4,z:-75.5,ph:1},{x:9,z:-75.4,ph:2.4});
  const lotusGeo=new THREE.ConeGeometry(.42,.32,8,1,true);lotusGeo.rotateX(Math.PI);lotusGeo.translate(0,.12,0);
  const lotus=new THREE.InstancedMesh(lotusGeo,new THREE.MeshToonMaterial({color:'#ffd3dc',side:THREE.DoubleSide,emissive:'#7a3346',emissiveIntensity:.4}),lampSpots.length);
  const flameGeo=new THREE.ConeGeometry(.12,.38,8);flameGeo.translate(0,.42,0);
  const flames=new THREE.InstancedMesh(flameGeo,new THREE.MeshBasicMaterial({color:'#ffb347'}),lampSpots.length);
  lotus.frustumCulled=flames.frustumCulled=false;scene.add(lotus,flames);
  const dummy=new THREE.Object3D();
  function updateLamps(t){lampSpots.forEach((s,i)=>{dummy.position.set(s.x+Math.sin(t*.13+s.ph)*.8,SURF+Math.sin(t*1.3+s.ph)*.05,s.z+Math.cos(t*.11+s.ph)*.6);dummy.rotation.set(Math.sin(t+s.ph)*.06,t*.2+s.ph,0);dummy.scale.setScalar(1);dummy.updateMatrix();lotus.setMatrixAt(i,dummy.matrix);dummy.scale.set(1,1+Math.sin(t*9+s.ph)*.12,1);dummy.updateMatrix();flames.setMatrixAt(i,dummy.matrix);});lotus.instanceMatrix.needsUpdate=flames.instanceMatrix.needsUpdate=true;}
  // 光柱：从水面斜照下来的几道光（合并成一个网格）
  {const m=new THREE.MeshBasicMaterial({color:'#e6fcff',transparent:true,opacity:.07,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    for(const [x,z] of [[-4,18],[3,10],[-3,3],[-2,-6],[5,-24],[-5,-30],[2,-42],[-3,-74],[3,-79]]){const c=S(world.mesh(new THREE.ConeGeometry(2.4,14,12,1,true),m,x,SURF-7,z));c.rotation.z=.12;c.castShadow=c.receiveShadow=false;}}

  // ---------- 海草（一次绘制，顶点着色器里摆动） ----------
  {const geo=new THREE.PlaneGeometry(.32,1,1,6);geo.translate(0,.5,0);const mat=new THREE.MeshToonMaterial({color:'#ffffff',side:THREE.DoubleSide});
    mat.onBeforeCompile=sh=>{sh.uniforms.cT=cT;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float cT;').replace('#include <begin_vertex>','#include <begin_vertex>\nfloat ph=instanceMatrix[3].x*.7+instanceMatrix[3].z*.45;transformed.x+=sin(cT*1.4+ph+position.y*2.)*.35*position.y*position.y;transformed.z+=cos(cT*1.1+ph)*.15*position.y;');};
    mat.customProgramCacheKey=()=>'kelp';
    const spots=[];const add=(x,z,n,y=0)=>{for(let i=0;i<n;i++)spots.push([x+(rng()-.5)*1.6,y,z+(rng()-.5)*1.6]);};
    [[-8,14],[8,12],[-7.5,5],[7.8,3],[-8,-2],[8,-6],[-8.4,-12],[8.4,-13],[-7.6,-38],[8,-44],[-8,-48],[7.6,-70],[-7.8,-79],[8.6,-37.5]].forEach(([x,z])=>add(x,z,5));
    const kelp=new THREE.InstancedMesh(geo,mat,spots.length);const col=new THREE.Color();
    spots.forEach(([x,y,z],i)=>{const h=2.4+rng()*3.4;dummy.position.set(x,y,z);dummy.rotation.set(0,rng()*3,0);dummy.scale.set(1,h,1);dummy.updateMatrix();kelp.setMatrixAt(i,dummy.matrix);kelp.setColorAt(i,col.set(rng()<.5?'#4fae7c':'#7bc47a'));});
    kelp.frustumCulled=false;world.root.add(kelp);}
  // 珊瑚（静态，按颜色合并）
  function coral(x,z,color,s=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);world.root.add(g);const m=world.toon(color);
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2+rng(),h=.6+rng()*.9;const c=S(world.mesh(new THREE.CylinderGeometry(.07,.12,h,6),m,Math.cos(a)*.18,h/2,Math.sin(a)*.18,g));c.rotation.set(Math.sin(a)*.5,0,Math.cos(a)*.5);
      const tip=S(world.mesh(new THREE.SphereGeometry(.13,8,6),m,Math.cos(a)*(.18+h*.45),h*.92,Math.sin(a)*(.18+h*.45),g));tip.castShadow=false;}}
  function brain(x,z,color,r=.6){const m=S(world.mesh(new THREE.SphereGeometry(r,14,10),world.toon(color),x,r*.35,z));m.scale.y=.65;}
  [[-6,15,'#ff8a7a'],[6.5,9,'#ffb37a'],[-4,4,'#c58bf0'],[7,-3,'#ff8a7a'],[-7,-9,'#ffb37a'],[6.5,-38,'#c58bf0'],[-6.6,-45,'#ff8a7a'],[6,-49,'#ffb37a'],[-6,-70.5,'#c58bf0'],[-7.5,-73,'#ff8a7a']].forEach(([x,z,c])=>coral(x,z,c,1+rng()*.5));
  [[5.6,16,'#f5a3b5'],[-3,9.5,'#ffd27a'],[5,-12,'#f5a3b5'],[-5,-40.5,'#ffd27a'],[2.4,-48.6,'#f5a3b5'],[-4,-77,'#ffd27a']].forEach(([x,z,c])=>brain(x,z,c));
  [[-5.5,12],[5,6],[-6,-4],[6,-10.5],[-7,-43],[7.2,-46],[-7.6,-57],[7.4,-64],[-6.8,-80]].forEach(([x,z])=>world.rock(x,0,z,1+rng()*.6,rng()<.5?ROCK:ROCK2));

  // ---------- 气泡（一个 Points，一次绘制） ----------
  const NB=260,NAMB=200;const bPos=new Float32Array(NB*3),bVel=new Float32Array(NB*3),bLife=new Float32Array(NB);
  const bubTex=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=3;g.beginPath();g.arc(16,16,11,0,Math.PI*2);g.stroke();g.fillStyle='rgba(255,255,255,.35)';g.fill();g.fillStyle='#fff';g.beginPath();g.arc(12,11,3,0,Math.PI*2);g.fill();return new THREE.CanvasTexture(c);})();
  const bGeo=new THREE.BufferGeometry();bGeo.setAttribute('position',new THREE.BufferAttribute(bPos,3));
  const bubbles=new THREE.Points(bGeo,new THREE.PointsMaterial({map:bubTex,size:.22,transparent:true,depthWrite:false,opacity:.8,color:'#e8fdff'}));bubbles.frustumCulled=false;scene.add(bubbles);
  const ambSpawn=(i,anyY)=>{bPos[i*3]=(rng()-.5)*18;bPos[i*3+2]=17-rng()*99;const z=bPos[i*3+2];const floorY=z<-15&&z>-35?-12:0;bPos[i*3+1]=anyY?floorY+rng()*(SURF-floorY):floorY;bVel[i*3]=0;bVel[i*3+1]=.4+rng()*.7;bVel[i*3+2]=0;};
  for(let i=0;i<NAMB;i++)ambSpawn(i,true);for(let i=NAMB;i<NB;i++){bPos[i*3+1]=-999;bLife[i]=0;}
  let bNext=NAMB;
  function bubble(x,y,z,{n=1,spread=.3,up=1.2,vx=0,vz=0,life=1.6}={}){for(let k=0;k<n;k++){const i=bNext;bNext=bNext+1>=NB?NAMB:bNext+1;bPos[i*3]=x+(rng()-.5)*spread;bPos[i*3+1]=y+(rng()-.5)*spread;bPos[i*3+2]=z+(rng()-.5)*spread;bVel[i*3]=vx+(rng()-.5)*.6;bVel[i*3+1]=up*(.6+rng()*.6);bVel[i*3+2]=vz+(rng()-.5)*.6;bLife[i]=life*(.7+rng()*.5);}}

  // ---------- 鱼 ----------
  // ---------- 卡通鱼：纺锤形身子、叉尾、背鳍、大眼睛；背深腹浅，侧身对着镜头时闪一道银光，尾巴摆 ----------
  // 每个顶点带一个 aFish：x = 部位（0 身子 / 1 眼睛 / 2 眼睛高光 / 3 鳍），y = 腹部程度（0 背 → 1 肚子）。一种鱼一次绘制
  const fishGeo=(()=>{const parts=[];
    const prof=[[0,-.3],[.035,-.27],[.06,-.2],[.105,-.08],[.125,.02],[.11,.11],[.075,.18],[.03,.215],[0,.225]].map(([r,y])=>new THREE.Vector2(r,y));
    const body=new THREE.LatheGeometry(prof,14);body.rotateX(Math.PI/2);body.scale(.58,1,1);parts.push([body,0,true]);// 身子：沿 z 轴，头朝 +z，左右压扁
    const tailS=new THREE.Shape();tailS.moveTo(0,0);tailS.quadraticCurveTo(.1,.05,.19,.13);tailS.quadraticCurveTo(.14,0,.19,-.13);tailS.quadraticCurveTo(.1,-.05,0,0);
    const tail=new THREE.ShapeGeometry(tailS,6);tail.rotateY(Math.PI/2);tail.translate(0,0,-.26);parts.push([tail,3]);
    const finS=new THREE.Shape();finS.moveTo(-.09,0);finS.quadraticCurveTo(-.02,.1,.06,.09);finS.lineTo(.08,0);finS.lineTo(-.09,0);
    const fin=new THREE.ShapeGeometry(finS,4);fin.rotateY(-Math.PI/2);fin.translate(0,.11,-.01);parts.push([fin,3]);
    for(const sx of [-1,1]){const e=new THREE.SphereGeometry(.03,8,6);e.translate(sx*.058,.035,.12);parts.push([e,1]);const h=new THREE.SphereGeometry(.011,6,4);h.translate(sx*.082,.046,.135);parts.push([h,2]);}
    let n=0;const flat=parts.map(([g,part,belly])=>{const f=g.index?g.toNonIndexed():g;n+=f.attributes.position.count;return [f,part,belly];});
    const pos=new Float32Array(n*3),nor=new Float32Array(n*3),fa=new Float32Array(n*2);let o=0;
    for(const [g,part,belly] of flat){const P=g.attributes.position,N=g.attributes.normal;for(let k=0;k<P.count;k++,o++){pos.set([P.getX(k),P.getY(k),P.getZ(k)],o*3);nor.set([N.getX(k),N.getY(k),N.getZ(k)],o*3);fa[o*2]=part;fa[o*2+1]=belly?THREE.MathUtils.clamp(.45-P.getY(k)/.17,0,1):.4;}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('aFish',new THREE.BufferAttribute(fa,2));geo.computeBoundingSphere();return geo;})();
  const fishMat=new THREE.MeshToonMaterial({color:'#ffffff',side:THREE.DoubleSide});
  fishMat.onBeforeCompile=sh=>{sh.uniforms.cT=cT;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 aFish;varying vec2 vFish;uniform float cT;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvFish=aFish;\n#ifdef USE_INSTANCING\nfloat ph=instanceMatrix[3].x*1.7+instanceMatrix[3].z*1.3+instanceMatrix[3].y;\n#else\nfloat ph=0.;\n#endif\nfloat sw=sin(cT*11.+ph);transformed.x+=sw*.09*smoothstep(.06,-.45,position.z);transformed.x+=sw*.015;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vFish;')
      .replace('#include <color_fragment>','#include <color_fragment>\nvec3 inst=diffuseColor.rgb;vec3 fc=mix(inst*.55,mix(inst,vec3(1.),.6),vFish.y);if(vFish.x>.5&&vFish.x<1.5)fc=vec3(.05,.06,.08);else if(vFish.x>1.5&&vFish.x<2.5)fc=vec3(1.);else if(vFish.x>2.5)fc=mix(inst,vec3(1.),.3);diffuseColor.rgb=fc;')
      .replace('#include <opaque_fragment>','{vec3 vd=normalize(vViewPosition);float fd=abs(dot(normalize(normal),vd));float body=step(vFish.x,.5);outgoingLight+=vec3(.85,.95,1.)*pow(fd,10.)*.55*body;outgoingLight+=vec3(.7,.9,1.)*pow(1.-fd,3.)*.22*body;}\n#include <opaque_fragment>');};/* 银光：侧身正对镜头时亮；亮边：轮廓处微亮 */
  fishMat.customProgramCacheKey=()=>'toonfish';
  const lureMat=new THREE.MeshBasicMaterial({color:'#fff6b8'});
  function school(n,color,{scale=1,lure=false}={}){const m=new THREE.InstancedMesh(fishGeo,fishMat,n);m.frustumCulled=false;world.root.add(m);
    const lm=lure?new THREE.InstancedMesh(new THREE.SphereGeometry(.04,8,6),lureMat,n):null;if(lm){lm.frustumCulled=false;world.root.add(lm);}
    const c=new THREE.Color(),fish=[];for(let i=0;i<n;i++){m.setColorAt(i,c.set(color).offsetHSL((rng()-.5)*.04,0,(rng()-.5)*.1));fish.push({s:rng(),off:V((rng()-.5)*1.6,(rng()-.5)*1.2,(rng()-.5)*1.6),ph:rng()*6,sc:scale*(.8+rng()*.5),pos:V(),vel:V(0,0,1)});}
    return {mesh:m,lure:lm,fish,set(i,pos,dir,sc){const f=fish[i];f.pos.copy(pos);dummy.position.copy(pos);dummy.lookAt(pos.x+dir.x,pos.y+dir.y,pos.z+dir.z);dummy.scale.setScalar(sc??f.sc);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);
        if(lm){dummy.translateZ(.26*(sc??f.sc));dummy.translateY(.13*(sc??f.sc));dummy.scale.setScalar(1+Math.sin(cT.value*4+i)*.15);dummy.updateMatrix();lm.setMatrixAt(i,dummy.matrix);}},/* 灯笼鱼：头前一根须挂着发光小球 */
      done(){m.instanceMatrix.needsUpdate=true;if(lm)lm.instanceMatrix.needsUpdate=true;}};}

  // 六三：鱼群航道。左边一道往前（渡海沟），绕到海沟深处再折回来
  const laneFwd=[V(-3.6,2.4,-13.2),V(-4.6,4.6,-18.5),V(-3,6.2,-25),V(-4.4,4.8,-31),V(-3.4,2.6,-36.8)];
  const laneCurve=new THREE.CatmullRomCurve3(laneFwd);
  const loopCurve=new THREE.CatmullRomCurve3([...laneFwd,V(-1,1.2,-37.6),V(2.5,-2,-34),V(4.5,-4,-29),V(4,-5,-24),V(3.5,-3.5,-18),V(1,-1,-15.8),V(-2.5,1.6,-14.4)],true);
  const LANE_N=90,laneSamples=[];for(let i=0;i<=LANE_N;i++){const u=i/LANE_N;laneSamples.push({p:laneCurve.getPointAt(u),t:laneCurve.getTangentAt(u)});}
  const loopLen=loopCurve.getLength(),FISH_SPEED=5.2;
  const laneSchool=school(70,'#8fbcdf',{scale:1});
  // 鱼群在航道里的位置：返回 {d, i}（离航道中心多远、最近的采样点）
  function laneNear(x,y,z){let best=1e9,bi=0;for(let i=0;i<laneSamples.length;i++){const s=laneSamples[i].p,d=(s.x-x)**2+(s.y-y)**2+(s.z-z)**2;if(d<best){best=d;bi=i;}}return {d:Math.sqrt(best),i:bi};}
  const columns=[{x:3.4,z:-21,r:1.35},{x:2.4,z:-29.5,r:1.35}];// 气泡柱：往上托

  // 九四：堵在石缝里的鱼群
  const crack={pos:V(0,2.2,-51.5),col:physics.add({kind:'cyl',x:0,z:-51.5,r:1.7,top:4.6,bottom:-1,safe:false}),scattered:false,t:0,home:V(-6.5,7.5,-46)};
  const crackSchool=school(48,'#ffa24a',{scale:.9});
  // 远处游来游去的小鱼群（纯装饰）
  const deco=[{c:V(0,8,6),r:5,sp:.35},{c:V(1,9,-44),r:4,sp:-.4},{c:V(-1,9,-74),r:4.5,sp:.3}].map((d,k)=>({...d,s:school(24,['#ff8a6a','#7fc6f2','#ffd36a'][k],{scale:.8})}));

  // ---------- 车轮（九二 曳其轮） ----------
  const wheels=[[-3.2,-3.4],[3.4,-7.6],[-1.8,-11.6]].map(([x,z])=>{const g=new THREE.Group();g.position.set(x,1.25,z);g.rotation.z=.12*(x>0?1:-1);world.root.add(g);const wood=world.toon('#9a7650'),dark=world.toon('#6d5238');
    S(world.mesh(new THREE.TorusGeometry(1.35,.2,8,24),wood,0,0,0,g));S(world.mesh(new THREE.CylinderGeometry(.3,.3,.5,10),dark,0,0,0,g)).rotation.x=Math.PI/2;
    for(let i=0;i<8;i++){const sp=S(world.mesh(new THREE.CylinderGeometry(.06,.06,1.3,5),dark,0,0,0,g));sp.rotation.z=i/8*Math.PI;}
    const col=physics.add({kind:'box',x,z,hw:1.45,hd:.32,top:2.75,bottom:-1,safe:true});return {x,z,col};});

  // ---------- 大贝壳（九四 震） ----------
  const shellOut=world.toon('#f2c5bd'),shellIn=new THREE.MeshToonMaterial({color:'#fff4f0',emissive:'#5a3c48',emissiveIntensity:.3,side:THREE.DoubleSide});
  const halfGeo=new THREE.SphereGeometry(1.3,20,8,0,Math.PI*2,0,Math.PI/2);
  function clam(x,z,content){const g=new THREE.Group();g.position.set(x,0,z);world.root.add(g);
    const bottom=S(world.mesh(halfGeo,shellOut,0,.36,0,g));bottom.scale.set(1,.32,1);bottom.rotation.x=Math.PI;
    const hinge=new THREE.Group();hinge.position.set(0,.36,-1.2);g.add(hinge);
    const top=world.mesh(halfGeo,shellOut,0,0,1.2,hinge);top.scale.set(1,.42,1);
    const inner=new THREE.Mesh(new THREE.CircleGeometry(1.22,24),shellIn);inner.rotation.x=Math.PI/2;inner.position.set(0,-.01,1.2);hinge.add(inner);
    const col=physics.add({kind:'cyl',x,z,r:1.25,top:.92,bottom:-1,safe:true});
    return {x,z,group:g,hinge,col,open:false,t:0,content,pos:V(x,0,z)};}
  const clams=[clam(-4.6,-40.2,'gem'),clam(4.6,-41.4,'gem'),clam(0,-46.6,'pearl')];

  // ---------- 光珠（六五 君子之光） ----------
  const pearl={state:'clam',pos:V(0,.55,-46.6),home:V(0,.55,-46.6),group:new THREE.Group()};
  {const core=new THREE.Mesh(new THREE.SphereGeometry(.26,18,14),new THREE.MeshBasicMaterial({color:'#fff6d8'}));pearl.group.add(core);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:bubTex,color:'#ffe9a8',transparent:true,opacity:.0,depthWrite:false,blending:THREE.AdditiveBlending}));glow.scale.setScalar(1.6);pearl.group.add(glow);pearl.glow=glow;
    const halo=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,240,190,1)');gr.addColorStop(.35,'rgba(255,220,140,.45)');gr.addColorStop(1,'rgba(255,220,140,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
    glow.material.map=halo;glow.material.opacity=.9;
    world.root.add(pearl.group);pearl.group.position.copy(pearl.pos);pearl.group.visible=false;}
  const pearlLight=new THREE.PointLight('#ffe3a3',0,11,1.4);scene.add(pearlLight);// 始终在场景里（只改亮度），避免切换时重新编译材质
  const altarLight=new THREE.PointLight('#ffe3a3',0,22,1.2);altarLight.position.set(0,3,-64.2);scene.add(altarLight);

  // ---------- 暗洞：水母、灯笼鱼、石台 ----------
  const jellyDefs=[{c:V(-3.6,2.2,-56),r:1.3,sp:.5},{c:V(3.4,1.8,-59.6),r:1.6,sp:-.45},{c:V(-1.2,2.6,-63),r:1.2,sp:.6}];
  const bellGeo=new THREE.SphereGeometry(.5,16,8,0,Math.PI*2,0,Math.PI/2);bellGeo.scale(1,.75,1);
  const bells=new THREE.InstancedMesh(bellGeo,new THREE.MeshBasicMaterial({color:'#ffb3e6',transparent:true,opacity:.72,side:THREE.DoubleSide,depthWrite:false}),jellyDefs.length);
  const tentGeo=new THREE.CylinderGeometry(.025,.01,1,4);tentGeo.translate(0,-.5,0);
  const tents=new THREE.InstancedMesh(tentGeo,new THREE.MeshBasicMaterial({color:'#ffd6f0',transparent:true,opacity:.6,depthWrite:false}),jellyDefs.length*5);
  bells.frustumCulled=tents.frustumCulled=false;world.root.add(bells,tents);
  const jellies=jellyDefs.map((d,i)=>({...d,a:i*2,pos:d.c.clone(),cd:0}));
  function jellyPos(j,i,t){const a=i*2+t*j.sp;j.pos.set(j.c.x+Math.cos(a)*j.r,j.c.y+Math.sin(t*1.7+i)*.45,j.c.z+Math.sin(a)*j.r);}
  const tmp=V(),tan=V(),altarTop=V(0,1.6,-64.2),tmp2=V(),foxTgt=V(),foxLook=V();
  const lanterns=school(9,'#3e5468',{scale:.7,lure:true});const lanternHome=V(6.6,2,-55);let lanternMode='home';
  lanterns.fish.forEach(f=>{f.pos.copy(lanternHome).add(f.off);});
  // 洞壁上的"光苔"：只有被光照到时才看得见（卡通材质，暗处几乎是黑的）
  {const m=world.toon('#d9ffcf',{emissive:'#000000'});for(const [x,y,z] of [[-8.9,2.4,-54],[-8.9,3,-58.5],[8.9,2.6,-61],[8.9,1.8,-56.5],[-8.9,1.6,-64]]){const b=S(world.mesh(new THREE.SphereGeometry(.35,10,8),m,x,y,z));b.scale.set(.35,1,1.4);b.castShadow=false;}}
  const altar=new THREE.Group();altar.position.set(0,0,-64.2);world.root.add(altar);
  S(world.mesh(new THREE.CylinderGeometry(.75,.95,.9,14),world.toon('#d9d0b8'),0,.45,0,altar));S(world.mesh(new THREE.TorusGeometry(.5,.07,6,20),world.toon('#b39a5c'),0,.92,0,altar)).rotation.x=Math.PI/2;
  physics.add({kind:'cyl',x:0,z:-64.2,r:.85,top:.92,bottom:-1,safe:true});
  let caveLit=false,dark=0;

  // ---------- 石碑：既济 → 未济（上九） ----------
  const tab={lines:JIJI.slice(),flipping:0,solved:false,method:null,last:null,demo:-1,pos:V(0,0,-78)};
  const tabG=new THREE.Group();tabG.position.set(0,0,-78);world.root.add(tabG);
  S(world.mesh(new THREE.BoxGeometry(3.4,.5,1.4),world.toon('#b8b29d'),0,.25,0,tabG));
  const slab=new THREE.Group();slab.position.y=2.75;tabG.add(slab);
  world.mesh(new THREE.BoxGeometry(2.6,4.2,.5),world.toon('#d6d0bb'),0,0,0,slab);
  const face=new THREE.Group();face.position.z=.27;slab.add(face);
  physics.add({kind:'box',x:0,z:-78,hw:1.7,hd:.7,top:4.9,bottom:-1,safe:false});
  const barCol={yang:'#3d5f5a',flash:'#ffcf6e'};
  function drawTab(flash=-1){face.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});face.clear();const hb=kit.hexBars(tab.lines,{w:1.7,h:.26,d:.06,gap:.6,color:barCol.yang});face.add(hb);
    if(flash>=0){const b=kit.flatten(kit.yaoBar(tab.lines[flash],{w:1.74,h:.3,d:.07,color:barCol.flash}));b.position.set(0,-1.5+flash*.6,.01);face.add(b);}}
  drawTab();
  // 六块"变爻石"：自左向右为初、二、三、四、五、上
  const POS=['初','二','三','四','五','上'];
  const toggles=POS.map((name,k)=>{const a=(-75+k*30)*Math.PI/180,x=Math.sin(a)*4.6,z=-78+Math.cos(a)*4.6;
    const s=world.stone({x,z,r:.75,top:.45,color:'#e3dccb'});s.group.children.forEach(S);
    const bar=new THREE.Group();bar.position.set(x,1.25,z);world.root.add(bar);
    const lab=kit.label(name,{x:x,y:2.15,z:z,size:.55,color:'#2f4a45'});cullable.push({o:lab,p:V(x,0,z),r:26});cullable.push({o:bar,p:V(x,0,z),r:30});
    return {k,name,x,z,pos:V(x,.45,z),bar,flash:0};});
  function drawToggleBars(){toggles.forEach(t=>{t.bar.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});t.bar.clear();t.bar.add(kit.flatten(kit.yaoBar(tab.lines[t.k],{w:.9,h:.14,d:.08,color:'#fff4d2'})));});}
  drawToggleBars();
  // 相应：三道光把初—四、二—五、三—上连起来
  const arcs=[[0,3,-1],[1,4,1],[2,5,-1.4]].map(([a,b,side])=>{const y0=-1.5+a*.6,y1=-1.5+b*.6,x0=side*.95;
    const curve=new THREE.QuadraticBezierCurve3(V(x0,y0,.05),V(side*2.1,(y0+y1)/2,.25),V(x0,y1,.05));
    const geo=new THREE.TubeGeometry(curve,32,.06,6,false);const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:'#ffe08a'}));m.visible=false;face.parent.add(m);m.position.z=.27;geo.setDrawRange(0,0);return {m,geo,count:geo.index.count,t:0};});
  function linesName(l){return l.join()===JIJI.join()?'既济':l.join()===LINES.join()?'未济':null;}

  // ---------- 小岛、卦门 ----------
  const islet=world.stone({x:7,z:-78.6,r:3,top:SURF+.8,h:SURF+2,color:'#7d9a8c'});islet.group.children.forEach(S);
  {const m=world.mesh(new THREE.CylinderGeometry(2.95,2.95,.12,24),world.toon('#9fd38a'),7,SURF+.82,-78.6);S(m);}
  world.meadow([{x:7,z:-78.6,r:2.6,top:SURF+.8}],90,['#8bcc77','#a3d98c'],['#ffd1dc','#fff3b0']);
  const gate=kit.gate({x:7,z:-78.6,top:SURF+.8,lines:LINES,facing:Math.PI/2});
  const stele=kit.stele({x:3.2,z:13.6,top:0,lines:LINES,facing:-.5});
  cullable.push({o:tabG,p:V(0,0,-78),r:40},{o:door,p:V(0,0,-67),r:34},{o:gate.group,p:V(7,0,-78.6),r:45},{o:stele.group,p:V(3.2,0,13.6),r:36},{o:bells,p:V(0,0,-59.6),r:30},{o:tents,p:V(0,0,-59.6),r:30},{o:lanterns.mesh,p:V(4,0,-58),r:32},{o:lanterns.lure,p:V(4,0,-58),r:32},{o:crackSchool.mesh,p:V(0,0,-50),r:34},{o:altar,p:V(0,0,-64.2),r:30},{o:pearl.group,p:pearl.pos,r:34});
  for(const c of clams)cullable.push({o:c.hinge,p:c.pos,r:34});deco.forEach(d=>cullable.push({o:d.s.mesh,p:d.c,r:36}));

  // ---------- 爻辞石标（每段水域入口） ----------
  const markers=[[-2.6,10.6],[-5.6,-.6],[-6.4,-13.6],[-2.6,-37.4],[2.6,-53.4],[-2.8,-68.8]].map(([x,z],k)=>{const s=world.stone({x,z,r:.45,top:1.1,h:1.1,color:'#d9d2bd'});s.group.children.forEach(S);const lab=kit.label(WEIJI_YAO[k].name.slice(0,1)==='初'||WEIJI_YAO[k].name.slice(0,1)==='上'?WEIJI_YAO[k].name.slice(0,1):WEIJI_YAO[k].name.slice(1),{x,y:1.75,z,size:.55,color:'#5b4a1e'});cullable.push({o:lab,p:V(x,0,z),r:24});return {k,pos:V(x,1.1,z)};});

  // ---------- 爻玉 ----------
  const ledge=world.stone({x:-4.6,z:6.4,r:1.1,top:3.6,h:3.6,color:ROCK});ledge.group.children.forEach(S);
  const gems=[
    kit.gem({x:-4.6,y:4.5,z:6.4,id:'ledge'}),
    kit.gem({x:3.4,y:3.6,z:-7.6,id:'wheel'}),
    kit.gem({x:-3,y:6.2,z:-25,id:'lane'}),
    kit.gem({x:-4.6,y:1.5,z:-40.2,id:'clamA'}),
    kit.gem({x:4.6,y:1.5,z:-41.4,id:'clamB'}),
    kit.gem({x:-7.4,y:.9,z:-65.2,id:'cave'}),
  ];
  // 藏着的爻玉：拿不到也看不见，直到条件满足
  const hidden=new Map();function hide(g){hidden.set(g,g.pos.y);g.pos.y=-999;g.group.visible=false;}function reveal(g){if(!hidden.has(g))return;g.pos.y=hidden.get(g);hidden.delete(g);g.group.visible=true;}
  hide(gems[3]);hide(gems[4]);hide(gems[5]);

  // ---------- 小狐狸：全程跟着游 ----------
  const fox=createFox({world,envMap:ctx.envMap});scene.add(fox.root);
  fox.pos.set(-1.4,1,14.6);fox.root.position.copy(fox.pos);

  // ---------- 状态 ----------
  let foxIdle=0,foxGems=0,ramp=0,now=0,zone=0,seen=new Set([0]),surge=0,surgeOn=false,firstSurge=true,slamOk=false,hintAt=-9,above=false,ended=false,welcomeT=1.2,lastJellyHint=-9;
  const zoneOf=z=>z>1?0:z>-14.6?1:z>-35.6?2:z>-52.2?3:z>-67.2?4:5;
  const say=(k,text,ms=6500)=>{toast(text,ms);fox.talk(Math.min(4,ms/1600));};
  const ZONE_SAY=[
    '小狐：卦辞说"小狐汔济，濡其尾"——小狐狸差一点就游过去了，尾巴却湿了。这回你陪我一起游吧！按住「跳」往上游，松开慢慢沉下去。',
    '九二 · 曳其轮，贞吉。小狐：暗流一阵一阵往回冲。来了就松手沉到底，像拖住车轮那样稳住；躲在大车轮后面最安全。',
    '六三 · 未济，征凶，利涉大川。小狐：海沟里的暗流会把我们往下拖，硬游过不去——钻进左边那群鱼，跟着它们渡过去！（气泡柱也能托你一把）',
    '九四 · 震用伐鬼方。小狐：在空中连按两下「跳」（或按「震」/ F），往下一砸！能震开大贝壳、吓散堵路的鱼群。（鬼方是商代的一个方国，不是鬼哦）',
    '六五 · 君子之光，有孚，吉。小狐：好黑……光珠能照亮四周。小心水母，被碰到光珠会掉。把光珠放上洞底的石台！',
    '上九。小狐：这块石碑刻的是"既济"。怎么把它变成"未济"？整块倒过来（综），或者把六爻一一变过来（错）——两种都行！',
  ];
  const near=(p,v,r,dy=1.6)=>Math.hypot(p.x-v.x,p.z-v.z)<r&&Math.abs(p.y-v.y)<dy;

  function openClam(c){if(c.open)return;c.open=true;sfx.toggle(true);burst(V(c.x,1,c.z),{color:'#fff0f4',n:16,speed:2.4,up:2,gravity:-1});bubble(c.x,.8,c.z,{n:14,spread:1.2,up:2});
    if(c.content==='gem'){reveal(gems[c===clams[0]?3:4]);toast('贝壳震开了，里面有一枚爻玉！');}
    else{pearl.state='free';pearl.group.visible=true;pearl.pos.set(c.x,.75,c.z);toast('贝壳里是一颗会发光的珠子——"君子之光"。游过去碰一下就能拿起来。',5200);}
    c.col.top=.5;}
  function scatterCrack(){if(crack.scattered)return;crack.scattered=true;crack.t=0;physics.remove(crack.col);sfx.bounce();toast('一声"震"，堵在石缝里的鱼群一哄而散——路通了！',4200);}
  function dropPearl(p,reason){if(pearl.state!=='held')return;pearl.state='free';pearl.noPick=1.2;const g=physics.groundAt(p.x,p.z,p.y+.5);pearl.pos.set(p.x,(g.col?g.h:p.y)+.35,p.z);if(reason)toast(reason,4200);}
  function placePearl(){pearl.state='altar';pearl.pos.set(0,1.45,-64.2);caveLit=true;lanternMode='altar';sfx.solve();ctx.unlock('yaoci',true);
    toast('六五 · 君子之光，有孚，吉。——光珠放上石台，整个洞亮了，石门升起来了。',5600);}
  function checkTablet(){
    const n=linesName(tab.lines);
    if(n==='未济'){tab.solved=true;tab.method=tab.last;tab.demo=0;sfx.solve();ctx.unlock('weiji',true);ctx.unlock('cuo',true);ctx.unlock('zong',true);ctx.unlock('xiangying');
      toast(tab.method==='zong'?'整块倒过来——既济的"综卦"就是未济！再想想：六爻阴阳全变（错），得到的也是未济。':'六爻阴阳全变——既济的"错卦"就是未济！再想想：整块倒过来（综），得到的也是未济。',6500);}
    else if(n==='既济')toast('又回到了既济。');
    else{const changed=tab.lines.filter((y,i)=>y!==JIJI[i]).length;toast('现在既不是既济也不是未济（有 '+changed+' 爻和原来不同）。继续变，或者整块倒过来试试。',4200);}}
  function toggleLine(k){if(tab.solved||tab.flipping>0)return;tab.lines[k]=1-tab.lines[k];tab.last='cuo';drawTab(k);drawToggleBars();toggles[k].flash=1;sfx.toggle(!!tab.lines[k]);burst(V(toggles[k].x,1.4,toggles[k].z),{color:'#ffe9b0',n:10,speed:1.6,up:1.5,gravity:-1});ctx.unlock('cuo',true);checkTabletSoon();}
  let checkT=-1;function checkTabletSoon(){checkT=.35;}
  function flipTablet(){if(tab.solved||tab.flipping>0)return;tab.flipping=1;tab.last='zong';sfx.gate();}

  const level={
    id:'weiji',index:3,lines:LINES,title:'第四境 · 未济',subtitle:'火在水上，未济',forms:false,camBlock:true,noFallLabel:'不被卷走',
    spawn:{x:0,y:0,z:14.2,yaw:0},killY:-9,camYaw:0,timeLimit:720,gems,gate,clams,jellies,toggles,wheels,
    get solved(){return tab.solved&&tab.demo<0;},get zone(){return zone;},get pearl(){return pearl.state;},get caveLit(){return caveLit;},get tablet(){return tab.lines.slice();},get method(){return tab.method;},
    get crackOpen(){return crack.scattered;},get surfaceOpen(){return tab.solved&&tab.demo<0;},get surging(){return surgeOn;},get fox(){return fox.pos;},
    slam(p){if(!slamOk){toast('要游到九四那段水域，才学得会"震"。');return false;}return true;},
    get interactables(){
      const list=[{pos:stele.pos,label:'读石碑',act:()=>ctx.openLore('weiji')}];
      for(const m of markers)list.push({pos:m.pos,label:'读爻辞（'+WEIJI_YAO[m.k].name+'）',act:()=>{const y=WEIJI_YAO[m.k];ctx.unlock('yaoci');toast(y.name+'：'+y.text+'　——'+y.say,7000);}});
      if(pearl.state==='free')list.push({pos:pearl.pos,label:'拿起光珠',act:()=>{pearl.state='held';sfx.pickup();}});
      if(pearl.state==='held')list.push({pos:V(0,.9,-64.2),label:'把光珠放上石台',act:placePearl});
      if(!tab.solved){list.push({pos:V(0,0,-76.4),label:'综：把石碑整块倒过来',act:flipTablet});
        for(const t of toggles)list.push({pos:t.pos,label:'错：变「'+t.name+'」爻（'+(tab.lines[t.k]?'阳→阴':'阴→阳')+'）',act:()=>toggleLine(t.k)});}
      return list;
    },
    onFall(){if(pearl.state==='held'){pearl.state='free';pearl.pos.copy(pearl.home);}toast('被海沟里的暗流卷下去了……"未济，征凶"——跟着鱼群走。',4200);},
    onSlam(p,col,still){if(!slamOk)return;
      bubble(p.x,p.y+.2,p.z,{n:22,spread:1.6,up:1.6});
      for(const c of clams)if(!c.open&&Math.hypot(p.x-c.x,p.z-c.z)<3.8&&p.y<2.5)openClam(c);
      if(!crack.scattered&&Math.hypot(p.x-crack.pos.x,p.z-crack.pos.z)<6&&p.y<5)scatterCrack();
      for(const f of crackSchool.fish)f.kick=1;
      if(now-hintAt>6&&clams.every(c=>!c.open)&&!crack.scattered){hintAt=now;toast('震！离大贝壳近一点再砸。');}
    },
    camMaxY(p){if(p.z<-51&&p.z>-67.5&&p.y<5)return 4.65;return p.y<SURF-.6?SURF-.35:Infinity;},
    objective(){
      const got=gems.filter(g=>g.taken).length;
      if(ended||tab.solved&&tab.demo<0){if(got<3)return '石碑已成未济。还差 '+(3-got)+' 枚爻玉（已得 '+got+'/6），卦门才会亮。';return above?'走进小岛上的卦门。':'上九 · 濡其首：游到水面，按住「跳」冲出水面，跳上小岛的卦门。';}
      if(tab.solved)return '相应：初与四、二与五、三与上，一阴一阳。';
      switch(zone){
        case 0:return '初六 · 濡其尾：按住「跳」往上游，松开慢慢下沉。翻过前面的石墙。';
        case 1:return '九二 · 曳其轮：暗流'+(surgeOn?'来了！松手沉到底，或躲到车轮后面':'暂停了，快往前游')+'。';
        case 2:return '六三 · 利涉大川：海沟的暗流往下拖——钻进左边的鱼群，跟着鱼群渡过去。';
        case 3:{const open=clams.filter(c=>c.open).length;return '九四 · 震：空中连按两下「跳」（或「震」/ F）向下砸。贝壳 '+open+'/3'+(crack.scattered?'，石缝已通':'，石缝被鱼群堵着')+(pearl.state==='held'?'；光珠在手':'')+'。';}
        case 4:return caveLit?'六五 · 君子之光：洞亮了，穿过升起的石门。':pearl.state==='held'?'六五 · 君子之光：带着光珠，绕开水母，放上洞底的石台（E）。':'六五：光珠'+(pearl.state==='free'?'掉了，回去捡起来':'还在九四的大贝壳里——用"震"把贝壳震开')+'。';
        default:return '上九：把"既济"石碑变成"未济"——整块倒过来（综），或把六爻一一变过来（错）。现在：'+(linesName(tab.lines)||'都不是')+'。';}
    },
    update(dt,t,p){
      now=t;gate.update(dt,t);
      // 水中 / 水面
      const breach=tab.solved&&tab.demo<0;
      p.swim=p.y<SURF-.35;p.ceilY=breach?Infinity:SURF-1.05;p.breachY=breach?SURF-1.3:Infinity;
      const z=zoneOf(p.z);
      if(z!==zone){zone=z;if(!seen.has(z)){seen.add(z);say(z,ZONE_SAY[z]);if(z===3){slamOk=true;p.canSlam=true;}}}
      if(slamOk)p.canSlam=true;
      if(welcomeT>0){welcomeT-=dt;if(welcomeT<=0)say(0,ZONE_SAY[0],8000);}
      // ----- 水流 -----
      let fx=0,fy=0,fz=0;
      // 九二：一阵一阵的暗流往回冲（+z）
      surge=(t%5.6);const was=surgeOn;surgeOn=surge<3;ramp=Math.min(1,surge/.5,(3-surge)/.4);
      if(surgeOn&&!was&&zone===1){bubble(p.x,p.y+1,p.z-3,{n:6,spread:3,up:.2,vz:6});if(firstSurge){firstSurge=false;toast('暗流来了！松开「跳」沉到底，或者躲到车轮后面。',3800);}}
      if(surgeOn&&p.z<1&&p.z>-15.2){let k=p.grounded?.12:1;for(const w of wheels)if(Math.abs(p.x-w.x)<1.7&&p.z>w.z&&p.z<w.z+3.4&&p.y<2.7)k=0;fz+=5.4*Math.max(0,ramp)*k;}
      // 六三：海沟暗流往下拖；鱼群航道往前带；气泡柱往上托
      if(p.z<-14.9&&p.z>-35.4&&p.swim){const L=laneNear(p.x,p.y+.45,p.z);
        if(L.d<1.9&&L.i<LANE_N){const s=laneSamples[L.i];fx+=s.t.x*FISH_SPEED+(s.p.x-p.x)*3.5;fy+=s.t.y*FISH_SPEED+(s.p.y-(p.y+.45))*3.5;fz+=s.t.z*FISH_SPEED+(s.p.z-p.z)*3.5;p.inLane=true;}
        else{p.inLane=false;let col=false;for(const c of columns)if(Math.hypot(p.x-c.x,p.z-c.z)<c.r){col=true;fy+=3;}if(!col)fy-=8;}}
      else p.inLane=false;
      p.flowX=fx;p.flowY=fy;p.flowZ=fz;
      // ----- 光珠 -----
      if(pearl.noPick>0)pearl.noPick-=dt;
      if(pearl.state==='free'&&!(pearl.noPick>0)&&near(p,pearl.pos,1,1.5)){pearl.state='held';sfx.pickup();toast(zone===3?'拿到光珠了！前面石缝被鱼群堵着——在石缝前"震"一下。':'拿回光珠了。',3800);}
      if(pearl.state==='held')pearl.pos.set(p.x+Math.sin(p.yaw)*.55,p.y+1.25,p.z+Math.cos(p.yaw)*.55);
      // 洞里的爻玉只有光照到才看得见
      if(hidden.has(gems[5])&&(caveLit||(pearl.state==='held'&&Math.hypot(p.x-(-7.4),p.z-(-65.2))<6))){reveal(gems[5]);toast('光照过去，角落里亮出一枚爻玉。');}
      // 石门
      if(caveLit&&!doorCol.disabled){doorCol.disabled=true;}
      if(caveLit&&door.position.y<6.4){door.position.y=Math.min(6.4,door.position.y+dt*2);}
      // 水母：位置只跟时间有关（逻辑和画面算出来的一样）
      jellies.forEach((j,i)=>{jellyPos(j,i,t);
        j.cd=Math.max(0,j.cd-dt);
        if(j.cd<=0&&Math.hypot(p.x-j.pos.x,p.z-j.pos.z)<.85&&p.y+.5>j.pos.y-1.2&&p.y<j.pos.y+.4){j.cd=1.5;const dx=p.x-j.pos.x,dz=p.z-j.pos.z,l=Math.hypot(dx,dz)||1;p.vx=dx/l*4.5;p.vz=dz/l*4.5;p.vy=-1.5;p.stun=.45;sfx.land(8);ctx.mascot.impulse(-4);
          if(pearl.state==='held')dropPearl(p,'被水母蛰了一下，光珠掉了！游过去碰一下就能捡回来。');else if(t-lastJellyHint>4){lastJellyHint=t;toast('哎呀，水母！绕开它。');}}});
      // 灯笼鱼：看见光珠就跟过来；光珠上了石台，就围着石台转
      if(lanternMode==='home'&&pearl.state==='held'&&Math.hypot(p.x-lanternHome.x,p.z-lanternHome.z)<7&&p.z<-51.8){lanternMode='follow';toast('一群灯笼鱼被光珠吸引，跟了过来。',3200);}
      // ----- 石碑 -----
      if(tab.flipping>0){tab.flipping=Math.max(0,tab.flipping-dt/1.1);const k=1-tab.flipping,e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;slab.rotation.z=e*Math.PI;slab.position.y=2.75+Math.sin(k*Math.PI)*.6;
        if(tab.flipping===0){slab.rotation.z=0;slab.position.y=2.75;tab.lines.reverse();drawTab();drawToggleBars();ctx.unlock('zong',true);burst(V(0,3,-77.4),{color:'#ffe9b0',n:18,speed:2.4,up:2,gravity:-1});checkTablet();}}
      if(checkT>0){checkT-=dt;if(checkT<=0)checkTablet();}
      for(const tg of toggles){tg.bar.position.y=1.25+Math.sin(t*2+tg.k)*.06;if(tg.flash>0){tg.flash=Math.max(0,tg.flash-dt*3);tg.bar.scale.setScalar(1+Math.sin(tg.flash*Math.PI)*.4);}}
      if(tab.demo>=0){tab.demo+=dt;const PAIRS=['初六与九四','九二与六五','六三与上九'];
        arcs.forEach((a,i)=>{const st=1.4+i*1.6;if(tab.demo>st){if(!a.m.visible){a.m.visible=true;sfx.gem();toast('相应：'+PAIRS[i]+'，一阴一阳。',2600);}a.t=Math.min(1,(tab.demo-st)/.8);a.geo.setDrawRange(0,Math.floor(a.count*a.t/3)*3);}});
        if(tab.demo>6.6){tab.demo=-1;toast('"虽不当位，刚柔应也。"（未济《彖传》）——上九 · 濡其首：游到水面，按住「跳」冲出水面！',7000);sfx.gate();}}
      // ----- 水面之上 -----
      if(!p.swim&&p.y>SURF-.4&&!ended&&tab.solved&&tab.demo<0&&p.grounded){ended=true;sfx.splash();burst(V(p.x,SURF+.2,p.z),{color:'#ffffff',n:18,speed:2.6,up:2.4});toast('浮出水面了！"火在水上"——水面上漂着一盏盏河灯。',5200);}
      if(tab.solved&&tab.demo<0&&gems.filter(g=>g.taken).length>=3&&!gate.active){gate.activate();}
    },
    // 纯画面：每帧一次，p 是插值后的位置，t 是插值后的时间
    frame(dt,t,p){
      for(const c of cullable){const v=Math.hypot(c.p.x-p.x,c.p.z-p.z)<c.r;if(c.o.visible!==v&&!(c.o===pearl.group&&pearl.state==='clam'))c.o.visible=v;}
      for(const g of gems)if(!hidden.has(g)&&!g.taken)g.group.visible=Math.hypot(g.pos.x-p.x,g.pos.z-p.z)<38;
      cT.value=t;surfMat.uniforms.t.value=t;updateLamps(t);
      // ----- 鱼群 -----
      laneSchool.fish.forEach((f,i)=>{const u=(f.s+t*FISH_SPEED/loopLen)%1;loopCurve.getPointAt(u,tmp);loopCurve.getTangentAt(u,tan);tmp.add(f.off);tmp.y+=Math.sin(t*3+f.ph)*.08;laneSchool.set(i,tmp,tan);});laneSchool.done();
      crack.t+=dt;/* 震散计时 */crackSchool.fish.forEach((f,i)=>{let c,r;if(!crack.scattered){c=crack.pos;r=1.2;}else{c=crack.home;r=1.6;}
        const a=t*(1.4+(i%5)*.12)+f.ph,want=tmp.set(c.x+Math.cos(a)*r*(.5+(i%3)*.3),c.y+Math.sin(a*1.3+f.ph)*r*.6,c.z+Math.sin(a)*r*(.5+(i%3)*.3));
        if(crack.scattered&&crack.t<1.2){want.addScaledVector(f.off,6);}
        if(!f.init){f.pos.copy(want);f.init=true;}tan.copy(f.pos);f.pos.lerp(want,Math.min(1,dt*(crack.scattered?2.2:6)));const dir=tan.subVectors(f.pos,tan);if(dir.lengthSq()<1e-6)dir.set(-Math.sin(a),0,Math.cos(a));crackSchool.set(i,f.pos,dir);});crackSchool.done();
      for(const d of deco){d.s.fish.forEach((f,i)=>{const a=t*d.sp+f.s*Math.PI*2,pos=tmp.set(d.c.x+Math.cos(a)*d.r+f.off.x,d.c.y+f.off.y+Math.sin(t+f.ph)*.2,d.c.z+Math.sin(a)*d.r+f.off.z);const dir=tan.set(-Math.sin(a)*d.sp,0,Math.cos(a)*d.sp);
        // 团子游近时散开
        const dx=pos.x-p.x,dy=pos.y-p.y,dz=pos.z-p.z,dd=Math.hypot(dx,dy,dz);if(dd<2.5){pos.x+=dx/dd*(2.5-dd);pos.y+=dy/dd*(2.5-dd);pos.z+=dz/dd*(2.5-dd);}
        d.s.set(i,pos,dir);});d.s.done();}
      // ----- 贝壳 -----
      for(const c of clams){if(c.open&&c.t<1){c.t=Math.min(1,c.t+dt*1.6);c.hinge.rotation.x=-c.t*1.05;}else if(!c.open){c.hinge.rotation.x=-Math.max(0,Math.sin(t*1.3+c.x))*.06;}}
      // 光珠：拿在手里时跟着插值后的位置走，不然会一顿一顿
      if(pearl.state==='held')pearl.group.position.set(p.x+Math.sin(p.yaw)*.55,p.y+1.25+Math.sin(t*3)*.06,p.z+Math.cos(p.yaw)*.55);else{pearl.group.position.copy(pearl.pos);if(pearl.state!=='clam')pearl.group.position.y+=Math.sin(t*2.2)*.08;}
      pearl.glow.material.opacity=.75+Math.sin(t*4)*.15;pearlLight.position.copy(pearl.group.position);pearlLight.intensity=pearl.state==='clam'?0:pearl.state==='altar'?6:5;
      // ----- 暗洞 -----
      const inCave=p.z<-51.8&&p.z>-67.4;dark+=((inCave?(caveLit?.3:1):0)-dark)*Math.min(1,dt*2.5);
      lights.hemi.intensity=HEMI*(1-.9*dark);lights.sun.intensity=SUN*(1-.92*dark);cK.value=1-dark;
      if(!above){scene.fog.color.copy(fogW).lerp(fogDark,dark);scene.fog.far=50-30*dark;}
      altarLight.intensity+=((caveLit?5:0)-altarLight.intensity)*Math.min(1,dt*1.5);
      // 水母
      jellies.forEach((j,i)=>{jellyPos(j,i,t);const pulse=1+Math.sin(t*3.2+i)*.12;
        dummy.position.copy(j.pos);dummy.rotation.set(0,0,0);dummy.scale.set(pulse,1/pulse,pulse);dummy.updateMatrix();bells.setMatrixAt(i,dummy.matrix);
        for(let k=0;k<5;k++){const a=k/5*Math.PI*2;dummy.position.set(j.pos.x+Math.cos(a)*.28,j.pos.y,j.pos.z+Math.sin(a)*.28);dummy.rotation.set(Math.sin(t*2.4+k+i)*.25,0,Math.cos(t*2+k)*.25);dummy.scale.set(1,1.1+Math.sin(t*2+k)*.15,1);dummy.updateMatrix();tents.setMatrixAt(i*5+k,dummy.matrix);}});
      bells.instanceMatrix.needsUpdate=tents.instanceMatrix.needsUpdate=true;
      lanterns.fish.forEach((f,i)=>{const a=t*(1.6+i*.07)+f.ph,c=lanternMode==='home'?lanternHome:lanternMode==='altar'?altarTop:(pearl.state==='held'?pearl.group.position:lanternHome),r=lanternMode==='altar'?1.6:.9;
        const want=tmp.set(c.x+Math.cos(a)*r,c.y+Math.sin(a*1.4)*.4,c.z+Math.sin(a)*r);tan.copy(f.pos);f.pos.lerp(want,Math.min(1,dt*2.5));const dir=tan.subVectors(f.pos,tan);if(dir.lengthSq()<1e-6)dir.set(-Math.sin(a),0,Math.cos(a));lanterns.set(i,f.pos,dir);});lanterns.done();
      const camAbove=ctx.camera.position.y>SURF;if(camAbove!==above){above=camAbove;setSky(above);scene.fog.color.copy(above?fogA:fogW);scene.fog.near=above?30:7;scene.fog.far=above?160:50;}
      // ----- 气泡 -----
      if(p.swim&&(p.vy>1.5||Math.hypot(p.vx,p.vz)>2.5)&&rng()<dt*8)bubble(p.x,p.y+.7,p.z,{n:1,spread:.3,up:1.4,life:1.4});
      for(const c of columns)if(rng()<dt*30)bubble(c.x,-6+rng()*6,c.z,{n:1,spread:c.r*1.2,up:6,life:3.5});
      for(let i=0;i<NB;i++){const ix=i*3;if(bPos[ix+1]<-500)continue;
        if(i>=NAMB){bLife[i]-=dt;if(bLife[i]<=0||bPos[ix+1]>SURF-.05){bPos[ix+1]=-999;continue;}}
        else if(bPos[ix+1]>SURF-.05){ambSpawn(i,false);continue;}
        let vx=bVel[ix]*.98,vz=bVel[ix+2]*.98;const by=bPos[ix+1],bz=bPos[ix+2];
        if(surgeOn&&bz<1&&bz>-15.2)vz+=(5.4*Math.max(0,ramp)-vz)*dt*3;
        bPos[ix]+=(vx+Math.sin(t*2+i)*.15)*dt;bPos[ix+1]+=bVel[ix+1]*dt;bPos[ix+2]+=vz*dt;bVel[ix]=vx;bVel[ix+2]=vz;
        if(Math.abs(bPos[ix])>10.5||bPos[ix+2]>18||bPos[ix+2]<-82){if(i<NAMB)ambSpawn(i,true);else bPos[ix+1]=-999;}}
      bGeo.attributes.position.needsUpdate=true;
      // ----- 小狐狸 -----
      {const moving=Math.hypot(p.vx,p.vz)>.4||Math.abs(p.vy)>.6;foxIdle=moving?0:foxIdle+dt;const idle=foxIdle>2.5&&tab.demo<0;
        const fw=tmp2.set(Math.sin(p.yaw),0,Math.cos(p.yaw)),sx=fw.z,sz=-fw.x;let tgt=foxTgt;
        if(tab.demo>=0)tgt.set(-2.6,2.4,-75.2);// 演示相应时，小狐狸在石碑旁边看
        else if(idle){const a=t*.55;tgt.set(p.x+Math.cos(a)*1.7,p.y+(p.swim?.9+Math.sin(t*1.3)*.3:.2),p.z+Math.sin(a)*1.7);}// 你停下来：它绕着你转
        else{const back=1.3+Math.sin(t*.53)*.35,side=.95+Math.sin(t*.7)*.3;tgt.set(p.x-fw.x*back+sx*side,p.y+(p.swim?.75+Math.sin(t*.9)*.2:.2),p.z-fw.z*back+sz*side);}// 跟着游，在身边飘来飘去
        const cy=physics.ceilingAt(tgt.x,tgt.z,tgt.y)-.9;if(tgt.y>cy)tgt.y=cy;
        if(physics.blocked(tgt.x,tgt.z,tgt.y,.25,.6)){tgt.set(p.x,p.y+(p.swim?1.25:.2),p.z);const cy2=physics.ceilingAt(tgt.x,tgt.z,p.y+1)-.7;if(tgt.y>cy2)tgt.y=Math.max(p.y+.4,cy2);}
        if(!p.swim&&p.y>SURF-.4){const g=physics.groundAt(tgt.x,tgt.z,tgt.y+1);tgt.y=g.col&&g.h>SURF?g.h:SURF-.2;}// 水面上：站在岛上或浮在水面
        // 心情：拿到爻玉转个圈；靠近水母、你被蛰到时发抖
        const got=gems.filter(g=>g.taken).length;if(got>foxGems){foxGems=got;fox.doTrick('spin');}
        let scared=p.stun>0;for(const j of jellies)if(j.pos.distanceTo(fox.pos)<2.4)scared=true;
        const r=fox.update(dt,t,{target:tgt,look:foxLook.set(p.x,p.y+.6,p.z),idle,scared});
        if(r.jumped)bubble(tgt.x,tgt.y+.3,tgt.z,{n:10,spread:.8,up:1.2});// 跟丢了：冒一串泡泡回到身边
        if(p.swim&&rng()<dt*1.6){const tp=fox.bones.tailTip.getWorldPosition(foxLook);bubble(tp.x,tp.y,tp.z,{n:1,spread:.1,up:.9,life:1.2});}}
    },
    debugSolve(){gems.slice(0,3).forEach(g=>reveal(g));tab.lines=LINES.slice();drawTab();drawToggleBars();tab.solved=true;tab.method='cuo';tab.demo=-1;},
    _laneNear:laneNear,_laneSamples:laneSamples,_crack:crack,
  };
  return level;
}

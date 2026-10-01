import * as THREE from '../vendor/three.module.js';

// 爻爻：玉质果冻团子。所有形变都来自弹簧，不使用骨骼动画。
// root(位置/朝向) → lean(前后左右倾斜) → squash(压扁拉长) → 身体、眼睛、腮红、体内卦象
export function createMascot({envMap}){
  const root=new THREE.Group();root.name='yaoyao';
  const lean=new THREE.Group();root.add(lean);
  const squash=new THREE.Group();lean.add(squash);
  const R=.46;

  const jade=new THREE.MeshPhysicalMaterial({color:'#8ee3c1',roughness:.2,metalness:0,clearcoat:1,clearcoatRoughness:.12,sheen:.7,sheenColor:new THREE.Color('#f0fff8'),sheenRoughness:.4,transparent:true,opacity:.74,emissive:new THREE.Color('#1f7a5e'),emissiveIntensity:.35,envMap,envMapIntensity:1.1});
  const bodyGeo=new THREE.SphereGeometry(R,48,32);
  // 底部略平、顶部略尖一点，像刚落下的一滴软糖
  {const p=bodyGeo.attributes.position;for(let i=0;i<p.count;i++){let y=p.getY(i);const k=y/R;if(k<-.55)p.setY(i,y*.86-.01);else if(k>.6)p.setY(i,y*1.04);}bodyGeo.computeVertexNormals();}
  const body=new THREE.Mesh(bodyGeo,jade);body.position.y=R;body.castShadow=true;body.renderOrder=2;squash.add(body);

  // 菲涅尔边缘光：让果冻轮廓发亮
  const rimMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{color:{value:new THREE.Color('#d9fff0')},power:{value:2.6},strength:{value:.85}},
    vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 color;uniform float power;uniform float strength;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-max(dot(normalize(vN),normalize(vV)),0.),power);gl_FragColor=vec4(color*f*strength,1.);}'});
  const rim=new THREE.Mesh(bodyGeo,rimMat);rim.position.y=R;rim.scale.setScalar(1.012);rim.renderOrder=3;squash.add(rim);

  // 体内的果冻芯：颜色更深，透过外层看到层次
  const coreMat=new THREE.MeshBasicMaterial({color:'#3fae8a',transparent:true,opacity:.45,depthWrite:false});
  const core=new THREE.Mesh(new THREE.SphereGeometry(R*.62,24,16),coreMat);core.position.y=R*.95;core.renderOrder=0;squash.add(core);

  // 肚子上的卦象（像玉上的刻纹，贴着表面）：三条爻自下而上。阳爻一整条，阴爻中间断开。
  const barMat=new THREE.MeshBasicMaterial({color:'#f2fff9',transparent:true,opacity:.88,depthWrite:false});
  const trigramGroup=new THREE.Group();{const dy=-.13,z=Math.sqrt(R*R-dy*dy)+.004;trigramGroup.position.set(0,R+dy,z);trigramGroup.rotation.x=-Math.asin(dy/R);}trigramGroup.renderOrder=1;squash.add(trigramGroup);
  const barGeo=new THREE.BoxGeometry(1,1,1);
  function setTrigram(lines){
    trigramGroup.clear();
    lines.forEach((yang,i)=>{const y=(i-1)*.052;
      const parts=yang?[[0,.17]]:[[-.054,.062],[.054,.062]];
      for(const [x,w] of parts){const m=new THREE.Mesh(barGeo,barMat);m.scale.set(w,.024,.02);m.position.set(x,y,0);m.renderOrder=4;/* 画在身体之后，贴在表面上 */trigramGroup.add(m);}
    });
  }

  // 脸：眼睛、高光、腮红、小嘴
  const face=new THREE.Group();face.position.set(0,R*1.02,0);squash.add(face);
  const eyeMat=new THREE.MeshBasicMaterial({color:'#1d2a2a'}),shine=new THREE.MeshBasicMaterial({color:'#ffffff'});
  const blush=new THREE.MeshBasicMaterial({color:'#ff9fa8',transparent:true,opacity:.55,depthWrite:false});
  const eyes=[];
  for(const s of [-1,1]){
    const eye=new THREE.Group();const a=s*.36,el=.1;
    eye.position.set(Math.sin(a)*R*.93,el,Math.cos(a)*R*.93);eye.lookAt(Math.sin(a)*2,el,Math.cos(a)*2);face.add(eye);
    const e=new THREE.Mesh(new THREE.SphereGeometry(.062,16,12),eyeMat);e.scale.set(.85,1.15,.45);eye.add(e);
    const h=new THREE.Mesh(new THREE.SphereGeometry(.02,8,6),shine);h.position.set(.018,.03,.03);eye.add(h);
    const h2=new THREE.Mesh(new THREE.SphereGeometry(.009,6,4),shine);h2.position.set(-.02,-.022,.03);eye.add(h2);
    eyes.push(e);
    const c=new THREE.Mesh(new THREE.CircleGeometry(.06,20),blush);const ca=s*.62;c.position.set(Math.sin(ca)*R*.9,-.03,Math.cos(ca)*R*.9);c.lookAt(Math.sin(ca)*2,-.03,Math.cos(ca)*2);c.scale.y=.6;face.add(c);
  }
  const mouth=new THREE.Mesh(new THREE.TorusGeometry(.03,.009,6,14,Math.PI),eyeMat);mouth.position.set(0,-.035,R*.985);mouth.rotation.z=Math.PI;face.add(mouth);

  // 头顶一片玉叶
  const leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(.11,.09,0,.22);leafShape.quadraticCurveTo(-.11,.09,0,0);
  const leaf=new THREE.Mesh(new THREE.ShapeGeometry(leafShape,8),new THREE.MeshToonMaterial({color:'#5cc38f',side:THREE.DoubleSide}));
  const sprout=new THREE.Group();sprout.position.set(0,R*2.02,0);squash.add(sprout);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.016,.08,6),leaf.material);stem.position.y=.03;sprout.add(stem);
  leaf.position.y=.06;leaf.rotation.z=-.5;sprout.add(leaf);

  // 两只小脚：蹦起来时才露出来
  const feet=[];for(const s of [-1,1]){const f=new THREE.Mesh(new THREE.SphereGeometry(.085,12,8),jade);f.scale.set(1,.55,1.25);f.position.set(s*.17,.04,.06);f.castShadow=true;lean.add(f);feet.push(f);}

  // 携带的火苗（离卦关卡用）
  const flame=new THREE.Group();flame.visible=false;flame.position.set(0,R*2.25,0);squash.add(flame);
  const flameOuter=new THREE.Mesh(new THREE.SphereGeometry(.12,14,10),new THREE.MeshBasicMaterial({color:'#ffb347',transparent:true,opacity:.85}));flameOuter.scale.set(1,1.6,1);flame.add(flameOuter);
  const flameInner=new THREE.Mesh(new THREE.SphereGeometry(.065,10,8),new THREE.MeshBasicMaterial({color:'#fff3c4'}));flameInner.scale.set(1,1.5,1);flameInner.position.y=-.02;flame.add(flameInner);
  const flameLight=new THREE.PointLight('#ffb05a',0,4,1.6);flame.add(flameLight);

  // 弹簧状态
  const spring={s:0,v:0},tilt={x:0,z:0,vx:0,vz:0};
  let blinkAt=1.5,blink=0,time=0,carrying=false,happy=0;
  const baseColor=new THREE.Color('#8ee3c1'),fireColor=new THREE.Color('#ffc58a'),baseEmissive=new THREE.Color('#1f7a5e'),fireEmissive=new THREE.Color('#b8561f');

  function impulse(amount){spring.v+=amount;}
  function setCarrying(on){carrying=on;flame.visible=on;}
  function cheer(){happy=1.2;impulse(-3);}

  // 每帧由玩家控制器调用：vel 为世界速度，grounded 是否着地
  function update(dt,{vel,grounded,yaw}){
    time+=dt;
    // 竖直速度 → 拉长；着地冲击由 impulse 加入
    const target=grounded?0:THREE.MathUtils.clamp(vel.y*.035,-.18,.22);
    spring.v+=((target-spring.s)*190-spring.v*11)*dt;spring.s+=spring.v*dt;spring.s=THREE.MathUtils.clamp(spring.s,-.42,.42);
    const breathe=grounded?Math.sin(time*3.1)*.022:0;
    const sy=1+spring.s+breathe,sxz=1/Math.sqrt(Math.max(.35,sy));
    squash.scale.set(sxz,sy,sxz);
    // 倾斜：朝运动方向，弹簧回正，转身时晃一晃
    const cos=Math.cos(yaw),sin=Math.sin(yaw);
    const fwd=vel.x*sin+vel.z*cos,side=vel.x*cos-vel.z*sin;
    const tx=THREE.MathUtils.clamp(fwd*.045,-.28,.28),tz=THREE.MathUtils.clamp(-side*.045,-.25,.25);
    tilt.vx+=((tx-tilt.x)*120-tilt.vx*9)*dt;tilt.x+=tilt.vx*dt;tilt.vz+=((tz-tilt.z)*120-tilt.vz*9)*dt;tilt.z+=tilt.vz*dt;
    lean.rotation.set(tilt.x,0,tilt.z);
    // 脚：离地时伸出来，着地时藏进身体
    const out=grounded?0:Math.min(1,Math.abs(vel.y)*.15+.35);
    feet.forEach((f,i)=>{f.position.y=.04-out*.06;f.position.z=.06+Math.sin(time*14+i*Math.PI)*out*.05;f.scale.y=.55*(1-out*.2);});
    // 眨眼
    if(time>blinkAt){blink=.14;blinkAt=time+2+Math.random()*3;}
    blink=Math.max(0,blink-dt);const eyeY=blink>0?.12:1.15;eyes.forEach(e=>e.scale.y+=(eyeY-e.scale.y)*Math.min(1,dt*40));
    // 开心：叶子摇、腮红亮
    happy=Math.max(0,happy-dt);sprout.rotation.z=Math.sin(time*(happy>0?18:4))*(.12+happy*.35)-tilt.z*.8;sprout.rotation.x=-tilt.x*1.2;
    blush.opacity=.5+happy*.35;
    // 火苗
    if(carrying){const f=1+Math.sin(time*23)*.08+Math.sin(time*37)*.05;flameOuter.scale.set(f,1.6*f+Math.sin(time*11)*.1,f);flameLight.intensity=2.4;}
    else flameLight.intensity=0;
    jade.color.lerp(carrying?fireColor:baseColor,Math.min(1,dt*4));jade.emissive.lerp(carrying?fireEmissive:baseEmissive,Math.min(1,dt*4));
  }

  return {root,body,update,impulse,setTrigram,setCarrying,cheer,radius:R,get carrying(){return carrying;}};
}

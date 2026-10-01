import * as THREE from '../vendor/three.module.js';

// 四个可选角色。能力完全一样，只有外形和"手感"（弹簧参数）不同。
// 结构：root(位置/朝向) → lean(倾斜) → squash(压扁拉长) → 身体、脸、卦象、配件
export const CHARACTERS={
  yao:{name:'爻爻',desc:'玉质果冻团子，弹得快、回弹利落。',voice:1,
    spring:{k:190,d:11,stretch:.035,clamp:.42,land:1},
    body:{color:'#8ee3c1',emissive:'#1f7a5e',ei:.35,opacity:.74,roughness:.2,clearcoat:1,sheen:.7,core:'#3fae8a',rim:'#d9fff0',scale:[1,1,1]},
    trigram:{color:'#f2fff9',opacity:.88}},
  nuo:{name:'糯糯',desc:'糯米玉兔，软软的能拉很长，回弹慢半拍。',voice:.8,
    spring:{k:105,d:7.2,stretch:.05,clamp:.56,land:1.3},
    body:{color:'#fffaf4',emissive:'#fff0ea',ei:.38,opacity:1,roughness:.62,clearcoat:.25,sheen:1,core:null,rim:'#ffffff',scale:[1.1,.9,1.05]},
    trigram:{color:'#e2574c',opacity:1}},
  lin:{name:'麟麟',desc:'琥珀软糖小麒麟，落地会抖两下。',voice:1.15,
    spring:{k:270,d:6.2,stretch:.035,clamp:.4,land:1.1},
    body:{color:'#ffbb55',emissive:'#b35a10',ei:.3,opacity:.84,roughness:.16,clearcoat:1,sheen:.4,core:'#e07b1f',rim:'#fff1cf',scale:[1,1,1]},
    trigram:{color:'#8a3f0d',opacity:.8}},
  koi:{name:'鲤鲤',desc:'锦鲤果冻，像小鱼一样扑腾着跳。',voice:1.3,
    spring:{k:170,d:9,stretch:.04,clamp:.45,land:1},
    body:{color:'#fff1ec',emissive:'#f0b5a8',ei:.18,opacity:.82,roughness:.2,clearcoat:1,sheen:.5,core:'#ffb3a1',rim:'#fff6f2',scale:[1,.95,1.12]},
    trigram:{color:'#ff6a3d',opacity:.92}},
};
export const CHARACTER_ORDER=['yao','nuo','lin','koi'];

const FORM_TINT={water:{color:new THREE.Color('#86cfff'),emissive:new THREE.Color('#1f5f9e')},fire:{color:new THREE.Color('#ffa45c'),emissive:new THREE.Color('#c2410c')}};

export function createMascot({envMap,kind='yao'}){
  const C=CHARACTERS[kind]??CHARACTERS.yao,B=C.body,S=C.spring;
  const root=new THREE.Group();root.name='mascot-'+kind;
  const lean=new THREE.Group();root.add(lean);
  const squash=new THREE.Group();lean.add(squash);
  const deco=new THREE.Group();deco.scale.set(...B.scale);squash.add(deco);
  const R=.46;
  const toon=(c,o={})=>new THREE.MeshToonMaterial({color:c,...o});

  const skin=new THREE.MeshPhysicalMaterial({color:B.color,roughness:B.roughness,metalness:0,clearcoat:B.clearcoat,clearcoatRoughness:.14,sheen:B.sheen,sheenColor:new THREE.Color('#ffffff'),sheenRoughness:.45,transparent:B.opacity<1,opacity:B.opacity,emissive:new THREE.Color(B.emissive),emissiveIntensity:B.ei,envMap,envMapIntensity:1.1});
  const bodyGeo=new THREE.SphereGeometry(R,48,32);
  {const p=bodyGeo.attributes.position;for(let i=0;i<p.count;i++){let y=p.getY(i);const k=y/R;if(k<-.55)p.setY(i,y*.86-.01);else if(k>.6)p.setY(i,y*1.04);}bodyGeo.computeVertexNormals();}
  const body=new THREE.Mesh(bodyGeo,skin);body.position.y=R;body.castShadow=true;body.renderOrder=2;deco.add(body);

  const rimMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{color:{value:new THREE.Color(B.rim)},power:{value:2.6},strength:{value:B.opacity<1?.85:.35}},
    vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 color;uniform float power;uniform float strength;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-max(dot(normalize(vN),normalize(vV)),0.),power);gl_FragColor=vec4(color*f*strength,1.);}'});
  const rim=new THREE.Mesh(bodyGeo,rimMat);rim.position.y=R;rim.scale.setScalar(1.012);rim.renderOrder=3;deco.add(rim);
  if(B.core){const core=new THREE.Mesh(new THREE.SphereGeometry(R*.62,24,16),new THREE.MeshBasicMaterial({color:B.core,transparent:true,opacity:.45,depthWrite:false}));core.position.y=R*.95;core.renderOrder=0;deco.add(core);}

  // 肚子上的卦象：贴着表面，像玉上的刻纹 / 年糕上的红印 / 糖里的糖纹
  const barMat=new THREE.MeshBasicMaterial({color:C.trigram.color,transparent:true,opacity:C.trigram.opacity,depthWrite:false});
  const trigramGroup=new THREE.Group();{const dy=-.13,z=Math.sqrt(R*R-dy*dy)+.004;trigramGroup.position.set(0,R+dy,z);trigramGroup.rotation.x=-Math.asin(dy/R);}deco.add(trigramGroup);
  const barGeo=new THREE.BoxGeometry(1,1,1);
  function setTrigram(lines){trigramGroup.clear();lines.forEach((yang,i)=>{const y=(i-1)*.052;const parts=yang?[[0,.17]]:[[-.054,.062],[.054,.062]];
    for(const [x,w] of parts){const m=new THREE.Mesh(barGeo,barMat);m.scale.set(w,.024,.02);m.position.set(x,y,0);m.renderOrder=4;trigramGroup.add(m);}});}

  // 脸
  const face=new THREE.Group();face.position.set(0,R*1.02,0);deco.add(face);
  const eyeMat=new THREE.MeshBasicMaterial({color:'#1d2a2a'}),shine=new THREE.MeshBasicMaterial({color:'#ffffff'});
  const blush=new THREE.MeshBasicMaterial({color:'#ff9fa8',transparent:true,opacity:.55,depthWrite:false});
  const eyes=[],eyeScale=kind==='koi'?1.15:kind==='nuo'?.9:1;
  for(const s of [-1,1]){
    const eye=new THREE.Group();const a=s*.36,el=.1;eye.position.set(Math.sin(a)*R*.93,el,Math.cos(a)*R*.93);eye.lookAt(Math.sin(a)*2,el,Math.cos(a)*2);eye.scale.setScalar(eyeScale);face.add(eye);
    const e=new THREE.Mesh(new THREE.SphereGeometry(.062,16,12),eyeMat);e.scale.set(.85,1.15,.45);eye.add(e);
    const h=new THREE.Mesh(new THREE.SphereGeometry(.02,8,6),shine);h.position.set(.018,.03,.03);eye.add(h);
    const h2=new THREE.Mesh(new THREE.SphereGeometry(.009,6,4),shine);h2.position.set(-.02,-.022,.03);eye.add(h2);eyes.push(e);
    const c=new THREE.Mesh(new THREE.CircleGeometry(.06,20),blush);const ca=s*.62;c.position.set(Math.sin(ca)*R*.9,-.03,Math.cos(ca)*R*.9);c.lookAt(Math.sin(ca)*2,-.03,Math.cos(ca)*2);c.scale.y=.6;face.add(c);
  }
  const mouth=new THREE.Mesh(kind==='koi'?new THREE.TorusGeometry(.022,.009,6,14):new THREE.TorusGeometry(.03,.009,6,14,Math.PI),eyeMat);mouth.position.set(0,-.035,R*.985);if(kind!=='koi')mouth.rotation.z=Math.PI;face.add(mouth);

  // ---------- 各角色的配件（都由弹簧驱动摆动） ----------
  const parts=[];// {obj, axis, k, d, gain, base, v, a}：a 为当前角度
  function swing(obj,axis,{k=60,d=5,gain=1,base=0}={}){const p={obj,axis,k,d,gain,base,a:base,v:0};obj.rotation[axis]=base;parts.push(p);return p;}
  if(kind==='yao'){
    const leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(.11,.09,0,.22);leafShape.quadraticCurveTo(-.11,.09,0,0);
    const sprout=new THREE.Group();sprout.position.set(0,R*2.02,0);deco.add(sprout);const lm=toon('#5cc38f',{side:THREE.DoubleSide});
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.016,.08,6),lm);stem.position.y=.03;sprout.add(stem);
    const leaf=new THREE.Mesh(new THREE.ShapeGeometry(leafShape,8),lm);leaf.position.y=.06;leaf.rotation.z=-.5;sprout.add(leaf);
    swing(sprout,'z',{k:70,d:4,gain:1.2});swing(sprout,'x',{k:70,d:4,gain:-1.4});
  }
  if(kind==='nuo'){
    // 两只长耳朵：跳起来甩到后面，落地耷拉
    const pink=new THREE.MeshBasicMaterial({color:'#ffc4cc'});
    for(const s of [-1,1]){const pivot=new THREE.Group();pivot.position.set(s*.15,R*1.78,-.02);pivot.rotation.z=-s*.18;deco.add(pivot);
      const ear=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.3,6,12),skin);ear.position.y=.22;ear.scale.set(1,1,.6);ear.castShadow=true;pivot.add(ear);
      const inner=new THREE.Mesh(new THREE.CapsuleGeometry(.04,.22,4,8),pink);inner.position.set(0,.22,.035);inner.scale.set(1,1,.3);pivot.add(inner);
      swing(pivot,'x',{k:38,d:3.2,gain:-2.2,base:-.15});swing(pivot,'z',{k:45,d:3.5,gain:-s*.9,base:-s*.18});}
  }
  if(kind==='lin'){
    // 小鹿角 + 鬃毛 + 卷尾巴
    const horn=toon('#ffe08a'),mane=new THREE.MeshPhysicalMaterial({color:'#e8892a',roughness:.3,clearcoat:1,transparent:true,opacity:.9,envMap});
    for(const s of [-1,1]){const g=new THREE.Group();g.position.set(s*.14,R*1.76,.04);g.rotation.z=-s*.38;deco.add(g);
      const a=new THREE.Mesh(new THREE.CylinderGeometry(.03,.042,.27,8),horn);a.position.y=.13;g.add(a);
      const b=new THREE.Mesh(new THREE.CylinderGeometry(.022,.03,.13,8),horn);b.position.set(s*.05,.17,0);b.rotation.z=-s*.85;g.add(b);
      const tip=new THREE.Mesh(new THREE.SphereGeometry(.036,10,8),horn);tip.position.y=.27;g.add(tip);const tip2=new THREE.Mesh(new THREE.SphereGeometry(.026,8,6),horn);tip2.position.set(s*.1,.21,0);g.add(tip2);swing(g,'x',{k:90,d:5,gain:-.6});}
    for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.07-i*.012,12,8),mane);m.position.set(0,R*1.85-i*.09,-.18-i*.08);deco.add(m);}
    const tail=new THREE.Group();tail.position.set(0,R*.55,-R*.95);deco.add(tail);
    const curl=new THREE.Mesh(new THREE.TorusGeometry(.1,.04,10,20,Math.PI*1.5),mane);curl.rotation.y=Math.PI/2;curl.position.y=.08;tail.add(curl);
    const puff=new THREE.Mesh(new THREE.SphereGeometry(.06,10,8),mane);puff.position.set(0,.18,.02);tail.add(puff);
    swing(tail,'x',{k:55,d:2.6,gain:-2.5});swing(tail,'z',{k:55,d:2.6,gain:1.6});
  }
  if(kind==='koi'){
    // 红斑、尾鳍、背鳍、侧鳍、两根小须
    const red=new THREE.MeshPhysicalMaterial({color:'#ff6a3d',roughness:.25,clearcoat:1,transparent:true,opacity:.92,envMap});
    // 丹顶：头顶一块醒目的红色圆斑；身侧两块小斑
    const patch=(x,y,z,r,sq=.35)=>{const n=new THREE.Vector3(x,y-R,z).normalize(),m=new THREE.Mesh(new THREE.SphereGeometry(r,20,12),red);m.position.copy(n.clone().multiplyScalar(R*1.0)).add(new THREE.Vector3(0,R,0));m.lookAt(m.position.clone().add(n));m.scale.set(1,1,sq);deco.add(m);};
    patch(0,R*1.92,.06,.17);patch(-.36,R*1.15,-.24,.09);patch(.3,R*.85,-.32,.08);
    const finShape=new THREE.Shape();finShape.moveTo(0,0);finShape.quadraticCurveTo(.2,.18,.26,.04);finShape.quadraticCurveTo(.16,0,.26,-.12);finShape.quadraticCurveTo(.16,-.14,0,0);
    const finMat=new THREE.MeshBasicMaterial({color:'#ff9466',transparent:true,opacity:.88,side:THREE.DoubleSide});
    const tail=new THREE.Group();tail.position.set(0,R*.85,-R*1.08);deco.add(tail);const tf=new THREE.Mesh(new THREE.ShapeGeometry(finShape,10),finMat);tf.rotation.y=Math.PI/2;tf.scale.setScalar(1.9);tail.add(tf);
    swing(tail,'y',{k:40,d:2.2,gain:3});
    const dorsal=new THREE.Mesh(new THREE.ShapeGeometry(finShape,8),finMat);dorsal.position.set(0,R*1.96,-.05);dorsal.rotation.set(0,Math.PI/2,Math.PI/2.4);dorsal.scale.setScalar(.7);deco.add(dorsal);
    for(const s of [-1,1]){const f=new THREE.Group();f.position.set(s*R*.85,R*.5,.05);deco.add(f);const m=new THREE.Mesh(new THREE.ShapeGeometry(finShape,6),finMat);m.rotation.set(0,s>0?0:Math.PI,-.6);m.scale.setScalar(.8);f.add(m);swing(f,'z',{k:60,d:3,gain:s*1.5});}
    const whisk=toon('#e08870');for(const s of [-1,1]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.006,.004,.12,4),whisk);w.position.set(s*.06,R*.92,R*.95);w.rotation.z=s*1.1;deco.add(w);}
  }

  // 小脚
  const feet=[];for(const s of [-1,1]){const f=new THREE.Mesh(new THREE.SphereGeometry(.085,12,8),skin);f.scale.set(1,.55,1.25);f.position.set(s*.17,.04,.06);f.castShadow=true;lean.add(f);feet.push(f);}

  // 头顶火苗：携带火种或火态时出现
  const flame=new THREE.Group();flame.visible=false;flame.position.set(0,R*2.3,0);squash.add(flame);
  const flameOuter=new THREE.Mesh(new THREE.SphereGeometry(.12,14,10),new THREE.MeshBasicMaterial({color:'#ffb347',transparent:true,opacity:.85}));flameOuter.scale.set(1,1.6,1);flame.add(flameOuter);
  const flameInner=new THREE.Mesh(new THREE.SphereGeometry(.065,10,8),new THREE.MeshBasicMaterial({color:'#fff3c4'}));flameInner.scale.set(1,1.5,1);flameInner.position.y=-.02;flame.add(flameInner);
  const flameLight=new THREE.PointLight('#ffb05a',0,4,1.6);flame.add(flameLight);
  // 水态：头顶一圈小水泡
  const bubbles=new THREE.Group();bubbles.visible=false;squash.add(bubbles);
  const bubMat=new THREE.MeshPhysicalMaterial({color:'#d8f1ff',roughness:.05,clearcoat:1,transparent:true,opacity:.6,envMap});
  for(let i=0;i<5;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.04+i%2*.02,10,8),bubMat);bubbles.add(b);}

  const spring={s:0,v:0},tilt={x:0,z:0,vx:0,vz:0};
  let blinkAt=1.5,blink=0,time=0,carrying=false,happy=0,form='normal',prevVy=0;
  const baseColor=new THREE.Color(B.color),baseEmissive=new THREE.Color(B.emissive),tc=new THREE.Color(),te=new THREE.Color();

  function impulse(amount){spring.v+=amount*S.land;}
  function setCarrying(on){carrying=on;}
  function setForm(f){form=f;}
  function cheer(){happy=1.2;impulse(-3);}

  function update(dt,{vel,grounded,yaw}){
    time+=dt;
    const target=grounded?0:THREE.MathUtils.clamp(vel.y*S.stretch,-.2,.26);
    spring.v+=((target-spring.s)*S.k-spring.v*S.d)*dt;spring.s+=spring.v*dt;spring.s=THREE.MathUtils.clamp(spring.s,-S.clamp,S.clamp);
    const breathe=grounded?Math.sin(time*3.1)*.022:0;
    const sy=1+spring.s+breathe,sxz=1/Math.sqrt(Math.max(.35,sy));squash.scale.set(sxz,sy,sxz);
    const cos=Math.cos(yaw),sin=Math.sin(yaw),fwd=vel.x*sin+vel.z*cos,side=vel.x*cos-vel.z*sin;
    const tx=THREE.MathUtils.clamp(fwd*.045,-.28,.28),tz=THREE.MathUtils.clamp(-side*.045,-.25,.25);
    tilt.vx+=((tx-tilt.x)*120-tilt.vx*9)*dt;tilt.x+=tilt.vx*dt;tilt.vz+=((tz-tilt.z)*120-tilt.vz*9)*dt;tilt.z+=tilt.vz*dt;lean.rotation.set(tilt.x,0,tilt.z);
    // 配件：由竖直速度、倾斜和身体形变共同驱动，再用各自的弹簧回正
    const dv=(vel.y-prevVy)/Math.max(dt,1e-4);prevVy=vel.y;
    const speed=Math.hypot(vel.x,vel.z);
    for(const p of parts){
      let drive=p.base;
      if(p.axis==='x')drive+=p.gain*(THREE.MathUtils.clamp(vel.y*.05,-.5,.5)+tilt.x*.8+spring.s*.6);
      if(p.axis==='z')drive+=p.gain*(tilt.z*.9-spring.s*.3);
      if(p.axis==='y')drive+=p.gain*Math.sin(time*(speed>.5?14:3))*(speed>.5?.18:.06);
      p.v+=((drive-p.a)*p.k-p.v*p.d)*dt-THREE.MathUtils.clamp(dv*.0006,-.4,.4)*(p.axis==='x'?p.gain:0);p.a+=p.v*dt;p.obj.rotation[p.axis]=p.a;
    }
    const out=grounded?0:Math.min(1,Math.abs(vel.y)*.15+.35);
    feet.forEach((f,i)=>{f.position.y=.04-out*.06;f.position.z=.06+Math.sin(time*14+i*Math.PI)*out*.05;f.scale.y=.55*(1-out*.2);});
    if(time>blinkAt){blink=.14;blinkAt=time+2+Math.random()*3;}
    blink=Math.max(0,blink-dt);const eyeY=blink>0?.12:1.15;eyes.forEach(e=>e.scale.y+=(eyeY-e.scale.y)*Math.min(1,dt*40));
    happy=Math.max(0,happy-dt);blush.opacity=.5+happy*.35;if(happy>0)parts.forEach(p=>p.v+=Math.sin(time*20)*happy*2*dt*p.k*.05);
    // 火苗 / 水泡
    const fire=carrying||form==='fire';flame.visible=fire;
    if(fire){const f=1+Math.sin(time*23)*.08+Math.sin(time*37)*.05;flameOuter.scale.set(f,1.6*f+Math.sin(time*11)*.1,f);flameLight.intensity=2.4;}else flameLight.intensity=0;
    bubbles.visible=form==='water';if(bubbles.visible)bubbles.children.forEach((b,i)=>{const a=time*1.6+i*1.257;b.position.set(Math.cos(a)*.38,R*1.7+Math.sin(time*3+i)*.08,Math.sin(a)*.38);});
    // 颜色：火种/火态偏橙，水态偏蓝，平时是角色本色
    const tint=form==='water'?FORM_TINT.water:fire?FORM_TINT.fire:null;
    tc.copy(baseColor);te.copy(baseEmissive);if(tint){tc.lerp(tint.color,.65);te.lerp(tint.emissive,.7);}
    skin.color.lerp(tc,Math.min(1,dt*5));skin.emissive.lerp(te,Math.min(1,dt*5));
  }

  return {root,body,kind,name:C.name,update,impulse,setTrigram,setCarrying,setForm,cheer,radius:R,get carrying(){return carrying;},get form(){return form;}};
}

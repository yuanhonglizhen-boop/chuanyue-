import * as THREE from '../vendor/three.module.js';

// 场景积木：材质、天空、水面、浮岛、植物、灯笼、粒子。全部程序生成，无外部贴图。
export function createWorld({scene,physics,renderer,rng}){
  const ramp=new THREE.DataTexture(new Uint8Array([120,190,235,255]),4,1,THREE.RedFormat);ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.needsUpdate=true;
  const mats=new Map();
  const toon=(color,opts={})=>{const k=color+JSON.stringify(opts);if(!mats.has(k))mats.set(k,new THREE.MeshToonMaterial({color,gradientMap:ramp,...opts}));return mats.get(k);};
  const root=new THREE.Group();scene.add(root);
  const updaters=[];
  // 静态装饰：加载完由 bake() 按材质合并成少数几个网格，减少每帧绘制次数（手机上 draw call 是主要开销）
  const statics=[];const st=m=>{statics.push(m);return m;};
  function mesh(geo,mat,x=0,y=0,z=0,parent=root){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}

  // ---------- 天空 ----------
  const skyUniforms={top:{value:new THREE.Color('#9fd3e6')},mid:{value:new THREE.Color('#e6f1ea')},bottom:{value:new THREE.Color('#f7efe0')},sun:{value:new THREE.Vector3(-.4,.5,-.75).normalize()},sunColor:{value:new THREE.Color('#fff2cc')}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(400,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:skyUniforms,
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 top;uniform vec3 mid;uniform vec3 bottom;uniform vec3 sun;uniform vec3 sunColor;varying vec3 vP;void main(){float h=vP.y;vec3 c=h>0.?mix(mid,top,smoothstep(0.,.55,h)):mix(mid,bottom,smoothstep(0.,-.3,h));float s=max(dot(vP,sun),0.);c+=sunColor*(pow(s,40.)*.6+pow(s,6.)*.18);gl_FragColor=vec4(c,1.);}'}));
  sky.renderOrder=-10;scene.add(sky);

  // 环境反射（给玉团子的清漆高光用）
  function makeEnv(){const pm=new THREE.PMREMGenerator(renderer);const s=new THREE.Scene();s.add(sky.clone());const l=new THREE.Mesh(new THREE.SphereGeometry(20,16,8),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.BackSide}));l.scale.set(.2,.2,.2);l.position.set(-20,30,-10);s.add(l);const tex=pm.fromScene(s,.04).texture;pm.dispose();return tex;}

  // ---------- 远山（水墨层次） ----------
  function farMountains(color='#a9c4bf',count=22,dist=150){
    const g=new THREE.Group();scene.add(g);const mm=new THREE.MeshBasicMaterial({color,fog:true,transparent:true,opacity:.9});
    for(let i=0;i<count;i++){const a=i/count*Math.PI*2+rng()*.2,d=dist+rng()*60,h=18+rng()*38;
      const m=new THREE.Mesh(new THREE.ConeGeometry(h*.9,h,7,1),mm);
      m.position.set(Math.cos(a)*d,-14+h/2,Math.sin(a)*d);m.scale.z=.6;m.rotation.y=rng()*3;g.add(m);st(m);}
    return g;
  }

  // ---------- 云 ----------
  const clouds=new THREE.Group();scene.add(clouds);
  function addClouds(n=14,color='#ffffff'){
    const mat=toon(color,{transparent:true,opacity:.95});
    for(let i=0;i<n;i++){const c=new THREE.Group();const a=rng()*Math.PI*2,d=40+rng()*70;c.position.set(Math.cos(a)*d,8+rng()*16,Math.sin(a)*d);
      const k=3+Math.floor(rng()*4);for(let j=0;j<k;j++){const s=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),mat);const r=1.6+rng()*2;s.scale.set(r,r*.7,r);s.position.set((j-k/2)*2.1,rng()*.8,rng()*1.4);c.add(s);}
      mergeChildren(c);
      c.userData.speed=.4+rng()*.6;clouds.add(c);}
    updaters.push((dt)=>clouds.children.forEach(c=>{c.position.x+=c.userData.speed*dt;if(c.position.x>120)c.position.x=-120;}));
  }

  // ---------- 水面 ----------
  function water({y=-.6,size=500,deep='#4fa8b8',shallow='#8fd8d0',foam='#f2fbf6'}={}){
    const u={t:{value:0},deep:{value:new THREE.Color(deep)},shallow:{value:new THREE.Color(shallow)},foam:{value:new THREE.Color(foam)},fogColor:{value:new THREE.Color()},fogNear:{value:1},fogFar:{value:2}};
    const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size,1,1),new THREE.ShaderMaterial({transparent:true,fog:true,uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,u]),
      vertexShader:'#include <fog_pars_vertex>\nvarying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;\n#include <fog_vertex>\n}',
      fragmentShader:'#include <fog_pars_fragment>\nuniform float t;uniform vec3 deep;uniform vec3 shallow;uniform vec3 foam;varying vec3 vW;float wave(vec2 p){return sin(p.x*.35+t*.9)*.5+sin(p.y*.42-t*.7)*.5+sin((p.x+p.y)*.21+t*.5)*.6;}void main(){float w=wave(vW.xz);vec3 c=mix(deep,shallow,.45+.18*w);float lines=smoothstep(.92,1.,sin(vW.x*.9+w*2.+t*.6)*sin(vW.z*.7-w*1.6))*.55;c=mix(c,foam,lines);gl_FragColor=vec4(c,.92);\n#include <fog_fragment>\n}'}));
    m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=false;scene.add(m);
    updaters.push((dt,t)=>{m.material.uniforms.t.value=t;});
    return m;
  }

  // ---------- 浮岛 ----------
  // 顶面圆角草地 + 向下收窄的岩土，带几块垂悬石
  function island({x,z,r,top=0,grass='#9fd38a',earth='#c9a77c',rock='#8c9aa0',depth=null,safe=true,tag}){
    const g=new THREE.Group();g.position.set(x,top,z);root.add(g);
    const d=depth??Math.max(2.5,r*.9);
    const pts=[new THREE.Vector2(r*.99,-.22),new THREE.Vector2(r,-.08),new THREE.Vector2(r*.985,0),new THREE.Vector2(0,0)];// 由外向内，法线朝上
    const grassM=st(mesh(new THREE.LatheGeometry(pts,40),toon(grass),0,0,0,g));
    const earthPts=[new THREE.Vector2(r*.99,-.2),new THREE.Vector2(r*.96,-.6),new THREE.Vector2(r*.8,-d*.45),new THREE.Vector2(r*.45,-d*.85),new THREE.Vector2(r*.12,-d),new THREE.Vector2(0,-d*1.02)];
    const eg=new THREE.LatheGeometry(earthPts,28);{const p=eg.attributes.position;for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),k=1+Math.sin(a*5+x)*.04+Math.sin(a*11+z)*.03;if(p.getY(i)<-.7){p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}}eg.computeVertexNormals();}
    st(mesh(eg,toon(earth),0,0,0,g));
    // 草边一圈小鼓包，让轮廓更软
    for(let i=0;i<Math.floor(r*5);i++){const a=i/(r*5)*Math.PI*2+rng()*.1;const b=mesh(new THREE.SphereGeometry(.22+rng()*.12,10,8),toon(grass),Math.cos(a)*r*.97,-.12,Math.sin(a)*r*.97,g);b.scale.y=.55;b.castShadow=false;st(b);}
    for(let i=0;i<Math.max(2,Math.floor(r/1.6));i++){const a=rng()*Math.PI*2,rr=r*(.4+rng()*.4);const s=mesh(new THREE.ConeGeometry(.35+rng()*.5,1+rng()*1.8,6),toon(rock),Math.cos(a)*rr,-d*.55-rng()*d*.4,Math.sin(a)*rr,g);s.rotation.x=Math.PI;st(s);}
    const col=physics.add({kind:'cyl',x,z,r:r*.985,top,bottom:top-d,safe,tag,mesh:g});
    return {group:g,col,r,top};
  }
  // 小石墩 / 莲叶 等圆形平台
  function stone({x,z,r=1,top=0,color='#e7dfc8',h=.5,safe=true,tag,bounce}){
    const g=new THREE.Group();g.position.set(x,top,z);root.add(g);
    const geo=new THREE.CylinderGeometry(r,r*.9,h,24);const m=mesh(geo,toon(color),0,-h/2,0,g);
    const capPts=[new THREE.Vector2(r,-.08),new THREE.Vector2(r*.9,0),new THREE.Vector2(0,0)];mesh(new THREE.LatheGeometry(capPts,24),toon(color),0,0,0,g);
    const col=physics.add({kind:'cyl',x,z,r,top,bottom:top-h-.5,safe,tag,bounce,mesh:g});return {group:g,col,body:m};
  }
  function box({x,z,w,d,top=0,h=.4,rot=0,color='#c79a63',safe=true,tag}){
    const g=new THREE.Group();g.position.set(x,top,z);g.rotation.y=rot;root.add(g);
    const m=mesh(new THREE.BoxGeometry(w,h,d),toon(color),0,-h/2,0,g);
    const col=physics.add({kind:'box',x,z,hw:w/2,hd:d/2,rot,top,bottom:top-h,safe,tag,mesh:g});return {group:g,col,body:m};
  }
  // 木板桥：一串木板 + 一个盒形碰撞体
  function bridge({from,to,top=0,width=1.8,color='#c99b62',rope='#7a5a3a'}){
    const dx=to[0]-from[0],dz=to[1]-from[1],len=Math.hypot(dx,dz),rot=Math.atan2(dx,dz);
    const g=new THREE.Group();g.position.set((from[0]+to[0])/2,top,(from[1]+to[1])/2);g.rotation.y=rot;root.add(g);
    const n=Math.ceil(len/.42);for(let i=0;i<n;i++){const p=st(mesh(new THREE.BoxGeometry(width,.12,.36),toon(i%2?color:'#b98a55'),0,-.06,-len/2+(i+.5)*len/n,g));p.rotation.z=(rng()-.5)*.04;}
    for(const s of [-1,1]){for(let i=0;i<=Math.ceil(len/2.2);i++){st(mesh(new THREE.CylinderGeometry(.05,.06,.8,6),toon(rope),s*width/2,.3,-len/2+i*len/Math.ceil(len/2.2),g));}
      const r=st(mesh(new THREE.CylinderGeometry(.025,.025,len,4),toon(rope),s*width/2,.62,0,g));r.rotation.x=Math.PI/2;}
    const col=physics.add({kind:'box',x:g.position.x,z:g.position.z,hw:width/2,hd:len/2,rot,top,bottom:top-.3,safe:true,mesh:g});
    return {group:g,col};
  }

  // ---------- 植物 / 摆件 ----------
  function roundTree(x,y,z,s=1,leafColor='#7cc77a',trunk='#9b7653'){
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);root.add(g);
    const t=st(mesh(new THREE.CylinderGeometry(.14,.22,1.4,8),toon(trunk),0,.7,0,g));t.rotation.z=(rng()-.5)*.15;
    const k=3+Math.floor(rng()*2);for(let i=0;i<k;i++){const b=mesh(new THREE.SphereGeometry(.75+rng()*.3,16,12),toon(leafColor),(rng()-.5)*.9,1.7+rng()*.6,(rng()-.5)*.9,g);b.scale.y=.85;st(b);}
    physics.add({kind:'cyl',x,z,r:.3*s,top:y+2.2*s,bottom:y-.5,safe:false});return g;
  }
  function pine(x,y,z,s=1,leaf='#4f9a7a',trunk='#7a5c44'){
    const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);root.add(g);
    st(mesh(new THREE.CylinderGeometry(.12,.2,1.6,7),toon(trunk),0,.8,0,g));
    for(let i=0;i<3;i++){const c=mesh(new THREE.SphereGeometry(.9-i*.2,12,8),toon(leaf),(i%2?.3:-.25),1.3+i*.55,(i-1)*.15,g);c.scale.set(1.3,.45,1);st(c);}
    physics.add({kind:'cyl',x,z,r:.28*s,top:y+2.6*s,bottom:y-.5,safe:false});return g;
  }
  function bamboo(x,y,z,n=5,color='#76b98a'){
    const g=new THREE.Group();g.position.set(x,y,z);root.add(g);const m=toon(color),node=toon('#5f9c74');
    for(let i=0;i<n;i++){const bx=(rng()-.5)*1.2,bz=(rng()-.5)*1.2,h=3+rng()*2.2;const c=st(mesh(new THREE.CylinderGeometry(.06,.07,h,6),m,bx,h/2,bz,g));c.rotation.z=(rng()-.5)*.1;
      for(let j=1;j<h/.7;j++)st(mesh(new THREE.CylinderGeometry(.075,.075,.04,6),node,bx,j*.7,bz,g));
      for(let j=0;j<3;j++){const l=mesh(new THREE.ConeGeometry(.08,.6,4),toon('#8fd19b'),bx+(rng()-.5)*.5,h-.3-j*.4,bz+(rng()-.5)*.5,g);l.rotation.z=1.2+(rng()-.5);l.castShadow=false;st(l);}}
    physics.add({kind:'cyl',x,z,r:.75,top:y+4,bottom:y-.5,safe:false});return g;
  }
  function rock(x,y,z,s=1,color='#a3b1b3'){const m=st(mesh(new THREE.DodecahedronGeometry(.6,0),toon(color),x,y+.25*s,z));m.scale.set(s*1.2,s*.8,s);m.rotation.y=rng()*3;physics.add({kind:'cyl',x,z,r:.62*s,top:y+.5*s,bottom:y-.5,safe:true});return m;}
  function lantern(x,y,z,glow='#ffd98a'){
    const g=new THREE.Group();g.position.set(x,y,z);root.add(g);const s=toon('#c9c3b0'),roof=toon('#5d8a86');
    st(mesh(new THREE.CylinderGeometry(.22,.28,.2,6),s,0,.1,0,g));st(mesh(new THREE.CylinderGeometry(.08,.1,.6,6),s,0,.5,0,g));
    const lamp=mesh(new THREE.BoxGeometry(.36,.3,.36),new THREE.MeshBasicMaterial({color:glow}),0,.95,0,g);lamp.castShadow=false;
    st(mesh(new THREE.ConeGeometry(.36,.25,4),roof,0,1.22,0,g)).rotation.y=Math.PI/4;
    physics.add({kind:'cyl',x,z,r:.3,top:y+1.3,bottom:y-.5,safe:false});return {group:g,lamp};
  }
  // 草丛与小花：InstancedMesh，一次绘制
  function meadow(spots,count=400,colors=['#8bcc77','#a3d98c'],flowers=['#ffd1dc','#fff3b0','#ffffff']){
    const blade=new THREE.ConeGeometry(.035,.22,3);blade.translate(0,.11,0);
    const grass=new THREE.InstancedMesh(blade,toon(colors[0]),count);const flower=new THREE.InstancedMesh(new THREE.SphereGeometry(.07,6,4),new THREE.MeshBasicMaterial({color:'#ffffff'}),Math.floor(count/6));
    const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p=new THREE.Vector3(),e=new THREE.Euler();let fi=0;const col=new THREE.Color();
    for(let i=0;i<count;i++){const spot=spots[Math.floor(rng()*spots.length)];const a=rng()*Math.PI*2,r=Math.sqrt(rng())*spot.r*.92;p.set(spot.x+Math.cos(a)*r,spot.top,spot.z+Math.sin(a)*r);e.set((rng()-.5)*.4,rng()*3,(rng()-.5)*.4);q.setFromEuler(e);const k=.6+rng()*.7;s.set(k,k,k);m.compose(p,q,s);grass.setMatrixAt(i,m);
      if(i%6===0&&fi<flower.count){p.y+=.2*k;s.setScalar(.6+rng()*.4);m.compose(p,q,s);flower.setMatrixAt(fi,m);flower.setColorAt(fi,col.set(flowers[fi%flowers.length]));fi++;}}
    grass.receiveShadow=true;root.add(grass);root.add(flower);return {grass,flower};
  }

  // ---------- 粒子：尘土、水花、光点 ----------
  const sprite=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');const gr=x.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.5,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,32,32);const t=new THREE.CanvasTexture(c);return t;})();
  const pool=[];const pmat=(color)=>new THREE.SpriteMaterial({map:sprite,color,transparent:true,depthWrite:false});
  function burst(pos,{color='#ffffff',n=10,speed=2,up=2,life=.6,size=.35,gravity=6}={}){
    for(let i=0;i<n;i++){let s=pool.find(o=>!o.visible);if(!s){if(pool.length>220)return;s=new THREE.Sprite(pmat(color));scene.add(s);pool.push(s);}
      s.material.color.set(color);s.visible=true;s.position.copy(pos);const a=rng()*Math.PI*2,v=speed*(.4+rng()*.6);s.userData={vx:Math.cos(a)*v,vy:up*(.5+rng()*.8),vz:Math.sin(a)*v,life,age:0,size,gravity};s.scale.setScalar(size);}
  }
  updaters.push(dt=>{for(const s of pool){if(!s.visible)continue;const u=s.userData;u.age+=dt;if(u.age>=u.life){s.visible=false;continue;}u.vy-=u.gravity*dt;s.position.x+=u.vx*dt;s.position.y+=u.vy*dt;s.position.z+=u.vz*dt;const k=1-u.age/u.life;s.material.opacity=k;s.scale.setScalar(u.size*(.6+k*.6));}});

  // 把若干网格的几何体变换到 space 坐标系下拼成一个（统一转成非索引几何，属性取 position / normal / uv）
  function mergeGeos(list,space){const inv=new THREE.Matrix4().copy(space.matrixWorld).invert(),mt=new THREE.Matrix4();let n=0;const parts=[];
    for(const m of list){m.updateWorldMatrix(true,false);let g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();mt.multiplyMatrices(inv,m.matrixWorld);g.applyMatrix4(mt);parts.push(g);n+=g.attributes.position.count;}
    const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2);let o=0;
    for(const g of parts){const c=g.attributes.position.count;pos.set(g.attributes.position.array,o*3);if(g.attributes.normal)nor.set(g.attributes.normal.array,o*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,o*2);o+=c;g.dispose();}
    const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.BufferAttribute(pos,3));out.setAttribute('normal',new THREE.BufferAttribute(nor,3));out.setAttribute('uv',new THREE.BufferAttribute(uv,2));out.computeBoundingSphere();return out;}
  function mergeChildren(group){group.updateWorldMatrix(true,true);const kids=group.children.filter(o=>o.isMesh);if(kids.length<2)return;
    const m=new THREE.Mesh(mergeGeos(kids,group),kids[0].material);m.castShadow=kids[0].castShadow;m.receiveShadow=kids[0].receiveShadow;
    for(const k of kids){group.remove(k);k.geometry.dispose();}group.add(m);}
  function bake(){scene.updateMatrixWorld(true);const groups=new Map();
    for(const m of statics){if(!m.parent||!m.visible)continue;const k=m.material.uuid+(m.castShadow?'|c':'|n');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m);}
    for(const list of groups.values()){if(list.length<2)continue;const m=new THREE.Mesh(mergeGeos(list,scene),list[0].material);m.castShadow=list[0].castShadow;m.receiveShadow=list[0].receiveShadow;scene.add(m);
      for(const o of list){o.parent.remove(o);o.geometry.dispose();}}
    statics.length=0;}
  function update(dt,t){for(const f of updaters)f(dt,t);}
  function dispose(){scene.traverse(o=>{o.geometry?.dispose?.();});}
  return {root,toon,mesh,bake,markStatic:st,sky,skyUniforms,makeEnv,farMountains,addClouds,water,island,stone,box,bridge,roundTree,pine,bamboo,rock,lantern,meadow,burst,update,updaters,dispose};
}

// 可复现的随机数
export function seeded(seed=1){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}

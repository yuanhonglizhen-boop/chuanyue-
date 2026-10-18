import * as THREE from '../vendor/three.module.js';

// 青玉色软糖小龙（第五境）：大圆头、金色小鹿角、长须，身体是一串由粗到细的玉珠，背上一排小鳍。
// 身体用"跟随"的办法动：每一节跟着前一节、保持固定间距，所以头怎么游，身子就怎么蜿蜒。
// 需要摆造型时（盘成桥、托人上升），给每一节一个目标位置，慢慢挪过去。
export function createDragon({world,envMap,N=16,spacing=.52}){
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const root=new THREE.Group();
  // ---------- 头（顶点着色合成一个网格） ----------
  const o=new THREE.Object3D();
  function part(geo,color,{p=[0,0,0],s=[1,1,1],r=[0,0,0]}={}){o.position.set(...p);o.scale.set(...s);o.rotation.set(...r);o.updateMatrix();const g=(geo.index?geo.toNonIndexed():geo.clone()).applyMatrix4(o.matrix);if(g.attributes.uv)g.deleteAttribute('uv');
    const c=new THREE.Color(color),n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;}
  function merge(gs){let n=0;for(const g of gs)n+=g.attributes.position.count;const out=new THREE.BufferGeometry();for(const [k,s] of [['position',3],['normal',3],['color',3]]){const a=new Float32Array(n*s);let off=0;for(const g of gs){a.set(g.attributes[k].array,off);off+=g.attributes[k].array.length;}out.setAttribute(k,new THREE.BufferAttribute(a,s));}out.computeBoundingSphere();return out;}
  const JADE='#7fdcb4',LIGHT='#c4f2dc',DEEP='#4fbf93',GOLD='#f2dc9a';
  const S=(r,w=18,h=14)=>new THREE.SphereGeometry(r,w,h);
  const headParts=[part(S(.5,24,18),JADE,{s:[1,.92,1.05]}),part(S(.32,20,14),LIGHT,{p:[0,-.12,.4],s:[1.08,.74,1.15]}),
    part(S(.035,8,6),'#2a3a33',{p:[-.1,-.03,.74]}),part(S(.035,8,6),'#2a3a33',{p:[.1,-.03,.74]}),
    part(new THREE.TorusGeometry(.06,.012,4,12,Math.PI),'#2a3a33',{p:[0,-.2,.68],r:[0,0,Math.PI]})];
  for(const s of [-1,1]){
    headParts.push(part(S(.13,16,12),'#17211d',{p:[s*.25,.12,.36],s:[1,1.2,.5]}),part(S(.048,8,6),'#ffffff',{p:[s*.25+.045,.18,.415]}),part(S(.022,6,4),'#ffffff',{p:[s*.25-.04,.07,.415]}),// 大眼睛 + 两个高光
      part(new THREE.CircleGeometry(.07,14),'#ffb1c2',{p:[s*.38,-.06,.3],r:[0,s*.75,0],s:[1,.6,1]}),// 腮红
      part(new THREE.CylinderGeometry(.045,.06,.42,8),GOLD,{p:[s*.2,.5,-.12],r:[-.6,0,-s*.32]}),part(S(.06,8,6),GOLD,{p:[s*.27,.66,-.25]}),// 金色小鹿角
      part(new THREE.CylinderGeometry(.03,.04,.18,6),GOLD,{p:[s*.3,.5,-.06],r:[-.2,0,-s*1.1]}),
      part(new THREE.CylinderGeometry(.012,.008,.55,5),GOLD,{p:[s*.36,-.14,.52],r:[.2,0,s*1.25]}));}// 长须
  for(const [y,z,r] of [[.38,-.32,.13],[.22,-.48,.12],[.02,-.55,.1]])headParts.push(part(S(r,10,8),DEEP,{p:[0,y,z]}));// 头后的鬃
  const skin=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.22,clearcoat:1,clearcoatRoughness:.12,sheen:.5,sheenColor:new THREE.Color('#eafff5'),emissive:new THREE.Color('#1f6a50'),emissiveIntensity:.28,envMap,envMapIntensity:1});
  const head=new THREE.Mesh(merge(headParts),skin);head.frustumCulled=false;root.add(head);
  // ---------- 身体：一串玉珠（一次绘制）+ 背鳍 + 小爪 + 尾巴尖 ----------
  const body=new THREE.InstancedMesh(S(1,18,12),new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.22,clearcoat:1,clearcoatRoughness:.12,emissive:new THREE.Color('#1f6a50'),emissiveIntensity:.25,envMap,envMapIntensity:1}),N);
  const fin=new THREE.InstancedMesh(new THREE.ConeGeometry(.09,.24,6),new THREE.MeshToonMaterial({color:GOLD}),N);
  const feet=new THREE.InstancedMesh(S(.09,10,8),new THREE.MeshPhysicalMaterial({color:JADE,roughness:.25,clearcoat:1,envMap}),4);
  const tail=new THREE.Mesh(merge([part(new THREE.ConeGeometry(.12,.45,8),DEEP,{p:[0,.1,-.25],r:[-1.2,0,0]}),part(new THREE.ConeGeometry(.1,.4,8),DEEP,{p:[.12,0,-.22],r:[-1.3,0,-.5]}),part(new THREE.ConeGeometry(.1,.4,8),DEEP,{p:[-.12,0,-.22],r:[-1.3,0,.5]})]),new THREE.MeshToonMaterial({vertexColors:true}));
  for(const m of [body,fin,feet,tail])m.frustumCulled=false;root.add(body,fin,feet,tail);
  const c=new THREE.Color();for(let i=0;i<N;i++)body.setColorAt(i,c.set(i%2?'#86e1bb':'#76d6ad'));
  const radius=i=>.42-.27*(i/(N-1));
  // ---------- 状态 ----------
  const d={root,head,N,spacing,headPos:V(0,0,0),headDir:V(0,0,1),segs:[],pose:null,poseK:3,shakeT:0,bob:0,blinkAt:2,blink:0,radius,
    // 把整条龙摆到 p 处、朝 dir 方向伸直（瞬移用）
    place(p,dir=V(0,0,1)){d.headPos.copy(p);d.headDir.copy(dir).normalize();d.segs=[];for(let i=0;i<N;i++)d.segs.push(p.clone().addScaledVector(d.headDir,-(i+1)*spacing));},
    shake(){d.shakeT=.8;},
    update(dt,t){
      const segs=d.segs;
      if(d.pose){const k=Math.min(1,dt*d.poseK);d.headPos.lerp(d.pose[0],k);for(let i=0;i<N;i++)segs[i].lerp(d.pose[Math.min(i+1,d.pose.length-1)],k);}
      else{let prev=d.headPos;const fl=Math.min(1,dt*1.6);for(let i=0;i<N;i++){const s=segs[i];s.y+=(prev.y-s.y)*fl;/* 身子慢慢浮平，不会一直垂着 */const dx=s.x-prev.x,dy=s.y-prev.y,dz=s.z-prev.z,l=Math.hypot(dx,dy,dz)||1;s.set(prev.x+dx/l*spacing,prev.y+dy/l*spacing,prev.z+dz/l*spacing);prev=s;}}
      // 头
      d.shakeT=Math.max(0,d.shakeT-dt);const shake=d.shakeT>0?Math.sin(d.shakeT*28)*.5*d.shakeT:0;
      head.position.copy(d.headPos);const fwd=d.pose?segs[0].clone().sub(d.headPos).multiplyScalar(-1):d.headDir;
      if(fwd.lengthSq()>1e-5)head.lookAt(d.headPos.x+fwd.x,d.headPos.y+fwd.y,d.headPos.z+fwd.z);head.rotateY(shake);head.position.y+=Math.sin(t*2.2)*.03;
      // 身体、背鳍、小爪
      const m=new THREE.Matrix4(),q=new THREE.Quaternion(),up=V(0,1,0),dir=V(),sc=V();
      for(let i=0;i<N;i++){const r=radius(i),p=segs[i],nx=i>0?segs[i-1]:d.headPos;dir.subVectors(nx,p).normalize();q.setFromUnitVectors(V(0,0,1),dir.lengthSq()>0?dir:V(0,0,1));
        const breathe=1+Math.sin(t*3-i*.6)*.04;m.compose(p,q,sc.set(r*breathe,r*.95*breathe,r*1.15));body.setMatrixAt(i,m);
        m.compose(V(p.x,p.y+r*.92,p.z),q,sc.set(1,1+r,1).multiplyScalar(.7+r));fin.setMatrixAt(i,m);}
      [[3,-1],[3,1],[9,-1],[9,1]].forEach(([i,s],k)=>{const p=segs[i],r=radius(i),nx=segs[i-1];dir.subVectors(nx,p).normalize();const side=V(dir.z,0,-dir.x).normalize();
        m.compose(V(p.x+side.x*s*r*.9,p.y-r*.75+Math.sin(t*6+k)*.03,p.z+side.z*s*r*.9),q,sc.set(1,.8,1.3));feet.setMatrixAt(k,m);});
      const last=segs[N-1],pl=segs[N-2];tail.position.copy(last);tail.lookAt(last.x*2-pl.x,last.y*2-pl.y,last.z*2-pl.z);tail.rotateY(Math.PI);
      body.instanceMatrix.needsUpdate=fin.instanceMatrix.needsUpdate=feet.instanceMatrix.needsUpdate=true;
    },
    saddle(out=V()){const s=d.segs[3];return out.set(s.x,s.y+radius(3)*.95,s.z);},// 骑龙的位置：第四节背上
  };
  d.place(V(0,0,0));
  return d;
}

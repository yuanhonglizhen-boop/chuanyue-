import * as THREE from '../vendor/three.module.js';
import {woodTex,floorTex,stoneTex,huiwenTex,panelTex,coffersTex,scrollTex,plaqueTex,latticeTex} from './textures.js';

// 场景积木：房间（墙、柱、藻井、地面）、门、宫灯、烛台、书架、卷轴、匾额；以及碰撞与可交互物体登记。
export function createWorld(scene){
  const root=new THREE.Group();scene.add(root);
  const updaters=[],interactables=[],colliders=[];
  const M={
    lacquer:new THREE.MeshStandardMaterial({color:'#7a1c14',roughness:.32,metalness:.05}),
    darkWood:new THREE.MeshStandardMaterial({map:woodTex('#2a160e',3),roughness:.55}),
    wood:new THREE.MeshStandardMaterial({map:woodTex('#4a2a18',5),roughness:.5}),
    gold:new THREE.MeshStandardMaterial({color:'#d4a64a',roughness:.28,metalness:.85}),
    bronze:new THREE.MeshStandardMaterial({color:'#6f5a36',roughness:.42,metalness:.8}),
    jade:new THREE.MeshPhysicalMaterial({color:'#7fb8a0',roughness:.18,clearcoat:1,transmission:0,metalness:0}),
    stone:new THREE.MeshStandardMaterial({color:'#5a6062',roughness:.85}),
    paper:new THREE.MeshStandardMaterial({color:'#efe1bd',roughness:.9}),
    silk:new THREE.MeshStandardMaterial({color:'#a3241b',roughness:.6,emissive:'#5a0d07',emissiveIntensity:.25,side:THREE.DoubleSide}),
  };
  /* 水墨模式下各材质的墨色：漆→浓墨，深木→重墨，木/金/铜→淡赭，石→淡墨 */
  const INK={lacquer:{tone:.34,tint:'grey'},darkWood:{tone:.6,tint:'grey'},wood:{tone:.8,tint:'ochre'},gold:{tone:.86,tint:'ochre'},bronze:{tone:.66,tint:'ochre'},jade:{tone:.85,tint:'grey'},stone:{tone:.78,tint:'grey'},paper:{tone:.97,tint:'grey'},silk:{tone:.6,tint:'ochre'}};
  for(const k in INK)M[k].userData.ink=INK[k];
  const mesh=(geo,mat,x=0,y=0,z=0,parent=root)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;};

  // ---------- 碰撞（俯视二维） ----------
  function addBox(x,z,hw,hd,tag){const c={kind:'box',x,z,hw,hd,tag};colliders.push(c);return c;}
  function addCyl(x,z,r,tag){const c={kind:'cyl',x,z,r,tag};colliders.push(c);return c;}
  function removeCollider(c){const i=colliders.indexOf(c);if(i>=0)colliders.splice(i,1);}
  function blocked(x,z,r=.42,ignore=null){for(const c of colliders){if(c.off||c===ignore)continue;if(c.kind==='cyl'){if(Math.hypot(x-c.x,z-c.z)<c.r+r)return c;}else if(Math.abs(x-c.x)<c.hw+r&&Math.abs(z-c.z)<c.hd+r)return c;}return null;}

  // ---------- 可交互 ----------
  // opts: {label, range, onClick, enabled}
  function interact(obj,opts){obj.traverse(o=>{if(o.isMesh){o.userData.interact=opts;interactables.push(o);}});opts.object=obj;return opts;}

  // ---------- 房间 ----------
  // doors: [{side:'n'|'s'|'e'|'w', at:偏移, width}]
  function room({cx,cz,w=11,d=11,h=4.6,doors=[],floor='wood',name}){
    const g=new THREE.Group();g.position.set(cx,0,cz);root.add(g);
    const fm=floor==='stone'?new THREE.MeshStandardMaterial({map:stoneTex(),roughness:.7}):new THREE.MeshStandardMaterial({map:floorTex(),roughness:.45,metalness:.05});
    const fl=mesh(new THREE.PlaneGeometry(w,d),fm,0,0,0,g);fl.rotation.x=-Math.PI/2;fl.userData.floor=true;fl.name='floor';
    // 墙：下部深色护墙板、中部朱漆板、上部回纹带
    const panel=new THREE.MeshStandardMaterial({map:panelTex(),roughness:.4});panel.map.repeat.set(1,1);
    const frieze=new THREE.MeshStandardMaterial({map:huiwenTex(),roughness:.4,metalness:.3});
    const sides=[['n',0,-d/2,w,0],['s',0,d/2,w,Math.PI],['w',-w/2,0,d,Math.PI/2],['e',w/2,0,d,-Math.PI/2]];
    for(const [side,x,z,len,rot] of sides){
      const gaps=doors.filter(o=>o.side===side).map(o=>[o.at-o.width/2,o.at+o.width/2]).sort((a,b)=>a[0]-b[0]);
      // 把一面墙按门洞切成若干段
      const segs=[];let s=-len/2;for(const [a,b] of gaps){if(a>s)segs.push([s,a]);s=b;}if(s<len/2)segs.push([s,len/2]);
      const wall=new THREE.Group();wall.position.set(x,0,z);wall.rotation.y=rot;g.add(wall);
      for(const [a,b] of segs){const L=b-a,m=(a+b)/2;
        const dado=mesh(new THREE.BoxGeometry(L,1.1,.12),M.darkWood,m,.55,.06,wall);
        const p=mesh(new THREE.PlaneGeometry(L,h-1.6),panel.clone(),m,1.1+(h-1.6)/2,.01,wall);p.material.map=panelTex();p.material.map=p.material.map.clone();p.material.map.needsUpdate=true;p.material.map.repeat.set(Math.max(1,Math.round(L/2.4)),1);
        const fr=mesh(new THREE.PlaneGeometry(L,.5),frieze.clone(),m,h-.25,.02,wall);fr.material.map=huiwenTex().clone();fr.material.map.needsUpdate=true;fr.material.map.repeat.set(Math.round(L/1.2),1);
        mesh(new THREE.BoxGeometry(L,.08,.16),M.gold,m,1.12,.08,wall);
        // 碰撞
        const wx=Math.cos(rot)*m,wz=-Math.sin(rot)*m;const along=Math.abs(Math.sin(rot))<.5;
        addBox(cx+x+wx,cz+z+wz,along?L/2:.15,along?.15:L/2,'wall');
      }
      // 门洞上方补一段墙（门框只到 3 米左右）
      for(const [a,b] of gaps){const top=2.95;mesh(new THREE.BoxGeometry(b-a,h-top,.12),M.lacquer,(a+b)/2,top+(h-top)/2,.06,wall);
        const fr=mesh(new THREE.PlaneGeometry(b-a,.5),frieze.clone(),(a+b)/2,h-.25,.125,wall);fr.material.map=huiwenTex().clone();fr.material.map.needsUpdate=true;fr.material.map.repeat.set(Math.max(1,Math.round((b-a)/1.2)),1);}
      // 墙背面（深色），防止从外面看穿。按段铺，门洞处留空——否则从走廊望进门里是一片黑
      for(const [a,b] of segs)mesh(new THREE.PlaneGeometry(b-a,h),new THREE.MeshBasicMaterial({color:'#120a07',side:THREE.BackSide}),(a+b)/2,h/2,-.01,wall);
    }
    // 四角朱漆柱（金柱础、金箍）
    for(const [x,z] of [[-w/2+.35,-d/2+.35],[w/2-.35,-d/2+.35],[-w/2+.35,d/2-.35],[w/2-.35,d/2-.35]]){column(cx+x,cz+z,h);}
    // 天花：藻井（中央逐层收进的八角井）
    const ceil=mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshStandardMaterial({map:coffersTex(),roughness:.5,metalness:.2}),0,h,0,g);ceil.rotation.x=Math.PI/2;
    for(let k=0;k<3;k++){const r=2.1-k*.55,y=h+k*.32;const ring=mesh(new THREE.CylinderGeometry(r,r+.12,.32,8,1,true),k%2?M.gold:M.lacquer,0,y+.16,0,g);ring.material.side=THREE.DoubleSide;ring.rotation.y=Math.PI/8;
      const cap=mesh(new THREE.RingGeometry(r-.55,r,8,1),new THREE.MeshStandardMaterial({color:k%2?'#1e4744':'#d4a64a',roughness:.4,metalness:k%2?.1:.8,side:THREE.DoubleSide}),0,y,0,g);cap.rotation.x=Math.PI/2;cap.rotation.z=Math.PI/8;}
    const top=mesh(new THREE.CircleGeometry(.75,8),new THREE.MeshStandardMaterial({color:'#d4a64a',metalness:.8,roughness:.3,side:THREE.DoubleSide}),0,h+.96,0,g);top.rotation.x=Math.PI/2;
    // 梁：两道朱漆横梁 + 金色彩画
    for(const s of [-1,1]){const beam=mesh(new THREE.BoxGeometry(w,.36,.3),M.lacquer,0,h-.2,s*d/4,g);mesh(new THREE.BoxGeometry(w,.06,.32),M.gold,0,h-.38,s*d/4,g);}
    return {group:g,cx,cz,w,d,h,name};
  }
  function column(x,z,h){mesh(new THREE.CylinderGeometry(.24,.26,h,20),M.lacquer,x,h/2,z);mesh(new THREE.CylinderGeometry(.36,.4,.22,20),M.stone,x,.11,z);
    for(const y of [.5,h-.5])mesh(new THREE.TorusGeometry(.25,.035,8,24),M.gold,x,y,z).rotation.x=Math.PI/2;addCyl(x,z,.3,'column');}

  // ---------- 门（两扇朱漆门，金门钉；开门时向内转开） ----------
  function door({x,z,side='n',width=1.8,h=2.8,locked=true,label='门'}){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=side==='n'||side==='s'?0:Math.PI/2;root.add(g);
    // 门框
    for(const s of [-1,1])mesh(new THREE.BoxGeometry(.18,h+.2,.3),M.lacquer,s*(width/2+.09),(h+.2)/2,0,g);
    mesh(new THREE.BoxGeometry(width+.54,.3,.34),M.lacquer,0,h+.25,0,g);mesh(new THREE.BoxGeometry(width+.6,.08,.36),M.gold,0,h+.42,0,g);
    // 两扇门
    const leaves=[];for(const s of [-1,1]){const pivot=new THREE.Group();pivot.position.set(s*width/2,0,0);g.add(pivot);
      const leaf=mesh(new THREE.BoxGeometry(width/2,h,.08),M.lacquer,-s*width/4,h/2,0,pivot);
      for(let i=0;i<5;i++)for(let j=0;j<3;j++)mesh(new THREE.SphereGeometry(.035,8,6),M.gold,-s*(width/4)+(j-1)*.22,.6+i*.42,.05,pivot);
      const ring=mesh(new THREE.TorusGeometry(.07,.014,6,16),M.gold,-s*.12,h*.5,.07,pivot);leaves.push({pivot,s});}
    const col=addBox(x,z,side==='n'||side==='s'?width/2:.2,side==='n'||side==='s'?.2:width/2,'door');
    const it={group:g,col,locked,open:false,t:0};
    it.openDoor=()=>{if(it.open)return;it.open=true;col.off=true;};
    updaters.push(dt=>{if(it.open&&it.t<1){it.t=Math.min(1,it.t+dt*.7);const e=1-Math.pow(1-it.t,3);leaves.forEach(({pivot,s})=>pivot.rotation.y=s*e*1.75);}});
    return it;
  }

  // ---------- 宫灯（六角，绢面，金框，内置点光源） ----------
  function lantern(x,y,z,{light=true,intensity=6,distance=9,color='#ffb766'}={}){
    const g=new THREE.Group();g.position.set(x,y,z);root.add(g);
    const body=mesh(new THREE.CylinderGeometry(.32,.32,.62,6,1,true),new THREE.MeshStandardMaterial({color:'#c4301f',emissive:'#ff6a2a',emissiveIntensity:1.2,roughness:.6,side:THREE.DoubleSide,transparent:true,opacity:.92}),0,0,0,g);
    for(const yy of [-.33,.33])mesh(new THREE.CylinderGeometry(.38,.38,.06,6),M.gold,0,yy,0,g);
    mesh(new THREE.ConeGeometry(.3,.22,6),M.gold,0,.47,0,g);mesh(new THREE.CylinderGeometry(.01,.01,1.2,4),M.gold,0,1.1,0,g);
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const t=mesh(new THREE.CylinderGeometry(.008,.008,.4,4),new THREE.MeshStandardMaterial({color:'#c4301f'}),Math.cos(a)*.34,-.56,Math.sin(a)*.34,g);}
    const tassel=mesh(new THREE.ConeGeometry(.06,.3,8),new THREE.MeshStandardMaterial({color:'#c4301f',roughness:.8}),0,-.55,0,g);
    let pl=null;if(light){pl=new THREE.PointLight(color,intensity,distance,1.6);pl.position.y=0;g.add(pl);}
    const seed=Math.random()*10;updaters.push((dt,t)=>{g.rotation.y=Math.sin(t*.3+seed)*.06;if(pl)pl.intensity=intensity*(.92+Math.sin(t*7+seed)*.04+Math.sin(t*13+seed)*.03);});
    return {group:g,light:pl};
  }
  // 青铜烛台（三叉）
  function candleStand(x,z,{h=1.5,light=true}={}){
    const g=new THREE.Group();g.position.set(x,0,z);root.add(g);
    mesh(new THREE.CylinderGeometry(.22,.3,.1,12),M.bronze,0,.05,0,g);mesh(new THREE.CylinderGeometry(.04,.05,h,10),M.bronze,0,h/2,0,g);
    const flames=[];for(const s of [-1,0,1]){const cx=s*.22;if(s)mesh(new THREE.TorusGeometry(.11,.02,6,12,Math.PI),M.bronze,s*.11,h-.02,0,g).rotation.z=s>0?0:Math.PI;
      mesh(new THREE.CylinderGeometry(.05,.05,.05,10),M.bronze,cx,h+.05,0,g);mesh(new THREE.CylinderGeometry(.03,.03,.16,8),new THREE.MeshStandardMaterial({color:'#f2e6cf',roughness:.7}),cx,h+.15,0,g);
      const f=mesh(new THREE.SphereGeometry(.03,8,6),new THREE.MeshBasicMaterial({color:'#ffd27a'}),cx,h+.27,0,g);f.scale.y=1.8;flames.push(f);}
    let pl=null;if(light){pl=new THREE.PointLight('#ffa64d',2.2,5,1.8);pl.position.y=h+.35;g.add(pl);}
    const seed=Math.random()*10;updaters.push((dt,t)=>{flames.forEach((f,i)=>{f.scale.y=1.6+Math.sin(t*15+i+seed)*.25;});if(pl)pl.intensity=2.2*(.9+Math.sin(t*11+seed)*.08);});
    addCyl(x,z,.3,'stand');return g;
  }
  // 书架（满架线装书与卷轴）
  function shelf(x,z,{w=2.2,h=2.6,rot=0}={}){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;root.add(g);
    for(const s of [-1,1])mesh(new THREE.BoxGeometry(.08,h,.5),M.darkWood,s*w/2,h/2,0,g);
    for(let i=0;i<5;i++)mesh(new THREE.BoxGeometry(w,.06,.5),M.darkWood,0,.05+i*(h-.1)/4,0,g);
    const bookMats=['#2b3a55','#5b2a1f','#2f4a3a','#6e5a2a','#1f2a2a'].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.8}));
    let seed=(Math.abs(Math.floor(x*131+z*71))%9973)+17;const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};/* 正整数种子，避免负数导致书本尺寸异常 */
    for(let i=0;i<4;i++){let px=-w/2+.1;const y=.08+i*(h-.1)/4;while(px<w/2-.15){const bw=.05+r()*.06,bh=.36+r()*.14;if(r()<.12){const sc=mesh(new THREE.CylinderGeometry(.05,.05,.42,10),M.paper,px+.05,y+.06,0,g);sc.rotation.z=Math.PI/2;px+=.14;continue;}
      mesh(new THREE.BoxGeometry(bw,bh,.32),bookMats[Math.floor(r()*5)],px+bw/2,y+bh/2,(r()-.5)*.06,g);px+=bw+.008;}}
    const along=Math.abs(Math.sin(rot))<.5;addBox(x,z,along?w/2:.3,along?.3:w/2,'shelf');return g;
  }
  // 挂轴：竖排书法，可点击阅读
  function hangingScroll(x,y,z,rot,columns,{w=.9,h=1.9}={}){
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;root.add(g);
    const tex=scrollTex(columns);const p=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,roughness:.85}),0,0,.04,g);
    for(const yy of [h/2+.04,-h/2-.04]){const rod=mesh(new THREE.CylinderGeometry(.03,.03,w+.16,10),M.darkWood,0,yy,.05,g);rod.rotation.z=Math.PI/2;for(const s of [-1,1])mesh(new THREE.SphereGeometry(.04,8,6),M.gold,s*(w/2+.09),yy,.05,g);}
    mesh(new THREE.PlaneGeometry(w+.12,h+.12),new THREE.MeshStandardMaterial({color:'#2d4a46',roughness:.7}),0,0,.03,g);
    return {group:g,face:p};
  }
  // 匾额
  function plaque(text,x,y,z,rot,{w=3,h=.75}={}){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;root.add(g);
    mesh(new THREE.BoxGeometry(w+.2,h+.2,.1),M.gold,0,0,0,g);mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:plaqueTex(text),roughness:.4,metalness:.2}),0,0,.06,g);return g;}
  // 格窗（透出外面的暖光）
  function windowPanel(x,y,z,rot,{w=1.4,h=2}={}){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;root.add(g);
    mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:latticeTex(),emissive:'#f0b060',emissiveIntensity:.55,emissiveMap:latticeTex(),roughness:.8}),0,0,.03,g);
    mesh(new THREE.BoxGeometry(w+.16,h+.16,.06),M.darkWood,0,0,0,g);return g;}
  // 地毯（深红织锦）
  function rug(x,z,w,d){const m=mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshStandardMaterial({map:huiwenTex('#8a6a30','#2e0c09'),roughness:.95}),x,.012,z);m.material.map=m.material.map.clone();m.material.map.needsUpdate=true;m.material.map.repeat.set(Math.round(w*1.6),Math.round(d*3.2));m.rotation.x=-Math.PI/2;m.userData.floor=true;return m;}

  function update(dt,t){for(const f of updaters)f(dt,t);}
  return {root,M,mesh,room,column,door,lantern,candleStand,shelf,hangingScroll,plaque,windowPanel,rug,addBox,addCyl,removeCollider,blocked,colliders,interact,interactables,updaters,update};
}

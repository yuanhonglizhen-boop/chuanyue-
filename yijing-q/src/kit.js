import * as THREE from '../vendor/three.module.js';

// 关卡通用部件
export function createKit({world,physics,scene}){
  const {toon,mesh,root}=world;

  // 文字牌：canvas 贴图精灵
  function label(text,{x,y,z,size=.9,color='#2f4a45',bg='rgba(255,250,236,.92)'}){
    const c=document.createElement('canvas');c.width=128;c.height=128;const g=c.getContext('2d');
    g.fillStyle=bg;g.beginPath();g.arc(64,64,58,0,Math.PI*2);g.fill();g.strokeStyle=color;g.lineWidth=5;g.stroke();
    g.fillStyle=color;g.font='bold 68px "Songti SC","Noto Serif SC","SimSun",serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,64,68);
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthWrite:false,transparent:true}));s.position.set(x,y,z);s.scale.setScalar(size);s.renderOrder=5;root.add(s);return s;
  }

  // 一条爻的模型：阳爻一整条，阴爻中间断开
  function yaoBar(yang,{w=1.6,h=.22,d=.22,color='#fff4d2'}={}){
    const g=new THREE.Group();const m=new THREE.MeshBasicMaterial({color});
    if(yang){g.add(new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m));}
    else{for(const s of [-1,1]){const b=new THREE.Mesh(new THREE.BoxGeometry(w*.42,h,d),m);b.position.x=s*w*.29;g.add(b);}}
    return g;
  }

  // 爻台：踏上去在阴阳之间切换。台上方漂浮一条爻。
  function yaoAltar({x,z,top,name,yang=false,color='#e9e1c9',ring='#5bb59a'}){
    const g=new THREE.Group();g.position.set(x,top,z);root.add(g);
    mesh(new THREE.CylinderGeometry(1.05,1.25,top+2,24),toon(color),0,-(top+2)/2,0,g);
    const plate=mesh(new THREE.CylinderGeometry(.92,.92,.08,32),toon(ring),0,.04,0,g);
    const holder=new THREE.Group();holder.position.y=1.5;g.add(holder);
    let bar=yaoBar(yang);holder.add(bar);
    const col=physics.add({kind:'cyl',x,z,r:1.05,top:top+.08,bottom:-30,safe:true,tag:'altar:'+name});
    label(name,{x:x+1.25,y:top+1.1,z,size:.62});
    const state={yang,flip:0};
    function set(v){state.yang=v;holder.remove(bar);bar=yaoBar(v);holder.add(bar);state.flip=1;}
    function update(dt,t){holder.position.y=1.5+Math.sin(t*2+x)*.08;holder.rotation.y=Math.sin(t*.8+z)*.25;if(state.flip>0){state.flip=Math.max(0,state.flip-dt*3);holder.scale.setScalar(1+Math.sin(state.flip*Math.PI)*.35);}
      plate.material=toon(state.yang?'#f2c36b':ring);}
    return {group:g,col,state,set,toggle(){set(!state.yang);return state.yang;},update,get yang(){return state.yang;}};
  }

  // 爻玉：可收集的小玉片
  const gemGeo=new THREE.OctahedronGeometry(.28,0);
  function gem({x,y,z,id}){
    const g=new THREE.Group();g.position.set(x,y,z);root.add(g);
    const m=new THREE.Mesh(gemGeo,new THREE.MeshPhysicalMaterial({color:'#7fe0b4',emissive:'#2c9c74',emissiveIntensity:.6,roughness:.15,clearcoat:1,transparent:true,opacity:.92}));m.scale.y=1.35;m.castShadow=true;g.add(m);
    const halo=new THREE.Mesh(new THREE.RingGeometry(.36,.42,24),new THREE.MeshBasicMaterial({color:'#e8fff4',transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));g.add(halo);
    const it={id,group:g,taken:false,pos:new THREE.Vector3(x,y,z)};
    it.update=(dt,t)=>{if(it.taken){g.scale.multiplyScalar(Math.max(0,1-dt*8));g.position.y+=dt*3;if(g.scale.x<.02)g.visible=false;return;}m.rotation.y=t*1.8;g.position.y=y+Math.sin(t*2.4+x)*.12;halo.lookAt(scene.userData.camera?.position??new THREE.Vector3(0,10,10));halo.material.opacity=.4+Math.sin(t*4)*.2;};
    return it;
  }

  // 卦门：石柱 + 门楣上的卦象 + 中间的光环
  function gate({x,z,top,lines,facing=0}){
    const g=new THREE.Group();g.position.set(x,top,z);g.rotation.y=facing;root.add(g);
    const stone=toon('#d9d2bd'),dark=toon('#55807a'),red=toon('#c85b46');
    for(const s of [-1,1]){mesh(new THREE.CylinderGeometry(.32,.38,3.6,10),red,s*1.8,1.8,0,g);mesh(new THREE.CylinderGeometry(.5,.55,.35,10),stone,s*1.8,.17,0,g);
      physics.add({kind:'cyl',x:x+Math.cos(facing)*s*1.8,z:z-Math.sin(facing)*s*1.8,r:.42,top:top+3.6,bottom:top-1,safe:false});}
    const lintel=mesh(new THREE.BoxGeometry(4.9,.42,.6),dark,0,3.75,0,g);mesh(new THREE.BoxGeometry(5.4,.18,.9),dark,0,4.05,0,g);
    const sign=new THREE.Group();sign.position.set(0,4.7,0);g.add(sign);mesh(new THREE.BoxGeometry(1.3,1.1,.12),stone,0,0,0,sign);
    lines.forEach((yang,i)=>{const b=yaoBar(yang,{w:.9,h:.13,d:.06,color:'#3d5f5a'});b.position.set(0,-.3+i*.3,.08);sign.add(b);});
    const portalMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{t:{value:0},on:{value:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'uniform float t;uniform float on;varying vec2 vUv;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float a=atan(p.y,p.x);float swirl=sin(a*3.+r*10.-t*3.)*.5+.5;vec3 c=mix(vec3(.55,.9,.8),vec3(1.,.95,.75),swirl);float alpha=smoothstep(1.,.85,r)*(.15+on*.7)*(.6+.4*swirl);gl_FragColor=vec4(c,alpha);}'});
    const portal=new THREE.Mesh(new THREE.CircleGeometry(1.45,40),portalMat);portal.position.y=1.75;g.add(portal);
    const it={group:g,active:false,pos:new THREE.Vector3(x,top,z)};
    it.activate=()=>{it.active=true;};
    it.update=(dt,t)=>{portalMat.uniforms.t.value=t;portalMat.uniforms.on.value+=((it.active?1:0)-portalMat.uniforms.on.value)*Math.min(1,dt*2);sign.rotation.y=Math.sin(t*.7)*.08;};
    it.inside=(p)=>Math.hypot(p.x-x,p.z-z)<1.1&&p.y<top+2.5&&p.y>top-.5;
    return it;
  }

  // 石碑：刻着卦象，按 E 阅读考据
  function stele({x,z,top,lines,facing=0}){
    const g=new THREE.Group();g.position.set(x,top,z);g.rotation.y=facing;root.add(g);
    mesh(new THREE.BoxGeometry(1.5,.3,.8),toon('#b8b29d'),0,.15,0,g);const slab=mesh(new THREE.BoxGeometry(1.2,2,.32),toon('#d6d0bb'),0,1.25,0,g);
    mesh(new THREE.BoxGeometry(1.4,.22,.45),toon('#55807a'),0,2.32,0,g);
    lines.forEach((yang,i)=>{const b=yaoBar(yang,{w:.75,h:.11,d:.05,color:'#3d5f5a'});b.position.set(0,.85+i*.25,.17);g.add(b);});
    physics.add({kind:'box',x,z,hw:.75,hd:.4,rot:facing,top:top+2.4,bottom:top-1,safe:false});
    return {group:g,pos:new THREE.Vector3(x,top,z)};
  }

  // 火台：可点燃、可盖灭
  function brazier({x,z,top,lit=false,name,big=false}){
    const g=new THREE.Group();g.position.set(x,top,z);root.add(g);const k=big?1.6:1;
    mesh(new THREE.CylinderGeometry(.35*k,.5*k,.7*k,10),toon('#6f6a62'),0,.35*k,0,g);
    const bowl=mesh(new THREE.CylinderGeometry(.75*k,.45*k,.45*k,14,1,true),toon('#8a5a3c',{side:THREE.DoubleSide}),0,.92*k,0,g);
    mesh(new THREE.CylinderGeometry(.6*k,.6*k,.05,14),toon('#3b2a22'),0,.85*k,0,g);
    const fire=new THREE.Group();fire.position.y=1.05*k;g.add(fire);
    const outer=new THREE.Mesh(new THREE.ConeGeometry(.45*k,1.2*k,10),new THREE.MeshBasicMaterial({color:'#ff9a3c',transparent:true,opacity:.85,depthWrite:false}));outer.position.y=.5*k;fire.add(outer);
    const inner=new THREE.Mesh(new THREE.ConeGeometry(.25*k,.75*k,8),new THREE.MeshBasicMaterial({color:'#ffe8a3'}));inner.position.y=.35*k;fire.add(inner);
    const light=new THREE.PointLight('#ffa255',0,9*k,1.5);light.position.y=1.4*k;g.add(light);
    physics.add({kind:'cyl',x,z,r:.6*k,top:top+1.1*k,bottom:top-1,safe:false});
    if(name)label(name,{x:x+1.1,y:top+2.3,z,size:.62,color:'#7a3b22'});
    const it={group:g,lit,name,pos:new THREE.Vector3(x,top,z),big};
    it.set=(v)=>{it.lit=v;};
    it.update=(dt,t)=>{fire.visible=it.lit;light.intensity=it.lit?3.2*k:0;if(it.lit){const f=1+Math.sin(t*17+x)*.08+Math.sin(t*29)*.05;outer.scale.set(f,1+Math.sin(t*13+z)*.12,f);inner.scale.set(1/f,f,1/f);}};
    return it;
  }

  return {label,yaoBar,yaoAltar,gem,gate,stele,brazier};
}

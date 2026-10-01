import * as THREE from '../vendor/three.module.js';

// 灵龟：龟甲上是洛书九宫——戴九履一，左三右七，二四为肩，六八为足，五居中。
// 洛书传统图式中阳数（奇）画白圈、阴数（偶）画黑点；这里同样以白点、黑点表示。
// 每解开一个机关，按 1、2、3……的顺序点亮一格。
export const PALETTES={
  qingyu:{name:'青玉',shell:'#5f9e86',plate:'#7fbfa4',skin:'#a7cdb6',rim:'#3e6f5d'},
  moyu:{name:'墨玉',shell:'#2c3433',plate:'#3f4a48',skin:'#7d8a86',rim:'#161c1b'},
  baiyu:{name:'白玉',shell:'#e8e4d6',plate:'#f6f2e6',skin:'#e9dcc8',rim:'#b9b29c'},
  chijin:{name:'赤金',shell:'#b0472d',plate:'#d79a46',skin:'#e7b98a',rim:'#7a2a19'},
  hupo:{name:'琥珀',shell:'#c9822e',plate:'#e6ae55',skin:'#efcd96',rim:'#8a5218'},
};
// 洛书数在 3×3 格里的位置：行从头（前）到尾（后），列从龟的左到右
const LUOSHU=[[4,9,2],[3,5,7],[8,1,6]];

export function createTurtle({palette='qingyu',envMap}={}){
  const root=new THREE.Group();root.name='linggui';
  const body=new THREE.Group();root.add(body);
  const mats={
    shell:new THREE.MeshPhysicalMaterial({roughness:.22,clearcoat:1,clearcoatRoughness:.1,envMap,envMapIntensity:1}),
    plate:new THREE.MeshPhysicalMaterial({roughness:.18,clearcoat:1,envMap,envMapIntensity:1.1,emissive:new THREE.Color('#ffcf6a'),emissiveIntensity:0}),
    skin:new THREE.MeshPhysicalMaterial({roughness:.35,clearcoat:.6,envMap,envMapIntensity:.8}),
    rim:new THREE.MeshPhysicalMaterial({roughness:.3,clearcoat:1,envMap}),
    gold:new THREE.MeshStandardMaterial({color:'#e2b65a',metalness:.9,roughness:.25,envMap}),
    white:new THREE.MeshStandardMaterial({color:'#fbf6e8',roughness:.3}),
    black:new THREE.MeshStandardMaterial({color:'#141010',roughness:.3}),
    eye:new THREE.MeshBasicMaterial({color:'#120d0a'}),shine:new THREE.MeshBasicMaterial({color:'#ffffff'}),
  };
  const add=(geo,mat,x,y,z,parent=body)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
  // 龟甲：半球压扁拉长 + 边缘一圈裙甲
  const shell=add(new THREE.SphereGeometry(.5,40,24,0,Math.PI*2,0,Math.PI/2),mats.shell,0,.2,0);shell.scale.set(1,.72,1.22);
  const rim=add(new THREE.TorusGeometry(.5,.06,10,40),mats.rim,0,.2,0);rim.rotation.x=Math.PI/2;rim.scale.set(1,1.22,1);
  add(new THREE.CylinderGeometry(.48,.44,.1,32),mats.skin,0,.16,0).scale.set(1,1,1.2);
  // 九宫甲片：贴在甲面上，各带洛书点数
  const plates=[];const R=.5,SY=.72,SZ=1.22;
  LUOSHU.forEach((row,ri)=>row.forEach((n,ci)=>{
    const lx=(ci-1)*.27,lz=(ri-1)*.32;/* 头朝 -z：第一行（4 9 2）在前，9 在头；列从龟的左（-x）到右 */
    const nx=lx/R,nz=lz/(R*SZ),ny=Math.sqrt(Math.max(0,1-nx*nx-nz*nz));
    const pos=new THREE.Vector3(lx,.2+ny*R*SY+.005,lz);
    const g=new THREE.Group();g.position.copy(pos);body.add(g);
    const normal=new THREE.Vector3(nx/R,ny/(R*SY),nz/(R*SZ)).normalize();g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
    const pm=mats.plate.clone();const plate=add(new THREE.CylinderGeometry(.115,.125,.03,6),pm,0,0,0,g);
    // 点数：奇数白点、偶数黑点，排成小圆或方阵
    const dotMat=n%2?mats.white:mats.black;const pts=dotLayout(n);
    for(const [dx,dz] of pts){add(new THREE.SphereGeometry(.016,8,6),dotMat,dx,.02,dz,g);}
    plates.push({n,mat:pm,group:g});
  }));
  // 头、眼、嘴
  const neck=new THREE.Group();neck.position.set(0,.22,-.6);body.add(neck);
  const head=add(new THREE.SphereGeometry(.17,24,16),mats.skin,0,.06,-.12,neck);head.scale.set(1,.9,1.15);
  for(const s of [-1,1]){add(new THREE.SphereGeometry(.032,12,8),mats.eye,s*.085,.11,-.24,neck);add(new THREE.SphereGeometry(.01,6,4),mats.shine,s*.085+.008,.125,-.27,neck);}
  const mouth=add(new THREE.TorusGeometry(.04,.008,6,12,Math.PI),mats.eye,0,.02,-.29,neck);mouth.rotation.set(Math.PI*.15,0,Math.PI);
  // 额上一点金（灵龟之"灵"）
  add(new THREE.SphereGeometry(.022,10,8),mats.gold,0,.2,-.18,neck);
  // 四鳍
  const legs=[];for(const [x,z,front] of [[-.38,-.35,1],[.38,-.35,1],[-.36,.38,0],[.36,.38,0]]){const p=new THREE.Group();p.position.set(x,.13,z);body.add(p);
    const leg=add(new THREE.SphereGeometry(.12,14,10),mats.skin,Math.sign(x)*.06,-.04,front?-.04:.04,p);leg.scale.set(front?1.3:1,.45,front?.75:.8);legs.push({p,front,side:Math.sign(x)});}
  const tail=add(new THREE.ConeGeometry(.05,.16,10),mats.skin,0,.14,.66);tail.rotation.x=Math.PI/2;
  // 脚下的柔光（仅视觉）
  const glow=new THREE.Mesh(new THREE.CircleGeometry(.75,32),new THREE.MeshBasicMaterial({color:'#000000',transparent:true,opacity:.35,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.y=.005;root.add(glow);

  let time=0,progress=0,cheer=0;
  function setPalette(name){const P=PALETTES[name]||PALETTES.qingyu;mats.shell.color.set(P.shell);mats.skin.color.set(P.skin);mats.rim.color.set(P.rim);plates.forEach(p=>p.mat.color.set(P.plate));current=name;}
  let current=palette;setPalette(palette);
  function setProgress(n){progress=n;}
  function celebrate(){cheer=1.6;}
  function update(dt,{speed=0}={}){
    time+=dt;const walk=Math.min(1,speed/2.4);
    // 走路：对角两鳍同摆
    legs.forEach(({p,front,side},i)=>{const ph=(front?0:Math.PI)+(side>0?Math.PI:0);p.rotation.y=Math.sin(time*9+ph)*.5*walk*side;p.rotation.z=Math.sin(time*9+ph)*.15*walk;});
    body.position.y=Math.abs(Math.sin(time*9))*.03*walk+Math.sin(time*2)*.008;body.rotation.z=Math.sin(time*4.5)*.03*walk;
    neck.position.z=-.6-Math.sin(time*2)*.015-walk*.03;neck.rotation.y=Math.sin(time*.7)*.25*(1-walk);neck.rotation.x=cheer>0?Math.sin(time*14)*.2:0;
    cheer=Math.max(0,cheer-dt);
    // 已解开的格子发金光，最新一格呼吸闪烁
    plates.forEach(pl=>{const on=pl.n<=progress;const target=on?(pl.n===progress?.7+Math.sin(time*4)*.3:.55):0;pl.mat.emissiveIntensity+=(target-pl.mat.emissiveIntensity)*Math.min(1,dt*4);});
    tail.rotation.y=Math.sin(time*6)*.3*walk;
  }
  return {root,update,setPalette,setProgress,celebrate,get palette(){return current;},eyeHeight:.95};
}

// 小点阵：1~9 个点的排列
function dotLayout(n){const s=.034;const L={1:[[0,0]],2:[[-s,0],[s,0]],3:[[-s,s],[0,0],[s,-s]],4:[[-s,-s],[s,-s],[-s,s],[s,s]],5:[[-s,-s],[s,-s],[0,0],[-s,s],[s,s]],
  6:[[-s,-s*1.4],[s,-s*1.4],[-s,0],[s,0],[-s,s*1.4],[s,s*1.4]],7:[[-s,-s*1.4],[s,-s*1.4],[-s,0],[0,0],[s,0],[-s,s*1.4],[s,s*1.4]],8:[[-s*1.5,-s],[-s*.5,-s],[s*.5,-s],[s*1.5,-s],[-s*1.5,s],[-s*.5,s],[s*.5,s],[s*1.5,s]],9:[[-s,-s],[0,-s],[s,-s],[-s,0],[0,0],[s,0],[-s,s],[0,s],[s,s]]};return L[n];}

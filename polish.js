import * as THREE from './vendor/three.module.js';
import {captureColliderParts} from './collision.js';

// Independent art study. No puzzle state, navigation boundary or event handlers are changed.
const tint=c=>new THREE.Color(c);
function random(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function tube(points,radius,material,parent){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,18,radius,7,false),material);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}

// Bake static local transforms and combine by material. Hinged groups and sprites stay separate.
function mergeStatic(parent){
  const buckets=new Map();
  for(const m of [...parent.children]){if(!m.isMesh||m.isInstancedMesh||Array.isArray(m.material))continue;m.updateMatrix();let geo=m.geometry.clone();if(geo.index){const old=geo;geo=geo.toNonIndexed();old.dispose();}geo.applyMatrix4(m.matrix);
    const b=buckets.get(m.material)||{meshes:[],positions:[],normals:[],uvs:[],colors:[],blocks:[],floors:[],cast:false,receive:false};const count=geo.attributes.position.count,flip=m.matrix.determinant()<0;
    const parts=captureColliderParts(m);b.blocks.push(...parts.blocks);b.floors.push(...parts.floors);
    for(let i=0;i<count;i++){const index=flip?(i%3===1?i+1:i%3===2?i-1:i):i;for(const [attribute,values,size,fallback] of [['position',b.positions,3,0],['normal',b.normals,3,0],['uv',b.uvs,2,0],['color',b.colors,3,1]]){const a=geo.attributes[attribute];for(let k=0;k<size;k++)values.push(a?a.array[index*a.itemSize+k]:fallback);}}
    b.meshes.push(m);b.cast||=m.castShadow;b.receive||=m.receiveShadow;buckets.set(m.material,b);geo.dispose();
  }
  for(const [material,b] of buckets){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uvs,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(b.colors,3));const merged=new THREE.Mesh(geo,material);merged.userData.colliderParts={blocks:b.blocks,floors:b.floors};merged.castShadow=b.cast;merged.receiveShadow=b.receive;parent.add(merged);for(const m of b.meshes)parent.remove(m);}
}

function canopyGeometry(seed){
  const rand=random(seed),segments=44,rings=6,positions=[],colors=[],indices=[];
  const shade=tint('#32665d'),light=tint('#9bb887');
  for(let j=0;j<=rings;j++){const r=j/rings;for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;const edge=1+.13*Math.sin(a*5+seed)+.075*Math.sin(a*9+1.2)+.025*Math.sin(a*17);const x=Math.cos(a)*r*edge,z=Math.sin(a)*r*edge;const y=.035+.4*Math.pow(1-r*r,.75)+.035*Math.sin(a*3+seed)*r;positions.push(x,y,z);const c=shade.clone().lerp(light,THREE.MathUtils.clamp(.33+.42*(1-r)+x*.15-z*.1,0,1));colors.push(c.r,c.g,c.b);}}
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,a+1,b+1,b);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

export function sculptedPine(x,z,h,lean,{scene,mat}){
  const g=new THREE.Group();g.position.set(x,.25,z);g.name='art-v4-pine';scene.add(g);
  const rand=random(Math.round((x+10)*971+(z+8)*337)),bark=mat('v4-bark','#666256'),barkLight=mat('v4-bark-light','#a1997a');
  const trunk=tube([[0,0,0],[-lean*.35,h*.27,.06],[lean*.7,h*.64,-.05],[lean,h,0]],.065,bark,g);
  // Taper the trunk in its local parameter space, leaving the navigable foot unchanged.
  const pos=trunk.geometry.attributes.position;for(let i=0;i<pos.count;i++){const factor=1-.4*Math.max(0,pos.getY(i))/h;pos.setX(i,pos.getX(i)*factor);pos.setZ(i,pos.getZ(i)*factor);}trunk.geometry.computeVertexNormals();
  const leafMaterial=mat('v4-pine-leaf','#ffffff').clone();leafMaterial.vertexColors=true;leafMaterial.side=THREE.DoubleSide;
  const undersideMaterial=mat('v4-pine-under','#376c63');
  const needleMaterial=mat('v4-pine-tips','#7e9f74');needleMaterial.side=THREE.DoubleSide;
  const needleGeo=new THREE.BufferGeometry();needleGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.018,0,0,.018,0,0,0,.09,.025],3));needleGeo.computeVertexNormals();
  const tips=new THREE.InstancedMesh(needleGeo,needleMaterial,192);tips.castShadow=false;g.add(tips);const dummy=new THREE.Object3D();let n=0;
  for(let j=0;j<6;j++){
    const y=h*(.37+j*.118),a=j*2.39+.3,reach=(1-j*.09)*.85,ex=lean*.5+Math.cos(a)*reach,ez=Math.sin(a)*reach*.76;
    tube([[lean*y/h,y-.12,0],[ex*.5,y-.03,ez*.48],[ex,y+.08,ez]],.035*(1-j*.07),bark,g);
    tube([[lean*y/h+.017,y-.1,.013],[ex*.52,y,ez*.5+.015],[ex*.93,y+.09,ez*.96]],.009,barkLight,g);
    for(let k=0;k<3;k++){
      const spread=(k-1)*.28,cx=ex+Math.cos(a+Math.PI/2)*spread,cz=ez+Math.sin(a+Math.PI/2)*spread,scale=(.45+rand()*.08)*(1-j*.04);
      const cap=new THREE.Mesh(canopyGeometry(j*5+k+2),leafMaterial);cap.position.set(cx,y+.12+(k===1?.09:0),cz);cap.scale.set(scale,scale,scale*.77);cap.rotation.y=a+.25*k;cap.castShadow=cap.receiveShadow=true;g.add(cap);
      const bottom=cap.clone();bottom.material=undersideMaterial;bottom.scale.y=-scale*.22;bottom.position.y-=.006;g.add(bottom);
      for(let q=0;q<10;q++){const angle=q/10*Math.PI*2+rand()*.2;dummy.position.set(cx+Math.cos(angle)*scale*.87,y+.16+(k===1?.09:0),cz+Math.sin(angle)*scale*.67);dummy.rotation.set(rand()*.8,angle,rand()-.5);dummy.scale.setScalar(.65+rand()*.45);dummy.updateMatrix();tips.setMatrixAt(n++,dummy.matrix);}
    }
  }
  tips.count=n;mergeStatic(g);return g;
}

function washTexture(kind){const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d'),rand=random(93);c.fillStyle='#fffdf5';c.fillRect(0,0,512,512);
  for(let i=0;i<65;i++){const x=rand()*512,y=rand()*512,r=25+rand()*85;const grad=c.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,`rgba(91,111,98,${.02+rand()*.04})`);grad.addColorStop(1,'rgba(91,111,98,0)');c.fillStyle=grad;c.fillRect(x-r,y-r,r*2,r*2);}
  if(kind==='plaster'){for(let i=0;i<2000;i++){c.fillStyle=`rgba(63,79,69,${rand()*.07})`;c.fillRect(rand()*512,rand()*512,1,1);}}
  else {for(let i=0;i<80;i++){c.strokeStyle=`rgba(61,66,58,${.05+rand()*.1})`;c.lineWidth=.5+rand();c.beginPath();const x=rand()*512;c.moveTo(x,0);c.bezierCurveTo(x+8,180,x-12,300,x+2,512);c.stroke();}}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

export function polishGarden({scene,gateGroup,pavilion,stone,paleStone,wood,darkWood,roofMat,mat,box,cylinder,beam,waterMat,stream,waterfall,reduce}){
  const plaster=mat('v4-plaster','#e2ddc7').clone();plaster.map=washTexture('plaster');
  const timber=wood.clone();timber.map=washTexture('wood');timber.color.set('#ab804d');
  const pedestal=mat('v4-pedestal','#738b86'),trim=mat('v4-trim','#749296');
  for(const building of [gateGroup,pavilion])building.traverse(o=>{if(!o.isMesh)return;if(o.material===stone)o.material=plaster;if(o.material===wood)o.material=timber;});
  // Stepped plinths, dougong brackets and tile-end caps give the architecture a readable scale.
  for(const x of [-1.28,1.28]){box(.73,.07,.8,pedestal,x,.08,0,gateGroup);box(.62,.06,.7,paleStone,x,.22,0,gateGroup);box(.09,1.8,.08,darkWood,x*.81,1.11,.37,gateGroup);for(let j=0;j<3;j++){box(.2+j*.11,.065,.28+j*.06,timber,x,2.27+j*.065,0,gateGroup);}}
  for(let x=-1.53;x<1.6;x+=.15){const cap=cylinder(.036,.036,.055,trim,x,2.41,.492,gateGroup,10);cap.rotation.x=Math.PI/2;}
  for(const x of [-.72,.72])for(const z of [-.6,.6]){for(let j=0;j<3;j++)box(.18+j*.12,.055,.18+j*.08,timber,x,1.57+j*.05,z,pavilion);}
  // Carved door studs remain attached to the opening leaves.
  const doors=gateGroup.children.filter(o=>o.isGroup);for(const door of doors){const s=door.position.x<0?1:-1;for(const y of [.53,.87,1.21])for(const x of [.22,.48,.74]){const stud=new THREE.Mesh(new THREE.SphereGeometry(.024,8,6),mat('v4-stud','#c5ac77'));stud.position.set(s*x,y,.13);door.add(stud);}}
  // Surface-space animated water: shallow banks, ink-blue channel and elongated sky glints.
  const waterClock={value:0};waterMat.onBeforeCompile=shader=>{shader.uniforms.uArtTime=waterClock;shader.vertexShader='varying vec3 vArtWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvArtWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');shader.fragmentShader='uniform float uArtTime;varying vec3 vArtWorld;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float shore=smoothstep(.34,.78,abs(vArtWorld.z-.04));
    float wave=sin(vArtWorld.x*2.7-vArtWorld.z*13.0-uArtTime*.72)+.42*sin(vArtWorld.x*5.1+vArtWorld.z*18.0-uArtTime*.45);
    vec3 deep=vec3(.040,.245,.245),shallow=vec3(.225,.475,.375);
    diffuseColor.rgb=mix(deep,shallow,shore*.65+.16);
    float shimmer=smoothstep(.89,1.28,wave)*.12;
    diffuseColor.rgb+=vec3(.55,.72,.59)*shimmer;
    float bankFoam=smoothstep(.70,.77,abs(vArtWorld.z-.04))*(.5+.5*sin(vArtWorld.x*18.0+uArtTime));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.59,.70,.54),bankFoam*.28);
  `);};waterMat.customProgramCacheKey=()=> 'art-v4-water';waterMat.needsUpdate=true;
  waterfall.material.color.set('#80c9b5');
  const foamGroup=new THREE.Group();scene.add(foamGroup);const foamMaterial=new THREE.MeshBasicMaterial({color:'#d5e8cb',transparent:true,opacity:.45,side:THREE.DoubleSide,depthWrite:false});
  for(let i=0;i<18;i++){const m=new THREE.Mesh(new THREE.RingGeometry(.12,.13,32,1,.25,1.8),foamMaterial);m.rotation.x=-Math.PI/2;m.position.set(-4.7+i*.54,.234,i%2?.65:-.59);m.scale.set(1.7, .42,1);foamGroup.add(m);}
  mergeStatic(gateGroup);mergeStatic(pavilion);
  return {update(t){waterClock.value=reduce?0:t;foamGroup.visible=stream.visible;foamGroup.children.forEach((o,i)=>{o.position.x=-4.7+i*.54+(reduce?0:Math.sin(t*.35+i)*.07);});}};
}

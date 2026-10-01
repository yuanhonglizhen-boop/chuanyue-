import * as THREE from './vendor/three.module.js';

export const gardenOutline=[[-5.7,-2.9],[-4.6,-4.2],[-2.3,-4.75],[.4,-4.9],[3.4,-4.2],[5.4,-3],[5.9,-.7],[6.65,2.6],[7.1,5.8],[5.5,8.15],[1.8,9],[-2.4,8.6],[-6.25,6.9],[-6.8,3],[-5.9,.1]];

export function extendGarden({scene,mesh,box,cylinder,beam,mat,rockGeometry,rng,lantern,pine,roof}){
  const sage=mat('garden-sage','#75966c'),bamboo=mat('bamboo','#658975'),cream=mat('garden-stone','#e5ddc3'),wood=mat('garden-wood','#9b7750'),ink=mat('garden-ink','#3f6668');
  // Rounded stepping stones form an actual walkable continuation of the old approach.
  for(let i=0;i<12;i++){const z=4.35+i*.32,x=Math.sin(i*.38)*.52;const m=mesh(rockGeometry(.57,.045,.17,i),cream,x,.29,z);m.rotation.y=Math.sin(i)*.08;}
  for(let i=0;i<9;i++){const x=-.55-i*.43,z=5.4+Math.sin(i*.4)*.55;const m=mesh(rockGeometry(.24,.045,.2,i),cream,x,.29,z);m.rotation.y=i*.3;}
  // A jade lotus pond: stone edging, lily leaves, flowers and curved water lines.
  const pond=mesh(new THREE.CircleGeometry(1,72),mat('pond-water','#70b8b2'),4.1,.258,5.4);pond.rotation.x=-Math.PI/2;pond.scale.set(1.58,1.16,1);pond.castShadow=false;
  for(let i=0;i<25;i++){const a=i/25*Math.PI*2;mesh(rockGeometry(.2,.12,.17,i),i%3?cream:ink,4.1+Math.cos(a)*1.66,.31,5.4+Math.sin(a)*1.25);}
  for(let i=0;i<11;i++){const a=i*2.4,r=.24+rng()*.7,x=4.1+Math.cos(a)*r*1.3,z=5.4+Math.sin(a)*r;const pad=mesh(new THREE.CircleGeometry(.14+rng()*.07,20,.15,5.95),mat('lily','#629373'),x,.28,z);pad.rotation.x=-Math.PI/2;pad.rotation.z=a;pad.castShadow=false;if(i%3===0){for(let j=0;j<7;j++){const petal=mesh(new THREE.SphereGeometry(.075,8,6),mat('lotus','#f0c5b8'),x+Math.cos(j)*.05,.34,z+Math.sin(j)*.05);petal.scale.set(.55,1,.55);petal.rotation.z=.5;}cylinder(.035,.045,.05,mat('pollen','#eac782'),x,.38,z);}}
  const waterLines=[];for(let i=0;i<5;i++){const ring=mesh(new THREE.RingGeometry(.3+i*.14,.31+i*.14,48,1,.2,2.5),new THREE.MeshBasicMaterial({color:'#daebcf',transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false}),4.15,.275,5.5);ring.rotation.x=-Math.PI/2;ring.scale.y=.65;ring.castShadow=false;waterLines.push(ring);}
  // Bamboo grove: articulated culms and brush-shaped leaf sprays instead of cones.
  const bambooGroup=new THREE.Group();scene.add(bambooGroup);
  const leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(.12,.21,0,.52);leafShape.quadraticCurveTo(-.1,.19,0,0);
  const leafGeo=new THREE.ShapeGeometry(leafShape),leafMat=mat('bamboo-leaf','#376f65').clone();leafMat.side=THREE.DoubleSide;
  for(let i=0;i<15;i++){const x=-5.4+(rng()-.5)*1.25,z=4.6+(rng()-.5)*1.65,h=1.8+rng()*1.6;const g=new THREE.Group();g.position.set(x,.24,z);g.rotation.z=(rng()-.5)*.13;bambooGroup.add(g);cylinder(.032,.05,h,bamboo,0,h/2,0,g,8);for(let y=.35;y<h;y+=.4){cylinder(.041,.041,.045,cream,0,y,0,g,8);if(y>h*.45){const a=i*2+y*3,ex=Math.cos(a)*.5,ez=Math.sin(a)*.45;beam([0,y,0],[ex,y+.15,ez],.015,bamboo,g);for(let k=0;k<5;k++){const leaf=mesh(leafGeo,leafMat,ex*k/5,y+.11,ez*k/5,g);leaf.rotation.set(-.5,a+k*.65,k%2?.7:-.7);leaf.scale.setScalar(.6+rng()*.4);}}}}
  // Moon gate beside the bamboo path, with plaster cheeks and a slate coping.
  const gate=new THREE.Group();gate.position.set(-2.8,.24,6);gate.rotation.y=.32;scene.add(gate);
  const arch=mesh(new THREE.TorusGeometry(.75,.14,8,48,Math.PI),cream,0,.84,0,gate);arch.rotation.z=0;
  for(const side of [-1,1]){box(.27,.85,.31,cream,side*.75,.42,0,gate);box(.66,1.33,.22,cream,side*1.2,.66,0,gate);box(.78,.09,.34,ink,side*1.2,1.36,0,gate);box(.81,.14,.4,ink,side*1.2,.08,0,gate);}
  // Tea stop with slatted bench and ceramic cups.
  for(const x of [-4.5,-3.3])box(.11,.39,.32,wood,x,.45,7);for(let k=0;k<3;k++)box(1.65,.075,.12,wood,-3.9,.67,6.85+k*.14);
  cylinder(.38,.41,.11,cream,-2.25,.75,7.7,scene,16);cylinder(.13,.2,.44,ink,-2.25,.49,7.7,scene,12);cylinder(.055,.043,.09,mat('tea','#bac6b4'),-2.1,.86,7.7,scene,12);cylinder(.09,.1,.14,ink,-2.38,.86,7.67,scene,12);
  lantern(-1.05,5.1);lantern(1.25,7.4);lantern(5.7,4.1);
  // Soft flowering branches frame the foreground without blocking the route.
  const tree=new THREE.Group();tree.position.set(3, .24,7.65);scene.add(tree);beam([0,0,0],[.15,1.5,0],.075,wood,tree);const blooms=new THREE.InstancedMesh(new THREE.SphereGeometry(.2,9,7),mat('blossom','#fff0dc'),112),dummy=new THREE.Object3D();tree.add(blooms);blooms.castShadow=true;
  let n=0;for(let j=0;j<7;j++){const a=j*2.4,x=Math.cos(a)*.7,z=Math.sin(a)*.6,y=1.35+rng()*.55;beam([.1,.9,0],[x,y,z],.025,wood,tree);for(let k=0;k<16;k++){dummy.position.set(x+(rng()-.5)*.6,y+(rng()-.5)*.3,z+(rng()-.5)*.6);dummy.scale.set(1,.6,1);dummy.updateMatrix();blooms.setMatrixAt(n,dummy.matrix);blooms.setColorAt(n,new THREE.Color(k%3===0?'#e4aea1':k%3===1?'#f4d9b7':'#eed1c1'));n++;}}
  const meadow=new THREE.InstancedMesh(new THREE.SphereGeometry(.045,5,4),mat('meadow','#ede9bd'),150);scene.add(meadow);for(let i=0;i<150;i++){const x=-5+rng()*10,z=3.9+rng()*3.8;dummy.position.set(x,.32,z);dummy.scale.set(1,.35,1);dummy.updateMatrix();meadow.setMatrixAt(i,dummy.matrix);}meadow.castShadow=false;
  const petals=new THREE.InstancedMesh(new THREE.SphereGeometry(.035,5,3),mat('petals','#f6d7c3'),24);scene.add(petals);const seeds=Array.from({length:24},()=>({x:2+rng()*2,z:6.8+rng()*1.6,y:rng()*2.4,phase:rng()*6}));
  return {update(t,reduce){bambooGroup.rotation.z=reduce?0:Math.sin(t*.65)*.003;waterLines.forEach((r,i)=>r.material.opacity=.24+(reduce?0:Math.sin(t+i)*.07));seeds.forEach((s,i)=>{dummy.position.set(s.x+(reduce?0:Math.sin(t*.7+s.phase)*.4),.3+(reduce?s.y:(s.y-t*.18%2.4+2.4)%2.4),s.z);dummy.rotation.set(t*.3+s.phase,s.phase,t*.5);dummy.scale.set(1,.25,1.7);dummy.updateMatrix();petals.setMatrixAt(i,dummy.matrix);});petals.instanceMatrix.needsUpdate=true;}};
}

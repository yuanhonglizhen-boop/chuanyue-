import * as THREE from '../../vendor/three.module.js';
import {corridor,DIRS} from './r2.js';

// 第三间 · 后天室：学后天八卦方位（《说卦传》"帝出乎震"一节）。
// 机关：屋中八盏铜灯，各在一个方位，灯上不写字。按原文"帝出乎震，齐乎巽，相见乎离，致役乎坤，说言乎兑，战乎乾，劳乎坎，成言乎艮"的次序，
// 即 东 → 东南 → 南 → 西南 → 西 → 西北 → 北 → 东北 依次点亮。点错全灭。罗盘（上一间所得）指示方位。
export const R3={cx:0,cz:-25,w:11,d:11,h:4.6};
const ORDER=[2,1,0,7,6,5,4,3];// 方位编号（见 r2.DIRS）：东、东南、南、西南、西、西北、北、东北
const GUA=['震','巽','离','坤','兑','乾','坎','艮'];

export function buildRoom3(ctx){
  const {world:W,sfx}=ctx;const T=THREE,{cx,cz}=R3;
  W.room({...R3,doors:[{side:'s',at:0,width:1.8},{side:'n',at:0,width:1.8}],floor:'wood'});
  corridor(W,-18,-19.5);
  W.plaque('后天',0,3.75,cz+5.38,Math.PI,{w:2.2,h:.58});
  W.rug(cx,cz,3.4,3.4);
  W.lantern(cx-3,3.6,cz+3,{intensity:3});W.lantern(cx+3,3.6,cz-3,{intensity:3});

  // ---------- 八盏铜灯 ----------
  const lamps=DIRS.map((dir,k)=>{const a=k*Math.PI/4,x=cx+Math.sin(a)*3.7,z=cz+Math.cos(a)*3.7;
    const g=new T.Group();g.position.set(x,0,z);W.root.add(g);
    W.mesh(new T.CylinderGeometry(.26,.32,.1,10),W.M.bronze,0,.05,0,g);W.mesh(new T.CylinderGeometry(.05,.06,1.15,10),W.M.bronze,0,.62,0,g);
    W.mesh(new T.CylinderGeometry(.24,.12,.12,12),W.M.bronze,0,1.24,0,g);
    const shade=W.mesh(new T.CylinderGeometry(.2,.24,.42,12,1,true),new T.MeshStandardMaterial({color:'#e8d6ad',emissive:'#ffb050',emissiveIntensity:0,roughness:.8,side:T.DoubleSide,transparent:true,opacity:.9}),0,1.52,0,g);
    W.mesh(new T.TorusGeometry(.22,.015,6,20),W.M.gold,0,1.74,0,g).rotation.x=Math.PI/2;
    const light=new T.PointLight('#ffb35c',0,5.5,1.8);light.position.y=1.55;g.add(light);
    W.addCyl(x,z,.34,'lamp');
    const L={k,dir,group:g,shade,light,lit:false,glow:0};
    W.interact(g,{label:'铜灯',range:2.6,enabled:()=>!ctx.flag('lamps'),onClick:()=>press(L)});return L;});
  let step=0,resetIn=0;
  function press(L){if(L.lit)return;
    if(L.k===ORDER[step]){L.lit=true;step++;sfx.toggle(true);
      if(step===8){ctx.setFlag('lamps');ctx.milestone(6);sfx.solve();ctx.unlockNote('houtian');door.openDoor();sfx.door();ctx.toast('八灯次第而明——帝出乎震，成言乎艮。北面的门开了。');}}
    else{L.lit=true;resetIn=.3;step=0;sfx.wrong();ctx.toast('次序不对，灯都灭了。');}}
  W.updaters.push((dt,t)=>{if(resetIn>0){resetIn-=dt;if(resetIn<=0)lamps.forEach(l=>l.lit=false);}for(const l of lamps){const tg=l.lit?1:0;l.glow+=(tg-l.glow)*Math.min(1,dt*5);l.shade.material.emissiveIntensity=l.glow*1.6;l.light.intensity=l.glow*2.4*(.94+Math.sin(t*9+l.k)*.05);}});

  // ---------- 墙上的文字 ----------
  const north=W.hangingScroll(cx-2.8,2.3,cz-5.38,0,['帝出乎震','齐乎巽','相见乎离','致役乎坤','说言乎兑','战乎乾','劳乎坎','成言乎艮'],{w:1.9,h:2.2});
  W.interact(north.group,{label:'读挂轴',range:3.2,onClick:()=>ctx.read('houtian')});
  const east=W.hangingScroll(cx+5.38,2.3,cz,-Math.PI/2,['万物出乎震','震东方也','齐乎巽','巽东南也','离也者明也','南方之卦也'],{w:1.3,h:2.1});
  W.interact(east.group,{label:'读挂轴',range:3.2,onClick:()=>ctx.read('houtian')});
  const west=W.hangingScroll(cx-5.38,2.3,cz,Math.PI/2,['兑正秋也','战乎乾','乾西北之卦也','坎者水也','正北方之卦也','艮东北之卦也'],{w:1.3,h:2.1});
  W.interact(west.group,{label:'读挂轴',range:3.2,onClick:()=>ctx.read('houtian')});

  // ---------- 北门（解开后打开）与门后 ----------
  const door=W.door({x:cx,z:cz-5.5,side:'n'});W.plaque('爻位',cx,3.75,cz-5.38,0,{w:2,h:.5});
  W.interact(door.group,{label:'北门',range:2.4,onClick:()=>{if(!door.open)ctx.toast('这扇门没有锁孔。也许要让屋里的灯说话。');}});
  // 门后：尚未建成的下一间
  const beyond=new T.Group();beyond.position.set(cx,0,cz-7);W.root.add(beyond);
  for(const s of [-1,1]){W.mesh(new T.BoxGeometry(.2,3.1,3),W.M.lacquer,s*1.1,1.55,0,beyond);W.addBox(cx+s*1.1,cz-7,.12,1.5,'corridor');}
  const f=W.mesh(new T.PlaneGeometry(2.2,3),W.M.darkWood,0,.005,0,beyond);f.rotation.x=-Math.PI/2;f.userData.floor=true;
  W.mesh(new T.BoxGeometry(2.4,3.1,.2),W.M.darkWood,0,1.55,-1.5,beyond);W.addBox(cx,cz-8.5,1.1,.12,'end');
  W.plaque('未完待续',cx,1.9,cz-8.38,0,{w:1.8,h:.48});
  W.lantern(cx,2.6,cz-7.2,{intensity:2.5,distance:4});

  function restore(f){if(f.lamps){lamps.forEach(l=>{l.lit=true;l.glow=1;});step=8;door.openDoor();door.t=1;}}
  return {id:'r3',name:'后天室',theme:'hou',scrolls:[north.group,east.group,west.group],bounds:{x0:-5.5,x1:5.5,z0:cz-5.5,z1:cz+5.5},lamps,door,restore,order:ORDER,gua:GUA,endZ:cz-6.9,
    hint:f=>!f.lamps?'lamps':null};
}

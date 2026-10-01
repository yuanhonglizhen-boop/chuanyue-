import * as THREE from '../../vendor/three.module.js';
import {trigramTex,glyphTex,scrollTex} from '../textures.js';

// 第二间 · 先天室：学先天八卦次序与方位、《说卦传》"天地定位"。
// 机关一：八角台上八块卦牌放乱了，点两块交换，排成先天方位（乾南坤北离东坎西……）。
// 机关二：台心升起铜箱，四位转盘锁："以先天之数，记雷、风、水、火" → 4563。箱中有后门钥匙与罗盘。
export const R2={cx:0,cz:-12.5,w:11,d:11,h:4.6};
export const TRI={乾:[1,1,1],兑:[1,1,0],离:[1,0,1],震:[1,0,0],巽:[0,1,1],坎:[0,1,0],艮:[0,0,1],坤:[0,0,0]};
// 方位：0 南(+z) 1 东南 2 东(+x) 3 东北 4 北(-z) 5 西北 6 西(-x) 7 西南
export const DIRS=['南','东南','东','东北','北','西北','西','西南'];
const ANSWER=['乾','兑','离','震','坤','艮','坎','巽'];

export function buildRoom2(ctx){
  const {world:W,sfx}=ctx;const T=THREE,{cx,cz}=R2;
  W.room({...R2,doors:[{side:'s',at:0,width:1.8},{side:'n',at:0,width:1.8}],floor:'stone'});
  // 与门厅之间的短廊
  corridor(W,-5.5,-7);
  W.plaque('先天',0,3.75,cz-5.38,0,{w:2.2,h:.58});
  W.candleStand(cx-4.3,cz+4.3);W.candleStand(cx+4.3,cz+4.3);W.candleStand(cx-4.3,cz-4.4);W.candleStand(cx+4.3,cz-4.4);
  W.lantern(cx-2.6,3.5,cz);W.lantern(cx+2.6,3.5,cz);W.lantern(cx,3.6,cz-3.6);

  // ---------- 八角台 ----------
  const dais=new T.Group();dais.position.set(cx,0,cz);W.root.add(dais);
  W.mesh(new T.CylinderGeometry(3.15,3.25,.14,8),W.M.stone,0,.07,0,dais).rotation.y=Math.PI/8;
  W.mesh(new T.TorusGeometry(3.05,.04,6,8),W.M.gold,0,.15,0,dais).rotation.set(Math.PI/2,0,Math.PI/8);
  W.mesh(new T.TorusGeometry(1.3,.035,6,48),W.M.gold,0,.15,0,dais).rotation.x=Math.PI/2;
  // 太极（台心浮雕，装饰）
  const yin=W.mesh(new T.CircleGeometry(1.2,48,0,Math.PI),new T.MeshStandardMaterial({color:'#1a1512',roughness:.4}),0,.151,0,dais);yin.rotation.x=-Math.PI/2;
  const yang=W.mesh(new T.CircleGeometry(1.2,48,Math.PI,Math.PI),new T.MeshStandardMaterial({color:'#e8dcc0',roughness:.4}),0,.151,0,dais);yang.rotation.x=-Math.PI/2;
  // 地上刻"南""北"
  for(const [txt,z] of [['南',3.75],['北',-3.75]]){const m=W.mesh(new T.PlaneGeometry(.7,.7),new T.MeshStandardMaterial({map:glyphTex(txt,{bg:'#2b2522',fg:'#d4a64a',size:150}),roughness:.6,metalness:.3}),cx,.02,cz+z);m.rotation.x=-Math.PI/2;if(z<0)m.rotation.z=Math.PI;}

  const slots=DIRS.map((dir,k)=>{const a=k*Math.PI/4,x=Math.sin(a)*2.55,z=Math.cos(a)*2.55;
    const g=new T.Group();g.position.set(cx+x,0,cz+z);g.rotation.y=a;W.root.add(g);// 面朝外
    W.mesh(new T.CylinderGeometry(.34,.4,.72,8),W.M.darkWood,0,.36,0,g);W.mesh(new T.CylinderGeometry(.42,.42,.05,8),W.M.gold,0,.74,0,g);
    W.addCyl(cx+x,cz+z,.42,'pedestal');
    return {k,dir,group:g,x:cx+x,z:cz+z,angle:a};});
  // 卦牌：初始打乱
  let order=['坎','震','乾','巽','离','坤','兑','艮'];
  const tiles=order.map((name,i)=>{const g=new T.Group();W.root.add(g);
    const face=W.mesh(new T.PlaneGeometry(.56,.7),new T.MeshStandardMaterial({map:trigramTex(TRI[name],{name}),roughness:.35,metalness:.25,side:T.DoubleSide}),0,0,0,g);
    W.mesh(new T.BoxGeometry(.62,.76,.04),W.M.gold,0,0,-.03,g);
    const glow=W.mesh(new T.PlaneGeometry(.78,.92),new T.MeshBasicMaterial({color:'#ffd27a',transparent:true,opacity:0,depthWrite:false}),0,0,-.06,g);
    const tile={name,group:g,glow,slot:i,cur:new T.Vector3()};place(tile,true);
    W.interact(g,{label:'卦牌 · '+name,range:2.8,enabled:()=>!ctx.flag('octagon'),onClick:()=>pick(tile)});return tile;});
  function place(tile,instant){const s=slots[tile.slot];tile.target=new T.Vector3(s.x,1.15,s.z);tile.rot=s.angle;if(instant){tile.group.position.copy(tile.target);tile.cur.copy(tile.target);}tile.group.rotation.y=s.angle;}
  let selected=null;
  function pick(tile){sfx.click();if(!selected){selected=tile;tile.glow.material.opacity=.55;return;}
    if(selected===tile){tile.glow.material.opacity=0;selected=null;return;}
    const a=selected,b=tile;[a.slot,b.slot]=[b.slot,a.slot];a.glow.material.opacity=0;selected=null;place(a);place(b);sfx.toggle(true);
    if(tiles.every(t=>ANSWER[t.slot]===t.name)){ctx.setFlag('octagon');ctx.milestone(3);sfx.solve();ctx.unlockNote('xiantian');ctx.toast('八卦各归其位——乾南坤北，离东坎西。台心有东西升了起来。');}}

  // ---------- 墙上的文字 ----------
  const sw=W.hangingScroll(cx-5.38,2.3,cz,Math.PI/2,['天地定位','山泽通气','雷风相薄','水火不相射','八卦相错'],{w:1.15,h:2.1});
  W.interact(sw.group,{label:'读挂轴',range:3,onClick:()=>ctx.read('tiandi')});
  // 东墙石碑：先天次序
  const stele=new T.Group();stele.position.set(cx+5.2,0,cz);stele.rotation.y=-Math.PI/2;W.root.add(stele);
  W.mesh(new T.BoxGeometry(1.5,.3,.5),W.M.stone,0,.15,0,stele);
  W.mesh(new T.BoxGeometry(1.25,2.3,.22),new T.MeshStandardMaterial({color:'#2e3133',roughness:.7}),0,1.45,0,stele);
  W.mesh(new T.PlaneGeometry(1.1,2.1),new T.MeshStandardMaterial({map:scrollTex(['乾一兑二离三震四','巽五坎六艮七坤八','乾居正南','一至四自南而东','五至八自西南而西'],{paper:'#2e3133',ink:'#d9b25c',seal:false,width:512,height:1024}),roughness:.6,metalness:.2}),0,1.45,.12,stele);
  W.mesh(new T.BoxGeometry(1.45,.25,.4),W.M.gold,0,2.7,0,stele);W.addBox(cx+5.2,cz,.3,.8,'stele');
  W.interact(stele,{label:'读石碑',range:3,onClick:()=>ctx.read('xtorder')});

  // ---------- 铜箱（台心升起） ----------
  const chest=new T.Group();chest.position.set(cx,-1,cz);W.root.add(chest);
  W.mesh(new T.BoxGeometry(.9,.5,.6),W.M.bronze,0,.25,0,chest);
  const lid=new T.Group();lid.position.set(0,.5,-.3);chest.add(lid);W.mesh(new T.BoxGeometry(.92,.12,.62),W.M.bronze,0,.06,.3,lid);
  W.mesh(new T.BoxGeometry(.94,.04,.64),W.M.gold,0,.02,.3,lid);
  const lockFace=W.mesh(new T.PlaneGeometry(.4,.2),new T.MeshStandardMaterial({map:glyphTex('锁',{bg:'#3a2a14',fg:'#e8c26a',size:120}),roughness:.4}),0,.3,.305,chest);
  let chestCol=null,chestT=0,lidT=0,chestOpen=false;
  W.interact(chest,{label:'铜箱（转盘锁）',range:2.6,enabled:()=>ctx.flag('octagon')&&!chestOpen,onClick:async()=>{
    const ok=await ctx.openLock({title:'铜箱',riddle:'以先天之数，记 雷、风、水、火。',digits:4,answer:'4563'});
    if(ok)openChest();}});
  function openChest(){if(chestOpen)return;chestOpen=true;ctx.setFlag('chest');ctx.milestone(4);sfx.solve();ctx.inv.add('key2');ctx.inv.add('compass');ctx.toast('铜箱开了：得到后门钥匙、罗盘。罗盘会显示在屏幕上方。');}

  // ---------- 北门 ----------
  const door=W.door({x:cx,z:cz-5.5,side:'n'});
  W.interact(door.group,{label:'北门（锁着）',range:2.4,onClick:()=>{if(door.open)return;
    if(ctx.inv.has('key2')){ctx.inv.remove('key2');door.openDoor();sfx.door();ctx.setFlag('door2');ctx.milestone(5);ctx.toast('门开了。');}
    else ctx.toast(ctx.flag('octagon')?'门锁着。台心的铜箱里也许有钥匙。':'门锁着。');}});

  W.updaters.push((dt,t)=>{
    for(const tl of tiles){tl.cur.lerp(tl.target,Math.min(1,dt*6));tl.group.position.set(tl.cur.x,1.15+Math.sin(t*1.5+tl.slot)*.03+(tl===selected?.12:0),tl.cur.z);tl.group.rotation.y=tl.rot;if(tl===selected)tl.glow.material.opacity=.4+Math.sin(t*6)*.2;}
    if(ctx.flag('octagon')&&chestT<1){chestT=Math.min(1,chestT+dt*.5);chest.position.y=-1+chestT*1.16;if(chestT===1&&!chestCol)chestCol=W.addBox(cx,cz,.5,.35,'chest');}
    if(chestOpen&&lidT<1){lidT=Math.min(1,lidT+dt*1.2);lid.rotation.x=-lidT*1.6;}
  });
  function restore(f){if(f.octagon){tiles.forEach(tl=>{tl.slot=ANSWER.indexOf(tl.name);place(tl,true);});chestT=1;chest.position.y=.16;chestCol=W.addBox(cx,cz,.5,.35,'chest');}
    if(f.chest){chestOpen=true;lidT=1;lid.rotation.x=-1.6;}if(f.door2){door.openDoor();door.t=1;}}
  return {id:'r2',name:'先天室',theme:'xian',bounds:{x0:-5.5,x1:5.5,z0:cz-5.5,z1:cz+5.5},tiles,slots,chest,door,restore,answer:ANSWER,
    hint:f=>!f.octagon?'octagon':!f.chest?'chest':!f.door2?'door2':null};
}

// 两间屋之间的短廊（侧墙、顶、地）
export function corridor(W,z0,z1){const T=THREE,len=Math.abs(z1-z0),zc=(z0+z1)/2;
  for(const s of [-1,1]){W.mesh(new T.BoxGeometry(.2,3.1,len),W.M.lacquer,s*1.1,1.55,zc);W.addBox(s*1.1,zc,.12,len/2,'corridor');}
  W.mesh(new T.BoxGeometry(2.4,.2,len),W.M.darkWood,0,3.1,zc);const f=W.mesh(new T.PlaneGeometry(2.2,len),W.M.darkWood,0,.005,zc);f.rotation.x=-Math.PI/2;f.userData.floor=true;}

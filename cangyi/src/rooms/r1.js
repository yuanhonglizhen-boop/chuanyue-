import * as THREE from '../../vendor/three.module.js';
import {glyphTex} from '../textures.js';

// 第一间 · 门厅「卦画」：学阴阳爻、自下而上读卦、八卦取象歌。
// 机关：四屉柜，屉面标着 震 / 艮 / 兑 / 巽，每屉三条爻（自下而上），点击切换阴阳；排对即开。四屉全开，柜顶现出门钥。
export const R1={cx:0,cz:0,w:11,d:11,h:4.6};
const TARGET={震:[1,0,0],艮:[0,0,1],兑:[1,1,0],巽:[0,1,1]};

export function buildRoom1(ctx){
  const {world:W,sfx}=ctx;const T=THREE;
  W.room({...R1,doors:[{side:'n',at:0,width:1.8}],floor:'wood'});
  W.plaque('卦画',0,3.75,-5.38,0,{w:2.2,h:.58});W.plaque('藏易阁',0,3.6,5.38,Math.PI,{w:3.2,h:.8});
  W.rug(0,.5,3.2,6);
  // 南墙两扇格窗，西墙书架，四角烛台，三盏宫灯
  W.windowPanel(-3.2,2.2,5.38,Math.PI);W.windowPanel(3.2,2.2,5.38,Math.PI);
  W.shelf(-5.1,3,{rot:Math.PI/2});W.shelf(-5.1,-3.4,{rot:Math.PI/2});
  W.candleStand(-4.3,4.3);W.candleStand(4.3,4.3);W.candleStand(-4.3,-4.4);W.candleStand(4.3,-4.4);
  W.lantern(-2.4,3.5,-2);W.lantern(2.4,3.5,1.8);W.lantern(0,3.6,4);

  // ---------- 门 ----------
  const door=W.door({x:0,z:-5.5,side:'n'});
  W.interact(door.group,{label:'北门（锁着）',range:2.4,onClick:()=>{
    if(door.open)return;
    if(ctx.inv.has('key1')){ctx.inv.remove('key1');door.openDoor();sfx.door();ctx.setFlag('door1');ctx.milestone(2);ctx.toast('门开了。');ctx.labelOf(door.group,'北门');}
    else ctx.toast('门锁着。也许钥匙就在这间屋子里。');}});

  // ---------- 挂轴：八卦取象歌 ----------
  const sc=W.hangingScroll(-5.38,2.3,-.4,Math.PI/2,['乾三连坤六断','震仰盂艮覆碗','离中虚坎中满','兑上缺巽下断'],{w:1,h:2.1});
  W.interact(sc.group,{label:'读挂轴',range:3,onClick:()=>ctx.read('song')});
  // ---------- 书案与手札 ----------
  const desk=new T.Group();desk.position.set(-2.4,0,1.4);W.root.add(desk);
  W.mesh(new T.BoxGeometry(1.9,.08,.9),W.M.lacquer,0,.82,0,desk);W.mesh(new T.BoxGeometry(1.95,.05,.95),W.M.gold,0,.78,0,desk);
  for(const [x,z] of [[-.85,-.38],[.85,-.38],[-.85,.38],[.85,.38]])W.mesh(new T.BoxGeometry(.08,.78,.08),W.M.darkWood,x,.39,z,desk);
  const note=W.mesh(new T.PlaneGeometry(.5,.36),new T.MeshStandardMaterial({map:glyphTex('卦',{bg:'#efe1bd',fg:'#3a2414',size:120,ring:false}),roughness:.9}),-.3,.87,0,desk);note.rotation.x=-Math.PI/2;
  W.mesh(new T.CylinderGeometry(.04,.05,.12,10),W.M.bronze,.55,.92,-.15,desk);
  W.addBox(-2.4,1.4,1,.5,'desk');
  W.interact(note,{label:'读手札',range:2.4,onClick:()=>ctx.read('guahua')});

  // ---------- 四屉柜 ----------
  const cab=new T.Group();cab.position.set(4.95,0,-.6);cab.rotation.y=-Math.PI/2;W.root.add(cab);
  W.mesh(new T.BoxGeometry(4.4,1.7,.7),W.M.lacquer,0,.85,0,cab);W.mesh(new T.BoxGeometry(4.5,.08,.78),W.M.gold,0,1.72,0,cab);W.mesh(new T.BoxGeometry(4.5,.12,.78),W.M.darkWood,0,.06,0,cab);
  W.addBox(4.75,-.6,.45,2.25,'cabinet');
  const names=['震','艮','兑','巽'],init={震:[0,1,0],艮:[1,0,0],兑:[0,0,1],巽:[1,0,1]};
  const drawers=names.map((name,i)=>{
    const x=-1.6+i*1.07;const g=new T.Group();g.position.set(x,.92,.36);cab.add(g);
    const front=W.mesh(new T.BoxGeometry(.98,1.36,.06),W.M.darkWood,0,0,0,g);
    W.mesh(new T.BoxGeometry(1.02,1.4,.03),W.M.gold,0,0,-.02,g);
    const tag=W.mesh(new T.PlaneGeometry(.34,.34),new T.MeshStandardMaterial({map:glyphTex(name),roughness:.4,metalness:.2}),0,.47,.04,g);
    const state=[...init[name]];const bars=[];
    for(let k=0;k<3;k++){const bg=new T.Group();bg.position.set(0,-.42+k*.24,.045);g.add(bg);
      const yang=W.mesh(new T.BoxGeometry(.62,.11,.04),W.M.gold,0,0,0,bg);
      const yin=[W.mesh(new T.BoxGeometry(.26,.11,.04),W.M.gold,-.18,0,0,bg),W.mesh(new T.BoxGeometry(.26,.11,.04),W.M.gold,.18,0,0,bg)];
      const hit=W.mesh(new T.BoxGeometry(.7,.19,.05),new T.MeshBasicMaterial({visible:false}),0,0,0,bg);
      const show=()=>{yang.visible=!!state[k];yin.forEach(m=>m.visible=!state[k]);};show();
      const bar={group:bg,hit,k,show};bars.push(bar);
      W.interact(hit,{label:name+' · 第'+['一（下）','二（中）','三（上）'][k]+'爻',range:2.6,enabled:()=>!d.open,onClick:()=>{state[k]=state[k]?0:1;show();sfx.toggle(!!state[k]);check(d);}});
    }
    const d={name,group:g,state,bars,open:false,t:0};return d;
  });
  // 打开后屉内的玉片（装饰）
  function check(d){if(d.open)return;if(d.state.every((v,i)=>v===TARGET[d.name][i])){d.open=true;sfx.unlock_();ctx.toast('「'+d.name+'」屉开了。');ctx.setFlag('drawer-'+d.name);
      if(drawers.every(x=>x.open)){ctx.setFlag('drawers');ctx.milestone(1);showKey();ctx.toast('四屉皆开——柜顶亮起一把金钥匙。');sfx.solve();}}}
  // 门钥
  const key=new T.Group();key.position.set(0,1.85,0);cab.add(key);key.visible=false;
  W.mesh(new T.TorusGeometry(.08,.02,8,20),W.M.gold,-.12,0,0,key);W.mesh(new T.BoxGeometry(.26,.03,.03),W.M.gold,.05,0,0,key);W.mesh(new T.BoxGeometry(.03,.07,.03),W.M.gold,.15,-.04,0,key);
  const keyLight=new T.PointLight('#ffd27a',0,2.2,2);keyLight.position.set(0,.2,0);key.add(keyLight);
  function showKey(){key.visible=true;keyLight.intensity=1.6;}
  W.interact(key,{label:'拿起金钥匙',range:2.6,enabled:()=>key.visible,onClick:()=>{key.visible=false;keyLight.intensity=0;ctx.inv.add('key1');sfx.pickup();ctx.setFlag('key1');ctx.toast('得到：门钥。');}});

  W.updaters.push((dt,t)=>{drawers.forEach(d=>{if(d.open&&d.t<1){d.t=Math.min(1,d.t+dt*1.6);d.group.position.z=.36+d.t*.42;}});if(key.visible){key.rotation.y=t*1.5;key.position.y=1.85+Math.sin(t*2)*.04;}});

  // 读档恢复
  function restore(f){for(const d of drawers)if(f['drawer-'+d.name]){TARGET[d.name].forEach((v,i)=>d.state[i]=v);d.bars.forEach(b=>b.show());d.open=true;d.t=1;d.group.position.z=.78;}
    if(f.drawers&&!f.key1)showKey();if(f.door1){door.openDoor();door.t=1;}}
  return {id:'r1',name:'门厅 · 卦画',theme:'hall',bounds:{x0:-5.5,x1:5.5,z0:-5.5,z1:5.5},spawn:{x:0,z:3.4,yaw:0},drawers,door,key,restore,
    hint:f=>!f.drawers?'drawers':!f.door1?'door1':null};
}

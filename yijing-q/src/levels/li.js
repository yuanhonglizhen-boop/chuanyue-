import * as THREE from '../../vendor/three.module.js';
import {TRIGRAMS} from '../lore.js';

// 第二境 · 离（火）。黄昏。从火塘取火，点燃火台排成离卦（阳阴阳）；按 E 可盖灭火台。
export function buildLi(ctx){
  const {world,kit,physics,toast,sfx}=ctx;
  const target=TRIGRAMS.li.lines;
  world.skyUniforms.top.value.set('#7c8fc9');world.skyUniforms.mid.value.set('#f6c9a4');world.skyUniforms.bottom.value.set('#f7e1c6');world.skyUniforms.sun.value.set(.6,.12,-.8).normalize();world.skyUniforms.sunColor.value.set('#ffd08a');
  ctx.scene.fog=new THREE.Fog('#f2c9a8',40,140);
  world.farMountains('#c6a7a6');world.addClouds(12,'#ffe6d6');
  world.water({y:-.65,deep:'#7a6fa8',shallow:'#e7a98f',foam:'#fff1df'});

  const grass='#c2cf86',earth='#c99a73',grass2='#d2d68f';
  const H=world.island({x:0,z:0,r:6.5,top:0,grass,earth});
  const P1=world.island({x:12.5,z:-3.5,r:3.6,top:.6,grass:grass2,earth});
  const P2=world.island({x:-11.5,z:-9.5,r:3.6,top:2.2,grass:grass2,earth});
  const P3=world.island({x:0,z:-23.5,r:4.2,top:4.6,grass:grass2,earth});
  const G=world.island({x:15,z:-19,r:4,top:1.2,grass,earth});
  const S=world.island({x:-.5,z:12.5,r:2.4,top:.2,grass:grass2,earth});

  world.bridge({from:[6.1,-1.2],to:[9.2,-2.6],top:.3});
  world.stone({x:-.3,z:7.8,r:.9,top:.1});world.stone({x:.3,z:9.6,r:.8,top:.15});
  world.stone({x:-6.9,z:-3.9,r:.85,top:.6});world.stone({x:-8.3,z:-5.8,r:.85,top:1.3});
  // 升降台与横移石
  const lift=world.box({x:0,z:-8.4,w:2,d:2,top:.2,color:'#b98a55',safe:false});
  world.stone({x:1.2,z:-11.4,r:.9,top:3.7});
  const slider=world.stone({x:-.4,z:-14,r:1.15,top:4,safe:false});
  world.stone({x:.4,z:-16.9,r:.85,top:4.3});
  // 三号岛西侧下山的石阶，回到二号岛（地图成环）
  [[-5.4,-21.2,4],[-6.3,-18.4,3.3],[-6.8,-15.5,2.6],[-8.2,-13.6,2.4]].forEach(([x,z,top])=>world.stone({x,z,r:.9,top,color:'#e2cdb5'}));
  // 起点岛上的石柱（藏爻玉，要二段跳）
  world.stone({x:-4.2,z:2.6,r:.8,top:2.1,color:'#d8c7ae',h:2.2});

  const hearth=kit.brazier({x:0,z:-1.6,top:0,lit:true,big:true});
  const braziers=[
    kit.brazier({x:12.9,z:-4,top:.6,lit:false,name:'初'}),
    kit.brazier({x:-11.6,z:-10,top:2.2,lit:true,name:'二'}),
    kit.brazier({x:0,z:-24.2,top:4.6,lit:false,name:'三'}),
  ];
  const stele=kit.stele({x:-3.4,z:-2.4,top:0,lines:target,facing:.6});
  // 通往卦门的石墩，解谜前沉在水下
  const bridgeStones=[];[[13.4,-8.6],[14,-10.8],[14.6,-13]].forEach(([x,z],i)=>{const s=world.stone({x,z,r:1,top:.8+i*.12,color:'#e2cdb5'});s.col.disabled=true;s.group.position.y=-2.5;s.targetTop=.8+i*.12;bridgeStones.push(s);});
  const gate=kit.gate({x:15.3,z:-20.6,top:1.2,lines:target});

  const gems=[
    kit.gem({x:-4.2,y:3.3,z:2.6,id:'pillar'}),
    kit.gem({x:-.5,y:1.2,z:12.8,id:'south'}),
    kit.gem({x:11.3,y:1.7,z:-1.8,id:'p1'}),
    kit.gem({x:-10.2,y:3.3,z:-7.6,id:'p2'}),
    kit.gem({x:-.6,y:5.1,z:-14,id:'slider'}),
    kit.gem({x:1.6,y:5.7,z:-22,id:'p3'}),
  ];

  world.meadow([H,P1,P2,P3,G,S].map(i=>({x:i.col.x,z:i.col.z,r:i.r,top:i.top})),700,['#b9c97d','#cfd88f'],['#ffb3a7','#ffe08a','#fff6e6']);
  world.roundTree(4.3,0,3.6,1,'#e3a46b');world.roundTree(-5,0,-.6,.9,'#d98d63');world.pine(3.8,0,-4,1,'#7c9a6a');world.rock(2.4,0,5,.7,'#b9a79a');
  [[-1.8,4.8],[1.8,4.8],[-4.5,-4.6],[4.6,-4.4]].forEach(([x,z])=>world.lantern(x,0,z,'#ffb35c'));
  world.roundTree(14.4,.6,-1.6,.8,'#e8b26e');world.pine(-13.2,2.2,-11.6,.9,'#7c9a6a');world.roundTree(-2.6,4.6,-25.8,.9,'#e3a46b');world.lantern(2.2,4.6,-21.2,'#ffb35c');
  world.pine(17.2,1.2,-17.6,.9,'#7c9a6a');world.lantern(13.4,1.2,-17.6,'#ffb35c');

  const FLAME=ctx.challenge?18:28;let carry=0,solved=false,rise=0;
  function setCarry(v){carry=v;ctx.mascot.setCarrying(v>0);}
  function check(){const now=braziers.map(b=>b.lit?1:0);if(!solved&&now.every((v,i)=>v===target[i])){solved=true;sfx.solve();toast('离卦已成 —— 上下阳、中间阴。去往卦门的石墩浮出水面！');bridgeStones.forEach(s=>s.col.disabled=false);}}
  const near=(p,b,r)=>Math.hypot(p.x-b.pos.x,p.z-b.pos.z)<r&&Math.abs(p.y-b.pos.y)<1.6;

  const level={
    id:'li',index:1,lines:target,name:'离',image:'火',title:'第二境 · 继明',subtitle:'明两作，离',
    spawn:{x:0,y:0,z:4.2,yaw:0},killY:-1.4,camYaw:0,timeLimit:360,gems,gate,braziers,
    get solved(){return solved;},get carry(){return carry;},_liftTop:()=>lift.col.top,_sliderX:()=>slider.col.x,
    interactables:[
      {pos:stele.pos,label:'读石碑',act:()=>ctx.openLore('li')},
      ...braziers.map(b=>({pos:b.pos,get label(){return b.lit?'盖灭火台':(carry>0?'点燃火台':'需要火种');},act:()=>{
        if(b.lit){b.set(false);sfx.toggle(false);ctx.burst(b.pos.clone().setY(b.pos.y+1.3),{color:'#8a8a8a',n:12,up:2.5,gravity:-1});check();}
        else if(carry>0){b.set(true);setCarry(0);sfx.toggle(true);ctx.burst(b.pos.clone().setY(b.pos.y+1.3),{color:'#ffb347',n:18,up:3});check();}
        else toast('先去火塘取火。');}})),
    ],
    onLand(){},
    onFall(){if(carry>0){setCarry(0);toast('火苗被水浇灭了，回火塘重新取火。');}},
    objective(){
      const got=gems.filter(g=>g.taken).length,f=carry>0?`（火种还能燃 ${Math.ceil(carry)} 秒）`:'';
      if(!solved)return `让三座火台排成离卦 ☲（自下而上：阳、阴、阳）。点燃为阳，熄灭为阴。${f}`;
      if(got<3)return `石墩已浮出水面。再收集 ${3-got} 枚爻玉（已得 ${got}/6），卦门才会亮起。`;
      return '卦门已亮，走进去。';
    },
    update(dt,t,player){
      hearth.update(dt,t);braziers.forEach(b=>b.update(dt,t));
      // 取火：靠近火塘
      if(Math.hypot(player.x-hearth.pos.x,player.z-hearth.pos.z)<2.3&&player.y<1.5){if(carry<FLAME-1){if(carry<=0)toast('取得火种！趁火还旺，送到火台去（靠近后按 E）。');sfx.pickup();}setCarry(FLAME);}
      // 带着火种直接碰到未点燃的火台，也能点燃
      if(carry>0)for(const b of braziers)if(!b.lit&&near(player,b,1.45)){b.set(true);setCarry(0);sfx.toggle(true);ctx.burst(b.pos.clone().setY(b.pos.y+1.3),{color:'#ffb347',n:18,up:3});check();break;}
      if(carry>0){carry=Math.max(0,carry-dt);if(carry===0){setCarry(0);toast('火种烧尽了，回火塘再取。');}}
      // 升降台
      const ly=.2+(Math.sin(t*.7-1.2)+1)/2*3.3;lift.col.dy=ly-lift.col.top;lift.col.top=ly;lift.group.position.y=ly;
      // 横移石
      const sx=-.4+Math.sin(t*.75)*1.2;slider.col.dx=sx-slider.col.x;slider.col.x=sx;slider.group.position.x=sx;gems[4].pos.x=sx;gems[4].group.position.x=sx;
      if(solved&&rise<1){rise=Math.min(1,rise+dt*.6);bridgeStones.forEach((s,i)=>{const e=THREE.MathUtils.smoothstep(rise*1.5-i*.15,0,1);s.group.position.y=-2.5+(s.targetTop+2.5)*e;s.col.top=s.group.position.y;});}
      if(solved&&gems.filter(g=>g.taken).length>=3&&!gate.active){gate.activate();sfx.gate();toast('卦门亮起来了！');}
      gate.update(dt,t);
    },
    debugSolve(){braziers.forEach((b,i)=>b.set(!!target[i]));check();rise=1;bridgeStones.forEach(s=>{s.group.position.y=s.targetTop;s.col.top=s.targetTop;});},
  };
  return level;
}

import * as THREE from '../../vendor/three.module.js';
import {TRIGRAMS} from '../lore.js';

// 第一境 · 坎（水）。目标：把三座爻台排成坎卦（阴阳阴），石桥升起；收集至少 3 枚爻玉，卦门开启。
export function buildKan(ctx){
  const {world,kit,physics,toast,sfx,rng}=ctx;
  const target=TRIGRAMS.kan.lines;
  world.skyUniforms.top.value.set('#8fcfe6');world.skyUniforms.mid.value.set('#e3f2ec');world.skyUniforms.bottom.value.set('#f4efe2');
  ctx.scene.fog=new THREE.Fog('#e3f2ec',45,150);
  world.farMountains('#a8c8c2');world.addClouds(16);
  world.water({y:-.65,deep:'#3f9db3',shallow:'#86d3cf'});

  const grass='#a4d68c',earth='#d1ac7f';
  // 起点岛
  const A=world.island({x:0,z:0,r:7,top:0,grass,earth});
  // 南边小岛（藏一枚爻玉）
  const S=world.island({x:1,z:12.5,r:2.6,top:.3,grass,earth});
  world.stone({x:.6,z:8,r:.95,top:.15});world.stone({x:1.4,z:9.7,r:.85,top:.3});
  // 过河石墩，其中一个在水里上下浮动
  world.stone({x:-1.2,z:-8.4,r:1,top:.2});
  const bob=world.stone({x:.9,z:-10.6,r:1,top:.2,safe:false});
  world.stone({x:-.4,z:-12.8,r:1,top:.3});
  // 爻台岛
  const B=world.island({x:0,z:-21,r:7.5,top:.5,grass,earth});
  // 东侧岛：石墩跳上去
  world.stone({x:8.4,z:-3.6,r:.9,top:.55});world.stone({x:9.9,z:-5.3,r:.8,top:.95});
  const E=world.island({x:13.5,z:-8.5,r:4,top:1.3,grass:'#b2dc94',earth});
  // 西侧高岛：坐移动木筏上去
  const W=world.island({x:-15.5,z:-13.5,r:4.6,top:1.3,grass:'#b2dc94',earth});
  const raft=world.box({x:-8.6,z:-3.4,w:1.9,d:1.9,top:.8,color:'#c99b62',safe:false});
  // 北侧卦门岛
  const C=world.island({x:0,z:-41,r:6,top:1,grass,earth});
  // 爻台岛东北的高处小石台，要踩云垫弹上去
  const cloudPad=world.stone({x:5.2,z:-24.5,r:.95,top:.6,color:'#ffffff',bounce:14,safe:false});
  const perch=world.stone({x:7.6,z:-27.3,r:1.2,top:4.1,color:'#e7dfc8',h:.7});

  // 爻台：初、二、三自下而上，做成三级台阶
  const altars=[
    kit.yaoAltar({x:-3.6,z:-17.6,top:1.1,name:'初'}),
    kit.yaoAltar({x:-3.6,z:-20.6,top:1.8,name:'二'}),
    kit.yaoAltar({x:-3.6,z:-23.6,top:2.5,name:'三'}),
  ];
  // 初始：阳阴阳（正好是离卦，与坎相反）
  altars.forEach((a,i)=>a.set(i!==1));
  const steleA=kit.stele({x:3.2,z:2.2,top:0,lines:target,facing:-.5});
  const steleB=kit.stele({x:3.2,z:-17.8,top:.5,lines:target,facing:-.3});

  // 升起的石桥：五个石墩，解谜前沉在水下
  const bridgeStones=[];for(let i=0;i<5;i++){const z=-29.6-i*2.1,x=Math.sin(i*1.1)*.9;const s=world.stone({x,z,r:1,top:.7+i*.06,color:'#d8d3c1'});s.col.disabled=true;s.group.position.y=-2.5;s.targetTop=.7+i*.06;bridgeStones.push(s);}

  const gate=kit.gate({x:0,z:-42.5,top:1,lines:target});

  // 爻玉 6 枚，需要至少 3 枚
  const gems=[
    kit.gem({x:1,y:1.3,z:12.8,id:'south'}),
    kit.gem({x:.9,y:1.3,z:-10.6,id:'bob'}),
    kit.gem({x:14.3,y:2.4,z:-9.4,id:'east'}),
    kit.gem({x:-15.5,y:4.6,z:-13.5,id:'west-high'}),
    kit.gem({x:-13.4,y:2.4,z:-15.8,id:'west'}),
    kit.gem({x:7.6,y:5.3,z:-27.3,id:'perch'}),
  ];

  // 装饰
  const rngSpots=[A,B,C,E,W,S].map(i=>({x:i.col.x,z:i.col.z,r:i.r,top:i.top}));
  world.meadow(rngSpots,900);
  world.pine(-4.8,0,3.6,1.1);world.roundTree(4.6,0,-3.2,1);world.bamboo(-5.2,0,-2.6,6);world.rock(-2.8,0,4.6,.9);world.rock(5.5,0,2.8,.6);
  world.lantern(-1.6,0,-5.6);world.lantern(1.6,0,-5.6);
  world.roundTree(4.8,.5,-21.5,1.1,'#8ccf84');world.pine(2.4,.5,-26,1);world.bamboo(5.3,.5,-17.6,5);world.lantern(-1.4,.5,-26.4);world.lantern(1.4,.5,-26.4);
  world.roundTree(15.4,1.3,-6.6,.9);world.rock(12,1.3,-10.6,.8);
  // 西岛高台：两块叠石，需要二段跳
  world.stone({x:-15.5,z:-13.5,r:1.15,top:3.2,color:'#c7c0aa',h:2});
  world.pine(-17.6,1.3,-11.4,1);world.bamboo(-13.2,1.3,-11.2,4);
  world.pine(-3.6,1,-39.6,1.1);world.pine(3.8,1,-39.4,1);world.lantern(-2.4,1,-37.4);world.lantern(2.4,1,-37.4);
  world.roundTree(-.4,.3,14.2,.7,'#93d18a');

  let solved=false,bridgeRise=0,last=null,t0=0;
  function check(){
    const now=altars.map(a=>a.yang?1:0);
    if(!solved&&now.every((v,i)=>v===target[i])){solved=true;sfx.solve();toast('坎卦已成 —— 上下阴、中间阳。石桥从水中升起！');bridgeStones.forEach(s=>{s.col.disabled=false;});}
  }
  return {
    id:'kan',index:0,lines:target,name:'坎',image:'水',title:'第一境 · 习坎',subtitle:'水洊至，习坎',
    spawn:{x:0,y:0,z:3.5,yaw:0},killY:-1.4,camYaw:0,
    gems,gate,altars,
    get solved(){return solved;},
    interactables:[{pos:steleA.pos,label:'读石碑',act:()=>ctx.openLore('kan')},{pos:steleB.pos,label:'读石碑',act:()=>ctx.openLore('kan')}],
    onLand(col){
      // 只在"从别处踏上来"的那一下切换，原地蹦跳不会反复切换
      if(col.tag?.startsWith('altar:')&&last!==col){const a=altars.find(a=>a.col===col);const v=a.toggle();sfx.toggle(v);ctx.burst(new THREE.Vector3(col.x,col.top+.2,col.z),{color:v?'#ffe39a':'#bdeee0',n:16,speed:2.5});check();}
      last=col;
    },
    objective(){
      const got=gems.filter(g=>g.taken).length;
      if(!solved)return '让三座爻台排成坎卦 ☵（自下而上：阴、阳、阴）。跳上爻台可切换阴阳。';
      if(got<3)return `石桥已升起。再收集 ${3-got} 枚爻玉（已得 ${got}/6），卦门才会亮起。`;
      return '卦门已亮，走进去，前往下一境。';
    },
    update(dt,t,player){
      t0=t;altars.forEach(a=>a.update(dt,t));
      // 浮动石墩
      const by=.2+Math.sin(t*1.3)*.32-.12;bob.col.dy=by-bob.col.top;bob.col.top=by;bob.group.position.y=by;
      // 移动木筏：在起点岛西缘和西岛之间往返
      const k=(Math.sin(t*.55)+1)/2,rx=-8.6+(-12.6+8.6)*k,rz=-3.4+(-10.2+3.4)*k;raft.col.dx=rx-raft.col.x;raft.col.dz=rz-raft.col.z;raft.col.x=rx;raft.col.z=rz;raft.group.position.set(rx,.8,rz);
      // 云垫轻轻起伏
      cloudPad.group.scale.y=1+Math.sin(t*3)*.06;
      // 石桥升起
      if(solved&&bridgeRise<1){bridgeRise=Math.min(1,bridgeRise+dt*.6);bridgeStones.forEach((s,i)=>{const e=THREE.MathUtils.smoothstep(bridgeRise*1.6-i*.15,0,1);s.group.position.y=-2.5+(s.targetTop+2.5)*e;s.col.top=s.group.position.y;});
        if(bridgeRise>.95&&!this._splashed){this._splashed=true;bridgeStones.forEach(s=>ctx.burst(new THREE.Vector3(s.col.x,.2,s.col.z),{color:'#e9fbff',n:10,speed:2}));}}
      if(solved&&gems.filter(g=>g.taken).length>=3&&!gate.active){gate.activate();sfx.gate();toast('卦门亮起来了！');}
      gate.update(dt,t);
    },
    debugSolve(){altars.forEach((a,i)=>a.set(!!target[i]));check();bridgeRise=1;bridgeStones.forEach(s=>{s.group.position.y=s.targetTop;});},
  };
}

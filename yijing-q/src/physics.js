// 极简平台物理：所有可站立物体都是竖直的圆柱或（可旋转的）长方体。
// 每个碰撞体：{kind:'cyl'|'box', x,z, r | hw,hd,rot, top, bottom, dx,dy,dz(本帧位移), bounce?, safe?, tag?}
export const STEP=.42;

export function createPhysics(){
  const colliders=[];const state={form:'normal'};// form：当前形态。带 pass 的碰撞体在对应形态下可以穿过（如水态穿火墙）
  function add(c){const col={bottom:-50,dx:0,dy:0,dz:0,safe:true,...c};colliders.push(col);return col;}
  function remove(c){const i=colliders.indexOf(c);if(i>=0)colliders.splice(i,1);}
  function contains(c,x,z,pad=0){
    if(c.disabled)return false;
    if(c.kind==='cyl'){const dx=x-c.x,dz=z-c.z;return dx*dx+dz*dz<=(c.r+pad)*(c.r+pad);}
    let lx=x-c.x,lz=z-c.z;if(c.rot){const cs=Math.cos(c.rot),sn=Math.sin(c.rot);const rx=lx*cs-lz*sn,rz=lx*sn+lz*cs;lx=rx;lz=rz;}
    return Math.abs(lx)<=c.hw+pad&&Math.abs(lz)<=c.hd+pad;
  }
  // 脚下最高、且不高于 y+STEP 的表面
  function groundAt(x,z,y){let best=-Infinity,col=null;for(const c of colliders){if(c.top>y+STEP||c.top<best||c.noGround)continue;if(contains(c,x,z,.12)){best=c.top;col=c;}}return {h:best,col};}
  // 身体（半径 rad，高 h）在 (x,z,y) 是否被比台阶更高的物体挡住
  function blocked(x,z,y,rad=.3,h=.8){for(const c of colliders){if(c.top<=y+STEP||c.bottom>=y+h)continue;if(c.pass&&c.pass===state.form)continue;if(contains(c,x,z,rad))return c;}return null;}
  // 头顶最低的物体底面（水中上浮时撞洞顶）：只算底面高于 y 的
  function ceilingAt(x,z,y,rad=.25){let best=Infinity;for(const c of colliders){if(c.bottom<=y||c.bottom>=best||c.noGround)continue;if(contains(c,x,z,rad))best=c.bottom;}return best;}
  return {colliders,add,remove,groundAt,blocked,contains,ceilingAt,state};
}

// 玩家控制器：加速/减速、走路自动小跳、跳跃（含二段跳、土狼时间、输入缓冲）、移动平台跟随
export function createController({physics,onLand,onHop,onJump,onSlam}){
  const p={swim:false,ceilY:Infinity,breachY:Infinity,flowX:0,flowY:0,flowZ:0,canSlam:false,slamming:false,slamReq:false,lastTap:-9,t:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,yaw:0,grounded:false,ground:null,coyote:0,buffer:0,jumps:0,hopT:0,checkpoint:{x:0,y:0,z:0},airTime:0,speedMul:1,noDouble:false,stun:0};
  const SPEED=5,ACCEL=26,DECEL=30,GRAV=24,JUMP=8.2,JUMP2=7,HOP=3.1;
  function place(x,y,z,yaw=p.yaw){Object.assign(p,{x,y,z,vx:0,vy:0,vz:0,yaw,grounded:false,ground:null,jumps:0});p.checkpoint={x,y,z};}
  // 水中：按住「跳」上浮、松开缓缓下沉；没有自动小跳。水流（flowX/Y/Z）由关卡每帧设定，直接叠加到位移上。
  // 「震」：空中连按两下跳（或 F / 「震」键）向下猛砸，落地时回调 onSlam。
  const SW_SPEED=4.2,SW_ACC=11,SW_DEC=6,SW_UP=17,SW_SINK=5.5,SW_MAXUP=4.2,SW_MAXDOWN=3.6;
  function swimUpdate(dt,input){
    p.t+=dt;
    if(p.grounded&&p.ground){p.x+=p.ground.dx;p.z+=p.ground.dz;p.y+=p.ground.dy;}
    if(p.stun>0){p.stun-=dt;input={x:0,z:0,jump:false,up:false};}
    const sp=SW_SPEED*p.speedMul,len=Math.hypot(input.x,input.z),tx=len?input.x/Math.max(1,len)*sp:0,tz=len?input.z/Math.max(1,len)*sp:0;
    const a=(len?SW_ACC:SW_DEC)*dt*(p.stun>0?0:1);
    const ax=tx-p.vx,az=tz-p.vz,al=Math.hypot(ax,az);if(al<=a){p.vx=tx;p.vz=tz;}else{p.vx+=ax/al*a;p.vz+=az/al*a;}
    if(len>.05){const target=Math.atan2(input.x,input.z);let d=target-p.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));p.yaw+=d*Math.min(1,dt*8);}
    const mx=p.vx+p.flowX,mz=p.vz+p.flowZ;
    const nx=p.x+mx*dt,bx=physics.blocked(nx,p.z,p.y);if(!bx)p.x=nx;else p.vx=0;
    const nz=p.z+mz*dt,bz=physics.blocked(p.x,nz,p.y);if(!bz)p.z=nz;else p.vz=0;
    // 跳：在底上是蹬一下；空中连按两下是「震」
    if(input.jump){
      if(p.grounded){p.vy=5.2;p.grounded=false;p.jumps=1;onJump?.(1);}
      else if(p.canSlam&&p.t-p.lastTap<.34)p.slamReq=true;
      else onJump?.(1);
      p.lastTap=p.t;
    }
    if(p.slamReq){p.slamReq=false;if(p.grounded){onSlam?.(p.ground,true);}else{p.slamming=true;p.vy=-15;}}
    if(!p.slamming){p.vy+=(input.up?SW_UP:-SW_SINK)*dt;p.vy-=p.vy*1.4*dt;p.vy=p.vy>SW_MAXUP?Math.max(SW_MAXUP,p.vy-14*dt):Math.max(-SW_MAXDOWN,p.vy);/* 蹬地、破水的冲劲慢慢消掉 */}
    const wasGrounded=p.grounded;
    let ny=p.y+(p.vy+p.flowY)*dt;
    // 洞顶 / 水面
    // 上九：水面打开后，在水面附近按住上浮，冲出水面
    if(input.up&&p.y>p.breachY&&!p.grounded&&p.vy<11)p.vy=11;
    const ceil=Math.min(p.ceilY,physics.ceilingAt(p.x,p.z,p.y+.85)-.85);
    if(ny>ceil){ny=Math.max(p.y,ceil);if(p.vy>0)p.vy=0;}
    p.y=ny;
    const g=physics.groundAt(p.x,p.z,Math.max(p.y,p.y-(p.vy+p.flowY)*dt));
    if(g.col&&p.y<=g.h+.001&&p.vy+p.flowY<=0){
      const impact=-p.vy;p.y=g.h;p.vy=0;
      if(!wasGrounded){p.grounded=true;p.ground=g.col;p.jumps=0;if(p.slamming){p.slamming=false;onSlam?.(g.col,false);}else onLand?.(g.col,Math.min(impact,3),true);
        if(g.col.bounce&&!p.slamming){p.vy=g.col.bounce;p.grounded=false;p.ground=null;}/* 海葵：弹起来 */}
      else p.ground=g.col;
      if(g.col.safe&&!g.col.dx&&!g.col.dz&&!g.col.dy)p.checkpoint={x:p.x,y:p.y,z:p.z};
    }else{p.grounded=false;p.ground=null;}
    p.airTime=p.grounded?0:p.airTime+dt;
  }
  function update(dt,input){
    if(p.swim)return swimUpdate(dt,input);
    p.slamming=false;p.slamReq=false;
    // 移动平台：先随平台一起移动
    if(p.grounded&&p.ground){p.x+=p.ground.dx;p.z+=p.ground.dz;p.y+=p.ground.dy;}
    // 水平速度
    // 被撞后的短暂硬直：不接受输入，保留击退速度
    if(p.stun>0){p.stun-=dt;input={x:0,z:0,jump:false};}
    const sp=SPEED*p.speedMul,len=Math.hypot(input.x,input.z),tx=len?input.x/Math.max(1,len)*sp:0,tz=len?input.z/Math.max(1,len)*sp:0;
    const a=(len?ACCEL:DECEL)*(p.grounded?1:.55)*dt*(p.stun>0?0:1);
    const ax=tx-p.vx,az=tz-p.vz,al=Math.hypot(ax,az);if(al<=a){p.vx=tx;p.vz=tz;}else{p.vx+=ax/al*a;p.vz+=az/al*a;}
    if(len>.05){const target=Math.atan2(input.x,input.z);let d=target-p.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));p.yaw+=d*Math.min(1,dt*14);}
    // 分轴移动，碰墙则停
    const nx=p.x+p.vx*dt,bx=physics.blocked(nx,p.z,p.y);if(!bx)p.x=nx;
    const nz=p.z+p.vz*dt,bz=physics.blocked(p.x,nz,p.y);if(!bz)p.z=nz;
    // 撞到圆柱时沿切线滑过去，不会斜着卡死在柱子上
    const hit=bx||bz;
    if(hit){
      let moved=false;
      if(hit.kind==='cyl'){const dx=p.x-hit.x,dz=p.z-hit.z,l=Math.hypot(dx,dz)||1,ux=dx/l,uz=dz/l,dot=p.vx*ux+p.vz*uz;
        if(dot<0){const tx2=p.vx-dot*ux,tz2=p.vz-dot*uz,sx=p.x+tx2*dt,sz=p.z+tz2*dt;if(!physics.blocked(sx,sz,p.y)){p.x=sx;p.z=sz;p.vx=tx2;p.vz=tz2;moved=true;}}}
      if(!moved){if(bx)p.vx=0;if(bz)p.vz=0;}
    }
    // 跳跃
    p.buffer=input.jump?.13:Math.max(0,p.buffer-dt);p.coyote=p.grounded?.1:Math.max(0,p.coyote-dt);
    if(p.buffer>0){
      // 走路小跳的半空中按跳，算作第一跳，不浪费二段跳
      if(p.coyote>0||(p.hopping&&p.jumps===0)){p.vy=JUMP;p.grounded=false;p.coyote=0;p.buffer=0;p.jumps=1;p.hopping=false;onJump?.(1);}
      else if(p.jumps<2&&!p.grounded&&!p.noDouble){p.vy=JUMP2;p.buffer=0;p.jumps=2;onJump?.(2);}
    }
    // 走路时自动小跳：蹦蹦跳跳
    if(p.grounded&&len>.15){p.hopT-=dt;if(p.hopT<=0){p.vy=HOP;p.grounded=false;p.hopT=.05;p.hopping=true;onHop?.();}}else p.hopT=.02;
    // 重力与落地
    const wasGrounded=p.grounded;
    p.vy-=GRAV*dt;p.y+=p.vy*dt;
    const g=physics.groundAt(p.x,p.z,Math.max(p.y,p.y-p.vy*dt));
    if(g.col&&p.y<=g.h+.001&&p.vy<=0){
      const impact=-p.vy;p.y=g.h;p.vy=0;
      if(!wasGrounded){p.grounded=true;p.ground=g.col;p.jumps=0;onLand?.(g.col,impact,p.hopping&&input.jump!==true);p.hopping=false;
        if(g.col.bounce){p.vy=g.col.bounce;p.grounded=false;p.jumps=1;}}
      else{p.ground=g.col;}
      if(p.grounded&&g.col.safe&&!g.col.dx&&!g.col.dz&&!g.col.dy)p.checkpoint={x:p.x,y:p.y,z:p.z};
    }else{
      // 走下台阶时贴地，不是一步跨空
      if(wasGrounded&&g.col&&p.y-g.h<STEP*.6&&p.vy<=0&&!p.hopping){p.y=g.h;p.vy=0;p.ground=g.col;}
      else{p.grounded=false;p.ground=null;}
    }
    p.airTime=p.grounded?0:p.airTime+dt;
  }
  return {p,place,update};
}

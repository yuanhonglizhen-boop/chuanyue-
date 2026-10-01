import * as THREE from './vendor/three.module.js';

export function createTravel({scene,camera,person,legs,hat,rig,state,collision,toast,reduce,onComplete}){
  const marker=new THREE.Mesh(new THREE.RingGeometry(.12,.155,36),new THREE.MeshBasicMaterial({color:'#eac483',side:THREE.DoubleSide,transparent:true,opacity:.75,depthWrite:false}));
  marker.name='destination-ring';marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);
  const hover=marker.clone();hover.name='ground-hover';hover.material=marker.material.clone();hover.material.opacity=.35;scene.add(hover);hover.visible=false;
  // No path line is constructed. Only a small ring identifies the clicked destination.
  let path=[],quest=false,pending=null,step=0,turn=0,blockedAt=-1000,follow=false,moving=false;
  const keys=new Set(),forward=new THREE.Vector3(),spacing=.22,speed=1.15;
  const key=(x,z)=>`${x},${z}`,decode=k=>k.split(',').map(Number),grid=p=>Math.round(p/spacing);
  const canWalk=collision.canWalk,walkCache=new Map();let cacheStamp='';
  function gridWalk(x,z){const k=key(x,z);if(!walkCache.has(k))walkCache.set(k,canWalk(x*spacing,z*spacing));return walkCache.get(k);}
  function nearby(x,z){const gx=grid(x),gz=grid(z),points=[];for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){const a=gx+dx,b=gz+dz;if(gridWalk(a,b)&&collision.segmentClear(x,z,a*spacing,b*spacing))points.push([a,b]);}points.sort((a,b)=>Math.hypot(a[0]*spacing-x,a[1]*spacing-z)-Math.hypot(b[0]*spacing-x,b[1]*spacing-z));return points[0];}
  function route(x,z){
    if(!canWalk(x,z))return null;
    if(collision.segmentClear(person.position.x,person.position.z,x,z))return [new THREE.Vector3(x,0,z)];
    const stamp=collision.revision();if(stamp!==cacheStamp){walkCache.clear();cacheStamp=stamp;}
    const startPoint=nearby(person.position.x,person.position.z),endPoint=nearby(x,z);if(!startPoint||!endPoint)return null;
    const [sx,sz]=startPoint,[ex,ez]=endPoint,start=key(sx,sz),end=key(ex,ez),closed=new Set(),cost=new Map([[start,0]]),parents=new Map(),heap=[];
    function push(k,score){let i=heap.length;heap.push({k,score});while(i){const parent=(i-1)>>1;if(heap[parent].score<=score)break;heap[i]=heap[parent];i=parent;}heap[i]={k,score};}
    function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;heap[0]=last;while(true){const left=i*2+1,right=left+1;if(left>=heap.length)break;const next=right<heap.length&&heap[right].score<heap[left].score?right:left;if(heap[next].score>=last.score)break;heap[i]=heap[next];i=next;}heap[i]=last;}return first.k;}
    push(start,0);let loops=0;
    while(heap.length&&loops++<12000){const current=pop();if(closed.has(current))continue;if(current===end){const points=[new THREE.Vector3(x,0,z)];let k=end;while(k){const [a,b]=decode(k);points.unshift(new THREE.Vector3(a*spacing,0,b*spacing));k=parents.get(k);}return points;}
      closed.add(current);const [a,b]=decode(current);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x1=a+dx,z1=b+dz,k=key(x1,z1);if(closed.has(k)||!gridWalk(x1,z1)||!collision.segmentClear(a*spacing,b*spacing,x1*spacing,z1*spacing))continue;const next=cost.get(current)+Math.hypot(dx,dz);if(next<(cost.get(k)??Infinity)){parents.set(k,current);cost.set(k,next);push(k,next+Math.hypot(x1-ex,z1-ez));}}
    }return null;
  }
  function setFollow(value){follow=value;document.getElementById('mouse-follow').setAttribute('aria-pressed',String(value));}
  function warn(z){if(performance.now()-blockedAt>800){toast(z<0&&state.phase<3?'木桥还未放下，先在这岸探索。':'这里有水面、山石或墙体，请换一处空地。');blockedAt=performance.now();}}
  function command(x,z,{silent=false,complete=false}={}){
    if(state.walking&&!complete||keys.size)return false;
    if(complete&&state.phase===3&&state.bridge<=.985){path=[];quest=true;pending={x,z};state.walking=true;marker.visible=false;return true;}
    const next=route(x,z);if(!next){if(!silent)warn(z);return false;}path=next;pending=null;quest=complete;marker.position.set(x,collision.heightAt(x,z)+.025,z);marker.visible=true;if(complete)state.walking=true;return true;
  }
  function inputBlocked(event){const target=event?.target||document.activeElement;return !!document.querySelector('dialog[open]')||!!target?.closest?.('input,textarea,select,[contenteditable="true"]');}
  function releaseKeys(){keys.clear();}
  addEventListener('keydown',e=>{if(!['KeyW','KeyA','KeyS','KeyD'].includes(e.code)||e.ctrlKey||e.altKey||e.metaKey||inputBlocked(e)||state.walking)return;e.preventDefault();keys.add(e.code);path=[];pending=null;marker.visible=hover.visible=false;setFollow(false);});
  addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',releaseKeys);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseKeys();});
  document.addEventListener('focusin',e=>{if(inputBlocked(e))releaseKeys();});
  function update(dt,t){
    if(inputBlocked())releaseKeys();
    if(pending&&state.bridge>.985){const goal=pending;pending=null;const next=route(goal.x,goal.z);if(next){path=next;}else{quest=false;state.walking=false;warn(goal.z);}}
    const oldX=person.position.x,oldZ=person.position.z;
    if(!inputBlocked()){
      const dx=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),dz=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
      if(dx||dz){camera.getWorldDirection(forward);forward.y=0;forward.normalize();const divisor=Math.hypot(dx,dz),vx=(forward.x*dz-forward.z*dx)/divisor,vz=(forward.z*dz+forward.x*dx)/divisor;collision.sweep(person.position,vx*speed*dt,vz*speed*dt,true);}
      else if(path.length){let distance=dt*speed;while(path.length&&distance>0){const target=path[0],vx=target.x-person.position.x,vz=target.z-person.position.z,len=Math.hypot(vx,vz);if(len<.002){path.shift();continue;}const amount=Math.min(distance,len),beforeX=person.position.x,beforeZ=person.position.z;collision.sweep(person.position,vx/len*amount,vz/len*amount,false);const travelled=Math.hypot(person.position.x-beforeX,person.position.z-beforeZ);if(travelled<amount-.001){path=[];quest=false;state.walking=false;break;}distance-=amount;if(amount>=len)path.shift();}}
    }
    const travelled=Math.hypot(person.position.x-oldX,person.position.z-oldZ);moving=travelled>.0001;if(moving){turn=Math.atan2(oldX-person.position.x,oldZ-person.position.z);step+=travelled*7;}
    const diff=Math.atan2(Math.sin(turn-person.rotation.y),Math.cos(turn-person.rotation.y));person.rotation.y+=diff*Math.min(1,dt*10);
    person.position.y=collision.heightAt(person.position.x,person.position.z);
    rig.update({dt,t,distance:travelled,moving,collision});
    if(!path.length&&!pending){marker.visible=false;if(quest){quest=false;state.walking=false;onComplete();}}
  }
  function reset(){path=[];quest=false;pending=null;releaseKeys();setFollow(false);marker.visible=hover.visible=false;person.rotation.set(0,0,0);turn=step=0;moving=false;cacheStamp='';walkCache.clear();rig.reset();}
  function cancel(){path=[];pending=null;quest=false;state.walking=false;releaseKeys();marker.visible=hover.visible=false;moving=false;setFollow(false);}
  function face(point){if(point)turn=Math.atan2(person.position.x-point.x,person.position.z-point.z);}
  return {command,update,reset,cancel,face,canWalk,hover,route,get following(){return follow;},toggle(){setFollow(!follow);return follow;},get moving(){return moving||path.length>0||pending!==null;},get target(){return path.length?path.at(-1).toArray():null;}};
}

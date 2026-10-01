import * as THREE from './vendor/three.module.js';

// Footprints are clipped from actual world-space solids, not hand-entered circles.
// The smaller traveller is 0.78 scale: hat radius 0.273, total height about 0.87.
export const BODY_RADIUS=.30;
// Low plinths and raised floor strips are traversable steps, not waist-high walls.
const lower=.47,upper=1.34;
const solids=new Set(['stone','darkStone','paleStone','wood','darkWood','roof','bamboo','garden-stone','garden-wood','garden-ink','v4-bark','v4-bark-light','v4-plaster','v4-pedestal','v4-trim']);
const v=new THREE.Vector3();
function cross(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function hull(points){const map=new Map();for(const p of points)map.set(`${Math.round(p[0]*10000)},${Math.round(p[1]*10000)}`,p);const a=[...map.values()].sort((p,q)=>p[0]-q[0]||p[1]-q[1]);if(a.length<3)return a;const lo=[],hi=[];for(const p of a){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}for(const p of [...a].reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}return lo.slice(0,-1).concat(hi.slice(0,-1));}
function clip(poly,y,above){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ia=above?a[1]>=y:a[1]<=y,ib=above?b[1]>=y:b[1]<=y;if(ia)out.push(a);if(ia!==ib){const t=(y-a[1])/(b[1]-a[1]);out.push([a[0]+(b[0]-a[0])*t,y,a[2]+(b[2]-a[2])*t]);}}return out;}
export function captureColliderParts(mesh){
  if(!mesh.isMesh||mesh.isInstancedMesh||Array.isArray(mesh.material))return {blocks:[],floors:[]};
  const solid=solids.has(mesh.material.name),floor=solid||mesh.material.name==='soil';if(!floor)return {blocks:[],floors:[]};
  mesh.updateWorldMatrix(true,false);const p=mesh.geometry.attributes.position,index=mesh.geometry.index,verts=[];let minY=Infinity,maxY=-Infinity;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);verts.push([v.x,v.y,v.z]);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);}
  const floors=maxY>=.22&&maxY<=lower?[{polygon:hull(verts.map(p=>[p[0],p[2]])),y:maxY}]:[];
  if(!solid||maxY<=lower||minY>=upper)return {blocks:[],floors};
  const points=[],blocks=[],count=index?index.count:p.count;
  for(let i=0;i<count;i+=3){const tri=[0,1,2].map(j=>verts[index?index.getX(i+j):i+j]);const cut=clip(clip(tri,lower,true),upper,false);if(!cut.length)continue;const projected=cut.map(p=>[p[0],p[2]]);if(mesh.geometry.type==='TorusGeometry')blocks.push(hull(projected));else points.push(...projected);}
  if(points.length)blocks.push(hull(points));return {blocks:blocks.filter(p=>p.length>1),floors};
}
function distanceSegment(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
export function pointIn(poly,x,z){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function touches(poly,x,z,r){if(pointIn(poly,x,z))return true;for(let i=0;i<poly.length;i++)if(distanceSegment(x,z,poly[i],poly[(i+1)%poly.length])<r)return true;return false;}
function under(object,roots){for(let o=object;o;o=o.parent)if(roots.includes(o))return true;return false;}

export function createCollision({scene,person,bridge,doorLeft,doorRight,outline,state,wheel}){
  scene.updateMatrixWorld(true);const blocks=[],floors=[],grid=new Map(),land=outline.map(([x,z])=>[x*.97,z*.97]),dynamic=[doorLeft,doorRight];
  scene.traverse(o=>{if(!o.isMesh||under(o,[person,bridge,wheel,...dynamic]))return;const parts=o.userData.colliderParts||captureColliderParts(o);blocks.push(...parts.blocks);floors.push(...parts.floors);});
  for(const poly of blocks){const xs=poly.map(p=>p[0]),zs=poly.map(p=>p[1]);for(let x=Math.floor(Math.min(...xs)-BODY_RADIUS);x<=Math.floor(Math.max(...xs)+BODY_RADIUS);x++)for(let z=Math.floor(Math.min(...zs)-BODY_RADIUS);z<=Math.floor(Math.max(...zs)+BODY_RADIUS);z++){const key=`${x},${z}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(poly);}}
  let gateStamp=-1,doorPolygons=[];
  function refreshDoors(){const stamp=Math.round(state.gate*1000);if(stamp===gateStamp)return;gateStamp=stamp;doorPolygons=[];for(const door of dynamic){door.updateWorldMatrix(true,true);const panel=door.children.find(o=>o.isMesh);if(panel)doorPolygons.push(...captureColliderParts(panel).blocks);}}
  function canWalk(x,z){if(!pointIn(land,x,z))return false;for(let i=0;i<land.length;i++)if(distanceSegment(x,z,land[i],land[(i+1)%land.length])<BODY_RADIUS)return false;
    if(z>-1.27&&z<1.28&&!(state.phase>=3&&state.bridge>.985&&Math.abs(x)<.26))return false;
    if(((x-4.1)/(1.68+BODY_RADIUS))**2+((z-5.4)/(1.25+BODY_RADIUS))**2<1)return false;
    if((grid.get(`${Math.floor(x)},${Math.floor(z)}`)||[]).some(p=>touches(p,x,z,BODY_RADIUS)))return false;
    refreshDoors();return !doorPolygons.some(p=>touches(p,x,z,BODY_RADIUS));
  }
  function heightAt(x,z){if(Math.abs(z)<1.16&&Math.abs(x)<.3&&state.bridge>.985){const angle=1.05*(1-state.bridge);return .365+.05/Math.cos(angle)+(1.02-THREE.MathUtils.clamp(z,-.96,1.02))*Math.tan(angle);}let y=.24;for(const floor of floors)if(floor.y>y&&pointIn(floor.polygon,x,z))y=floor.y;return y+.005;}
  function segmentClear(ax,az,bx,bz){const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/.07));for(let i=1;i<=n;i++)if(!canWalk(ax+(bx-ax)*i/n,az+(bz-az)*i/n))return false;return true;}
  function sweep(position,dx,dz,slide=true){const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.055)),sx=dx/n,sz=dz/n;for(let i=0;i<n;i++){const x=position.x,z=position.z;if(canWalk(x+sx,z+sz)){position.x+=sx;position.z+=sz;}else if(slide){if(canWalk(x+sx,z))position.x+=sx;if(canWalk(position.x,z+sz))position.z+=sz;}else break;}}
  return {canWalk,heightAt,segmentClear,sweep,blocks,floors,radius:BODY_RADIUS,revision:()=>`${state.bridge>.985}:${Math.round(state.gate*25)}`};
}

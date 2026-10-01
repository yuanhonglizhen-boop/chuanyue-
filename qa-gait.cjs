const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const out='E:/video-outputs/yijing-rain-garden/gait-v7';
(async()=>{const THREE=await import(pathToFileURL(path.join(__dirname,'vendor/three.module.js')).href);const results={};
for(const version of ['source-adventure-v6','source-gait-v7']){const {createScholar}=await import(pathToFileURL(path.join(__dirname,'..',version,'character.js')).href);const cases=[];
for(const fps of [60,30,20])for(const name of ['straight','turn90','reverse','stopStart','stairs','pivot']){
const rig=createScholar({scene:new THREE.Scene(),mat:(n,c)=>new THREE.MeshBasicMaterial({color:c})}),p=rig.person,dt=1/fps,collision={heightAt:(x,z)=>name==='stairs'?.055*Math.max(0,Math.floor(-z/.45)):0};p.position.set(0,0,0);rig.update({dt,t:0,distance:0,moving:false,collision});let last=rig.debug,turn=0,maxBoneError=0,maxFootJump=0,maxLateral=0,crossings=0,plantedPairs=0,maxPlantSlip=0,maxGroundSlide=0,maxLift=0,minSole=10,maxKneeJump=0;
for(let n=1;n<=fps*5;n++){const t=n/fps,moving=name==='pivot'?false:name==='stopStart'?t<4&&t%1<.65:t<4;
if((name==='turn90'||name==='pivot')&&t>=1.5)turn=Math.PI/2;if(name==='reverse'&&t>=1.5)turn=Math.PI;
const distance=moving?1.15*dt:0;p.position.x-=Math.sin(turn)*distance;p.position.z-=Math.cos(turn)*distance;p.position.y=collision.heightAt(p.position.x,p.position.z);p.rotation.y+=Math.atan2(Math.sin(turn-p.rotation.y),Math.cos(turn-p.rotation.y))*Math.min(1,dt*10);
rig.update({dt,t,distance,moving,collision});const d=rig.debug;
for(let i=0;i<2;i++){const f=d.feet[i],prior=last.feet[i],side=i===0?-1:1,shin=new THREE.Vector3(...f.boot).distanceTo(new THREE.Vector3(...f.knee));maxBoneError=Math.max(maxBoneError,Math.abs(shin-.25),f.thighLength?Math.abs(f.thighLength-.25):0);maxLateral=Math.max(maxLateral,Math.abs(f.boot[0]));if(f.boot[0]*side<.02)crossings++;
const jump=new THREE.Vector3(...f.world).distanceTo(new THREE.Vector3(...prior.world));maxFootJump=Math.max(maxFootJump,jump);maxKneeJump=Math.max(maxKneeJump,new THREE.Vector3(...f.knee).distanceTo(new THREE.Vector3(...prior.knee)));
if(f.planted&&prior.planted){plantedPairs++;maxPlantSlip=Math.max(maxPlantSlip,jump);}
if(f.swing===false&&prior.swing===false)maxGroundSlide=Math.max(maxGroundSlide,jump);
const lift=f.world[1]-collision.heightAt(f.world[0],f.world[2])-.046*.78;maxLift=Math.max(maxLift,lift);minSole=Math.min(minSole,lift);
}last=d;}
const result={name,fps,maxBoneError,maxFootJump,maxKneeJump,maxLateral,crossings,plantedPairs,maxPlantSlip,maxGroundSlide,maxLift,minSole};cases.push(result);
if(version==='source-gait-v7'){assert(maxBoneError<1e-8,JSON.stringify(result));assert.equal(crossings,0,JSON.stringify(result));assert(maxLateral<=.116,JSON.stringify(result));if(name!=='stairs')assert(maxLift<.047,JSON.stringify(result));assert(minSole>-.002,JSON.stringify(result));assert(maxFootJump<.19,JSON.stringify(result));}
}
results[version]=cases;
}
fs.writeFileSync(out+'/qa-gait-report.json',JSON.stringify({passed:true,scope:'Same motion inputs, 18 cases per version; 20/30/60 fps, five seconds each',results},null,2));console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([v,rs])=>[v,{cases:rs.length,maxBoneError:Math.max(...rs.map(r=>r.maxBoneError)),crossingFrames:rs.reduce((s,r)=>s+r.crossings,0),maxFootJump:Math.max(...rs.map(r=>r.maxFootJump)),maxLiftOnFlat:Math.max(...rs.filter(r=>r.name!=='stairs').map(r=>r.maxLift)),groundSlideStraight:rs.filter(r=>r.name==='straight').map(r=>r.maxGroundSlide)}])),null,2));
})().catch(e=>{console.error(e);process.exit(1);});

import * as THREE from './vendor/three.module.js';

// A five-head-tall travelling scholar. All limb pieces share articulated joints.
export function createScholar({scene,mat}){
  const person=new THREE.Group();person.name='scholar';person.scale.setScalar(.78);person.position.set(0,.33,3.25);scene.add(person);
  const cloth=mat('scholar-jade','#52877f'),dark=mat('scholar-ink','#284a4b'),lining=mat('scholar-linen','#eee2c7'),skin=mat('scholar-skin','#dcae8a'),hair=mat('scholar-hair','#273734'),leather=mat('scholar-leather','#916b46'),sole=mat('scholar-sole','#b5a081');
  const torso=new THREE.Group();person.add(torso);
  function mesh(geo,m,p,at=[0,0,0],scale){const o=new THREE.Mesh(geo,m);o.position.set(...at);if(scale)o.scale.set(...scale);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
  const orb=(m,p,at,scale)=>mesh(new THREE.SphereGeometry(1,18,12),m,p,at,scale);
  const box=(m,p,at,size)=>mesh(new THREE.BoxGeometry(...size),m,p,at);
  function segment(m,r1,r2){return mesh(new THREE.CylinderGeometry(r1,r2,1,12),m,person);}
  const up=new THREE.Vector3(0,1,0);function between(o,a,b){o.position.copy(a).add(b).multiplyScalar(.5);const d=b.clone().sub(a);o.scale.y=d.length();o.quaternion.setFromUnitVectors(up,d.normalize());}
  const rings=[[.43,.125,.084],[.51,.122,.078],[.66,.15,.082],[.77,.135,.066],[.805,.075,.05]],positions=[],indices=[];
  for(const [y,rx,rz] of rings)for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;positions.push(Math.cos(a)*rx,y,Math.sin(a)*rz);}
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<24;i++){const a=j*25+i;indices.push(a,a+1,a+25,a+1,a+26,a+25);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const tunic=mesh(geo,cloth,torso);tunic.material.side=THREE.DoubleSide;
  const collar1=box(lining,torso,[-.03,.758,-.067],[.043,.13,.021]);collar1.rotation.z=-.6;
  const collar2=box(lining,torso,[.025,.741,-.075],[.037,.16,.021]);collar2.rotation.z=.53;
  mesh(new THREE.CylinderGeometry(.126,.128,.044,24),leather,torso,[0,.535,0],[1,1,.68]);box(lining,torso,[.038,.535,-.09],[.027,.027,.013]);
  const hems=[];for(const s of [-1,1]){const h=new THREE.Group();h.position.set(s*.063,.47,0);torso.add(h);const p=box(cloth,h,[0,-.062,-.008],[.117,.15,.137]);p.rotation.z=s*.065;hems.push(h);}
  const head=new THREE.Group();head.position.set(0,.91,0);torso.add(head);orb(skin,head,[0,0,0],[.112,.128,.102]);
  mesh(new THREE.SphereGeometry(.116,24,16,0,Math.PI*2,0,Math.PI*.6),hair,head,[0,.024,.008],[1,1,.94]);
  orb(hair,head,[0,.132,.025],[.061,.065,.058]);const pin=mesh(new THREE.CylinderGeometry(.007,.008,.18,8),leather,head,[0,.144,.021]);pin.rotation.z=Math.PI/2;
  for(const s of [-1,1]){orb(skin,head,[s*.109,-.007,0],[.023,.038,.019]);orb(hair,head,[s*.041,.005,-.094],[.010,.014,.008]);const brow=box(hair,head,[s*.041,.03,-.094],[.038,.006,.008]);brow.rotation.z=s*.12;}
  orb(skin,head,[0,-.018,-.103],[.016,.023,.019]);box(leather,head,[0,-.059,-.088],[.027,.005,.009]);
  const bag=box(leather,torso,[0,.657,.115],[.20,.24,.08]);box(dark,torso,[0,.672,.159],[.15,.16,.013]);
  for(const s of [-1,1]){const strap=box(lining,torso,[s*.088,.68,.083],[.023,.23,.016]);strap.rotation.z=s*.06;mesh(new THREE.CylinderGeometry(.025,.025,.22,12),lining,torso,[s*.055,.813,.121]);}
  const arms=[];for(const s of [-1,1]){const shoulder=new THREE.Group();shoulder.position.set(s*.148,.751,0);torso.add(shoulder);shoulder.rotation.z=s*.07;
    orb(cloth,shoulder,[s*.008,-.012,0],[.053,.054,.052]);const sleeve=mesh(new THREE.CylinderGeometry(.052,.061,.19,14),cloth,shoulder,[s*.011,-.086,0]);const elbow=new THREE.Group();elbow.position.set(s*.017,-.17,0);shoulder.add(elbow);
    mesh(new THREE.CylinderGeometry(.039,.045,.14,12),cloth,elbow,[0,-.06,0]);mesh(new THREE.CylinderGeometry(.041,.043,.025,12),lining,elbow,[0,-.128,0]);orb(skin,elbow,[0,-.159,-.005],[.031,.042,.027]);arms.push({shoulder,elbow});}
  const feet=[],legs=[];
  for(const s of [-1,1]){const thigh=segment(dark,.054,.047),shin=segment(dark,.04,.047),knee=orb(dark,person,[0,0,0],[.047,.047,.047]);const boot=new THREE.Group();person.add(boot);boot.name=s<0?'left-foot':'right-foot';
    orb(dark,boot,[0,-.012,-.022],[.047,.038,.08]);box(sole,boot,[0,-.038,-.023],[.081,.014,.137]);mesh(new THREE.CylinderGeometry(.039,.043,.075,12),dark,boot,[0,.019,.01]);
    feet.push({side:s,anchor:new THREE.Vector3(),from:new THREE.Vector3(),to:new THREE.Vector3(),world:new THREE.Vector3(),hip:new THREE.Vector3(),boot,thigh,shin,knee,elapsed:0,duration:.25,swing:false,planted:true,contact:0});legs.push(thigh);}
  // Two fixed-length bones. Step planning must respect their workspace BEFORE IK.
  const bone=.25,reach=bone*2-.002,scale=.78,clearance=.046*scale;
  const heading=new THREE.Vector3(),right=new THREE.Vector3(),previousRoot=new THREE.Vector3(),velocity=new THREE.Vector3();
  let phase=0,started=false,wasMoving=false,action=0,nextFoot=0,walkBlend=0,pelvis=.531;
  function ground(p,collision){p.y=collision.heightAt(p.x,p.z)+clearance;return p;}
  function home(f,collision){return ground(person.position.clone().addScaledVector(right,f.side*.085*scale),collision);}
  function landing(f,remaining,moving,collision){
    const p=home(f,collision);
    if(moving){p.addScaledVector(velocity,remaining);p.addScaledVector(heading,.145);}
    return ground(p,collision);
  }
  function beginStep(f,duration,moving,collision){f.swing=true;f.planted=false;f.elapsed=0;f.duration=duration;f.from.copy(f.world);f.to.copy(landing(f,duration,moving,collision));f.contact++;}
  function update({dt,t,distance,moving,collision}){
    dt=Math.min(Math.max(dt,0),.05);heading.set(-Math.sin(person.rotation.y),0,-Math.cos(person.rotation.y));right.set(-heading.z,0,heading.x);
    if(!started){previousRoot.copy(person.position);for(const f of feet){f.world.copy(home(f,collision));f.anchor.copy(f.world);f.swing=false;}started=true;}
    velocity.copy(person.position).sub(previousRoot);velocity.y=0;if(dt>0)velocity.multiplyScalar(1/dt);if(velocity.length()>1.3)velocity.setLength(1.3);
    walkBlend+=((moving?1:0)-walkBlend)*(1-Math.exp(-dt*12));if(moving)phase=(phase+distance/.60)%1;
    person.updateMatrixWorld(true);
    // A short first step avoids holding both initial feet behind a moving root.
    if(moving&&!wasMoving&&!feet.some(f=>f.swing)){beginStep(feet[nextFoot],.105,true,collision);nextFoot=1-nextFoot;}
    if(!feet.some(f=>f.swing)){
      const candidates=feet.map((f,i)=>({f,i,local:person.worldToLocal(f.world.clone()),error:f.world.distanceTo(home(f,collision))}));
      const f=candidates.find(c=>moving&&c.i===nextFoot&&c.local.z>.125)||candidates.find(c=>!moving&&c.error>.014)||candidates.find(c=>Math.abs(c.local.x-c.f.side*.085)>.035);
      if(f){beginStep(f.f,moving?.25:.15,moving,collision);nextFoot=1-f.i;}
    }
    for(const f of feet){
      if(f.swing){
        f.elapsed=Math.min(f.duration,f.elapsed+dt);const u=f.elapsed/f.duration,ease=u*u*(3-2*u);
        // Replan with remaining travel on turns, never keep an obsolete landing behind us.
        const target=landing(f,Math.max(0,f.duration-f.elapsed),moving,collision);f.to.lerp(target,1-Math.exp(-dt*24));
        f.world.lerpVectors(f.from,f.to,ease);f.world.y+=Math.sin(Math.PI*u)*(moving?.034:.018);f.planted=false;
        if(u>=1){f.swing=false;f.world.copy(ground(f.to,collision));f.anchor.copy(f.world);f.planted=true;}
      }else{f.world.copy(f.anchor);f.planted=true;}
      const track=person.worldToLocal(f.world.clone());track.x=f.side*THREE.MathUtils.clamp(f.side*track.x,.060,.115);track.z=THREE.MathUtils.clamp(track.z,-.225,.225);
      const bounded=person.localToWorld(track);bounded.y=Math.max(bounded.y,collision.heightAt(bounded.x,bounded.z)+clearance);
      if(bounded.distanceTo(f.world)>.00001){f.planted=false;f.contact++;f.world.copy(bounded);if(!f.swing)f.anchor.copy(bounded);}
    }
    // Lower the pelvis on steps; do not stretch a planted shin to reach a lower slab.
    const nominal=.531-walkBlend*.035+walkBlend*.003*Math.sin(phase*Math.PI*4);
    const supportLimit=Math.min(...feet.map(f=>{const ankle=person.worldToLocal(f.world.clone()),horizontal=Math.hypot(ankle.x-f.side*.085,ankle.z);return ankle.y+Math.sqrt(Math.max(0,reach*reach-horizontal*horizontal))-.002;}));
    pelvis+=(nominal-pelvis)*(1-Math.exp(-dt*16));pelvis=Math.min(pelvis,supportLimit);
    torso.position.y=pelvis-.537;torso.rotation.y=walkBlend*Math.sin(phase*Math.PI*2)*.015;torso.rotation.z=walkBlend*Math.sin(phase*Math.PI*2)*.01;
    action=Math.max(0,action-dt*2);head.rotation.y=Math.sin(t*.65)*.018;head.rotation.x=-action*.09;
    for(let i=0;i<2;i++){
      const f=feet[i],before=f.world.clone(),ankle=person.worldToLocal(f.world.clone()),hip=f.hip.set(f.side*.085,pelvis,0);
      // Separate narrow tracks prevent scissoring when the body turns over a planted foot.
      ankle.x=f.side*THREE.MathUtils.clamp(f.side*ankle.x,.060,.115);ankle.z=THREE.MathUtils.clamp(ankle.z,-.225,.225);
      for(let projection=0;projection<3;projection++){
        const vertical=hip.y-ankle.y,horizontal=Math.sqrt(Math.max(0,reach*reach-vertical*vertical));
        const hx=ankle.x-hip.x,hz=ankle.z,span=Math.hypot(hx,hz);if(span>horizontal&&span>0){ankle.x=hip.x+hx*horizontal/span;ankle.z=hz*horizontal/span;}
        const world=person.localToWorld(ankle.clone());world.y=Math.max(world.y,collision.heightAt(world.x,world.z)+clearance);ankle.copy(person.worldToLocal(world));
      }
      const delta=ankle.clone().sub(hip);if(delta.length()>reach)ankle.copy(hip).add(delta.setLength(reach));
      f.world.copy(person.localToWorld(ankle.clone()));
      if(f.world.distanceTo(before)>.00001){f.planted=false;f.contact++;if(!f.swing)f.anchor.copy(f.world);}
      const d=hip.distanceTo(ankle),dir=ankle.clone().sub(hip).normalize(),bend=new THREE.Vector3(0,0,-1).addScaledVector(dir,dir.z).normalize();
      const k=hip.clone().addScaledVector(dir,d*.5).addScaledVector(bend,Math.sqrt(Math.max(0,bone*bone-d*d*.25)));
      between(f.thigh,hip,k);between(f.shin,k,ankle);f.knee.position.copy(k);f.boot.position.copy(ankle);
      const roll=f.swing?Math.sin(f.elapsed/f.duration*Math.PI*2)*.045:0;f.boot.rotation.x+=(roll-f.boot.rotation.x)*(1-Math.exp(-dt*20));
      const swing=walkBlend*ankle.z*1.35;arms[i].shoulder.rotation.x+=(swing-action*.55-arms[i].shoulder.rotation.x)*(1-Math.exp(-dt*16));arms[i].elbow.rotation.x=-.16-Math.max(0,-swing)*.2-action*.35;hems[i].rotation.x=-swing*.12;
    }
    previousRoot.copy(person.position);wasMoving=moving;
  }
  return {person,legs,hat:head,update,interact(){action=1;},reset(){phase=0;started=wasMoving=false;action=walkBlend=0;nextFoot=0;pelvis=.531;feet.forEach(f=>{f.swing=false;f.contact=0;});},get debug(){return {phase,feet:feet.map(f=>({planted:f.planted,swing:f.swing,contact:f.contact,world:f.world.toArray(),hip:f.hip.toArray(),knee:f.knee.position.toArray(),boot:f.boot.position.toArray(),thighLength:f.thigh.scale.y,shinLength:f.shin.scale.y})),arms:arms.map(a=>a.shoulder.rotation.x)};}};
}

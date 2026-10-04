// 透明底渲染爻爻：复用游戏里的模型与环境反射，单独打光
const {chromium}=require('playwright');const {pathToFileURL}=require('node:url');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:600,height:600}});
await p.goto(pathToFileURL(require('path').join(__dirname,'..','..','dist','易境-爻爻.html')).href);await p.waitForFunction(()=>window.__Q?.ready,null,{timeout:180000});
const shots=JSON.parse(process.env.SHOTS);
const out=await p.evaluate(async(shots)=>{const Q=__Q;Q.manual=true;Q.start(0);Q.step(1.2,{draw:false});
  const scene0=Q.mascot.root.parent;let Hemi,Dir,Amb;scene0.traverse(o=>{if(o.isHemisphereLight)Hemi=o.constructor;if(o.isDirectionalLight)Dir=o.constructor;if(o.isAmbientLight)Amb=o.constructor;});
  const Scene=scene0.constructor,Cam=Q.camera.constructor,R=Q.renderer.constructor;
  const r=new R({alpha:true,antialias:true,preserveDrawingBuffer:true});r.setPixelRatio(1);r.setSize(1024,1024,false);r.outputColorSpace=Q.renderer.outputColorSpace;r.toneMapping=Q.renderer.toneMapping;r.setClearColor(0x000000,0);
  const res={};
  for(const s of shots){
    const sc=new Scene();const m=Q.mascot.root;m.position.set(0,0,0);m.rotation.set(0,s.turn||0,0);sc.add(m);
    // 静止一会儿，让果冻形变归位、眼睛睁开
    for(let i=0;i<90;i++)Q.mascot.update(1/60,{vel:{x:0,y:0,z:0,length(){return 0}},grounded:true,yaw:s.turn||0});
    if(s.happy){Q.mascot.cheer();for(let i=0;i<s.happy;i++)Q.mascot.update(1/60,{vel:{x:0,y:0,z:0,length(){return 0}},grounded:true,yaw:s.turn||0});}
    const h=new Hemi('#f4fffa','#8fc9b4',2.1);sc.add(h);sc.add(new Amb('#ffffff',.45));
    const key=new Dir('#fff6e4',3.0);key.position.set(-2.5,4,4);sc.add(key);
    const rim=new Dir('#d9fff1',1.6);rim.position.set(2.5,2.5,-3.5);sc.add(rim);
    const cam=new Cam(s.fov||24,1,.1,100);cam.position.set(Math.sin(s.yaw)*s.dist,s.h,Math.cos(s.yaw)*s.dist);cam.lookAt(0,s.look,0);
    r.render(sc,cam);res[s.name]=r.domElement.toDataURL('image/png');sc.remove(m);scene0.add(m);}
  return res;},shots);
for(const k in out)fs.writeFileSync(process.env.S+'/icon/'+k+'.png',Buffer.from(out[k].split(',')[1],'base64'));
await b.close();})();

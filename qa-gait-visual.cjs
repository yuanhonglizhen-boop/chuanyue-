const {chromium}=require('C:/Users/宋/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),{pathToFileURL}=require('node:url');
const out='E:/video-outputs/yijing-rain-garden/gait-v7';
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const p=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(pathToFileURL(out+'/易境-雨后通途.html').href);await p.waitForFunction(()=>window.__READY);await p.waitForTimeout(700);
const data=await p.evaluate(async()=>{
const g=__game,person=g.person,gallery=document.createElement('canvas');gallery.width=1600;gallery.height=1000;const ctx=gallery.getContext('2d');ctx.fillStyle='#e8ede1';ctx.fillRect(0,0,1600,1000);const flat={heightAt:()=>.33};
g.travel.reset();person.position.set(0,.33,5.8);person.rotation.y=0;g.scholar.reset();g.scholar.update({dt:1/60,t:0,distance:0,moving:false,collision:flat});let turn=0;const shots=[];
for(let frame=1;frame<=180;frame++){
if(frame>=85)turn=Math.PI;const moving=frame<150;const d=moving?1.15/60:0;person.position.x-=Math.sin(turn)*d;person.position.z-=Math.cos(turn)*d;person.rotation.y+=Math.atan2(Math.sin(turn-person.rotation.y),Math.cos(turn-person.rotation.y))/6;g.scholar.update({dt:1/60,t:frame/60,distance:d,moving,collision:flat});
if([12,28,43,60,87,98,114,178].includes(frame)){const camera=g.camera.clone();camera.aspect=1;camera.fov=33;camera.position.set(person.position.x+.85,person.position.y+.65,person.position.z-1.45);camera.lookAt(person.position.clone().add({x:0,y:.42,z:0}));camera.updateProjectionMatrix();g.renderer.setSize(600,600,false);g.renderer.render(person.parent,camera);shots.push({frame,data:g.renderer.domElement.toDataURL()});}
}
for(let i=0;i<shots.length;i++){const image=new Image();image.src=shots[i].data;await image.decode();ctx.drawImage(image,(i%4)*400,Math.floor(i/4)*500,400,460);ctx.fillStyle='#31483c';ctx.font='20px sans-serif';ctx.fillText(['起步','迈步','换脚','直走','开始掉头','掉头中','掉头后','停止收步'][i],(i%4)*400+20,Math.floor(i/4)*500+488);}
return gallery.toDataURL();});
fs.writeFileSync(out+'/gait-contact-sheet.png',Buffer.from(data.split(',')[1],'base64'));if(errors.length)throw Error(errors.join('\n'));console.log('Visual contact sheet rendered; runtime errors: 0');await browser.close();})().catch(e=>{console.error(e);process.exit(1);});

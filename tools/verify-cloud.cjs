// Cloud smoke check: npm start server page + built dist page load, character walks, a mechanism operates.
// Writes screenshots and a JSON report to docs/verification/. Requires `npm run build` first.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium,dist}=require('./browser.cjs');
const root=path.join(__dirname,'..'),out=path.join(root,'docs','verification'),port=8433;fs.mkdirSync(out,{recursive:true});
const report={time:new Date().toISOString(),checks:[]};const check=(name,ok,detail)=>{report.checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+(detail!==undefined?' '+JSON.stringify(detail):''));};
(async()=>{const server=spawn(process.execPath,[path.join(root,'server.cjs')],{cwd:root,stdio:['ignore','pipe','inherit']});
await new Promise((res,rej)=>{server.stdout.on('data',d=>{if(String(d).includes('http://'))res();});server.on('exit',c=>rej(Error('server exited '+c)));});
const b=await chromium.launch();try{
for(const [label,url] of [['server',`http://127.0.0.1:${port}/`],['dist',pathToFileURL(path.join(dist,'易境-雨后通途.html')).href]]){
const p=await b.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const failed=[];p.on('requestfailed',r=>failed.push(r.url()));
await p.goto(url);await p.waitForFunction(()=>window.__READY,null,{timeout:120000});
check(label+': page reaches __READY',true);check(label+': no failed requests',failed.length===0,failed);
await p.screenshot({path:path.join(out,label+'-01-loaded.png')});
if(label==='dist'){check(label+': no runtime errors',errors.length===0,errors);await p.close();continue;}
// Walking: drive the same travel.update the frame loop uses, with real keyboard state (frame-rate independent).
await p.evaluate(()=>{__game.travel.reset();__game.person.position.set(0,__game.collision.heightAt(0,5.8),5.8);__game.renderer.domElement.focus();});
const before=await p.evaluate(()=>__game.person.position.toArray());await p.keyboard.down('KeyW');
const walked=await p.evaluate(()=>{const s=__game.person.position.clone();for(let i=0;i<30;i++)__game.travel.update(.025,i*.025);return Math.hypot(__game.person.position.x-s.x,__game.person.position.z-s.z);});
await p.keyboard.up('KeyW');const after=await p.evaluate(()=>__game.person.position.toArray());
check('server: W key walks the character',walked>.5,{from:before,to:after,distance:+walked.toFixed(3)});
await p.screenshot({path:path.join(out,'server-02-walked.png')});
// Mechanism: click the trough label (walk there via click-to-move), then press E to rotate it.
await p.locator('[data-station="pipe0"]').click();
await p.waitForFunction(()=>!__game.travel.moving&&__game.adventure.nearest==='pipe0',null,{timeout:600000,polling:200});
const v0=await p.evaluate(()=>__game.adventure.quest.pipes[0]);await p.keyboard.press('KeyE');await p.waitForTimeout(1500);
const v1=await p.evaluate(()=>__game.adventure.quest.pipes[0]);
check('server: walk to trough 1 and press E rotates it',v1===(v0+1)%4,{before:v0,after:v1});
await p.screenshot({path:path.join(out,'server-03-trough-rotated.png')});
check('server: no runtime errors',errors.length===0,errors);await p.close();}
}finally{await b.close();server.kill();}
report.passed=report.checks.every(c=>c.ok);fs.writeFileSync(path.join(out,'verify-cloud-report.json'),JSON.stringify(report,null,2));if(!report.passed)process.exit(1);})().catch(e=>{console.error(e);process.exit(1);});

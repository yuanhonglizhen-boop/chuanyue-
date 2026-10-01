// Diagnostic for the qa-adventure / qa-adventure-input timeouts: time the same click/tap-to-walk with no timeout cap.
const {chromium,dist}=require('./browser.cjs');const {pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch();for(const [name,vp,id,limit] of [['qa-adventure (desktop 1280x900)',{width:1280,height:900},'pipe0',30],['qa-adventure-input (mobile 390x844)',{width:390,height:844,isMobile:true,hasTouch:true},'pipe2',20]]){
const {width,height,...rest}=vp;const p=await b.newPage({viewport:{width,height},...rest});await p.route(/^https?:/,r=>r.abort());await p.goto(pathToFileURL(dist+'/易境-雨后通途.html').href);await p.waitForFunction(()=>window.__READY);await p.waitForTimeout(600);
await p.evaluate(()=>{window.__n=0;(function f(){__n++;requestAnimationFrame(f);})();});const t0=Date.now();
if(rest.hasTouch)await p.locator(`[data-station="${id}"]`).tap();else await p.locator(`[data-station="${id}"]`).click();
await p.waitForFunction(id=>!__game.travel.moving&&__game.adventure.nearest===id,id,{timeout:900000,polling:250});const secs=(Date.now()-t0)/1000,frames=await p.evaluate(()=>__n);
console.log(JSON.stringify({suite:name,station:id,arrived:true,seconds:+secs.toFixed(1),testTimeoutSeconds:limit,frames,msPerFrame:Math.round(secs*1000/frames)}));await p.close();}await b.close();})().catch(e=>{console.error(e);process.exit(1);});

// Diagnostic for qa-controls "actual WASD input moves and stops immediately on keyup": repeats that exact step and records frame times.
// Usage: W=1440 H=1000 node tools/diagnose-keyboard-step.cjs
// Reproduces the failing qa-controls-v5 step and records per-frame timings.
const {chromium,dist}=require('./browser.cjs');const {pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch(process.argv.length>2?{args:process.argv.slice(2)}:{});const p=await b.newPage({viewport:{width:+(process.env.W||1440),height:+(process.env.H||1000)}});
await p.goto(pathToFileURL(dist+'/易境-雨后通途.html').href);await p.waitForFunction(()=>window.__READY);await p.waitForTimeout(900);
const info=await p.evaluate(()=>{const g=__game.renderer.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return {renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'?'};});
await p.evaluate(()=>{__game.travel.reset();__game.person.position.set(0,__game.collision.heightAt(0,5.8),5.8);__game.renderer.domElement.focus();window.__ft=[];let l=performance.now();(function f(n){window.__ft.push(n-l);l=n;requestAnimationFrame(f);})(l);});
const before=await p.evaluate(()=>__game.person.position.toArray());await p.evaluate(()=>window.__ft.length=0);
await p.keyboard.down('KeyW');await p.waitForTimeout(450);await p.keyboard.up('KeyW');
const stopped=await p.evaluate(()=>__game.person.position.toArray());const ft=await p.evaluate(()=>window.__ft.slice());await p.waitForTimeout(250);const later=await p.evaluate(()=>__game.person.position.toArray());
const moved=Math.hypot(stopped[0]-before[0],stopped[2]-before[2]),drift=Math.hypot(later[0]-stopped[0],later[2]-stopped[2]);
const s=ft.slice(1).sort((a,b)=>a-b);
console.log(JSON.stringify({args:process.argv.slice(2),...info,framesDuringKeyHold:ft.length,frameMs:{min:s[0]?.toFixed(1),median:s[s.length>>1]?.toFixed(1),max:s.at(-1)?.toFixed(1)},movedWhileHeld:+moved.toFixed(3),requiredMoved:0.3,driftAfterKeyup:+drift.toFixed(4),requiredDrift:'<0.01',pass:moved>.3&&drift<.01}));await b.close();})().catch(e=>{console.error(e);process.exit(1);});

// 防卡死回归测试：
// 1) 四境里每一个细的圆柱障碍物（树、竹子、石灯、卦门柱……），从上方落到它边上（站不上去、却已进入挡人范围的那一圈），
//    四个方向各推 1 秒，至少一个方向能走开 0.5 米以上（或者掉进水里被送回），就算没卡住；
// 2) 🚩 复位：回到之前站稳过的地方，爻玉不丢；3) 推着方向几秒没挪动，自动提示复位。
// 可单独运行：npm run build && node tools/verify-stuck.cjs；也由 tools/verify.cjs 调用。
async function runStuck(p,check){
  for(const lv of [0,1,2,3,4]){
    const r=await p.evaluate(lv=>{const Q=__Q;Q.manual=true;Q.start(lv);Q.step(.3,{draw:false});const P=Q.player,PH=Q.physics;
      const thin=PH.colliders.filter(c=>c.kind==='cyl'&&c.r<.9&&!c.noGround&&!c.bounce&&c.top-c.bottom>.6&&c.top<20);
      let tests=0;const stuck=[];
      for(const c of thin){for(let k=0;k<4;k++){const a=k*Math.PI/2+.4,d=c.r+.42;// 落点：离中心 r+0.42（站不上去，但在挡人的 r+0.3 以内）
        Q.teleport(c.x+Math.cos(a)*d,c.top+.6,c.z+Math.sin(a)*d);Q.step(1.2,{draw:false});
        const f0=Q.game.falls;let ok=false;
        for(const mv of [{x:Math.cos(a),z:Math.sin(a)},{x:-Math.sin(a),z:Math.cos(a)},{x:Math.sin(a),z:-Math.cos(a)},{x:-Math.cos(a),z:-Math.sin(a)}]){const x0=P.x,z0=P.z;Q.step(1,{move:mv,draw:false});if(Math.hypot(P.x-x0,P.z-z0)>.5||Q.game.falls>f0){ok=true;break;}}
        tests++;if(!ok)stuck.push([+c.x.toFixed(1),+c.top.toFixed(1),+c.z.toFixed(1),k]);}}
      return {level:Q.level.id,thin:thin.length,tests,stuck:stuck.slice(0,6),n:stuck.length};},lv);
    check(`防卡死（${r.level}）：从上方落到 ${r.thin} 个细障碍物的边上（${r.tests} 次），都能走开`,r.tests>0&&r.n===0,r);
  }
  // 🚩 复位
  const s=await p.evaluate(()=>{const Q=__Q;Q.start(0);const P=Q.player;Q.step(.4,{draw:false});
    for(let i=0;i<90;i++)Q.step(1/60,{move:{x:0,z:-1},draw:false});const mid={x:P.x,z:P.z};Q.step(.5,{draw:false});
    for(let i=0;i<70;i++)Q.step(1/60,{move:{x:1,z:0},draw:false});Q.step(.4,{draw:false});
    const gems=Q.level.gems.filter(g=>g.taken).length,before={x:P.x,z:P.z};const ok=Q.resetToSafe();Q.step(.3,{draw:false});
    return {ok,moved:+Math.hypot(P.x-before.x,P.z-before.z).toFixed(2),grounded:P.grounded,gemsSame:Q.level.gems.filter(g=>g.taken).length===gems,toast:document.getElementById('toast-text').textContent};});
  check('🚩 复位：回到离这里至少 1.5 米、之前站稳过的地方，爻玉不丢',s.ok&&s.moved>=1.5&&s.grounded&&s.gemsSame&&/复位/.test(s.toast),s);
  // 卡住自动提示：顶着石灯推 3 秒
  const h=await p.evaluate(()=>{const Q=__Q;Q.start(0);const P=Q.player;Q.step(.3,{draw:false});Q.teleport(-1.6,0,-4.6);Q.step(.5,{draw:false});
    for(let i=0;i<60*3.2;i++)Q.step(1/60,{move:{x:0,z:-1},draw:false});return {toast:document.getElementById('toast-text').textContent,nudge:document.getElementById('btn-reset').classList.contains('nudge')};});
  check('卡住自动提示：推着方向却几秒没挪动，提示点 🚩 复位，按钮闪一闪',/🚩/.test(h.toast)&&h.nudge,h);
}
module.exports={runStuck};

if(require.main===module){
  const {chromium}=require('playwright'),path=require('node:path'),{pathToFileURL}=require('node:url');let fails=0;
  const check=(n,ok,d)=>{if(!ok)fails++;console.log((ok?'PASS ':'FAIL ')+n+(d!==undefined?'  '+JSON.stringify(d):''));return ok;};
  (async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:800,height:600}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
    await p.goto(pathToFileURL(path.join(__dirname,'..','dist','易境-爻爻.html')).href);await p.waitForFunction(()=>window.__Q?.ready,null,{timeout:180000});
    await runStuck(p,check);check('无运行时错误',errs.length===0,errs);await b.close();console.log(fails?'FAILED '+fails:'ALL PASSED');process.exit(fails?1:0);})().catch(e=>{console.error(e);process.exit(1);});
}

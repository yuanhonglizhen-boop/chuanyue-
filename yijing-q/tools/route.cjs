// 自动走位：在页面里按航点推进（固定步长，不瞬移）。每个航点可选：
//  x,z 目标；jump 起步先跳；dj 起跳后再二段跳；tol 到达半径；max 超时秒数；minY 到达时的最低高度
//  until 自定义完成条件（JS 表达式，可用 Q、P）；target 动态目标（返回 {x,z} 的表达式）
//  form 出发前切换形态；act 到达后按 E；expect 到达（并按 E）后必须成立的条件
//  waitLift / waitLiftTop / waitSlider / onSlider：第二境的时机控制
async function route(p,points,label,check){
  for(const [i,w] of points.entries()){
    const r=await p.evaluate(async(w)=>{
      const Q=__Q,P=Q.player,start=Q.game.time,tol=w.tol??.45,max=w.max??14,falls0=Q.game.falls;
      if(w.form)Q.setForm(w.form);
      const goal=()=>{if(w.target){const t=eval(w.target);if(t){w.x=t.x;w.z=t.z;}}return w;};
      const dir=()=>{const g=goal(),dx=g.x-P.x,dz=g.z-P.z,l=Math.hypot(dx,dz)||1;return {x:dx/l,z:dz/l,l};};
      if(w.waitLift){while(Q.game.time-start<20){if(Q.level._liftTop()<.45)break;Q.step(.05,{draw:false});}}
      if(w.waitLiftTop){while(Q.game.time-start<20){if(Q.level._liftTop()>3.25)break;Q.step(.05,{draw:false});}}
      if(w.waitSlider){while(Q.game.time-start<20){if(Q.level._sliderX()>.45&&Q.level._sliderX()<.75)break;Q.step(1/60,{draw:false});}}
      if(w.onSlider)w.x=Q.level._sliderX();
      if(w.jump){const d=dir();Q.step(1/120,{jump:true,move:d,draw:false});}
      let dj=!!w.dj,ok=false;
      while(Q.game.time-start<max){
        if(w.onSlider)w.x=Q.level._sliderX();
        const d=dir();
        if(dj&&Q.game.time-start>.24){Q.step(1/120,{jump:true,move:d,draw:false});dj=false;continue;}
        if(Q.game.falls>falls0)return {ok:false,why:'fell',pos:[P.x,P.y,P.z]};
        if(w.until){if(eval(w.until)){ok=true;break;}}
        else if(d.l<tol&&P.grounded&&(w.minY===undefined||P.y>w.minY)){ok=true;break;}
        Q.step(1/60,{move:(!w.until&&d.l<tol)||(w.until&&d.l<(w.tol??.2))?{x:0,z:0}:d,draw:false});
      }
      if(!ok)return {ok:false,why:'timeout',pos:[+P.x.toFixed(2),+P.y.toFixed(2),+P.z.toFixed(2)],objective:Q.level.objective?.()};
      if(w.act){for(let k=0;k<3;k++){Q.interact();Q.step(.1,{draw:false});if(!w.expect||eval(w.expect))break;}}
      if(w.expect&&!eval(w.expect))return {ok:false,why:'expect',expect:w.expect,pos:[+P.x.toFixed(2),+P.y.toFixed(2),+P.z.toFixed(2)],near:Q.nearestInteractable?.()?.label,objective:Q.level.objective?.()};
      return {ok:true,t:Q.game.time-start,pos:[+P.x.toFixed(2),+P.y.toFixed(2),+P.z.toFixed(2)]};
    },w);
    if(!r.ok){check(`${label}: 航点 ${i} (${w.x},${w.z}) 到达`,false,r);return false;}
  }
  check(`${label}: 全部 ${points.length} 个航点到达（无瞬移、无落水）`,true);return true;
}
module.exports={route};

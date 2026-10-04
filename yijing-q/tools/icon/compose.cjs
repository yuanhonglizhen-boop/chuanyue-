const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage();const dir=process.env.S+'/icon/';
const m='data:image/png;base64,'+fs.readFileSync(dir+'m-close.png').toString('base64');
const out=await p.evaluate(async(m)=>{
  const img=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=m;});
  // 找出爻爻的实际边界，按安全区缩放居中
  const t=document.createElement('canvas');t.width=t.height=1024;const tg=t.getContext('2d');tg.drawImage(img,0,0);const d=tg.getImageData(0,0,1024,1024).data;
  let x0=1024,y0=1024,x1=0,y1=0;for(let y=0;y<1024;y++)for(let x=0;x<1024;x++)if(d[(y*1024+x)*4+3]>24){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  const bw=x1-x0,bh=y1-y0;
  function make(v){const c=document.createElement('canvas');c.width=c.height=1024;const g=c.getContext('2d');
    const P=v.p;
    // 背景
    const bg=g.createRadialGradient(512,430,60,512,520,760);P.bg.forEach(([o,col])=>bg.addColorStop(o,col));g.fillStyle=bg;g.fillRect(0,0,1024,1024);
    // 光晕
    const cy=v.cy;const halo=g.createRadialGradient(512,cy,40,512,cy,v.haloR);halo.addColorStop(0,P.halo);halo.addColorStop(1,P.halo.replace(/[\d.]+\)$/,'0)'));g.fillStyle=halo;g.beginPath();g.arc(512,cy,v.haloR,0,7);g.fill();
    // 八卦圈（可选）：八组卦画沿圆周排列，自下而上读，后天方位只做纹样
    if(v.ring){const R=v.ring,TR=[[1,0,1],[0,0,0],[1,1,0],[1,1,1],[0,1,0],[0,0,1],[1,0,0],[0,1,1]];g.save();g.translate(512,cy);g.fillStyle=P.ring;
      for(let k=0;k<8;k++){g.save();g.rotate(k*Math.PI/4);g.translate(0,-R);for(let i=0;i<3;i++){const yy=-i*22;const L=v.ringW;if(TR[k][i])g.fillRect(-L/2,yy,L,12);else{g.fillRect(-L/2,yy,L*.42,12);g.fillRect(L*.08,yy,L*.42,12);}}g.restore();}g.restore();}
    // 落地影子
    g.save();g.scale(1,.26);const sh=g.createRadialGradient(512,v.footY/.26,10,512,v.footY/.26,v.shW);sh.addColorStop(0,P.shadow);sh.addColorStop(1,P.shadow.replace(/[\d.]+\)$/,'0)'));g.fillStyle=sh;g.beginPath();g.arc(512,v.footY/.26,v.shW,0,7);g.fill();g.restore();
    // 爻爻：高度占画面 v.size，水平居中
    const s=v.size*1024/bh,w=bw*s,h=bh*s,x=512-w/2,y=v.top;g.drawImage(img,x0,y0,bw,bh,x,y,w,h);
    return c.toDataURL('image/png');}
  const cream={bg:[[0,'#fffdf6'],[.55,'#fbf1de'],[1,'#efd9b8']],halo:'rgba(255,255,255,0.95)',shadow:'rgba(36,65,60,0.32)',ring:'rgba(63,174,138,0.20)'};
  const mint={bg:[[0,'#f2fff8'],[.6,'#cdeedf'],[1,'#9dd7bf']],halo:'rgba(255,255,255,0.9)',shadow:'rgba(36,65,60,0.30)',ring:'rgba(36,65,60,0.14)'};
  const base={size:.74,top:150,cy:560,haloR:400,footY:905,shW:230};
  return {A:make({...base,p:mint}),B:make({...base,p:cream}),F:make({...base,p:cream,size:.79,top:118,footY:912,shW:240,cy:540,haloR:420})};
},m);
for(const k in out)fs.writeFileSync(dir+'icon-'+k+'.png',Buffer.from(out[k].split(',')[1],'base64'));
await b.close();})();

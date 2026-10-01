import * as THREE from '../vendor/three.module.js';

// 程序生成贴图：漆木、青石地砖、回纹、绢本书法、格窗。全部离线，不依赖外部图片。
const cache=new Map();
function canvas(w,h,draw,{repeat=[1,1],srgb=true,key,text=false}={}){
  if(key&&cache.has(key))return cache.get(key);
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=8;if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.userData.text=text;
  if(key)cache.set(key,t);return t;
}
function rand(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
export const SERIF='"Songti SC","STSong","Noto Serif SC","Source Han Serif SC","SimSun","Kaiti SC","KaiTi",serif';

// 深色漆木（带木纹）
export function woodTex(base='#3a1f14',seed=1,key){return canvas(512,512,(g,w,h)=>{const r=rand(seed);g.fillStyle=base;g.fillRect(0,0,w,h);
  for(let i=0;i<220;i++){const y=r()*h,a=.03+r()*.06;g.strokeStyle=`rgba(${r()<.5?'0,0,0':'255,200,150'},${a})`;g.lineWidth=.5+r()*2;g.beginPath();g.moveTo(0,y);for(let x=0;x<=w;x+=32)g.lineTo(x,y+Math.sin(x*.02+i)*3*r());g.stroke();}
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,255,255,.05)');gr.addColorStop(1,'rgba(0,0,0,.15)');g.fillStyle=gr;g.fillRect(0,0,w,h);},{key:key||'wood'+base+seed});}
// 地板：深色长条木板
export function floorTex(){return canvas(1024,1024,(g,w,h)=>{const r=rand(7);const rows=8;
  for(let i=0;i<rows;i++){let x=-r()*200;while(x<w){const len=180+r()*260,c=40+r()*18;g.fillStyle=`rgb(${c+18},${c},${c-12})`;g.fillRect(x,i*h/rows,len,h/rows);
    for(let k=0;k<14;k++){g.strokeStyle=`rgba(0,0,0,${.05+r()*.08})`;g.lineWidth=1;const y=i*h/rows+r()*h/rows;g.beginPath();g.moveTo(x,y);g.lineTo(x+len,y+(r()-.5)*6);g.stroke();}
    g.fillStyle='rgba(0,0,0,.55)';g.fillRect(x+len-2,i*h/rows,3,h/rows);x+=len;}
    g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,i*h/rows,w,3);}},{repeat:[3,3],key:'floor'});}
// 青石方砖（中间嵌铜线）
export function stoneTex(){return canvas(512,512,(g,w,h)=>{const r=rand(11);g.fillStyle='#3d4446';g.fillRect(0,0,w,h);
  for(let i=0;i<4000;i++){g.fillStyle=`rgba(${r()<.5?0:255},${r()<.5?0:255},${r()<.5?0:255},.025)`;g.fillRect(r()*w,r()*h,2,2);}
  g.strokeStyle='#1d2224';g.lineWidth=6;g.strokeRect(0,0,w,h);g.strokeStyle='rgba(212,170,90,.55)';g.lineWidth=2;g.strokeRect(26,26,w-52,h-52);},{repeat:[4,4],key:'stone'});}
// 回纹边（金）
export function huiwenTex(color='#d7a94b',bg='#5a1712'){return canvas(256,64,(g,w,h)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle=color;g.lineWidth=5;g.lineCap='square';
  for(let x=0;x<w;x+=64){g.beginPath();g.moveTo(x+6,h-10);g.lineTo(x+6,10);g.lineTo(x+52,10);g.lineTo(x+52,h-22);g.lineTo(x+20,h-22);g.lineTo(x+20,24);g.lineTo(x+38,24);g.lineTo(x+38,h-36);g.stroke();g.beginPath();g.moveTo(x+52,h-10);g.lineTo(x+64,h-10);g.stroke();}
  g.strokeStyle=color;g.lineWidth=3;g.strokeRect(1,1,w-2,h-2);},{key:'hui'+color+bg});}
// 朱漆墙板（带金色描边与暗花）
export function panelTex(base='#6b1d16'){return canvas(512,512,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);const r=rand(3);
  for(let i=0;i<900;i++){g.fillStyle=`rgba(0,0,0,${r()*.06})`;g.fillRect(r()*w,r()*h,3,3);}
  g.strokeStyle='rgba(215,169,75,.85)';g.lineWidth=6;g.strokeRect(22,22,w-44,h-44);g.lineWidth=2;g.strokeRect(36,36,w-72,h-72);
  g.strokeStyle='rgba(215,169,75,.35)';g.lineWidth=2;for(const [cx,cy] of [[w/2,h/2]]){for(let k=0;k<4;k++){g.beginPath();g.ellipse(cx,cy,90-k*18,60-k*12,0,0,Math.PI*2);g.stroke();}}},{key:'panel'+base});}
// 藻井：金边方格
export function coffersTex(){return canvas(512,512,(g,w,h)=>{g.fillStyle='#14302f';g.fillRect(0,0,w,h);const n=4,s=w/n;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){const x=i*s,y=j*s;g.fillStyle='#1e4744';g.fillRect(x+8,y+8,s-16,s-16);g.strokeStyle='#c9993f';g.lineWidth=4;g.strokeRect(x+8,y+8,s-16,s-16);
    g.save();g.translate(x+s/2,y+s/2);g.strokeStyle='rgba(225,184,90,.9)';g.lineWidth=2;for(let k=0;k<8;k++){g.rotate(Math.PI/4);g.beginPath();g.ellipse(0,s*.17,s*.06,s*.15,0,0,Math.PI*2);g.stroke();}g.fillStyle='#d7a94b';g.beginPath();g.arc(0,0,s*.07,0,Math.PI*2);g.fill();g.restore();}
  g.strokeStyle='#8a1f17';g.lineWidth=8;for(let i=0;i<=n;i++){g.beginPath();g.moveTo(i*s,0);g.lineTo(i*s,h);g.stroke();g.beginPath();g.moveTo(0,i*s);g.lineTo(w,i*s);g.stroke();}},{repeat:[2,2],key:'coffer'});}
// 格窗（透光）
export function latticeTex(){return canvas(256,512,(g,w,h)=>{g.fillStyle='#f3dfb0';g.fillRect(0,0,w,h);g.strokeStyle='#3a1f14';g.lineWidth=10;g.strokeRect(5,5,w-10,h-10);g.lineWidth=6;
  for(let y=0;y<h;y+=48)for(let x=0;x<w;x+=48){g.beginPath();g.moveTo(x+24,y);g.lineTo(x+48,y+24);g.lineTo(x+24,y+48);g.lineTo(x,y+24);g.closePath();g.stroke();}},{key:'lattice'});}
// 绢本书法：竖排，自右向左（textureLines：每列一行字）
export function scrollTex(columns,{title,width=512,height=1024,paper='#efe1bd',ink='#20140e',seal=true}={}){return canvas(width,height,(g,w,h)=>{
  const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#e3cf9f');gr.addColorStop(.5,paper);gr.addColorStop(1,'#e3cf9f');g.fillStyle=gr;g.fillRect(0,0,w,h);
  const r=rand(columns.join('').length);for(let i=0;i<1500;i++){g.fillStyle=`rgba(120,80,30,${r()*.05})`;g.fillRect(r()*w,r()*h,2,2);}
  g.strokeStyle='rgba(120,60,20,.5)';g.lineWidth=3;g.strokeRect(18,18,w-36,h-36);
  const cols=columns.length,colW=(w-80)/Math.max(cols,1),fs=Math.min(colW*.78,(h-120)/Math.max(...columns.map(c=>c.length),1)*.95);
  g.fillStyle=ink;g.font=`${fs}px ${SERIF}`;g.textAlign='center';g.textBaseline='top';
  columns.forEach((col,i)=>{const x=w-40-colW*(i+.5);[...col].forEach((ch,k)=>{g.fillText(ch,x,60+k*fs*1.05);});});
  if(seal){g.fillStyle='#b3261e';g.fillRect(40,h-110,58,58);g.fillStyle='#f6e2c0';g.font=`bold 22px ${SERIF}`;g.textAlign='center';g.textBaseline='middle';g.fillText('藏易',69,h-81);}
},{key:'scroll'+columns.join('|')+width+height,text:true});}
// 匾额：金字黑底
export function plaqueTex(text,{w=1024,h=256,bg='#16110e',fg='#e2b65a',size=150}={}){return canvas(w,h,(g)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle=fg;g.lineWidth=10;g.strokeRect(12,12,w-24,h-24);g.lineWidth=3;g.strokeRect(30,30,w-60,h-60);
  g.fillStyle=fg;g.font=`bold ${size}px ${SERIF}`;g.textAlign='center';g.textBaseline='middle';g.shadowColor='rgba(255,210,120,.35)';g.shadowBlur=12;g.fillText(text,w/2,h/2+6);},{key:'plaque'+text+w+h+bg+fg,text:true});}
// 单字牌（卦名等）
export function glyphTex(text,{bg='#1a1410',fg='#e8c26a',size=150,ring=true}={}){return canvas(256,256,(g)=>{g.fillStyle=bg;g.fillRect(0,0,256,256);if(ring){g.strokeStyle=fg;g.lineWidth=8;g.strokeRect(10,10,236,236);}
  g.fillStyle=fg;g.font=`bold ${size}px ${SERIF}`;g.textAlign='center';g.textBaseline='middle';g.fillText(text,128,136);},{key:'glyph'+text+bg+fg+size,text:true});}
// 卦画牌：三条爻（自下而上），可带卦名
export function trigramTex(lines,{name='',bg='#1a1410',fg='#e8c26a'}={}){return canvas(256,320,(g,w,h)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle=fg;g.lineWidth=6;g.strokeRect(8,8,w-16,h-16);
  g.fillStyle=fg;lines.forEach((y,i)=>{const yy=180-i*54;if(y)g.fillRect(48,yy,160,26);else{g.fillRect(48,yy,68,26);g.fillRect(140,yy,68,26);}});
  if(name){g.font=`bold 64px ${SERIF}`;g.textAlign='center';g.textBaseline='middle';g.fillText(name,w/2,262);}},{key:'tri'+lines.join('')+name+bg+fg,text:true});}

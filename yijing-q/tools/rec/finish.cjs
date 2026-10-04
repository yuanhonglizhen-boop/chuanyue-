// 录制收尾：按 audio-events.json 用游戏自己的合成器离线渲染原声（OfflineAudioContext），再用 ffmpeg 合成 mp4。
// 用法：node tools/rec/finish.cjs   （OUT 与 record.cjs 相同）
const {spawn,execFileSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..','..'),out=process.env.OUT||path.join(root,'docs','video'),port=8527;
const NAME=process.env.NAME||'易境-爻爻-攻略';

(async()=>{
  const {videoT,log}=JSON.parse(fs.readFileSync(path.join(out,'audio-events.json'),'utf8'));
  const server=spawn(process.execPath,[path.join(root,'server.cjs')],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','inherit']});
  await new Promise((res,rej)=>{server.stdout.on('data',d=>{if(String(d).includes('http://'))res();});server.on('exit',c=>rej(Error('server exited '+c)));});
  const b=await chromium.launch();
  try{
    const p=await b.newPage();await p.goto(`http://127.0.0.1:${port}/style.css`);
    const b64=await p.evaluate(async({log,dur})=>{
      const {createAudio}=await import('/src/audio.js');
      const sr=48000,oc=new OfflineAudioContext(2,Math.ceil(sr*dur),sr);
      const A=createAudio({offlineCtx:oc});A._setClock(0);A.unlock();
      let t=0;const ev=[...log].sort((a,b)=>a.t-b.t);
      for(const e of ev){while(t+.04<e.t){t+=.04;A._setClock(t);A._tick();}A._setClock(e.t);A[e.n](...e.a);}
      while(t<dur){t+=.04;A._setClock(t);A._tick();}
      const buf=await oc.startRendering();
      // 末尾 1.5 秒淡出
      const L=buf.getChannelData(0),R=buf.getChannelData(1),n=L.length,fade=Math.floor(sr*1.5);
      for(let i=0;i<fade;i++){const k=i/fade;L[n-1-i]*=k;R[n-1-i]*=k;}
      // 16 位 WAV
      const ab=new ArrayBuffer(44+n*4),v=new DataView(ab);const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
      w(0,'RIFF');v.setUint32(4,36+n*4,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sr,true);v.setUint32(28,sr*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*4,true);
      let peak=0;for(let i=0;i<n;i++){peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));}const g=peak>.98?.98/peak:1;
      for(let i=0;i<n;i++){v.setInt16(44+i*4,Math.max(-1,Math.min(1,L[i]*g))*32767,true);v.setInt16(46+i*4,Math.max(-1,Math.min(1,R[i]*g))*32767,true);}
      const u=new Uint8Array(ab);let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s);
    },{log,dur:videoT+.5});
    fs.writeFileSync(path.join(out,'audio.wav'),Buffer.from(b64,'base64'));console.log('音轨：',(videoT).toFixed(1),'秒');
  }finally{await b.close();server.kill();}
  const mp4=path.join(out,NAME+'.mp4');
  execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-framerate','30','-i',path.join(out,'frames','f%05d.jpg'),'-i',path.join(out,'audio.wav'),
    '-c:v','libx264','-preset','slow','-crf','20','-pix_fmt','yuv420p','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','48000','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',mp4],{stdio:'inherit'});
  console.log('成片：',mp4,(fs.statSync(mp4).size/1e6).toFixed(1)+' MB');
})().catch(e=>{console.error(e);process.exit(1);});

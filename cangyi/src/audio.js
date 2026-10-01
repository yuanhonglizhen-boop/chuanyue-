// 藏易阁的声音：WebAudio 现场合成，没有音频文件。音乐用五声音阶，缓慢、空灵。
// 音乐与音效分开开关；混响只走音乐通道，关音乐就完全无声。
const PENTA=[0,2,4,7,9],MODE={gong:0,shang:1,jue:2,zhi:3,yu:4};
function freqOf(th,d,o=0){const m=MODE[th.mode],idx=m+d,oct=Math.floor(idx/5)+o,semi=PENTA[((idx%5)+5)%5]+12*oct-PENTA[m];return th.tonic*Math.pow(2,semi/12);}
const THEMES={
  // 门厅：宫调，主音 D3，慢
  hall:{mode:'gong',tonic:146.83,bpm:54,phrases:[[[2,1,4],[1,1,2],[0,1,2],[1,1,8]],[[3,1,4],[2,1,2],[3,1,2],[4,1,8]],[[2,1,2],[3,1,2],[4,1,4],[3,1,4],[2,1,4]],[[1,1,4],[0,1,12]]],roots:[0,3,4,0]},
  // 先天：羽调，主音 A2
  xian:{mode:'yu',tonic:110,bpm:50,phrases:[[[0,1,4],[2,1,4],[3,1,8]],[[4,1,4],[3,1,2],[2,1,2],[3,1,8]],[[0,2,4],[4,1,4],[3,1,4],[2,1,4]],[[1,1,4],[0,1,12]]],roots:[0,3,2,0]},
  // 后天：徵调，主音 G2
  hou:{mode:'zhi',tonic:98,bpm:56,phrases:[[[2,1,4],[3,1,4],[4,1,8]],[[3,1,4],[2,1,2],[1,1,2],[2,1,8]],[[4,1,4],[0,2,4],[4,1,4],[3,1,4]],[[2,1,4],[0,1,12]]],roots:[0,2,3,0]},
};
export function createAudio(){
  let ctx=null,master,sfxG,musG,reverb,meter,sfxMuted=false,musMuted=false,timer=null,theme=null,themeName=null,pending=null,next=0,step=0,events=[],len=0;
  function unlock(){try{if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.85;const comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;master.connect(comp).connect(ctx.destination);
      meter=ctx.createAnalyser();meter.fftSize=2048;master.connect(meter);
      sfxG=ctx.createGain();sfxG.gain.value=sfxMuted?0:.55;sfxG.connect(master);musG=ctx.createGain();musG.gain.value=musMuted?0:.5;musG.connect(master);
      const n=ctx.sampleRate*2.6,b=ctx.createBuffer(2,n,ctx.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.2);}
      reverb=ctx.createConvolver();reverb.buffer=b;const rg=ctx.createGain();rg.gain.value=.45;reverb.connect(rg).connect(musG);}
    ctx.resume();if(pending){const t=pending;pending=null;play(t);}}catch{}}
  function env(g,t,a,peak,decay){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.setTargetAtTime(0,t+a,decay);}
  // 琴：三角+正弦泛音，带轻微滑音（"吟猱"）
  function qin(out,f,t,vol=.16,dec=1.2,rev=true){const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),g2=ctx.createGain(),lp=ctx.createBiquadFilter();
    o.type='triangle';o.frequency.setValueAtTime(f*.985,t);o.frequency.linearRampToValueAtTime(f,t+.08);o.frequency.setValueAtTime(f,t+.5);o.frequency.linearRampToValueAtTime(f*1.008,t+.8);o.frequency.linearRampToValueAtTime(f,t+1.1);
    o2.type='sine';o2.frequency.value=f*2;g2.gain.value=.3;lp.type='lowpass';lp.frequency.setValueAtTime(f*7,t);lp.frequency.exponentialRampToValueAtTime(f*1.4,t+dec*2);
    o.connect(lp);o2.connect(g2).connect(lp);lp.connect(g);g.connect(out);if(rev&&out===musG)g.connect(reverb);env(g,t,.006,vol,dec*.35);o.start(t);o2.start(t);o.stop(t+dec*3);o2.stop(t+dec*3);}
  // 箫：正弦+气声，慢起
  function xiao(f,t,dur,vol=.06){const o=ctx.createOscillator(),g=ctx.createGain(),l=ctx.createOscillator(),lg=ctx.createGain();o.type='sine';o.frequency.value=f;l.frequency.value=4.6;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*.007,t+.5);l.connect(lg).connect(o.frequency);
    o.connect(g);g.connect(musG);g.connect(reverb);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.25);g.gain.setTargetAtTime(0,t+dur,.25);o.start(t);l.start(t);o.stop(t+dur+1.5);l.stop(t+dur+1.5);}
  function bell(out,f,t,vol=.1){for(const [m,v] of [[1,1],[2.76,.45],[5.4,.2]]){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=f*m;o.connect(g).connect(out);if(out===musG)g.connect(reverb);env(g,t,.003,vol*v,.6/m+.2);o.start(t);o.stop(t+3);}}
  function play(name){if(!ctx){pending=name;return;}if(name===themeName)return;stop();themeName=name;theme=THEMES[name];if(!theme)return;
    events=[];let pos=0;theme.phrases.forEach((ph,pi)=>{for(const [d,o,l] of ph){events.push({pos,d,o,l,pi});pos+=l;}});len=Math.ceil(pos/16)*16;step=0;next=ctx.currentTime+.2;
    musG.gain.cancelScheduledValues(ctx.currentTime);musG.gain.setValueAtTime(0,ctx.currentTime);musG.gain.linearRampToValueAtTime(musMuted?0:.5,ctx.currentTime+2);timer=setInterval(tick,50);}
  function stop(){if(timer)clearInterval(timer);timer=null;themeName=null;}
  function tick(){const spb=60/theme.bpm/2;while(next<ctx.currentTime+.3){const s=step%len,bar=Math.floor(s/16),r=theme.roots[bar%theme.roots.length];
      if(s%16===0){qin(musG,freqOf(theme,r,-1),next,.12,2.4);qin(musG,freqOf(theme,r+2,-1),next+spb*1.5,.07,2);}
      if(s%16===8)qin(musG,freqOf(theme,r+3,-1),next,.06,1.8);
      const ev=events.find(e=>e.pos===s);if(ev){if(ev.pi%2)xiao(freqOf(theme,ev.d,ev.o),next,ev.l*spb*.95,.05);else qin(musG,freqOf(theme,ev.d,ev.o),next,.11,1.4);}
      next+=spb;step++;}}
  function tone(f0,f1,dur,vol=.1,type='sine'){if(!ctx||sfxMuted)return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);env(g,t,.005,vol,dur*.4);o.connect(g).connect(sfxG);o.start(t);o.stop(t+dur*2);}
  const th={mode:'gong',tonic:293.66};
  function seq(notes,spb=.12,vol=.14){if(!ctx||sfxMuted)return;let t=ctx.currentTime+.02;for(const [d,o] of notes){qin(sfxG,freqOf(th,d,o),t,vol,1,false);t+=spb;}}
  return {unlock,play,stop,get theme(){return themeName;},
    get muted(){return sfxMuted;},setMuted(v){sfxMuted=v;if(sfxG)sfxG.gain.value=v?0:.55;},
    get musicMuted(){return musMuted;},setMusicMuted(v){musMuted=v;if(musG){musG.gain.cancelScheduledValues(ctx.currentTime);musG.gain.setValueAtTime(v?0:.5,ctx.currentTime);}},
    click(){tone(900,700,.05,.05,'triangle');},
    toggle(on){tone(on?520:390,on?700:300,.12,.07,'triangle');},
    wrong(){seq([[2,0],[1,0],[0,0]],.09,.09);},
    unlock_(){seq([[0,0],[2,0],[4,0],[0,1]],.12,.13);},
    solve(){if(!ctx||sfxMuted)return;seq([[0,0],[1,0],[2,0],[3,0],[4,0],[0,1],[2,1]],.13,.14);bell(sfxG,880,ctx.currentTime+.95,.09);},
    pickup(){if(!ctx||sfxMuted)return;bell(sfxG,1174,ctx.currentTime,.07);},
    door(){if(!ctx||sfxMuted)return;tone(120,70,1.2,.12,'sawtooth');},
    page(){tone(2400,1800,.08,.02,'triangle');},
    _level(){if(!meter)return 0;const d=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(d);let m=0;for(const v of d)m=Math.max(m,Math.abs(v));return m;},
  };
}

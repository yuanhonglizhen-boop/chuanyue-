// 合成音效：WebAudio 振荡器，无音频文件。需用户点击后解锁。
export function createAudio(){
  let ctx=null,muted=false,master=null;
  function unlock(){try{ctx??=new (window.AudioContext||window.webkitAudioContext)();master??=(()=>{const g=ctx.createGain();g.gain.value=.5;g.connect(ctx.destination);return g;})();ctx.resume();}catch{}}
  function tone(f0,f1,dur,{type='sine',vol=.12,delay=0}={}){if(muted||!ctx)return;try{const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g).connect(master);o.start(t);o.stop(t+dur+.02);}catch{}}
  function noise(dur,{vol=.15,freq=900}={}){if(muted||!ctx)return;try{const b=ctx.createBuffer(1,ctx.sampleRate*dur,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=b;f.type='lowpass';f.frequency.value=freq;g.gain.value=vol;s.connect(f).connect(g).connect(master);s.start();}catch{}}
  let lastHop=0;
  return {
    unlock,get muted(){return muted;},setMuted(v){muted=v;if(!v)unlock();},
    hop(){const n=performance.now();if(n-lastHop<120)return;lastHop=n;tone(520,780,.09,{vol:.04,type:'triangle'});},
    jump(n){tone(n===2?600:420,n===2?1300:900,.16,{vol:.08,type:'triangle'});},
    land(i){tone(220,120,.12,{vol:Math.min(.12,.03+i*.008),type:'sine'});},
    bounce(){tone(300,1200,.3,{vol:.1,type:'sine'});},
    toggle(on){tone(on?660:440,on?990:330,.18,{vol:.09,type:'triangle'});},
    gem(){[880,1175,1568].forEach((f,i)=>tone(f,f*1.01,.22,{vol:.07,delay:i*.07}));},
    pickup(){tone(330,660,.25,{vol:.07,type:'sawtooth'});},
    solve(){[523,659,784,1047].forEach((f,i)=>tone(f,f,.35,{vol:.08,delay:i*.11,type:'triangle'}));},
    gate(){[392,523,659].forEach((f,i)=>tone(f,f*1.5,.6,{vol:.06,delay:i*.15}));},
    portal(){tone(200,1600,.8,{vol:.08});},
    splash(){noise(.35,{vol:.2,freq:1400});},
    ui(){tone(700,760,.06,{vol:.04});},
  };
}

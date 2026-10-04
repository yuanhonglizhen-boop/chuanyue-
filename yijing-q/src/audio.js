// 声音：全部用 WebAudio 现场合成，没有音频文件。需用户点击后解锁。
// 音效（sfx）与音乐（music）各有独立音量与开关。
// 音乐用五声音阶：宫商角徵羽 = do re mi sol la。不同的境用不同调式（以哪个音为主音）。

const PENTA=[0,2,4,7,9];// 宫 商 角 徵 羽 相对宫的半音数
const MODE={gong:0,shang:1,jue:2,zhi:3,yu:4};

// 由调式算频率：degree 为调式内第几个音（0=主音），可跨八度
function freqOf(theme,degree,octave=0){
  const m=MODE[theme.mode],idx=m+degree,oct=Math.floor(idx/5)+octave,semi=PENTA[((idx%5)+5)%5]+12*oct-PENTA[m];
  return theme.tonic*Math.pow(2,semi/12);
}

// 曲谱：[音级, 八度, 时值(八分音符个数)]；音级为 null 表示休止
const THEMES={
  // 标题：宫调，主音 C4，平和
  title:{mode:'gong',tonic:261.63,bpm:80,swing:0,
    melody:[[2,0,4],[3,0,4],[4,0,4],[3,0,2],[2,0,2], [1,0,4],[2,0,2],[1,0,2],[0,0,8], [4,0,4],[0,1,2],[4,0,2],[3,0,4],[2,0,4], [3,0,2],[2,0,2],[1,0,4],[0,0,8]],
    roots:[0,3,1,0],drums:false},
  // 坎：羽调，主音 A3，清冷流动（《礼记·月令》孟冬"其音羽"，冬"盛德在水"）
  kan:{mode:'yu',tonic:220,bpm:76,swing:.08,
    melody:[[0,1,4],[2,1,2],[3,1,2],[4,1,4],[3,1,2],[2,1,2], [1,1,4],[2,1,2],[1,1,2],[0,1,8], [3,1,4],[4,1,2],[0,2,2],[4,1,4],[3,1,4], [2,1,2],[3,1,2],[2,1,2],[1,1,2],[0,1,8]],
    roots:[0,3,1,0],drums:'soft'},
  // 离：徵调，主音 G3，温暖明亮（孟夏"其音徵"，夏"盛德在火"）
  li:{mode:'zhi',tonic:196,bpm:92,swing:.05,
    melody:[[0,1,2],[1,1,2],[2,1,4],[3,1,2],[4,1,2],[3,1,4], [2,1,2],[1,1,2],[0,1,4],[1,1,4],[2,1,4], [4,1,4],[0,2,2],[4,1,2],[3,1,4],[2,1,4], [3,1,2],[2,1,2],[1,1,2],[2,1,2],[0,1,8]],
    roots:[0,2,3,0],drums:'wood'},
  // 既济：水火交替——一段羽调（水，主音 A），一段徵调（火，主音 G）
  jiji:{bpm:84,swing:.06,drums:'soft',sections:[
    {mode:'yu',tonic:220,roots:[0,3,1,0],melody:[[0,1,4],[2,1,2],[3,1,2],[4,1,4],[3,1,4], [2,1,2],[1,1,2],[0,1,4],[1,1,8], [3,1,2],[4,1,2],[0,2,4],[4,1,2],[3,1,2],[2,1,4], [1,1,2],[2,1,2],[0,1,12]]},
    {mode:'zhi',tonic:196,roots:[0,2,3,0],melody:[[2,1,2],[3,1,2],[4,1,4],[3,1,2],[2,1,2],[1,1,4], [0,1,2],[1,1,2],[2,1,4],[0,1,8], [4,1,4],[0,2,2],[1,2,2],[0,2,4],[4,1,4], [3,1,2],[2,1,2],[1,1,2],[2,1,2],[0,1,8]]},
  ]},
  // 终乱：商调，快、带鼓，紧张
  luan:{mode:'shang',tonic:293.66,bpm:124,swing:0,drums:'wood',
    melody:[[0,1,2],[0,1,2],[2,1,2],[1,1,2],[0,1,2],[4,0,2],[0,1,4], [2,1,2],[2,1,2],[4,1,2],[3,1,2],[2,1,4],[1,1,4], [0,1,2],[2,1,2],[4,1,2],[0,2,2],[4,1,2],[2,1,2],[3,1,4], [2,1,2],[1,1,2],[0,1,2],[4,0,2],[0,1,8]],
    roots:[0,3,0,4]},
  // 结局：宫调慢一些
  end:{mode:'gong',tonic:261.63,bpm:66,swing:0,
    melody:[[4,0,4],[3,0,4],[2,0,4],[3,0,4], [1,0,4],[2,0,4],[0,0,8], [2,0,4],[3,0,4],[4,0,4],[0,1,4], [4,0,4],[3,0,2],[2,0,2],[0,0,8]],
    roots:[0,4,1,0],drums:false},
};
export {THEMES};

export function createAudio({offlineCtx=null}={}){/* offlineCtx：离线渲染（录制视频的音轨），时间由 _setClock 指定 */
  let clock=null;const now=()=>clock??ctx.currentTime;
  let meter=null,ctx=null,master=null,sfxGain=null,musicGain=null,duck=null,sfxMuted=false,musicMuted=false,voice=1;
  function unlock(){try{if(!ctx){ctx=offlineCtx||new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.8;
      const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;master.connect(comp).connect(ctx.destination);meter=ctx.createAnalyser();meter.fftSize=2048;master.connect(meter);
      sfxGain=ctx.createGain();sfxGain.gain.value=sfxMuted?0:.6;sfxGain.connect(master);
      duck=ctx.createGain();duck.connect(master);musicGain=ctx.createGain();musicGain.gain.value=musicMuted?0:.42;musicGain.connect(duck);
      reverb=makeReverb();reverb.connect(musicGain);}/* 混响只走音乐通道：关音乐时混响也一起关掉 */
    if(!offlineCtx)ctx.resume();if(pending){const t=pending;pending=null;playTheme(t);}}catch{}}
  // 简单混响：带衰减的噪声卷积，给古筝和笛子一点空间感
  let reverb=null;function makeReverb(){const len=ctx.sampleRate*1.6,b=ctx.createBuffer(2,len,ctx.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);}const cv=ctx.createConvolver();cv.buffer=b;const g=ctx.createGain();g.gain.value=.28;cv.connect(g);const input=ctx.createGain();input.connect(cv);input._out=g;return Object.assign(input,{connect:(n)=>g.connect(n)});}

  // ---------- 乐器 ----------
  function env(g,t,a,peak,decay,sustain=0,release=.05,dur=0){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);if(dur){g.gain.setTargetAtTime(sustain,t+a,decay);g.gain.setTargetAtTime(0,t+dur,release);}else g.gain.setTargetAtTime(0,t+a,decay);}
  // 拨弦（似古筝）：三角波+正弦八度，起音略高再落到音准，低通随时间收
  function pluck(out,f,t,vol=.18,dur=1.4){const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),lp=ctx.createBiquadFilter();
    o.type='triangle';o2.type='sine';o.frequency.setValueAtTime(f*1.012,t);o.frequency.exponentialRampToValueAtTime(f,t+.06);o2.frequency.value=f*2;
    const g2=ctx.createGain();g2.gain.value=.35;lp.type='lowpass';lp.frequency.setValueAtTime(f*8,t);lp.frequency.exponentialRampToValueAtTime(f*1.5,t+dur);
    o.connect(lp);o2.connect(g2).connect(lp);lp.connect(g);g.connect(out);if(reverb&&out!==sfxGain)g.connect(reverb);
    env(g,t,.004,vol,dur*.28);o.start(t);o2.start(t);o.stop(t+dur*1.6);o2.stop(t+dur*1.6);}
  // 笛（似竹笛）：正弦+少量三角，起音后加颤音，再混一点气声
  function flute(out,f,t,dur,vol=.1){const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),lfo=ctx.createOscillator(),lg=ctx.createGain();
    o.type='sine';o2.type='triangle';o.frequency.value=f;o2.frequency.value=f;const g2=ctx.createGain();g2.gain.value=.18;
    lfo.frequency.value=5.2;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*.006,t+Math.min(.35,dur*.5));lfo.connect(lg);lg.connect(o.frequency);lg.connect(o2.frequency);
    o.connect(g);o2.connect(g2).connect(g);g.connect(out);if(reverb)g.connect(reverb);
    env(g,t,.07,vol,.1,vol*.8,.12,dur);
    const n=noiseSrc(dur+.2),bp=ctx.createBiquadFilter(),ng=ctx.createGain();bp.type='bandpass';bp.frequency.value=f*2;bp.Q.value=2;ng.gain.value=vol*.12;n.connect(bp).connect(ng).connect(g);
    o.start(t);o2.start(t);lfo.start(t);n.start(t);const end=t+dur+.6;o.stop(end);o2.stop(end);lfo.stop(end);n.stop(end);}
  // 垫音：两个略微失谐的正弦，慢起慢收
  function pad(out,f,t,dur,vol=.05){for(const d of [-4,4]){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;o.detune.value=d;o.connect(g).connect(out);env(g,t,dur*.3,vol,.4,vol*.8,dur*.25,dur*.75);o.start(t);o.stop(t+dur*1.3);}}
  function noiseSrc(dur){const b=ctx.createBuffer(1,Math.max(1,ctx.sampleRate*dur),ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=ctx.createBufferSource();s.buffer=b;return s;}
  // 木鱼
  function wood(out,t,vol=.12,pitch=1){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(900*pitch,t);o.frequency.exponentialRampToValueAtTime(620*pitch,t+.05);o.connect(g).connect(out);env(g,t,.002,vol,.03);o.start(t);o.stop(t+.2);}
  // 小鼓
  function drum(out,t,vol=.2){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(48,t+.18);o.connect(g).connect(out);env(g,t,.003,vol,.09);o.start(t);o.stop(t+.5);}
  // 铃
  function bell(out,f,t,vol=.08){for(const [m,v] of [[1,1],[2.76,.4],[5.4,.2]]){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=f*m;o.connect(g).connect(out);if(reverb&&out!==sfxGain)g.connect(reverb);env(g,t,.003,vol*v,.5/m+.15);o.start(t);o.stop(t+2.5);}}

  // ---------- 音乐调度 ----------
  let theme=null,themeName=null,pending=null,timer=null,nextTime=0,step=0,played=0,layer=1;
  function playTheme(name){
    if(!ctx){pending=name;return;}if(themeName===name)return;
    stopMusic();themeName=name;theme=THEMES[name];if(!theme)return;
    // 把曲谱展开成逐八分音符的事件表
    secIndex=0;useSection();
    step=0;nextTime=now()+.15;musicGain.gain.cancelScheduledValues(now());musicGain.gain.setValueAtTime(0,now());musicGain.gain.linearRampToValueAtTime(musicMuted?0:.42,now()+1.2);
    if(!offlineCtx)timer=setInterval(schedule,40);
  }
  // 多段主题：每段有自己的调式、主音、根音和旋律，一轮播完换下一段
  let secIndex=0;
  function useSection(){if(theme.sections){Object.assign(theme,theme.sections[secIndex%theme.sections.length]);}
    theme._events=[];let pos=0;for(const [d,o,len] of theme.melody){theme._events.push({pos,d,o,len});pos+=len;}theme._length=Math.ceil(pos/16)*16;}
  function stopMusic(){if(timer){clearInterval(timer);timer=null;}themeName=null;}
  function setLayer(n){layer=n;}// 1：垫音+拨弦；2：+笛子旋律；3：+打击
  function schedule(){
    if(!ctx||!theme)return;const spb=60/theme.bpm/2;// 每个八分音符的秒数
    while(nextTime<now()+.2){
      const s=step%theme._length,bar=Math.floor(s/16),inBar=s%16,t=nextTime+(s%2?theme.swing*spb:0);
      const root=theme.roots[bar%theme.roots.length];
      if(inBar===0)pad(musicGain,freqOf(theme,root,-1),t,spb*16,.045);
      // 拨弦琶音：根音、隔一个音、高八度……
      const arp=[[0,-1],[2,-1],[0,0],[1,0],[2,-1],[0,0],[1,0],[3,0]][inBar%8];
      if(inBar%2===0||layer>=2)pluck(musicGain,freqOf(theme,root+arp[0],arp[1]),t,inBar%2?.07:.11,1.2);
      if(layer>=2){const ev=theme._events.find(e=>e.pos===s);if(ev&&ev.d!==null)flute(musicGain,freqOf(theme,ev.d,ev.o),t,ev.len*spb*.92,.085);}
      if(layer>=3&&theme.drums){if(inBar%8===0)drum(musicGain,t,.16);if(theme.drums==='wood'&&inBar%4===2)wood(musicGain,t,.07);if(theme.drums==='soft'&&inBar%8===4)wood(musicGain,t,.05,.8);}
      nextTime+=spb;step++;played++;if(theme.sections&&step>=theme._length){step=0;secIndex++;useSection();}
    }
  }
  // 播放短乐句时，背景音乐暂时压低
  function duckFor(sec){if(!ctx)return;const t=now();duck.gain.cancelScheduledValues(t);duck.gain.setValueAtTime(duck.gain.value,t);duck.gain.linearRampToValueAtTime(.25,t+.05);duck.gain.setTargetAtTime(1,t+sec,.4);}
  function jingle(notes,{spb=.12,inst='pluck',vol=.16,base='gong',tonic=523.25}={}){if(!ctx||sfxMuted)return;const th={mode:base,tonic};let t=now()+.02;duckFor(notes.length*spb+.3);
    for(const [d,o,len=1] of notes){if(d!==null){if(inst==='bell')bell(sfxGain,freqOf(th,d,o),t,vol*.6);else pluck(sfxGain,freqOf(th,d,o),t,vol,1.2);}t+=spb*len;}}

  // ---------- 音效 ----------
  function tone(f0,f1,dur,{type='sine',vol=.12,delay=0}={}){if(sfxMuted||!ctx)return;try{const t=now()+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g).connect(sfxGain);o.start(t);o.stop(t+dur+.02);}catch{}}
  function noise(dur,{vol=.15,freq=900}={}){if(sfxMuted||!ctx)return;try{const s=noiseSrc(dur),f=ctx.createBiquadFilter(),g=ctx.createGain();f.type='lowpass';f.frequency.value=freq;g.gain.setValueAtTime(vol,now());g.gain.exponentialRampToValueAtTime(.001,now()+dur);s.connect(f).connect(g).connect(sfxGain);s.start();}catch{}}
  let lastHop=0;
  return {
    unlock,
    get muted(){return sfxMuted;},setMuted(v){sfxMuted=v;if(sfxGain)sfxGain.gain.value=v?0:.6;if(!v)unlock();},
    get musicMuted(){return musicMuted;},setMusicMuted(v){musicMuted=v;if(musicGain){musicGain.gain.cancelScheduledValues(now());musicGain.gain.setValueAtTime(v?0:.42,now());}if(!v)unlock();},
    setVoice(v){voice=v;},playTheme,stopMusic,setLayer,get theme(){return themeName;},get layer(){return layer;},
    hop(){const n=offlineCtx?now()*1000:performance.now();if(n-lastHop<120)return;lastHop=n;tone(520*voice,780*voice,.09,{vol:.04,type:'triangle'});},
    jump(n){tone((n===2?600:420)*voice,(n===2?1300:900)*voice,.16,{vol:.08,type:'triangle'});},
    land(i){tone(220*voice,120*voice,.12,{vol:Math.min(.12,.03+i*.008)});},
    bounce(){tone(300,1200,.3,{vol:.1});},
    toggle(on){tone(on?660:440,on?990:330,.18,{vol:.09,type:'triangle'});},
    // 得到爻玉：三音上行（宫调 mi sol la）
    gem(){jingle([[2,0],[3,0],[4,0,2]],{spb:.08,vol:.14,inst:'bell',tonic:1046.5});},
    pickup(){tone(330,660,.25,{vol:.07,type:'sawtooth'});},
    // 解开卦象：五声音阶一路上行到高八度
    solve(){jingle([[0,0],[1,0],[2,0],[3,0],[4,0],[0,1,3]],{spb:.11,vol:.16});},
    gate(){jingle([[0,0,1],[2,0,1],[4,0,2]],{spb:.16,inst:'bell',vol:.12,tonic:784});},
    portal(){tone(200,1600,.8,{vol:.08});},
    // 过关：一小段宫调乐句 + 鼓
    clear(){if(!ctx||sfxMuted)return;jingle([[0,0],[2,0],[3,0],[4,0,2],[3,0],[4,0],[0,1,4]],{spb:.14,vol:.17});drum(sfxGain,now()+.02,.2);drum(sfxGain,now()+.02+.14*8,.22);},
    fall(){jingle([[2,0],[1,0],[0,0,2]],{spb:.09,vol:.08,tonic:392});},
    splash(){noise(.35,{vol:.2,freq:1400});},
    ui(){tone(700,760,.06,{vol:.04});},
    _setClock(t){clock=t;},_tick(){schedule();},
    _level(){if(!meter)return 0;const d=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(d);let m=0;for(const v of d)m=Math.max(m,Math.abs(v));return m;},/* 总输出的峰值，用于验证静音 */
    _debug:()=>({ctx:!!ctx,themeName,layer,step:played,section:secIndex,musicGain:musicGain?musicGain.gain.value:null,musicMuted}),
  };
}

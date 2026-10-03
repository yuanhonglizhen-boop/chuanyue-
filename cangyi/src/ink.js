import * as THREE from '../vendor/three.module.js';

// 水墨后期：把三维画面转成"纸上的水墨"。
// 1) 正常渲染一遍颜色与深度；2) 全屏着色器（法线由深度推算，不另渲染）：深度/法线/明暗的边缘 → 墨线（带笔触抖动）；明暗 → 分层墨色；只保留朱砂红；叠宣纸纹理与晕染。
export function createInk(renderer){
  const size=new THREE.Vector2();
  const mk=()=>{const rt=new THREE.WebGLRenderTarget(2,2,{type:THREE.HalfFloatType});rt.depthTexture=new THREE.DepthTexture(2,2);rt.depthTexture.type=THREE.UnsignedIntType;return rt;};
  const colorRT=mk();
  const paper=paperTex();
  const quadCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1),quadScene=new THREE.Scene();
  const mat=new THREE.ShaderMaterial({uniforms:{tColor:{value:colorRT.texture},tDepth:{value:colorRT.depthTexture},tPaper:{value:paper},res:{value:new THREE.Vector2()},near:{value:.05},far:{value:120},time:{value:0},projInv:{value:new THREE.Matrix4()},camWorld:{value:new THREE.Matrix4()},
      paperCol:{value:new THREE.Color('#eee9dd')},inkCol:{value:new THREE.Color('#1b1a18')},redCol:{value:new THREE.Color('#a8322a')}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`
      uniform sampler2D tColor,tDepth,tPaper;uniform vec2 res;uniform float near,far,time;uniform mat4 projInv,camWorld;uniform vec3 paperCol,inkCol,redCol;varying vec2 vUv;
      vec3 vpos(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 v=projInv*vec4(uv*2.-1.,d*2.-1.,1.);return v.xyz/v.w;}
      float lin(vec2 uv){float d=texture2D(tDepth,uv).x;float z=d*2.-1.;return (2.*near*far)/(far+near-z*(far-near));}
      float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec2 px=1./res;
        // 笔触抖动：取样位置随纸纹轻轻偏移，墨线便有粗细与飞白
        vec2 wob=(vec2(noise(vUv*res*.035),noise(vUv*res*.035+7.3))-.5)*px*2.2;
        vec2 uv=vUv+wob;
        float dC=lin(uv);
        float e=0.,eN=0.,eL=0.;
        for(int i=0;i<4;i++){vec2 o=i==0?vec2(px.x,0):i==1?vec2(-px.x,0):i==2?vec2(0,px.y):vec2(0,-px.y);o*=1.4;
          float d=lin(uv+o);e+=abs(d-dC)/max(dC,.5);
          eL+=abs(lum(texture2D(tColor,uv+o).rgb)-lum(texture2D(tColor,uv).rgb));}
        float e2=0.;for(int i=0;i<4;i++){vec2 o=i==0?vec2(px.x,px.y):i==1?vec2(-px.x,px.y):i==2?vec2(px.x,-px.y):vec2(-px.x,-px.y);o*=2.6;e2+=abs(lin(uv+o)-dC)/max(dC,.5);}
        /* 折角：深度的二阶差分（不再单独渲染法线，省一遍绘制） */
        float dL=lin(uv-vec2(px.x,0)),dR=lin(uv+vec2(px.x,0)),dU=lin(uv+vec2(0,px.y)),dD=lin(uv-vec2(0,px.y));
        eN=(abs(dL+dR-2.*dC)+abs(dU+dD-2.*dC))/max(dC,.5)*40.;
        float edge=max(smoothstep(.06,.22,e),smoothstep(.12,.4,e2)*.8)+smoothstep(.35,.9,eN)*.85+smoothstep(.12,.4,eL)*.45;
        float fade=smoothstep(28.,6.,dC);// 远处墨线淡去
        edge=clamp(edge,0.,1.)*fade*(.75+.5*noise(vUv*res*.12));
        // 明暗 → 墨分五色（焦、浓、重、淡、清）：柔和分层
        vec3 c=texture2D(tColor,vUv).rgb;float L=clamp(lum(c)*1.25,0.,1.);
        float tone=mix(L,floor(L*5.)/5.+.1,.35);
        tone=pow(tone,.85);
        // 远景化为留白（雾气）
        float mist=smoothstep(9.,30.,dC);tone=mix(tone,1.,mist*.85);
        // 还原世界坐标：笔触"贴"在物体上，不随镜头游动
        float dr=texture2D(tDepth,vUv).x;vec4 vp=projInv*vec4(vUv*2.-1.,dr*2.-1.,1.);vp/=vp.w;vec3 wp=(camWorld*vp).xyz;
        vec3 p0=vpos(vUv),pxp=vpos(vUv+vec2(px.x,0)),pyp=vpos(vUv+vec2(0,px.y));vec3 nv=normalize(cross(pxp-p0,pyp-p0));vec3 nw=normalize(mat3(camWorld)*nv);
        float bg=step(.9999,dr);
        float vert=1.-abs(nw.y);// 1 = 墙、柱等竖直面
        // 竖直面：竖向皴擦（干笔飞白），自墙根往上由浓转淡
        vec2 sc=vec2((wp.x+wp.z)*3.2,wp.y*.55);
        float streak=noise(sc)*.6+noise(sc*vec2(2.3,1.7)+5.)*.4;
        float wash=smoothstep(2.4,.1,wp.y)*.18+smoothstep(.58,.9,streak)*.1;
        // 水平面：大片淡墨晕
        float pool=smoothstep(.55,.8,noise(wp.xz*.35+2.)*.7+noise(wp.xz*1.1)*.3)*.12;
        tone-=(vert*wash+(1.-vert)*pool)*(1.-bg)*(1.-mist);
        tone=clamp(tone,0.,1.);
        vec3 col=mix(inkCol,paperCol,tone);
        // 保留少量原色（灵龟的颜色、淡赭），其余已是灰调
        col+=(c-vec3(lum(c)))*.42*(1.-mist);
        // 只留朱砂红
        float red=smoothstep(.12,.32,c.r-max(c.g,c.b))*smoothstep(.15,.35,c.r);
        col=mix(col,redCol*(.7+.4*L),red*.8*(1.-mist));
        // 墨线
        col=mix(col,inkCol,edge*.92);
        // 宣纸纹理、晕染、暗角
        vec3 pp=texture2D(tPaper,vUv*vec2(res.x/res.y,1.)*1.6).rgb;
        col*=mix(vec3(1.),pp,.55);
        float blot=noise(vUv*4.+3.1)*noise(vUv*9.-1.7);col=mix(col,col*.86,smoothstep(.35,.6,blot)*.35);
        vec2 q=vUv-.5;col*=1.-dot(q,q)*.55;
        gl_FragColor=vec4(col,1.);
      }`});
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat));
  function setSize(w,h){const pr=renderer.getPixelRatio();colorRT.setSize(w*pr,h*pr);mat.uniforms.res.value.set(w*pr,h*pr);}
  function render(scene,camera,t=0){
    renderer.getDrawingBufferSize(size);if(size.x!==mat.uniforms.res.value.x||size.y!==mat.uniforms.res.value.y){colorRT.setSize(size.x,size.y);mat.uniforms.res.value.copy(size);}
    mat.uniforms.near.value=camera.near;mat.uniforms.far.value=camera.far;mat.uniforms.time.value=t;mat.uniforms.projInv.value.copy(camera.projectionMatrixInverse);mat.uniforms.camWorld.value.copy(camera.matrixWorld);
    const tm=renderer.toneMapping;
    renderer.setRenderTarget(colorRT);renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.toneMapping=THREE.NoToneMapping;renderer.render(quadScene,quadCam);renderer.toneMapping=tm;
  }
  return {render,setSize};
}

// 宣纸：米色底 + 纤维 + 细颗粒
function paperTex(){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,512,512);
  let s=7;const r=()=>{s=(s*16807)%2147483647;return s/2147483647;};
  for(let i=0;i<9000;i++){const v=200+r()*55|0;g.fillStyle=`rgba(${v},${v-6},${v-18},.25)`;g.fillRect(r()*512,r()*512,1.5,1.5);}
  g.lineWidth=.6;for(let i=0;i<500;i++){const x=r()*512,y=r()*512,a=r()*Math.PI*2,l=6+r()*28;g.strokeStyle=`rgba(150,130,100,${.08+r()*.12})`;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(a)*l*.5+r()*6,y+Math.sin(a)*l*.5+r()*6,x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}

// 水墨模式：把场景里的材质换成浅淡的纸色 / 灰调 / 淡赭（带字的贴图保留），切回时还原。
// 材质可在 userData.ink 里写明：{tone:0~1, tint:'grey'|'ochre'|'red'}；没写的按颜色推断。
const OCHRE=[1,.95,.87],GREY=[1.02,1,.94];
const hsl={h:0,s:0,l:0};
export function inkify(root,on){
  root.traverse(o=>{if(!o.isMesh||o.userData.noInk)return;const m=o.material;if(!m||m.isShaderMaterial)return;
    if(on){if(o.userData.origMat)return;o.userData.origMat=m;
      const keepText=m.map&&m.map.userData&&m.map.userData.text;
      const spec=m.userData.ink||guess(m);
      const k=spec.tint==='ochre'?OCHRE:GREY;const tone=keepText?1:spec.tone;
      const nm=new THREE.MeshLambertMaterial({color:new THREE.Color(Math.min(1,tone*k[0]),tone*k[1],tone*k[2]),map:keepText?m.map:null,transparent:m.transparent,opacity:m.opacity,side:m.side,visible:m.visible,depthWrite:m.depthWrite});
      if(spec.tint==='red'){nm.color.set('#b23a2c');nm.emissive=new THREE.Color('#7a1e17');nm.emissiveIntensity=.6;}
      else if(m.emissive&&m.emissiveIntensity>.3&&m.emissive.getHSL(hsl).l>.05){nm.emissive=new THREE.Color('#2a2622');nm.emissiveIntensity=.6;}
      o.material=nm;}
    else if(o.userData.origMat){o.material=o.userData.origMat;delete o.userData.origMat;}});
}
function guess(m){
  if(!m.color)return {tone:.8,tint:'grey'};
  m.color.getHSL(hsl,THREE.SRGBColorSpace);const {h,s,l}=hsl;
  const lit=m.emissive&&m.emissiveIntensity>.3&&m.emissive.getHSL({h:0,s:0,l:0}).l>.05;
  if(lit&&s>.4&&(h<.05||h>.95))return {tone:.6,tint:'red'};/* 灯笼等发光的红：留朱砂 */
  const tone=Math.min(.97,.45+l*.62);
  if(s>.25&&h>=.04&&h<=.17)return {tone,tint:'ochre'};/* 木、金、铜：淡赭 */
  return {tone,tint:'grey'};
}

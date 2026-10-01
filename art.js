import * as THREE from './vendor/three.module.js';

// Screen-space ink: the silhouette is derived from the live scene's depth and normals.
// Camera motion and every moving mechanism remain true 3D.
export function inkRenderer(renderer,scene,camera){
  const color=new THREE.WebGLRenderTarget(1,1,{samples:2});
  const normals=new THREE.WebGLRenderTarget(1,1);normals.depthTexture=new THREE.DepthTexture(1,1);normals.depthTexture.type=THREE.UnsignedIntType;
  const normalMaterial=new THREE.MeshNormalMaterial();
  const uniforms={image:{value:color.texture},normals:{value:normals.texture},depth:{value:normals.depthTexture},resolution:{value:new THREE.Vector2(1,1)},near:{value:camera.near},far:{value:camera.far}};
  const material=new THREE.ShaderMaterial({uniforms,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`precision highp float;
    varying vec2 vUv;uniform sampler2D image,normals,depth;uniform vec2 resolution;uniform float near,far;
    float viewDepth(vec2 uv){float z=texture2D(depth,uv).r;return (2.0*near*far)/(far+near-(2.0*z-1.0)*(far-near));}
    float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){vec3 c=texture2D(image,vUv).rgb;vec2 px=1.0/resolution;vec3 n=texture2D(normals,vUv).rgb;float d=viewDepth(vUv);float edge=0.;float ne=0.;
      for(int i=0;i<4;i++){vec2 o=i==0?vec2(px.x,0.):i==1?vec2(-px.x,0.):i==2?vec2(0.,px.y):vec2(0.,-px.y);float dd=viewDepth(vUv+o);edge=max(edge,abs(d-dd)/max(d,.01));ne=max(ne,length(n-texture2D(normals,vUv+o).rgb));}
      float contour=smoothstep(.006,.017,edge);float crease=smoothstep(.29,.62,ne)*.22;
      float ink=max(contour,crease);c=mix(c,c*vec3(.35,.43,.44),ink*.8);
      float grain=(hash(gl_FragCoord.xy)-.5)*.004;c+=grain;
      float vignette=smoothstep(.85,.2,distance(vUv,vec2(.5)));c*=.965+.035*vignette;
      gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }`});
  const post=new THREE.Scene(),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material),cam=new THREE.Camera();post.add(quad);let w=0,h=0;
  return()=>{const size=renderer.getDrawingBufferSize(new THREE.Vector2());if(w!==size.x||h!==size.y){w=size.x;h=size.y;color.setSize(w,h);normals.setSize(w,h);uniforms.resolution.value.set(w,h);}
    renderer.setRenderTarget(color);renderer.render(scene,camera);
    const old=scene.overrideMaterial,bg=scene.background;scene.overrideMaterial=normalMaterial;scene.background=new THREE.Color('#8080ff');renderer.setRenderTarget(normals);renderer.render(scene,camera);scene.overrideMaterial=old;scene.background=bg;
    renderer.setRenderTarget(null);renderer.render(post,cam);
  };
}

export function rockGeometry(sx,sy,sz,phase=0){const geo=new THREE.SphereGeometry(1,28,20),p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const a=Math.atan2(z,x);const ripple=1+.11*Math.sin(a*5+phase)+.045*Math.sin(y*18+a*3+phase);const taper=.8+.2*(1-y)/2;p.setXYZ(i,x*sx*ripple*taper+.14*sx*Math.sin(y*3+phase),y*sy,z*sz*ripple);}geo.computeVertexNormals();return geo;}

export function brushTexture(kind){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);let s=137;const r=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  for(let i=0;i<1700;i++){ctx.fillStyle=`rgba(36,54,58,${r()*.07})`;const x=r()*256,y=r()*256;ctx.fillRect(x,y,kind==='wood'?1:2+r()*8,kind==='wood'?10+r()*90:1+r()*3);}
  if(kind==='stone')for(let i=0;i<23;i++){ctx.strokeStyle='rgba(26,48,56,.11)';ctx.lineWidth=.6;ctx.beginPath();let x=r()*256,y=r()*256;ctx.moveTo(x,y);for(let j=0;j<4;j++){x+=8+r()*17;y+=(r()-.5)*20;ctx.lineTo(x,y);}ctx.stroke();}
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;return tex;
}

import * as THREE from '../vendor/three.module.js';

// 透视遮挡：挡在镜头和角色之间、或离镜头很近的东西，用网点（屏幕门）方式变半透明，透过去能看到角色。
// 只处理比角色脚面高的部分，所以地面不会被挖出窟窿。对已有 onBeforeCompile 的材质（焦散、海草、鱼……）是在它后面接着改。
export const occ={cam:{value:new THREE.Vector3()},tgt:{value:new THREE.Vector3()},on:{value:0}};
const DECL='varying vec3 vOccW;';
const FRAG=`if(occOn>.5&&vOccW.y>occTgt.y-.35){vec3 sg=occTgt-occCam;float L=length(sg);vec3 dr=sg/max(L,1e-3);vec3 rl=vOccW-occCam;float tt=dot(rl,dr);
  float f=0.;if(tt>0.&&tt<L-.7){float dl=length(rl-dr*tt);f=1.-smoothstep(.75,1.45,dl);}
  f=max(f,1.-smoothstep(1.1,2.3,length(rl)));
  if(f>0.){ivec2 q=ivec2(mod(gl_FragCoord.xy,4.));float bay[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);if(f*.85*16.>bay[q.x+q.y*4]+.5)discard;}}`;
export function patchOcclusion(m){
  if(!m||m.userData.occ||m.userData.noOcc||m.isShaderMaterial||m.isPointsMaterial||m.isSpriteMaterial||m.isLineBasicMaterial)return;
  m.userData.occ=true;const prev=m.onBeforeCompile,prevKey=m.hasOwnProperty('customProgramCacheKey')?m.customProgramCacheKey:null;
  m.onBeforeCompile=function(sh,r){prev.call(this,sh,r);sh.uniforms.occCam=occ.cam;sh.uniforms.occTgt=occ.tgt;sh.uniforms.occOn=occ.on;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\n'+DECL).replace('#include <project_vertex>','{vec4 ow=vec4(transformed,1.);\n#ifdef USE_INSTANCING\now=instanceMatrix*ow;\n#endif\nvOccW=(modelMatrix*ow).xyz;}\n#include <project_vertex>');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\n'+DECL+'uniform vec3 occCam;uniform vec3 occTgt;uniform float occOn;').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+FRAG);};
  m.customProgramCacheKey=function(){return (prevKey?prevKey.call(this):'')+'|occ';};
  m.needsUpdate=true;}
// 整个场景打补丁（角色自己除外）
export function patchScene(scene,except){const skip=new Set();except?.traverse(o=>{if(o.material)[].concat(o.material).forEach(x=>skip.add(x));});
  scene.traverse(o=>{if(!o.material||o.isSprite||o.isPoints)return;for(const m of [].concat(o.material))if(!skip.has(m))patchOcclusion(m);});}

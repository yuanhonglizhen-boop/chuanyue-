// 打包小红书小工具：产物目录 dist-minitool/，上传包 release/易境爻爻-小工具-<版本>.zip
// 规范见工作区 .claude/minitool-zip-builder（index.html 在 zip 根目录；脚本外置、经典脚本；JS 转译到 ES2017 / Chrome 61；
// CSS 有 Chrome 61 基线层；不联网；zip ≤ 10 MiB）。用法：node tools/build-minitool.cjs
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),esbuild=require('esbuild');
const root=path.join(__dirname,'..'),out=path.join(root,'dist-minitool'),mt=path.join(root,'minitool');
const VERSION=process.env.VERSION||'1.0.0';
(async()=>{
  fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
  // 1. 游戏代码：IIFE 经典脚本，转译到 ES2017 / Chrome 61
  const r=await esbuild.build({entryPoints:[path.join(root,'src','main.js')],bundle:true,write:false,format:'iife',minify:true,target:['es2017','chrome61'],legalComments:'eof',charset:'utf8'});
  for(const w of r.warnings)console.log('esbuild 警告：',w.text);
  fs.writeFileSync(path.join(out,'main.js'),r.outputFiles[0].text);
  // 2. 启动脚本与补丁
  for(const f of ['boot.js','polyfills.js','compat-pre.css','compat-post.css'])fs.copyFileSync(path.join(mt,f),path.join(out,f));
  // 3. 样式：安全区改用「容器注入变量 + env()」组合，兼顾 PC 模拟器与真机
  const css=fs.readFileSync(path.join(root,'style.css'),'utf8').replace(/env\(safe-area-inset-(top|bottom|left|right)\)/g,(_,s)=>`var(--safe-area-inset-${s},env(safe-area-inset-${s},0px))`);
  fs.writeFileSync(path.join(out,'style.css'),css);
  // 4. 入口页：相对路径、无内联脚本、无模块脚本、无外部资源
  let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const must=(a,b)=>{if(!html.includes(a))throw Error('index.html 里找不到：'+a);html=html.replace(a,b);};
  must('<!doctype html>','<!DOCTYPE html>');
  must('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">','<meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">');
  must('  <link rel="icon" href="data:,">\n','');
  must('<link rel="stylesheet" href="style.css">','<link rel="stylesheet" href="./compat-pre.css">\n  <link rel="stylesheet" href="./style.css">\n  <link rel="stylesheet" href="./compat-post.css">');
  must('<script type="module" src="src/main.js"></script>','<script src="./polyfills.js"></script>\n  <script src="./boot.js"></script>');
  fs.writeFileSync(path.join(out,'index.html'),html);
  // 5. 静态自查：被禁写法不得出现在产物里
  const bad=[[/<script(?![^>]*\bsrc=)[^>]*>/i,'内联脚本'],[/type=["']module["']/i,'模块脚本'],[/\son[a-z]+=["']/i,'行内事件'],[/javascript:/i,'javascript: 链接'],[/https?:\/\//i,'外部链接'],[/<base\b/i,'<base>'],[/<iframe|<object/i,'iframe / object'],[/http-equiv=["']?Content-Security/i,'自建 CSP'],[/target=["']_blank/i,'新窗口'],[/\sdownload[\s=>]/i,'下载链接']];
  for(const [re,name] of bad)if(re.test(html))throw Error('index.html 含有 '+name);
  const js=['main.js','boot.js','polyfills.js'].map(f=>[f,fs.readFileSync(path.join(out,f),'utf8')]);
  const banned=['fetch(','XMLHttpRequest','eval(','new Function','WebAssembly','new Worker','SharedWorker','window.open','requestFullscreen','navigator.clipboard','geolocation','getBattery','WebSocket','EventSource','serviceWorker','sendBeacon','RTCPeerConnection','devicemotion','deviceorientation','getDisplayMedia','enumerateDevices','navigator.credentials','window.prompt','location.assign','import(',' import ','export '];
  const hits=[];for(const [f,t] of js)for(const b of banned)if(t.includes(b))hits.push(f+' → '+b);
  if(hits.length)throw Error('产物里有被禁能力：\n'+hits.join('\n'));
  const allowed=new Set(['.html','.css','.js','.png','.jpg','.jpeg','.gif','.webp','.svg','.woff','.woff2','.json']);
  for(const f of fs.readdirSync(out))if(!allowed.has(path.extname(f).toLowerCase()))throw Error('不支持的文件类型：'+f);
  // 6. 打包：进入目录压缩“内容”，index.html 直接在 zip 根
  const rel=path.join(root,'release');fs.mkdirSync(rel,{recursive:true});const zip=path.join(rel,`易境爻爻-小工具-${VERSION}.zip`);fs.rmSync(zip,{force:true});
  execFileSync('zip',['-q','-r','-X',zip,'.','-x','*.DS_Store'],{cwd:out});
  const list=execFileSync('unzip',['-Z1',zip]).toString().trim().split('\n');
  if(!list.includes('index.html'))throw Error('zip 根目录没有 index.html');
  console.log('产物目录：',out);for(const f of fs.readdirSync(out))console.log('  ',f.padEnd(16),(fs.statSync(path.join(out,f)).size/1024).toFixed(1)+' KiB');
  console.log('上传包：',zip,(fs.statSync(zip).size/1024).toFixed(1)+' KiB','；zip 内文件：',list.join(', '));
})().catch(e=>{console.error('打包失败：',e.message);process.exit(1);});

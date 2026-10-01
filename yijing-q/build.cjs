// Bundles the game into one offline HTML file: dist/易境-爻爻.html
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
(async()=>{
  const out=path.join(__dirname,'dist');
  const result=await esbuild.build({entryPoints:[path.join(__dirname,'src','main.js')],bundle:true,write:false,format:'iife',minify:true,target:['chrome100','safari15'],legalComments:'inline'});
  const js=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8')
    .replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,n)=>'<style>'+fs.readFileSync(path.join(__dirname,n),'utf8')+'</style>')
    .replace('<script type="module" src="src/main.js"></script>',()=>'<script>'+js+'</script>');
  fs.mkdirSync(out,{recursive:true});const file=path.join(out,'易境-爻爻.html');fs.writeFileSync(file,html);
  console.log('Built '+file+' ('+Buffer.byteLength(html)+' bytes)');
})().catch(e=>{console.error(e);process.exit(1);});

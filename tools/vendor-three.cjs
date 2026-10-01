// Copy the pinned Three.js release (devDependency "three") into vendor/.
// three.module.js imports ./three.core.js, so both files must come from the same release.
const fs=require('node:fs'),path=require('node:path');
const pkgDir=path.join(__dirname,'..','node_modules','three'),{version}=JSON.parse(fs.readFileSync(path.join(pkgDir,'package.json'),'utf8')),vendor=path.join(__dirname,'..','vendor');
fs.mkdirSync(vendor,{recursive:true});
for(const [from,to] of [['build/three.module.js','three.module.js'],['build/three.core.js','three.core.js'],['LICENSE','LICENSE']])fs.copyFileSync(path.join(pkgDir,from),path.join(vendor,to));
fs.writeFileSync(path.join(vendor,'VERSION'),'three '+version+'\n');
console.log('vendor/: three '+version+' (three.module.js, three.core.js, LICENSE)');

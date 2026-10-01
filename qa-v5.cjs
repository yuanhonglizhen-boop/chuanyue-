// Original regression assertions, unchanged; only candidate input/output paths differ.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const file=process.argv.includes('--travel')?'qa-travel.cjs':'qa.cjs';
let source=fs.readFileSync(path.join(__dirname,file),'utf8');
source=source.replaceAll("E:/video-outputs/yijing-rain-garden'","E:/video-outputs/yijing-rain-garden/controls-v5'");
if(!process.argv.includes('--offline'))process.argv.push('--offline');
vm.runInThisContext('(function(require){'+source+'\n})',{filename:file})(require);

// Run the original assertions, redirecting only candidate input/output locations.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const file=process.argv.includes('--travel')?'qa-travel.cjs':'qa.cjs';
let source=fs.readFileSync(path.join(__dirname,file),'utf8');
source=source.replaceAll("E:/video-outputs/yijing-rain-garden'","E:/video-outputs/yijing-rain-garden/art-v4'");
if(!process.argv.includes('--offline'))process.argv.push('--offline');
vm.runInThisContext('(function(require){'+source+'\n})',{filename:file})(require);

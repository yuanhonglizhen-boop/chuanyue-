const fs=require('node:fs'),vm=require('node:vm');
const name=process.argv.includes('--controls')?'qa-controls-v5.cjs':'qa.cjs';
let source=fs.readFileSync(__dirname+'/'+name,'utf8').replaceAll("E:/video-outputs/yijing-rain-garden/controls-v5'","E:/video-outputs/yijing-rain-garden/adventure-v6'").replaceAll("E:/video-outputs/yijing-rain-garden'","E:/video-outputs/yijing-rain-garden/adventure-v6'");
if(!process.argv.includes('--offline'))process.argv.push('--offline');
vm.runInThisContext('(function(require){'+source+'\n})',{filename:name})(require);

const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const name=process.argv.includes('--controls')?'qa-controls-v5.cjs':process.argv.includes('--inputs')?'qa-adventure-input.cjs':'qa-adventure.cjs';
const original=path.resolve(__dirname,'../source-adventure-v6',name),source=fs.readFileSync(original,'utf8').replaceAll('yijing-rain-garden/adventure-v6','yijing-rain-garden/gait-v7').replaceAll('yijing-rain-garden/controls-v5','yijing-rain-garden/gait-v7');
const testModule=new Module(original,module);testModule.filename=original;testModule.paths=Module._nodeModulePaths(path.dirname(original));testModule._compile(source,original);

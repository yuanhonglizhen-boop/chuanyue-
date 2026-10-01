// Runs the v7 browser regression suites against the local build in dist/ (npm run build first).
// The suites originally lived in ../source-adventure-v6 and were path-rewritten here; in this repo they
// are the same files, already pointed at dist/ through tools/browser.cjs.
const path=require('node:path');
const name=process.argv.includes('--controls')?'qa-controls-v5.cjs':process.argv.includes('--inputs')?'qa-adventure-input.cjs':'qa-adventure.cjs';
require(path.join(__dirname,name));

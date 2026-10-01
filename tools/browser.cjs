// Shared Playwright launcher for the QA scripts. Uses the playwright devDependency;
// set CHROME_PATH to use a specific Chrome/Chromium executable instead of Playwright's own.
const path=require('node:path'),{chromium}=require('playwright');
const dist=path.join(__dirname,'..','dist');
function launch(options={}){return chromium.launch({...options,headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});}
module.exports={chromium:{launch},dist};

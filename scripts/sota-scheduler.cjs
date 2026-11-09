const fs=require('node:fs');const path=require('node:path');const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),file=path.join(root,'data','production','sota-review-config.json');
const config=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
if(config.enabled===false)process.exit(0);
const interval=Number(config.intervalDays||3)*86400000,last=Number(config.lastRunAt||0);
if(Date.now()-last<interval)process.exit(0);
fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify({...config,lastRunAt:Date.now()},null,2));
const child=spawn(process.execPath,[path.join(__dirname,'sota-review.cjs')],{cwd:root,env:{...process.env,LABBOOK_SOTA_MODEL:config.model||'gpt-4.1-mini'},stdio:'ignore',detached:true});child.unref();

const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
function start(server,runtime,{spawnReview=spawn,period=60000}={}){
 let running=false;
 async function tick(){
  if(running)return;
  const file=path.join(runtime.dataRoot,runtime.environment,'sota-review-config.json');
  try{
   const config=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
   // Scheduled paid requests require explicit opt-in in Settings.
   if(config.enabled!==true)return;
   const days=Number(config.intervalDays??3);
   if(!Number.isFinite(days)||days<1||days>365)return;
   if(Date.now()-Number(config.lastRunAt||0)<days*86400000)return;
   if(Date.now()-Number(config.lastAttemptAt||0)<3600000)return;
   const write=value=>runtime.atomicWrite(file,JSON.stringify(value,null,2));
   write({...config,lastAttemptAt:Date.now()});running=true;
   const child=spawnReview(process.execPath,[path.join(__dirname,'sota-review.cjs'),...(runtime.environment==='test'?['--test']:[])],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1',LABBOOK_DATA_DIR:runtime.dataRoot,LABBOOK_SOTA_URL:`http://127.0.0.1:${server.address().port}`},stdio:'ignore'});
   const finish=code=>{running=false;if(code===0){try{const latest=JSON.parse(fs.readFileSync(file,'utf8'));write({...latest,lastRunAt:Date.now()})}catch(error){console.error('SOTA schedule:',error.message)}}};
   child.once('error',()=>finish(1));child.once('exit',finish);
  }catch(error){console.error('SOTA schedule:',error.message)}
 }
 const timer=setInterval(tick,period);timer.unref();tick();server.once('close',()=>clearInterval(timer));
 return {tick,stop:()=>clearInterval(timer)};
}
module.exports={start};

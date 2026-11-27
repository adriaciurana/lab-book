const {app,BrowserWindow}=require('electron');
const assert=require('node:assert/strict');

app.whenReady().then(async()=>{
 let win;
 try{
  const configured=process.env.LABBOOK_REMOTE_URL;
  assert.ok(configured,'Set LABBOOK_REMOTE_URL to the managed deployment or its local SSH tunnel.');
  const base=new URL(configured).origin;
  win=new BrowserWindow({show:false});
  await win.loadURL(base+'/papers');
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const health=await fetch('/api/health',{cache:'no-store'});
   const data=await fetch('/api/state',{cache:'no-store'});
   return {
    loginVisible:Boolean(document.querySelector('form input[autocomplete="username"]')),
    healthStatus:health.status,
    environment:(await health.json()).environment,
    dataStatus:data.status
   };
  })()`);
  assert.deepEqual(result,{loginVisible:true,healthStatus:200,environment:'production',dataStatus:401});
  console.log('PASS: managed production health, browser sign-in and unauthenticated workspace isolation');
 }catch(error){console.error(error);process.exitCode=1}
 finally{win?.destroy();app.exit(process.exitCode||0)}
});

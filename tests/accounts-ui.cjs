const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-accounts-ui-'));
process.env.LABBOOK_DATA_DIR=root;
app.setPath('userData',path.join(root,'browser'));
const {initializeAdmin}=require('../src/server/accounts.cjs');
initializeAdmin(root,'admin','initial admin password');
const server=require('../src/server/server.cjs');

app.whenReady().then(async()=>{
 let win;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  win=new BrowserWindow({show:false,webPreferences:{backgroundThrottling:false}});
  const base='http://127.0.0.1:'+server.address().port;
  await win.loadURL(base);
  async function submit(body){
   const loaded=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
   await win.webContents.executeJavaScript(`(()=>{
    const form=document.querySelector('form');
    for(const [key,value]of Object.entries(${JSON.stringify(body)}))form.elements[key].value=value;
    form.requestSubmit();
   })()`);
   await loaded;
  }
  await submit({username:'admin',password:'initial admin password'});
  await submit({current:'initial admin password',password:'permanent admin password'});
  await win.webContents.executeJavaScript(`(async()=>{
   const wait=async selector=>{
    for(let i=0;i<80;i++){
     const match=selector();if(match)return match;
     await new Promise(resolve=>setTimeout(resolve,25));
    }
    throw Error('Account interface did not appear');
   };
   const settings=await wait(()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Account settings'));
   settings.click();
   const ai=await wait(()=>document.querySelector('form:has(select[name=mode])'));
   ai.elements.mode.value='personal';ai.requestSubmit();
   const connect=await wait(()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Continue with ChatGPT'));
   if(connect.disabled)throw Error('Loopback connection is unexpectedly disabled');
   const member=document.querySelector('form:has(input[name=username])');
   member.elements.username.value='member-ui';member.elements.password.value='initial member password';
   member.requestSubmit();
   await wait(()=>[...document.querySelectorAll('[aria-label="Workspace members"] li')].find(row=>row.textContent.includes('member-ui')));
   const result=await fetch('/api/account/chatgpt',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   const payload=await result.json();
   if(!result.ok||new URL(payload.url).hostname!=='auth.openai.com')throw Error('ChatGPT login did not start');
  })()`);
  console.log('PASS: browser sign-in, mandatory rotation, AI policy, adding a member and preparing official ChatGPT authorization');
 }catch(error){console.error(error);process.exitCode=1}
 finally{win?.destroy();await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true});app.exit(process.exitCode||0)}
});

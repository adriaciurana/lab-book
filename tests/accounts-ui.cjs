const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-accounts-ui-'));
process.env.LABBOOK_DATA_DIR=root;
app.setPath('userData',path.join(root,'browser'));
const {initializeAdmin}=require('../src/server/accounts.cjs');
initializeAdmin(root,'admin','initial admin password');
const server=require('../src/server/server.cjs');
const runtime=require('../src/server/runtime.cjs');
runtime.atomicWrite(runtime.stateFile,JSON.stringify({
 folders:[{id:'inbox',name:'Inbox'}],
 notes:[{id:'page',title:'Shared research',folder:'inbox',visibility:'private',content:'<p>Original result</p>'}]
}));

app.whenReady().then(async()=>{
 let win,memberWin;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  win=new BrowserWindow({show:false,webPreferences:{backgroundThrottling:false}});
  const base='http://127.0.0.1:'+server.address().port;
  await win.loadURL(base);
  async function submit(window,body){
   const loaded=new Promise(resolve=>window.webContents.once('did-finish-load',resolve));
   await window.webContents.executeJavaScript(`(()=>{
    const form=document.querySelector('form');
    for(const [key,value]of Object.entries(${JSON.stringify(body)}))form.elements[key].value=value;
    form.requestSubmit();
   })()`);
   await loaded;
  }
  await submit(win,{username:'admin',password:'initial admin password'});
  await submit(win,{current:'initial admin password',password:'permanent admin password'});
  await win.webContents.executeJavaScript(`(async()=>{
   const wait=async selector=>{
    for(let i=0;i<80;i++){
     const match=selector();if(match)return match;
     await new Promise(resolve=>setTimeout(resolve,25));
    }
    throw Error('Account interface did not appear');
   };
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
  memberWin=new BrowserWindow({show:false,webPreferences:{partition:'collaboration-member',backgroundThrottling:false}});
  await memberWin.loadURL(base);
  await submit(memberWin,{username:'member-ui',password:'initial member password'});
  await submit(memberWin,{current:'initial member password',password:'permanent member password'});
  const page=base+'/notes/page';
  await win.loadURL(page);
  await memberWin.loadURL(page);
  await memberWin.webContents.executeJavaScript(`if(document.querySelector('.editor[data-note-id="page"]'))throw Error('Private page was exposed')`);
  async function grant(role){
   const loaded=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
   await win.webContents.executeJavaScript(`(async()=>{
    for(let i=0;i<100&&!document.querySelector('[data-account-share]');i++)await new Promise(resolve=>setTimeout(resolve,25));
    document.querySelector('[data-account-share]').click();
    for(let i=0;i<100&&!document.querySelector('[data-recipients] select');i++)await new Promise(resolve=>setTimeout(resolve,25));
    const recipient=document.querySelector('[data-recipients] select');
    const form=recipient.form;
    form.elements.visibility.value='shared';
    form.elements.visibility.dispatchEvent(new Event('change'));
    recipient.value=${JSON.stringify(role)};
    form.requestSubmit();
   })()`);
   await loaded;
   await memberWin.loadURL(page);
  }
  await grant('view');
  await memberWin.webContents.executeJavaScript(`(async()=>{
   const edit=document.querySelector('#editPublishedNote');
   if(!edit)throw Error('Shared page did not open');
   for(let i=0;i<100&&!edit.disabled;i++)await new Promise(resolve=>setTimeout(resolve,25));
   if(!edit.disabled)throw Error('A viewer can edit');
   if(document.querySelector('[data-account-share]'))throw Error('A viewer can grant access');
  })()`);
  await grant('edit');
  await memberWin.webContents.executeJavaScript(`(async()=>{
   const edit=document.querySelector('#editPublishedNote');
   if(!edit||edit.disabled)throw Error('An editor cannot edit');
   edit.click();
   document.querySelector('.editor-body').innerHTML='<p>Updated result</p>';
   document.querySelector('#saveNote').click();
   for(let i=0;i<100;i++){
    const snapshot=await(await fetch('/api/state')).json();
    if(snapshot.notes.find(note=>note.id==='page')?.content.includes('Updated result'))return;
    await new Promise(resolve=>setTimeout(resolve,25));
   }
   throw Error('The edit never reached the server');
  })()`);
  await win.loadURL(page);
  await win.webContents.executeJavaScript(`if(document.querySelector('.editor-body').textContent!=='Updated result')throw Error('The administrator did not see the member edit')`);
  console.log('PASS: sign-in, AI policy, member creation, private pages, sharing as viewer or editor, and synchronization across two browser sessions');
 }catch(error){console.error(error);process.exitCode=1}
 finally{memberWin?.destroy();win?.destroy();await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true});app.exit(process.exitCode||0)}
});

const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-save-navigation-'));
process.env.LABBOOK_DATA_DIR=directory;
const initial={folders:[{id:'inbox',name:'Inbox'}],notes:[{id:'test-note',title:'Navigation test',folder:'inbox',content:'<p>Original text</p>',versions:[]}],papers:[],boards:[],tasks:[]};
fs.mkdirSync(path.join(directory,'production'),{recursive:true});
fs.writeFileSync(path.join(directory,'production','state.json'),JSON.stringify(initial));
const server=require('../src/server/server.cjs');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false});
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  await win.loadURL(`http://127.0.0.1:${server.address().port}/notes/test-note?edit=1`);
  await win.webContents.executeJavaScript(`(async()=>{
   const assert=(v,m)=>{if(!v)throw Error(m)};
   const nativeSend=XMLHttpRequest.prototype.send;
   const draft=document.querySelector('.editor-body');
   XMLHttpRequest.prototype.send=function(){throw Error('Simulated network loss')};
   draft.innerHTML='<p>Recoverable edit</p>';
   assert(!persistDraft(),'Offline draft reported as saved');
   assert(!document.querySelector('#retryDraftSave').hidden,'Retry was not offered');
   assert(draft.textContent.includes('Recoverable edit'),'Failed save cleared the editor');
   XMLHttpRequest.prototype.send=nativeSend;
   document.querySelector('#retryDraftSave').click();
   assert(document.querySelector('#retryDraftSave').hidden,'Retry did not save the draft');
   const body=document.querySelector('.editor-body');body.innerHTML='<p>First edit</p>';assert(persistDraft(),'First save failed');
   await new Promise(r=>setTimeout(r,150));body.innerHTML='<p>Second edit</p>';assert(persistDraft(),'Second save conflicted with first');
   await new Promise(r=>setTimeout(r,150));const response=await fetch('/api/state'),remote=await response.json();remote.notes.push({id:'external-note',title:'Other tab',folder:'inbox',content:'<p>External</p>'});
   const update=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':response.headers.get('X-Labbook-Revision')},body:JSON.stringify(remote)});assert(update.ok,'External update failed');
   body.innerHTML='<p>Third edit</p>';assert(persistDraft(),'Non-overlapping external edit blocked save');
   document.querySelector('[data-view="papers"]').click();assert(document.querySelector('.paper-bank'),'Navigation blocked');
   const stored=await(await fetch('/api/state')).json();assert(stored.notes.find(n=>n.id==='test-note').content.includes('Third edit'),'Draft lost');assert(stored.notes.some(n=>n.id==='external-note'),'Other tab note lost');
  })()`);
  console.log('PASS: repeated autosave, independent concurrent changes, navigation and persisted drafts');server.close();app.exit(0);
 }catch(error){console.error(error);server.close();app.exit(1)}
});

const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
process.env.LABBOOK_DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-published-'));
const dir=path.join(process.env.LABBOOK_DATA_DIR,'production');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'state.json'),JSON.stringify({folders:[{id:'inbox',name:'Inbox'}],papers:[],boards:[],tasks:[],notes:[{id:'page',title:'Draft title',folder:'inbox',draft:true,content:'<p>Unpublished text</p>',versions:[{title:'Published title',content:'<p>Published text</p>'}]}]}));
const server=require('../src/server/server.cjs');
app.whenReady().then(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const win=new BrowserWindow({show:false});
 await win.loadURL(`http://127.0.0.1:${server.address().port}/notes/page`);
 await win.webContents.executeJavaScript(`(async()=>{
 const assert=(v,m)=>{if(!v)throw Error(m)};
 assert(!document.querySelector('.editor .title'),'Opened in edit mode');
 assert(document.querySelector('.editor-body').textContent==='Published text','Draft exposed in published view');
 document.querySelector('#editPublishedNote').click();assert(document.querySelector('.editor-body').textContent==='Unpublished text','Draft unavailable in editor');
 document.querySelector('.editor-body').innerHTML='<p>Updated draft</p>';persistDraft();document.querySelector('#cancelEdit').click();
 assert(document.querySelector('.editor-body').textContent==='Published text','Close published a draft');
 document.querySelector('#editPublishedNote').click();document.querySelector('#saveNote').click();document.querySelector('#cancelEdit').click();
 assert(document.querySelector('.editor-body').textContent==='Updated draft','Publication missing');
 const stored=await(await fetch('/api/state')).json();assert(stored.notes[0].published.content.includes('Updated draft'),'Publication not persisted');
 })()`);
 await win.reload();await new Promise(r=>win.webContents.once('did-finish-load',r));
 await win.webContents.executeJavaScript(`if(document.querySelector('.editor .title')||!document.querySelector('.editor-body').textContent.includes('Updated draft'))throw Error('Published reload failed')`);
 console.log('PASS: read by default, explicit edit, draft isolation, publish and reload');server.close();app.exit(0);
 }catch(e){console.error(e);server.close();app.exit(1)}});

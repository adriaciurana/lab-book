const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
process.env.LABBOOK_DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-nested-pages-'));
const server=require('../src/server/server.cjs');
app.whenReady().then(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const win=new BrowserWindow({show:false,width:1200,height:950});
 await win.loadURL(`http://127.0.0.1:${server.address().port}/inbox?isolated=1`);
 const ids=await win.webContents.executeJavaScript(`(()=>{
 const assert=(v,m)=>{if(!v)throw Error(m)};
 state.folders.push({id:'nested-fixture',name:'Reading paths'});state.notes.push({id:'llm-fixture',title:'LLMs — reading path',folder:'nested-fixture',content:'<p>Existing literature</p>',published:{title:'LLMs — reading path',content:'<p>Existing literature</p>'},versions:[],draft:false});save();renderFolders();
 renderPublishedNote(state.notes.find(n=>n.id==='llm-fixture'));
 assert(document.querySelector('.note-reader'),'Page should open in read mode');
 const plus=document.querySelector('[data-tree-id="llm-fixture"] .workspace-add-child');assert(plus,'Every page needs a child control');plus.click();document.querySelector('[data-page-template="blank"]').click();document.querySelector('#workspacePageTitle').value='Attention variants';document.querySelector('#createWorkspacePage').click();
 const child=currentDraftNote();assert(child.parentNoteId==='llm-fixture','Child page not linked');const childId=child.id;
 assert(state.notes.find(n=>n.id==='llm-fixture').content.includes('Existing literature'),'Parent content changed');
 renderPublishedNote(child);document.querySelector('.page-relations .text-btn').click();document.querySelector('[data-page-template="experiment"]').click();document.querySelector('#workspacePageTitle').value='Sliding window experiment';document.querySelector('#createWorkspacePage').click();const grandId=currentDraftNote().id;assert(currentDraftNote().parentNoteId===childId,'Nested child failed');
 assert(!moveWorkspacePage('llm-fixture',grandId),'Cycle allowed');
 const folder=state.folders.find(f=>f.id==='nested-fixture'),landing=workspaceFolderPage(folder);assert(landing&&folder.pageId===landing.id,'Folder lacks document');assert(state.notes.find(n=>n.id==='llm-fixture').parentNoteId===landing.id,'Folder contents not retained');
 renderPublishedNote(landing);assert(document.querySelector('.page-relations a[href="/notes/llm-fixture"]'),'Folder document lacks child navigation');assert(document.querySelector('[data-tree-id="llm-fixture"]'),'Page disappeared from tree');assert(!document.querySelector('[data-tree-id="'+landing.id+'"]'),'Folder overview duplicated');
 state.folders.push({id:'second-fixture',name:'Other work'});save();assert(moveWorkspacePage(childId,null,'second-fixture'),'Cross-folder move failed');assert(state.notes.find(n=>n.id===grandId).folder==='second-fixture','Descendant folder not updated');renderPublishedNote(state.notes.find(n=>n.id===childId));const source=document.querySelector('[data-tree-id="'+childId+'"] .workspace-page-link'),target=document.querySelector('[data-tree-id="llm-fixture"]');const transfer=new DataTransfer();source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));assert(state.notes.find(n=>n.id===childId).parentNoteId==='llm-fixture','Drop on page did not reparent');renderPublishedNote(state.notes.find(n=>n.id==='llm-fixture'));
 assert(document.querySelector('.note-reader')&&!document.querySelector('#saveNote'),'Navigation opened editing');save();return {childId,grandId,landingId:landing.id};
 })()`);
 await win.reload();await new Promise(r=>setTimeout(r,500));
 const persisted=await win.webContents.executeJavaScript(`(()=>{const n=state.notes.find(n=>n.id===${JSON.stringify(ids.childId)});return {parent:n?.parentNoteId,folder:n?.folder,landing:state.folders.find(f=>f.id==='nested-fixture')?.pageId,grand:state.notes.find(n=>n.id===${JSON.stringify(ids.grandId)})?.parentNoteId}})()`);
 if(persisted.parent!=='llm-fixture'||persisted.folder!=='nested-fixture'||persisted.landing!==ids.landingId||persisted.grand!==ids.childId)throw Error('Hierarchy did not persist');
 console.log('PASS: child creation from sidebar/read mode, nesting, folder documents, cycle prevention, subtree moves and reload persistence');server.close();app.exit(0);
 }catch(e){console.error(e);server.close();app.exit(1)}});

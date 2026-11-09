const {app,BrowserWindow}=require('electron');
const assert=require('node:assert/strict');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,webPreferences:{partition:'workspace-pages-regression'}});
 try{
  await win.loadURL('http://localhost:4173/inbox?isolated=1');
  const ids=await win.webContents.executeJavaScript(`(async()=>{
   const assert=(value,message)=>{if(!value)throw Error(message)},tick=()=>new Promise(r=>setTimeout(r,80));
   document.querySelector('#addFolderBtn').click();
   assert(document.querySelector('#workspaceCreateMenu'),'workspace + lacks template menu');
   document.querySelector('[data-page-template="research"]').click();
   document.querySelector('#workspacePageTitle').value='Architecture research';
   document.querySelector('#createWorkspacePage').click();
   const id=activeNoteId,note=state.notes.find(n=>n.id===id),boardId=note.boardIds[0];
   assert(note.template==='research'&&note.content.includes('Research question'),'template is not a normal document');
   assert(state.notes.filter(n=>n.parentNoteId===id).length===3,'template child pages missing');
   assert(state.boards.some(b=>b.id===boardId),'linked board missing');
   assert(document.querySelectorAll('#pageRelations a[href^="/notes/"]').length===3,'child navigation missing');
   document.querySelector('[data-child-page]').click();
   document.querySelector('#workspacePageTitle').value='Additional child';document.querySelector('#createWorkspacePage').click();
   const child=activeNoteId;assert(state.notes.find(n=>n.id===child).parentNoteId===id,'child parent missing');
   assert(document.querySelector('.page-parent'),'child lacks parent link');
   openEditor(note);
   document.querySelector('[data-block="architecture"]').click();
   document.querySelector('#architectureMarkup').value='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 120"><a href="/notes/'+child+'"><rect width="200" height="100" fill="lime"/><text x="10" y="50">Open child</text></a><a href="https://example.org"><text x="220" y="50">External</text></a><a href="#details"><text x="420" y="50">Section</text></a></svg><section id="details">Details</section><script>window.parent.evil=true</'+ 'script><a href="javascript:alert(1)" onclick="evil()">Bad</a>';
   document.querySelector('#insertArchitecture').click();await tick();
   assert(document.querySelector('.architecture-frame'),'diagram not rendered');
   const stored=state.notes.find(n=>n.id===id).content;
   assert(stored.includes('data-architecture')&&!stored.includes('<iframe'),'preview internals leaked into saved content');
   document.querySelector('[data-view="papers"]').click();openEditor(note);await tick();
   assert(document.querySelector('.architecture-frame'),'autosave lost diagram on navigation');
   assert(!window.evil,'diagram scripts executed');
   document.querySelector('.architecture-block button').click();
   assert(document.querySelector('#architectureMarkup').value.includes('Open child'),'diagram edit lost source');
   document.querySelector('#insertArchitecture').click();await tick();
   return {id,child,boardId};
  })()`);
  // Inspect the rendered sandbox, not just serialized markup.
  await new Promise(r=>setTimeout(r,150));
  const frame=win.webContents.mainFrame.frames.find(f=>f.url==='about:srcdoc');
  assert.ok(frame,'diagram iframe not loaded');
  const links=await win.webContents.executeJavaScript(`(()=>{const f=document.querySelector('.architecture-frame'),d=f.contentDocument;if(!d||f.sandbox.contains('allow-scripts'))throw Error('unsafe diagram sandbox');return {links:[...d.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),target:a.getAttribute('target')})),scripts:d.scripts.length,handlers:d.querySelectorAll('[onclick]').length}})()`);
  assert.equal(links.scripts,0);assert.equal(links.handlers,0);
  assert.equal(links.links[0].target,'_top');assert.equal(new URL(links.links[0].href).pathname,'/notes/'+ids.child);assert.equal(new URL(links.links[0].href).search,'?isolated=1');
  assert.equal(links.links[1].href,'https://example.org/');
  assert.equal(links.links[2].target,'_self');assert.equal(links.links[3].href,null);
  await win.webContents.executeJavaScript(`document.querySelector('.architecture-frame').contentDocument.querySelectorAll('a')[2].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))`);
  await new Promise(r=>setTimeout(r,100));
  assert.equal(await win.webContents.executeJavaScript(`document.querySelector('.architecture-frame').contentDocument.querySelector('[data-diagram-target]')?.id`),'details');
  await win.webContents.executeJavaScript(`document.querySelector('.architecture-frame').contentDocument.querySelector('svg a').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))`);
  assert.equal(await win.webContents.executeJavaScript('activeNoteId'),ids.child,'SVG shape link did not open child note');
  await win.loadURL('http://localhost:4173/notes/'+ids.id+'?isolated=1');
  await win.webContents.executeJavaScript(`(async()=>{
   const assert=(value,message)=>{if(!value)throw Error(message)};
   assert(activeNoteId===${JSON.stringify(ids.id)},'page URL reload failed');
   assert(document.querySelector('.architecture-frame'),'reload lost diagram');
   assert(currentDraftNote().boardIds.includes(${JSON.stringify(ids.boardId)}),'reload lost board relation');
   assert(state.notes.filter(n=>n.parentNoteId===activeNoteId).length===4,'reload lost children');
   document.querySelector('#addFolderBtn').click();document.querySelector('[data-page-template="blank"]').click();
   document.querySelector('#createWorkspacePage').click();
   assert(!currentDraftNote().boardIds.length,'blank page created unwanted board');
   assert(!document.querySelector('.editor-body').textContent.trim(),'blank page contains template text');
   document.querySelector('#addFolderBtn').click();document.querySelector('[data-create-folder]').click();
   assert(document.querySelector('#folderModal.open'),'folder creation regressed');
  })()`);
  console.log('PASS: templates, ordinary documents, nested pages, linked board, sandboxed HTML/SVG links, diagram editing, autosave/navigation/reload, blank pages, folder dialog');app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});

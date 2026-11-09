const {app,BrowserWindow}=require('electron');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,webPreferences:{partition:'routes-regression'}});
 try{
  await win.loadURL('http://localhost:4173/papers?isolated=1');
  await win.webContents.executeJavaScript(`(async()=>{
   const assert=(v,m)=>{if(!v)throw Error(m)},tick=()=>new Promise(r=>setTimeout(r,80));
   assert(document.querySelector('.paper-bank'),'direct section URL failed');
   document.querySelector('[data-view="skills"]').click();assert(location.pathname==='/skills','skills URL unchanged');
   document.querySelector('[data-view="search"]').click();assert(location.pathname==='/research','research URL unchanged');
   document.querySelector('#newPageBtn').click();const id=activeNoteId;assert(location.pathname==='/notes/'+id,'note lacks deep link');
   insertEditorHTML('<p>Persisted through routes</p>');
   document.querySelector('[data-view="papers"]').click();assert(location.pathname==='/papers','bank URL unchanged');
   history.back();await tick();assert(location.pathname==='/notes/'+id&&document.querySelector('.editor-body').textContent.includes('Persisted through routes'),'back lost note');
   history.forward();await tick();assert(document.querySelector('.paper-bank'),'forward did not restore bank');
   state.papers.push({id:'route-paper',title:'Guide routing',tags:['PPO'],collections:['RL & alignment'],guide:{overview:'A concise explanation',sourceScope:'Test text',pageCount:1,methodSteps:['First step'],limitations:['Check the original']}});
   renderPaperBank();
   document.querySelector('a[href="/papers/route-paper"]').click();
   assert(location.pathname==='/papers/route-paper','paper deep link missing');
   assert(document.querySelector('.guide-section').textContent.includes('A concise explanation'),'guide not visible');
   document.querySelector('[data-view="papers"]').click();
   document.querySelector('#addPaper').click();document.querySelector('[data-unified-tab="new"]').click();
   assert(document.querySelector('#createReadingGuide'),'optional upload guide control missing');
   assert(!document.querySelector('#createReadingGuide').checked,'AI extraction should be optional');
   document.querySelector('[data-unified-close]').click();
   return id;
  })()`);
  await win.webContents.reload();await new Promise(r=>win.webContents.once('did-finish-load',r));
  const restored=await win.webContents.executeJavaScript("Boolean(document.querySelector('.paper-bank'))");
  if(!restored)throw Error('deep link reload failed');
  console.log('PASS: direct URLs, note routes and persistence, browser back/forward, paper guides, optional upload guide, deep-link reload');
  app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});

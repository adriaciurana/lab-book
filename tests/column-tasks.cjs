const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'labbook-column-tasks-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1450,height:1000});
 try{
  await win.loadURL('http://localhost:4175/inbox?isolated=1');
  await win.webContents.executeJavaScript(`(async()=>{
   const assert=(v,m)=>{if(!v)throw Error(m)},tick=()=>new Promise(r=>setTimeout(r,70));
   state={folders:[{id:'inbox',name:'Inbox'}],notes:[{id:'stream',title:'Video research stream',folder:'inbox',content:'<p>Stream home</p>'},{id:'methods',title:'Ablation protocol',folder:'inbox',parentNoteId:'stream',content:'<p>Methods</p>'}],papers:[],context:[],boards:[{id:'video',name:'Video research',columns:['Backlog','Running','Done'],noteId:'stream'},{id:'product',name:'Product',columns:['Todo','Working','Done']}],tasks:[],boardViews:[{id:'combined',name:'Everything',boardIds:['video','product'],columnMap:{video:{Backlog:'Queue',Running:'Active'},product:{Todo:'Queue',Working:'Active'}}}]};ResearchModel.ensure(state);currentView='board';activeBoard='video';render();
   assert(document.querySelectorAll('.column-add-task').length===3,'column creation buttons missing');
   document.querySelector('[data-column-add-task="Running"]').click();
   assert(document.querySelector('#hubTaskStatus').value==='Running','wrong initial status');assert(document.querySelector('#hubTaskPage').value==='stream','board research page not inherited');
   document.querySelector('[data-composer-close]').click();assert(state.tasks.length===0,'cancel created a placeholder task');
   document.querySelector('[data-column-add-task="Running"]').click();document.querySelector('#hubTaskTitle').value='Run temporal ablation';
   document.querySelector('.task-page-trigger').click();const search=document.querySelector('.task-page-search');search.value='protocol';search.dispatchEvent(new Event('input'));
   assert(document.querySelectorAll('#taskPageChoices [role="option"]').length===1,'page search failed');assert(document.querySelector('#taskPageChoices').textContent.includes('Video research stream'),'page ancestry missing');
   search.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert(document.querySelector('#hubTaskPage').value==='methods','keyboard page link failed');
   document.querySelector('#hubSave').click();let task=state.tasks[0];assert(task.col==='Running'&&task.board==='video'&&task.noteId==='methods','task not saved in target column / page');
   assert(document.querySelector('.task-note-link').textContent.includes('Ablation protocol'),'card page link missing');
   document.querySelector('.task-note-link').click();await tick();assert(location.pathname==='/notes/methods'&&document.querySelector('#content').textContent.includes('Ablation protocol'),'card link did not open page');assert(!document.querySelector('#hubTaskTitle'),'page link opened task modal');
   currentView='board-view';window.activeBoardView='combined';render();document.querySelector('[data-column-add-task="Active"]').click();
   assert(document.querySelector('#hubTaskDestination').options.length===2,'combined view needs destination choices');
   document.querySelector('#hubTaskTitle').value='Ship implementation';const destination=document.querySelector('#hubTaskDestination');destination.value='1';destination.dispatchEvent(new Event('change'));
   assert(document.querySelector('#hubTaskStatus').value==='Working','aggregate status not mapped to source');document.querySelector('#hubSave').click();task=state.tasks.find(t=>t.text==='Ship implementation');assert(task.board==='product'&&task.col==='Working','combined view created task in wrong board');
   assert(document.querySelector('[data-view-col="Active"] [data-task="'+task.id+'"]'),'aggregate card not visible');
   document.querySelector('[data-column-add-task="Done"]').click();document.querySelector('#hubTaskTitle').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!document.querySelector('#composerModal'),'Escape left stale form');assert(state.tasks.length===2,'Escape created a task');save();
  })()`);
  const loaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.webContents.reload();await loaded;
  const count=await win.webContents.executeJavaScript('state.tasks.length');if(count!==2)throw Error('Created tasks did not survive reload');
  console.log('PASS: per-column creation, native status mapping, inherited page, searchable nested page link, direct page navigation, combined board destination, cancel/Escape without ghost tasks, reload');app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});

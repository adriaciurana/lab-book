const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'labbook-demo-browser-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1500,height:1100,webPreferences:{partition:'demo-verification'}});
 try{
  await win.loadURL('http://localhost:4175/notes/demo-home');
  const summary=await win.webContents.executeJavaScript(`(async()=>{
   const assert=(v,m)=>{if(!v)throw Error(m)},tick=()=>new Promise(r=>setTimeout(r,100));
   assert(window.LABBOOK_ENV==='test','Not TEST');assert(document.querySelector('.editor-body').textContent.includes('MOCK DATA'),'Demo start page missing');
   assert(document.querySelector('.architecture-frame'),'Home architecture missing');
   await applyWorkspaceRoute();
   const root=state.notes.find(n=>n.id==='demo-video');openEditor(root);await tick();
   assert(document.querySelectorAll('#pageRelations a[href^="/notes/"]').length>=3,'Child links missing');
   assert(document.querySelector('.hub-results tbody tr'),'Live ablation results missing');assert(document.querySelectorAll('.hub-branch-card').length===6,'Branch map incomplete');
   const paper=state.papers.find(p=>p.id==='demo-paper-video');await openPaperSplit(paper);
   assert(document.querySelector('.reader-sheet canvas')?.width>0,'Mock PDF did not render');
   assert(document.querySelector('.reader-highlight'),'Seeded PDF highlight missing');
   assert(document.querySelector('.textLayer').textContent.includes('synthetic toy metric'),'PDF text selection layer missing');
   openEditor(state.notes.find(n=>n.id==='demo-blocks'));await tick();
   assert(document.querySelectorAll('.editor-body h1,.editor-body h2,.editor-body h3,.editor-body h4,.editor-body h5,.editor-body h6').length>=6,'Headings missing');
   assert(document.querySelector('.research-table [colspan="2"]'),'Merged cell missing');
   assert(document.querySelectorAll('.research-gallery img').length===3,'Gallery images missing');
   await Promise.all([...document.querySelectorAll('.research-gallery img')].map(img=>img.decode()));
   assert(document.querySelectorAll('[data-paper-embed]').length===2,'Multiple paper embeds missing');
   assert(document.querySelectorAll('.architecture-frame').length===2,'SVG/HTML diagrams missing');
   currentView='board-view';window.activeBoardView='demo-research-overview';render();
   assert(document.querySelectorAll('.task').length===27,'Combined research view has wrong tasks');
   currentView='experiments';render();assert(document.querySelectorAll('.hub-results tbody tr').length===18,'Experiment runs missing');
   currentView='repositories';render();assert(document.querySelectorAll('.hub-repo-section').length===3,'Repository examples missing');
   openEditor(state.notes.find(n=>n.id==='demo-draft'));assert(currentDraftNote().versions.length===2,'Manual versions missing');assert(!document.querySelector('#rollbackDraft').disabled,'Rollback disabled');
   currentView='search';render();await tick();const candidates=contextCandidates();
   assert(state.context.some(c=>c.type==='paragraph')&&state.context.some(c=>c.type==='paper')&&state.context.some(c=>c.type==='region'),'Mixed context examples missing');
   assert(candidates.some(c=>c.regionId==='demo-paper-video-highlight'),'Highlight unavailable as context');
   return {notes:state.notes.filter(n=>n.mock).length,tasks:state.tasks.filter(n=>n.mock).length,experiments:state.experiments.filter(n=>n.mock).length,papers:state.papers.filter(n=>n.mock).length};
  })()`);
  console.log('PASS: real TEST demo pages, live embeds, selectable local PDF, saved highlights, galleries, task views, experiments, branches, drafts and context',summary);app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});

const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const {startWorkspaceServer}=require('./support/workspace-server.cjs');
const source=path.resolve(__dirname,'../data/production');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,webPreferences:{partition:'library-validation'}});
 let workspace;
 const originalFetch=global.fetch;
 try{
  const state=JSON.parse(fs.readFileSync(path.join(source,'state.json'),'utf8'));
  const report=JSON.parse(fs.readFileSync(path.join(source,'research-import-report.json'),'utf8'));
  if(report.errors.length||report.papers.length!==40)throw Error('Curated import incomplete');
  for(const item of report.papers){
   const paper=state.papers.find(p=>p.fileId===item.fileId);
   if(!paper?.guide?.overview||!paper.guide.sourceScope)throw Error('Missing reading guide');
   const pdf=fs.readFileSync(path.join(source,'papers',item.fileId+'.pdf'));
   if(!pdf.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Invalid cached PDF');
  }
  workspace=await startWorkspaceServer({prepare(directory){
   const snapshot=path.join(directory,'production');
   fs.mkdirSync(snapshot);
   fs.copyFileSync(path.join(source,'state.json'),path.join(snapshot,'state.json'));
   fs.mkdirSync(path.join(snapshot,'guides'));
   const selected=state.papers.find(paper=>paper.arxiv==='2509.16117');
   fs.writeFileSync(path.join(snapshot,'guides',selected.fileId+'-es-v2.json'),JSON.stringify(selected.guide));
   fs.mkdirSync(path.join(snapshot,'papers'));
   fs.copyFileSync(path.join(source,'papers',selected.fileId+'.pdf'),path.join(snapshot,'papers',selected.fileId+'.pdf'));
  }});
  global.fetch=(input,options)=>{
   if(new URL(input).origin!==workspace.origin)throw Error('Unexpected network request in library smoke test');
   return originalFetch(input,options);
  };
  await win.loadURL(workspace.origin+'/papers?isolated=1');
  await win.webContents.executeJavaScript(`(async()=>{
   const assert=(v,m)=>{if(!v)throw Error(m)};
   state=await(await fetch('/api/state')).json();renderPaperBank();
   assert(document.querySelectorAll('.paper-list .paper-card').length>=41,'production library not visible');
   document.querySelector('[data-library-topic="Video generation"]').click();
   assert(document.querySelector('.paper-list').textContent.includes('Wan'),'video filter missing Wan');
   const id=state.papers.find(p=>p.arxiv==='2509.16117').id;
   document.querySelector('[data-library-topic="All"]').click();
   document.querySelector('a[href="/papers/'+id+'"]').click();
   assert(document.querySelector('.guide-section p')?.textContent===state.papers.find(p=>p.id===id).guide.overview,'NFT reading guide not present');
   assert(document.querySelectorAll('.guide-section').length>=9,'reading guide incomplete');
   const cached=await paperRequest('/api/papers/summary',{paper:state.papers.find(p=>p.id===id)});
   assert(cached.overview,'cached guide API failed');
   history.replaceState({},'','/papers/research-wan-2-2-official?isolated=1');await applyWorkspaceRoute();
   assert(document.querySelector('.guide-status').textContent.includes('not a separate research paper'),'Wan2.2 release scope missing');
   assert(document.querySelector('#generateGuide').hidden,'non-paper source should not offer PDF extraction');
  })()`);
  console.log('PASS: 40 verified local PDFs + guides, production library, topic filters, NFT guide, cached summary API, Wan2.2 source labeling');
 }catch(error){console.error(error);process.exitCode=1}
 finally{global.fetch=originalFetch;win.destroy();await workspace?.close();app.exit(process.exitCode||0)}
});

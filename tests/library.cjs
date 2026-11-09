const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,webPreferences:{partition:'library-validation'}});
 try{
  const state=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/production/state.json'),'utf8'));
  const report=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/production/research-import-report.json'),'utf8'));
  if(report.errors.length||report.papers.length!==40)throw Error('Curated import incomplete');
  for(const item of report.papers){
   const paper=state.papers.find(p=>p.fileId===item.fileId);
   if(!paper?.guide?.overview||!paper.guide.sourceScope)throw Error('Missing reading guide');
   const pdf=fs.readFileSync(path.join(__dirname,'../data/production/papers',item.fileId+'.pdf'));
   if(!pdf.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Invalid cached PDF');
  }
  await win.loadURL('http://localhost:4173/papers?isolated=1');
  await win.webContents.executeJavaScript(`(async()=>{
   const assert=(v,m)=>{if(!v)throw Error(m)};
   state=await(await fetch('/api/state')).json();renderPaperBank();
   assert(document.querySelectorAll('.paper-list .paper-card').length>=41,'production library not visible');
   document.querySelector('[data-library-topic="Video generation"]').click();
   assert(document.querySelector('.paper-list').textContent.includes('Wan'),'video filter missing Wan');
   const id=state.papers.find(p=>p.arxiv==='2509.16117').id;
   document.querySelector('[data-library-topic="All"]').click();
   document.querySelector('a[href="/papers/'+id+'"]').click();
   assert(document.querySelector('.paper-detail').textContent.includes('Negative'),'NFT reading guide not present');
   assert(document.querySelectorAll('.guide-section').length>=9,'reading guide incomplete');
   const cached=await paperRequest('/api/papers/summary',{paper:state.papers.find(p=>p.id===id)});
   assert(cached.overview,'cached guide API failed');
   history.replaceState({},'','/papers/research-wan-2-2-official?isolated=1');await applyWorkspaceRoute();
   assert(document.querySelector('.guide-status').textContent.includes('not a separate research paper'),'Wan2.2 release scope missing');
   assert(document.querySelector('#generateGuide').hidden,'non-paper source should not offer PDF extraction');
  })()`);
  console.log('PASS: 40 verified local PDFs + guides, production library, topic filters, NFT guide, cached summary API, Wan2.2 source labeling');
  app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});

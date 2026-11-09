const fs=require('node:fs'),path=require('node:path');
if(process.env.NODE_ENV==='test'||process.argv.includes('--test'))throw Error('This curated import is for production. Use the migration script afterward to copy it to test.');
const runtime=require('./runtime.cjs'),service=require('./paper-service.cjs'),catalog=require('./research-catalog.cjs');
const directory=path.join(runtime.dataRoot,'production'),file=path.join(directory,'state.json');
if(!fs.existsSync(file))throw Error('Open the production app once before importing.');
const backup=file+'.before-research-'+Date.now();fs.copyFileSync(file,backup);
const read=()=>JSON.parse(fs.readFileSync(file,'utf8'));
const report={startedAt:new Date().toISOString(),papers:[],errors:[]};
function commit(paper){const state=read();state.papers=state.papers||[];const old=state.papers.find(p=>p.id===paper.id);if(old)Object.assign(old,paper);else state.papers.push(paper);runtime.atomicWrite(file,JSON.stringify(state))}
const baseId=paper=>{try{return runtime.arxivId(paper.arxiv||paper.url||'').replace(/v\d+$/,'')}catch{return ''}};
async function main(){
 console.log('Production backup: '+path.basename(backup));
 console.log('Fetching official arXiv metadata for '+catalog.length+' papers…');
 let records=[];
 for(let attempt=0;attempt<3;attempt++){try{records=await service.metadata(catalog.map(c=>c[0]));if(records.length)break}catch(error){console.log('Metadata attempt '+(attempt+1)+': '+error.message)}}
 const queue=catalog.map((c,index)=>({c,index}));let completed=0;
 async function worker(){
  while(queue.length){
   const {c,index}=queue.shift(),[id,collection,tags,expected,note]=c;
   let paper=read().papers.find(p=>baseId(p)===id);
   const meta=records.find(m=>m.arxiv===id);
   try{
    if(!meta){throw Error('No verified official metadata found for '+id+' ('+expected+')')}
    paper={...paper,...meta,id:paper?.id||'research-'+id,collections:[...new Set([...(paper?.collections||[]),collection,...(tags.includes('diffusion-RL')?['Diffusion']:[])])],tags:[...new Set([...(paper?.tags||[]),...tags])],readingOrder:index+1,curatorNote:note,curatedAt:new Date().toISOString(),highlights:paper?.highlights||[]};
    commit(paper);
    const local=await runtime.localPdf({url:paper.pdfUrl});Object.assign(paper,{fileId:local.fileId,localUrl:local.localUrl});delete paper.dataUrl;commit(paper);
    if(!paper.guide){paper.guide=await service.summarize(paper);commit(paper)}
    report.papers.push({id,title:paper.title,fileId:paper.fileId,guide:true,sourceScope:paper.guide.sourceScope});
    console.log('['+(++completed)+'/'+catalog.length+'] PDF + guide: '+paper.title);
   }catch(error){report.errors.push({id,title:paper?.title||expected,error:error.message});console.log('['+(++completed)+'/'+catalog.length+'] Needs retry: '+id+' — '+error.message)}
   runtime.atomicWrite(path.join(directory,'research-import-report.json'),JSON.stringify(report,null,2));
  }
 }
 await Promise.all([worker(),worker(),worker()]);
 const state=read(),folderId='research-reading-paths';state.folders=state.folders||[];
 if(!state.folders.some(f=>f.id===folderId))state.folders.push({id:folderId,name:'Reading paths',icon:'📚',color:'#d8f56d',parentId:null});
 const groups=['LLMs','VLMs','Video generation','RL & alignment','Diffusion'];
 for(const group of groups){
  const id='reading-path-'+group.toLowerCase().replace(/[^a-z]+/g,'-');
  if(state.notes.some(n=>n.id===id))continue;
  const papers=state.papers.filter(p=>(p.collections||[]).includes(group)).sort((a,b)=>a.readingOrder-b.readingOrder);
  const content='<h1>'+group+' — reading path</h1><p>Curated on 2026-11-08. Start with foundational work, then compare model reports and recent follow-ups. Results are paper-reported, not an independent ranking.</p>'+papers.map((p,i)=>'<h2>'+(i+1)+'. <a href="/papers/'+p.id+'">'+p.title+'</a></h2><p>'+p.curatorNote+'</p><div class="paper-embed" contenteditable="false" data-paper-embed="'+p.id+'"><strong>'+p.title+'</strong><small>Open paper and reading guide →</small></div>').join('');
  state.notes.push({id,title:group+' — reading path',folder:folderId,type:'📚',tag:'reading-path',content,desc:'A guided reading order for '+group,draft:false,versions:[{title:group+' — reading path',content,savedAt:new Date().toISOString()}]});
 }
 require('./library-supplement.cjs')(state);
 runtime.atomicWrite(file,JSON.stringify(state));
 report.finishedAt=new Date().toISOString();runtime.atomicWrite(path.join(directory,'research-import-report.json'),JSON.stringify(report,null,2));
 console.log('Done: '+report.papers.length+' complete; '+report.errors.length+' need retry.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1});

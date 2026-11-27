const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const environment=(process.argv.includes('--test')||process.env.npm_config_test==='true'||process.env.NODE_ENV==='test')?'test':'production';
const dataRoot=path.resolve(process.env.LABBOOK_DATA_DIR||path.join(require('../paths.cjs').projectRoot,'data'));
const directory=path.join(dataRoot,environment);
const stateFile=path.join(directory,'state.json');
const auditFile=path.join(directory,'audit.jsonl');
const presence=new Map();
function stateRevision(){return fs.existsSync(stateFile)?crypto.createHash('sha256').update(fs.readFileSync(stateFile)).digest('hex'):'empty'}
function json(res,status,data){if(res.headersSent||res.writableEnded)return false;res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));return true}
async function readBody(req,limit=80*1024*1024){
 let size=0;const chunks=[];
 for await(const chunk of req){size+=chunk.length;if(size>limit)throw Error('File too large (maximum 80 MB)');chunks.push(chunk)}
 return JSON.parse(Buffer.concat(chunks).toString()||'{}');
}
function atomicWrite(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temporary,data);fs.renameSync(temporary,file)}
function audit(entry){fs.mkdirSync(directory,{recursive:true});fs.appendFileSync(auditFile,JSON.stringify({...entry,at:new Date().toISOString()})+'\n')}
function arxivId(value){
 let input=String(value||'').trim().replace(/^arxiv:\s*/i,'');
 if(/^https?:/i.test(input)||/^www\./i.test(input)){
  const url=new URL(input.startsWith('www.')?'https://'+input:input);
  if(!/^(?:www\.|export\.)?arxiv\.org$/i.test(url.hostname))throw Error('The link must point to arXiv');
  input=decodeURIComponent(url.pathname).replace(/^\/(?:abs|pdf|html|format|ps|e-print)\//i,'');
 }
 input=input.split(/[?#]/)[0].replace(/\.pdf$/i,'').replace(/\/$/,'');
 if(!/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[a-z-]+)?\/\d{7})(?:v\d+)?$/i.test(input))throw Error('Invalid arXiv identifier');
 return input;
}
async function localPdf(input){
 let pdf;
 const fileId=input.fileId;
 if(fileId){
  if(!/^[a-f0-9]{64}$/.test(fileId))throw Error('Invalid PDF identifier');
  const file=path.join(directory,'papers',fileId+'.pdf');
  if(!fs.existsSync(file))throw Error('The local copy of this PDF is missing');
  return {fileId,localUrl:'/api/papers/'+fileId+'.pdf',file};
 }
 if(input.fileData){
  if(!/^data:application\/pdf;base64,/i.test(input.fileData))throw Error('A PDF is required');
  pdf=Buffer.from(input.fileData.split(',')[1],'base64');
 }else{
  let external;try{const url=new URL(input.url);if(url.protocol==='https:'&&!/(^|\.)arxiv\.org$/i.test(url.hostname))external=url}catch{}
  if(external){
   for(const key of [...external.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$/i.test(key))external.searchParams.delete(key);
   const index=path.join(directory,'papers','url-'+crypto.createHash('sha256').update(external.href).digest('hex')+'.json');
   if(fs.existsSync(index))return localPdf(JSON.parse(fs.readFileSync(index,'utf8')));
   const response=await fetch(external.href,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Unable to download the PDF: HTTP '+response.status);
   const chunks=[];let total=0;for await(const chunk of response.body){total+=chunk.length;if(total>80*1024*1024)throw Error('PDF too large');chunks.push(Buffer.from(chunk))}const bytes=Buffer.concat(chunks);
   if(!bytes.subarray(0,1024).includes(Buffer.from('%PDF-')))throw Error('This URL did not return a PDF. Upload the PDF or provide its direct download link.');
   const stored=await localPdf({fileData:'data:application/pdf;base64,'+bytes.toString('base64')});atomicWrite(index,JSON.stringify({fileId:stored.fileId,url:external.href}));return stored;
  }
  const id=arxivId(input.url),index=path.join(directory,'papers','arxiv-'+id.replace('/','_')+'.json');
  if(fs.existsSync(index))return localPdf(JSON.parse(fs.readFileSync(index,'utf8')));
  const legacyFile=path.join(dataRoot,'papers',id+'.pdf');
  if(environment==='production'&&fs.existsSync(legacyFile)){
   const cached=fs.readFileSync(legacyFile);
   if(cached.subarray(0,1024).includes(Buffer.from('%PDF-'))){
    const stored=await localPdf({fileData:'data:application/pdf;base64,'+cached.toString('base64')});
    atomicWrite(index,JSON.stringify({fileId:stored.fileId}));return stored;
   }
  }
  let response;
  for(const host of ['arxiv.org','export.arxiv.org']){
   try{response=await fetch('https://'+host+'/pdf/'+id,{signal:AbortSignal.timeout(30000)});if(response.ok)break}catch{}
  }
  if(!response?.ok)throw Error('Unable to download the PDF from arXiv. You can upload the file directly.');
  pdf=Buffer.from(await response.arrayBuffer());
  if(pdf.length>80*1024*1024)throw Error('PDF too large');
  if(!pdf.subarray(0,1024).includes(Buffer.from('%PDF-')))throw Error('arXiv did not return a PDF file');
  const stored=await localPdf({fileData:'data:application/pdf;base64,'+pdf.toString('base64')});
  atomicWrite(index,JSON.stringify({fileId:stored.fileId}));
  return stored;
 }
 if(!pdf.subarray(0,1024).includes(Buffer.from('%PDF-')))throw Error('The file does not contain a valid PDF');
 const hash=crypto.createHash('sha256').update(pdf).digest('hex'),file=path.join(directory,'papers',hash+'.pdf');
 if(!fs.existsSync(file))atomicWrite(file,pdf);
 return {fileId:hash,localUrl:'/api/papers/'+hash+'.pdf',file};
}
async function handle(req,res){
 if(await require('./research-api.cjs')(req,res,module.exports))return true;
 const url=new URL(req.url,'http://localhost');
 if(/^\/vendor\/pdf\.(?:worker\.)?mjs$/.test(url.pathname)){
  const name=url.pathname.includes('worker')?'pdf.worker.mjs':'pdf.mjs';
  const file=path.join(require('../paths.cjs').projectRoot,'node_modules','pdfjs-dist','build',name);
  res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-cache'});
  fs.createReadStream(file).pipe(res);return true;
 }
 if(url.pathname==='/bootstrap.js'){
  const stored=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):null;
  res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
  res.end('window.LABBOOK_ACCOUNT='+JSON.stringify(req.labbookUser||null)+';window.LABBOOK_ENV='+JSON.stringify(environment)+';window.LABBOOK_STATE_REVISION='+JSON.stringify(stateRevision())+';window.LABBOOK_SERVER_STATE='+JSON.stringify(stored)+';');return true;
 }
 if(url.pathname==='/api/environments'&&req.method==='POST'){const input=await readBody(req,10000);json(res,201,require('./launch-config.cjs').create(input));return true}
 if(url.pathname==='/api/environments'&&req.method==='GET'){json(res,200,require('./launch-config.cjs').load().environments);return true}
 if(url.pathname==='/api/health'){json(res,200,{environment,storage:'server',version:2});return true}
 if(url.pathname==='/api/sota-review/config'){
  const configFile=path.join(directory,'sota-review-config.json'),defaults={enabled:false,intervalDays:3,model:'gpt-4.1-mini',environment};
  if(req.method==='GET'){json(res,200,fs.existsSync(configFile)?{...defaults,...JSON.parse(fs.readFileSync(configFile,'utf8'))}:defaults);return true}
  if(req.method==='PUT'){const value=await readBody(req,100000),next={...defaults,...value};if(!Number.isInteger(Number(next.intervalDays))||Number(next.intervalDays)<1||Number(next.intervalDays)>365)throw Error('intervalDays must be between 1 and 365');if(!/^[-\w.]+$/.test(String(next.model)))throw Error('Invalid model name');atomicWrite(configFile,JSON.stringify({...next,intervalDays:Number(next.intervalDays)},null,2));json(res,200,next);return true}
  json(res,405,{error:'Method not allowed'});return true;
 }
 if(url.pathname==='/api/sota-review/run'&&req.method==='POST'){
  const {spawn}=require('node:child_process');const configFile=path.join(directory,'sota-review-config.json');const saved=fs.existsSync(configFile)?JSON.parse(fs.readFileSync(configFile,'utf8')):{};const child=spawn(process.execPath,[path.join(require('../paths.cjs').projectRoot,'scripts','sota-review.cjs'),...(environment==='test'?['--test']:[])],{cwd:require('../paths.cjs').projectRoot,env:{...process.env,ELECTRON_RUN_AS_NODE:'1',LABBOOK_SOTA_URL:`http://127.0.0.1:${req.socket.localPort}`,LABBOOK_DATA_DIR:dataRoot,LABBOOK_SOTA_MODEL:saved.model||'gpt-4.1-mini'},detached:true,stdio:'ignore'});child.unref();json(res,202,{started:true,environment});return true;
 }
 if(url.pathname==='/api/research-gc'&&req.method==='POST'){
  const input=await readBody(req,200000), state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{};
  const now=Date.now(), days=Math.max(1,Number(input.staleDays||14)), cutoff=now-days*86400000;
  const notes=state.notes||[], tasks=state.tasks||[], runs=state.experiments||[], papers=state.papers||[];
  const linkedNoteIds=new Set([...tasks.map(x=>x.noteId),...runs.map(x=>x.noteId)].filter(Boolean));
  const linkedPaperIds=new Set(notes.flatMap(n=>[...(String(n.content||'').matchAll(/data-paper(?:-embed)?=["']([^"']+)/g))].map(x=>x[1])));
  const item=(kind,row,reason)=>({kind,id:row.id,title:row.title||row.name||row.text||'Untitled',reason,updatedAt:row.updatedAt||row.createdAt||null,context:{desc:row.desc||row.abstract||row.curatorNote||'',highlights:(row.highlights||[]).slice(0,3).map(h=>({text:h.text,pageNumber:h.pageNumber,label:h.label}))}});
  const findings=[];
  for(const n of notes){const stamp=Date.parse(n.updatedAt||n.createdAt||'');if(Number.isFinite(stamp)&&stamp<cutoff)findings.push(item('note',n,'not updated within the selected window'));if(!linkedNoteIds.has(n.id)&&String(n.content||'').length<300)findings.push(item('note',n,'short and not linked to a task or experiment'))}
  for(const t of tasks){const stamp=Date.parse(t.updatedAt||t.createdAt||'');if(!['Done','Completed','Closed','Shipped'].includes(String(t.col||''))&&Number.isFinite(stamp)&&stamp<cutoff)findings.push(item('task',t,'open task with no recent activity'))}
  for(const r of runs){const stamp=Date.parse(r.updatedAt||r.createdAt||'');if(['planned','queued','training'].includes(r.status)&&Number.isFinite(stamp)&&stamp<cutoff)findings.push(item('experiment',r,'run appears stalled'));if(r.status==='trained'&&!Object.keys(r.metrics||{}).length)findings.push(item('experiment',r,'trained run has no recorded metrics'))}
  for(const p of papers){if(!linkedPaperIds.has(p.id)&&!p.highlights?.length)findings.push(item('paper',p,'paper has no highlights and is not embedded in a note'))}
  audit({action:'research-gc',environment,actor:input.actor||'anonymous',staleDays:days,count:findings.length});
  return json(res,200,{environment,generatedAt:new Date().toISOString(),staleDays:days,findings,summary:{notes:findings.filter(x=>x.kind==='note').length,tasks:findings.filter(x=>x.kind==='task').length,experiments:findings.filter(x=>x.kind==='experiment').length,papers:findings.filter(x=>x.kind==='paper').length}});
 }
 if(url.pathname==='/api/collab/presence'&&(req.method==='GET'||req.method==='POST')){
  const body=req.method==='POST'?await readBody(req,10000):{};
  const user=req.labbookUser;
  const userId=user?.id||body.userId;
  if(req.method==='POST'&&userId){
   if(req.labbookVisibleNotes&&!req.labbookVisibleNotes.has(body.noteId))return json(res,404,{error:'Page not available.'});
   presence.set(userId,{userId,name:user?.username||body.name,noteId:body.noteId||null,lastSeen:Date.now()});
  }
  const active=[...presence.values()].filter(entry=>Date.now()-entry.lastSeen<30000&&(!req.labbookVisibleNotes||req.labbookVisibleNotes.has(entry.noteId)));
  return json(res,200,{users:active});
 }
 if(url.pathname.startsWith('/api/collab/notes/')&&req.method==='PATCH'){
  if(req.headers['if-match']!==stateRevision()){json(res,409,{error:'Reload the workspace before saving. A current revision is required.'});return true}
  const id=decodeURIComponent(url.pathname.split('/').pop()),body=await readBody(req,8*1024*1024),state=JSON.parse(fs.readFileSync(stateFile,'utf8')),note=(state.notes||[]).find(x=>x.id===id);if(!note)return json(res,404,{error:'Note not found'});
  const allowed=['title','desc','draft','tag','ownerId','visibility'];for(const key of allowed)if(Object.prototype.hasOwnProperty.call(body,key))note[key]=body[key];
  if(Array.isArray(body.blocks)&&body.blocks.every(x=>x&&x.id&&typeof x.html==='string')){
   const previous=new Map((note.collabBlocks||[]).map(x=>[x.id,x]));const incoming=new Map(body.blocks.map(x=>[x.id,x]));const conflicts=[];
   for(const block of body.blocks){const old=previous.get(block.id);if(old&&old.html!==block.html&&old.updatedBy&&old.updatedBy!==body.userId)conflicts.push(block.id)}
   note.collabBlocks=body.blocks.map(x=>({...x,updatedBy:body.userId||'anonymous',updatedAt:new Date().toISOString()}));
   note.content=note.collabBlocks.sort((a,b)=>(a.order??0)-(b.order??0)).map(x=>x.html).join('');
   if(conflicts.length)audit({action:'collab-conflict',noteId:id,userId:body.userId||'anonymous',blocks:conflicts});
  }else if(Object.prototype.hasOwnProperty.call(body,'content'))note.content=body.content;
  note.updatedAt=new Date().toISOString();require('../shared/research-model.js').validate(structuredClone(state));atomicWrite(stateFile,JSON.stringify(state));audit({action:'collab-note-patch',noteId:id,userId:body.userId||'anonymous',fields:Object.keys(body).filter(x=>x!=='userId')});return json(res,200,note);
 }
 if(url.pathname==='/api/arxiv-pdf'){
  const stored=await localPdf({url:url.searchParams.get('url')});
  req.url=stored.localUrl;return handle(req,res);
 }
 if(url.pathname==='/api/state'){
  if(req.method==='GET'){res.setHeader('X-Labbook-Revision',stateRevision());json(res,200,fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):null);}
  else if(req.method==='PUT'){
   const value=await readBody(req);
   if(!Array.isArray(value.notes)||!Array.isArray(value.folders))throw Error('Invalid workspace state');
   require('../shared/research-model.js').validate(structuredClone(value));
   const revision=stateRevision();
   if(revision!=='empty'&&req.headers['if-match']!==revision){json(res,409,{error:'Workspace changed in another window or import. Reload to load the latest data.'});return true}
   atomicWrite(stateFile,JSON.stringify(value));res.setHeader('X-Labbook-Revision',stateRevision());json(res,200,{saved:true,environment});
  }else json(res,405,{error:'Method not allowed'});
  return true;
 }
 if(url.pathname==='/api/papers/import'&&req.method==='POST'){
  const result=await localPdf(await readBody(req));json(res,200,{fileId:result.fileId,localUrl:result.localUrl});return true;
 }
 if(/^\/api\/papers\/[a-f0-9]{64}\.pdf$/.test(url.pathname)){
  const file=path.join(directory,'papers',path.basename(url.pathname));
  if(!fs.existsSync(file)){json(res,404,{error:'Local PDF not found'});return true}
  const pdf=fs.readFileSync(file),range=req.headers.range;
  let start=0,end=pdf.length-1;
  if(range){const match=range.match(/^bytes=(\d+)-(\d*)$/);if(!match){res.writeHead(416);res.end();return true}start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;if(start>end){res.writeHead(416);res.end();return true}}
  const headers={'Content-Type':'application/pdf','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'private, max-age=86400'};
  if(range)headers['Content-Range']=`bytes ${start}-${end}/${pdf.length}`;
  res.writeHead(range?206:200,headers);res.end(req.method==='HEAD'?undefined:pdf.subarray(start,end+1));return true;
 }
 return false;
}
module.exports={handle,json,environment,dataRoot,atomicWrite,audit,auditFile,arxivId,localPdf,readBody,stateFile,stateRevision};

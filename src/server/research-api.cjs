const fs=require('node:fs'),crypto=require('node:crypto');
const model=require('../shared/research-model.js');
module.exports=async function(req,res,runtime){
 const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/api/v1/'))return false;
 const {json,readBody,stateFile,stateRevision,atomicWrite}=runtime;
 if(process.env.LABBOOK_AGENT_TOKEN&&req.headers.authorization!=='Bearer '+process.env.LABBOOK_AGENT_TOKEN){json(res,401,{error:'A valid bearer token is required'});return true}
 const [, , ,collection,id]=url.pathname.split('/');
 if(collection==='docs'){res.writeHead(200,{'Content-Type':'text/markdown; charset=utf-8','Cache-Control':'no-store'});res.end(fs.readFileSync(require('node:path').join(require('../paths.cjs').projectRoot,'agent-api.md'),'utf8'));return true}
 if(collection==='skill'){try{const text=require('./skill-catalog.cjs').readSkill(url.searchParams.get('name')||'lab-book-research',url.searchParams.get('resource')||'instructions');res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(text)}catch(error){json(res,404,{error:error.message})}return true}
 if(collection==='schema'){json(res,200,{version:3,environment:runtime.environment,collections:model.collections,columnTypes:require('../shared/table-schema.js').types,experimentStatuses:model.statuses,documentation:'/api/v1/docs',operations:['GET collection','GET collection/id','POST collection','PATCH collection/id','DELETE collection/id'],sharing:{visibility:['private','workspace','shared'],roles:['view','edit'],collections:['notes','folders','boards','papers','experiments','repositories']},notes:'Research streams are notes created from a template. Use noteId to link tasks, boards, experiments and repository branches. DELETE rejects dangling references. Use If-Match to guard read-modify-write. POST externalId is idempotent.'});return true}
 if(!model.collections.includes(collection)){json(res,404,{error:'Unknown collection'});return true}
 try{
  // Await the request before reading state so parallel requests cannot overwrite a stale snapshot.
  const body=['POST','PATCH'].includes(req.method)?await readBody(req,8*1024*1024):{};
  const state=model.ensure(fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{folders:[{id:'inbox',name:'Inbox'}],notes:[],papers:[],boards:[],tasks:[]});
  const revision=stateRevision();res.setHeader('ETag','"'+revision+'"');res.setHeader('X-Labbook-Revision',revision);
  if(req.method==='GET'){const result=id?state[collection].find(r=>r.id===id):state[collection].filter(r=>[...url.searchParams].every(([k,v])=>String(r[k]??'')===v));json(res,result?200:404,result||{error:'Entity not found'});return true}
  if(!['POST','PATCH','DELETE'].includes(req.method)){json(res,405,{error:'Method not allowed'});return true}
  const expected=req.headers['if-match']?.replace(/^"|"$/g,'');if(expected&&expected!==revision){json(res,409,{error:'Workspace changed; fetch current data before retrying'});return true}
  if(req.method!=='POST'&&!state[collection].some(r=>r.id===id)){json(res,404,{error:'Entity not found'});return true}
  if(req.method==='POST'&&id){json(res,405,{error:'POST to the collection URL'});return true}
  if(req.method==='POST'&&body.externalId){const found=state[collection].find(r=>r.externalId===body.externalId);if(found){json(res,200,found);return true}}
  const entityId=id||crypto.randomUUID(),next=model.mutate(state,collection,entityId,body,req.method==='DELETE');atomicWrite(stateFile,JSON.stringify(next));
  res.setHeader('ETag','"'+stateRevision()+'"');res.setHeader('X-Labbook-Revision',stateRevision());json(res,req.method==='POST'?201:200,req.method==='DELETE'?{deleted:entityId}:next[collection].find(r=>r.id===entityId));
 }catch(error){json(res,400,{error:error.message})}return true;
};

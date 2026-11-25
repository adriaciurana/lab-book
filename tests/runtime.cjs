const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const {arxivId}=require('../src/server/runtime.cjs');
const {buildRequest}=require('../src/server/research-search.cjs');
test('research requests include exact source content and optional web search',()=>{
 const payload=buildRequest({query:'Compare evidence',context:[{type:'paragraph',label:'Note',text:'Exact paragraph'},{type:'region',label:'Paper',page:'p. 3',text:'Exact highlight'}],webSearch:false,skill:'Critical review'});
 assert.equal(payload.tools.length,0);assert.match(payload.input,/Exact paragraph/);assert.match(payload.input,/Exact highlight/);assert.match(payload.input,/p\. 3/);
 assert.match(payload.instructions,/Critical review/);assert.equal(buildRequest({query:'Find papers'}).tools.length,1);
 assert.throws(()=>buildRequest({query:''}));
});
test('normalizes modern and legacy arXiv URLs, HTML, and versions',()=>{
 for(const x of ['https://arxiv.org/abs/2209.00796','https://arxiv.org/pdf/2209.00796.pdf?download=1','2209.00796','arXiv:2209.00796'])assert.equal(arxivId(x),'2209.00796');
 assert.equal(arxivId('https://arxiv.org/html/2209.00796v2'),'2209.00796v2');
 assert.equal(arxivId('https://export.arxiv.org/pdf/hep-th/9901001v2.pdf'),'hep-th/9901001v2');
 assert.throws(()=>arxivId('https://example.org/pdf/2209.00796'));
});
test('isolated storage, local PDFs, ranges, and migration with backup',async t=>{
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-runtime-'));
 const servers=[];
 async function launch(env){
  const child=spawn(process.execPath,['src/server/server.cjs',...(env==='test'?['--test']:[])],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:'0',NODE_ENV:env,LABBOOK_DATA_DIR:data},stdio:['ignore','pipe','pipe']});
  servers.push(child);
  return new Promise((resolve,reject)=>{let out='';child.stdout.on('data',chunk=>{out+=chunk;const m=out.match(/http:\/\/localhost:(\d+)/);if(m)resolve('http://127.0.0.1:'+m[1])});child.on('error',reject);child.on('exit',code=>{if(code)reject(Error('Server exit '+code))})});
 }
 t.after(()=>servers.forEach(s=>s.kill()));
 const real=await launch('production'),trial=await launch('test');
 const value={notes:[{id:'note',content:'<div data-paper-embed="paper">Paper</div>',versions:[]}],folders:[],papers:[]};
 const put=await fetch(real+'/api/state',{method:'PUT',body:JSON.stringify(value)});assert.equal(put.status,200);
 const revision=put.headers.get('x-labbook-revision');assert.ok(revision);
 const stale=await fetch(real+'/api/state',{method:'PUT',headers:{'If-Match':'old-version'},body:JSON.stringify({notes:[],folders:[]})});assert.equal(stale.status,409);
 const current=await fetch(real+'/api/state',{method:'PUT',headers:{'If-Match':revision},body:JSON.stringify(value)});assert.equal(current.status,200);
 assert.equal(await (await fetch(trial+'/api/state')).json(),null);
 const pdf=Buffer.from('%PDF-1.4\nTest fixture\n%%EOF');
 const imported=await (await fetch(real+'/api/papers/import',{method:'POST',body:JSON.stringify({fileData:'data:application/pdf;base64,'+pdf.toString('base64')})})).json();
 assert.ok(imported.fileId);assert.ok(fs.existsSync(path.join(data,'production','papers',imported.fileId+'.pdf')));
 const content=await fetch(real+imported.localUrl);assert.equal(content.headers.get('content-type'),'application/pdf');assert.deepEqual(Buffer.from(await content.arrayBuffer()),pdf);
 const partial=await fetch(real+imported.localUrl,{headers:{Range:'bytes=0-4'}});assert.equal(partial.status,206);assert.equal(await partial.text(),'%PDF-');
 assert.equal((await fetch(trial+imported.localUrl)).status,404);
 const run=()=>spawnSync(process.execPath,['scripts/migrate-env.cjs'],{cwd:path.join(__dirname,'..'),env:{...process.env,LABBOOK_DATA_DIR:data}});
 assert.equal(run().status,0);assert.deepEqual(await (await fetch(trial+'/api/state')).json(),value);
 assert.equal((await fetch(trial+imported.localUrl)).status,200);
 assert.equal(run().status,0);assert.ok(fs.readdirSync(data).some(p=>p.startsWith('test.backup-')));
 assert.deepEqual(await (await fetch(real+'/api/state')).json(),value);
 const html=await (await fetch(real)).text();assert.match(html,/note-persistence\.js\?v=/);assert.match(html,/bootstrap\.js/);
 assert.equal((await fetch(real+'/data/production/state.json')).status,404);
});

const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const {seedTest}=require('../scripts/seed-test.cjs');
test('TEST fixtures preserve existing work, are repeatable, and reject production',async t=>{
 const dataRoot=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-demo-')),servers=[];
 t.after(()=>{servers.forEach(s=>s.kill());fs.rmSync(dataRoot,{recursive:true,force:true})});
 async function launch(environment){const child=spawn(process.execPath,['src/server/server.cjs',...(environment==='test'?['--test']:[])],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:'0',NODE_ENV:environment,LABBOOK_DATA_DIR:dataRoot},stdio:['ignore','pipe','pipe']});servers.push(child);return new Promise((resolve,reject)=>{let out='';child.stdout.on('data',chunk=>{out+=chunk;const match=out.match(/localhost:(\d+)/);if(match)resolve('http://127.0.0.1:'+match[1])});child.once('error',reject);child.once('exit',code=>reject(Error('Server exited '+code)))})}
 const base=await launch('test'),real=await launch('production');
 await assert.rejects(()=>seedTest({base:real,dataRoot}),/not a TEST/);assert.ok(!fs.existsSync(path.join(dataRoot,'production')));
 const existing=await(await fetch(base+'/api/v1/notes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Existing user note',folder:'inbox',content:'<p>Keep me</p>'})})).json();
 const first=await seedTest({base,dataRoot});assert.equal(first.added.tasks,36);assert.equal(first.added.experiments,18);assert.ok(fs.existsSync(first.backup));
 let state=await(await fetch(base+'/api/state')).json();assert.ok(state.notes.some(n=>n.id===existing.id));assert.equal(state.papers.filter(p=>p.mock).length,2);
 for(const paper of state.papers){const response=await fetch(base+paper.localUrl);assert.equal(response.headers.get('content-type'),'application/pdf');assert.ok((await response.text()).startsWith('%PDF-'))}
 const edit=await fetch(base+'/api/v1/notes/demo-home',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:'<p>User edits to the mock page</p>'})});assert.equal(edit.status,200);
 const second=await seedTest({base,dataRoot});assert.ok(Object.values(second.added).every(v=>v===0));assert.equal(second.backup,null);
 state=await(await fetch(base+'/api/state')).json();assert.equal(state.notes.find(n=>n.id==='demo-home').content,'<p>User edits to the mock page</p>');assert.ok(state.notes.some(n=>n.id===existing.id));
 assert.ok(!fs.existsSync(path.join(dataRoot,'production')));
});

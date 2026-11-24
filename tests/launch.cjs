const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {EventEmitter}=require('node:events');
const {load}=require('../launch-config.cjs');
const {start}=require('../scripts/server-scheduler.cjs');
test('registered environments validate URLs and keep labels',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-launch-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'config.json');
 assert.deepEqual(load(file).environments,[]);
 fs.writeFileSync(file,JSON.stringify({environments:[{name:'TEST',url:'http://localhost:4175'}]}));assert.equal(load(file).environments[0].url,'http://localhost:4175/');
 for(const url of ['javascript:alert(1)','file:///tmp','https://user:password@example.com']){fs.writeFileSync(file,JSON.stringify({environments:[{name:'bad',url}]}));assert.throws(()=>load(file))}
});
test('scheduler requires opt-in, prevents overlap, retries failure, and marks only success',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-schedule-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));fs.mkdirSync(path.join(dir,'test'));const file=path.join(dir,'test','sota-review-config.json');
 const server=new EventEmitter();server.address=()=>({port:1234});let calls=0,child;
 const scheduler=start(server,{dataRoot:dir,environment:'test',atomicWrite:fs.writeFileSync},{spawnReview:(node,args,options)=>{calls++;assert.ok(args.includes('--test'));assert.equal(options.env.LABBOOK_SOTA_URL,'http://127.0.0.1:1234');child=new EventEmitter();return child}});t.after(scheduler.stop);
 await scheduler.tick();assert.equal(calls,0);
 fs.writeFileSync(file,JSON.stringify({enabled:true,intervalDays:3}));await scheduler.tick();await scheduler.tick();assert.equal(calls,1);
 child.emit('exit',1);await scheduler.tick();assert.equal(calls,1);assert.equal(JSON.parse(fs.readFileSync(file)).lastRunAt,undefined);
 fs.writeFileSync(file,JSON.stringify({enabled:true,intervalDays:3}));await scheduler.tick();child.emit('exit',0);await scheduler.tick();assert.equal(calls,2);assert.ok(JSON.parse(fs.readFileSync(file)).lastRunAt);
 server.emit('close');
});

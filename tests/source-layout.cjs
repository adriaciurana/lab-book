const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('relocated server serves all UI assets, shared modules, docs and PDF runtime while keeping backend private',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-layout-'));process.env.LABBOOK_DATA_DIR=dir;
 const server=require('../src/server/server.cjs');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(()=>{fs.rmSync(dir,{recursive:true,force:true});resolve()})));
 const base=`http://127.0.0.1:${server.address().port}`;
 const html=await(await fetch(base)).text();
 const assets=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match=>match[1]).filter(url=>!url.startsWith('http')&&url!=='/'&&/\.(js|css|svg)(\?|$)/.test(url));
 assert.ok(assets.length>50);
 for(const asset of assets)assert.equal((await fetch(base+'/'+asset)).status,200,asset);
 for(const route of ['/api/v1/docs','/api/v1/skill','/vendor/pdf.mjs','/vendor/pdf.worker.mjs']){
  const response=await fetch(base+route);assert.equal(response.status,200,route);await response.arrayBuffer();
 }
 for(const route of ['/server.cjs','/runtime.cjs','/src/server/server.cjs','/../server/server.cjs','/paths.cjs'])assert.equal((await fetch(base+route)).status,404,route);
});

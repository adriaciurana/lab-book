const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {mockPdf,buildFixtures}=require('./demo-fixtures.cjs'),model=require('./research-model.js');
async function seedTest({base=process.env.LABBOOK_TEST_URL||'http://127.0.0.1:4175',dataRoot=process.env.LABBOOK_DATA_DIR||path.join(__dirname,'data')}={}){
 const headers=process.env.LABBOOK_AGENT_TOKEN?{Authorization:'Bearer '+process.env.LABBOOK_AGENT_TOKEN}:{};
 async function json(route,options={}){const response=await fetch(base+route,{...options,headers:{...headers,...options.headers}}),text=await response.text();let value;try{value=JSON.parse(text)}catch{throw Error('Non-JSON response from '+route)}if(!response.ok)throw Error(value.error||'HTTP '+response.status);return {value,response}}
 const health=(await json('/api/health')).value,schema=(await json('/api/v1/schema')).value;
 if(health.environment!=='test'||schema.environment!=='test')throw Error('Refusing to seed: the endpoint is not a TEST environment');
 const pdfFiles={};for(const [name,title]of [['paper-video','Temporal consistency study'],['paper-alignment','Preference optimization study']])pdfFiles[name]=(await json('/api/papers/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileData:'data:application/pdf;base64,'+mockPdf(title).toString('base64')})})).value;
 // Capture a revision BEFORE the snapshot. Any intervening change makes PUT fail safely.
 const revision=(await json('/api/v1/notes')).response.headers.get('x-labbook-revision');
 const current=(await json('/api/state')).value||{folders:[{id:'inbox',name:'Inbox',icon:'inbox'}],notes:[],papers:[],boards:[],tasks:[],context:[]};
 const next=structuredClone(current),fixtures=buildFixtures(pdfFiles),added={};
 for(const [collection,rows]of Object.entries(fixtures)){next[collection]??=[];let count=0;for(const row of rows){const key=collection==='context'?'key':'id';if(!next[collection].some(r=>r[key]===row[key])){next[collection].push(row);count++}}added[collection]=count}
 model.validate(next);
 let backup=null;
 if(Object.values(added).some(Boolean)){
  const latestHealth=(await json('/api/health')).value;if(latestHealth.environment!=='test')throw Error('Target environment changed');
  backup=path.join(dataRoot,'backups','test-before-demo-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8)+'.json');fs.mkdirSync(path.dirname(backup),{recursive:true});fs.writeFileSync(backup,JSON.stringify(current,null,2));
  await json('/api/state',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':revision},body:JSON.stringify(next)});
 }
 const saved=(await json('/api/state')).value;
 for(const [collection,rows]of Object.entries(fixtures))for(const row of rows){const key=collection==='context'?'key':'id';if(!saved[collection]?.some(r=>r[key]===row[key]))throw Error('Fixture did not persist: '+collection+' '+row[key])}
 const result={environment:'test',added,backup,start:base+'/notes/demo-home',views:base+'/views/demo-research-overview',experiments:base+'/experiments'};console.log(JSON.stringify(result,null,2));return result;
}
module.exports={seedTest};if(require.main===module)seedTest().catch(error=>{console.error(error.message);process.exitCode=1});

// Explicit one-time cleanup. The complete previous environment is moved to a backup.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'data'),production=path.join(root,'production');
const original=JSON.parse(fs.readFileSync(path.join(production,'state.json'),'utf8'));
const catalog=require('./research-catalog.cjs');
const allowed=new Set(catalog.map(row=>'research-'+row[0]).concat('research-wan-2-2-official'));
const papers=original.papers.filter(p=>allowed.has(p.id));
if(papers.length!==41||papers.filter(p=>p.fileId&&p.guide).length!==40)throw Error('Expected all 40 local papers + guides and the Wan2.2 reference. Cleanup aborted.');
const notes=original.notes.filter(n=>n.id.startsWith('reading-path-')||n.id==='alignment-method-map');
if(notes.length!==6)throw Error('Expected six reading guides. Cleanup aborted.');
const clean={folders:[{id:'inbox',name:'Inbox',icon:'inbox',parentId:null,count:0},{id:'research-reading-paths',name:'Reading paths',icon:'book',color:'#a0c268',parentId:null,count:6}],notes,papers,boards:[],tasks:[],context:[],workspace:{kind:'production',cleanedAt:new Date().toISOString()}};
const report={retained:{papers:papers.length,notes:notes.length},removed:{papers:original.papers.length-papers.length,notes:original.notes.length-notes.length,boards:original.boards.length,tasks:original.tasks.length,folders:original.folders.length-clean.folders.length}};
if(!process.argv.includes('--apply')){console.log(JSON.stringify(report,null,2));console.log('Run npm run workspace:clean -- --apply to move the old environment to a backup and activate the clean one.');process.exit(0)}
const staging=path.join(root,'production-clean-'+crypto.randomUUID());
fs.mkdirSync(path.join(staging,'papers'),{recursive:true});fs.mkdirSync(path.join(staging,'guides'),{recursive:true});
const knownFiles=new Set(papers.filter(p=>p.fileId).map(p=>p.fileId));
for(const id of knownFiles){
 const pdf=path.join(production,'papers',id+'.pdf'),guide=path.join(production,'guides',id+'-v1.json');
 if(!fs.existsSync(pdf))throw Error('Missing curated PDF: '+id);
 fs.copyFileSync(pdf,path.join(staging,'papers',id+'.pdf'));
 if(fs.existsSync(guide))fs.copyFileSync(guide,path.join(staging,'guides',id+'-v1.json'));
}
for(const name of fs.readdirSync(path.join(production,'papers')).filter(name=>/^arxiv-.*\.json$/.test(name))){
 const source=path.join(production,'papers',name),index=JSON.parse(fs.readFileSync(source,'utf8'));
 if(knownFiles.has(index.fileId))fs.copyFileSync(source,path.join(staging,'papers',name));
}
for(const name of ['research-import-report.json'])if(fs.existsSync(path.join(production,name)))fs.copyFileSync(path.join(production,name),path.join(staging,name));
fs.writeFileSync(path.join(staging,'state.json'),JSON.stringify(clean));
const backup=path.join(root,'backups','production-before-cleanup-'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(path.dirname(backup),{recursive:true});
if(JSON.stringify(original)!==JSON.stringify(JSON.parse(fs.readFileSync(path.join(production,'state.json'),'utf8'))))throw Error('Production changed during preparation. Cleanup aborted.');
fs.renameSync(production,backup);
try{fs.renameSync(staging,production)}catch(error){fs.renameSync(backup,production);throw error}
fs.writeFileSync(path.join(production,'cleanup-report.json'),JSON.stringify({...report,backup},null,2));
console.log(JSON.stringify({...report,backup},null,2));

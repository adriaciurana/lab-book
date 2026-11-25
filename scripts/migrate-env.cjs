const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(process.env.LABBOOK_DATA_DIR||path.join(require('../src/paths.cjs').projectRoot,'data'));
const source=path.join(root,'production'),target=path.join(root,'test');
const file=path.join(source,'state.json');
if(!fs.existsSync(file)){console.error('Open the updated production app first to import your browser data to disk.');process.exit(1)}
const state=JSON.parse(fs.readFileSync(file,'utf8'));
if(!Array.isArray(state.notes)||!Array.isArray(state.folders))throw Error('The production database is invalid');
fs.mkdirSync(root,{recursive:true});
const staged=path.join(root,'migration-'+crypto.randomUUID());
fs.cpSync(source,staged,{recursive:true});
if(fs.existsSync(target)){
 const backup=target+'.backup-'+Date.now();fs.renameSync(target,backup);
 console.log('Previous test data backed up to '+backup);
}
fs.renameSync(staged,target);
console.log('Production → test: notes, versions, papers, and PDFs copied. Production is unchanged.');
console.log('Reload http://localhost:4175 to load the copied data.');

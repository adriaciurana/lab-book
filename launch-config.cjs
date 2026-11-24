const fs=require('node:fs');
const path=require('node:path');
function load(file=process.env.LABBOOK_CONFIG||path.join(__dirname,'labbook.config.json')){
 const input=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
 const environments=(input.environments||[]).map(item=>{
  if(!item.name||typeof item.name!=='string')throw Error('Environment name is required');
  const url=new URL(item.url);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Environment URL must use HTTP(S) without credentials');
  return {name:item.name,url:url.href};
 });
 return {...input,environments};
}
function create(input,file=process.env.LABBOOK_CONFIG||path.join(__dirname,'labbook.config.json')){
 const name=String(input.name||'').trim();
 if(!name||name.length>80)throw Error('Enter an environment name (up to 80 characters)');
 const url=new URL(input.url);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Use an HTTP(S) URL without credentials');
 const config=load(file);
 if(config.environments.some(item=>item.name.toLowerCase()===name.toLowerCase()||item.url===url.href))throw Error('An environment with this name or URL already exists');
 const entry={name,url:url.href};config.environments.push(entry);
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const temporary=file+'.tmp';
 try{fs.writeFileSync(temporary,JSON.stringify(config,null,2)+'\n',{mode:0o600});fs.renameSync(temporary,file)}finally{fs.rmSync(temporary,{force:true})}
 return entry;
}
module.exports={load,create};

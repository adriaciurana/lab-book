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
module.exports={load};

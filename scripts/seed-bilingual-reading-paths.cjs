const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const docs=[
  ['llm-vlm','LLM/VLM — connected reading path','From Transformers, attention and MoE to patchification, grounded VLMs and predictive video representations.'],
  ['diffusion','Diffusion — connected reading path','From DDPM and latent diffusion to flow matching, REPA, representation autoencoders and video generation.'],
  ['rl-preferences','RL and preference optimization — connected reading path','From RLHF/PPO to DPO, GRPO and lower-cost preference optimization.']
];
const targets=process.argv.includes('--test')?[['test',4175]]:[['production',4173],['test',4175]];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function markdownToHtml(markdown){
  const lines=markdown.split(/\r?\n/),out=[]; let list=false;
  const close=()=>{if(list){out.push('</ul>');list=false}};
  for(const raw of lines){const line=raw.trim();if(!line){close();continue}
    if(line.startsWith('# ')){close();out.push(`<h1>${esc(line.slice(2))}</h1>`);continue}
    if(line.startsWith('## ')){close();out.push(`<h2>${esc(line.slice(3))}</h2>`);continue}
    if(line.startsWith('### ')){close();out.push(`<h3>${esc(line.slice(4))}</h3>`);continue}
    if(line.startsWith('- ')){if(!list){out.push('<ul>');list=true}out.push(`<li>${inline(line.slice(2))}</li>`);continue}
    close();out.push(`<p>${inline(line)}</p>`);
  } close(); return out.join('');
}
function inline(s){let t=esc(s);t=t.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>');t=t.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');t=t.replace(/`([^`]+)`/g,'<code>$1</code>');return t}
async function main(){
  for(const [env,port] of targets){
    const base=`http://localhost:${port}`;
    const schema=await (await fetch(base+'/api/v1/schema')).json();
    if(schema.environment!==env)throw Error(`Expected ${env} at ${base}, got ${schema.environment}`);
    const current=await fetch(base+'/api/v1/notes');
    const notes=await current.json();
    for(const [slug,title,desc] of docs){
      const markdown=fs.readFileSync(path.join(root,'docs','reading-paths',slug+'.md'),'utf8');
      const externalId=`bilingual-reading-path-${slug}-2026-11-09`;
      const existing=(Array.isArray(notes)?notes:notes.items||[]).find(n=>n.externalId===externalId);
      const payload={title,folder:'research-reading-paths',type:'📚',tag:'reading-path',desc,content:markdownToHtml(markdown),draft:false,externalId,language:'bilingual',updatedAt:new Date().toISOString()};
      const latest=await fetch(base+'/api/v1/notes');
      const revision=latest.headers.get('X-Labbook-Revision')||latest.headers.get('etag');
      const response=await fetch(base+'/api/v1/notes'+(existing?'/'+existing.id:''),{method:existing?'PATCH':'POST',headers:{'Content-Type':'application/json','If-Match':revision},body:JSON.stringify(payload)});
      if(!response.ok)throw Error(`${env} ${slug}: ${await response.text()}`);
      console.log(`${env}: ${existing?'updated':'created'} ${title}`);
    }
  }
}
main().catch(error=>{console.error(error);process.exitCode=1});

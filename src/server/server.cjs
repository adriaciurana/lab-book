const http = require('http');
const fs = require('fs');
const path = require('path');
const runtime=require('./runtime.cjs');
const port = Number(process.env.PORT || (runtime.environment==='test'?4175:4173));
const root = path.resolve(__dirname,'../client');
const sharedRoot=path.resolve(__dirname,'../shared');
function assetFile(name){const candidate=path.join(root,name);return fs.existsSync(candidate)?candidate:path.join(sharedRoot,name)};
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'};
function configuredKey(){
  if(process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const home=require('node:os').homedir();
  const files=['.zprofile','.zshrc','.bashrc','.bash_profile','.profile'];
  for(const name of files){try{const text=fs.readFileSync(path.join(home,name),'utf8');const match=text.match(/(?:export\s+)?(?:OPENAI_API_KEY|OPENAI_KEY)\s*=\s*["']?([^\s"']+)/);if(match?.[1])return match[1]}catch{}}
  return '';
}
function parseModelJson(text,filename){
  const fallback={title:(filename||'paper.pdf').replace(/\.pdf$/i,''),authors:'',doi:'',arxiv:'',abstract:text||'',tags:[],contribution:''};
  if(!text)return fallback;
  const cleaned=text.replace(/```(?:json)?/gi,'').replace(/```/g,'').trim();
  try{return JSON.parse(cleaned)}catch{}
  const start=cleaned.indexOf('{'),end=cleaned.lastIndexOf('}');
  if(start>=0&&end>start){try{return JSON.parse(cleaned.slice(start,end+1))}catch{}}
  return fallback;
}
const server = http.createServer(async(req,res)=>{
  try{if(await runtime.handle(req,res))return}catch(error){if(!res.headersSent&&!res.writableEnded)runtime.json(res,400,{error:error.message});return}
  if(req.url.split('?')[0]==='/api/research-attachments'||req.url.startsWith('/api/research-attachments/'))return require('./research-attachments.cjs').handle(req,res);
  if(req.method==='POST' && req.url==='/api/agent/develop-page')return require('./detailed-pages.cjs').handle(req,res,configuredKey);
  if(req.method==='POST' && req.url==='/api/agent/edit')return require('./editor-agent.cjs').handle(req,res,configuredKey);
  if(req.method==='POST' && req.url==='/api/search')return require('./research-search.cjs').handle(req,res,configuredKey);
  if(req.method==='POST' && req.url==='/api/diagrams/generate')return require('./diagram-service.cjs').handle(req,res,configuredKey);
  if(req.method==='POST' && req.url==='/api/diagrams/harmonize')return require('./diagram-harmonize.cjs').handle(req,res,configuredKey);
  if(req.method==='POST' && ['/api/papers/summary','/api/papers/metadata'].includes(req.url))return require('./paper-service.cjs').handle(req,res);
  if(req.method==='POST' && req.url==='/api/extract-pdf'){
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',async()=>{try{const {filename,fileData}=JSON.parse(body);if(!fileData)throw new Error('Missing PDF data');const key=configuredKey();if(!key){res.writeHead(503,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'OPENAI_API_KEY not configured'}))}const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:'gpt-4.1-mini',input:[{role:'user',content:[{type:'input_file',filename:filename||'paper.pdf',file_data:fileData,detail:'low'},{type:'input_text',text:'Return ONLY one valid JSON object, with no Markdown and no explanation. Keys: title (string), authors (string), doi (string), arxiv (string), abstract (string), tags (array of 3 to 8 short strings), contribution (string). Do not invent missing metadata; use empty strings or empty arrays.'}]}]})});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||`OpenAI request failed (${response.status})`);const text=data.output_text||data.output?.map(x=>x.content?.map(c=>c.text).join('')).filter(Boolean).join('')||'';const parsed=parseModelJson(text,filename);res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(parsed))}catch(error){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:`PDF extraction failed: ${error.message}`}))}});return;
  }
  if(req.method==='POST' && req.url==='/api/extract-source'){
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',async()=>{try{const {url}=JSON.parse(body);const match=String(url||'').match(/arxiv\.org\/(?:abs|pdf)\/([^?#/]+)/i);if(!match)throw new Error('Only arXiv URLs are supported for automatic metadata right now');const id=match[1].replace(/\.pdf$/i,'');const xml=await (await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`)).text();const entry=xml.match(/<entry>([\s\S]*?)<\/entry>/i)?.[1];if(!entry)throw new Error('arXiv paper not found');const value=tag=>{const m=entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'));return m?m[1].replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim():''};const authors=[...entry.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/gi)].map(x=>x[1].trim()).join(', ');const abstract=value('summary');res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({title:value('title'),authors,abstract,arxiv:id,url:`https://arxiv.org/abs/${id}`,pdfUrl:`https://arxiv.org/pdf/${id}.pdf`,tags:abstract?['arxiv','research']:['arxiv']}))}catch(error){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}))}});return;
  }
  if(req.method==='GET' && req.url.startsWith('/api/arxiv-pdf')){
    (async()=>{try{const target=new URL(req.url,'http://localhost').searchParams.get('url')||'';const match=target.match(/arxiv\.org\/(?:abs|pdf)\/([^?#/]+)/i);if(!match)throw new Error('Invalid arXiv URL');const id=match[1].replace(/\.pdf$/i,'');const dir=path.join(runtime.dataRoot,runtime.environment,'papers');const localPath=path.join(dir,`${id}.pdf`);let pdf;if(fs.existsSync(localPath))pdf=fs.readFileSync(localPath);else{const upstream=await fetch(`https://arxiv.org/pdf/${encodeURIComponent(id)}.pdf`);if(!upstream.ok)throw new Error(`arXiv returned ${upstream.status}`);pdf=Buffer.from(await upstream.arrayBuffer());fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(localPath,pdf)}res.writeHead(200,{'Content-Type':'application/pdf','Cache-Control':'public, max-age=86400'});return res.end(pdf)}catch(error){res.writeHead(502,{'Content-Type':'text/plain'});return res.end(`PDF proxy error: ${error.message}`)}})();return;
  }
  if(req.url.startsWith('/api/'))return runtime.json(res,404,{error:'API route not found. Check the server version.'});
  const incomingPath=decodeURIComponent((req.url||'/').split('?')[0]);
  const requestPath=/^\/(?:inbox|archive|agent|research|skills|papers|notes|folders|boards|views|experiments|repositories)(?:\/[^/]+)?\/?$/.test(incomingPath)?'/index.html':incomingPath;
  const file = assetFile(requestPath === '/' ? 'index.html' : requestPath);
  if (!(file.startsWith(root+path.sep)||file.startsWith(sharedRoot+path.sep)) || /(?:^|\/)(?:data|node_modules|\.git)(?:\/|$)/.test(requestPath) || !/\.(?:html|css|js|ico|png|svg|woff2|woff|ttf)$/.test(file) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  if(path.extname(file)==='.html'){
    const html=fs.readFileSync(file,'utf8').replace(/(src|href)="([^"]+\.(?:js|css))"/g,(all,attribute,asset)=>{
      const assetPath=assetFile(asset);
      return fs.existsSync(assetPath)?attribute+'="'+asset+'?v='+fs.statSync(assetPath).mtimeMs+'"':all;
    });
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    return res.end(html);
  }
  res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache'});
  fs.createReadStream(file).pipe(res);
});
server.once('listening',()=>require('../../scripts/server-scheduler.cjs').start(server,runtime));
server.on('error',error=>{if(error.code==='EADDRINUSE'){console.error(`Port ${port} is already in use. Open http://localhost:${port} or stop the existing server.`);process.exitCode=1}else throw error});
if(require.main===module)server.listen(port, process.env.HOST||'127.0.0.1', ()=>console.log(`Lab Book [${runtime.environment}] running at http://${process.env.HOST||'localhost'}:${server.address().port}`));
module.exports=server;

async function paperRequest(url,body){
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const raw=await response.text();let data;
 try{data=JSON.parse(raw)}catch{throw Error('The server did not return JSON. Restart Lab Book.')}
 if(!response.ok)throw Error(typeof data.error==='string'?data.error:'Unable to save the PDF');
 return data;
}
async function ensureLocalPaper(paper){
 const input=paper.localUrl&&paper.fileId?{fileId:paper.fileId}
  :paper.dataUrl?{fileData:paper.dataUrl}:{url:paper.pdfUrl||paper.url||paper.arxiv||''};
 const saved=await paperRequest('/api/papers/import',input);
 Object.assign(paper,saved);delete paper.dataUrl;save();return saved.localUrl;
}
openPaperSplit=async function(paper){
 const editor=document.querySelector('.editor');if(!editor||!paper)return;
 editor.classList.add('editor-split');editor.querySelector('.paper-side-panel')?.remove();
 const panel=document.createElement('aside');panel.className='paper-side-panel';
 panel.innerHTML='<div class="paper-side-head"><strong></strong><button class="btn ghost" data-annotate>Highlight</button><button class="btn ghost" data-close-local>×</button></div><div class="paper-side-body"><span>Preparing a local copy of the PDF…</span></div>';
 panel.querySelector('strong').textContent=paper.title;editor.append(panel);
 panel.querySelector('[data-close-local]').onclick=()=>{panel.remove();editor.classList.remove('editor-split')};
 const body=panel.querySelector('.paper-side-body');
 try{
  const localUrl=await ensureLocalPaper(paper);if(!panel.isConnected)return;
  await mountPaperReader(body,paper,localUrl);
  panel.querySelector('[data-annotate]').remove();
 }catch(error){
  body.textContent=error.message;
  const retry=document.createElement('button');retry.className='btn ghost';retry.textContent='Retry';
  retry.onclick=()=>openPaperSplit(paper);body.append(retry);
 }
};
// Capture once at window level, before the legacy document handlers.
window.addEventListener('click',async event=>{
 const button=event.target.closest('#saveUnifiedPaper');if(!button)return;
 const modal=button.closest('.modal');
 const fromNote=modal.querySelector('.eyebrow').textContent.includes('NOTE');
 if(modal.querySelector('[data-unified-tab="search"].active')){
  event.preventDefault();event.stopImmediatePropagation();toast('Select a paper from the results');return;
 }
 event.preventDefault();event.stopImmediatePropagation();if(button.disabled)return;
 const existing=state.papers.find(p=>p.id===modal.dataset.existingPaper);
 if(existing){modal.parentElement.remove();if(fromNote){insertPaperEmbed(existing);openPaperSplit(existing)}return}
 const file=modal.querySelector('#unifiedFile').files[0],url=modal.querySelector('#unifiedUrl').value.trim();
 if(!file&&!url){toast('Upload a PDF or paste an arXiv link');return}
 const originalLabel=button.textContent;button.disabled=true;button.textContent='Saving a local copy…';
 try{
  const paper={id:crypto.randomUUID(),title:modal.querySelector('#unifiedTitle').value.trim()||file?.name||url,
   authors:modal.querySelector('#unifiedAuthors').value.trim(),url,tags:modal.querySelector('#unifiedTags').value.split(',').map(x=>x.trim()).filter(Boolean),
   fileName:file?.name||'',highlights:[]};
  let input;
  if(file){
   const fileData=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
   input={fileData};
  }else input={url};
  Object.assign(paper,await paperRequest('/api/papers/import',input));
  state.papers.push(paper);save();
  const wantsGuide=modal.querySelector('#createReadingGuide')?.checked;
  if(wantsGuide){button.textContent='Creating reading guide…';try{await summarizePaperAndSave(paper)}catch(error){toast('Paper saved. Reading guide: '+error.message)}}
  modal.parentElement.remove();
  if(fromNote){insertPaperEmbed(paper);openPaperSplit(paper)}else renderPaperBank();
 }catch(error){toast(error.message);button.disabled=false;button.textContent=originalLabel}
},true);

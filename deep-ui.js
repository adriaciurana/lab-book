state.context=state.context||[];
function normalizeResearchSelections(){
 state.context=state.context.map(item=>{
  if(item.type==='region'&&item.paperId){
   const id=item.regionId||item.id,region=state.papers.find(p=>p.id===item.paperId)?.highlights?.find(h=>h.id===id);
   if(region)return {...item,key:'region:'+item.paperId+':'+id,regionId:id};
  }
  if(item.type==='pdf'){
   const paper=state.papers.find(p=>p.fileName===item.label);
   if(paper)return {key:'paper:'+paper.id,type:'paper',paperId:paper.id,label:paper.title,detail:'Entire paper'};
  }
  return item;
 });
}
function noteBlocks(note){
 const root=document.createElement('div');root.innerHTML=note.content||'';
 root.querySelectorAll('.paper-embed,script,style').forEach(n=>n.remove());
 const nodes=[...root.querySelectorAll('p,h1,h2,h3,h4,h5,h6,blockquote,li,td,th')];
 const blocks=nodes.filter(n=>!n.querySelector('p,blockquote,li,td,th')).map(n=>n.textContent.trim()).filter(Boolean);
 return blocks.length?blocks:note.desc?[note.desc]:[];
}
function contextKey(item){return item.key||[item.type,item.noteId||item.paperId||'',item.regionId||item.blockIndex||item.id||item.label].join(':')}
function contextCandidates(){
 const items=[];
 for(const note of state.notes){
  const blocks=noteBlocks(note);
  items.push({key:'note:'+note.id,type:'note',noteId:note.id,label:note.title,text:blocks.join('\n\n'),detail:'Entire note · '+blocks.length+' blocks'});
  blocks.forEach((text,index)=>items.push({key:'paragraph:'+note.id+':'+index,type:'paragraph',noteId:note.id,blockIndex:index,label:note.title,text,detail:'Paragraph '+(index+1)}));
 }
 for(const paper of state.papers||[]){
  items.push({key:'paper:'+paper.id,type:'paper',paperId:paper.id,label:paper.title,detail:'Entire paper · '+(paper.tags||[]).join(', '),text:paper.abstract||paper.note||''});
  for(const region of paper.highlights||[])items.push({key:'region:'+paper.id+':'+region.id,type:'region',paperId:paper.id,regionId:region.id,label:paper.title,text:region.text,page:'p. '+region.pageNumber,detail:'Highlight · p. '+region.pageNumber});
 }
 for(const old of state.context.filter(c=>c.type==='region'&&!items.some(x=>x.regionId===c.id||x.regionId===c.regionId))){
  items.push({...old,key:contextKey(old),detail:'Saved excerpt'+(old.page?' · '+old.page:'')});
 }
 return items;
}
function contextModal(){
 normalizeResearchSelections();
 document.querySelector('#contextModal')?.remove();
 const modal=document.createElement('div');modal.id='contextModal';modal.className='modal-backdrop';
 modal.innerHTML='<section class="context-picker" role="dialog" aria-modal="true" aria-labelledby="contextPickerTitle"><header><div class="eyebrow">RESEARCH CONTEXT</div><h2 id="contextPickerTitle">Choose what to work with</h2><p class="muted">Combine notes, individual paragraphs, papers, and highlighted regions.</p><button class="context-dismiss" aria-label="Close">×</button></header><nav class="context-picker-tabs"><button data-source-tab="notes" class="active">Notes</button><button data-source-tab="papers">Paper bank</button><button data-source-tab="regions">Highlights</button><button data-source-tab="upload">Upload PDF</button></nav><div class="context-picker-main"><input class="context-filter" placeholder="Search your workspace…" aria-label="Search context"><div class="context-picker-list"></div><div class="context-upload" hidden><label class="context-drop">Upload papers<input type="file" accept="application/pdf" multiple><small>Select one or more PDFs. Files are saved locally and added to your paper bank.</small></label><span class="context-upload-status"></span></div></div><footer><span class="context-selection-count"></span><button class="btn ghost" data-cancel>Cancel</button><button class="btn primary" data-apply>Use selected context</button></footer></section>';
 document.body.append(modal);
 const picked=new Map(state.context.map(item=>[contextKey(item),item]));
 let tab='notes';
 const q=s=>modal.querySelector(s),list=q('.context-picker-list');
 const count=()=>q('.context-selection-count').textContent=picked.size+' sources selected';
 const check=(item,title,sub)=>{
  const label=document.createElement('label');label.className='context-choice';
  const input=document.createElement('input');input.type='checkbox';input.checked=picked.has(item.key);input.dataset.contextKey=item.key;
  input.onchange=()=>{if(input.checked)picked.set(item.key,item);else picked.delete(item.key);count()};
  const main=document.createElement('span'),heading=document.createElement('strong'),detail=document.createElement('small');
  heading.textContent=title;detail.textContent=sub;main.append(heading,detail);label.append(input,main);return label;
 };
 function draw(){
  const query=q('.context-filter').value.trim().toLowerCase();list.replaceChildren();
  q('.context-upload').hidden=tab!=='upload';q('.context-filter').hidden=tab==='upload';
  if(tab==='upload'){count();return}
  const candidates=contextCandidates();
  const matches=item=>(item.label+' '+item.text+' '+item.detail).toLowerCase().includes(query);
  if(tab==='notes'){
   for(const item of candidates.filter(x=>x.type==='note')){
    const children=candidates.filter(x=>x.type==='paragraph'&&x.noteId===item.noteId);
    if(!matches(item)&&!children.some(matches))continue;
    const group=document.createElement('section');group.className='context-note-group';group.append(check(item,item.label,item.detail));
    const details=document.createElement('details'),summary=document.createElement('summary');
    summary.textContent='Choose individual paragraphs ('+children.length+')';details.append(summary);
    for(const child of children.filter(x=>!query||matches(x)))details.append(check(child,child.detail,child.text.slice(0,360)));
    group.append(details);list.append(group);
   }
  }else for(const item of candidates.filter(x=>(tab==='papers'?x.type==='paper':x.type==='region')&&matches(x))){
   const row=document.createElement('div');row.className='context-source-row';
   row.append(check(item,item.label,item.detail+(tab==='regions'?' · '+item.text.slice(0,240):'')));
   if(tab==='papers'){
    const read=document.createElement('button');read.className='text-btn';read.textContent='Read & highlight';
    read.onclick=()=>previewContextPaper(state.papers.find(p=>p.id===item.paperId),()=>{tab='regions';modal.querySelectorAll('[data-source-tab]').forEach(b=>b.classList.toggle('active',b.dataset.sourceTab===tab));draw()});
    row.append(read);
   }
   list.append(row);
  }
  if(!list.children.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=tab==='regions'?'No highlights yet. Select text in a paper reader and click Highlight.':'No matching sources. Create a note or upload a paper.';list.append(empty)}
  count();
 }
 modal.querySelectorAll('[data-source-tab]').forEach(button=>button.onclick=()=>{tab=button.dataset.sourceTab;modal.querySelectorAll('[data-source-tab]').forEach(b=>b.classList.toggle('active',b===button));draw()});
 q('.context-filter').oninput=draw;
 q('.context-dismiss').onclick=q('[data-cancel]').onclick=()=>modal.remove();
 q('[data-apply]').onclick=()=>{
  state.context=[...picked.values()];save();modal.remove();renderContextUI();
 };
 q('input[type=file]').onchange=async event=>{
  const input=event.target,files=[...input.files];input.disabled=true;q('[data-apply]').disabled=true;
  const status=q('.context-upload-status');
  try{
   for(const file of files){
    status.textContent='Saving '+file.name+'…';
    const fileData=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
    const stored=await paperRequest('/api/papers/import',{fileData});
    let paper=state.papers.find(p=>p.fileId===stored.fileId);
    if(!paper){paper={id:crypto.randomUUID(),title:file.name.replace(/\.pdf$/i,''),fileName:file.name,tags:[],highlights:[],...stored};state.papers.push(paper)}
    const item={key:'paper:'+paper.id,type:'paper',paperId:paper.id,label:paper.title,detail:'Entire paper'};
    picked.set(item.key,item);save();
   }
   status.textContent=files.length+' papers ready. Click Use selected context.';count();
  }catch(error){status.textContent=error.message}
  finally{input.disabled=false;q('[data-apply]').disabled=false}
 };
 draw();
}
function renderContextUI(){
 const search=document.querySelector('.search-page');if(!search?.querySelector('.search-box'))return;
 let panel=search.querySelector('.context-panel');
 if(!panel){
  panel=document.createElement('section');panel.className='context-panel';
  panel.innerHTML='<div class="context-panel-head"><strong>Research context</strong><button class="text-btn" id="addContext">＋ Choose sources</button></div><div class="context-sources"></div><div class="skill-launcher"><span>✣</span><select id="activeSkill"><option value="">No skill selected</option></select><label><input type="checkbox" id="includeWeb"> Include web search</label></div><div class="ask-context"><input id="contextQuestion" placeholder="Ask about your selected notes, papers, or highlights…"><button class="btn primary" id="askContext">Ask context</button></div>';
  panel.querySelector('#activeSkill').setAttribute('aria-label','Research skill');
  for(const skill of skills){const option=document.createElement('option');option.value=skill[0];option.textContent=skill[1];panel.querySelector('select').append(option)}
  search.querySelector('.search-box').before(panel);
  panel.querySelector('#addContext').onclick=()=>{contextModal();document.querySelector('#contextModal').classList.add('open')};
  panel.querySelector('#askContext').onclick=()=>{const question=panel.querySelector('#contextQuestion').value.trim();if(question){document.querySelector('#searchInput').value=question;proxySearch()}};
  panel.querySelector('#contextQuestion').onkeydown=event=>{if(event.key==='Enter')panel.querySelector('#askContext').click()};
 }
 const sources=panel.querySelector('.context-sources'),signature=JSON.stringify(state.context);
 if(sources.dataset.signature===signature)return;sources.dataset.signature=signature;sources.replaceChildren();
 if(!state.context.length){const empty=document.createElement('span');empty.className='muted';empty.textContent='Select whole notes and papers, or just the passages you need.';sources.append(empty)}
 state.context.forEach((item,index)=>{
  const chip=document.createElement('span');chip.className='context-chip';
  const label=document.createElement('span');label.textContent=(item.type==='paragraph'?'Paragraph · ':item.type==='region'?'Highlight · ':item.type==='note'?'Note · ':'Paper · ')+item.label+(item.page?' · '+item.page:'');
  const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label','Remove '+item.label);
  remove.onclick=()=>{state.context.splice(index,1);save();renderContextUI()};chip.append(label,remove);sources.append(chip);
 });
}
async function resolveResearchContext(){
 normalizeResearchSelections();
 const resolved=[];
 for(const selected of state.context){
  const source={...selected};
  if(source.type==='note'){
   const note=state.notes.find(n=>n.id===source.noteId);if(!note)throw Error('A selected note no longer exists. Remove it from context.');
   source.label=note.title;source.text=noteBlocks(note).join('\n\n');
  }else if(source.type==='paragraph'){
   if(!state.notes.some(n=>n.id===source.noteId))throw Error('The note for a selected paragraph no longer exists.');
   // Keep the exact passage the user selected, even if other paragraphs are reordered.
  }else if(source.type==='paper'){
   const paper=state.papers.find(p=>p.id===source.paperId);if(!paper)throw Error('A selected paper no longer exists.');
   if(paper.kind==='repository'){source.type='reference';source.text=[paper.abstract,paper.guide?.overview,...(paper.guide?.methodSteps||[])].filter(Boolean).join('\n');resolved.push(source);continue}
   const url=await ensureLocalPaper(paper),lib=localPdfLibrary||await import('/vendor/pdf.mjs');
   lib.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.mjs';
   const document=await lib.getDocument({url}).promise;
   try{
    const pages=[];
    for(let number=1;number<=document.numPages;number++){const page=await document.getPage(number),text=await page.getTextContent();pages.push('[Page '+number+']\n'+text.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join(''))}
    source.text=pages.join('\n\n');source.label=paper.title;
    if(source.text.replace(/\[Page \d+\]/g,'').trim().length<20)throw Error('This PDF has no readable text. Add text excerpts or an OCR version.');
   }finally{document.destroy()}
  }else if(source.type==='region'&&source.paperId&&source.regionId){
   const paper=state.papers.find(p=>p.id===source.paperId),region=paper?.highlights?.find(h=>h.id===source.regionId);
   if(!region)throw Error('A selected highlight no longer exists. Choose another region.');
   source.text=region.text;source.page='p. '+region.pageNumber;
  }
  resolved.push(source);
 }
 if(resolved.reduce((size,c)=>size+(c.text||'').length,0)>500000)throw Error('The selected context is too large. Choose fewer sources or specific passages.');
 return resolved;
}
proxySearch=async function(){
 const input=document.querySelector('#searchInput'),results=document.querySelector('#results'),query=input?.value.trim();if(!query)return;
 results.textContent='Preparing selected context…';document.querySelector('#askContext').disabled=true;
 try{
  const context=await resolveResearchContext(),skill=skills.find(s=>s[0]===document.querySelector('#activeSkill').value);
  const response=await fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,context,skill:skill?.[4]||'',webSearch:document.querySelector('#includeWeb').checked||!context.length})});
  const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{throw Error('Unexpected server response. Restart the server and retry.')}
  if(!response.ok)throw Error(data.error?.message||data.error||'Research request failed');
  const answer=data.output_text||data.output?.flatMap(o=>o.content||[]).map(c=>c.text||'').join('\n')||'No response returned.';
  results.replaceChildren();const article=document.createElement('article');article.className='context-answer';article.textContent=answer;results.append(article);
 }catch(error){results.textContent=error.message}
 finally{document.querySelector('#askContext').disabled=false}
};
const contentObserver=new MutationObserver(renderContextUI);
contentObserver.observe(document.querySelector('#content'),{childList:true,subtree:true});
async function previewContextPaper(paper,onClose){
 const overlay=document.createElement('div');overlay.className='modal-backdrop open';
 overlay.innerHTML='<section class="context-preview"><header><strong></strong><button class="btn primary" data-pick-highlights>Choose highlights</button><button class="btn ghost" data-close-preview>×</button></header><div class="paper-side-body">Preparing local paper…</div></section>';
 overlay.querySelector('strong').textContent=paper.title;document.body.append(overlay);
 overlay.querySelector('[data-close-preview]').onclick=()=>overlay.remove();
 overlay.querySelector('[data-pick-highlights]').onclick=()=>{overlay.remove();onClose()};
 const body=overlay.querySelector('.paper-side-body');
 try{await mountPaperReader(body,paper,await ensureLocalPaper(paper))}catch(error){body.textContent=error.message}
}

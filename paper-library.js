const escapeLibrary=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let libraryQuery='',libraryCollection='All',libraryTag='All';
const libraryTopics=['All','LLMs','VLMs','Video generation','RL & alignment','Diffusion'];
renderPaperBank=function(){
 currentView='papers';document.querySelector('#breadcrumbs').textContent='Paper bank';
 const papers=(state.papers||[]).filter(p=>(libraryCollection==='All'||(p.collections||[]).includes(libraryCollection))&&(libraryTag==='All'||(p.tags||[]).includes(libraryTag))&&[p.title,p.authors,p.arxiv,...(p.tags||[])].join(' ').toLowerCase().includes(libraryQuery.toLowerCase())).sort((a,b)=>(a.readingOrder||999)-(b.readingOrder||999));
 const tags=[...new Set((state.papers||[]).flatMap(p=>p.tags||[]))].sort();
 document.querySelector('#content').innerHTML='<div class="paper-bank"><div class="eyebrow">YOUR RESEARCH LIBRARY</div><h1 class="page-title">Understand. Then go deeper.</h1><p class="page-subtitle">Foundations, practical model reports, and current research. Open a reading guide or read the original paper.</p><div class="paper-toolbar"><input id="paperSearch" placeholder="Search titles, authors, tags, or arXiv…" value="'+escapeLibrary(libraryQuery)+'"><button class="btn primary" id="addPaper">＋ Add paper</button></div><div class="library-collections">'+libraryTopics.map(t=>'<button data-library-topic="'+escapeLibrary(t)+'" class="'+(t===libraryCollection?'active':'')+'">'+escapeLibrary(t)+'</button>').join('')+'</div><div class="library-list-head"><span>'+papers.length+' papers · '+papers.filter(p=>p.guide).length+' reading guides</span><select id="libraryTag"><option value="All">All tags</option>'+tags.map(t=>'<option '+(t===libraryTag?'selected':'')+'>'+escapeLibrary(t)+'</option>').join('')+'</select></div><div class="paper-list">'+papers.map(p=>'<article class="paper-card"><div class="paper-card-icon">▧</div><main><a class="paper-title-link" href="/papers/'+encodeURIComponent(p.id)+'"><h3>'+escapeLibrary(p.title)+'</h3></a><p>'+escapeLibrary((p.authors||'').length>170?(p.authors||'').slice(0,170)+'…':p.authors)+'</p><p>'+escapeLibrary(p.guide?.overview||p.curatorNote||p.abstract?.slice(0,210)||'Open this paper to read, annotate, or create a reading guide.')+'</p><div class="paper-meta">'+(p.tags||[]).slice(0,6).map(t=>'<span class="tag">'+escapeLibrary(t)+'</span>').join('')+(p.guide?'<span class="tag lime">Reading guide</span>':'')+(p.fileId?'<span class="tag blue">Local PDF</span>':'')+'</div></main><div class="paper-actions"><a class="btn ghost" href="/papers/'+encodeURIComponent(p.id)+'">'+(p.guide?'Read guide':'Open')+' →</a><button data-cite-paper="'+escapeLibrary(p.id)+'" title="Create a linked note">↗</button><button data-delete-library-paper="'+escapeLibrary(p.id)+'" title="Remove from library">×</button></div></article>').join('')+(papers.length?'':'<div class="empty">No matching papers.</div>')+'</div></div>';
 const search=document.querySelector('#paperSearch');search.oninput=()=>{libraryQuery=search.value;const position=search.selectionStart;renderPaperBank();const next=document.querySelector('#paperSearch');next.focus();next.setSelectionRange(position,position)};
 document.querySelector('#addPaper').onclick=openPaperBankModal;
 document.querySelectorAll('[data-library-topic]').forEach(b=>b.onclick=()=>{libraryCollection=b.dataset.libraryTopic;renderPaperBank()});
 document.querySelector('#libraryTag').onchange=e=>{libraryTag=e.target.value;renderPaperBank()};
 document.querySelectorAll('[data-delete-library-paper]').forEach(b=>b.onclick=()=>{if(confirm('Remove this paper from the library? Notes and local PDF files will be kept.')){state.papers=state.papers.filter(p=>p.id!==b.dataset.deleteLibraryPaper);save();renderPaperBank()}});
 if(typeof syncWorkspaceRoute==='function')syncWorkspaceRoute('/papers');
};
async function summarizePaperAndSave(paper,{refresh=false}={}){
 const guide=await paperRequest('/api/papers/summary',{paper,refresh});
 paper.guide=guide;save();return guide;
}
function renderPaperDetail(id){
 const paper=state.papers.find(p=>p.id===id);
 if(!paper){document.querySelector('#content').innerHTML='<div class="page-wrap"><h1>Paper not found</h1><a href="/papers">Back to library</a></div>';return}
 if(new URLSearchParams(location.search).get('reader')==='1'){renderDetachedPaperReader(paper);return}
 currentView='paper';window.currentPaperId=id;document.querySelector('#breadcrumbs').textContent='Paper bank / '+paper.title;
 const spanishGuide=paper.guide?.language==='es',guideLabels={'The short version':'Resumen rápido','Problem being solved':'Qué problema resuelve','Intuition before equations':'Intuición antes de las ecuaciones','How the method works':'Cómo funciona','Main contributions':'Contribuciones principales','Reported results':'Resultados declarados por los autores','Limitations & caveats':'Limitaciones y precauciones','What to know first':'Qué conviene saber antes','Suggested reading path':'Orden de lectura sugerido','When this is useful':'Cuándo resulta útil','Related topics':'Temas relacionados'};
 const section=(title,value)=>!value?'':'<section class="guide-section"><h3>'+(spanishGuide?(guideLabels[title]||title):title)+'</h3>'+(Array.isArray(value)?'<ul>'+value.map(v=>'<li>'+escapeLibrary(v)+'</li>').join('')+'</ul>':'<p>'+escapeLibrary(value)+'</p>')+'</section>';
 const g=paper.guide;
 document.querySelector('#content').innerHTML='<div class="paper-detail"><a class="text-btn" href="/papers">← Paper bank</a><div class="eyebrow">'+escapeLibrary((paper.collections||paper.tags||[]).slice(0,3).join(' / '))+'</div><h1>'+escapeLibrary(paper.title)+'</h1><p class="muted">'+escapeLibrary(paper.authors)+'</p><div class="paper-detail-actions"><button class="btn primary" id="readLocalPdf">Read & highlight PDF</button><button class="btn ghost" id="generateGuide">'+(g?'Refresh reading guide':'Create simple reading guide')+'</button><button class="btn ghost" data-cite-paper="'+escapeLibrary(paper.id)+'">Write a linked note</button><a class="text-btn" href="'+escapeLibrary(paper.url||'#')+'" target="_blank" rel="noopener">Original source ↗</a></div><p class="guide-status" aria-live="polite">'+(g?'Guide generated from '+escapeLibrary(g.sourceScope)+'. '+escapeLibrary(g.pageCount)+' pages. Check the original paper for details.':'Optional: create an accessible explanation of the problem, method, findings, limitations, and prerequisites.')+'</p><div id="paperDetailReader" hidden></div><div class="guide-layout">'+(g?section('The short version',g.overview)+section('Problem being solved',g.problem)+section('Intuition before equations',g.intuition)+section('How the method works',g.methodSteps)+section('Main contributions',g.contributions)+section('Reported results',g.results)+section('Limitations & caveats',g.limitations)+section('What to know first',g.prerequisites)+section('Suggested reading path',g.readingTips)+section('When this is useful',g.whoShouldRead)+section('Related topics',g.relatedTopics):section('Abstract',paper.abstract||'No abstract saved yet.'))+'</div></div>';
 document.querySelector('#generateGuide').onclick=async event=>{
  const button=event.target;button.disabled=true;button.textContent='Creating reading guide…';const status=document.querySelector('.guide-status');
  try{await summarizePaperAndSave(paper,{refresh:!!g});renderPaperDetail(paper.id)}catch(error){status.textContent=error.message;button.disabled=false;button.textContent='Retry reading guide'}
 };
 document.querySelector('#readLocalPdf').onclick=async event=>{
  const host=document.querySelector('#paperDetailReader');if(!host.hidden){host.hidden=true;event.target.textContent='Read & highlight PDF';return}
  host.hidden=false;host.className='paper-side-body';host.textContent='Preparing local PDF…';event.target.textContent='Hide PDF';
  try{await mountPaperReader(host,paper,await ensureLocalPaper(paper))}catch(error){host.textContent=error.message}
 };
 if(paper.kind==='repository'){
  const read=document.querySelector('#readLocalPdf');read.textContent='Open official project ↗';read.onclick=()=>window.open(paper.url,'_blank','noopener');
  document.querySelector('#generateGuide').hidden=true;
  document.querySelector('.guide-status').textContent='Curated guide to official release documentation. This entry is not a separate research paper.';
 }
 if(typeof syncWorkspaceRoute==='function')syncWorkspaceRoute('/papers/'+encodeURIComponent(id));
}
const unifiedBeforeGuides=openUnifiedPaperModal;
openUnifiedPaperModal=function(...args){
 unifiedBeforeGuides(...args);
 const input=document.querySelector('#unifiedFile');if(!input||input.closest('.modal').querySelector('#createReadingGuide'))return;
 const label=document.createElement('label');label.className='summary-upload-choice';
 label.innerHTML='<input type="checkbox" id="createReadingGuide"><span>Create a simple reading guide<small>Optional AI explanation: intuition, method, key findings, limitations, and what to read first.</small></span>';
 input.parentElement.after(label);
};

async function renderDetachedPaperReader(paper){
 currentView='paper';window.currentPaperId=paper.id;
 document.body.classList.add('detached-paper-reader');
 document.title=paper.title+' · Lab Book';
 const content=document.querySelector('#content');
 content.innerHTML='<section class="detached-reader-layout"><header><strong>'+escapeLibrary(paper.title)+'</strong><a href="/papers/'+encodeURIComponent(paper.id)+'">Paper details →</a></header><div class="paper-side-body" id="detachedReader">Loading local PDF…</div></section>';
 const host=document.querySelector('#detachedReader');
 try{await mountPaperReader(host,paper,await ensureLocalPaper(paper))}catch(error){host.textContent=error.message}
}

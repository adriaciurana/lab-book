(function(root){
 const kinds=['page','paper','highlight','board','task','experiment','repository','branch'];
 function parse(actions){if(!Array.isArray(actions)||actions.length>30)throw Error('Use at most 30 proposed changes');const ids=new Set();return actions.map(a=>{if(!a.id||ids.has(a.id)||!kinds.includes(a.kind))throw Error('Invalid or duplicate proposal');ids.add(a.id);let data;try{data=typeof a.dataJson==='string'?JSON.parse(a.dataJson):structuredClone(a.data)}catch{throw Error('The agent returned malformed fields for '+a.kind+'. Please retry; no workspace changes were applied.')}if(a.kind==='experiment'&&data)for(const field of ['metrics','config'])if(Array.isArray(data[field])){const entries=data[field];if(entries.some(e=>!e||typeof e.key!=='string')||new Set(entries.map(e=>e.key)).size!==entries.length)throw Error('Invalid '+field+' entries');data[field]=Object.fromEntries(entries.map(e=>[e.key,e.value]))}if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid proposal fields');return {...a,data}})}
 function destination(state,data,pending=new Set()){
  const key=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  let parent=null,parentId=data.parentNoteId||null;
  if(parentId){parent=(state.notes||[]).find(n=>n.id===parentId);if(!parent&&!pending.has(parentId)){let matches=(state.notes||[]).filter(n=>key(n.title)===key(parentId));if(!matches.length)matches=(state.notes||[]).filter(n=>key(n.title.split(/[—–]/)[0])===key(parentId));if(matches.length!==1)throw Error('Choose a destination page: "'+parentId+'" is missing or ambiguous.');parent=matches[0];parentId=parent.id}}
  if(parent)return {parentNoteId:parent.id,folder:parent.folder};
  let folder=(state.folders||[]).find(f=>f.id===(data.folder||'inbox'));if(!folder&&data.folder){const matches=(state.folders||[]).filter(f=>key(f.name)===key(data.folder));if(matches.length===1)folder=matches[0]}
  if(!folder&&parentId&&pending.has(parentId))folder=(state.folders||[]).find(f=>f.id==='inbox');
  if(!folder)throw Error('Choose a destination collection: "'+data.folder+'" does not exist.');return {parentNoteId:parentId,folder:folder.id};
 }
 function sourcePaper(state,reference,sources={}){
  const canonical=value=>{try{const url=new URL(value);if(url.protocol!=='https:')return null;for(const key of [...url.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$/i.test(key))url.searchParams.delete(key);return url.href}catch{return null}};
  const existing=(state.papers||[]).find(p=>p.id===reference||p.externalId===reference);if(existing)return {paper:existing};
  const urls=[...(sources.messages||[]).filter(m=>m.role==='user').flatMap(m=>String(m.text||'').match(/https?:\/\/[^\s<>"\)]+/g)||[]),...(sources.context||[]).map(c=>c.url).filter(Boolean)];
  const values=[...new Set(urls.map(canonical).filter(Boolean))];const tokens=String(reference).toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>2&&!['technical','report','paper','research','pdf','arxiv'].includes(t));const direct=canonical(reference);const candidates=values.filter(url=>url===direct||(tokens.length&&tokens.every(token=>url.toLowerCase().includes(token))));if(candidates.length!==1)return null;const url=candidates[0],known=(state.papers||[]).find(p=>canonical(p.url)===url);if(known)return {paper:known};const filename=decodeURIComponent(new URL(url).pathname.split('/').pop()||reference);return {url,title:filename.replace(/\.pdf$/i,'').replace(/[_-]+/g,' ')};
 }
 function prepare(state,actions,chosen,uuid,resolved={},sources={}){
  const selected=parse(actions).filter(a=>chosen.includes(a.id)),next=structuredClone(state),ids=new Map([...Object.entries(resolved),...selected.map(a=>[a.id,uuid()])]),created=[];
  const ref=id=>id?(ids.get(String(id).replace(/^proposal:/,''))||id):null;
  const paperKey=url=>{const value=String(url||'');const match=value.match(/arxiv\.org\/(?:abs|pdf|html)\/(.+?)(?:\.pdf)?(?:[?#]|$)/i);return match?'arxiv:'+match[1].replace(/v\d+$/,''):value.replace(/\/$/,'')};
  const text=(v,fallback='')=>typeof v==='string'?v:fallback;
  const escape=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function markdown(value){return (typeof module!=='undefined'&&module.exports?require('./rich-text.js'):root.RichText).render(value)}
  for(const key of ['notes','papers','boards','tasks','experiments','repositories','branches'])next[key]||=[];
  const order=['page','repository','paper','board','branch','task','experiment','highlight'];
  for(const kind of order)for(const a of selected.filter(a=>a.kind===kind)){
   const d=a.data,id=ids.get(a.id);let row,collection;
   if(kind==='page'){const target=destination(next,{parentNoteId:ref(d.parentNoteId),folder:d.folder},new Set(ids.values()));const folder=target.folder;row={id,title:text(d.title,'Untitled page'),content:markdown(d.contentMarkdown),folder,parentNoteId:target.parentNoteId,type:'file',tag:'draft',draft:true,versions:[],boardIds:[],createdAt:new Date().toISOString()};collection='notes'}
   if(kind==='repository'){row={id,name:text(d.name),url:text(d.url),defaultBranch:text(d.defaultBranch,'main')};collection='repositories'}
   if(kind==='paper'){const attachment=d.attachmentId&&(state.context||[]).find(c=>c.attachmentId===d.attachmentId&&c.mime==='application/pdf');if(!/^https?:\/\//.test(d.url||'')&&!attachment)throw Error('A paper requires a source URL or selected PDF attachment');const found=next.papers.find(p=>(d.url&&paperKey(p.url)===paperKey(d.url))||(attachment&&p.attachmentId===attachment.attachmentId));if(found){ids.set(a.id,found.id);created.push({...a,id:found.id,collection:'papers',reused:true});continue}row={id,title:text(d.title),authors:text(d.authors),url:d.url||'',attachmentId:attachment?.attachmentId,tags:Array.isArray(d.tags)?d.tags:[],highlights:[]};collection='papers'}
   if(kind==='board'){row={id,name:text(d.name),columns:d.columns||['Backlog','In progress','Review','Done'],noteId:ref(d.noteId)};collection='boards'}
   if(kind==='branch'){row={id,name:text(d.name),repoId:ref(d.repoId),parentId:ref(d.parentId),prStatus:d.prStatus||'none',prUrl:text(d.prUrl)};collection='branches'}
   if(kind==='task'){row={id,text:text(d.text),board:ref(d.board),col:text(d.col),noteId:ref(d.noteId),parentId:ref(d.parentId),type:d.type||'task',tag:text(d.tag,'research')};collection='tasks'}
   if(kind==='experiment'){row={id,name:text(d.name),status:d.status||'planned',noteId:ref(d.noteId),taskId:ref(d.taskId),repoId:ref(d.repoId),branchId:ref(d.branchId),metrics:d.metrics||{},config:d.config||{},machine:text(d.machine),cluster:text(d.cluster),runUrl:text(d.runUrl)};collection='experiments'}
   if(kind==='highlight'){const paper=next.papers.find(p=>p.id===ref(d.paperId));if(!paper)throw Error('Select the paper required by this highlight');if(!text(d.quote).trim())throw Error('Highlights require a verbatim quote');created.push({...a,id,paperId:paper.id,noteId:ref(d.noteId),quote:d.quote,pageNumber:d.pageNumber});continue}
   if(row){next[collection].push(row);created.push({...a,id,collection})}
  }
  // Link references only after every selected entity has been allocated.
  for(const a of selected){const d=a.data;if(a.kind==='board'&&d.noteId){const page=next.notes.find(n=>n.id===ref(d.noteId));if(page)page.boardIds=[...new Set([...(page.boardIds||[]),ref(a.id)])]}
   const links=a.kind==='page'?(d.paperIds||[]):a.kind==='paper'&&d.noteId?[a.id]:[];const page=next.notes.find(n=>n.id===ref(a.kind==='page'?a.id:d.noteId));for(const paperId of links){let paper=next.papers.find(p=>p.id===ref(paperId));if(!paper){const source=sourcePaper(next,paperId,sources);if(source?.paper)paper=source.paper;else if(source?.url){paper={id:uuid(),externalId:paperId,title:source.title,url:source.url,tags:[],authors:'',highlights:[],metadataSource:'user-url'};next.papers.push(paper);created.push({kind:'paper',id:paper.id,collection:'papers',sourceURL:true})}}if(!page)throw Error('Select the referenced page and paper together');if(!paper){const proposed=actions.find(action=>action.kind==='paper'&&action.id===String(paperId).replace(/^proposal:/,''));if(proposed)throw Error('Select the proposed paper '+paperId+' together with its page, or remove that reference.');page.pendingPaperReferences=[...new Set([...(page.pendingPaperReferences||[]),String(paperId)])];page.content+='<p class="unresolved-paper-reference" data-missing-paper-id="'+escape(String(paperId))+'">Pending paper reference: '+escape(String(paperId))+'. This source is not in the paper bank yet.</p>';page.draft=true;continue}page.content+='<div class="paper-embed" contenteditable="false" data-paper-id="'+escape(paper.id)+'"><strong>'+escape(paper.title)+'</strong><span>Open paper →</span></div>';page.draft=true;page.updatedAt=new Date().toISOString()}
  }
  for(let pass=0;pass<selected.length;pass++)for(const a of selected.filter(a=>a.kind==='page')){const n=next.notes.find(n=>n.id===ref(a.id)),parent=next.notes.find(p=>p.id===n.parentNoteId);if(parent)n.folder=parent.folder}
  const model=typeof module!=='undefined'&&module.exports?require('./research-model.js'):root.ResearchModel;model.validate(next);return {next,created,entityIds:Object.fromEntries(ids)};
 }
 const api={kinds,parse,prepare,destination,sourcePaper};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AgentProposals=api;
})(typeof window!=='undefined'?window:globalThis);

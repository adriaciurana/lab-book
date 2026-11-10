let applyingRoute=false;
function renderPublishedNote(note){
 if(!flushDraft())return;
 bodyChanges.disconnect();clearInterval(collabTimer);activeBody=null;activeNoteId=note.id;
 currentFolder=note.folder||'inbox';currentView='note';
 const published=note.published||note.versions?.at(-1)||(note.draft?null:{title:note.title,content:note.content});
 const page=document.createElement('article');page.className='editor note-reader';page.dataset.noteId=note.id;
 const tools=document.createElement('div');tools.className='editor-tools';const edit=document.createElement('button');edit.className='btn primary';edit.id='editPublishedNote';edit.textContent='Edit';edit.onclick=()=>openEditor(state.notes.find(n=>n.id===note.id));tools.append(edit);
 const title=document.createElement('h1');title.className='page-title';title.textContent=published?.title||note.title;
 const status=document.createElement('p');status.className='muted';status.textContent=published?'Published version':'This page has not been published yet. Open Edit to continue your draft.';
 const body=document.createElement('div');body.className='editor-body';body.contentEditable='false';body.innerHTML=published?.content||'';
 body.querySelectorAll('[contenteditable]').forEach(el=>el.contentEditable='false');
 if(body.firstElementChild?.tagName==='H1'&&body.firstElementChild.textContent.trim()===title.textContent.trim())body.firstElementChild.remove();
 body.querySelectorAll('[data-architecture]').forEach(block=>{try{block.replaceChildren(architectureFrame(decodeURIComponent(block.dataset.architecture)))}catch{}});
 const children=document.createElement('section');children.className='page-relations';children.setAttribute('aria-label','Child pages');
 const childHead=document.createElement('div');childHead.className='section-head';const childTitle=document.createElement('strong');childTitle.textContent='Pages';const addChild=document.createElement('button');addChild.className='text-btn';addChild.textContent='+ Add page';addChild.onclick=()=>openWorkspaceCreateMenu(note.id,addChild);childHead.append(childTitle,addChild);children.append(childHead);
 const parent=state.notes.find(n=>n.id===note.parentNoteId);if(parent){const up=document.createElement('a');up.className='page-parent';up.href='/notes/'+encodeURIComponent(parent.id);up.textContent='← '+parent.title;children.prepend(up)}
 const childLinks=document.createElement('div');childLinks.className='page-related-links';for(const child of state.notes.filter(n=>n.parentNoteId===note.id&&(typeof lifecycleArchived!=='function'||!lifecycleArchived('notes',n.id)))){const a=document.createElement('a');a.href='/notes/'+encodeURIComponent(child.id);a.textContent=child.published?.title||child.title;childLinks.append(a)}if(!childLinks.childElementCount){const empty=document.createElement('small');empty.className='muted';empty.textContent='This page can contain other pages. Add a document or a research stream.';childLinks.append(empty)}children.append(childLinks);
 page.append(tools,title,status,children,body);document.querySelector('#content').replaceChildren(page);
 document.querySelector('#breadcrumbs').textContent=title.textContent;revealWorkspaceNote(note);renderFolders();syncWorkspaceRoute('/notes/'+encodeURIComponent(note.id));
 const url=new URL(location.href);if(url.searchParams.has('edit')){url.searchParams.delete('edit');history.replaceState({},'',url.pathname+url.search)}
}
function syncWorkspaceRoute(path,replace=false){
 if(applyingRoute)return;
 const url=new URL(location.href);url.pathname=path;url.searchParams.delete('paper');
 if(!path.startsWith('/notes/'))url.searchParams.delete('edit');
 if(!/^\/(boards|views)(\/|$)/.test(path))for(const key of ['project','stream','tag','type','q'])url.searchParams.delete(key);
 if(path!=='/experiments')url.searchParams.delete('page');
 if(path!=='/experiments'&&path!=='/repositories'){url.searchParams.delete('branch');url.searchParams.delete('repo')}
 if(url.pathname===location.pathname&&url.search===location.search)return;
 history[replace?'replaceState':'pushState']({},'',url.pathname+url.search);
 document.title='Lab Book · '+(document.querySelector('#breadcrumbs')?.textContent||'Workspace');
}
const editorBeforeRoutes=openEditor;
openEditor=function(note){editorBeforeRoutes(note);if(!document.querySelector('.editor .title'))return;syncWorkspaceRoute('/notes/'+encodeURIComponent(activeNoteId));
 const editUrl=new URL(location.href);editUrl.searchParams.set('edit','1');history.replaceState({},'',editUrl.pathname+editUrl.search);
 const tools=document.querySelector('.editor-tools');
 if(!tools.querySelector('[data-copy-note-link]')){const button=document.createElement('button');button.className='tool-btn';button.dataset.copyNoteLink='';button.textContent='Copy link';button.onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('Note link copied')}catch{toast(location.href)}};tools.append(button)}
};
for(const [name,path]of [['renderSearch','/agent'],['renderSkills','/skills']]){
 const original=window[name];window[name]=function(...args){const result=original(...args);syncWorkspaceRoute(path);return result};
}
const inboxBeforeRoutes=renderInbox;
renderInbox=function(){inboxBeforeRoutes();syncWorkspaceRoute(currentFolder==='inbox'?'/inbox':'/folders/'+encodeURIComponent(currentFolder))};
const boardBeforeRoutes=renderBoard;
renderBoard=function(){boardBeforeRoutes();syncWorkspaceRoute('/boards'+(state.boards.find(b=>b.id===activeBoard)?'/'+encodeURIComponent(activeBoard):''))};
const renderBeforeRoutes=render;
render=function(){
 const result=currentView==='note'?renderPublishedNote(state.notes.find(n=>n.id===activeNoteId)):currentView==='paper'?renderPaperDetail(window.currentPaperId):renderBeforeRoutes();
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===(currentView==='paper'?'papers':currentView==='board-view'?'board':currentView)));
 return result;
};
async function applyWorkspaceRoute(){
 if(typeof flushDraft==='function'&&!flushDraft())return;
 applyingRoute=true;
 try{
  document.body.classList.toggle('detached-paper-reader',new URLSearchParams(location.search).get('reader')==='1'&&location.pathname.startsWith('/papers/'));
  const parts=location.pathname.split('/').filter(Boolean).map(decodeURIComponent),section=parts[0]||(LABBOOK_ENV==='production'?'papers':'inbox'),id=parts[1];
  if(section==='notes'&&id){const note=state.notes.find(n=>n.id===id);if(!note)throw Error('This note does not exist');currentFolder=note.folder||'inbox';currentView='inbox';renderFolders();if(new URLSearchParams(location.search).get('edit')==='1')openEditor(note);else renderPublishedNote(note)}
  else if(section==='folders'&&id){const folder=state.folders.find(f=>f.id===id);if(!folder)throw Error('This folder does not exist');currentFolder=id;if(id==='inbox'){currentView='inbox';render()}else{const note=workspaceFolderPage(folder);if(note)renderPublishedNote(note)}}
  else if(section==='papers'&&id){renderPaperDetail(id)}
  else if(section==='boards'){readTaskBoardFilters();if(id&&!state.boards.some(b=>b.id===id))throw Error('This board does not exist');activeBoard=id||state.boards[0]?.id;currentView='board';render()}
  else if(section==='views'){readTaskBoardFilters();if(id&&!state.boardViews.some(v=>v.id===id))throw Error('This combined view does not exist');window.activeBoardView=id||state.boardViews[0]?.id;currentView='board-view';render()}
  else if(section==='experiments'||section==='repositories'){if(section==='experiments'){const url=new URL(location.href);window.hubExperimentPage=url.searchParams.get('page')||'';window.hubExperimentBranch=url.searchParams.get('branch')||''}currentView=section;render()}
  else{const views={archive:'archive',inbox:'inbox',agent:'search',research:'search',skills:'skills',papers:'papers'};if(!views[section])throw Error('Page not found');currentView=views[section];if(section==='inbox')currentFolder='inbox';render()}
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===(currentView==='paper'?'papers':currentView==='board-view'?'board':currentView)));
  if(!parts.length){const u=new URL(location.href);u.pathname='/'+section;history.replaceState({},'',u.pathname+u.search)}
 }catch(error){const page=document.createElement('div');page.className='page-wrap';const title=document.createElement('h1');title.textContent=error.message;const link=document.createElement('a');link.href='/inbox';link.textContent='Back to workspace';page.append(title,link);document.querySelector('#content').replaceChildren(page)}
 finally{applyingRoute=false}
}
document.addEventListener('click',event=>{
 if(event.target.closest('.lifecycle-options'))return;const row=event.target.closest('[data-note]');if(row&&!row.closest('.editor')&&!event.target.closest('a[href]')){const note=state.notes.find(n=>n.id===row.dataset.note);if(note){event.preventDefault();event.stopImmediatePropagation();renderPublishedNote(note);return}}
},true);
document.addEventListener('click',event=>{
 const anchor=event.target.closest('a[href]');if(!anchor||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0||anchor.target==='_blank'||anchor.hasAttribute('download'))return;
 const url=new URL(anchor.href);if(url.origin!==location.origin||!/^\/(?:inbox|archive|agent|research|skills|papers|notes|folders|boards|views|experiments|repositories)(?:\/|$)/.test(url.pathname))return;
 event.preventDefault();if(!flushDraft())return;
 const current=new URL(location.href);if(current.searchParams.has('isolated'))url.searchParams.set('isolated','1');
 history.pushState({},'',url.pathname+url.search);applyWorkspaceRoute();
});
window.addEventListener('popstate',applyWorkspaceRoute);
applyWorkspaceRoute();

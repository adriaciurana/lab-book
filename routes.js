let applyingRoute=false;
function syncWorkspaceRoute(path,replace=false){
 if(applyingRoute)return;
 const url=new URL(location.href);url.pathname=path;url.searchParams.delete('paper');
 if(!/^\/(boards|views)(\/|$)/.test(path))for(const key of ['project','stream','tag','type','q'])url.searchParams.delete(key);
 if(path!=='/experiments')url.searchParams.delete('page');
 if(path!=='/experiments'&&path!=='/repositories'){url.searchParams.delete('branch');url.searchParams.delete('repo')}
 if(url.pathname===location.pathname&&url.search===location.search)return;
 history[replace?'replaceState':'pushState']({},'',url.pathname+url.search);
 document.title='Lab Book · '+(document.querySelector('#breadcrumbs')?.textContent||'Workspace');
}
const editorBeforeRoutes=openEditor;
openEditor=function(note){editorBeforeRoutes(note);if(!document.querySelector('.editor'))return;syncWorkspaceRoute('/notes/'+encodeURIComponent(activeNoteId));
 const tools=document.querySelector('.editor-tools');
 if(!tools.querySelector('[data-copy-note-link]')){const button=document.createElement('button');button.className='tool-btn';button.dataset.copyNoteLink='';button.textContent='Copy link';button.onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('Note link copied')}catch{toast(location.href)}};tools.append(button)}
};
for(const [name,path]of [['renderSearch','/research'],['renderSkills','/skills']]){
 const original=window[name];window[name]=function(...args){const result=original(...args);syncWorkspaceRoute(path);return result};
}
const inboxBeforeRoutes=renderInbox;
renderInbox=function(){inboxBeforeRoutes();syncWorkspaceRoute(currentFolder==='inbox'?'/inbox':'/folders/'+encodeURIComponent(currentFolder))};
const boardBeforeRoutes=renderBoard;
renderBoard=function(){boardBeforeRoutes();syncWorkspaceRoute('/boards'+(state.boards.find(b=>b.id===activeBoard)?'/'+encodeURIComponent(activeBoard):''))};
const renderBeforeRoutes=render;
render=function(){
 const result=currentView==='paper'?renderPaperDetail(window.currentPaperId):renderBeforeRoutes();
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===(currentView==='paper'?'papers':currentView==='board-view'?'board':currentView)));
 return result;
};
async function applyWorkspaceRoute(){
 if(typeof flushDraft==='function'&&!flushDraft())return;
 applyingRoute=true;
 try{
  document.body.classList.toggle('detached-paper-reader',new URLSearchParams(location.search).get('reader')==='1'&&location.pathname.startsWith('/papers/'));
  const parts=location.pathname.split('/').filter(Boolean).map(decodeURIComponent),section=parts[0]||(LABBOOK_ENV==='production'?'papers':'inbox'),id=parts[1];
  if(section==='notes'&&id){const note=state.notes.find(n=>n.id===id);if(!note)throw Error('This note does not exist');currentFolder=note.folder||'inbox';currentView='inbox';renderFolders();openEditor(note)}
  else if(section==='folders'&&id){if(!state.folders.some(f=>f.id===id))throw Error('This folder does not exist');currentFolder=id;currentView='inbox';render()}
  else if(section==='papers'&&id){renderPaperDetail(id)}
  else if(section==='boards'){readTaskBoardFilters();if(id&&!state.boards.some(b=>b.id===id))throw Error('This board does not exist');activeBoard=id||state.boards[0]?.id;currentView='board';render()}
  else if(section==='views'){readTaskBoardFilters();if(id&&!state.boardViews.some(v=>v.id===id))throw Error('This combined view does not exist');window.activeBoardView=id||state.boardViews[0]?.id;currentView='board-view';render()}
  else if(section==='experiments'||section==='repositories'){if(section==='experiments'){const url=new URL(location.href);window.hubExperimentPage=url.searchParams.get('page')||'';window.hubExperimentBranch=url.searchParams.get('branch')||''}currentView=section;render()}
  else{const views={inbox:'inbox',research:'search',skills:'skills',papers:'papers'};if(!views[section])throw Error('Page not found');currentView=views[section];if(section==='inbox')currentFolder='inbox';render()}
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===(currentView==='paper'?'papers':currentView==='board-view'?'board':currentView)));
  if(!parts.length){const u=new URL(location.href);u.pathname='/'+section;history.replaceState({},'',u.pathname+u.search)}
 }catch(error){const page=document.createElement('div');page.className='page-wrap';const title=document.createElement('h1');title.textContent=error.message;const link=document.createElement('a');link.href='/inbox';link.textContent='Back to workspace';page.append(title,link);document.querySelector('#content').replaceChildren(page)}
 finally{applyingRoute=false}
}
document.addEventListener('click',event=>{
 const anchor=event.target.closest('a[href]');if(!anchor||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0||anchor.target==='_blank'||anchor.hasAttribute('download'))return;
 const url=new URL(anchor.href);if(url.origin!==location.origin||!/^\/(?:inbox|research|skills|papers|notes|folders|boards|views|experiments|repositories)(?:\/|$)/.test(url.pathname))return;
 event.preventDefault();if(!flushDraft())return;
 const current=new URL(location.href);if(current.searchParams.has('isolated'))url.searchParams.set('isolated','1');
 history.pushState({},'',url.pathname+url.search);applyWorkspaceRoute();
});
window.addEventListener('popstate',applyWorkspaceRoute);
applyWorkspaceRoute();

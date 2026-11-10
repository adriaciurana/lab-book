// Templates create ordinary notes. The template name never determines rendering.
function workspaceEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const workspaceTemplates={
 blank:{label:'Blank page',description:'A document you can build on.',content:'<p><br></p>'},
 research:{label:'Research stream',description:'A research question, a plan and linked working documents.',content:'<h2>Research question</h2><p>What do we want to understand or improve?</p><h2>Hypothesis</h2><p>What do we expect, and why?</p><h2>Success criteria</h2><p>Define the metrics and evidence needed to answer the question.</p><h2>Approach</h2><p>Describe the baseline, proposed changes and evaluation protocol.</p><h2>Findings and decisions</h2><p><br></p>',children:['Literature and evidence','Experiment log','Results and conclusions']},
 experiment:{label:'Experiment plan',description:'Hypothesis, setup, metrics and observations.',content:'<h2>Hypothesis</h2><p><br></p><h2>Setup</h2><p>Repository, branch, dataset, machine and configuration.</p><h2>Evaluation</h2><p>Baseline, metrics and acceptance criteria.</p><h2>Observations</h2><p><br></p>'}
};
function closeWorkspaceMenu(){document.querySelector('#workspaceCreateMenu')?.remove();document.querySelector('#addFolderBtn').setAttribute('aria-expanded','false')}
function openWorkspaceCreateMenu(parentId=null,source=null){
 if(document.querySelector('#workspaceCreateMenu'))return closeWorkspaceMenu();
 if(!flushDraft())return;
 const trigger=source||document.querySelector('#addFolderBtn'),menu=document.createElement('div');menu.id='workspaceCreateMenu';menu.className='workspace-create-menu';menu.setAttribute('role','menu');
 menu.innerHTML='<div class="eyebrow">CREATE IN WORKSPACE</div>'+Object.entries(workspaceTemplates).map(([id,t])=>`<button role="menuitem" data-page-template="${id}"><strong>${t.label}</strong><small>${t.description}</small></button>`).join('')+'<hr><button role="menuitem" data-create-folder><strong>Folder</strong><small>Organize pages into a collection.</small></button>';
 document.body.append(menu);const rect=trigger.getBoundingClientRect();menu.style.top=Math.min(rect.bottom+8,innerHeight-menu.offsetHeight-12)+'px';menu.style.left=Math.max(12,Math.min(rect.left,innerWidth-menu.offsetWidth-12))+'px';trigger.setAttribute('aria-expanded','true');
 if(parentId){menu.querySelector('.eyebrow').textContent='ADD A CHILD PAGE';menu.querySelector('[data-create-folder]').remove();menu.querySelector('hr').remove()}
 menu.querySelectorAll('[data-page-template]').forEach(b=>b.onclick=()=>{closeWorkspaceMenu();openPageTemplate(b.dataset.pageTemplate,parentId)});
 const folderAction=menu.querySelector('[data-create-folder]');if(folderAction)folderAction.onclick=()=>{closeWorkspaceMenu();workspaceFolderDialog()};menu.querySelector('button').focus();
 menu.onkeydown=event=>{const buttons=[...menu.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next].focus()}};
}
const workspaceFolderDialog=document.querySelector('#addFolderBtn').onclick;
document.querySelector('#addFolderBtn').onclick=()=>openWorkspaceCreateMenu();
document.querySelector('#addFolderBtn').setAttribute('aria-haspopup','menu');
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#workspaceCreateMenu,#addFolderBtn,.workspace-add-child'))closeWorkspaceMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('#workspaceCreateMenu')){closeWorkspaceMenu();document.querySelector('#addFolderBtn').focus()}});
function openPageTemplate(templateId='blank',parentId=null){
 const template=workspaceTemplates[templateId];if(!template)return;
 const parent=state.notes.find(n=>n.id===(parentId||state.folders.find(f=>f.id===currentFolder)?.pageId));
 const dialog=composerShell('Create a page',`<p class="muted">${template.label} · This stays a normal, editable page.</p><label>Page title<input id="workspacePageTitle" placeholder="${templateId==='research'?'e.g. Improving video consistency':'Untitled page'}" /></label>${templateId==='research'?'<label class="workspace-check"><input type="checkbox" id="workspaceCreateBoard" checked> Create a linked task board</label>':''}<div class="composer-actions"><button class="btn ghost" data-composer-close>Cancel</button><button class="btn primary" id="createWorkspacePage">Create page</button></div>`);
 const input=dialog.querySelector('#workspacePageTitle');input.focus();input.onkeydown=e=>{if(e.key==='Enter')dialog.querySelector('#createWorkspacePage').click()};
 dialog.querySelector('#createWorkspacePage').onclick=()=>{
  if(!flushDraft())return;
  const title=input.value.trim()||'Untitled page',beforeNotes=[...state.notes],beforeBoards=[...state.boards];
  const note={id:crypto.randomUUID(),title,folder:parent?.folder||currentFolder||'inbox',parentNoteId:parent?.id||null,type:'file',tag:'draft',draft:true,versions:[],template:templateId,content:template.content,desc:template.description,updatedAt:new Date().toISOString(),boardIds:[]};
  if(dialog.querySelector('#workspaceCreateBoard')?.checked){const board={id:crypto.randomUUID(),name:title,columns:['Backlog','Reading','Experimenting','Review','Done'],noteId:note.id};state.boards.push(board);note.boardIds.push(board.id)}
  state.notes.unshift(note);
  for(const child of template.children||[])state.notes.push({id:crypto.randomUUID(),title:child,folder:note.folder,parentNoteId:note.id,type:'file',tag:'draft',draft:true,versions:[],content:'<p><br></p>',desc:'',boardIds:[]});
  try{save()}catch(error){state.notes=beforeNotes;state.boards=beforeBoards;toast(error.message);return}
  closeComposer();renderFolders();openEditor(note);
 };
}
const workspaceEditorBefore=openEditor;
openEditor=function(note){const isNew=!note;workspaceEditorBefore(note);if(!document.querySelector('.editor'))return;if(isNew){const draft=currentDraftNote(),parent=state.folders.find(f=>f.id===draft?.folder)?.pageId;if(draft&&parent&&parent!==draft.id){draft.parentNoteId=parent;save()}}revealWorkspaceNote(currentDraftNote());renderFolders();requestAnimationFrame(()=>{const list=document.querySelector('#folderList'),link=list?.querySelector('[aria-current="page"]');if(!link)return;const bounds=list.getBoundingClientRect(),row=link.getBoundingClientRect();if(row.top<bounds.top)list.scrollTop+=row.top-bounds.top;else if(row.bottom>bounds.bottom)list.scrollTop+=row.bottom-bounds.bottom});renderPageRelations();hydrateArchitectureBlocks()};
function renderPageRelations(){
 document.querySelector('#pageRelations')?.remove();const note=currentDraftNote();if(!note)return;
 const children=state.notes.filter(n=>n.parentNoteId===note.id&&(typeof lifecycleArchived!=='function'||!lifecycleArchived('notes',n.id))),parent=state.notes.find(n=>n.id===note.parentNoteId),boards=state.boards.filter(b=>(note.boardIds||[]).includes(b.id)||b.noteId===note.id);
 const panel=document.createElement('section');panel.id='pageRelations';panel.className='page-relations';panel.setAttribute('aria-label','Linked pages and task boards');
 panel.innerHTML=`${parent?`<a class="page-parent" href="/notes/${encodeURIComponent(parent.id)}">← ${workspaceEscape(parent.title)}</a>`:''}<div class="section-head"><strong>Pages & boards</strong><div><button class="text-btn" data-child-page>+ Page</button><button class="text-btn" data-link-board>+ Task board</button></div></div><div class="page-related-links">${children.map(n=>`<a href="/notes/${encodeURIComponent(n.id)}">${workspaceEscape(n.title)}</a>`).join('')}${boards.map(b=>`<span><a href="/boards/${encodeURIComponent(b.id)}">Board · ${workspaceEscape(b.name)}</a><button class="text-btn" aria-label="Unlink ${workspaceEscape(b.name)}" data-unlink-board="${workspaceEscape(b.id)}">×</button></span>`).join('')}${!children.length&&!boards.length?'<small class="muted">Add a child page or link a board to this document.</small>':''}</div>`;
 document.querySelector('.editor-meta').after(panel);
 panel.querySelector('[data-child-page]').onclick=()=>openPageTemplate('blank',note.id);panel.querySelector('[data-link-board]').onclick=()=>openPageBoardPicker();
 panel.querySelectorAll('[data-unlink-board]').forEach(b=>b.onclick=()=>{const previous=note.boardIds,board=state.boards.find(row=>row.id===b.dataset.unlinkBoard),previousPage=board?.noteId;note.boardIds=(previous||[]).filter(id=>id!==b.dataset.unlinkBoard);if(board?.noteId===note.id)board.noteId=null;try{save();renderPageRelations()}catch(error){note.boardIds=previous;if(board)board.noteId=previousPage;toast(error.message)}});
 document.querySelector('#breadcrumbs').textContent=parent?parent.title+' / '+note.title:note.title;
 if(typeof renderResearchConnections==='function')renderResearchConnections(panel,note);
 for(const board of boards){const preview=document.createElement('div');preview.innerHTML=inlineTaskBoardHTML(board,note.id);panel.append(preview);bindInlineTaskBoards(preview)}
}
function openPageBoardPicker(embed=false){
 const note=currentDraftNote();if(!note||!flushDraft())return;
 const dialog=composerShell('Link a task board','<p class="muted">Use an existing board or create a board for this page.</p><div id="pageBoardChoices"></div><label>New board name<input id="pageBoardName" /></label><label>Columns, separated by commas<input id="pageBoardColumns" value="Backlog, In progress, Review, Done" /></label><div class="composer-actions"><button class="btn ghost" data-composer-close>Cancel</button><button class="btn primary" id="pageBoardCreate">Create and link</button></div>');
 for(const board of state.boards){const b=document.createElement('button');b.className='workspace-board-choice';b.textContent=board.name;b.disabled=(note.boardIds||[]).includes(board.id);b.onclick=()=>link(board);dialog.querySelector('#pageBoardChoices').append(b)}
 dialog.querySelector('#pageBoardName').value=note.title;
 function link(board,isNew=false){const previous=note.boardIds;note.boardIds=[...new Set([...(previous||[]),board.id])];if(isNew)state.boards.push(board);try{save();closeComposer();renderPageRelations();if(embed&&typeof insertResearchBlock==='function')insertResearchBlock('board',board.id)}catch(error){note.boardIds=previous;if(isNew)state.boards=state.boards.filter(b=>b.id!==board.id);toast(error.message)}}
 dialog.querySelector('#pageBoardCreate').onclick=()=>{const name=dialog.querySelector('#pageBoardName').value.trim(),columns=dialog.querySelector('#pageBoardColumns').value.split(',').map(v=>v.trim()).filter(Boolean);if(!name||!columns.length||new Set(columns).size!==columns.length)return toast('Use a board name and unique, nonempty columns');link({id:crypto.randomUUID(),name,columns,noteId:note.id},true)};
}
// Keep document hierarchy visible without inventing a separate stream entity.
function workspaceFolderPage(folder){
 let note=state.notes.find(n=>n.id===folder.pageId);if(note)return note;
 const before=structuredClone(state.notes),old=folder.pageId;
 note={id:crypto.randomUUID(),title:folder.name,folder:folder.id,parentNoteId:null,type:'file',tag:'draft',draft:true,versions:[],content:'<p><br></p>',boardIds:[]};state.notes.push(note);folder.pageId=note.id;
 for(const child of state.notes)if(child.id!==note.id&&child.folder===folder.id&&!child.parentNoteId)child.parentNoteId=note.id;
 try{save();return note}catch(error){state.notes=before;folder.pageId=old;toast(error.message);return null}
}
function moveWorkspacePage(id,parentId,folderId){
 if(!flushDraft())return false;
 const note=state.notes.find(n=>n.id===id),parent=state.notes.find(n=>n.id===parentId);if(!note||(!parent&&!state.folders.some(f=>f.id===folderId)))return false;
 const ids=new Set([id]);let added=true;while(added){added=false;for(const n of state.notes)if(ids.has(n.parentNoteId)&&!ids.has(n.id)){ids.add(n.id);added=true}}
 if(ids.has(parentId)){toast('A page cannot be moved inside itself or its descendants');return false}
 if(state.folders.some(f=>f.pageId===id)){toast('Move this workspace page using its folder row');return false}
 const before=structuredClone(state.notes);note.parentNoteId=parent?.id||null;for(const n of state.notes)if(ids.has(n.id))n.folder=parent?.folder||folderId||'inbox';
 if(parent)workspaceTreeCollapsed['page:'+parent.id]=false;
 try{save();render();return true}catch(error){state.notes=before;toast(error.message);return false}
}
window.addEventListener('dragend',()=>{if(dragged?.type==='note')dragged=null;document.querySelectorAll('.page-drop-target').forEach(el=>el.classList.remove('page-drop-target'))});
const workspaceFoldersBefore=renderFolders;
const workspaceTreeKey='labbook-tree-'+LABBOOK_ENV;
let workspaceTreeCollapsed={};
try{workspaceTreeCollapsed=JSON.parse(localStorage.getItem(workspaceTreeKey)||'{}')||{}}catch{}
function workspaceIsCollapsed(kind,id){return workspaceTreeCollapsed[kind+':'+id]??(kind==='page')}
function revealWorkspaceNote(note){
 if(!note)return;const seen=new Set();let current=note;
 while(current?.parentNoteId&&!seen.has(current.id)){seen.add(current.id);workspaceTreeCollapsed['page:'+current.parentNoteId]=false;current=state.notes.find(n=>n.id===current.parentNoteId)}
 let folder=state.folders.find(f=>f.id===note.folder);seen.clear();while(folder&&!seen.has(folder.id)){seen.add(folder.id);workspaceTreeCollapsed['folder:'+folder.id]=false;folder=state.folders.find(f=>f.id===folder.parentId)}
}
renderFolders=function(){
 const list=document.querySelector('#folderList');if(!list)return;const scroll=list.scrollTop;
 workspaceFoldersBefore();
 const buttons=new Map([...list.querySelectorAll('.folder[data-folder]')].map(b=>[b.dataset.folder,b]));
 const fragment=document.createDocumentFragment(),seenFolders=new Set(),seenNotes=new Set();
 list.setAttribute('aria-label','Workspace folders and pages');
 function row(kind,item,depth,hidden,hasChildren,element){
  const wrap=document.createElement('div');wrap.className='workspace-tree-row';wrap.dataset.treeKind=kind;wrap.dataset.treeId=item.id;wrap.hidden=hidden;wrap.style.setProperty('--tree-depth',Math.min(depth,8));
  if(hasChildren){const toggle=document.createElement('button');toggle.className='workspace-tree-toggle';toggle.dataset.treeToggle=kind+':'+item.id;toggle.setAttribute('aria-expanded',String(!workspaceIsCollapsed(kind,item.id)));toggle.setAttribute('aria-label',(workspaceIsCollapsed(kind,item.id)?'Expand ':'Collapse ')+(item.name||item.title));toggle.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 6 6-6 6"/></svg>';toggle.onclick=()=>{const key=kind+':'+item.id;workspaceTreeCollapsed[key]=!workspaceIsCollapsed(kind,item.id);try{localStorage.setItem(workspaceTreeKey,JSON.stringify(workspaceTreeCollapsed))}catch{}renderFolders();list.querySelector('[data-tree-toggle="'+CSS.escape(key)+'"]')?.focus({preventScroll:true})};wrap.append(toggle)}else{const spacer=document.createElement('span');spacer.className='workspace-tree-spacer';wrap.append(spacer)}
  element.title=item.name||item.title;element.style.paddingLeft='';wrap.append(element);
  const add=document.createElement('button');add.className='workspace-add-child';add.textContent='+';add.title='Add child page';add.setAttribute('aria-label','Add child page to '+(item.name||item.title));add.onclick=()=>{if(!flushDraft())return;if(kind==='folder'&&item.id==='inbox'){currentFolder='inbox';openWorkspaceCreateMenu(null,add);return}const parent=kind==='page'?item:workspaceFolderPage(item);if(parent){workspaceTreeCollapsed[kind+':'+item.id]=false;openWorkspaceCreateMenu(parent.id,add)}};wrap.append(add);
  if(kind==='page'){element.draggable=true;element.ondragstart=e=>{if(!flushDraft()){e.preventDefault();return}dragged={type:'note',id:item.id};e.dataTransfer.setData('application/x-labbook-page',item.id);e.dataTransfer.effectAllowed='move';e.stopPropagation()}}
  wrap.addEventListener('dragover',e=>{if(dragged?.type!=='note')return;e.preventDefault();e.stopPropagation();wrap.classList.add('page-drop-target')});
  wrap.addEventListener('dragleave',()=>wrap.classList.remove('page-drop-target'));
  wrap.addEventListener('drop',e=>{if(dragged?.type!=='note')return;e.preventDefault();e.stopPropagation();const id=dragged.id;dragged=null;wrap.classList.remove('page-drop-target');moveWorkspacePage(id,kind==='page'?item.id:item.pageId,item.id)},true);
  fragment.append(wrap);
 }
 function pages(parent,folder,depth,hidden){for(const note of state.notes.filter(n=>n.folder===folder&&(n.parentNoteId||null)===parent)){if((typeof lifecycleArchived==='function'&&lifecycleArchived('notes',note.id))||seenNotes.has(note.id)||state.folders.some(f=>f.pageId===note.id))continue;seenNotes.add(note.id);const children=state.notes.some(n=>n.parentNoteId===note.id&&n.folder===folder),link=document.createElement('a');link.className='workspace-page-link';link.href='/notes/'+encodeURIComponent(note.id);const icon=document.createElement('span');icon.className='workspace-page-icon';icon.innerHTML='<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h9l5 5v13H5z M14 3v6h5 M8 13h8 M8 17h5"/></svg>';const title=document.createElement('span');title.className='workspace-page-title';title.textContent=note.title;link.append(icon,title);if(document.querySelector('.editor')?.dataset.noteId===note.id){link.setAttribute('aria-current','page');link.classList.add('is-current')}row('page',note,depth,hidden,children,link);pages(note.id,folder,depth+1,hidden||workspaceIsCollapsed('page',note.id))}}
 function folders(parent,depth,hidden){for(const folder of state.folders.filter(f=>(f.parentId||null)===parent)){if((typeof lifecycleArchived==='function'&&lifecycleArchived('folders',folder.id))||seenFolders.has(folder.id))continue;seenFolders.add(folder.id);const button=buttons.get(folder.id);if(!button)continue;if(folder.id!=='inbox')button.onclick=()=>{if(!flushDraft())return;const note=workspaceFolderPage(folder);if(note)renderPublishedNote(note)};const children=state.folders.some(f=>f.parentId===folder.id)||state.notes.some(n=>n.folder===folder.id);row('folder',folder,depth,hidden,children,button);const collapsed=hidden||workspaceIsCollapsed('folder',folder.id);if(folder.pageId)pages(folder.pageId,folder.id,depth+1,collapsed);pages(null,folder.id,depth+1,collapsed);folders(folder.id,depth+1,collapsed)}}
 folders(null,0,false);list.replaceChildren(fragment);list.scrollTop=scroll;
};
document.querySelector('#blockMenu').insertAdjacentHTML('beforeend','<button class="block-option" data-block="linked-board"><span><strong>Task board</strong><small>Link a board to this page</small></span></button><button class="block-option" data-block="architecture"><span><strong>Diagram</strong><small>Visual figure editor, images and SVG</small></span></button>');
window.addEventListener('click',e=>{const block=e.target.closest('[data-block="linked-board"],[data-block="architecture"]');if(!block)return;e.preventDefault();e.stopImmediatePropagation();document.querySelector('#blockMenu').style.display='none';if(block.dataset.block==='linked-board')openPageBoardPicker(true);else openArchitectureComposer()},true);
// No scripts or handlers from supplied markup execute. Links remain real links.
function architectureDocument(markup,pageUrl=location.href){
 const parsed=new DOMParser().parseFromString(String(markup),'text/html');
 parsed.querySelectorAll('script,iframe,object,embed,base,meta,form,link').forEach(e=>e.remove());
 parsed.querySelectorAll('*').forEach(e=>{for(const attr of [...e.attributes])if(/^on/i.test(attr.name)||['srcdoc','formaction'].includes(attr.name))e.removeAttribute(attr.name)});
 parsed.querySelectorAll('a,svg a').forEach(a=>{const href=a.getAttribute('href')||a.getAttribute('xlink:href');if(!href)return;if(href.startsWith('#')){a.setAttribute('href',href);a.removeAttribute('xlink:href');a.setAttribute('target','_self');return}try{const url=new URL(href,pageUrl);if(!['http:','https:','mailto:'].includes(url.protocol))throw Error('Unsupported protocol');if(url.origin===location.origin&&new URL(pageUrl).searchParams.has('isolated'))url.searchParams.set('isolated','1');a.setAttribute('href',url.href);a.removeAttribute('xlink:href');a.setAttribute('target','_top');a.setAttribute('rel','noopener noreferrer')}catch{a.removeAttribute('href');a.removeAttribute('xlink:href')}});
 return '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; img-src data: https: http:; script-src &#39;none&#39;; form-action &#39;none&#39;"><style>body{margin:16px;font:15px system-ui;color:#17251e;background:white}svg{max-width:100%;height:auto}a{cursor:pointer}a:hover{opacity:.75} :target{outline:3px solid #8ca96c}</style>'+parsed.head.innerHTML+'</head><body>'+parsed.body.innerHTML+'</body></html>';
}
function architectureFrame(markup){
 const frame=document.createElement('iframe');frame.className='architecture-frame';frame.title='Linked architecture diagram';
 // Same-origin access lets the trusted parent route clicks; scripts remain disabled.
 frame.setAttribute('sandbox','allow-same-origin allow-top-navigation-by-user-activation');
 frame.onload=()=>{frame.contentDocument?.addEventListener('click',event=>{const anchor=event.target.closest('a');if(!anchor)return;const href=anchor.getAttribute('href');if(!href)return;if(href.startsWith('#')){event.preventDefault();const fragmentId=decodeURIComponent(href.slice(1)),target=frame.contentDocument.getElementById(fragmentId)||document.getElementById(fragmentId);if(target){if(target.tagName==='DETAILS')target.open=true;frame.contentDocument.querySelectorAll('[data-diagram-target]').forEach(e=>e.removeAttribute('data-diagram-target'));target.setAttribute('data-diagram-target','true');target.style.outline='3px solid #8ca96c';target.scrollIntoView({behavior:'smooth',block:'nearest'})}return}const url=new URL(href,location.href);if(url.origin!==location.origin)return;event.preventDefault();if(!flushDraft())return;if(event.metaKey||event.ctrlKey||event.shiftKey){window.open(url.href,'_blank','noopener');return}history.pushState({},'',url.pathname+url.search+url.hash);if(typeof applyWorkspaceRoute==='function')applyWorkspaceRoute();else location.assign(url.href)})};
 frame.srcdoc=architectureDocument(markup);return frame;
}
function hydrateArchitectureBlocks(){document.querySelectorAll('.editor-body [data-architecture]').forEach(block=>{if(block.querySelector('iframe'))return;let markup;try{markup=decodeURIComponent(block.dataset.architecture)}catch{return}block.replaceChildren(architectureFrame(markup));const edit=document.createElement('button');edit.type='button';edit.className='text-btn';edit.textContent='Edit diagram';edit.onclick=()=>openArchitectureComposer(block);block.append(edit)})}
function openArchitectureComposer(existing=null){
 if(typeof openVisualDiagramEditor!=='function'){toast('The diagram editor has not loaded. Reload the page to get the latest version.');return}
 return openVisualDiagramEditor(existing);
}

renderFolders();

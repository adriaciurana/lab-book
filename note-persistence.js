// One active note, identified by ID. Never resolve a note by its editable title.
let activeNoteId=null, draftTimer=null, activeBody=null;
let collabTimer=null, collabUserId=localStorage.getItem('labbook-user-id')||crypto.randomUUID();localStorage.setItem('labbook-user-id',collabUserId);
window.LABBOOK_PERSISTENCE_VERSION='stable-note-id-2';
const bodyChanges=new MutationObserver(()=>persistDraft());
function currentDraftNote(){return state.notes.find(n=>n.id===activeNoteId)}
function editorSnapshot(){
  const body=document.querySelector('.editor-body');
  if(!body||body!==activeBody)return null;
  // IDs must live on the editor nodes, not just the cloned snapshot; otherwise
  // every save invents new IDs and old collaboration clients append copies.
  [...body.children].forEach(block=>{if(!block.dataset.labBlockId)block.dataset.labBlockId=crypto.randomUUID()});
  const snapshot=body.cloneNode(true);
  // Live previews are rebuilt from their persisted source, never from an iframe.
  snapshot.querySelectorAll('[data-architecture]').forEach(block=>block.replaceChildren());
  snapshot.querySelectorAll('[data-research-block]').forEach(block=>block.replaceChildren());
  [...snapshot.children].forEach((block,index)=>{if(!block.dataset.labBlockId)block.dataset.labBlockId=crypto.randomUUID()});
  const blocks=[...snapshot.children].map((block,index)=>({id:block.dataset.labBlockId,html:block.outerHTML,order:index}));
  return {title:document.querySelector('.editor .title').value.trim()||'Untitled research note',
    content:snapshot.innerHTML,blocks,desc:snapshot.textContent.trim().slice(0,180)};
}
function updateRollbackState(){
  const button=document.querySelector('#rollbackDraft');
  if(button)button.disabled=!currentDraftNote()?.versions?.length;
}
function persistDraft(){
  const note=currentDraftNote(),snap=editorSnapshot();
  if(!note||!snap)return true;
  if(note.content===snap.content&&note.title===snap.title)return true;
  const previous={...note};
  Object.assign(note,snap,{draft:true,tag:'draft',updatedAt:new Date().toISOString()});
  try {
    save();
    document.querySelector('.editor-meta .muted:last-child').textContent='Draft saved';
    updateRollbackState();return true;
  } catch(error) {
    Object.assign(note,previous);
    document.querySelector('#saveStatus').textContent='Save failed: '+error.message;
    document.querySelector('.editor-meta .muted:last-child').textContent='Unsaved changes';
    return false;
  }
}
function scheduleDraft(){persistDraft()}
function flushDraft(){clearTimeout(draftTimer);return persistDraft()}
const originalOpenEditor=openEditor;
openEditor=function(note){
  if(!flushDraft())return;
  bodyChanges.disconnect();
  if(!note){note={id:crypto.randomUUID(),title:'Untitled research note',type:'✎',
    tag:'draft',tone:'lime',folder:currentFolder,draft:true,versions:[]};state.notes.unshift(note)}
  activeNoteId=note.id;
  originalOpenEditor(note);
  clearInterval(collabTimer);const presence=()=>fetch('/api/collab/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:collabUserId,noteId:note.id,name:localStorage.getItem('labbook-user-name')||'Local collaborator'})}).catch(()=>{});presence();collabTimer=setInterval(presence,10000);
  document.querySelector('.editor').dataset.noteId=note.id;
  activeBody=document.querySelector('.editor-body');
  if(typeof note.content==='string')activeBody.innerHTML=note.content;
  else{const paragraph=document.createElement('p');if(note.desc)paragraph.textContent=note.desc;else paragraph.append(document.createElement('br'));activeBody.replaceChildren(paragraph)}
  document.querySelector('.editor .title').value=note.title;
  const manual=document.querySelector('#saveNote');
  manual.textContent='Publish version';
  manual.onclick=()=>{
    if(!flushDraft())return;
    const latest=currentDraftNote();
    latest.versions=latest.versions||[];
    const published={...editorSnapshot(),savedAt:new Date().toISOString()};
    latest.versions.push(published);latest.published=structuredClone(published);
    latest.draft=false;
    try{save();toast('Version published');updateRollbackState()}catch{toast('Unable to publish this version')}
  };
  document.querySelector('#cancelEdit').textContent='Close';
  document.querySelector('#cancelEdit').onclick=()=>{if(flushDraft())typeof renderPublishedNote==='function'?renderPublishedNote(currentDraftNote()):render()};
  const rollback=document.createElement('button');
  rollback.id='rollbackDraft';rollback.className='btn ghost';rollback.textContent='Rollback draft';
  rollback.onclick=rollbackDraft;manual.after(rollback);
  activeBody.addEventListener('input',persistDraft);
  document.querySelector('.editor .title').addEventListener('input',persistDraft);
  bodyChanges.observe(activeBody,{subtree:true,childList:true,characterData:true,attributes:true});
  persistDraft();updateRollbackState();
};
function rollbackDraft(){
  const version=currentDraftNote()?.versions?.at(-1);
  if(!version||!confirm('Restore the latest saved version and discard the current draft changes?'))return;
  document.querySelector('.editor .title').value=version.title;
  activeBody.innerHTML=version.content;persistDraft();toast('Latest saved version restored');
}
// Flush before a navigation handler removes the editor, including immediate clicks.
document.addEventListener('click',event=>{
  if(!event.target.closest('.nav-item,.folder,#newPageBtn,[data-note]'))return;
  if(!flushDraft()){event.preventDefault();event.stopImmediatePropagation()}
},true);
window.addEventListener('beforeunload',event=>{if(!flushDraft()){event.preventDefault();event.returnValue=''}});
window.addEventListener('pagehide',flushDraft);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flushDraft()});

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
  snapshot.querySelectorAll('.note-math[data-latex]').forEach(node=>node.replaceChildren());
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
function draftRecoveryKey(id){return STORAGE_KEY+'-draft-recovery-'+id}
function readDraftRecovery(id){
  try{return JSON.parse(localStorage.getItem(draftRecoveryKey(id))||'null')}catch{return null}
}
function offerDraftRecovery(note,status){
  const recovery=readDraftRecovery(note.id);
  if(!recovery||typeof recovery.content!=='string'||typeof recovery.title!=='string')return;
  if(recovery.content===note.content&&recovery.title===note.title)return;
  const recover=document.createElement('button');
  recover.type='button';recover.className='btn ghost';recover.textContent='Recover as new note';
  status.textContent='An unsaved draft is available on this device.';
  recover.onclick=()=>{
    const copy={id:crypto.randomUUID(),title:recovery.title+' (recovered)',content:recovery.content,
      folder:note.folder,type:'✎',tag:'draft',tone:'lime',draft:true,versions:[]};
    if(!flushDraft())return;
    state.notes.unshift(copy);
    openEditor(copy);
    if(activeNoteId===copy.id&&persistDraft(true)){
      try{localStorage.removeItem(draftRecoveryKey(note.id))}catch{}
    }
  };
  status.after(recover);
}
function showDraftStatus(message, failed=false){
  const status=document.querySelector('#draftSaveStatus');
  if(status)status.textContent=message;
  const retry=document.querySelector('#retryDraftSave');
  if(retry)retry.hidden=!failed;
}
function persistDraft(force=false){
  const note=currentDraftNote(),snap=editorSnapshot();
  if(!note||!snap)return true;
  if(force!==true&&note.content===snap.content&&note.title===snap.title&&document.querySelector("#retryDraftSave")?.hidden!==false)return true;
  const previous={...note};
  Object.assign(note,snap,{draft:true,tag:'draft',updatedAt:new Date().toISOString()});
  showDraftStatus('Saving draft…');
  try {
    save();
    const recovery=readDraftRecovery(note.id);
    if(recovery?.title===snap.title&&recovery?.content===snap.content){try{localStorage.removeItem(draftRecoveryKey(note.id))}catch{}}
    showDraftStatus('Draft saved');
    updateRollbackState();return true;
  } catch(error) {
    Object.assign(note,previous);
    try{localStorage.setItem(draftRecoveryKey(note.id),JSON.stringify({title:snap.title,content:snap.content}))}catch{}
    document.querySelector('#saveStatus').textContent='Save failed: '+error.message;
    showDraftStatus('Draft not saved. Your edits are still in the editor.',true);
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
  const meta=document.querySelector('.editor-meta');
  if(meta){
    const status=meta.querySelector('.muted:last-child')||meta.appendChild(document.createElement('span'));
    status.id='draftSaveStatus';status.setAttribute('role','status');
    const retry=document.createElement('button');
    retry.type='button';retry.id='retryDraftSave';retry.className='btn ghost';retry.textContent='Retry save';retry.hidden=true;
    retry.onclick=()=>{if(persistDraft())status.focus()};
    status.tabIndex=-1;status.after(retry);
    offerDraftRecovery(note,status);
  }
  const manual=document.querySelector('#saveNote');
  manual.textContent='Publish version';
  manual.onclick=()=>{
    if(!flushDraft())return;
    const latest=currentDraftNote();
    const previous={...latest};
    const published={...editorSnapshot(),savedAt:new Date().toISOString()};
    latest.versions=[...(latest.versions||[]),published];latest.published=structuredClone(published);
    latest.draft=false;
    try{save();toast('Version published');updateRollbackState()}catch{Object.assign(latest,previous);toast('Unable to publish. Your draft is still available. Try Publish version again.')}
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
  activeBody.innerHTML=version.content;if(persistDraft())toast('Latest saved version restored');
}
// Flush before a navigation handler removes the editor, including immediate clicks.
document.addEventListener('click',event=>{
  if(!event.target.closest('.nav-item,.folder,#newPageBtn,[data-note]'))return;
  if(!flushDraft()){event.preventDefault();event.stopImmediatePropagation()}
},true);
window.addEventListener('beforeunload',event=>{if(!flushDraft()){event.preventDefault();event.returnValue=''}});
window.addEventListener('pagehide',flushDraft);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flushDraft()});

document.addEventListener('keydown',event=>{
  if(!(event.metaKey||event.ctrlKey)||event.key.toLowerCase()!=='s')return;
  if(!activeBody?.isConnected||!currentDraftNote()||document.querySelector('.modal-backdrop.open'))return;
  event.preventDefault();
  if(flushDraft())toast('Draft saved');
});

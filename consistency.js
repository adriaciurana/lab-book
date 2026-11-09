// Guard shared flows that can be reached through several screens.
const completeRenderBank=renderPaperBank;
renderPaperBank=function(){
 const input=document.querySelector('#paperSearch'),focused=document.activeElement===input,start=input?.selectionStart;
 completeRenderBank();
 if(focused){const next=document.querySelector('#paperSearch');next.focus();next.setSelectionRange(start,start)}
};
const completeRenderBoard=renderBoard;
renderBoard=function(){
 if(state.boards.length){
  completeRenderBoard();
  document.querySelectorAll('.task[data-task]').forEach(card=>{
   card.tabIndex=0;card.setAttribute('role','button');
   card.setAttribute('aria-label','Edit task: '+card.querySelector('p').textContent);
   card.title='Click to edit · Drag to move';
   card.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();openTaskModal(card.dataset.task)}
   });
  });
  return;
 }
 document.querySelector('#content').innerHTML='<div class="board-page"><h1>Task boards</h1><p>No boards yet.</p><button class="btn primary" id="emptyBoard">＋ Create board</button></div>';
 document.querySelector('#emptyBoard').onclick=()=>openBoardModal();
};
const completeDeleteEntity=deleteEntity;
deleteEntity=function(type,id){
 if(type==='folder'&&id==='inbox'){toast('Inbox is the workspace root folder');return}
 return completeDeleteEntity(type,id);
};
window.addEventListener('click',event=>{
 const cite=event.target.closest('[data-cite-paper]');
 if(cite){event.preventDefault();event.stopImmediatePropagation();const p=state.papers.find(p=>p.id===cite.dataset.citePaper);if(p){currentView='inbox';openEditor();insertPaperEmbed(p);openPaperSplit(p)}return}
 if(event.target.closest('#saveBoard')){
  const values=document.querySelector('#boardColumns').value.split(',').map(x=>x.trim()).filter(Boolean);
  if(!values.length||new Set(values).size!==values.length){event.preventDefault();event.stopImmediatePropagation();toast('Add at least one column and use unique names')}
 }
},true);
function moveFolder(id,targetId,position='inside'){
 const moving=state.folders.find(f=>f.id===id),target=state.folders.find(f=>f.id===targetId);
 if(!moving||id==='inbox'||id===targetId)return false;
 const parent=target?(position==='inside'?target.id:target.parentId||null):null;
 let cursor=parent;const seen=new Set();
 while(cursor){if(cursor===id||seen.has(cursor)){toast('A folder cannot be moved into one of its descendants');return false}seen.add(cursor);cursor=state.folders.find(f=>f.id===cursor)?.parentId}
 moving.parentId=parent;state.folders=state.folders.filter(f=>f.id!==id);
 let index=target?state.folders.findIndex(f=>f.id===target.id):state.folders.length;
 if(position==='after'||position==='inside')index++;
 state.folders.splice(Math.min(index,state.folders.length),0,moving);save();render();return true;
}
let movingFolderId=null;
window.addEventListener('dragstart',event=>{
 const folder=event.target.closest('.folder[data-folder]');if(folder)movingFolderId=folder.dataset.folder;
});
window.addEventListener('drop',event=>{
 if(!movingFolderId)return;const list=event.target.closest('#folderList');if(!list)return;
 event.preventDefault();event.stopImmediatePropagation();
 const target=event.target.closest('.folder'),r=target?.getBoundingClientRect(),relative=r?(event.clientY-r.top)/r.height:0;
 moveFolder(movingFolderId,target?.dataset.folder,relative<.25?'before':relative>.75?'after':'inside');
 movingFolderId=null;folderDragId=null;
},true);
window.addEventListener('dragend',()=>{movingFolderId=null;folderDragId=null});
let suppressTaskClickUntil=0;
function finishTaskDrag(){
 if(!document.body.classList.contains('dragging-task'))return;
 document.body.classList.remove('dragging-task');
 document.querySelectorAll('.task.is-dragging').forEach(card=>card.classList.remove('is-dragging'));
 document.querySelectorAll('.kanban-col.drag-over').forEach(col=>col.classList.remove('drag-over'));
 suppressTaskClickUntil=performance.now()+250;
}
window.addEventListener('dragstart',event=>{
 if(!event.target.closest('.task[data-task]'))return;
 document.body.classList.add('dragging-task');
},true);
window.addEventListener('dragend',finishTaskDrag);
window.addEventListener('drop',()=>queueMicrotask(finishTaskDrag),true);
window.addEventListener('click',event=>{
 if(event.target.closest('.task[data-task]')&&(document.body.classList.contains('dragging-task')||performance.now()<suppressTaskClickUntil)){
  event.preventDefault();event.stopImmediatePropagation();
 }
},true);

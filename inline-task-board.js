// Live boards inside research pages; cards always use the source board's data.
function inlineTaskBoardHTML(board,noteId){
 const tasks=state.tasks.filter(t=>t.board===board.id);
 return `<section class="inline-task-board" contenteditable="false" data-inline-board="${hubEscape(board.id)}" data-inline-note="${hubEscape(noteId||'')}"><header><strong>${hubEscape(board.name)}</strong><a href="/boards/${encodeURIComponent(board.id)}">Open full board ↗</a></header><div class="inline-board-lanes">${board.columns.map(col=>`<section class="inline-board-column" data-inline-column="${hubEscape(col)}"><header><strong>${hubEscape(col)}</strong><small>${tasks.filter(t=>t.col===col).length}</small></header>${tasks.filter(t=>t.col===col).map(t=>`<article class="task" data-task="${hubEscape(t.id)}" draggable="true" tabindex="0" role="button" aria-label="Edit ${hubEscape(t.text)}"><small>${hubEscape(t.type||'task')}</small><p>${hubEscape(t.text)}</p><span class="tag">${hubEscape(t.tag||'research')}</span></article>`).join('')}<button type="button" class="column-add-task" data-inline-add>+ Add task</button></section>`).join('')}</div></section>`;
}
function bindInlineTaskBoards(root){
 root.querySelectorAll('[data-inline-board]').forEach(boardElement=>{
  const board=state.boards.find(b=>b.id===boardElement.dataset.inlineBoard);if(!board)return;
  boardElement.querySelectorAll('.task').forEach(card=>{card.onkeydown=e=>{if(e.target!==card)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();openTaskModal(card.dataset.task)}}});
  boardElement.querySelectorAll('[data-inline-column]').forEach(lane=>{
   lane.querySelector('[data-inline-add]').onclick=()=>openTaskModal({id:crypto.randomUUID(),board:board.id,col:lane.dataset.inlineColumn,noteId:boardElement.dataset.inlineNote||board.noteId||null,text:'',type:'task',tag:'research',_new:true});
   lane.ondragover=e=>{if(!activeDragTask)return;e.preventDefault();e.dataTransfer.dropEffect='move';lane.classList.add('drag-over')};
   lane.ondragleave=e=>{if(!lane.contains(e.relatedTarget))lane.classList.remove('drag-over')};
   lane.ondrop=e=>{e.preventDefault();e.stopPropagation();lane.classList.remove('drag-over');const task=state.tasks.find(t=>t.id===activeDragTask);activeDragTask=null;if(!task)return;if(task.board!==board.id){toast('Move tasks between columns in their own board.');return}try{hubCommit('tasks',task.id,{col:lane.dataset.inlineColumn});refreshHubScreen()}catch(error){toast(error.message)}};
  });
  linkTaskPages(boardElement);
 });
}

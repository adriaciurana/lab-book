(function(root){
 const types={note:'notes',folder:'folders',board:'boards',task:'tasks',paper:'papers',experiment:'experiments',repository:'repositories',branch:'branches',view:'boardViews'};
 function archived(state,collection,id,seen=new Set()){const key=collection+':'+id;if(seen.has(key))return false;seen.add(key);const row=(state[collection]||[]).find(r=>r.id===id);if(!row)return false;if(row.archivedAt)return true;const refs=collection==='folders'?[['folders',row.parentId]]:collection==='notes'?[['notes',row.parentNoteId],['folders',row.folder]]:collection==='tasks'?[['tasks',row.parentId],['boards',row.board],['notes',row.noteId]]:collection==='boards'||collection==='repositories'?[['notes',row.noteId]]:collection==='branches'?[['repositories',row.repoId],['branches',row.parentId]]:collection==='experiments'?[['notes',row.noteId],['tasks',row.taskId],['repositories',row.repoId],['branches',row.branchId]]:[];return refs.some(([c,id])=>id&&archived(state,c,id,seen))}
 function descendants(rows,id,field){const ids=new Set([id]);let changed=true;while(changed){changed=false;for(const r of rows||[])if(ids.has(r[field])&&!ids.has(r.id)){ids.add(r.id);changed=true}}return ids}
 function change(state,type,id,operation,{deleteChildren=false}={}){const collection=types[type];if(!collection)throw Error('Unsupported item');const next=structuredClone(state),row=(next[collection]||[]).find(r=>r.id===id);if(!row)throw Error('Item no longer exists');if(type==='folder'&&id==='inbox')throw Error('Inbox is the workspace root and cannot be archived or deleted');
 if(operation==='archive'){row.archivedAt=new Date().toISOString();return next}if(operation==='restore'){delete row.archivedAt;if(archived(next,collection,id))throw Error('Restore the parent page, collection or board first');return next}if(operation!=='delete')throw Error('Invalid operation');
 const removed={};for(const c of Object.values(types))removed[c]=new Set();removed[collection].add(id);
 if(type==='folder'){removed.folders=descendants(next.folders,id,'parentId');for(const n of next.notes||[])if(removed.folders.has(n.folder)){if(deleteChildren)removed.notes.add(n.id);else n.folder='inbox'}}
 if(type==='note'){if(deleteChildren)removed.notes=descendants(next.notes,id,'parentNoteId');else for(const n of next.notes||[])if(n.parentNoteId===id)n.parentNoteId=row.parentNoteId||null}
 if(type==='board')for(const t of next.tasks||[])if(t.board===id)removed.tasks.add(t.id);
 if(type==='task')removed.tasks=descendants(next.tasks,id,'parentId');
 if(type==='repository')for(const b of next.branches||[])if(b.repoId===id)removed.branches.add(b.id);
 if(type==='branch')for(const b of next.branches||[])if(b.parentId===id)b.parentId=row.parentId||null;
 for(const c of Object.keys(removed))next[c]=(next[c]||[]).filter(r=>!removed[c].has(r.id));
 for(const t of next.tasks||[])if(removed.tasks.has(t.parentId)){t.parentId=null;if(t.type==='subtask')t.type='task'}
 for(const n of next.notes){if(removed.notes.has(n.parentNoteId))n.parentNoteId=null;n.boardIds=(n.boardIds||[]).filter(id=>!removed.boards.has(id))}
 for(const f of next.folders)if(removed.notes.has(f.pageId))delete f.pageId;
 for(const c of ['boards','tasks','experiments','repositories','branches'])for(const r of next[c]||[]){if(removed.notes.has(r.noteId))r.noteId=null;if(removed.tasks.has(r.taskId))r.taskId=null;if(removed.repositories.has(r.repoId))r.repoId=null;if(removed.branches.has(r.branchId))r.branchId=null}
 for(const v of next.boardViews||[]){v.boardIds=v.boardIds.filter(id=>!removed.boards.has(id));if(v.columnMap)for(const key of Object.keys(v.columnMap))if(removed.boards.has(key))delete v.columnMap[key]}next.boardViews=(next.boardViews||[]).filter(v=>v.boardIds.length);for(const n of next.notes)n.boardViewIds=(n.boardViewIds||[]).filter(id=>next.boardViews.some(v=>v.id===id));
 next.context=(next.context||[]).filter(c=>!removed.notes.has(c.noteId)&&!removed.papers.has(c.paperId));for(const chat of next.agentChats||[])chat.context=(chat.context||[]).filter(c=>!removed.notes.has(c.noteId)&&!removed.papers.has(c.paperId));next.shares=(next.shares||[]).filter(s=>!removed[s.entityType]?.has(s.entityId));
 const model=typeof module!=='undefined'&&module.exports?require('./research-model.js'):root.ResearchModel;model.validate(next);return next;
 }
 const api={types,archived,descendants,change};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Lifecycle=api;
})(typeof window!=='undefined'?window:globalThis);

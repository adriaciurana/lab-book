const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'labbook-board-workspace-')));
const {startWorkspaceServer}=require('./support/workspace-server.cjs');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1500,height:1100});
 win.webContents.on('console-message',event=>{if(event.level==='error')console.error(event.message)});
 let workspace;
 try{
  workspace=await startWorkspaceServer({demo:true});
  await win.loadURL(workspace.origin+'/inbox?isolated=1');
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const assert=(v,m)=>{if(!v)throw Error(m)},tick=()=>new Promise(r=>setTimeout(r,80));
   state={folders:[{id:'inbox',name:'Inbox'}],notes:[{id:'project-a',title:'Video project',folder:'inbox'},{id:'stream-a',title:'Temporal consistency',parentNoteId:'project-a',template:'research',folder:'inbox'},{id:'protocol-a',title:'Evaluation protocol',parentNoteId:'stream-a',folder:'inbox'},{id:'project-b',title:'Language project',folder:'inbox'},{id:'stream-b',title:'Alignment',parentNoteId:'project-b',template:'research',folder:'inbox'}],boards:[{id:'a',name:'Video experiments',noteId:'stream-a',columns:['Queue','Running','Done']},{id:'b',name:'Alignment work',noteId:'stream-b',columns:['Todo','Working','Done']}],tasks:[{id:'a1',text:'Read temporal paper',type:'task',board:'a',col:'Queue',noteId:'protocol-a',tags:['reading'],tag:'reading'},{id:'a2',text:'Run temporal ablation',type:'subtask',parentId:'a1',board:'a',col:'Running',tag:'experiment',tags:['experiment']},{id:'b1',text:'Read alignment paper',type:'task',board:'b',col:'Todo',noteId:'stream-b',tag:'reading',tags:['reading']},{id:'b2',text:'Measure reward quality',type:'task',board:'b',col:'Working',tag:'experiment',tags:['experiment']}],papers:[],context:[],boardViews:[{id:'all',name:'All research',boardIds:['a','b'],columnMap:{a:{Queue:'Backlog',Running:'Active'},b:{Todo:'Backlog',Working:'Active'}}}]};ResearchModel.ensure(state);currentView='board-view';window.activeBoardView='all';render();
   assert(document.querySelectorAll('.board-navigation').length===1&&!document.querySelector('.board-tabs,.hub-view-tabs'),'old duplicated navigation remains');
   assert(document.querySelector('[data-board-mode="combined"]').getAttribute('aria-pressed')==='true','combined mode not selected');
   const color=id=>getComputedStyle(document.querySelector('[data-task="'+id+'"]')).borderLeftColor;
   const ca=color('a1'),cb=color('b1');assert(ca!==cb,'different streams have identical borders');assert(color('a2')===ca,'subtask did not inherit its stream');
   assert(document.querySelector('[data-task="a1"] .task-stream-label').textContent.includes('Temporal consistency'),'stream name missing');
   const filter=(id,value)=>{const el=document.getElementById(id);el.value=value;el.dispatchEvent(new Event('change'))};
   filter('boardProjectFilter','project-a');assert(document.querySelectorAll('.task').length===2,'project filter failed');assert(location.search.includes('project=project-a'),'filter missing from URL');
   filter('boardStreamFilter','page:stream-a');filter('boardTagFilter','experiment');assert(document.querySelectorAll('.task').length===1,'tag filter failed');
   filter('boardTypeFilter','subtask');assert(document.querySelector('.task').dataset.task==='a2','type filter failed');
   document.querySelector('#clearBoardFilters').click();
   const search=document.querySelector('#boardTaskSearch');search.focus();search.value='reward';search.dispatchEvent(new Event('input'));
   assert(document.querySelectorAll('.task').length===1&&document.activeElement.id==='boardTaskSearch','search lost focus or results');
   document.querySelector('#clearBoardFilters').click();
   document.querySelector('[data-stream-legend="page:stream-a"]').click();assert(document.querySelectorAll('.task').length===2,'legend shortcut failed');
   document.querySelector('[data-column-add-task="Active"]').click();assert(document.querySelector('#hubTaskPage').value==='stream-a','new task did not inherit stream filter');assert(!document.querySelector('#hubTaskDestination'),'filtered creation offers unrelated source boards');document.querySelector('#hubTaskTitle').value='New filtered experiment';document.querySelector('#hubSave').click();
   let created=state.tasks.find(t=>t.text==='New filtered experiment');assert(created.board==='a'&&created.col==='Running'&&created.noteId==='stream-a','filtered creation lost source identity');
   const card=document.querySelector('[data-task="'+created.id+'"]'),dt=new DataTransfer();card.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));document.querySelector('[data-view-col="Done"]').dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));
   created=state.tasks.find(t=>t.id===created.id);assert(created.board==='a'&&created.col==='Done','filtered aggregate drag changed board or lost source status');
   assert(document.querySelector('#boardStreamFilter').value==='page:stream-a','drag reset filter');
   const status=document.querySelector('[data-task="'+created.id+'"] .task-status-control');
   const originalBoard=state.boards.find(board=>board.id==='a');
   const target=originalBoard.columns.find(column=>column!=='Done');
   status.value=target;status.dispatchEvent(new Event('change',{bubbles:true}));
   const moved=state.tasks.find(task=>task.id===created.id);
   assert(moved.board==='a'&&moved.col===target,'Status control did not move within source board');
   assert(document.querySelector('#boardStreamFilter').value==='page:stream-a','Status move reset filter');

   document.querySelector('[data-board-mode="individual"]').click();assert(location.pathname==='/boards/a','individual navigation failed');assert(document.querySelector('#boardStreamFilter').value==='page:stream-a','switch lost compatible filter');
   filter('taskBoardViewSelect','b');assert(document.querySelector('#boardStreamFilter').value===''&&document.querySelectorAll('.task').length===2,'switch retained incompatible stream filter');
   document.querySelector('[data-board-mode="combined"]').click();assert(location.pathname==='/views/all','combined navigation failed');assert(color('a1')===ca&&color('b1')===cb,'stream colors changed after switching modes');
   filter('boardProjectFilter','project-b');filter('boardStreamFilter','page:stream-b');save();return {colorA:ca,colorB:cb};
  })()`);
  const ready=new Promise(r=>win.webContents.once('did-finish-load',r));win.webContents.reload();await ready;
  const persisted=await win.webContents.executeJavaScript(`({project:document.querySelector('#boardProjectFilter').value,stream:document.querySelector('#boardStreamFilter').value,count:document.querySelectorAll('.task').length,color:getComputedStyle(document.querySelector('[data-task="b1"]')).borderLeftColor})`);
  if(persisted.project!=='project-b'||persisted.stream!=='page:stream-b'||persisted.count!==2||persisted.color!==result.colorB)throw Error('Filters or colors did not survive reload');
  await win.webContents.executeJavaScript(`(async()=>{state=await(await fetch('/api/state')).json();ResearchModel.ensure(state);for(const key of boardFilterKeys)taskBoardFilters[key]='';currentView='board-view';window.activeBoardView='demo-research-overview';applyTheme('dark');render();await new Promise(r=>setTimeout(r,150))})()`);
  fs.writeFileSync('/tmp/labbook-boards-combined.png',(await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`document.querySelector('[data-board-mode="individual"]').click();applyTheme('light');new Promise(r=>setTimeout(r,100))`);
  fs.writeFileSync('/tmp/labbook-boards-individual.png',(await win.webContents.capturePage()).toPNG());
  console.log('PASS: unified board navigation, distinct stable stream borders, inherited stream identity, project/stream/tag/type/search filters, legend filtering, scoped task creation, filtered drag/drop, compatible mode switching, URL persistence/reload');
 }catch(error){console.error(error);process.exitCode=1}
 finally{win.destroy();await workspace?.close();app.exit(process.exitCode||0)}
});

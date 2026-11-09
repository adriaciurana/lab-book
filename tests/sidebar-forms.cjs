const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'labbook-sidebar-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1350,height:800});
 try{
  await win.loadURL('http://localhost:4175/inbox?isolated=1');
  await win.webContents.executeJavaScript(`(async()=>{
   const assert=(v,m)=>{if(!v)throw Error(m)},tick=()=>new Promise(r=>setTimeout(r,60));
   state=await(await fetch('/api/state')).json();ResearchModel.ensure(state);currentView='inbox';currentFolder='inbox';render();await tick();
   assert(!document.querySelector('.workspace-page-tree'),'nested scrolling branches remain');
   const list=document.querySelector('#folderList');assert(getComputedStyle(list).overflowY==='auto','workspace scroll missing');
   assert(list.clientHeight>70,'workspace has no usable height');
   for(const theme of ['light','dark']){applyTheme(theme);renderFolders();await tick();
    const rows=[...list.querySelectorAll('.workspace-tree-row')].filter(e=>!e.hidden);for(let i=1;i<rows.length;i++){assert(rows[i].getBoundingClientRect().top>=rows[i-1].getBoundingClientRect().bottom-.5,'sidebar rows overlap')}
    assert(rows.every(r=>r.getBoundingClientRect().height>=34),'sidebar rows shrink');
    const toggle=list.querySelector('[data-tree-toggle="page:demo-home"]');assert(toggle,'demo page toggle missing');if(toggle.getAttribute('aria-expanded')==='true')toggle.click();
    assert(list.querySelector('[data-tree-id="demo-video"]').hidden,'page branch did not collapse');
    const before=location.pathname;list.querySelector('[data-tree-toggle="page:demo-home"]').click();assert(location.pathname===before,'collapse navigated away');
    assert(!list.querySelector('[data-tree-id="demo-video"]').hidden,'page branch did not expand');
    list.querySelector('[data-tree-toggle="folder:demo-workspace"]').click();assert(list.querySelector('[data-tree-id="demo-home"]').hidden,'folder did not collapse');
    list.querySelector('[data-tree-toggle="folder:demo-workspace"]').click();
    openExperimentEditor();await tick();
    const selects=[...document.querySelectorAll('#composerModal .hub-form-grid select')];assert(selects.length===5,'experiment selectors missing');
    for(const select of selects){const style=getComputedStyle(select),label=select.parentElement,rect=select.getBoundingClientRect();assert(style.appearance==='none','native border/arrow still visible');assert(parseFloat(style.borderRadius)>=10,'select radius missing');assert(rect.height>=44,'select too short');assert(rect.width>=label.clientWidth-2,'select not full width');assert(style.backgroundImage!=='none','custom chevron missing');assert(style.color!=='rgb(0, 0, 0)'||theme==='light','dark text invisible')}
    const repo=document.querySelector('#hubRunRepo');repo.value='demo-video-repo';repo.dispatchEvent(new Event('change'));const branch=document.querySelector('#hubRunBranch');assert(branch.options.length===6,'repository-dependent branch selection broken');
    closeComposer();
   }
   openEditor(state.notes.find(n=>n.id==='demo-video-literature'));await tick();assert(!list.querySelector('[data-tree-id="demo-video-literature"]').hidden,'active page not revealed');assert(list.querySelector('[aria-current="page"]').textContent.includes('Literature'),'active page indicator missing');
  })()`);
  fs.writeFileSync('/tmp/labbook-sidebar-fixed.png',(await win.webContents.capturePage()).toPNG());
  await win.setSize(1350,530);
  await win.webContents.executeJavaScript(`new Promise(resolve=>setTimeout(()=>{const side=document.querySelector('.sidebar'),list=document.querySelector('#folderList');if(getComputedStyle(side).overflowY!=='auto'||getComputedStyle(list).overflow!=='visible')throw Error('short-window fallback has nested scrolling');resolve()},100))`);
  await win.setSize(1350,900);
  await win.webContents.executeJavaScript(`openExperimentEditor();new Promise(r=>setTimeout(r,120))`);
  fs.writeFileSync('/tmp/labbook-selectors-fixed.png',(await win.webContents.capturePage()).toPNG());
  console.log('PASS: nonoverlapping sidebar rows, single scroll, folder/page collapse, active page reveal, small-height layout, styled native selects in both themes and dependent branch choices');app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});

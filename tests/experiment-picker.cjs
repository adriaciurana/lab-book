const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'labbook-picker-')));
const {startWorkspaceServer}=require('./support/workspace-server.cjs');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1380,height:1000});
 let workspace;
 try{
  workspace=await startWorkspaceServer();
  await win.loadURL(workspace.origin+'/experiments?isolated=1');
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const assert=(v,m)=>{if(!v)throw Error(m)},tick=()=>new Promise(r=>setTimeout(r,30));
   // Explicit fixture avoids depending on demo seeding or writing any server state.
   state.notes.push({id:'picker-parent',title:'Picker stream'},{id:'picker-child',title:'Nested ablation',parentNoteId:'picker-parent'});
   state.experiments.push({id:'picker-run',name:'Selector fixture',noteId:'picker-child',status:'planned',metrics:{}});
   for(const theme of ['light','dark']){
    applyTheme(theme);window.hubExperimentPage='';currentView='experiments';render();
    const trigger=document.querySelector('#hubExperimentFilter');trigger.click();
    assert(trigger.getAttribute('aria-expanded')==='true','picker did not open');
    const search=document.querySelector('#hubPageFilterSearch');assert(document.activeElement===search,'search was not focused');
    search.value='Nested ablation';search.dispatchEvent(new Event('input'));
    assert(document.querySelectorAll('[role="option"]').length===1,'search did not filter');
    assert(document.querySelector('[role="option"]').textContent.includes('Picker stream'),'parent breadcrumb absent');
    assert(document.querySelector('.experiment-option-count').textContent==='1','experiment count incorrect');
    search.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
    assert(search.getAttribute('aria-activedescendant'),'active keyboard option missing');
    search.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    assert(window.hubExperimentPage==='picker-child','keyboard selection failed');
    assert(document.querySelectorAll('.hub-results tbody tr').length===1&&document.querySelector('.hub-results').textContent.includes('Selector fixture'),'filter did not affect results');
    assert(document.activeElement.id==='hubExperimentFilter','focus not restored');
    document.querySelector('#hubExperimentFilter').click();
    document.querySelector('#hubPageFilterSearch').value='no such page xyz';document.querySelector('#hubPageFilterSearch').dispatchEvent(new Event('input'));
    assert(document.querySelector('[role="status"]').textContent.includes('No pages found'),'empty search missing');
    document.querySelector('#hubPageFilterSearch').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    assert(document.querySelector('#hubPageFilterPopover').hidden,'Escape failed');
    document.querySelector('#hubClearPageFilter').click();assert(window.hubExperimentPage==='','clear filter failed');
    document.querySelector('#hubExperimentFilter').click();document.querySelector('.hub-page h1').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    assert(document.querySelector('#hubPageFilterPopover').hidden,'outside click did not dismiss');
    const button=document.querySelector('#hubExperimentFilter');button.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
    assert(!document.querySelector('#hubPageFilterPopover').hidden,'keyboard open failed');
    document.querySelector('[data-page-option="picker-child"]').click();assert(window.hubExperimentPage==='picker-child','mouse selection failed');
    await tick();
   }
   document.querySelector('#hubExperimentFilter').click();
   const search=document.querySelector('#hubPageFilterSearch');search.value='mock';search.dispatchEvent(new Event('input'));
   return {options:document.querySelectorAll('[role="option"]').length};
  })()`);
  fs.writeFileSync('/tmp/labbook-experiment-picker.png',(await win.webContents.capturePage()).toPNG());
  console.log('PASS: searchable page picker, hierarchy, counts, actual filtering, mouse/keyboard, empty results, Escape, outside click, reset, both themes',result);
 }catch(error){console.error(error);process.exitCode=1}
 finally{win.destroy();await workspace?.close();app.exit(process.exitCode||0)}
});

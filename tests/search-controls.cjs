const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'labbook-search-controls-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1300,height:950});
 try{
  await win.loadURL('http://localhost:4175/research?isolated=1');
  await win.webContents.executeJavaScript(`(async()=>{
   const assert=(v,m)=>{if(!v)throw Error(m)},tick=()=>new Promise(r=>setTimeout(r,60));
   for(const theme of ['light','dark']){applyTheme(theme);currentView='search';render();await tick();const select=document.querySelector('#activeSkill'),style=getComputedStyle(select),row=select.closest('.skill-launcher').getBoundingClientRect(),rect=select.getBoundingClientRect();
    assert(style.backgroundRepeat==='no-repeat','chevron background repeats in '+theme);assert(style.backgroundImage!=='none','chevron missing in '+theme);assert(style.backgroundSize.startsWith('18px'),'chevron size incorrect: '+style.backgroundSize);assert(style.backgroundPosition.includes('12px'),'chevron is not right aligned');assert(rect.height>=44&&rect.height<60,'skill selector has incorrect height');assert(rect.width<row.width-80,'selector forces the checkbox onto another row');assert(document.querySelector('#includeWeb').getBoundingClientRect().top>=rect.top&&document.querySelector('#includeWeb').getBoundingClientRect().bottom<=rect.bottom,'web checkbox is misaligned');
   }
   state.notes.push({id:'control-note',title:'Control fixture',content:'<p>Selected evidence.</p>'});state.context=[{type:'note',key:'note:control-note',noteId:'control-note',label:'Control fixture'}];renderContextUI();
   let sent;const original=fetch;window.fetch=async(url,options)=>String(url)==='/api/search'?{ok:true,text:async()=>{sent=JSON.parse(options.body);return JSON.stringify({output:[{content:[{text:'Fixture answer'}]}]})}}:original(url,options);
   document.querySelector('#activeSkill').value=skills[0][0];document.querySelector('#includeWeb').checked=false;document.querySelector('#contextQuestion').value='Compare this evidence';document.querySelector('#askContext').click();await tick();await tick();
   assert(sent.skill===skills[0][4]&&sent.webSearch===false,'skill / checkbox values not sent');assert(sent.context[0].text.includes('Selected evidence'),'context lost');window.fetch=original;
  })()`);
  win.setSize(660,850);
  await win.webContents.executeJavaScript(`new Promise(resolve=>setTimeout(()=>{const select=document.querySelector('#activeSkill'),row=select.closest('.skill-launcher').getBoundingClientRect(),r=select.getBoundingClientRect();if(r.right>row.right+1||r.left<row.left)throw Error('responsive selector overflows');resolve()},100))`);
  console.log('PASS: single aligned chevron, correct control sizing, checkbox alignment, both themes, responsive layout and actual skill/context/search payload');app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});

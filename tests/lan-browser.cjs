const {app,BrowserWindow}=require('electron');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1280,height:900});
 const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message)});
 try{
  const base=process.env.LABBOOK_REMOTE_URL||'http://192.168.1.146:8080';
  await win.loadURL(base+'/papers?isolated=1');
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const assert=(v,m)=>{if(!v)throw Error(m)};
   assert(typeof crypto.randomUUID==='function','UUID unavailable on LAN HTTP');
   state=window.LABBOOK_SERVER_STATE;ResearchModel.ensure(state);renderPaperBank();
   assert(state.papers.length===62,'Expected remote paper library');
   assert(document.querySelectorAll('.paper-card').length===62,'Paper cards missing');
   const titles=[];
   for(const note of state.notes){openEditor(note);assert(document.querySelector('.editor-body').textContent.trim().length>100,'Empty note: '+note.title);titles.push(note.title)}
   return {secureContext:isSecureContext,papers:state.papers.length,notes:titles.length,titles};
  })()`);
  console.log(JSON.stringify({result,errors},null,2));app.exit(errors.length?1:0);
 }catch(error){console.error(error,errors);app.exit(1)}
});

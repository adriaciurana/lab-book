const {app,BrowserWindow}=require('electron');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false});
 try{
  await win.loadURL('http://192.168.1.146:8080/papers?isolated=1');
  const report=await win.webContents.executeJavaScript(`(async()=>{
   const notes=await(await fetch('/api/v1/notes')).json(),report=[];
   const norm=value=>value.replace(/\\s+/g,' ').trim();
   for(const note of notes){
    const root=document.createElement('div');root.innerHTML=note.content||'';let removed=0,previous=null;
    for(const block of [...root.children]){
     const copy=block.cloneNode(true);copy.removeAttribute('data-lab-block-id');
     const signature=copy.outerHTML;
     if(signature===previous){block.remove();removed++}else previous=signature;
    }
    const heading=root.firstElementChild;
    if(heading?.tagName==='H1'&&norm(heading.textContent)===norm(note.title)){heading.remove();removed++}
    if(!removed)continue;
    const blocks=[...root.children].map((block,order)=>{block.dataset.labBlockId||=crypto.randomUUID();return {id:block.dataset.labBlockId,html:block.outerHTML,order}});
    const latest=await fetch('/api/v1/notes/'+encodeURIComponent(note.id)),current=await latest.json();
    if(current.content!==note.content)throw Error('Note changed during repair: '+note.title);
    const response=await fetch('/api/v1/notes/'+encodeURIComponent(note.id),{method:'PATCH',headers:{'Content-Type':'application/json','If-Match':latest.headers.get('X-Labbook-Revision')},body:JSON.stringify({content:root.innerHTML,blocks,collabBlocks:[],draft:true})});
    if(!response.ok)throw Error(await response.text());report.push({title:note.title,removed});
   }return report;
  })()`);
  console.log(JSON.stringify(report,null,2));app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});

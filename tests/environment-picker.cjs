const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-picker-'));
process.env.LABBOOK_DATA_DIR=dir;
process.env.LABBOOK_CONFIG=path.join(dir,'config.json');
fs.writeFileSync(process.env.LABBOOK_CONFIG,JSON.stringify({environments:[{name:'REAL',url:'http://localhost:4173'},{name:'TEST',url:'http://localhost:4175'}]}));
let server;
app.whenReady().then(async()=>{
 try{
  server=require('../src/server/server.cjs');await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const win=new BrowserWindow({show:false,webPreferences:{partition:'environment-picker'}});
  await win.loadURL(`http://127.0.0.1:${server.address().port}/?isolated=1`);
  await win.webContents.executeJavaScript(`(async()=>{
   const badge=document.querySelector('.environment-label');if(badge.tagName!=='BUTTON')throw Error('Badge must be keyboard accessible');
   badge.click();for(let i=0;i<100&&!document.querySelector('.environment-menu');i++)await new Promise(r=>setTimeout(r,20));
   const links=[...document.querySelectorAll('.environment-menu a')];
   if(links.length!==2||links[1].textContent!=='TEST'||links[1].href!=='http://localhost:4175/')throw Error('Registered environments missing');
   document.querySelector('.create-environment').click();
   const form=document.querySelector('.environment-form');form.elements.name.value='Research';form.elements.url.value='http://localhost:4180';form.requestSubmit();
   for(let i=0;i<100&&document.querySelector('.environment-form');i++)await new Promise(r=>setTimeout(r,20));
   if(document.querySelectorAll('.environment-menu a').length!==3)throw Error('New environment missing from menu');
   const entries=await(await fetch('/api/environments')).json();if(entries[2].name!=='Research')throw Error('Environment was not persisted');
   const duplicate=await fetch('/api/environments',{method:'POST',body:JSON.stringify({name:'research',url:'http://localhost:4190'})});if(duplicate.status!==400)throw Error('Duplicate name accepted');
   document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
   if(document.querySelector('.environment-menu'))throw Error('Escape did not dismiss menu');
  })()`);
  console.log('Environment picker browser checks passed');win.destroy();
 }catch(error){console.error(error);process.exitCode=1}
 finally{server?.close();fs.rmSync(dir,{recursive:true,force:true});app.exit(process.exitCode||0)}
});

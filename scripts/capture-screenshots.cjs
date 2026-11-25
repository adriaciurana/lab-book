// Capture the real application with synthetic fixtures, never the user's workspace.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-screenshots-'));
process.env.NODE_ENV='test';
process.env.LABBOOK_DATA_DIR=path.join(temporary,'data');
process.env.LABBOOK_CONFIG=path.join(temporary,'config.json');
app.setPath('userData',path.join(temporary,'browser'));
const output=path.resolve(__dirname,'../docs/images/screenshots');
app.commandLine.appendSwitch('force-device-scale-factor','1');
let server,win;
app.whenReady().then(async()=>{
 try{
  fs.mkdirSync(output,{recursive:true});
  server=require('../src/server/server.cjs');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  fs.writeFileSync(process.env.LABBOOK_CONFIG,JSON.stringify({environments:[{name:'REAL',url:'http://localhost:4173'},{name:'TEST',url:'http://localhost:4175'}]}));
  await require('./seed-test.cjs').seedTest({base,dataRoot:process.env.LABBOOK_DATA_DIR});
  // Publish only synthetic demo notes so the screenshots show readable page content.
  const response=await fetch(base+'/api/state');const state=await response.json();
  const home=state.notes.find(note=>note.id==='demo-home');
  const architecture=home.content.match(/<div contenteditable="false" class="architecture-block"[^>]*><\/div>/)?.[0];
  if(!architecture)throw Error('Demo architecture is missing');
  state.notes.push({...home,id:'screenshot-overview',title:'Research overview',parentNoteId:null,content:'<p>Fictional demo workspace · Connect evidence, plans and results.</p><h2>From evidence to experiment</h2>'+architecture});
  for(const note of state.notes){if(note.mock){note.published={title:note.title,content:note.content};note.draft=false}}
  const saved=await fetch(base+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':response.headers.get('X-Labbook-Revision')},body:JSON.stringify(state)});
  if(!saved.ok)throw Error('Unable to prepare demo pages: '+await saved.text());
  win=new BrowserWindow({show:false,width:1600,height:1000,useContentSize:true,webPreferences:{partition:'screenshot-session',backgroundThrottling:false,offscreen:true}});
  const evaluate=code=>win.webContents.executeJavaScript(code);
  async function settle(){await evaluate(`(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));await new Promise(resolve=>setTimeout(resolve,700))})()`)}
  async function capture(name){win.webContents.invalidate();await settle();const screenshot=await win.webContents.capturePage();fs.writeFileSync(path.join(output,name+'.png'),screenshot.toPNG());console.log('Captured '+name)}
  await win.loadURL(base+'/notes/screenshot-overview');
  await evaluate("applyTheme('light')");
  await capture('research-workspace');
  await evaluate("openEditor(state.notes.find(note=>note.id==='demo-video'));openPaperSplit(state.papers.find(paper=>paper.id==='demo-paper-video'))");
  await capture('paper-annotations');
  await win.loadURL(base+'/views/demo-research-overview');
  await capture('task-boards');
  await win.loadURL(base+'/experiments');
  await capture('experiment-results');
  await win.loadURL(base+'/repositories');
  await evaluate("applyTheme('dark')");
  await capture('repository-branches');
  await win.loadURL(base+'/notes/demo-home');
  await evaluate("applyTheme('light');document.querySelector('.environment-label').click()");
  await settle();
  await evaluate("document.querySelector('.create-environment').click();document.querySelector('.environment-form input[name=name]').value='Research lab';document.querySelector('.environment-form input[name=url]').value='http://localhost:4180'");
  await evaluate("if(!document.querySelector('.environment-form'))throw Error('Environment form is missing')");
  await capture('environment-switching');
 }catch(error){console.error(error);process.exitCode=1}
 finally{
  win?.destroy();if(server)await new Promise(resolve=>server.close(resolve));
  fs.rmSync(temporary,{recursive:true,force:true});app.exit(process.exitCode||0);
 }
});

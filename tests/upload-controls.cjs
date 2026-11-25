const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),os=require('node:os');
process.env.LABBOOK_DATA_DIR=fs.mkdtempSync(require('node:path').join(os.tmpdir(),'labbook-upload-controls-'));
const server=require('../src/server/server.cjs');
app.whenReady().then(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const win=new BrowserWindow({show:false,width:1100,height:900});
 await win.loadURL(`http://127.0.0.1:${server.address().port}/papers?isolated=1`);
 await win.webContents.executeJavaScript(`(async()=>{
  const assert=(v,m)=>{if(!v)throw Error(m)},tick=()=>new Promise(r=>setTimeout(r,50));
  renderPaperBank();for(const theme of ['dark','light']){applyTheme(theme);const style=getComputedStyle(document.querySelector('#libraryTag'));assert(style.backgroundImage==='none','Tag arrow background remains in '+theme);assert(style.appearance==='auto','Native selector missing')}
  openUnifiedPaperModal(false);await tick();document.querySelector('[data-unified-tab="new"]').click();await tick();
  const input=document.querySelector('#unifiedFile'),zone=input.closest('.file-upload-zone');assert(zone,'Missing upload zone');
  let clicks=0;input.click=()=>clicks++;zone.querySelector('button').click();assert(clicks===1,'Upload button did not activate exactly once');
  const bad=new DataTransfer();bad.items.add(new File(['text'],'wrong.txt',{type:'text/plain'}));zone.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:bad}));assert(zone.querySelector('[role="alert"]').textContent.includes('Unsupported'),'Unsupported file accepted');assert(!input.files.length,'Invalid file selected');
  const good=new DataTransfer();good.items.add(new File(['%PDF-1.4'],'Example paper.pdf',{type:'application/pdf'}));zone.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:good}));await tick();assert(input.files.length===1,'Drop failed');assert(zone.textContent.includes('Example paper.pdf'),'Filename not displayed');assert(document.querySelector('#extractUnified'),'Existing extraction action broken');
 })()`);
 win.setContentSize(390,844);await win.webContents.executeJavaScript(`new Promise(r=>setTimeout(r,100))`);
 await win.webContents.executeJavaScript(`{const modal=document.querySelector('#unifiedFile').closest('.modal'),box=modal.getBoundingClientRect();if(box.width>innerWidth||modal.scrollWidth>modal.clientWidth+1)throw Error('Upload modal overflows phone screen')}`);
 console.log('PASS: single native select arrow in both themes, upload button, PDF drop, file summary, validation, extraction action and phone layout');server.close();app.exit(0);
 }catch(e){console.error(e);server.close();app.exit(1)}});

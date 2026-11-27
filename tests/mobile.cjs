const {app,BrowserWindow}=require('electron');
const {startWorkspaceServer}=require('./support/workspace-server.cjs');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:390,height:844,useContentSize:true,webPreferences:{backgroundThrottling:false}});
 let workspace;
 try{
  workspace=await startWorkspaceServer();
  await win.loadURL(workspace.origin+'/papers?isolated=1');
  for(const width of [390,320,700]){
   win.setContentSize(width,844);
   await win.webContents.executeJavaScript(`(async()=>{
    for(let i=0;i<60&&innerWidth!==${width};i++)await new Promise(r=>setTimeout(r,25));
    if(innerWidth!==${width})throw Error('The test viewport did not resize to ${width}px');
   })()`);
   await win.webContents.executeJavaScript(`(async()=>{
    const assert=(v,m)=>{if(!v)throw Error(m+' at '+innerWidth+'px')};
    const menu=document.querySelector('.mobile-menu-button'),sidebar=document.querySelector('.sidebar');
    assert(getComputedStyle(menu).display!=='none','Missing menu button');
    menu.click();
    for(let i=0;i<40&&sidebar.getBoundingClientRect().left<-1;i++)await new Promise(r=>setTimeout(r,25));
    assert(getComputedStyle(sidebar).display==='flex','Sidebar hidden by old media query');
    assert(sidebar.getBoundingClientRect().left>=-1&&!sidebar.inert,'Drawer not accessible');
    window.dispatchEvent(new Event('resize'));
    assert(menu.getAttribute('aria-expanded')==='true'&&!sidebar.inert,'A resize within mobile layout closed the drawer');
    document.querySelector('.mobile-nav-backdrop').click();assert(menu.getAttribute('aria-expanded')==='false'&&sidebar.inert,'Outside click failed');
    menu.click();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(menu.getAttribute('aria-expanded')==='false','Escape failed');
    menu.click();sidebar.querySelector('[data-view="papers"]').click();assert(!document.body.classList.contains('mobile-nav-open'),'Navigation did not close drawer');
    assert(document.documentElement.scrollWidth<=innerWidth+1,'Paper bank overflows viewport');
   })()`);
  }
  win.setContentSize(1200,900);await win.webContents.executeJavaScript(`new Promise(r=>setTimeout(r,50))`);
  await win.webContents.executeJavaScript(`if(document.querySelector('.sidebar').inert)throw Error('Desktop navigation remains inert')`);
  console.log('PASS: mobile drawer, backdrop, Escape, navigation, paper-bank width at 320/390/700px and desktop recovery');
 }catch(error){console.error(error);process.exitCode=1}
 finally{win.destroy();await workspace?.close();app.exit(process.exitCode||0)}
});

const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{partition:'appearance-regression'}});
 try{
  await win.loadURL('http://localhost:4173/papers?isolated=1');
  const result=await win.webContents.executeJavaScript(`(async()=>{
   const assert=(value,message)=>{if(!value)throw Error(message)},tick=()=>new Promise(r=>setTimeout(r,30)),checks=[];
   state=await(await fetch('/api/state')).json();renderFolders();
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
   const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};
   const mix=(top,bottom)=>{const a=top[3]/255;return [0,1,2].map(i=>top[i]*a+bottom[i]*(1-a)).concat(255)};
   const bg=element=>{const nodes=[];for(let node=element;node;node=node.parentElement)nodes.unshift(node);return nodes.reduce((color,node)=>mix(rgb(getComputedStyle(node).backgroundColor),color),[255,255,255,255])};
   const luminance=color=>color.slice(0,3).map(c=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
   const check=selector=>{
    const nodes=[...document.querySelectorAll(selector)].filter(n=>n.getClientRects().length);
    assert(nodes.length,'No visible element for '+selector);
    for(const node of nodes){const background=bg(node),foreground=mix(rgb(getComputedStyle(node).color),background);
     const a=luminance(background),b=luminance(foreground),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
     assert(ratio>=4.5,document.documentElement.dataset.theme+' contrast '+selector+' = '+ratio.toFixed(2)+' '+node.textContent.slice(0,40)+' foreground '+getComputedStyle(node).color+' background '+getComputedStyle(node).backgroundColor);
     checks.push(selector+': '+ratio.toFixed(2));
    }
   };
   for(const theme of ['light','dark']){
    applyTheme(theme);currentView='papers';render();await tick();
    ['.new-page','.brand-mark','.main-nav .nav-item','.folder','.folder-icon','.section-label','.storage-status','.crumbs','.library-list-head','.paper-title-link','.paper-card-icon','.paper-card .tag','.paper-card .btn.ghost'].forEach(check);
    assert(document.querySelectorAll('.main-nav .ui-icon').length===document.querySelectorAll('.main-nav [data-view]').length,'sidebar icon set incomplete');
    assert(!document.querySelector('.main-nav span').textContent.trim(),'legacy glyph still visible in sidebar');
    assert([...document.querySelectorAll('.folder-label')].every(n=>getComputedStyle(n).textAlign==='left'),'folder alignment changed');
    for(const view of ['search','skills','board','inbox','experiments','repositories']){currentView=view;render();await tick();if(view==='skills'){check('.skill-card');check('.skill-icon')}if(view==='search'){check('#askContext');document.querySelector('#addContext').click();check('.context-picker');document.querySelector('.context-dismiss').click()}if(view==='board')check('#emptyBoard');if(view==='experiments'||view==='repositories')check('.hub-page')}
    openEditor();check('.editor .title');check('.tool-btn');check('#saveNote');check('#cancelEdit');
    insertEditorHTML('<blockquote>Readable quote</blockquote><table class="research-table"><tr><td>Readable cell</td></tr></table>');
    check('.editor-body blockquote');check('.research-table td');
    document.querySelector('#settingsBtn').click();check('#settingsModal .modal');check('#saveSettings');
    document.querySelector('#settingsModal').classList.remove('open');document.querySelector('#cancelEdit').click();
   }
   applyTheme('dark');currentView='papers';render();await tick();
   return {checks:checks.length};
  })()`);
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-appearance-'));
  fs.writeFileSync(path.join(directory,'dark-library.png'),(await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript("new Promise(resolve=>{applyTheme('light');requestAnimationFrame(()=>requestAnimationFrame(resolve))})");
  fs.writeFileSync(path.join(directory,'light-library.png'),(await win.webContents.capturePage()).toPNG());
  console.log('PASS: '+result.checks+' text contrast checks, both themes, all main sections, icons, folder alignment, modal/editor readability');
  console.log('Screenshots: '+directory);
  app.exit(0);
 }catch(error){console.error(error);app.exit(1)}
});

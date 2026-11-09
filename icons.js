// A single local SVG icon set, inheriting the current theme's text color.
const uiIconPaths={
 notebook:'M5 3h14v18H5z M9 3v18 M12 8h4 M12 12h4 M12 16h3',
 inbox:'M4 4h16v16H4z M4 13h4l2 3h4l2-3h4',
 search:'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13 M16 16l5 5',
 columns:'M3 4h18v16H3z M9 4v16 M15 4v16',
 library:'M4 4v16 M8 4v16 M12 4v16 M16 5l4 14',
 sparkles:'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
 folder:'M3 6h6l2 2h10v12H3z M3 6V4h7l2 2',
 book:'M12 5v15 M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 M12 5c4-3 8-2 10-1v15c-4-2-7-1-10 1',
 flask:'M9 3h6 M10 3v7l-6 9q-1 2 2 2h12q3 0 2-2l-6-9V3 M7 15h10',
 video:'M3 5h13v14H3z M16 9l5-3v12l-5-3',
 brain:'M12 5c-4-5-9 0-7 4-5 2-3 8 1 8 0 5 6 5 6 1 M12 5c4-5 9 0 7 4 5 2 3 8-1 8 0 5-6 5-6 1 M12 5v13',
 bolt:'M13 2L4 14h7l-1 8 10-13h-7z',
 rocket:'M8 15l-3 4 4-1 M9 15l-3-3C8 5 13 2 21 3c1 8-2 13-9 15z M15 8h1 M6 12H3l1-5 5-1 M12 18v3l5-1 1-5',
 layers:'M12 3L2 8l10 5 10-5z M2 12l10 5 10-5 M2 16l10 5 10-5',
 bulb:'M9 18h6 M10 21h4 M8 15c-6-7 2-15 7-10 4 4-1 9-1 10v1H9v-1',
 microscope:'M9 3l5 3-4 8-5-3z M12 8c10 4 5 12-1 12H5 M3 22h18 M7 14l-2 3h7',
 sprout:'M12 21v-9 M12 16C4 16 3 11 3 7c6 0 9 3 9 9 M12 12c0-7 4-9 9-9 0 5-2 9-9 9',
 puzzle:'M4 4h6a3 3 0 1 1 4 0h6v6a3 3 0 1 0 0 4v6h-6a3 3 0 1 0-4 0H4v-6a3 3 0 1 0 0-4z',
 file:'M5 2h9l5 5v15H5z M14 2v6h5 M8 12h8 M8 16h8',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
 sun:'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10 M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2',
 moon:'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11',
 plus:'M12 5v14 M5 12h14',
 edit:'M4 16L16 4l4 4L8 20H4z M13 7l4 4',
 quote:'M4 5h6v7H6c0 3 1 4 3 5 M14 5h6v7h-4c0 3 1 4 3 5',
 image:'M3 3h18v18H3z M3 16l5-5 5 5 3-3 5 5 M15 7h1',
 table:'M3 4h18v16H3z M3 9h18 M3 14h18 M10 4v16',
 gallery:'M3 4h18v16H3z M9 4v16 M15 4v16',
 upload:'M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6',
 divider:'M3 12h18',
 arrow:'M4 12h16 M14 6l6 6-6 6',
 user:'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M4 21v-3c0-7 16-7 16 0v3',
 close:'M6 6l12 12 M6 18L18 6'
};
const iconAliases={'◇':'folder','🗂️':'folder','📁':'folder','📚':'book','🧪':'flask','🎥':'video','🧠':'brain','⚡':'bolt','🚀':'rocket','💡':'bulb','🔬':'microscope','🌱':'sprout','🧩':'puzzle','✦':'inbox','◈':'brain','◌':'video','↗':'arrow','✎':'edit','◒':'file','□':'file','▧':'file','✣':'sparkles','⌕':'search','⌁':'layers','⚗':'flask','▤':'book','▦':'columns','✧':'sparkles','✳':'notebook'};
function iconSvg(name){return '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="'+(uiIconPaths[name]||uiIconPaths.folder)+'"></path></svg>'}
function putIcon(element,name,original=''){
 if(!element||element.dataset.uiIcon===name)return;
 element.dataset.uiIcon=name;element.innerHTML=iconSvg(name)+(original?'<span class="sr-only"></span>':'');
 if(original)element.querySelector('.sr-only').textContent=original;
}
function refreshIcons(){
 for(const [view,name]of Object.entries({inbox:'inbox',search:'search',board:'columns',papers:'library',skills:'sparkles',experiments:'flask',repositories:'layers'}))putIcon(document.querySelector('.main-nav [data-view="'+view+'"]>span'),name);
 putIcon(document.querySelector('.brand-mark'),'notebook');
 putIcon(document.querySelector('#newPageBtn>span'),'plus');
 putIcon(document.querySelector('#settingsBtn>span'),'settings');
 putIcon(document.querySelector('#profileBtn'),'user');
 putIcon(document.querySelector('#addFolderBtn'),'plus');document.querySelector('#addFolderBtn').setAttribute('aria-label','Create page or use a template');
 document.querySelectorAll('#emojiPicker [data-emoji]').forEach(button=>{const name=iconAliases[button.dataset.emoji]||'folder';putIcon(button,name);button.title=name;button.setAttribute('aria-label',name)});
 document.querySelectorAll('.folder[data-folder]').forEach(button=>{
  const folder=state.folders.find(f=>f.id===button.dataset.folder);if(!folder)return;
  putIcon(button.querySelector('.folder-icon'),iconAliases[folder.icon]||folder.icon||'folder');
  if(!button.querySelector('.folder-label')){const node=[...button.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(node){const label=document.createElement('span');label.className='folder-label';label.textContent=node.textContent;node.replaceWith(label)}}
  const count=button.querySelector('small'),total=state.notes.filter(n=>folder.id==='inbox'||n.folder===folder.id).length;
  if(count&&count.textContent!==String(total))count.textContent=total;
 });
 const inboxCount=document.querySelector('.main-nav [data-view="inbox"] i');if(inboxCount&&inboxCount.textContent!==String(state.notes.length))inboxCount.textContent=state.notes.length;
 document.querySelectorAll('.paper-card-icon,.paper-embed-icon,.paper-side-head>span').forEach(e=>putIcon(e,'file'));
 document.querySelectorAll('.note-type').forEach(e=>putIcon(e,'file'));
 document.querySelectorAll('.skill-icon').forEach(e=>putIcon(e,iconAliases[e.textContent.trim()]||e.dataset.uiIcon||'sparkles'));
 document.querySelectorAll('.card-icon').forEach((e,index)=>putIcon(e,['edit','file','search'][index%3]));
 document.querySelectorAll('.tool-btn').forEach(button=>{
  const text=button.textContent.trim();
  if(text==='❝')putIcon(button,'quote','❝');
  if(text==='＋')putIcon(button,'plus','＋');
 });
 document.querySelectorAll('.block-option').forEach(button=>{
  if(button.dataset.iconReady)return;button.dataset.iconReady='true';
  const text=[...button.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(!text)return;
  const node=document.createElement('span');node.innerHTML=iconSvg(({image:'image',upload:'upload',table:'table',gallery:'gallery',divider:'divider',paper:'file',markdown:'file'})[button.dataset.block]||'file');text.replaceWith(node);
 });
}
function applyTheme(mode){
 document.documentElement.dataset.theme=mode;document.body.classList.toggle('dark',mode==='dark');
 localStorage.setItem('labbook-theme',mode);
 const button=document.querySelector('#themeBtn');putIcon(button,mode==='dark'?'sun':'moon');
 button.title=mode==='dark'?'Switch to light mode':'Switch to dark mode';button.setAttribute('aria-label',button.title);
 button.setAttribute('aria-pressed',String(mode==='dark'));
}
applyTheme(document.documentElement.dataset.theme||localStorage.getItem('labbook-theme')||'light');
document.querySelector('#themeBtn').onclick=()=>applyTheme(document.body.classList.contains('dark')?'light':'dark');
refreshIcons();
const iconObserver=new MutationObserver(refreshIcons);iconObserver.observe(document.body,{childList:true,subtree:true});

(function(){
 const topbar=document.querySelector('.topbar'),sidebar=document.querySelector('.sidebar');
 const mobileViewport=window.matchMedia('(max-width: 700px)');
 if(!topbar||!sidebar)return;
 sidebar.id=sidebar.id||'workspaceNavigation';
 const button=document.createElement('button');
 button.className='mobile-menu-button';button.type='button';button.textContent='☰';
 button.setAttribute('aria-controls',sidebar.id);button.setAttribute('aria-label','Open navigation');button.setAttribute('aria-expanded','false');topbar.prepend(button);
 const backdrop=document.createElement('button');backdrop.className='mobile-nav-backdrop';backdrop.type='button';backdrop.hidden=true;backdrop.setAttribute('aria-label','Close navigation');document.body.append(backdrop);
 function setOpen(open,restoreFocus=false){
  document.body.classList.toggle('mobile-nav-open',open);backdrop.hidden=!open;
  button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  sidebar.inert=mobileViewport.matches&&!open;
  if(open)sidebar.querySelector('button,a,input')?.focus();else if(restoreFocus)button.focus();
 }
 button.onclick=()=>setOpen(!document.body.classList.contains('mobile-nav-open'));
 backdrop.onclick=()=>setOpen(false,true);
 sidebar.addEventListener('click',event=>{if(event.target.closest('.nav-item,.folder,.new-page,[data-note],a'))setOpen(false)});
 document.addEventListener('keydown',event=>{
  if(!document.body.classList.contains('mobile-nav-open'))return;
  if(event.key==='Escape'){setOpen(false,true);return}
  if(event.key==='Tab'){
   const controls=[...sidebar.querySelectorAll('button,a[href],input,select,[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length),first=controls[0],last=controls.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
  }
 });
 mobileViewport.addEventListener('change',()=>setOpen(false));setOpen(false);
})();

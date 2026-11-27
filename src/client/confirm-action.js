function confirmAction({title, description, action, destructive=false}){
 if(document.querySelector('dialog.action-dialog[open]'))return Promise.resolve(false);
 const opener=document.activeElement;
 const dialog=document.createElement('dialog');
 dialog.className='action-dialog';
 dialog.setAttribute('aria-labelledby','actionDialogTitle');
 dialog.setAttribute('aria-describedby','actionDialogDescription');
 dialog.innerHTML='<form method="dialog"><h2 id="actionDialogTitle"></h2><p id="actionDialogDescription"></p><footer><button class="btn ghost" value="cancel" autofocus>Cancel</button><button class="btn primary" value="confirm"></button></footer></form>';
 dialog.querySelector('h2').textContent=title;
 dialog.querySelector('p').textContent=description;
 const primary=dialog.querySelector('[value=confirm]');
 primary.textContent=action;
 primary.classList.toggle('destructive',destructive);
 document.body.append(dialog);
 return new Promise(resolve=>{
  dialog.addEventListener('close',()=>{
   const confirmed=dialog.returnValue==='confirm';
   dialog.remove();
   if(opener?.isConnected)opener.focus();
   resolve(confirmed);
  },{once:true});
  dialog.showModal();
 });
}

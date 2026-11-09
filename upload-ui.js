(function(){
 function enhance(){
  document.querySelectorAll('input[type="file"]:not([hidden]):not([data-upload-ready])').forEach(input=>{
   input.dataset.uploadReady='true';
   const zone=document.createElement('div');zone.className='file-upload-zone';
   input.before(zone);zone.append(input);input.classList.add('file-upload-input');input.tabIndex=-1;
   const button=document.createElement('button');button.type='button';button.className='file-upload-button';button.textContent=input.multiple?'Choose files':'Choose file';
   button.onclick=event=>{event.preventDefault();event.stopPropagation();input.click()};
   const info=document.createElement('span');info.className='file-upload-info';info.setAttribute('aria-live','polite');
   const error=document.createElement('span');error.className='file-upload-error';error.setAttribute('role','alert');
   zone.append(button,info,error);
   const update=()=>{info.textContent=input.files.length?[...input.files].map(file=>file.name+' · '+(file.size/1048576).toFixed(1)+' MB').join(', '):'Drop '+(input.multiple?'files':'a file')+' here or choose from your device'+(input.accept?' · '+input.accept.replaceAll('application/','').replaceAll('image/',''): '');button.textContent=input.files.length?'Change selection':input.multiple?'Choose files':'Choose file'};
   input.addEventListener('change',()=>{error.textContent='';update()});update();
   zone.ondragover=e=>{e.preventDefault();zone.classList.add('is-dragging')};zone.ondragleave=()=>zone.classList.remove('is-dragging');
   zone.ondrop=e=>{
    e.preventDefault();e.stopPropagation();zone.classList.remove('is-dragging');
    const files=[...e.dataTransfer.files];if(!files.length)return;
    if(!input.multiple&&files.length>1){error.textContent='Choose one file at a time.';return}
    const accept=input.accept.toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
    if(files.some(file=>accept.length&&!accept.some(type=>type.startsWith('.')?file.name.toLowerCase().endsWith(type):type.endsWith('/*')?file.type.startsWith(type.slice(0,-1)):file.type===type))){error.textContent='Unsupported file type. Accepted: '+input.accept;return}
    const transfer=new DataTransfer();files.forEach(file=>transfer.items.add(file));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
   };
  });
 }
 new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});enhance();
})();

function installDiagramAIChat({dialog,getScene,getSource,isSourceClean,applyScene,status}){
 const toolbar=dialog.querySelector('.diagram-toolbar');
 const launch=document.createElement('button');launch.type='button';launch.className='btn primary';launch.id='diagramHarmonize';launch.textContent='✧ Harmonize with AI';dialog.querySelector('#diagramClose').before(launch);
 const panel=document.createElement('section');panel.className='diagram-ai-panel';panel.hidden=true;
 panel.innerHTML='<header><div><strong>Scientific figure designer</strong><p class="muted">Refine the layout with context and reference images. Review before applying.</p></div><button type="button" class="text-btn" data-ai-close aria-label="Close figure chat">×</button></header><div class="diagram-ai-grid"><div class="diagram-ai-conversation"><label>API model<input id="diagramAIModel" list="diagramAIModels" value="gpt-5.5"><datalist id="diagramAIModels"><option value="gpt-5.5">GPT-5.5</option><option value="gpt-6-astra">GPT-6 Astra</option><option value="gpt-6.1-sol">GPT-6.1 Sol</option></datalist></label><div class="diagram-ai-messages" role="log" aria-live="polite"></div><details><summary>Add page context</summary><label>Pages<select id="diagramAIPages" multiple aria-label="Select pages as figure context"></select></label><label>Extra context<textarea id="diagramAIContext" rows="3" placeholder="What does each component mean? Which colors or structure should stay?"></textarea></label></details><div class="diagram-ai-attachments"></div><div class="diagram-ai-input"><textarea id="diagramAIMessage" rows="3" aria-label="Message for the figure designer" placeholder="Align the modules, show tokens as grids and use consistent colors. Keep all scientific labels."></textarea><div><button class="btn ghost" type="button" id="diagramAIAttach">Attach images</button><input type="file" id="diagramAIImages" accept="image/png,image/jpeg,image/webp" multiple hidden><button class="btn primary" type="button" id="diagramAISend">Send</button><button class="text-btn" type="button" id="diagramAIStop" hidden>Stop</button></div></div><small class="muted">The canvas, selected context and attached images are sent to the chosen OpenAI model. Uses server API credits.</small><p id="diagramAIStatus" role="status"></p></div><div class="diagram-ai-review"><div class="section-head"><strong>Proposal preview</strong><button class="btn primary" type="button" id="diagramAIApply" disabled>Apply proposal</button></div><div id="diagramAIPreview"><p class="muted">Chat with the designer to propose a revision. Your canvas stays unchanged until you apply it.</p></div></div></div>';
 dialog.querySelector('.diagram-workspace').after(panel);
 const q=id=>panel.querySelector('#'+id),log=panel.querySelector('.diagram-ai-messages');
 let messages=structuredClone(getScene().assistantHistory||[]).filter(m=>['user','assistant'].includes(m.role)&&typeof m.text==='string').slice(-12),images=[],pending=null,baseline=null,controller=null,closed=false;
 const pages=q('diagramAIPages');for(const note of state.notes){const o=document.createElement('option');o.value=note.id;o.textContent=note.title;pages.append(o)}
 function drawMessages(){log.replaceChildren();for(const m of messages){const article=document.createElement('article');article.dataset.role=m.role;const name=document.createElement('strong');name.textContent=m.role==='user'?'You':'Figure designer';const text=document.createElement('p');text.textContent=m.text;article.append(name,text);log.append(article)}log.scrollTop=log.scrollHeight}
 function drawImages(){const host=panel.querySelector('.diagram-ai-attachments');host.replaceChildren();images.forEach((item,i)=>{const card=document.createElement('figure'),img=document.createElement('img'),remove=document.createElement('button');img.src=item.data;img.alt=item.name;remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remove '+item.name);remove.onclick=()=>{images.splice(i,1);drawImages()};card.append(img,remove);host.append(card)})}
 launch.onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden){drawMessages();panel.scrollIntoView({block:'nearest',behavior:'smooth'});q('diagramAIMessage').focus()}};
 panel.querySelector('[data-ai-close]').onclick=()=>{panel.hidden=true;controller?.abort()};
 q('diagramAIAttach').onclick=()=>q('diagramAIImages').click();
 async function addReferences(files){
  if(images.length+files.length>4)throw Error('Use up to four reference images.');
  for(const file of files)if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024)throw Error('References must be PNG, JPEG or WebP, up to 2 MB each.');
  const items=await Promise.all(files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:file.name,data:reader.result});reader.onerror=()=>reject(Error('Unable to read '+file.name));reader.readAsDataURL(file)})));
  images.push(...items);drawImages();
 }
 q('diagramAIImages').onchange=async e=>{try{await addReferences([...e.target.files]);q('diagramAIStatus').textContent='References attached.'}catch(error){q('diagramAIStatus').textContent=error.message}e.target.value=''};
 panel.ondragover=e=>e.preventDefault();panel.ondrop=async e=>{e.preventDefault();e.stopPropagation();try{await addReferences([...e.dataTransfer.files])}catch(error){q('diagramAIStatus').textContent=error.message}};
 async function previewImage(scene){
  const svg=new DOMParser().parseFromString(DiagramModel.svg(scene),'image/svg+xml').documentElement;svg.removeAttribute('data-labbook-diagram');
  const image=new Image();image.src='data:image/svg+xml;base64,'+diagramBase64(new XMLSerializer().serializeToString(svg));await image.decode();
  const canvas=document.createElement('canvas'),scale=Math.min(1,1024/scene.width,800/scene.height);canvas.width=Math.round(scene.width*scale);canvas.height=Math.round(scene.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png');
 }
 q('diagramAISend').onclick=async()=>{
  if(controller)return;
  if(!isSourceClean()){q('diagramAIStatus').textContent='Import your source changes into the canvas first.';return}
  const text=q('diagramAIMessage').value.trim();if(!text){q('diagramAIMessage').focus();return}
  const current=structuredClone(getScene());if(!baseline)baseline=JSON.stringify(current);
  const sourceScene=pending||current;messages.push({role:'user',text});messages=messages.slice(-14);drawMessages();q('diagramAIMessage').value='';
  controller=new AbortController();q('diagramAISend').disabled=true;q('diagramAIApply').disabled=true;q('diagramAIStop').hidden=false;q('diagramAIStatus').textContent='Designing a proposal…';
  try{
   let context=q('diagramAIContext').value;
   for(const option of pages.selectedOptions){const note=state.notes.find(n=>n.id===option.value);if(!note)continue;const div=document.createElement('div');div.innerHTML=note.content||'';context+='\nPAGE: '+note.title+'\n'+div.textContent}
   if(context.length>18000)throw Error('Selected context is too long. Choose fewer pages or paste a short excerpt.');
   const preview=await previewImage(sourceScene);
   const r=await fetch('/api/diagrams/harmonize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scene:sourceScene,messages,context,images,preview,model:q('diagramAIModel').value.trim()}),signal:controller.signal});
   let data;try{data=await r.json()}catch{throw Error('The server returned an unreadable response.')}if(!r.ok)throw Error(data.error||'Design request failed');if(closed||!dialog.isConnected)return;
   messages.push({role:'assistant',text:data.reply});drawMessages();
   if(data.scene){DiagramModel.validate(data.scene);pending=data.scene;q('diagramAIPreview').innerHTML=DiagramModel.svg(pending);q('diagramAIApply').disabled=false;q('diagramAIStatus').textContent='Proposal ready. Apply it, or send another message to refine it.'}else{q('diagramAIApply').disabled=!pending;q('diagramAIStatus').textContent='The designer has a question. Reply to continue.'}
  }catch(error){if(!closed){q('diagramAIStatus').textContent=error.name==='AbortError'?'Request stopped. Your canvas is unchanged.':error.message;q('diagramAIApply').disabled=!pending}}
  finally{controller=null;if(!closed){q('diagramAISend').disabled=false;q('diagramAIStop').hidden=true}}
 };
 q('diagramAIStop').onclick=()=>controller?.abort();
 q('diagramAIApply').onclick=()=>{
  if(!pending)return;if(JSON.stringify(getScene())!==baseline){q('diagramAIStatus').textContent='The canvas changed during the conversation. Reopen the chat to start from the current canvas.';pending=null;baseline=null;q('diagramAIApply').disabled=true;return}
  const next=structuredClone(pending);next.assistantHistory=messages.slice(-12);if(applyScene(next)!==false){pending=null;baseline=null;q('diagramAIApply').disabled=true;q('diagramAIStatus').textContent='Proposal applied. Undo is available in the editor.';status('AI proposal applied. Save the diagram to keep it in your note.')}
 };
 panel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){panel.hidden=true;controller?.abort()}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&e.target===q('diagramAIMessage')){e.preventDefault();q('diagramAISend').click()}});
 drawMessages();return ()=>{closed=true;controller?.abort()};
}

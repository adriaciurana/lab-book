(function(){
 let account;
 async function api(route,body){
  const response=await fetch('/api/account/'+route,body===undefined?{}:{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
  });
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Unable to complete the request');
  return data;
 }

 function dialog(title,content){
  const backdrop=document.createElement('div');
  backdrop.className='modal-backdrop open';
  backdrop.innerHTML='<section class="modal" role="dialog" aria-modal="true" aria-label="'+title+'"><button type="button" class="modal-close" aria-label="Close">×</button><h2>'+title+'</h2><div data-account-content></div><p role="status"></p></section>';
  const opener=document.activeElement;
  const close=()=>{backdrop.remove();opener?.focus()};
  backdrop.querySelector('.modal-close').onclick=close;
  backdrop.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close()}});
  backdrop.querySelector('[data-account-content]').append(content);
  document.body.append(backdrop);
  backdrop.querySelector('.modal-close').focus();
  return {backdrop,close,status:message=>{backdrop.querySelector('[role=status]').textContent=message}};
 }

 let opening=false,reminder;
 function updateReminder(configuration){
  reminder.hidden=configuration.configured&&!configuration.setupRequired;
  reminder.textContent=configuration.setupRequired?'Set up workspace AI':configuration.mode==='personal'?'Connect your AI account or add a key':'Team AI key not configured';
 }
 async function settings(){
  if(opening||document.querySelector('[data-managed-account-settings]'))return;
  opening=true;
  try{await showSettings()}finally{opening=false}
 }
 async function showSettings(){
  const configuration=await api('ai');
  updateReminder(configuration);
  const content=document.createElement('div');
  const identity=document.createElement('p');identity.textContent=account.username+' · '+account.role;
  content.append(identity);
  const form=document.createElement('form');
  form.innerHTML='<label>AI credentials<select name="mode"><option value="team">Shared team key</option><option value="personal">Personal credentials</option></select></label><label>Provider<select name="provider"><option value="openai">OpenAI</option><option value="claude">Claude</option></select></label><label>API key<input name="key" type="password" autocomplete="new-password" placeholder="Leave blank to keep the saved key"></label><button class="btn primary">Save AI settings</button>';
  const mode=form.elements.mode;mode.value=configuration.mode;
  form.elements.provider.value=configuration.provider==='claude'?'claude':'openai';
  mode.disabled=account.role!=='admin';
  if(configuration.mode==='personal'){
   const connect=document.createElement('button');connect.type='button';connect.className='btn ghost';
   connect.textContent=configuration.chatgptEmail?'Reconnect ChatGPT':'Continue with ChatGPT';
   connect.disabled=!configuration.chatgptAvailable;
   connect.onclick=async()=>{
    connect.disabled=true;
    panel.status('Opening ChatGPT sign-in…');
    try{const result=await api('chatgpt',{});location.assign(result.url)}
    catch(error){panel.status(error.message);connect.disabled=false}
   };
   const info=document.createElement('p');
   info.textContent=configuration.chatgptEmail?'ChatGPT connected · '+configuration.chatgptEmail:configuration.chatgptAvailable?'Use your ChatGPT plan in My agent.':'To connect ChatGPT, open Lab Book at 127.0.0.1 or through an SSH tunnel.';
   content.append(info);
   if(configuration.chatgptAvailable)content.append(connect);
   else{
    const local=document.createElement('a');
    local.className='btn ghost';
    local.href='http://127.0.0.1:4173/agent';
    local.textContent='Open Lab Book through the local tunnel';
    content.append(local);
   }
   if(configuration.chatgptEmail){
    const disconnect=document.createElement('button');disconnect.type='button';disconnect.className='text-btn';disconnect.textContent='Disconnect ChatGPT from Lab Book';
    disconnect.onclick=async()=>{try{await api('chatgpt',{disconnect:true});panel.close();if(currentView==='search')renderSearch();await settings()}catch(error){panel.status(error.message)}};
    content.append(disconnect);
   }
  }
  const canSet=account.role==='admin'||configuration.mode==='personal';
  if(canSet)content.append(form);
  if(account.role==='admin'){
   const members=document.createElement('form');
   members.innerHTML='<h3>Add a member</h3><label>Username<input name="username" required autocomplete="off"></label><label>Temporary password<input name="password" required minlength="12" type="password" autocomplete="new-password"></label><button class="btn ghost">Create member</button><ul aria-label="Workspace members"></ul>';
   const renderMembers=async()=>members.querySelector('ul').replaceChildren(...(await api('members')).map(member=>{
    const row=document.createElement('li');row.textContent=member.username+' · '+member.role;
    if(member.id===account.id)return row;
    const role=document.createElement('select');role.setAttribute('aria-label','Role for '+member.username);
    role.add(new Option('Member','member'));role.add(new Option('Administrator','admin'));role.value=member.role;
    role.onchange=async()=>{
     const selectedRole=role.value;
     const accepted=await confirmAction({title:'Change workspace role?',description:'Changing the role for '+member.username+' will sign them out of their current sessions.',action:'Change role'});
     if(!accepted){role.value=member.role;return}
     try{await api('member-access',{id:member.id,role:selectedRole});await renderMembers();panel.status('Role updated.')}
     catch(error){role.value=member.role;panel.status(error.message)}
    };
    const revoke=document.createElement('button');revoke.type='button';revoke.className='text-btn';revoke.textContent='Sign out sessions';
    revoke.onclick=async()=>{try{await api('member-access',{id:member.id,revoke:true});panel.status('Sessions ended for '+member.username+'.')}catch(error){panel.status(error.message)}};
    row.append(role,revoke);return row;
   }));
   await renderMembers();content.append(members);
   members.onsubmit=async event=>{
    event.preventDefault();
    try{await api('members',Object.fromEntries(new FormData(members)));members.reset();await renderMembers();panel.status('Member added. They must change their temporary password.')}
    catch(error){panel.status(error.message)}
   };
  }
  const passwordForm=document.createElement('form');
  passwordForm.innerHTML='<h3>Change password</h3><label>Current password<input name="current" type="password" autocomplete="current-password" required></label><label>New password<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="256" required></label><button class="btn ghost">Update password</button>';
  content.append(passwordForm);
  const logout=document.createElement('button');logout.type='button';logout.className='btn ghost';logout.textContent='Sign out';content.append(logout);
  const panel=dialog('Account settings',content);
  panel.backdrop.dataset.managedAccountSettings='';
  panel.status(configuration.setupRequired?'Choose how this workspace will use AI before sending chat requests.':configuration.configured?'AI credential configured.':'No AI credential configured for this account.');
  passwordForm.onsubmit=async event=>{
   event.preventDefault();
   try{
    await api('password',Object.fromEntries(new FormData(passwordForm)));
    passwordForm.reset();
    panel.status('Password updated. Other sessions have been signed out.');
   }catch(error){panel.status(error.message)}
  };
  logout.onclick=async()=>{try{if(!flushDraft())return;await api('logout',{});location.reload()}catch(error){panel.status(error.message)}};
  form.onsubmit=async event=>{
   event.preventDefault();
   try{const payload=Object.fromEntries(new FormData(form));await api('ai',payload);form.elements.key.value='';panel.close();if(currentView==='search')renderSearch();await showSettings()}
   catch(error){panel.status(error.message)}
  };
 }

 async function share(note){
  if(!flushDraft())return;
  const data=await api('share?noteId='+encodeURIComponent(note.id));
  const form=document.createElement('form');
  form.innerHTML='<label>Visibility<select name="visibility"><option value="private">Private</option><option value="workspace">Workspace (read only by default)</option><option value="shared">Selected members</option></select></label><div data-recipients></div><button class="btn primary">Save sharing</button>';
  form.elements.visibility.value=data.visibility;
  for(const member of data.members){
   const label=document.createElement('label');label.textContent=member.username;
   const select=document.createElement('select');select.name=member.id;
   for(const [value,text]of [['','Default access'],['view','Can view'],['edit','Can edit']])select.add(new Option(text,value));
   select.value=data.grants.find(grant=>grant.userId===member.id)?.role||'';
   label.append(select);form.querySelector('[data-recipients]').append(label);
  }
  const recipients=form.querySelector('[data-recipients]');
  const sync=()=>{recipients.hidden=form.elements.visibility.value==='private'};
  form.elements.visibility.onchange=sync;sync();
  const panel=dialog('Share page',form);
  form.onsubmit=async event=>{
   event.preventDefault();
   try{
    const grants=[...recipients.querySelectorAll('select')].filter(select=>select.value).map(select=>({userId:select.name,role:select.value}));
    await api('share',{noteId:note.id,visibility:form.elements.visibility.value,grants});
    location.reload();
   }catch(error){panel.status(error.message)}
  };
 }

 function renderSharing(){
  const editor=document.querySelector('.editor[data-note-id]');
  const note=state.notes.find(item=>item.id===editor?.dataset.noteId);
  const tools=editor?.querySelector('.editor-tools');
  if(!note||!tools)return;
  if(note.accessRole==='view'){
   const edit=tools.querySelector('#editPublishedNote');
   if(edit){edit.disabled=true;edit.title='This page is read only'}
  }
  if(tools.querySelector('[data-account-share]')||(account.role!=='admin'&&note.ownerId!==account.id))return;
  const button=document.createElement('button');button.type='button';button.className='btn ghost';
  button.dataset.accountShare='';button.textContent='Share';
  button.onclick=()=>share(note).catch(error=>toast(error.message));tools.append(button);
 }

 (async()=>{
  try{account=await api('me')}catch{return}
  const open=document.createElement('button');open.type='button';open.className='nav-item';
  open.dataset.accountSettings='';open.textContent='Account settings';open.onclick=()=>settings().catch(error=>toast(error.message));
  document.querySelector('.sidebar-bottom').prepend(open);
  new MutationObserver(renderSharing).observe(document.querySelector('#content'),{childList:true,subtree:true});
  renderSharing();
  reminder=document.createElement('button');reminder.type='button';reminder.className='text-btn';
  reminder.hidden=true;
  reminder.onclick=()=>settings().catch(error=>toast(error.message));
  open.after(reminder);
  try{
   const configuration=await api('ai');
   updateReminder(configuration);
   if(configuration.setupRequired)await settings();
  }catch{}
 })();
})();

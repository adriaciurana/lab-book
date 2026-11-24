// Server snapshots are authoritative. Local storage is an offline recovery copy.
const isolatedWorkspace=new URLSearchParams(location.search).has('isolated');
if(!isolatedWorkspace){
  if(window.LABBOOK_SERVER_STATE){
    state=window.LABBOOK_SERVER_STATE;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  }else{
    const legacy=localStorage.getItem(STORAGE_KEY)||(LABBOOK_ENV==='production'&&localStorage.getItem('labbook-state'));
    if(legacy){try{state=JSON.parse(legacy)}catch{document.querySelector('#saveStatus').textContent='Unable to read the local recovery copy'}}
  }
}
let lastSavedSnapshot=structuredClone(state);
function reconcileWorkspace(base,local,remote,path='workspace'){
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(equal(local,base))return remote;
  if(equal(remote,base)||equal(local,remote))return local;
  if([base,local,remote].every(v=>Array.isArray(v)&&v.every(x=>x&&typeof x==='object'&&typeof x.id==='string'))){
    const maps=[base,local,remote].map(rows=>new Map(rows.map(row=>[row.id,row])));
    return [...new Set([...local,...remote].map(row=>row.id))].map(id=>reconcileWorkspace(...maps.map(map=>map.get(id)),path+'.'+id)).filter(row=>row!==undefined);
  }
  if([base,local,remote].every(v=>v&&typeof v==='object'&&!Array.isArray(v))){
    const result={};for(const key of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){
      const value=reconcileWorkspace(base[key],local[key],remote[key],path+'.'+key);if(value!==undefined)result[key]=value;
    }return result;
  }
  throw Error('Concurrent edits to '+path+'. Your local recovery copy was preserved. Reload to review the server version.');
}
save=function(){
  const serialized=JSON.stringify(state);
  if(!isolatedWorkspace){
    const request=new XMLHttpRequest();
    request.open('PUT','/api/state',false);
    request.setRequestHeader('Content-Type','application/json');
    if(window.LABBOOK_STATE_REVISION)request.setRequestHeader('If-Match',window.LABBOOK_STATE_REVISION);
    request.send(serialized);
    if(request.status===409){
      localStorage.setItem(STORAGE_KEY+'-conflict-recovery',serialized);
      const latest=new XMLHttpRequest();latest.open('GET','/api/state',false);latest.send();
      if(latest.status!==200)throw Error('Cannot retrieve workspace changes. Local recovery preserved.');
      const merged=reconcileWorkspace(lastSavedSnapshot,state,JSON.parse(latest.responseText));
      const retry=new XMLHttpRequest();retry.open('PUT','/api/state',false);retry.setRequestHeader('Content-Type','application/json');retry.setRequestHeader('If-Match',latest.getResponseHeader('X-Labbook-Revision'));retry.send(JSON.stringify(merged));
      if(retry.status!==200)throw Error('Workspace changed again. Local recovery preserved; retry saving.');
      state=merged;lastSavedSnapshot=structuredClone(state);window.LABBOOK_STATE_REVISION=retry.getResponseHeader('X-Labbook-Revision');
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));document.querySelector('#saveStatus').textContent='Saved to disk';return;
    }
    if(request.status!==200){localStorage.setItem(STORAGE_KEY+'-conflict-recovery',serialized);throw Error('Unable to save to the server');}
    window.LABBOOK_STATE_REVISION=request.getResponseHeader('X-Labbook-Revision');
  }
  localStorage.setItem(STORAGE_KEY,serialized);
  lastSavedSnapshot=structuredClone(state);
  document.querySelector('#saveStatus').textContent=isolatedWorkspace?'Isolated test':(LABBOOK_ENV==='test'?'TEST · Saved':'Saved to disk');
};
if(!isolatedWorkspace){
  try{save()}catch(error){document.querySelector('#saveStatus').textContent=error.message}
  render();
}
{
  const badge=document.createElement('button');badge.type='button';badge.title='Switch environment';badge.setAttribute('aria-label','Switch environment');badge.textContent=LABBOOK_ENV==='test'?'TEST':'REAL';
  badge.className='environment-label'+(LABBOOK_ENV==='test'?' test':'');
  document.querySelector('.top-actions').prepend(badge);
  badge.addEventListener('click',async()=>{
    const existing=document.querySelector('.environment-menu');if(existing){existing.remove();return}
    try{
      const response=await fetch('/api/environments');if(!response.ok)throw Error('Cannot load registered environments');
      const entries=await response.json(),menu=document.createElement('div');menu.className='environment-menu';
      const close=()=>menu.remove();
      for(const entry of entries){
        const url=new URL(entry.url);if(!['http:','https:'].includes(url.protocol))continue;
        const link=document.createElement('a');link.href=url.href;link.textContent=entry.name;menu.append(link);
      }
      if(!menu.children.length)menu.textContent='No environments registered in labbook.config.json';
      const dismiss=document.createElement('button');dismiss.textContent='Close';dismiss.onclick=close;menu.append(dismiss);
      menu.addEventListener('keydown',event=>{if(event.key==='Escape'){close();badge.focus()}});
      badge.after(menu);menu.querySelector('a,button')?.focus();
    }catch(error){document.querySelector('#saveStatus').textContent=error.message}
  });
}

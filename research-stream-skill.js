(function(){
 const id='research-stream-author';
 skills.push([id,'Research stream author','Research','▧','Turn research evidence into a visual stream: motivation, architecture, controlled experiment plan, comparable results and dated findings linked to runs.']);
 async function createStream(){
  try{
   const r=await fetch('/api/v1/skill?name='+id+'&resource=template');if(!r.ok)throw Error('Unable to load the research stream template');
   const root=document.createElement('div');root.innerHTML=await r.text();
   root.querySelectorAll('svg').forEach(svg=>{const block=document.createElement('div');block.className='architecture-block';block.contentEditable='false';block.dataset.architecture=encodeURIComponent(svg.outerHTML);svg.replaceWith(block)});
   workspaceTemplates.visualResearch={label:'Visual research stream',description:'Motivation, pipeline, staged experiment plan and evidence-linked findings.',content:root.innerHTML};
   openPageTemplate('visualResearch');
  }catch(error){toast(error.message)}
 }
 const previous=renderSkills;
 renderSkills=function(){
  previous();const use=document.querySelector('[data-skill="'+id+'"]');if(!use)return;
  use.onclick=()=>{currentView='search';renderSearch();renderContextUI();const select=document.querySelector('#activeSkill');if(select)select.value=id;toast('Research stream author selected')};
  const actions=document.createElement('div');actions.className='skill-actions';
  const create=document.createElement('button');create.className='text-btn';create.textContent='Create visual stream';create.onclick=createStream;
  const copy=document.createElement('button');copy.className='text-btn';copy.textContent='Copy agent instructions';copy.onclick=async()=>{
   try{const r=await fetch('/api/v1/skill?name='+id+'&resource=bundle');if(!r.ok)throw Error('Cannot load agent instructions');const text=await r.text();if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);toast('Agent instructions copied')}else{const blob=new Blob([text],{type:'text/plain'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='research-stream-author.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Agent instructions downloaded')}}catch(error){toast(error.message)}
  };
  actions.append(create,copy);use.closest('.skill-card').append(actions);
 };
})();

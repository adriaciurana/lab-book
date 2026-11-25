let localPdfLibrary;
async function mountPaperReader(container,paper,url){
 const lib=localPdfLibrary||await import('/vendor/pdf.mjs');
 localPdfLibrary=lib;lib.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.mjs';
 const loading=lib.getDocument({url});
 const pdf=await loading.promise;if(!container.isConnected){pdf.destroy();return}
 container.classList.add('local-reader');
 container.innerHTML='<div class="reader-controls"><button data-prev title="Previous page">←</button><input data-page type="number" min="1" aria-label="Page"><span data-count></span><button data-next title="Next page">→</button><span class="reader-gap"></span><button data-minus title="Zoom out">−</button><span data-zoom></span><button data-plus title="Zoom in">＋</button><button data-fit>Fit width</button><button data-popout title="Open reader in a new window">↗ New window</button><a data-download download>↓ PDF</a></div><div class="reader-scroll"><div class="reader-sheet"><canvas></canvas><div class="textLayer"></div><div class="reader-highlights"></div></div></div><div class="reader-selection"><span data-hint>Select text to highlight it</span><button data-highlight disabled>Highlight</button><button data-link disabled>Link to note</button></div><div class="reader-annotations"></div>';
 const q=s=>container.querySelector(s),sheet=q('.reader-sheet'),scroll=q('.reader-scroll');
 q('[data-download]').href=url;q('[data-download]').download=paper.fileName||'paper.pdf';
 const readerQuery=new URLSearchParams(location.search);
 let pageNumber=readerQuery.get('reader')==='1'?Math.max(1,Math.min(pdf.numPages,Math.trunc(Number(readerQuery.get('page')))||1)):1,scale=1,selected=null,task=null,textLayer=null,serial=0;
 q('[data-popout]').onclick=()=>{if(typeof flushDraft==='function'&&!flushDraft())return;const target=new URL('/papers/'+encodeURIComponent(paper.id),location.origin);target.searchParams.set('reader','1');target.searchParams.set('page',pageNumber);if(readerQuery.has('isolated'))target.searchParams.set('isolated','1');window.open(target.href,'_blank','popup=yes,width=1100,height=900,noopener')};
 paper.highlights=paper.highlights||[];
 const highlightPicker=document.createElement('select');highlightPicker.className='reader-highlight-picker';highlightPicker.setAttribute('aria-label','Jump to a saved highlight');q('.reader-controls').append(highlightPicker);
 highlightPicker.onchange=()=>{const region=paper.highlights.find(h=>h.id===highlightPicker.value);if(region){pageNumber=region.pageNumber;render().then(()=>{q('.reader-highlights [data-region-id="'+CSS.escape(region.id)+'"]')?.scrollIntoView({block:'center',behavior:'smooth'})})}};
 function paintHighlights(){
  highlightPicker.replaceChildren(new Option('Highlights ('+paper.highlights.length+')',''));for(const h of paper.highlights)highlightPicker.add(new Option('p. '+h.pageNumber+' · '+(h.label||h.text.slice(0,55)),h.id));highlightPicker.disabled=!paper.highlights.length;
  q('.reader-highlights').replaceChildren();
  for(const h of paper.highlights.filter(h=>h.pageNumber===pageNumber)){
   for(const r of h.rects){
    const mark=document.createElement('div');mark.className='reader-highlight';mark.dataset.regionId=h.id;
    mark.style.cssText=`left:${r.x*100}%;top:${r.y*100}%;width:${r.w*100}%;height:${r.h*100}%`;
    q('.reader-highlights').append(mark);
   }
  }
  const list=q('.reader-annotations');list.replaceChildren();
  for(const h of paper.highlights.filter(h=>h.pageNumber===pageNumber)){
   const row=document.createElement('div');row.className='reader-annotation';row.dataset.regionId=h.id;
   const quote=document.createElement('span');quote.textContent=(h.label?h.label+' · ':'')+h.text.slice(0,120);if(h.note)quote.title=h.note;
   const link=document.createElement('button');link.textContent='Link';link.onclick=()=>linkRegion(h);
   const remove=document.createElement('button');remove.textContent='×';remove.title='Delete highlight';
   remove.onclick=()=>{paper.highlights=paper.highlights.filter(x=>x.id!==h.id);save();paintHighlights()};
   row.append(quote,link,remove);list.append(row);
  }
 }
 function capture(){
  const selection=getSelection();if(!selection.rangeCount||!selection.toString().trim())return;
  const range=selection.getRangeAt(0);if(!q('.textLayer').contains(range.commonAncestorContainer))return;
  const bounds=sheet.getBoundingClientRect();
  selected={text:selection.toString().trim(),pageNumber,rects:Array.from(range.getClientRects()).filter(r=>r.width>0&&r.height>0).map(r=>({x:(r.left-bounds.left)/bounds.width,y:(r.top-bounds.top)/bounds.height,w:r.width/bounds.width,h:r.height/bounds.height}))};
  q('[data-highlight]').disabled=false;q('[data-link]').disabled=!document.querySelector('.editor-body');q('[data-hint]').textContent='Selection ready';
 }
 q('.textLayer').addEventListener('pointerup',()=>setTimeout(capture,0));
 function saveRegion(){
  if(!selected)return null;
  let region=paper.highlights.find(h=>h.pageNumber===selected.pageNumber&&h.text===selected.text);
  if(!region){region={id:crypto.randomUUID(),...selected};paper.highlights.push(region);save()}
  paintHighlights();q('[data-hint]').textContent='Highlight saved';return region;
 }
 function linkRegion(region){
  if(!region||!document.querySelector('.editor-body'))return;
  const mark=document.createElement('mark');mark.className='paper-region-link';mark.dataset.regionId=region.id;
  mark.dataset.paperId=paper.id;mark.textContent=region.text;mark.title=paper.title+' · p. '+region.pageNumber;
  const ref=document.createElement('sup');ref.textContent=' p. '+region.pageNumber;
  document.querySelector('.editor-body').append(mark,ref,document.createElement('p'));
  state.context=state.context||[];
  if(!state.context.some(c=>c.id===region.id))state.context.push({id:region.id,type:'region',paperId:paper.id,label:paper.title,page:'p. '+region.pageNumber,text:region.text});
  persistDraft();save();toast('Highlight linked to your note');
 }
 q('[data-highlight]').onclick=saveRegion;
 q('[data-link]').onclick=()=>linkRegion(saveRegion());
 async function render(){
  const run=++serial;task?.cancel();textLayer?.cancel();selected=null;
  q('[data-highlight]').disabled=true;q('[data-link]').disabled=true;
  try{
   const page=await pdf.getPage(pageNumber);if(run!==serial)return;
   const viewport=page.getViewport({scale}),canvas=q('canvas'),ratio=window.devicePixelRatio||1;
   canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);
   canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
   sheet.style.width=viewport.width+'px';sheet.style.height=viewport.height+'px';
   sheet.style.setProperty('--scale-factor',scale);
   q('.textLayer').replaceChildren();
   task=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:ratio===1?undefined:[ratio,0,0,ratio,0,0]});await task.promise;
   if(run!==serial)return;
   textLayer=new lib.TextLayer({textContentSource:await page.getTextContent(),container:q('.textLayer'),viewport});await textLayer.render();
   q('[data-page]').value=pageNumber;q('[data-page]').max=pdf.numPages;q('[data-count]').textContent='/ '+pdf.numPages;
   q('[data-zoom]').textContent=Math.round(scale*100)+'%';
   q('[data-prev]').disabled=pageNumber===1;q('[data-next]').disabled=pageNumber===pdf.numPages;
   paintHighlights();
  }catch(error){if(!/cancel/i.test(error.name))q('[data-hint]').textContent='Unable to render: '+error.message}
 }
 async function fit(){
  const page=await pdf.getPage(pageNumber);
  scale=Math.max(.35,Math.min(2,(scroll.clientWidth-32)/page.getViewport({scale:1}).width));return render();
 }
 q('[data-prev]').onclick=()=>{if(pageNumber>1){pageNumber--;render()}};
 q('[data-next]').onclick=()=>{if(pageNumber<pdf.numPages){pageNumber++;render()}};
 q('[data-page]').onchange=()=>{pageNumber=Math.max(1,Math.min(pdf.numPages,Number(q('[data-page]').value)||1));render()};
 q('[data-minus]').onclick=()=>{scale=Math.max(.35,scale-.15);render()};
 q('[data-plus]').onclick=()=>{scale=Math.min(3,scale+.15);render()};q('[data-fit]').onclick=fit;
 container.addEventListener('pointerover',event=>{const h=event.target.closest('[data-region-id]');if(h)document.querySelectorAll('[data-region-id]').forEach(x=>x.classList.toggle('is-linked-hover',x.dataset.regionId===h.dataset.regionId))});
 container.addEventListener('pointerleave',()=>document.querySelectorAll('.is-linked-hover').forEach(x=>x.classList.remove('is-linked-hover')));
 await fit();return {pdf,render};
}

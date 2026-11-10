(function(root){
 const kinds=['group','patchgrid','tokenstrip','layers','legend','operator'];
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const palette={input:['#eef7f2','#459277'],frozen:['#f1f3f5','#87969e'],trained:['#edf3fa','#6b98c3'],optional:['#fcf6e9','#b58a2f'],loss:['#fcf2ed','#bc6334']};
 function defaults(kind){return {rows:4,columns:8,count:8,depth:24,role:'trained',...(kind==='group'?{w:560,h:260,fill:'#f8fafc',role:'none'}:{}),...(kind==='operator'?{w:48,h:48,label:'+'}:{}),...(kind==='legend'?{w:460,h:56,label:'Module roles'}:{})}}
 function validate(node){
  for(const [key,max] of [['rows',32],['columns',48],['count',48]])if(node[key]!==undefined&&(!Number.isInteger(node[key])||node[key]<1||node[key]>max))throw Error(key+' must be an integer between 1 and '+max);
  if(node.role&&!['none',...Object.keys(palette)].includes(node.role))throw Error('Unknown module role');
 }
 function render(n){
  const stroke=esc(n.stroke||'#6b98c3'),fill=esc(n.fill||'#edf3fa'),w=n.w,h=n.h;
  const frame=`<rect width="${w}" height="${h}" rx="9" fill="${fill}" stroke="${stroke}" stroke-width="1.3" ${n.dashed||n.role==='frozen'||n.role==='optional'?'stroke-dasharray="5 4"':''}/>`;
  if(n.kind==='group')return frame;
  if(n.kind==='operator')return `<circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)/2-2}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  if(n.kind==='legend')return frame+Object.entries(palette).map(([role,colors],i)=>{const x=10+i*(w-20)/5;return `<rect x="${x}" y="${h-23}" width="12" height="10" fill="${colors[0]}" stroke="${colors[1]}"/><text x="${x+17}" y="${h-14}" font-family="Arial" font-size="9" fill="#37485b">${esc(role)}</text>`}).join('');
  const rows=n.rows||4,cols=n.columns||8,count=n.count||8,top=Math.min(45,h*.48),usable=Math.max(10,h-top-12);
  let shapes='';
  if(n.kind==='patchgrid'){
   const size=Math.min((w-20)/cols,usable/rows),left=(w-size*cols)/2;
   for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)shapes+=`<rect x="${left+x*size+1}" y="${top+y*size+1}" width="${Math.max(.5,size-2)}" height="${Math.max(.5,size-2)}" rx="1" fill="${stroke}" opacity="${n.role==='optional'&&((y*cols+x)%5)?'.13':'.7'}"/>`;
  }else if(n.kind==='tokenstrip'){
   const size=Math.min((w-20)/count,usable,22),left=(w-count*size)/2;
   for(let i=0;i<count;i++)shapes+=`<rect x="${left+i*size+1}" y="${top+Math.max(0,(usable-size)/2)}" width="${Math.max(.5,size-3)}" height="${size}" rx="2" fill="${stroke}" opacity="${i%3===0?'.85':'.55'}"/>`;
  }else if(n.kind==='layers'){
   const layers=Math.min(count,8),offset=Math.min(9,(w-30)/layers),lw=Math.max(10,w-24-offset*(layers-1)),lh=Math.max(12,usable-offset*(layers-1));
   for(let i=layers-1;i>=0;i--)shapes+=`<rect x="${12+i*offset}" y="${top+i*offset}" width="${lw}" height="${lh}" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/><path d="M${12+i*offset+lw/2} ${top+i*offset}v${lh}" stroke="${stroke}" opacity=".4"/>`;
  }else return null;
  return frame+shapes;
 }
 const api={kinds,palette,defaults,validate,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DiagramPrimitives=api;
})(typeof window!=='undefined'?window:globalThis);

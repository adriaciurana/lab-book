(function(root){
 const md=typeof module!=='undefined'&&module.exports?require('../client/vendor/markdown-it.min.js'):root.markdownit;
 const math=typeof module!=='undefined'&&module.exports?require('../client/vendor/katex/katex.min.js'):root.katex;
 const parser=md({html:false,breaks:false,linkify:false,typographer:false});
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function normalizeLatex(latex){return String(latex).replace(/\u0009(ext|imes|heta|au|op|ilde)\b/g,'\\t$1').replace(/\u000c(rac|orall)\b/g,'\\f$1').replace(/\u0008(eta|egin)\b/g,'\\b$1').replace(/\r(angle|ho|ight)\b/g,'\\r$1')}
 function equation(latex,display=false){const source=normalizeLatex(latex);return '<span class="note-math'+(display?' display-math':'')+'" contenteditable="false" data-latex="'+escape(encodeURIComponent(source))+'" data-display="'+(display?'true':'false')+'" title="Double-click to edit equation">'+math.renderToString(source,{displayMode:display,throwOnError:false,trust:false,maxExpand:1000,strict:'ignore',output:'htmlAndMathml'})+'</span>'}
 function render(source){let serial=0;const slots=new Map(),prefix='LABBOOKMATH'+Math.random().toString(36).slice(2)+'TOKEN';const value=String(source||'').replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|\[[^\]\n]*\]\([^\)\n]*\)|`[^`\n]*`|\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^\s$][^$\n]*?)\$/g,(full,a,b,c,d)=>{if(full.startsWith('`')||full.startsWith('~')||full.startsWith('['))return full;const token=prefix+(serial++)+'END';slots.set(token,equation(a||b||c||d,!!(a||b)));return token});let html=parser.render(value);for(const [token,markup]of slots)html=html.split(token).join(markup);return html}
 const api={render,equation,normalizeLatex};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RichText=api;
})(typeof window!=='undefined'?window:globalThis);

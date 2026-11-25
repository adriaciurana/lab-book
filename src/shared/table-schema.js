// Shared column semantics for browser forms, tables and the agent API.
(function(root){
 const types={continuous:'Continuous number',integer:'Integer',categorical:'Categorical',ordinal:'Ordinal',boolean:'Yes / no',text:'Text',date:'Date',url:'URL',json:'Structured value'};
 const sources=['metrics','config','properties'];
 const numeric=type=>type==='continuous'||type==='integer';
 const missing=value=>value===undefined||value===null||value==='';
 const value=(row,column)=>row[column.source]?.[column.key];
 function infer(values,source){const present=values.filter(v=>!missing(v));if(!present.length)return source==='metrics'?'continuous':'text';if(present.every(v=>typeof v==='number'))return source==='config'&&present.every(Number.isInteger)?'integer':'continuous';if(present.every(v=>typeof v==='boolean'))return 'boolean';if(present.every(v=>typeof v==='string'))return 'text';return 'json'}
 function columns(state,collection,rows=state[collection]||[]){
  const configured=(state.tableSchemas||[]).find(s=>s.collection===collection)?.columns||[],out=configured.map(c=>({...c})),known=new Set(out.map(c=>c.source+':'+c.key));
  for(const source of sources)for(const key of [...new Set(rows.flatMap(r=>Object.keys(r[source]||{})))]){const identity=source+':'+key;if(known.has(identity))continue;out.push({id:identity,source,key,label:key,type:infer(rows.map(r=>r[source]?.[key]),source),objective:'none',options:[],hidden:source==='config'});known.add(identity)}return out;
 }
 function validateColumn(c){
  if(typeof c.id!=='string'||!c.id||typeof c.key!=='string'||!c.key.trim()||['__proto__','prototype','constructor'].includes(c.key))throw Error('Column requires a safe, nonempty key and ID');
  if(!sources.includes(c.source)||!Object.hasOwn(types,c.type)||typeof c.label!=='string'||!c.label.trim())throw Error('Column requires a label, valid source and value type');
  if(c.hidden!=null&&typeof c.hidden!=='boolean')throw Error('Column visibility must be a boolean');
  for(const key of ['unit','description'])if(c[key]!=null&&typeof c[key]!=='string')throw Error('Column '+key+' must be text');
  if(!['none','min','max'].includes(c.objective||'none'))throw Error('Invalid optimization direction');
  if(c.objective&&c.objective!=='none'&&!numeric(c.type)&&c.type!=='ordinal')throw Error('Higher / lower is supported for numbers and ordered categories');
  if(['categorical','ordinal'].includes(c.type)&&(!Array.isArray(c.options)||!c.options.length||c.options.some(v=>typeof v!=='string'||!v.trim())||new Set(c.options).size!==c.options.length))throw Error('Categories must be unique, nonempty labels; ordinal categories run from lowest to highest');
  if(c.precision!=null&&(!Number.isInteger(c.precision)||c.precision<0||c.precision>10))throw Error('Decimal places must be between 0 and 10');
  for(const key of ['min','max'])if(c[key]!=null&&(typeof c[key]!=='number'||!Number.isFinite(c[key])))throw Error('Column bounds must be finite numbers');
  if(c.min!=null&&c.max!=null&&c.min>c.max)throw Error('Minimum cannot exceed maximum');
 }
 function validateValue(v,c){
  if(missing(v))return;
  let valid=true;
  if(numeric(c.type))valid=typeof v==='number'&&Number.isFinite(v)&&(c.type!=='integer'||Number.isInteger(v))&&(c.min==null||v>=c.min)&&(c.max==null||v<=c.max);
  else if(c.type==='categorical'||c.type==='ordinal')valid=typeof v==='string'&&c.options.includes(v);
  else if(c.type==='boolean')valid=typeof v==='boolean';
  else if(c.type==='text')valid=typeof v==='string';
  else if(c.type==='date')valid=typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
  else if(c.type==='url'){try{valid=typeof v==='string'&&['http:','https:'].includes(new URL(v).protocol)}catch{valid=false}}
  if(!valid)throw Error(c.label+': invalid '+types[c.type].toLowerCase()+' value');
 }
 function validateSchemas(state){
  const scopes=new Set();for(const schema of state.tableSchemas||[]){
   if(!Array.isArray(schema.columns)||!Array.isArray(state[schema.collection])||schema.collection==='tableSchemas'||scopes.has(schema.collection))throw Error('Use one column schema per collection');scopes.add(schema.collection);
   const ids=new Set(),keys=new Set();for(const c of schema.columns){validateColumn(c);const key=c.source+':'+c.key;if(ids.has(c.id)||keys.has(key))throw Error('Column IDs and source/key pairs must be unique');ids.add(c.id);keys.add(key);for(const row of state[schema.collection])validateValue(value(row,c),c)}
  }
 }
 function compare(a,b,c,direction=1){const av=value(a,c),bv=value(b,c);if(missing(av))return missing(bv)?0:1;if(missing(bv))return -1;let result;if(c.type==='ordinal')result=c.options.indexOf(av)-c.options.indexOf(bv);else if(numeric(c.type)||c.type==='boolean')result=Number(av)-Number(bv);else result=String(typeof av==='object'?JSON.stringify(av):av).localeCompare(String(typeof bv==='object'?JSON.stringify(bv):bv),undefined,{numeric:true});return result*direction}
 function display(v,c){if(missing(v))return '—';if(typeof v==='boolean')return v?'Yes':'No';if(typeof v==='number'&&c.precision!=null)return v.toFixed(c.precision);if(typeof v==='object')return JSON.stringify(v);return String(v)}
 const api={types,sources,numeric,missing,value,infer,columns,validateColumn,validateValue,validateSchemas,compare,display};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TableSchema=api;
})(typeof window!=='undefined'?window:globalThis);

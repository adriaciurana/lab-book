const {test}=require('node:test'),assert=require('node:assert/strict'),table=require('../src/shared/table-schema.js'),model=require('../src/shared/research-model.js');
const column=(key,type,extra={})=>({id:key,key,label:key,source:'metrics',type,objective:'none',...extra});
test('typed column semantics preserve zero/false and sort missing values last',()=>{
 const loss=column('loss','continuous',{objective:'min',precision:3,min:0}),quality=column('quality','ordinal',{options:['low','medium','high'],objective:'max'});
 const rows=[{id:'missing',metrics:{}},{id:'high',metrics:{loss:.2,quality:'high'}},{id:'low',metrics:{loss:0,quality:'low'}},{id:'medium',metrics:{loss:.1,quality:'medium'}}];
 assert.deepEqual([...rows].sort((a,b)=>table.compare(a,b,loss,1)).map(r=>r.id),['low','medium','high','missing']);
 assert.deepEqual([...rows].sort((a,b)=>table.compare(a,b,quality,-1)).map(r=>r.id),['high','medium','low','missing']);
 assert.equal(table.display(0,loss),'0.000');assert.equal(table.display(false,column('flag','boolean')),'No');
 assert.throws(()=>table.validateValue(-1,loss));assert.throws(()=>table.validateValue('0.2',loss));assert.throws(()=>table.validateValue('unknown',quality));assert.throws(()=>table.validateValue(2.5,column('count','integer')));
 assert.throws(()=>table.validateValue('2026-02-30',column('date','date')));assert.throws(()=>table.validateValue('javascript:alert(1)',column('link','url')));
});
test('schemas validate existing and API data, hide without deletion, and generalize to tasks',()=>{
 const state={notes:[],folders:[],boards:[{id:'board',name:'Board',columns:['Todo']}],tasks:[{id:'task',text:'Task',board:'board',col:'Todo',properties:{priority:'high'}}],experiments:[{id:'run',name:'Run',status:'trained',metrics:{score:.9},config:{seed:42,enabled:false}}],tableSchemas:[]};
 model.validate(state);const inferred=table.columns(state,'experiments');assert.equal(inferred.find(c=>c.key==='enabled').type,'boolean');assert.ok(inferred.find(c=>c.key==='seed').hidden);
 const next=model.mutate(state,'tableSchemas','experiment-columns',{collection:'experiments',columns:[column('score','continuous',{label:'Accuracy',objective:'max'}),column('quality','ordinal',{options:['low','medium','high']})]});
 const typed=model.mutate(next,'experiments','run',{metrics:{score:.9,quality:'high'}});assert.equal(typed.experiments[0].metrics.quality,'high');
 assert.throws(()=>model.mutate(typed,'experiments','run',{metrics:{quality:'unknown'}}));
 const hidden=model.mutate(typed,'tableSchemas','experiment-columns',{columns:[column('score','continuous',{hidden:true}),column('quality','ordinal',{options:['low','medium','high']})]});assert.equal(hidden.experiments[0].metrics.score,.9);
 assert.throws(()=>model.mutate(typed,'tableSchemas','experiment-columns',{columns:[column('quality','ordinal',{options:['low']})]}));
 const generalized=model.mutate(hidden,'tableSchemas','task-columns',{collection:'tasks',columns:[{...column('priority','ordinal',{options:['low','high']}),source:'properties'}]});assert.equal(generalized.tasks[0].properties.priority,'high');
 assert.throws(()=>model.mutate(generalized,'tableSchemas','duplicate',{collection:'tasks',columns:[]}));
});

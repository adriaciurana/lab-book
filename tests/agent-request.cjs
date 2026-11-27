const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),service=require('../src/server/research-search.cjs');
test('agent replies expose validated proposals without mutating workspace data',async t=>{let mode='success';const runtime=require('../src/server/runtime.cjs'),fs=require('node:fs');const before=fs.existsSync(runtime.stateFile)?fs.readFileSync(runtime.stateFile,'utf8'):null;const server=http.createServer((req,res)=>service.handle(req,res,()=> 'fixture',{fetchImpl:async(_url,options)=>{const request=JSON.parse(options.body);assert(request.text.format.strict);assert(request.instructions.includes('until the user explicitly selects'));return {ok:true,status:200,text:async()=>JSON.stringify({output_text:mode==='success'?JSON.stringify({answer:'A draft is ready for review.',actions:[{id:'op-page',kind:'page',summary:'Draft page',dataJson:JSON.stringify({title:'Draft',contentMarkdown:'# Evidence'})}]}):mode==='invalid'?JSON.stringify({answer:'Oops',actions:[{id:'bad',kind:'delete',dataJson:'{}'}]}):'truncated'})}}}));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());const post=()=>fetch('http://127.0.0.1:'+server.address().port,{method:'POST',body:JSON.stringify({query:'Create a page',proposeChanges:true})});let response=await post(),data=await response.json();assert.equal(response.status,200);assert.equal(data.workspaceProposal.actions[0].kind,'page');assert.equal(data.output_text,'A draft is ready for review.');mode='invalid';response=await post();assert.equal(response.status,400);mode='truncated';response=await post();assert.equal(response.status,400);assert.equal(fs.existsSync(runtime.stateFile)?fs.readFileSync(runtime.stateFile,'utf8'):null,before)});
test('native proposal fields avoid nested JSON and malformed legacy fields fail clearly',async t=>{
 let mode='native';const server=http.createServer((req,res)=>service.handle(req,res,()=> 'fixture',{fetchImpl:async(_url,options)=>{const request=JSON.parse(options.body),variants=request.text.format.schema.properties.actions.items.anyOf;assert(variants.every(v=>v.properties.data&&!v.properties.dataJson));const action=mode==='native'?{id:'op-page',kind:'page',summary:'Page',data:{title:'A quote: "JSON"',contentMarkdown:'# Heading\nText with {braces}.',parentNoteId:null,folder:'inbox',paperIds:[]}}:mode==='metrics'?{id:'op-exp',kind:'experiment',summary:'Experiment',data:{name:'Baseline',metrics:[{key:'accuracy',value:0.9}],config:[{key:'seed',value:42}]}}:{id:'op-page',kind:'page',summary:'Broken page',dataJson:'{"title":"Draft"} trailing JSON'};const plan={answer:'Review before applying.',actions:[action]};return {ok:true,status:200,text:async()=>JSON.stringify({status:mode==='incomplete'?'incomplete':'completed',output_text:JSON.stringify(plan)+(mode==='trailing'?' more text':'')})}}}));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());const post=()=>fetch('http://127.0.0.1:'+server.address().port,{method:'POST',body:JSON.stringify({query:'Create a page',proposeChanges:true})});
 let response=await post(),data=await response.json();assert.equal(response.status,200);assert.equal(data.workspaceProposal.actions[0].data.title,'A quote: "JSON"');assert(!('dataJson' in data.workspaceProposal.actions[0]));mode='metrics';response=await post();data=await response.json();assert.deepEqual(data.workspaceProposal.actions[0].data.metrics,{accuracy:0.9});assert.deepEqual(data.workspaceProposal.actions[0].data.config,{seed:42});
 mode='malformed';response=await post();data=await response.json();assert.equal(response.status,400);assert.match(data.error,/malformed fields/);assert(!data.error.includes('position'));assert(!data.workspaceProposal);
 mode='trailing';response=await post();assert.equal(response.status,400);assert.match((await response.json()).error,/incomplete proposal/);mode='incomplete';response=await post();assert.match((await response.json()).error,/cut short/);
});

require('node:test').test('chat model overrides the server default for proposal requests',()=>{
 const assert=require('node:assert/strict');
 const {buildRequest}=require('../src/server/research-search.cjs');
 const request=buildRequest({query:'Compare the results',proposeChanges:true,model:'gpt-5.4'});
 assert.equal(request.model,'gpt-5.4');
 assert.equal(request.reasoning.effort,'medium');
 assert.ok(request.text.format);
 assert.throws(()=>buildRequest({query:'Hello',model:'unknown'}),/supported chat model/);
});

require('node:test').test('Claude chat uses the selected credential and maps text to the chat response', async ()=>{
 const assert=require('node:assert/strict');
 const {Readable}=require('node:stream');
 const {handle}=require('../src/server/research-search.cjs');
 const req=Readable.from([JSON.stringify({query:'Summarize',webSearch:false})]);
 req.labbookAI={provider:'claude',key:'fixture-claude'};
 let status,body;
 await handle(req,{writeHead(code){status=code},end(raw){body=JSON.parse(raw)}},()=>{throw Error('Unexpected fallback')},{
  fetchImpl:async(url,options)=>{
   assert.equal(url,'https://api.anthropic.com/v1/messages');
   assert.equal(options.headers['x-api-key'],'fixture-claude');
   assert.match(JSON.parse(options.body).messages.at(-1).content,/Summarize/);
   return Response.json({content:[{type:'text',text:'A summary.'}]});
  }
 });
 assert.equal(status,200);
 assert.equal(body.output_text,'A summary.');
});

require('node:test').test('connected ChatGPT plan uses its own model catalog and OAuth bearer', async ()=>{
 const assert=require('node:assert/strict');
 const {Readable}=require('node:stream');
 const {handle}=require('../src/server/research-search.cjs');
 const req=Readable.from([JSON.stringify({query:'Summarize',model:'plan-model',webSearch:false})]);
 req.labbookAI={provider:'chatgpt',planModels:async()=>[{id:'plan-model',label:'Plan model'}],planToken:async()=>'fixture-oauth'};
 let status,body;
 await handle(req,{writeHead(code){status=code},end(raw){body=JSON.parse(raw)}},()=>{throw Error('Team key must not be used')},{
  fetchImpl:async(url,options)=>{
   assert.equal(options.headers.Authorization,'Bearer fixture-oauth');
   const request=JSON.parse(options.body);
   assert.equal(request.model,'plan-model');
   assert.equal(request.stream,true);
   assert.ok(Array.isArray(request.input));
   return new Response('data: '+JSON.stringify({type:'response.completed',response:{output_text:'A summary.'}})+'\n\n');
  }
 });
 assert.equal(status,200);
 assert.equal(body.output_text,'A summary.');
});

const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const model=require('../src/shared/diagram-model.js'),service=require('../src/server/diagram-service.cjs');
test('diagram geometry, export and input validation',()=>{
 const scene=model.template('pipeline');model.validate(scene);assert.equal(scene.nodes.length,4);assert.equal(scene.edges.length,3);assert.ok(model.connector(scene,scene.edges[0]).path.startsWith('M'));
 scene.nodes[0].label='<script>alert(1)</script>';const exported=model.svg(scene);assert.ok(!exported.includes('<script>'));assert.ok(exported.includes('&lt;script&gt;'));assert.ok(exported.includes('data-labbook-diagram='));
 assert.throws(()=>model.validate({...scene,edges:[{id:'bad',from:'input',to:'missing'}]}));
 assert.throws(()=>model.validate({...scene,nodes:[{...scene.nodes[0],href:'javascript:alert(1)'}],edges:[]}));
 assert.throws(()=>service.requestFor({prompt:'',mode:'editable'}));
 const image=service.requestFor({prompt:'Encoder architecture',mode:'image'});assert.equal(image.path,'images/generations');assert.equal(image.body.output_format,'png');assert.equal(image.body.n,1);assert.ok(!('response_format' in image.body));
 const editable=service.requestFor({prompt:'Train a model',mode:'editable'});assert.equal(editable.body.text.format.strict,true);assert.equal(editable.body.store,false);
});
test('OpenAI adapter handles editable scenes, images, failures and absent keys without live calls',async t=>{
 let key='fixture-key',mode='scene',calls=[];
 const server=http.createServer((req,res)=>service.handle(req,res,()=>key,{fetchImpl:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});if(mode==='bad-json')return {ok:true,text:async()=>'Not found'};if(mode==='error')return {ok:false,status:429,text:async()=>JSON.stringify({error:{message:'Quota exceeded'}})};return {ok:true,text:async()=>JSON.stringify(mode==='image'?{data:[{b64_json:'aW1hZ2U='}]}:{status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(model.template('training'))}]}]})}}}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port;
 const post=async(body)=>{const response=await fetch(base,{method:'POST',body:JSON.stringify(body)});return {status:response.status,body:await response.json()}};
 let result=await post({prompt:'Training overview',mode:'editable'});assert.equal(result.status,200);assert.equal(result.body.mode,'editable');assert.equal(result.body.scene.nodes.length,8);assert.ok(calls[0].url.endsWith('/responses'));
 mode='image';result=await post({prompt:'Scientific figure',mode:'image'});assert.equal(result.status,200);assert.ok(result.body.image.startsWith('data:image/png;base64,'));assert.ok(calls.at(-1).url.endsWith('/images/generations'));
 mode='bad-json';result=await post({prompt:'Architecture',mode:'editable'});assert.equal(result.status,400);assert.match(result.body.error,/unreadable/);
 mode='error';result=await post({prompt:'Architecture',mode:'editable'});assert.equal(result.status,400);assert.equal(result.body.error,'Quota exceeded');
 const count=calls.length;key='';result=await post({prompt:'Architecture',mode:'editable'});assert.equal(result.status,503);assert.equal(calls.length,count);
});

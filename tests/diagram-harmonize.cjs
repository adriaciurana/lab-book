const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const model=require('../src/shared/diagram-model.js'),service=require('../src/server/diagram-harmonize.cjs');
test('research primitives, hierarchy and immutable scientific content',()=>{
 const scene=model.template('research');model.validate(scene);assert(scene.nodes.some(n=>n.kind==='patchgrid'));
 const old=scene.nodes.find(n=>n.id==='patches').x;model.translate(scene,'inputs',20,10);assert.equal(scene.nodes.find(n=>n.id==='patches').x,old+20);
 const svg=model.svg(scene);assert(svg.includes('data-labbook-diagram'));assert(svg.includes('Representation roles'));
 assert.throws(()=>model.validate({...scene,nodes:scene.nodes.map(n=>n.id==='patches'?{...n,rows:999}:n)}),/rows/);
 const request=service.requestFor({scene,messages:[{role:'user',text:'Make the architecture readable'}],model:'gpt-5.5',images:[{name:'Reference',data:'data:image/png;base64,aGVsbG8='}]});
 assert.equal(request.model,'gpt-5.5');assert.equal(request.store,false);assert(request.input[0].content.some(c=>c.type==='input_image'));assert.equal(request.text.format.strict,true);
 assert.throws(()=>service.requestFor({scene,messages:[{role:'user',text:'Layout'}],images:[{data:'https://example.org/private.png'}]}),/references/);
 const proposal=structuredClone(scene);proposal.nodes.find(n=>n.id==='module').x+=5;assert.equal(service.validateProposal(scene,proposal).nodes.find(n=>n.id==='module').x,proposal.nodes.find(n=>n.id==='module').x);
 const bad=structuredClone(proposal);bad.nodes[1].label='Invented result';assert.throws(()=>service.validateProposal(scene,bad),/changed label/);
 const badEdge=structuredClone(proposal);badEdge.edges[0].to='module';assert.throws(()=>service.validateProposal(scene,badEdge),/connections/);
 const missing=structuredClone(proposal);missing.nodes.pop();assert.throws(()=>service.validateProposal(scene,missing),/omitted/);
 const img={...model.node('img','Input',20,20,'#ffffff','image'),image:'data:image/png;base64,aGVsbG8='};const withImage={...model.empty(),nodes:[img],edges:[]},withoutData=structuredClone(withImage);delete withoutData.nodes[0].image;assert.equal(service.validateProposal(withImage,withoutData).nodes[0].image,img.image);
});
test('harmonization adapter handles chat replies, proposals, quota errors and missing credentials',async t=>{
 let mode='proposal',key='fake',calls=0;
 const scene=model.template('pipeline');const server=http.createServer((req,res)=>service.handle(req,res,()=>key,{fetchImpl:async()=>{calls++;if(mode==='quota')return {ok:false,text:async()=>JSON.stringify({error:{message:'Quota exceeded'}})};return {ok:true,text:async()=>JSON.stringify({output_text:JSON.stringify({reply:'Aligned the modules.',scene:mode==='question'?null:scene})})}}}));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
 const post=()=>fetch('http://127.0.0.1:'+server.address().port,{method:'POST',body:JSON.stringify({scene,messages:[{role:'user',text:'Harmonize'}]})});
 let response=await post();assert.equal(response.status,200);assert.equal((await response.json()).scene.nodes.length,4);
 mode='question';response=await post();assert.equal((await response.json()).scene,null);
 mode='quota';response=await post();assert.equal(response.status,400);assert.equal((await response.json()).error,'Quota exceeded');
 key='';const count=calls;response=await post();assert.equal(response.status,503);assert.equal(calls,count);
});

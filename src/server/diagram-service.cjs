const runtime=require('./runtime.cjs'),diagram=require('../shared/diagram-model.js');
const schema={type:'object',additionalProperties:false,required:['width','height','nodes','edges'],properties:{width:{type:'number'},height:{type:'number'},nodes:{type:'array',items:{type:'object',additionalProperties:false,required:['id','kind','label','x','y','w','h','fill','stroke','fontSize','href'],properties:{id:{type:'string'},kind:{type:'string',enum:['box','ellipse','diamond','text']},label:{type:'string'},x:{type:'number'},y:{type:'number'},w:{type:'number'},h:{type:'number'},fill:{type:'string'},stroke:{type:'string'},fontSize:{type:'number'},href:{type:'string'}}}},edges:{type:'array',items:{type:'object',additionalProperties:false,required:['id','from','to','label','dashed'],properties:{id:{type:'string'},from:{type:'string'},to:{type:'string'},label:{type:'string'},dashed:{type:'boolean'}}}}}};
function requestFor(input){
 if(typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>8000)throw Error('Describe the diagram in 1–8000 characters');
 if(!['editable','image'].includes(input.mode))throw Error('Choose editable diagram or image generation');
 const prompt='Create a clean scientific or engineering figure, white background, readable labels, restrained pastel colors, clear directional connectors. Do not invent experimental results. '+input.prompt;
 if(input.mode==='image')return {path:'images/generations',body:{model:process.env.LABBOOK_DIAGRAM_IMAGE_MODEL||'gpt-image-1-mini',prompt,n:1,size:'1536x1024',quality:'low',output_format:'png'}};
 return {path:'responses',body:{model:process.env.LABBOOK_DIAGRAM_MODEL||'gpt-4.1-mini',store:false,max_output_tokens:7500,instructions:'Return an editable architecture scene. Use a 1100 by 650 canvas, place all nodes fully within it, avoid overlap, use short multiline labels, nodes >=20px and fonts 14–24px, and node IDs for edges. Prefer horizontal flow, staged training panels or branching architectures. Links must be empty or explicit paths/URLs provided by the user. No image nodes or scripts.',input:prompt,text:{format:{type:'json_schema',name:'engineering_diagram',strict:true,schema}}}};
}
async function handle(req,res,getKey,{fetchImpl=fetch}={}){
 try{
  const input=await runtime.readBody(req,100000),request=requestFor(input),key=getKey();if(!key){runtime.json(res,503,{error:'OPENAI_API_KEY is not configured on the server'});return}
  const response=await fetchImpl('https://api.openai.com/v1/'+request.path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(request.body),signal:AbortSignal.timeout(input.mode==='image'?180000:90000)});
  const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{throw Error('OpenAI returned an unreadable response. Please retry.')}
  if(!response.ok)throw Error(data.error?.message||'OpenAI request failed ('+response.status+')');
  if(input.mode==='image'){const b64=data.data?.[0]?.b64_json;if(!b64)throw Error('OpenAI did not return an image');if(b64.length>16000000)throw Error('Generated image is too large');runtime.json(res,200,{mode:'image',image:'data:image/png;base64,'+b64,model:request.body.model});return}
  if(data.status==='incomplete')throw Error('Diagram generation was incomplete. Try a simpler prompt.');
  const text=data.output_text||data.output?.flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
  if(!text)throw Error('OpenAI did not return an editable diagram');let scene;try{scene=JSON.parse(text)}catch{throw Error('OpenAI returned invalid diagram data. Please retry.')}
  scene={version:1,background:'#ffffff',...scene};diagram.validate(scene);runtime.json(res,200,{mode:'editable',scene,model:request.body.model});
 }catch(error){runtime.json(res,400,{error:error.name==='TimeoutError'?'Generation timed out. Please retry.':error.message})}
}
module.exports={handle,requestFor};

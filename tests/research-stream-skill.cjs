const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
process.env.LABBOOK_DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-stream-skill-'));
const server=require('../src/server/server.cjs');
app.whenReady().then(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const instructions=await(await fetch(base+'/api/v1/skill?name=research-stream-author&resource=bundle')).text();
 assert(instructions.includes('scientific variables')&&instructions.includes('If-Match'));
 assert.equal((await fetch(base+'/api/v1/skill?name=../runtime.cjs')).status,404);
 const request=require('../src/server/research-search.cjs').buildRequest({query:'Actualiza el stream con las ablaciones proporcionadas',skillId:'research-stream-author',webSearch:false});
 assert(request.instructions.includes(instructions)&&request.instructions.includes('no workspace mutation tools'));assert.equal(request.tools.length,0);
 const win=new BrowserWindow({show:false,width:1280,height:1000});await win.loadURL(base+'/skills?isolated=1');
 await win.webContents.executeJavaScript(`(async()=>{
  const assert=(v,m)=>{if(!v)throw Error(m)},tick=()=>new Promise(r=>setTimeout(r,80));
  renderSkills();const card=document.querySelector('[data-skill="research-stream-author"]').closest('.skill-card');assert(card,'Skill missing');
  const create=[...card.querySelectorAll('button')].find(b=>b.textContent==='Create visual stream');create.click();await tick();await tick();
  const title=document.querySelector('#workspacePageTitle');assert(title,'No stream creation form');title.value='Fixture research stream';document.querySelector('#createWorkspacePage').click();await tick();
  const note=currentDraftNote();assert(note.draft&&!note.published,'Template published itself');assert(note.content.includes('data-architecture'),'No canonical architecture block');assert(note.content.includes('Experiment plan')&&note.content.includes('No measured results yet'),'Plan and honest empty results missing');
  const frame=document.querySelector('.architecture-frame');assert(frame,'Diagram preview missing');
  await tick();const infoLink=frame.contentDocument.querySelector('a[href="#method-details"]');assert(infoLink,'Method explainer link missing');infoLink.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));assert(document.querySelector('#method-details').open,'Figure link did not open the explainer');
  const table=document.querySelector('.research-report-table');assert(table&&table.querySelector('.research-number'),'Structured report table missing');for(const theme of ['light','dark']){applyTheme(theme);assert(getComputedStyle(table).display==='table','Report table layout broken');assert(getComputedStyle(table.querySelector('.research-number')).textAlign==='right','Numeric cells are not aligned')}
  assert(!note.content.includes('<script'),'Unsafe script copied from example');
  renderSkills();document.querySelector('[data-skill="research-stream-author"]').click();await tick();assert(document.querySelector('#activeSkill').value==='research-stream-author','Skill not selected in assistant');
  const nativeFetch=fetch;let payload;window.fetch=async(url,options)=>url==='/api/search'?{ok:true,json:async()=>{payload=JSON.parse(options.body);return {output:[{content:[{text:'Draft fixture'}]}]}}}:nativeFetch(url,options);
  document.querySelector('#contextQuestion').value='Create a plan from the selected evidence';document.querySelector('#askContext').click();await tick();await tick();assert(payload.skillId==='research-stream-author','Canonical skill ID not sent');window.fetch=nativeFetch;
 })()`);
 console.log('PASS: skill resources, path allowlist, complete assistant instructions, draft template with SVG, UI selection and request payload');server.close();app.exit(0);
 }catch(error){console.error(error);server.close();app.exit(1)}});

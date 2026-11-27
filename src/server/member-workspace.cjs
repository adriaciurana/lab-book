const fs=require('node:fs');
const path=require('node:path');
const {isDeepStrictEqual}=require('node:util');
const sanitize=require('sanitize-html');
const model=require('../shared/research-model.js');

function role(note,user,shares){
  if(user.role==='admin'||note.ownerId===user.id)return 'edit';
  if(note.visibility==='private')return null;
  const granted=shares.find(share=>share.entityType==='notes'&&share.entityId===note.id&&share.userId===user.id);
  return granted?.role||(note.visibility==='workspace'?'view':null);
}

const personalKeys=['agentChats','activeAgentChatId','context'];
function pickPersonal(data){
  return Object.fromEntries(personalKeys.filter(key=>Object.hasOwn(data,key)).map(key=>[key,data[key]]));
}
function personalState(filename,fallback={}){
  return pickPersonal(fs.existsSync(filename)?JSON.parse(fs.readFileSync(filename,'utf8')):fallback);
}

function read(runtime,user,{legacyOwner=false}={}){
  const stored=fs.existsSync(runtime.stateFile)?JSON.parse(fs.readFileSync(runtime.stateFile,'utf8')):{};
  const notes=(stored.notes||[]).filter(note=>role(note,user,stored.shares||[]));
  const ids=new Set(notes.map(note=>note.id));
  const personal=path.join(runtime.dataRoot,'private',runtime.environment+'-'+user.id+'.json');
  if(user.role==='admin'){
    const view={...stored};
    for(const key of personalKeys)delete view[key];
    Object.assign(view,personalState(personal,legacyOwner?stored:{}));
    return {stored,view:Object.keys(stored).length?view:null,personal,legacyOwner};
  }
  const view=model.ensure({
    folders:[{id:'inbox',name:'Inbox'}],papers:[],
    notes:notes.map(note=>({...note,accessRole:role(note,user,stored.shares||[]),folder:'inbox',boardIds:[],parentNoteId:ids.has(note.parentNoteId)?note.parentNoteId:null})),
    ...personalState(personal)
  });
  return {stored,view,personal};
}

const cleanText=value=>String(value??'').replace(/[<>]/g,'');
function cleanMarkup(value){
  return sanitize(String(value??''),{
    allowedTags:[...sanitize.defaults.allowedTags,'s','mark','caption','colgroup','col'],
    allowedAttributes:{a:['href','title'],td:['colspan','rowspan'],th:['colspan','rowspan'],'*':['data-lab-block-id']},
    allowedSchemes:['http','https','mailto'],allowProtocolRelative:false
  });
}
function safeNote(note){
  const clean={};
  for(const key of ['title','desc','tag','tone','type','updatedAt'])if(Object.hasOwn(note,key))clean[key]=cleanText(note[key]);
  if(Object.hasOwn(note,'draft'))clean.draft=note.draft===true;
  if(Object.hasOwn(note,'content'))clean.content=cleanMarkup(note.content);
  const version=value=>({title:cleanText(value?.title),content:cleanMarkup(value?.content),savedAt:cleanText(value?.savedAt)});
  if(note.published)clean.published=version(note.published);
  if(Array.isArray(note.versions))clean.versions=note.versions.map(version);
  if(Array.isArray(note.blocks))clean.blocks=note.blocks.filter(block=>block&&typeof block.id==='string').map((block,order)=>({id:cleanText(block.id),html:cleanMarkup(block.html),order}));
  return clean;
}

function write(runtime,user,input,current){
  const {stored,view,personal,legacyOwner}=current;
  if(user.role==='admin'){
    if(!Array.isArray(input.notes)||!Array.isArray(input.folders))throw Error('Invalid workspace state.');
    const next={...input};
    for(const key of personalKeys)delete next[key];
    if(!legacyOwner)Object.assign(next,pickPersonal(stored));
    model.validate(structuredClone(next));
    runtime.atomicWrite(personal,JSON.stringify(pickPersonal(input)));
    runtime.atomicWrite(runtime.stateFile,JSON.stringify(next));
    return;
  }
  if(!Array.isArray(input.notes))throw Error('Invalid note list.');
  const rows=stored.notes||=[];
  const notes=new Map(rows.map(note=>[note.id,note]));
  const projected=new Map(view.notes.map(note=>[note.id,note]));
  const submitted=new Set();
  for(const note of input.notes){
    if(!note||typeof note.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(note.id)||submitted.has(note.id))throw Error('Invalid note ID.');
    submitted.add(note.id);
    const original=notes.get(note.id);
    if(!original){
      rows.push({...safeNote(note),id:note.id,ownerId:user.id,visibility:'private',folder:'inbox'});
      continue;
    }
    if(!projected.has(note.id))throw Error('This note is not available.');
    if(isDeepStrictEqual(projected.get(note.id),note))continue;
    if(role(original,user,stored.shares||[])!=='edit')throw Error('You have read-only access to this page.');
    Object.assign(original,safeNote(note));
  }
  if(view.notes.some(note=>!submitted.has(note.id)))throw Error('Removing pages requires an administrator.');
  const revision=runtime.stateRevision();
  model.validate(structuredClone(stored));
  const profile=pickPersonal(input);
  if(!isDeepStrictEqual(stored,fs.existsSync(runtime.stateFile)?JSON.parse(fs.readFileSync(runtime.stateFile,'utf8')):{})){
    if(runtime.stateRevision()!==revision)throw Error('Workspace changed. Reload and retry.');
    runtime.atomicWrite(runtime.stateFile,JSON.stringify(stored));
  }
  runtime.atomicWrite(personal,JSON.stringify(profile));
}

module.exports={role,read,write};

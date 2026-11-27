const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const workspace=require('../src/server/member-workspace.cjs');

test('member snapshots hide private pages and distinguish view and edit grants',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'labbook-member-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'private'));
  const runtime={dataRoot:root,environment:'test',stateFile:path.join(root,'state.json'),stateRevision:()=> 'test',atomicWrite:fs.writeFileSync};
  const user={id:'member',role:'member'};
  const notes=[
    {id:'private',ownerId:'admin',visibility:'private',content:'private text'},
    {id:'view',ownerId:'admin',visibility:'workspace',content:'read-only text'},
    {id:'edit',ownerId:'admin',visibility:'shared',content:'shared text'}
  ];
  fs.writeFileSync(runtime.stateFile,JSON.stringify({notes,users:[{id:user.id}],shares:[{id:'grant',entityType:'notes',entityId:'edit',userId:user.id,role:'edit'}]}));
  const current=workspace.read(runtime,user);
  assert.deepEqual(current.view.notes.map(note=>note.id),['view','edit']);
  const forbidden=structuredClone(current.view);
  forbidden.notes[0].content='forbidden';
  assert.throws(()=>workspace.write(runtime,user,forbidden,workspace.read(runtime,user)),/read-only/);
  const hidden=structuredClone(current.view);
  hidden.notes.push({id:'private',content:'forbidden'});
  assert.throws(()=>workspace.write(runtime,user,hidden,workspace.read(runtime,user)),/not available/);
  const permitted=structuredClone(current.view);
  permitted.notes[1].content='edited by member';
  permitted.notes[1].ownerId=user.id;
  workspace.write(runtime,user,permitted,workspace.read(runtime,user));
  const stored=JSON.parse(fs.readFileSync(runtime.stateFile,'utf8'));
  assert.equal(stored.notes[2].content,'edited by member');
  assert.equal(stored.notes[2].ownerId,'admin');
  assert.equal(stored.notes[0].content,'private text');
});

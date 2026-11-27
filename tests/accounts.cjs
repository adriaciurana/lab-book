const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { initializeAdmin, verifyPassword } = require('../src/server/accounts.cjs');

test('administrator setup stores a protected hash and cannot overwrite existing accounts', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'labbook-accounts-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  assert.throws(()=>initializeAdmin(root,'admin','1234'), /12–256/);
  const password = 'initial test password';
  const created = initializeAdmin(root,'Admin',password);
  const file = path.join(root,'private','accounts.json');
  const raw = fs.readFileSync(file,'utf8');
  const [account] = JSON.parse(raw).accounts;
  assert.equal(created.username,'admin');
  assert.equal(account.role,'admin');
  assert.equal(account.mustChangePassword,true);
  assert.equal(raw.includes(password),false);
  assert.equal(fs.statSync(file).mode & 0o777,0o600);
  assert.equal(verifyPassword(password, account),true);
  assert.equal(verifyPassword('wrong password', account),false);
  assert.throws(()=>initializeAdmin(root,'someone','another test password'), /already/);
  assert.equal(fs.readFileSync(file,'utf8'),raw);
});

test('configured workspace requires sign-in and password rotation before exposing data', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'labbook-account-http-'));
  process.env.LABBOOK_DATA_DIR = root;
  initializeAdmin(root, 'admin', 'temporary password');
  const server = require('../src/server/server.cjs');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true})});
  const base = 'http://127.0.0.1:'+server.address().port;
  const request = (route, body, cookie) => fetch(base+route,{
    method:body?'POST':'GET',
    headers:{...(body&&{'Content-Type':'application/json'}),...(cookie&&{Cookie:cookie})},
    ...(body&&{body:JSON.stringify(body)})
  });
  assert.equal((await request('/bootstrap.js')).status,401);
  const login = await request('/api/account/login',{username:'admin',password:'temporary password'});
  assert.equal(login.status,200);
  const header=login.headers.get('set-cookie');
  assert.match(header,/HttpOnly; SameSite=Strict/);
  const cookie=header.split(';')[0];
  assert.equal((await request('/api/state',null,cookie)).status,401);
  assert.equal((await request('/api/account/password',{current:'temporary password',password:'a different password'},cookie)).status,200);
  assert.equal((await request('/bootstrap.js',null,cookie)).status,200);
  assert.equal((await request('/api/account/logout',{},cookie)).status,200);
  assert.equal((await request('/api/state',null,cookie)).status,401);
  assert.equal((await request('/api/account/login',{username:'admin',password:'temporary password'})).status,401);
});

test('separate administrator and member sessions enforce read, edit and AI policy', async t => {
  const runtime=require('../src/server/runtime.cjs');
  const root=runtime.dataRoot;
  // The prior test removed its temporary root. Reinitialize the same server in isolation.
  initializeAdmin(root,'admin','initial admin password');
  const server=require('../src/server/server.cjs');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true})});
  const base='http://127.0.0.1:'+server.address().port;
  const call=(route,{cookie,body,method=body?'POST':'GET',revision}={})=>fetch(base+route,{method,headers:{...(cookie&&{Cookie:cookie}),...(body&&{'Content-Type':'application/json'}),...(revision&&{'If-Match':revision})},...(body&&{body:JSON.stringify(body)})});
  async function login(username,password,replacement){
    const result=await call('/api/account/login',{body:{username,password}});
    assert.equal(result.status,200);
    const cookie=result.headers.get('set-cookie').split(';')[0];
    const change=await call('/api/account/password',{cookie,body:{current:password,password:replacement}});
    assert.equal(change.status,200);
    return cookie;
  }
  const admin=await login('admin','initial admin password','permanent admin password');
  const pending=await(await call('/api/account/ai',{cookie:admin})).json();
  assert.equal(pending.setupRequired,true);
  assert.equal((await call('/api/search',{cookie:admin,body:{query:'test'}})).status,428);
  assert.equal((await call('/api/account/ai',{cookie:admin,body:{mode:'team',provider:'openai',key:'team-fixture-secret'}})).status,200);
  const team=await(await call('/api/account/ai',{cookie:admin})).json();
  assert.equal(team.setupRequired,false);
  assert.equal(team.mode,'team');
  assert.equal(team.configured,true);
  assert.equal(Object.hasOwn(team,'key'),false);
  const added=await call('/api/account/members',{cookie:admin,body:{username:'reader',password:'initial member password'}});
  assert.equal(added.status,201);const {id}=await added.json();
  const member=await login('reader','initial member password','permanent member password');
  assert.equal((await call('/api/account/members',{cookie:member})).status,403);
  runtime.atomicWrite(runtime.stateFile,JSON.stringify({folders:[{id:'inbox',name:'Inbox'}],notes:[{id:'public-note',title:'Shared',content:'<p>Original</p>'},{id:'secret-note',title:'Hidden',visibility:'private',content:'Private text'}]}));
  const share=role=>call('/api/account/share',{cookie:admin,body:{noteId:'public-note',visibility:'shared',grants:[{userId:id,role}]}});
  assert.equal((await share('view')).status,200);
  let response=await call('/api/state',{cookie:member}),snapshot=await response.json();
  assert.deepEqual(snapshot.notes.map(note=>note.id),['public-note']);
  snapshot.notes[0].content='<p>Edited</p><script>steal()</script>';
  const save=revision=>call('/api/state',{cookie:member,method:'PUT',body:snapshot,revision});
  assert.equal((await save(response.headers.get('x-labbook-revision'))).status,403);
  assert.equal((await share('edit')).status,200);
  response=await call('/api/state',{cookie:member});
  snapshot=await response.json();snapshot.notes[0].content='<p>Edited</p><script>steal()</script>';
  assert.equal((await save(response.headers.get('x-labbook-revision'))).status,200);
  const adminView=await(await call('/api/state',{cookie:admin})).json();
  assert.equal(adminView.notes[0].content,'<p>Edited</p>');
  assert.equal(adminView.notes[1].content,'Private text');
  assert.equal((await call('/api/account/ai',{cookie:admin,body:{mode:'personal',provider:'openai'}})).status,200);
  assert.equal((await call('/api/account/ai',{cookie:member,body:{mode:'team',provider:'openai',key:'ignored'}})).status,403);
  assert.equal((await call('/api/account/ai',{cookie:member,body:{provider:'openai',key:'member-fixture-secret'}})).status,200);
  const settings=await(await call('/api/account/ai',{cookie:member})).json();
  assert.equal(settings.mode,'personal');assert.equal(settings.provider,'openai');assert.equal(settings.configured,true);
  assert.equal((await(await call('/api/state',{cookie:admin})).text()).includes('member-fixture-secret'),false);
  assert.equal((await call('/api/account/member-access',{cookie:member,body:{id,role:'admin'}})).status,403);
  assert.equal((await call('/api/account/member-access',{cookie:admin,body:{id,role:'admin'}})).status,200);
  assert.equal((await call('/api/state',{cookie:member})).status,401);
  const upgraded=await call('/api/account/login',{body:{username:'reader',password:'permanent member password'}});
  const upgradedCookie=upgraded.headers.get('set-cookie').split(';')[0];
  assert.equal((await(await call('/api/account/me',{cookie:upgradedCookie})).json()).role,'admin');
  const ownerSnapshot=await call('/api/state',{cookie:admin});
  const ownerState=await ownerSnapshot.json();
  ownerState.agentChats=[{id:'owner-chat',messages:[{text:'owner-only conversation'}]}];
  assert.equal((await call('/api/state',{cookie:admin,method:'PUT',body:ownerState,revision:ownerSnapshot.headers.get('x-labbook-revision')})).status,200);
  const secondSnapshot=await call('/api/state',{cookie:upgradedCookie});
  const secondState=await secondSnapshot.json();
  assert.equal(secondState.agentChats,undefined);
  secondState.agentChats=[{id:'second-chat',messages:[]}];
  assert.equal((await call('/api/state',{cookie:upgradedCookie,method:'PUT',body:secondState,revision:secondSnapshot.headers.get('x-labbook-revision')})).status,200);
  assert.equal((await(await call('/api/state',{cookie:admin})).json()).agentChats[0].id,'owner-chat');
  assert.doesNotMatch(fs.readFileSync(runtime.stateFile,'utf8'),/owner-only conversation/);

  assert.equal((await call('/api/account/member-access',{cookie:admin,body:{id,revoke:true}})).status,200);
  assert.equal((await call('/api/state',{cookie:upgradedCookie})).status,401);

});

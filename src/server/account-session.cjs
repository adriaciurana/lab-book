const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { passwordRecord, verifyPassword, usernamePattern } = require('./accounts.cjs');

function createAccountGate(runtime) {
  const filename = path.join(runtime.dataRoot, 'private', 'accounts.json');
  const sessions = new Map();
  const authorizations=new Map();
  const renewals=new Map();
  const catalog=new Map();
  const login=require('./chatgpt-login.cjs');
  const localBrowser=req=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
    && /^127\.0\.0\.1:\d+$/.test(req.headers.host||'');
  function canConnect(req){return localBrowser(req)&&(req.headers.host||'').endsWith(':'+req.socket.localPort)}
  async function planToken(userId,connection){
    if(connection.expires-Date.now()>60_000)return connection.accessToken;
    if(!renewals.has(userId)){
      const task=(async()=>{
        const next=await login.refreshLogin(connection);
        const current=JSON.parse(fs.readFileSync(filename,'utf8'));
        const user=current.accounts.find(account=>account.id===userId);
        if(current.ai?.mode!=='personal'||user?.chatgpt?.refreshToken!==connection.refreshToken)throw Error('ChatGPT connection changed. Reload and retry.');
        user.chatgpt=next;writeRegistry(current);
        return next.accessToken;
      })().finally(()=>renewals.delete(userId));
      renewals.set(userId,task);
    }
    return renewals.get(userId);
  }
  const attempts = new Map();
  const lifetime = 8 * 60 * 60 * 1000;
  const cookieName = 'labbook_session_' + runtime.environment;

  function setCookie(req, res, token, age) {
    const secure = req.socket.encrypted || process.env.LABBOOK_HTTPS === '1';
    res.setHeader('Set-Cookie', cookieName+'='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+age+(secure?'; Secure':''));
  }

  function page(res, changePassword) {
    const title = changePassword ? 'Change your temporary password' : 'Sign in to Lab Book';
    const fields = changePassword
      ? '<label>Current password <input name="current" type="password" autocomplete="current-password" required></label><label>New password <input name="password" type="password" autocomplete="new-password" minlength="12" required></label>'
      : '<label>Username <input name="username" autocomplete="username" required></label><label>Password <input name="password" type="password" autocomplete="current-password" required></label>';
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; script-src 'nonce-login'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'" });
    res.end('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title>'+
      '<style>body{font:16px system-ui;background:#f1f3ec;color:#17221e;padding:24px}main{margin:12vh auto 0;max-width:380px;background:white;padding:24px;border-radius:14px}label,input{display:block;width:100%;box-sizing:border-box}input,button{font:inherit;padding:10px;margin:6px 0 14px}button{background:#d8f56d;border:1px solid #8da44d;border-radius:6px}</style>'+
      '<main><h1>'+title+'</h1><form>'+fields+'<button>Continue</button></form><p role="alert"></p></main>'+
      '<script nonce="login">document.querySelector("form").onsubmit=async e=>{e.preventDefault();const status=document.querySelector("[role=alert]");try{const r=await fetch("'+(changePassword?'/api/account/password':'/api/account/login')+'",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});if(!r.ok)throw Error((await r.json()).error);location.replace("/")}catch(error){status.textContent=error.message}};</script>');
    return true;
  }

  function writeRegistry(registry){
    const temporary=filename+'.'+crypto.randomUUID();
    try{fs.writeFileSync(temporary,JSON.stringify(registry),{mode:0o600,flag:'wx'});fs.renameSync(temporary,filename)}
    finally{fs.rmSync(temporary,{force:true})}
  }

  return async function accountGate(req,res) {
    if (!fs.existsSync(filename)) return false;
    const pathname = new URL(req.url,'http://localhost').pathname;
    if (pathname==='/api/health' && req.method==='GET') return false;
    const registry = JSON.parse(fs.readFileSync(filename,'utf8'));
    const now=Date.now();
    for(const [key,session] of sessions)if(session.expires<=now)sessions.delete(key);
    for(const [key,attempt] of attempts)if(attempt.expires<=now)attempts.delete(key);
    const token = (req.headers.cookie||'').split(/;\s*/).find(value=>value.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    const session = sessions.get(token);
    const user = registry.accounts.find(account=>account.id===session?.userId);
    req.labbookUser=user&&{id:user.id,username:user.username,role:user.role};

    for(const [key,attempt] of authorizations)if(attempt.expires<=now)authorizations.delete(key);
    if(pathname==='/auth/callback'&&req.method==='GET'){
      const params=new URL(req.url,'http://localhost').searchParams;
      const attempt=authorizations.get(params.get('state'));
      if(!attempt||!canConnect(req))return runtime.json(res,400,{error:'Sign-in expired. Open Account settings and try again.'});
      authorizations.delete(attempt.state);
      try{
        const connected=await login.finishLogin(attempt,params);
        const current=JSON.parse(fs.readFileSync(filename,'utf8'));
        const account=current.accounts.find(item=>item.id===attempt.userId);
        if(!account||account.mustChangePassword||!sessions.has(attempt.sessionToken)||current.ai?.mode!=='personal')throw Error('Sign-in session changed. Try again.');
        account.chatgpt=connected;account.ai={...account.ai,provider:'chatgpt'};
        writeRegistry(current);
        res.writeHead(303,{'Location':'/agent','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
        res.end();return true;
      }catch(error){return runtime.json(res,400,{error:error.message})}
    }

    if (req.method==='POST' && pathname.startsWith('/api/account/')) {
      if (req.headers['sec-fetch-site']==='cross-site'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')) {
        return runtime.json(res,403,{error:'Account requests must originate from Lab Book.'});
      }
      if(pathname==='/api/account/login'){
        const client=req.socket.remoteAddress;
        const attempt=attempts.get(client)||{count:0,expires:now+60_000};
        if(attempt.count>=8)return runtime.json(res,429,{error:'Too many attempts. Try again in a minute.'});
        const input=await runtime.readBody(req,4096);
        const account=registry.accounts.find(item=>item.username===String(input.username||'').trim().toLowerCase());
        if(!verifyPassword(input.password,account)){
          attempt.count++;attempts.set(client,attempt);
          return runtime.json(res,401,{error:'Invalid username or password.'});
        }
        attempts.delete(client);sessions.delete(token);
        const next=crypto.randomBytes(32).toString('base64url');
        sessions.set(next,{userId:account.id,expires:now+lifetime});
        setCookie(req,res,next,lifetime/1000);
        return runtime.json(res,200,{mustChangePassword:account.mustChangePassword});
      }
      if(!user)return runtime.json(res,401,{error:'Sign in first.'});
      if(pathname==='/api/account/logout'){
        sessions.delete(token);setCookie(req,res,'',0);return runtime.json(res,200,{signedOut:true});
      }
      if(pathname==='/api/account/chatgpt'&&!user.mustChangePassword){
        const input=await runtime.readBody(req,4096);
        const current=JSON.parse(fs.readFileSync(filename,'utf8'));
        const account=current.accounts.find(item=>item.id===user.id);
        if(!sessions.has(token)||!account||account.mustChangePassword||current.ai?.mode!=='personal')return runtime.json(res,403,{error:'Personal AI credentials must be enabled.'});
        if(input.disconnect===true){
          delete account.chatgpt;catalog.delete(user.id);
          if(account.ai?.provider==='chatgpt')account.ai={provider:'openai'};
          for(const [key,attempt] of authorizations)if(attempt.userId===user.id)authorizations.delete(key);
          writeRegistry(current);return runtime.json(res,200,{disconnected:true});
        }
        if(!canConnect(req))return runtime.json(res,400,{error:'Open Lab Book using a local loopback address on the server device or an SSH tunnel.'});
        if(!current.chatgptHostId){current.chatgptHostId='urn:uuid:'+crypto.randomUUID();writeRegistry(current)}
        for(const [key,attempt] of authorizations)if(attempt.userId===user.id)authorizations.delete(key);
        const attempt=login.beginLogin({hostId:current.chatgptHostId,port:req.socket.localPort,clientId:input.another?undefined:account.chatgpt?.clientId});
        authorizations.set(attempt.state,{...attempt,userId:user.id,sessionToken:token});
        return runtime.json(res,200,{url:attempt.url});
      }
      if(pathname==='/api/account/ai'&&!user.mustChangePassword){
        const input=await runtime.readBody(req,8192);
        const current=JSON.parse(fs.readFileSync(filename,'utf8'));
        const account=current.accounts.find(item=>item.id===user.id);
        if(!sessions.has(token)||!account||account.mustChangePassword)return runtime.json(res,403,{error:'Sign in again.'});
        const team=current.ai||{mode:'team',provider:'openai'};
        if(input.mode){
          if(account.role!=='admin'||!['team','personal'].includes(input.mode))return runtime.json(res,403,{error:'Only administrators can change the workspace AI policy.'});
          team.mode=input.mode;
        }
        if(!['openai','claude'].includes(input.provider))throw Error('Choose an AI provider.');
        const key=typeof input.key==='string'?input.key.trim():'';
        if(key.length>1024||/[\r\n]/.test(key))throw Error('Invalid API key.');
        if(team.mode==='team'){
          if(account.role!=='admin')return runtime.json(res,403,{error:'The administrator manages team credentials.'});
          if(team.provider!==input.provider)delete team.key;
          team.provider=input.provider;
          if(key)team.key=key;
          if(input.clear===true)delete team.key;
        }else if(key||input.clear===true){
          account.ai={provider:input.provider,...(!input.clear&&{key})};
        }
        current.ai=team;writeRegistry(current);
        return runtime.json(res,200,{saved:true});
      }
      if(pathname==='/api/account/members'&&!user.mustChangePassword&&user.role==='admin'){
        const input=await runtime.readBody(req,4096);
        const username=String(input.username||'').trim().toLowerCase();
        if(!usernamePattern.test(username))throw Error('Invalid username.');
        const member={id:crypto.randomUUID(),username,role:'member',password:passwordRecord(input.password),mustChangePassword:true};
        const next=JSON.parse(fs.readFileSync(filename,'utf8'));
        if(!sessions.has(token)||next.accounts.find(account=>account.id===user.id)?.role!=='admin')return runtime.json(res,403,{error:'Administrator access is required.'});
        if(next.accounts.some(account=>account.username===username))return runtime.json(res,409,{error:'Username already exists.'});
        next.accounts.push(member);writeRegistry(next);
        return runtime.json(res,201,{id:member.id,username});
      }
      if(pathname==='/api/account/member-access'){
        const input=await runtime.readBody(req,4096);
        const current=JSON.parse(fs.readFileSync(filename,'utf8'));
        const actor=current.accounts.find(account=>account.id===user.id);
        if(!sessions.has(token)||actor?.role!=='admin'||actor.mustChangePassword)return runtime.json(res,403,{error:'Administrator access is required.'});
        const member=current.accounts.find(account=>account.id===input.id);
        if(!member)return runtime.json(res,404,{error:'Account not found.'});
        if(member.id===actor.id)return runtime.json(res,400,{error:'You cannot change your own access here.'});
        if(input.role!==undefined){
          if(!['admin','member'].includes(input.role))throw Error('Invalid role.');
          member.role=input.role;
          writeRegistry(current);
        }else if(input.revoke!==true)throw Error('Choose an access change.');
        for(const [key,entry] of sessions)if(entry.userId===member.id)sessions.delete(key);
        return runtime.json(res,200,{saved:true});
      }
      if(pathname==='/api/account/password'){
        const input=await runtime.readBody(req,4096);
        const currentRegistry=JSON.parse(fs.readFileSync(filename,'utf8'));
        const currentUser=currentRegistry.accounts.find(account=>account.id===user.id);
        if(!sessions.has(token)||!verifyPassword(input.current,currentUser))return runtime.json(res,401,{error:'Incorrect current password.'});
        if(input.password===input.current)return runtime.json(res,400,{error:'Choose a different password.'});
        currentUser.password=passwordRecord(input.password);currentUser.mustChangePassword=false;
        writeRegistry(currentRegistry);
        for(const [key,entry] of sessions)if(entry.userId===user.id&&key!==token)sessions.delete(key);
        return runtime.json(res,200,{changed:true});
      }
    }
    if (!user||user.mustChangePassword) {
      if(req.method==='GET'&&!pathname.startsWith('/api/')&&pathname!=='/bootstrap.js')return page(res,Boolean(user));
      return runtime.json(res,401,{error:user?'Change your temporary password first.':'Sign in first.'});
    }
    if(!user.mustChangePassword&&pathname==='/api/account/share'&&req.method==='POST'){
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')||req.headers['sec-fetch-site']==='cross-site')return runtime.json(res,403,{error:'Invalid request.'});
      const input=await runtime.readBody(req,16000);
      const stored=JSON.parse(fs.readFileSync(runtime.stateFile,'utf8'));
      const note=stored.notes.find(item=>item.id===input.noteId);
      if(!note||!(user.role==='admin'||note.ownerId===user.id))return runtime.json(res,404,{error:'Page not available.'});
      const visibility=input.visibility,grants=input.grants||[];
      if(!['private','workspace','shared'].includes(visibility)||!Array.isArray(grants)||grants.length>100)throw Error('Invalid sharing options.');
      if(grants.some(grant=>!registry.accounts.some(account=>account.id===grant.userId)||!['view','edit'].includes(grant.role))||new Set(grants.map(grant=>grant.userId)).size!==grants.length)throw Error('Invalid sharing recipient.');
      note.ownerId||=user.id;note.visibility=visibility;
      stored.users=registry.accounts.map(({id,username})=>({id,name:username}));
      stored.shares=(stored.shares||[]).filter(share=>share.entityType!=='notes'||share.entityId!==note.id);
      for(const grant of visibility==='private'?[]:grants)stored.shares.push({id:crypto.randomUUID(),entityType:'notes',entityId:note.id,userId:grant.userId,role:grant.role});
      require('../shared/research-model.js').validate(structuredClone(stored));
      runtime.atomicWrite(runtime.stateFile,JSON.stringify(stored));
      return runtime.json(res,200,{saved:true});
    }
    const team=registry.ai||{mode:'team',provider:'openai'};
    const personal=team.mode==='personal';
    const credential=personal?(user.ai||{provider:'openai'}):team;
    req.labbookAI={provider:credential.provider,key:credential.key,allowServerKey:!personal&&credential.provider==='openai'};
    if(personal&&credential.provider==='chatgpt'&&user.chatgpt){
      req.labbookAI.planToken=()=>planToken(user.id,user.chatgpt);
      req.labbookAI.planModels=async()=>{
        const token=await req.labbookAI.planToken();
        const cached=catalog.get(user.id);
        if(cached?.token===token&&cached.expires>Date.now())return cached.models;
        const models=await require('./chatgpt-plan.cjs').listPlanModels(token);
        catalog.set(user.id,{token,models,expires:Date.now()+300000});
        return models;
      };
    }
    if(pathname==='/api/account/chat-models'&&req.method==='GET'){
      const provider=credential.provider;
      const models=provider==='chatgpt'?await req.labbookAI.planModels?.()||[]:
        provider==='claude'?[{id:'',label:'Claude · workspace model'}]:
        [{id:'',label:'Server default'},{id:'gpt-4.1-mini',label:'GPT-4.1 mini'},{id:'gpt-5.4-mini',label:'GPT-5.4 mini'},{id:'gpt-5.4',label:'GPT-5.4'}];
      return runtime.json(res,200,{provider,models});
    }
    if(pathname==='/api/account/ai'&&req.method==='GET'){
      return runtime.json(res,200,{mode:team.mode,provider:credential.provider,configured:Boolean(credential.provider==='chatgpt'?user.chatgpt:credential.key||(req.labbookAI.allowServerKey&&process.env.OPENAI_API_KEY)),...(personal&&{chatgptAvailable:canConnect(req),chatgptEmail:user.chatgpt?.email||''})});
    }
    if(pathname==='/api/account/share'&&req.method==='GET'){
      const noteId=new URL(req.url,'http://localhost').searchParams.get('noteId');
      const stored=fs.existsSync(runtime.stateFile)?JSON.parse(fs.readFileSync(runtime.stateFile,'utf8')):{};
      const note=stored.notes?.find(item=>item.id===noteId);
      if(!note||!(user.role==='admin'||note.ownerId===user.id))return runtime.json(res,404,{error:'Page not available.'});
      return runtime.json(res,200,{visibility:note.visibility||'private',members:registry.accounts.filter(account=>account.role==='member'&&account.id!==user.id).map(({id,username})=>({id,username})),grants:(stored.shares||[]).filter(share=>share.entityType==='notes'&&share.entityId===note.id)});
    }
    if(pathname==='/api/account/me')return runtime.json(res,200,req.labbookUser);
    if(pathname==='/api/account/members'&&req.method==='GET'&&user.role==='admin'){
      return runtime.json(res,200,registry.accounts.map(({id,username,role})=>({id,username,role})));
    }
    if(user.role!=='admin'){
      const work=require('./member-workspace.cjs');
      if(pathname==='/bootstrap.js'&&req.method==='GET'){
        const {view}=work.read(runtime,user);
        res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
        res.end('window.LABBOOK_ACCOUNT='+JSON.stringify(req.labbookUser)+';window.LABBOOK_ENV='+JSON.stringify(runtime.environment)+';window.LABBOOK_STATE_REVISION='+JSON.stringify(runtime.stateRevision())+';window.LABBOOK_SERVER_STATE='+JSON.stringify(view)+';');
        return true;
      }
      if(pathname==='/api/state'){
        if(req.method==='PUT'){
          const input=await runtime.readBody(req);
          if(!sessions.has(token))return runtime.json(res,401,{error:'Sign in again.'});
          if(req.headers['if-match']!==runtime.stateRevision())return runtime.json(res,409,{error:'Workspace changed. Reload and retry.'});
          try{work.write(runtime,user,input,work.read(runtime,user))}
          catch(error){return runtime.json(res,403,{error:error.message})}
          res.setHeader('X-Labbook-Revision',runtime.stateRevision());
          return runtime.json(res,200,{saved:true});
        }
        if(req.method==='GET'){
          res.setHeader('X-Labbook-Revision',runtime.stateRevision());
          return runtime.json(res,200,work.read(runtime,user).view);
        }
      }
      if(pathname==='/api/collab/presence'&&['GET','POST'].includes(req.method)){
        req.labbookVisibleNotes=new Set(work.read(runtime,user).view.notes.map(note=>note.id));
        return false;
      }
      if(pathname==='/api/search'&&req.method==='POST'){
        const {view}=work.read(runtime,user);
        req.labbookAgentWorkspace={...view,context:[]};
        return false;
      }
      if(pathname.startsWith('/api/'))return runtime.json(res,403,{error:'This operation requires an administrator.'});
    }
    return false;
  };
}

module.exports={createAccountGate};

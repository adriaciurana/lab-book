const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {beginLogin,finishLogin,refreshLogin}=require('../src/server/chatgpt-login.cjs');

test('ChatGPT login binds PKCE, nonce and issued client to the local authorization',async()=>{
 const pending=beginLogin({hostId:'urn:uuid:'+crypto.randomUUID(),port:4174});
 const authorization=new URL(pending.url);
 assert.equal(authorization.searchParams.get('redirect_uri'),'http://127.0.0.1:4174/auth/callback');
 assert.equal(authorization.searchParams.get('code_challenge'),crypto.createHash('sha256').update(pending.verifier).digest('base64url'));
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const key={...publicKey.export({format:'jwk'}),kid:'fixture'};
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const claims={iss:'https://auth.openai.com',sub:'account',aud:'client-fixture',nonce:pending.nonce,exp:Math.floor(Date.now()/1000)+600};
 const body=[encode({alg:'RS256',kid:key.kid}),encode(claims)].join('.');
 const signed=body+'.'+crypto.sign('RSA-SHA256',Buffer.from(body),privateKey).toString('base64url');
 const responses=async(url,options)=>{
  if(url.endsWith('/oauth/token')){
   assert.equal(options.body.get('client_id'),'client-fixture');
   if(options.body.get('grant_type')==='refresh_token'){
    assert.equal(options.body.get('refresh_token'),'renewable');
    return Response.json({access_token:'renewed',expires_in:600});
   }
   assert.equal(options.body.get('code_verifier'),pending.verifier);
   return Response.json({id_token:signed,access_token:'access',refresh_token:'renewable',expires_in:600,scope:'chatgpt.tokens.use.direct'});
  }
  return Response.json(url.endsWith('jwks.json')?{keys:[key]}:{jwks_uri:'https://auth.openai.com/.well-known/jwks.json'});
 };
 const callback=new URLSearchParams({state:pending.state,code:'fixture',client_id:'client-fixture'});
 const connection=await finishLogin(pending,callback,responses);
 assert.equal(connection.subject,'account');
 assert.equal((await refreshLogin(connection,responses)).accessToken,'renewed');
 await assert.rejects(finishLogin({...pending,nonce:'wrong'},callback,responses),/identity could not be verified/);
 callback.set('state','wrong');
 await assert.rejects(finishLogin(pending,callback,responses),/expired/);
});

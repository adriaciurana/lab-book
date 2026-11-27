// Open-source Sign in with ChatGPT. Tokens are handled by the server only.
const crypto = require('node:crypto');
const issuer = 'https://auth.openai.com';
const resource = 'https://api.openai.com/v1';
const scope = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const random = () => crypto.randomBytes(32).toString('base64url');

function beginLogin({ hostId, port, clientId }) {
  if (!/^urn:uuid:[0-9a-f-]+$/i.test(hostId)) throw Error('Invalid ChatGPT host ID.');
  if (!Number.isInteger(port)||port<1||port>65535) throw Error('Invalid callback port.');
  const verifier=random(), state=random(), nonce=random();
  const redirectUri='http://127.0.0.1:'+port+'/auth/callback';
  const url=new URL(issuer+'/api/accounts/authorize');
  url.search=new URLSearchParams({
    client_id:clientId||'dynamic_agent_client', agent_name_hint:'Lab Book',
    ext_agent_host_id:hostId, response_type:'code', redirect_uri:redirectUri,
    scope, resource, state, nonce, code_challenge_method:'S256',
    code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url')
  }).toString();
  return {url:url.href,state,nonce,verifier,redirectUri,clientId,expires:Date.now()+10*60_000};
}

async function readJson(url,fetchImpl,options={}) {
  const response=await fetchImpl(url,{...options,signal:AbortSignal.timeout(15_000),redirect:'error'});
  if(!response.ok)throw Error('ChatGPT authorization request failed ('+response.status+').');
  return response.json();
}

async function verifyIdentity(token,clientId,nonce,fetchImpl){
  if(typeof token!=='string'||token.length>20000)throw Error('ChatGPT did not return an identity token.');
  const parts=token.split('.');
  if(parts.length!==3)throw Error('Invalid ChatGPT identity token.');
  const [headerEncoded,claimsEncoded,signature]=parts;
  const decode=part=>JSON.parse(Buffer.from(part,'base64url').toString('utf8'));
  const header=decode(headerEncoded),claims=decode(claimsEncoded);
  if(header.alg!=='RS256'||typeof header.kid!=='string')throw Error('Unsupported identity signature.');
  const now=Math.floor(Date.now()/1000);
  const audiences=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  if(claims.iss!==issuer||!audiences.includes(clientId)||(audiences.length>1&&claims.azp!==clientId)||
     claims.nonce!==nonce||!Number.isFinite(claims.exp)||claims.exp<=now||
     (claims.nbf!==undefined&&(!Number.isFinite(claims.nbf)||claims.nbf>now))||typeof claims.sub!=='string'){
    throw Error('ChatGPT identity could not be verified.');
  }
  const discovery=await readJson(issuer+'/.well-known/openid-configuration',fetchImpl);
  const jwks=new URL(discovery.jwks_uri);
  if(jwks.origin!==issuer||jwks.username||jwks.password)throw Error('Invalid ChatGPT identity key location.');
  const {keys}=await readJson(jwks.href,fetchImpl);
  const jwk=keys.find(key=>key.kid===header.kid&&key.kty==='RSA'&&(!key.use||key.use==='sig'));
  if(!jwk||!crypto.verify('RSA-SHA256',Buffer.from(headerEncoded+'.'+claimsEncoded),crypto.createPublicKey({key:jwk,format:'jwk'}),Buffer.from(signature,'base64url'))){
    throw Error('ChatGPT identity signature could not be verified.');
  }
  return {subject:claims.sub,email:typeof claims.email==='string'?claims.email:''};
}

async function tokenRequest(params,fetchImpl){
  return readJson(issuer+'/api/accounts/oauth/token',fetchImpl,{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({...params,resource})
  });
}

function credentials(data,previous){
  if(typeof data.access_token!=='string'||!data.access_token||!Number.isFinite(data.expires_in)||data.expires_in<=0)throw Error('Invalid ChatGPT access token.');
  const granted=typeof data.scope==='string'?data.scope:previous?.scope||'';
  if(!granted.split(/\s+/).includes('chatgpt.tokens.use.direct'))throw Error('ChatGPT plan permission was not granted.');
  const refreshToken=data.refresh_token||previous?.refreshToken;
  if(typeof refreshToken!=='string'||!refreshToken)throw Error('ChatGPT did not authorize session renewal.');
  return {accessToken:data.access_token, refreshToken, scope:granted, expires:Date.now()+data.expires_in*1000};
}

async function finishLogin(attempt,callback,fetchImpl=fetch){
  if(attempt.expires<=Date.now()||callback.get('state')!==attempt.state)throw Error('ChatGPT sign-in expired. Start again.');
  const code=callback.get('code'), issued=callback.get('client_id');
  const clientId=attempt.clientId||issued;
  if(!code||!clientId||clientId==='dynamic_agent_client'||(attempt.clientId&&issued&&issued!==attempt.clientId))throw Error('ChatGPT did not return a valid authorization.');
  const data=await tokenRequest({grant_type:'authorization_code',client_id:clientId,code,code_verifier:attempt.verifier,redirect_uri:attempt.redirectUri},fetchImpl);
  const identity=await verifyIdentity(data.id_token,clientId,attempt.nonce,fetchImpl);
  return {clientId,...identity,...credentials(data)};
}

async function refreshLogin(connection,fetchImpl=fetch){
  const data=await tokenRequest({grant_type:'refresh_token',client_id:connection.clientId,refresh_token:connection.refreshToken},fetchImpl);
  return {...connection,...credentials(data,connection)};
}
module.exports={beginLogin,finishLogin,refreshLogin};

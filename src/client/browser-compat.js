// randomUUID is restricted to secure contexts in some browsers. LAN HTTP
// still exposes getRandomValues, which provides cryptographic UUID entropy.
(function(){
 if(typeof globalThis.crypto?.randomUUID==='function')return;
 if(!globalThis.crypto?.getRandomValues)return;
 globalThis.crypto.randomUUID=function(){
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
 };
})();

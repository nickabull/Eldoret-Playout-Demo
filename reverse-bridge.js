/* Experimental reverse bridge: Donkey USB -> connector relay -> Mac playout. */
(()=>{'use strict';
const $=id=>document.getElementById(id),local='http://localhost:8765',bus=new BroadcastChannel('bullshits-mac-play-v1');
let session=null,device=null,prev=null,armed=false,receiver=false,pollTimer=null,epoch=0,busy=false;
const status=(id,msg)=>{$(id).textContent=msg};
const fragment=new URLSearchParams(location.hash.slice(1));
const isMac=fragment.get('role')==='mac';
$('donkey').hidden=isMac;$('mac').hidden=!isMac;
async function api(base,path,key,body,timeoutMs=2500){
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),timeoutMs);
 try{
  const response=await fetch(base+'/api/playout/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},body:JSON.stringify(body||{}),signal:ac.signal});
  const data=await response.json();if(!response.ok)throw Error(data.error||'HTTP '+response.status);return data;
 }finally{clearTimeout(timer)}
}
$('pair').onclick=async()=>{
 if(session)return;
 try{
  const relay=new URL($('relay').value.trim());if(relay.protocol!=='https:'||relay.username||relay.password)throw Error('Use an HTTPS relay URL');
  status('donkeyStatus','Creating session on Donkey connector…');
  const s=await api(local,'session');session={...s,relay:relay.origin};
  const u=new URL(location.href);u.hash=new URLSearchParams({role:'mac',relay:relay.origin,session:s.session,key:s.hostKey}).toString();
  $('link').value=u.href;$('linkArea').hidden=false;$('connect').disabled=false;$('end').disabled=false;$('pair').disabled=true;
  status('donkeyStatus','Paired. Open the private link on the Mac, then connect Airlite here.');
 }catch(e){status('donkeyStatus','Pairing failed: '+e.message)}
};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('link').value);status('donkeyStatus','Link copied. Open it on the Mac.')}catch{ $('link').select();status('donkeyStatus','Copy selected link manually.')}};
async function sendPlay(){
 if(!session||busy)return;busy=true;
 try{await api(local,session.session+'/command',session.controlKey,{id:crypto.randomUUID(),slot:0,bank:0,action:'start'});status('donkeyStatus','CH1 ON → PLAY sent at '+new Date().toLocaleTimeString())}
 catch(e){status('donkeyStatus','Command NOT confirmed: '+e.message+' (not retried)')}
 finally{busy=false}
}
function report(e){
 const bytes=Array.from(new Uint8Array(e.data.buffer,e.data.byteOffset,e.data.byteLength));
 if(bytes.length<10||bytes[0]!==10||![0xe0,0xa0].includes(bytes[1]))return;
 const state=bytes[2];if(state!==0&&state!==1)return;
 if(prev===null){prev=state;status('donkeyStatus','Airlite connected. CH1 baseline '+(state?'ON':'OFF')+'. Waiting for OFF → ON.');return}
 if(armed&&prev===0&&state===1)sendPlay();
 prev=state;
}
$('connect').onclick=async()=>{
 try{
  if(!navigator.hid)throw Error('WebHID unavailable: use Chrome on Donkey');
  const selected=await navigator.hid.requestDevice({filters:[{vendorId:0x0805,productId:0x1402}]});if(!selected.length)return;
  device=selected[0];await device.open();prev=null;armed=true;device.addEventListener('inputreport',report);$('connect').disabled=true;
  status('donkeyStatus','Airlite connected. Move CH1 OFF, then press ON when Mac receiver is ready.');
 }catch(e){status('donkeyStatus','Airlite: '+e.message)}
};
$('end').onclick=async()=>{
 armed=false;const old=session;session=null;prev=null;
 if(device){device.removeEventListener('inputreport',report);try{await device.close()}catch{}device=null}
 $('pair').disabled=false;$('connect').disabled=true;$('end').disabled=true;$('linkArea').hidden=true;
 try{if(old)await api(local,old.session+'/end',old.hostKey)}catch{}
 status('donkeyStatus','Test ended; audio on Mac is unaffected.');
};
async function poll(version){
 if(!receiver||version!==epoch)return;
 try{
  const s=window.bridgeConfig;
  const result=await api(s.relay,s.session+'/host',s.key,{bank:0,carts:[]},2500);
  if(!receiver||version!==epoch)return;
  for(const cmd of result.commands||[]){
   if(cmd.action==='start'&&cmd.slot===0&&cmd.bank===0){
    bus.postMessage({type:'play',id:cmd.id||crypto.randomUUID(),at:Date.now()});
    status('macStatus','CH1 command received → sent to Mac playout desk at '+new Date().toLocaleTimeString());
   }
  }
  if(!result.commands?.length)status('macStatus','RECEIVER CONNECTED · waiting for Airlite CH1 ON');
 }catch(e){if(receiver&&version===epoch)status('macStatus','Receiver error: '+e.message)}
 finally{if(receiver&&version===epoch)pollTimer=setTimeout(()=>poll(version),350)}
}
$('enable').onclick=()=>{
 try{
  const relay=new URL(fragment.get('relay')),sid=fragment.get('session'),key=fragment.get('key');
  if(relay.protocol!=='https:'||!/^[-_A-Za-z0-9]{12,40}$/.test(sid||'')||!/^[-_A-Za-z0-9]{40,80}$/.test(key||''))throw Error('Invalid pairing link');
  window.bridgeConfig={relay:relay.origin,session:sid,key};
  receiver=true;epoch++;$('enable').disabled=true;$('disable').disabled=false;poll(epoch);
 }catch(e){status('macStatus',e.message)}
};
$('disable').onclick=()=>{receiver=false;epoch++;clearTimeout(pollTimer);$('enable').disabled=false;$('disable').disabled=true;status('macStatus','Receiver stopped; Mac audio continues.')};
window.addEventListener('pagehide',()=>{receiver=false;epoch++;clearTimeout(pollTimer);armed=false});
})();
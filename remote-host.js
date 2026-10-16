/* Cart-only remote control. Donkey owns every audio player and hardware connection. */
(()=>{'use strict';
const panel=document.createElement('details');
panel.id='bullRemoteHost';
panel.style.cssText='position:fixed;left:12px;top:calc(var(--bull-nav-height,39px) + 9px);z-index:9999;max-width:min(430px,calc(100vw - 48px));background:#10263b;color:#eaf6ff;border:1px solid #5c93b4;border-radius:9px;padding:9px 12px;font:12px Arial;box-shadow:0 5px 18px #0008';
panel.innerHTML='<summary style="cursor:pointer;font-weight:bold">REMOTE CART CONTROL</summary><div style="max-height:65vh;overflow:auto"><p>On Donkey, load your carts and connect the Airlite. Enable hosting here, then open the pairing link on your laptop.</p><label>Laptop connection address<input id="remoteRelayUrl" type="url" value="https://penguin.tail22d29e.ts.net" style="display:block;width:95%;margin:6px 0;padding:7px"></label><p>The laptop must be able to reach this address through Tailscale. You can also enter your Eldoret HTTPS tunnel address.</p><button id="remoteHostStart" type="button">ENABLE ON DONKEY</button> <button id="remoteHostEnd" type="button" disabled>END PAIRING</button><p id="remoteHostStatus" role="status">Not hosting</p><div id="remotePairing" hidden><label>Open this private pairing link on your laptop<textarea id="remotePairingLink" readonly rows="3" style="display:block;width:95%;margin:7px 0"></textarea></label><button id="remoteCopyLink" type="button">COPY PAIRING LINK</button><p>Anyone with this temporary link can start and stop these three carts. END PAIRING revokes it.</p></div><p>This first version controls Carts 1–3 in Donkey’s selected bank. Keep Donkey’s playout tab open. Audio stays on Donkey if the laptop disconnects.</p></div>';
document.body.append(panel);
const $=id=>panel.querySelector('#'+id),status=$('remoteHostStatus');
const local='http://localhost:8765';let session=null,timer=null,working=false,generation=0;
async function request(path,key,body){
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),2000);
 try{
  const r=await fetch(local+'/api/playout/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},body:JSON.stringify(body||{}),signal:abort.signal});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Connection failed ('+r.status+')');return data;
 }finally{clearTimeout(timeout)}
}
async function tick(version){
 if(!session||version!==generation||working)return;
 working=true;const active=session,started=performance.now();
 try{
  const snapshot=window.bullRemoteCartSnapshot?.();if(!snapshot)throw Error('Cart player is not ready');
  const data=await request(active.session+'/host',active.hostKey,snapshot);
  if(session!==active||version!==generation)return;
  // Do not execute a response that was delayed beyond the command lifetime.
  if(performance.now()-started<=2000){
   for(const cmd of data.commands||[]){
    const current=window.bullRemoteCartSnapshot?.();
    if(cmd.bank!==current?.bank||!Number.isInteger(cmd.slot)||cmd.slot<0||cmd.slot>2)continue;
    if(cmd.action==='start')startCart(cmd.slot);
    if(cmd.action==='stop')stopCart(cmd.slot);
   }
  }
  status.textContent='HOSTING · Donkey owns audio · Bank '+(snapshot.bank+1)+' · '+new Date().toLocaleTimeString();
 }catch(err){
  if(session===active)status.textContent='Relay unavailable: '+err.message+'. Audio continues locally.';
 }finally{
  working=false;if(session&&version===generation)timer=setTimeout(()=>tick(version),400);
 }
}
$('remoteHostStart').onclick=async()=>{
 if(session)return;let relay;
 try{relay=new URL($('remoteRelayUrl').value.trim());if(relay.protocol!=='https:'||relay.username||relay.password)throw Error();}catch{status.textContent='Enter an HTTPS address reachable from the laptop.';return}
 $('remoteHostStart').disabled=true;status.textContent='Connecting to Donkey’s local Eldoret connector…';
 try{
  await window.bullResumeAudio?.();
  const created=await request('session');session=created;generation++;
  const target=new URL('controller.html',location.href);target.hash=new URLSearchParams({relay:relay.origin,session:created.session,key:created.controlKey}).toString();
  $('remotePairingLink').value=target.href;$('remotePairing').hidden=false;$('remoteHostEnd').disabled=false;
  $('remoteRelayUrl').disabled=true;tick(generation);
 }catch(err){status.textContent='Could not enable hosting: '+err.message+'. Donkey needs the updated Eldoret connector running on port 8765.';$('remoteHostStart').disabled=false;}
};
$('remoteHostEnd').onclick=async()=>{
 const old=session;session=null;generation++;clearTimeout(timer);
 $('remotePairingLink').value='';$('remotePairing').hidden=true;$('remoteHostEnd').disabled=true;$('remoteHostStart').disabled=false;$('remoteRelayUrl').disabled=false;
 try{if(old)await request(old.session+'/end',old.hostKey);status.textContent='Pairing ended. Local audio continues.';}catch{status.textContent='Hosting stopped. Link expires after five minutes without Donkey. Local audio continues.';}
};
$('remoteCopyLink').onclick=async()=>{try{await navigator.clipboard.writeText($('remotePairingLink').value);status.textContent='Pairing link copied—open it on your laptop';}catch{$('remotePairingLink').focus();$('remotePairingLink').select();status.textContent='Select and copy the pairing link above';}};
})();

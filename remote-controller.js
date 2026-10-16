(()=>{'use strict';
const $=id=>document.getElementById(id);let config=null,timer=null,busy=false,online=false,state=null,lastReceipt=0,generation=0;
const mm=s=>String(Math.floor(Math.max(0,s)/60)).padStart(2,'0')+':'+String(Math.floor(Math.max(0,s)%60)).padStart(2,'0');
for(let slot=0;slot<3;slot++){
 const card=document.createElement('section');card.className='cart';card.id='cart'+slot;
 card.innerHTML='<div class="label">SONIFEX · CART '+(slot+1)+'</div><h2 class="title">Waiting for Donkey</h2><p class="artist">—</p><div class="timer">--:--</div><div class="state">OFFLINE</div><div class="transport"><button class="play" disabled>▶ PLAY</button><button class="stop" disabled>■ STOP</button></div>';
 card.querySelector('.play').onclick=()=>command(slot,'start');card.querySelector('.stop').onclick=()=>command(slot,'stop');$('carts').append(card);
}
function paint(){
 const live=online&&performance.now()-lastReceipt<3000;
 $('connection').textContent=live?'CONNECTED TO DONKEY':'DONKEY OFFLINE';$('connection').classList.toggle('online',live);
 $('bank').textContent=state?'Donkey’s selected bank: '+(state.bank+1):'Waiting for Donkey’s selected bank';
 for(let slot=0;slot<3;slot++){
  const data=state?.carts?.[slot],card=$('cart'+slot),playing=live&&!!data?.playing;
  card.classList.toggle('playing',playing);card.querySelector('.title').textContent=data?.title||'Empty cart';card.querySelector('.artist').textContent=data?.artist||'—';
  card.querySelector('.timer').textContent=live&&data?.loaded?mm(Math.max(0,data.duration-data.position)):'--:--';
  card.querySelector('.state').textContent=!live?'OFFLINE · LAST KNOWN STATE':playing?'PLAYING ON DONKEY':data?.loaded?'READY ON DONKEY':'LOAD AUDIO ON DONKEY';
  const play=card.querySelector('.play'),stop=card.querySelector('.stop');play.disabled=busy||!live||!data?.loaded||playing;stop.disabled=busy||!live||!data?.loaded;
  play.classList.toggle('active',playing);stop.classList.toggle('active',live&&!!data?.loaded&&!playing);
 }
}
function parsePairing(fragment){
 const p=new URLSearchParams(fragment.replace(/^#/,'')),relay=new URL(p.get('relay'));
 if(relay.protocol!=='https:'||relay.username||relay.password||!/^[-_A-Za-z0-9]{12,40}$/.test(p.get('session')||'')||!/^[-_A-Za-z0-9]{40,80}$/.test(p.get('key')||''))throw Error('Invalid pairing link');
 return {relay:relay.origin,session:p.get('session'),key:p.get('key')};
}
async function request(action,body){
 const current=config,abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),2000);
 try{const r=await fetch(current.relay+'/api/playout/'+current.session+'/'+action,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+current.key,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:abort.signal});const data=await r.json();if(!r.ok)throw Error(data.error||'Connection failed ('+r.status+')');return data;}finally{clearTimeout(timeout)}
}
async function poll(version){
 if(!config||version!==generation)return;
 try{const data=await request('state');if(version!==generation)return;state=data.state;online=data.online===true;lastReceipt=performance.now();$('message').textContent=online?'':'Donkey is not reporting. Check its playout tab and connection.';}
 catch(err){if(version===generation){online=false;$('message').textContent='Cannot reach Donkey: '+err.message+'. Check Tailscale or the connection address.';}}
 finally{if(version===generation){paint();timer=setTimeout(()=>poll(version),500);}}
}
async function command(slot,action){
 if(busy||!online||!state||performance.now()-lastReceipt>=3000)return;
 busy=true;paint();$('message').textContent='Sending '+action.toUpperCase()+' to Donkey…';
 try{await request('command',{id:crypto.randomUUID(),slot,bank:state.bank,action});$('message').textContent='Command sent—waiting for Donkey’s playback status';}
 catch(err){$('message').textContent='Command not confirmed: '+err.message+'. It will not be retried.';}
 finally{busy=false;paint();}
}
function connect(fragment){try{config=parsePairing(fragment);generation++;clearTimeout(timer);online=false;state=null;$('setup').hidden=true;paint();poll(generation);}catch(err){$('message').textContent=err.message;}}
$('pair').onclick=()=>{try{const u=new URL($('pairLink').value.trim());if(u.origin!==location.origin)throw Error('Use the pairing link from this playout website');connect(u.hash);}catch(err){$('message').textContent=err.message;}};
setInterval(paint,500);if(location.hash)connect(location.hash);else paint();
})();

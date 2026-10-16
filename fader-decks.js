/* Opt-in CH4/CH5 transport. Audio remains on the existing routed A/B elements. */
(()=>{'use strict';
let enabled=false,armed=false;
const used=new Set(),positions=[null,null];
const slots=[A,B].map((audio,i)=>({audio,name:i?'B':'A',item:null,version:0,starting:false,ready:Promise.resolve(),error:''}));
const panel=document.createElement('section');
panel.className='panel';panel.hidden=true;panel.id='faderDeckTransport';
panel.innerHTML='<h3>FADER DECKS · CH4 / CH5</h3><p>Raise to play. Lower to stop and load the next available item. Each deck reserves its own item.</p><div id="faderDeckStatus" role="status"></div><div class="actions"><button id="faderLoadA">LOAD SELECTED → A</button> <button id="faderLoadB">LOAD SELECTED → B</button> <button id="faderRefill">LOAD EMPTY DECKS</button></div>';
// Keep optional transport controls outside the fixed three-row studio grid.
panel.style.cssText='position:fixed;left:12px;bottom:64px;z-index:9999;width:min(460px,calc(100vw - 24px));max-height:50vh;overflow:auto;padding:12px;background:#10263b';
document.body.append(panel);
const options=document.createElement('button');
options.id='faderOptionsToggle';options.type='button';options.hidden=true;
options.textContent='FADER OPTIONS';options.setAttribute('aria-controls',panel.id);
options.setAttribute('aria-expanded','false');
document.querySelector('.scheduleBox .toolbar').append(options);
function showOptions(show){panel.hidden=!show;options.setAttribute('aria-expanded',String(show))}
options.onclick=()=>showOptions(panel.hidden);
const close=document.createElement('button');close.type='button';close.textContent='CLOSE';
close.onclick=()=>showOptions(false);panel.prepend(close);
document.addEventListener('keydown',e=>{if(e.key==='Escape')showOptions(false)});
const message=text=>{document.getElementById('faderDeckStatus').textContent=text};
function available(){return log.find(x=>x.url&&!used.has(x.id)&&!slots.some(s=>s.item?.id===x.id))||null}
function stopped(s){return s.audio.paused&&!s.starting}
function logEvent(kind,s){if(s.item)window.bullLog?.(kind,{fader:s.name,title:s.item.title,artist:s.item.artist||'',duration:s.item.dur||0,source:'MAIN'})}
function repaint(){if(enabled)render()}
function load(s,item){
 const version=++s.version;s.starting=false;s.error='';s.item=item;
 s.audio.pause();s.audio.removeAttribute('src');s.audio.load();
 s.ready=(async()=>{
  if(!item)return;
  try{
   const url=item.url||await window.bullCachedAudio?.(item);
   if(s.version!==version)return;
   if(!url)throw Error('Import playable audio for '+item.title);
   s.audio.src=url;s.audio.volume=1;s.audio.preload='auto';s.audio.load();
   s.audio.currentTime=typeof markersOf==='function'?(markersOf(item).start||0):(item.cue||0);
  }catch(err){if(s.version===version)s.error=err.message}
  if(s.version===version)repaint();
 })();
 repaint();return s.ready;
}
function refill(){for(const s of slots)if(!s.item)load(s,available());repaint()}
window.bullFaderQueueAdded=item=>{
 if(!enabled||!item?.url)return false;
 if(slots.some(s=>s.item?.id===item.id))return true;
 // Reserve free decks without touching an on-air or already prepared item.
 const free=slots.find(s=>!s.item&&stopped(s));
 if(free){load(free,item);message('Deck '+free.name+' READY: '+item.title);return true}
 message('Queued '+item.title+' · both decks occupied; loads when a deck is freed');
 return true;
};

async function playSlot(s){
 if(!s.item||!stopped(s))return;
 const item=s.item,version=s.version;s.starting=true;
 try{
  await s.ready;if(version!==s.version)return;
  if(s.error)throw Error(s.error);
  if(!log.some(x=>x.id===item.id))throw Error('Item removed from running order; load another item');
  await window.bullResumeAudio?.();if(version!==s.version)return;
  window.bullApplyCutLevel?.(s.audio,item);await s.audio.play();if(version!==s.version)return;
  used.add(item.id);deck=s.audio;play=log.findIndex(x=>x.id===item.id);
  logEvent('PLAY',s);message('Deck '+s.name+' playing '+item.title);
 }catch(err){if(version===s.version){s.error=err.message;message('Deck '+s.name+': '+err.message)}}
 finally{if(version===s.version){s.starting=false;repaint()}}
}
function stopAndNext(s,kind='STOP'){
 // Repeated down reports and an initial down state cannot consume queued items.
 if(!s.item||stopped(s)&&!used.has(s.item.id))return;
 const old=s.item;s.version++;s.audio.pause();s.starting=false;used.add(old.id);
 logEvent(kind,s);s.item=null;
 if(deck===s.audio){const other=slots.find(x=>x!==s&&!x.audio.paused);if(other){deck=other.audio;play=log.findIndex(x=>x.id===other.item?.id)}else play=-1}
 load(s,available());
 message('Deck '+s.name+' stopped · '+(s.item?'READY: '+s.item.title:'end of running order'));
}
window.bullFaderMode=()=>enabled;
window.bullFaderNowPlaying=()=>{if(!enabled)return null;const s=slots.find(s=>s.audio===deck&&!s.audio.paused&&!s.audio.ended)||slots.find(s=>!s.audio.paused&&!s.audio.ended);return s?{audio:s.audio,title:s.item?.title||'',artist:s.item?.artist||''}:null};
window.bullFaderDeckRender=()=>{
 if(!enabled)return false;
 for(let i=0;i<slots.length;i++){
  const s=slots[i],prefix=i?'next':'now',item=s.item,playing=!s.audio.paused&&!s.audio.ended;
  document.getElementById(prefix+'Title').textContent=item?.title||'Empty deck';
  document.getElementById(prefix+'Artist').textContent=item?.artist||'Add playable audio to the running order';
  const head=document.querySelector('.deckhead .'+(i?'next':'now'));
  head.textContent='DECK '+s.name+' · CH'+(i+4)+' · '+(s.error?'ERROR':playing?'PLAYING':s.starting?'STARTING':item?'READY':'EMPTY');
  const duration=Number.isFinite(s.audio.duration)?s.audio.duration:(item?.dur||0);
  const left=mm(Math.max(0,duration-(s.audio.currentTime||0)));
  document.getElementById(i?'nextStart':'remain').textContent=item?left:'00:00';
  if(!i){document.getElementById('nowCue').textContent=s.error||'Elapsed '+mm(s.audio.currentTime||0);document.getElementById('nowSegue').textContent=armed?'FADER CONTROL ARMED':'FADERS DISARMED'}
  else{document.getElementById('nextDuration').textContent=item?mm(item.dur||0):'00:00';document.getElementById('nextType').textContent=s.error||'Raise CH5 to start'}
 }
 document.querySelectorAll('#schedule .row').forEach(row=>{const live=slots.some(s=>s.item?.id===row.dataset.id&&!s.audio.paused);row.classList.toggle('playing',live)});
 return true;
};
window.bullFaderArm=async value=>{
 armed=false;positions.fill(null);
 if(!value){repaint();return}
 await window.bullResumeAudio?.();
 if(!enabled){
  enabled=true;options.hidden=false;document.getElementById('mode').value='ASSIST';
  // Adopt a running legacy deck instead of stopping or replacing it on arming.
  const current=log[play];
  if(current&&(!deck.paused||deck.currentTime>0)){
   const s=slots.find(s=>s.audio===deck);s.item=current;
   for(let i=0;i<=play;i++)if(log[i])used.add(log[i].id);
  }
 }
 armed=true;refill();message('Faders armed · lower both faders once to establish their down positions, then raise to play');
};
window.bullFaderSignal=bytes=>{
 if(!armed||bytes.length!==10||bytes[0]!==10||bytes[1]!==0xea)return;
 for(let i=0;i<2;i++){
  const value=bytes[i+5];if(value!==0&&value!==1)continue;
  const previous=positions[i];positions[i]=value;if(previous===value)continue;
  if(value===1&&previous===0)playSlot(slots[i]);else if(value===0&&previous===1)stopAndNext(slots[i]);
 }
};
window.bullFaderPlayNext=()=>{const next=slots.filter(stopped).filter(s=>s.item).sort((a,b)=>log.indexOf(a.item)-log.indexOf(b.item))[0];if(next)return playSlot(next);refill()};
window.bullFaderPlayItem=async i=>{
 const item=log[i];if(!item)return;
 const existing=slots.find(s=>s.item?.id===item.id);
 if(existing)return playSlot(existing);
 const target=slots.find(s=>stopped(s));
 if(!target){message('Both decks are playing. Lower a fader to free a deck.');return}
 if(!item.url){message('Import playable audio for '+item.title);return}
 await load(target,item);return playSlot(target);
};
window.bullFaderStopAll=()=>{for(const s of slots)stopAndNext(s);repaint()};
for(const s of slots){
 s.audio.addEventListener('timeupdate',()=>window.bullFaderDeckRender());
 s.audio.addEventListener('loadedmetadata',()=>window.bullFaderDeckRender());
 s.audio.addEventListener('ended',()=>{if(enabled)stopAndNext(s,'ENDED')});
 s.audio.addEventListener('error',()=>{if(enabled&&s.item&&s.audio.error){s.error='Audio unavailable — re-import '+s.item.title;message(s.error);repaint()}});
 document.getElementById('faderLoad'+s.name).onclick=()=>{
  if(!stopped(s)){message('Stop Deck '+s.name+' before replacing its item');return}
  const item=log.find(x=>x.id===sel);
  if(!item?.url){message('Select playable audio in the running order first');return}
  if(slots.some(x=>x!==s&&x.item?.id===item.id)){message('That item is already reserved on the other deck');return}
  used.delete(item.id);load(s,item);message('Deck '+s.name+' ready: '+item.title);
 };
}
document.getElementById('faderRefill').onclick=refill;
})();


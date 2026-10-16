/* Fader C hotbox - independent browser preview channel, v0.5.2 */
(()=>{
 const panel=document.getElementById('hotbox');if(!panel)return;
 const audio=new Audio();audio.preload='auto';window.eldoretMeterRegister?.(audio);
 let loaded=null,playing=false;
 const name=document.getElementById('hotTitle'),detail=document.getElementById('hotDetail'),playBtn=document.getElementById('hotPlay'),stopBtn=document.getElementById('hotStop'),clearBtn=document.getElementById('hotClear');
 function state(){name.textContent=loaded?.title||'Drop audio here';detail.textContent=loaded?(loaded.artist||'')+(loaded.url?' · READY':' · AUDIO MISSING'):'From library, playlist or Fader D carts';playBtn.disabled=!loaded?.url;playBtn.textContent=playing?'❚❚ PAUSE':'▶ PLAY';panel.classList.toggle('hotPlaying',playing)}
 function load(x){if(!x)return;audio.pause();playing=false;loaded={...x,title:x.title||x.name||'Untitled',artist:x.artist||'',url:x.url||null,start:x.markers?.start??x.cue??0};audio.removeAttribute('src');if(loaded.url){audio.src=loaded.url;audio.load()}state()}
 function fromDrop(e){
  const spotify=e.dataTransfer.getData('application/x-eldoret-spotify');
  if(spotify){toast('Spotify reference has no playable audio. Import the file first.');return null}
  const row=e.dataTransfer.getData('application/x-eldoret-row');
  if(row!==''){const i=Number(row);if(Number.isInteger(i)&&log[i])return log[i]}
  const id=e.dataTransfer.getData('text/plain');
  if(id){const x=lib.find(v=>v.id===id);if(x)return x}
  return null;
 }
 panel.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';panel.classList.add('hotOver')});
 panel.addEventListener('dragleave',e=>{if(!panel.contains(e.relatedTarget))panel.classList.remove('hotOver')});
 panel.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();panel.classList.remove('hotOver');const x=fromDrop(e);if(x)load(x);else toast('Drag playable audio from library, playlist or carts')});
 async function startHotbox(){
 if(!loaded?.url||playing||!audio.paused)return;
 try{
  if(audio.ended||audio.currentTime>=audio.duration)audio.currentTime=loaded.start||0;
  window.bullApplyCutLevel?.(audio,loaded);
  await window.bullResumeAudio?.();
  await audio.play();playing=true;state();
  window.bullLog?.('PLAY',{fader:'C',title:loaded.title,artist:loaded.artist||'',source:'HOTBOX'});
 }catch(e){toast('Hotbox play failed: '+e.message)}
}
function stopHotbox(){
 if(!loaded)return;
 const wasPlaying=!audio.paused;
 audio.pause();audio.currentTime=loaded.start||0;playing=false;state();
 if(wasPlaying)window.bullLog?.('STOP',{fader:'C',title:loaded.title,artist:loaded.artist||'',source:'HOTBOX'});
}
playBtn.onclick=startHotbox;
 stopBtn.onclick=stopHotbox;
 clearBtn.onclick=()=>{audio.pause();audio.removeAttribute('src');audio.load();loaded=null;playing=false;state()};
 audio.onended=()=>{playing=false;state()};
let faderCPosition=null,faderCArmed=false;
window.bullHotboxArm=value=>{faderCArmed=!!value;faderCPosition=null};
window.bullHotboxFaderSignal=bytes=>{
 if(!faderCArmed||bytes.length!==10||bytes[0]!==10||bytes[1]!==0xea)return;
 const value=bytes[7];if(value!==0&&value!==1)return;
 const before=faderCPosition;faderCPosition=value;
 if(before===null||before===value)return;
 if(value===1)startHotbox();else stopHotbox();
};
window.bullHotboxStart=startHotbox;
window.bullHotboxStop=stopHotbox;
 const carts=document.getElementById('carts');
 function makeCartsDraggable(){carts.querySelectorAll('.cart').forEach(b=>{b.draggable=true;b.title='Drag to Fader C hotbox';b.addEventListener('dragstart',e=>{const slot=Number(b.dataset.slot),cfg=cartBanks[activeBank]?.[slot],src=cfg&&lib.find(x=>x.id===cfg.libId);if(!src){e.preventDefault();return}e.dataTransfer.setData('text/plain',src.id);e.dataTransfer.effectAllowed='copy'})})}
 const observer=new MutationObserver(makeCartsDraggable);observer.observe(carts,{childList:true});makeCartsDraggable();
 state();
})();


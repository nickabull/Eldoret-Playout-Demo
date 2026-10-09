/* Fader C hotbox - independent browser preview channel, v0.5.2 */
(()=>{
 const panel=document.getElementById('hotbox');if(!panel)return;
 const audio=new Audio();audio.preload='auto';window.eldoretMeterRegister?.(audio);
 let loaded=null,playing=false;
 const name=document.getElementById('hotTitle'),detail=document.getElementById('hotDetail'),playBtn=document.getElementById('hotPlay'),stopBtn=document.getElementById('hotStop'),clearBtn=document.getElementById('hotClear');
 function state(){name.textContent=loaded?.title||'Drop audio here';detail.textContent=loaded?(loaded.artist||'')+(loaded.url?' · READY':' · AUDIO MISSING'):'From library, playlist or Fader D carts';playBtn.disabled=!loaded?.url;playBtn.textContent=playing?'❚❚ PAUSE':'▶ PLAY';panel.classList.toggle('hotPlaying',playing)}
 function load(x){if(!x)return;audio.pause();playing=false;loaded={title:x.title||x.name||'Untitled',artist:x.artist||'',url:x.url||null,start:x.markers?.start??x.cue??0};audio.removeAttribute('src');if(loaded.url){audio.src=loaded.url;audio.load()}state()}
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
 playBtn.onclick=async()=>{if(!loaded?.url)return;if(playing){audio.pause();playing=false;state();return}try{if(audio.ended||audio.currentTime>=audio.duration)audio.currentTime=loaded.start||0;await audio.play();playing=true;state()}catch{toast('Could not play this audio')}};
 stopBtn.onclick=()=>{audio.pause();if(loaded?.url)audio.currentTime=loaded.start||0;playing=false;state()};
 clearBtn.onclick=()=>{audio.pause();audio.removeAttribute('src');audio.load();loaded=null;playing=false;state()};
 audio.onended=()=>{playing=false;state()};
 const carts=document.getElementById('carts');
 function makeCartsDraggable(){carts.querySelectorAll('.cart').forEach(b=>{b.draggable=true;b.title='Drag to Fader C hotbox';b.addEventListener('dragstart',e=>{const slot=Number(b.dataset.slot),cfg=cartBanks[activeBank]?.[slot],src=cfg&&lib.find(x=>x.id===cfg.libId);if(!src){e.preventDefault();return}e.dataTransfer.setData('text/plain',src.id);e.dataTransfer.effectAllowed='copy'})})}
 const observer=new MutationObserver(makeCartsDraggable);observer.observe(carts,{childList:true});makeCartsDraggable();
 state();
})();

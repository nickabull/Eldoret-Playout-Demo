/* Actual playback events, independent source sessions and cross-tab Now Playing. */
(()=>{'use strict';
const KEY='bullshits-playout-events-v1',NOW='bullshits-now-playing-v1',CFG='bullshits-now-playing-config-v1',ACTIVE='bullshits-active-plays-v1';
const active={};
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}}
function rights(artist,title){const norm=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' '),card=read('bullshits-cut-cards-v1',{})[norm(artist)+'|'+norm(title)]||{};return Object.fromEntries(['isrc','iswc','label','writers','publisher','album','year','version','mbid'].map(k=>[k,card[k]||'']))}
function broadcast(state,webhook=true){try{localStorage.setItem(NOW,JSON.stringify(state));window.dispatchEvent(new Event('bull-now-playing'))}catch(e){console.error('Now Playing storage failed',e)}const cfg=read(CFG,{});if(webhook&&cfg.enabled&&/^https:\/\//i.test(cfg.url||''))fetch(cfg.url,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(state),keepalive:true}).catch(e=>console.warn('Metadata delivery failed',e))}
function publish(at,webhook=true){const latest=Object.values(active).sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt)).at(0);broadcast(latest?{schema:'bullshits.nowplaying.v1',...latest,status:'PLAYING',updatedAt:at}:{schema:'bullshits.nowplaying.v1',status:'OFF AIR',updatedAt:at},webhook)}
window.bullLog=(kind,details={})=>{
 const at=new Date().toISOString(),channel=details.channelId||details.fader||'',started=active[channel];
 if(kind==='PLAY'){
  details={...rights(details.artist,details.title),...details};
  active[channel]={...details,playId:details.playId||crypto.randomUUID(),startedAt:at,durationSeconds:Number(details.duration)||0,positionSeconds:Number(details.positionSeconds)||0,positionAt:at};
  details={...details,playId:active[channel].playId,startedAt:at};
 }else if(kind==='STOP'||kind==='ENDED'){
  if(started){const ms=Number.isFinite(details.playedMilliseconds)?details.playedMilliseconds:Math.max(0,Date.now()-Date.parse(started.startedAt));details={...started,...details,endedAt:at,playedMilliseconds:Math.round(ms),playedSeconds:Math.round(ms/1000)};delete active[channel]}
 }
 const event={...details,id:crypto.randomUUID(),at,kind};
 try{const events=read(KEY,[]);events.push(event);localStorage.setItem(KEY,JSON.stringify(events.slice(-5000)));localStorage.setItem(ACTIVE,JSON.stringify(active))}catch(e){console.error('As-run log could not be saved',e);const status=document.getElementById('status');if(status)status.textContent='LOG SAVE FAILED: '+e.message}
 if(kind==='PLAY'||kind==='STOP'||kind==='ENDED')publish(at);
 return event;
};
// Connect only programme players. Cue/preview players are deliberately excluded.
window.bullTrackPlayback=(audio,getDetails)=>{
 let session=null,segment=null,total=0;
 const details=()=>typeof getDetails==='function'?getDetails():getDetails;
 function accumulate(){if(segment!==null){total+=Math.max(0,performance.now()-segment);segment=null}}
 function finish(kind){if(!session)return;accumulate();window.bullLog(kind,{...session,playedMilliseconds:total,positionSeconds:audio.currentTime});session=null;total=0}
 audio.addEventListener('playing',()=>{if(!session){session={...details(),playId:crypto.randomUUID(),duration:Number.isFinite(audio.duration)?audio.duration:details().duration,positionSeconds:audio.currentTime};window.bullLog('PLAY',session)}if(segment===null)segment=performance.now()});
 window.addEventListener('pagehide',()=>finish('STOP'));
 audio.addEventListener('waiting',accumulate);
 audio.addEventListener('pause',()=>finish(audio.ended?'ENDED':'STOP'));
 audio.addEventListener('ended',()=>finish('ENDED'));
 audio.addEventListener('error',()=>{finish('STOP');window.bullLog('FAILED',{...details(),reason:audio.error?.message||'Audio playback error'})});
 audio.addEventListener('timeupdate',()=>{if(!session)return;const key=session.channelId||session.fader;if(active[key]?.playId===session.playId){active[key].positionSeconds=audio.currentTime;active[key].positionAt=new Date().toISOString();publish(active[key].positionAt,false)}});
};
for(const [id,fader] of [['deckA','A'],['deckB','B']]){const audio=document.getElementById(id);if(!audio)continue;const ended=()=>{if(active[fader])window.bullLog(audio.ended?'ENDED':'STOP',{fader})};audio.addEventListener('pause',ended);audio.addEventListener('ended',ended)}
window.addEventListener('pagehide',()=>{for(const [channelId,session] of Object.entries(active))window.bullLog('STOP',{...session,channelId,reason:'Playout page closed'})});
publish(new Date().toISOString(),false);
})();

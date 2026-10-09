/* Bull'sHits audit and Now Playing: local cross-tab metadata and optional webhook. */
(()=>{const KEY='bullshits-playout-events-v1',NOW='bullshits-now-playing-v1',CFG='bullshits-now-playing-config-v1';
const broadcast=(state)=>{try{localStorage.setItem(NOW,JSON.stringify(state));}catch(e){console.warn('Now Playing unavailable',e)}
let cfg={};try{cfg=JSON.parse(localStorage.getItem(CFG)||'{}')}catch{}
if(cfg.enabled&&cfg.url&&/^https:\/\//i.test(cfg.url)){fetch(cfg.url,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(state),keepalive:true}).catch(e=>console.warn('Now Playing webhook failed (check CORS / endpoint):',e));}
};
window.bullLog=(kind,details={})=>{const event={id:crypto.randomUUID(),at:new Date().toISOString(),kind,...details};try{const events=JSON.parse(localStorage.getItem(KEY)||'[]');events.push(event);localStorage.setItem(KEY,JSON.stringify(events.slice(-5000)))}catch(e){console.warn('Audit unavailable',e)}
try{const prev=JSON.parse(localStorage.getItem(NOW)||'null');const fader=details.fader||'';
if(kind==='PLAY'){broadcast({schema:'bullshits.nowplaying.v1',status:'PLAYING',title:details.title||'Untitled',artist:details.artist||'',startedAt:event.at,fader,source:details.source||'',durationSeconds:details.duration||0,updatedAt:event.at})}
else if((kind==='STOP'||kind==='ENDED')&&prev&&prev.status==='PLAYING'&&(prev.fader===fader||fader==='A/B'&&['A','B'].includes(prev.fader))){broadcast({...prev,status:'OFF AIR',updatedAt:event.at})}
}catch(e){console.warn('Now Playing update failed',e)}
};})();
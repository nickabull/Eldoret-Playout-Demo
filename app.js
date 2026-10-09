const $=x=>document.getElementById(x);
let lib=[],log=[],sel=null,play=-1;
const A=$('deckA'),B=$('deckB');let deck=A;
let activeBank=0, editingCart=null;
const BANKS=4,SLOTS=16;
let cartView='machines';
const defaultColors=['#cb3b3b','#2466be','#d4831a','#209c58','#7c4dc2','#4a5c70'];
let cartBanks=JSON.parse(localStorage.getItem('eldoret-cart-banks')||'null')||Array.from({length:BANKS},()=>Array.from({length:SLOTS},()=>null));
const cartPlayers={};
let cartCountDown=true;

const mm=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0');
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\([^)]*\)|\[[^\]]*\]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function matchAudio(x){
 const title=norm(x.title),artist=norm(x.artist);
 return lib.find(y=>norm(y.title)===title&&(norm(y.artist)===artist||norm(y.artist)==='imported audio'||!artist))||null;
}
function linkSpotifyAudio(){
 let linked=0;
 log.filter(x=>x.source==='spotify-reference'&&!x.url).forEach(x=>{const hit=matchAudio(x);if(hit){x.url=hit.url;x.audioMissing=false;x.localAudioId=hit.id;linked++}});
 if(linked){render();toast(linked+' Spotify reference(s) linked to local audio')}
}
const saveCarts=()=>localStorage.setItem('eldoret-cart-banks',JSON.stringify(cartBanks));
function row(x,i){const d=document.createElement('div');d.className='row '+x.type+(i===play?' playing':'')+(x.id===sel?' selected':'');d.draggable=true;d.innerHTML='<div>'+(i===play?'▶':i+1)+'</div><div>--:--</div><div><span class="pill '+x.type+'">'+x.type.toUpperCase()+'</span></div><div><b>'+x.title+'</b><br><small>'+x.artist+'</small></div><div>'+mm(x.dur)+'</div><div>'+mm(x.intro)+'</div><div>'+mm(x.segue||0)+'</div><div>--:--</div>';d.onclick=()=>{sel=x.id;render();edit()};d.dataset.id=x.id;d.ondragstart=e=>{window.drag=i;e.dataTransfer.setData('application/x-eldoret-row',String(i))};d.ondragover=e=>{e.preventDefault()};d.ondrop=e=>{const raw=e.dataTransfer.getData('application/x-eldoret-spotify');if(raw){e.preventDefault();e.stopPropagation();try{addSpotifyReference(JSON.parse(raw),i)}catch{}return}e.preventDefault();e.stopPropagation();if(Number.isInteger(window.drag)){const [m]=log.splice(window.drag,1);log.splice(i,0,m);render()}};return d}
function render(){const r=$('schedule');r.innerHTML='';log.forEach((x,i)=>r.appendChild(row(x,i)));const p=log[play],n=log[play<0?0:play+1];$('nowTitle').textContent=p?.title||'Stopped';$('nowArtist').textContent=p?.artist||'Import audio to begin';$('nextTitle').textContent=n?.title||'Nothing queued';$('nextArtist').textContent=n?.artist||'—';$('nextDuration').textContent=n?mm(n.dur):'00:00'}
function edit(){const x=log.find(v=>v.id===sel);$('emptyEditor').hidden=!!x;$('editorForm').hidden=!x;if(!x)return;$('eTitle').value=x.title;$('eArtist').value=x.artist;$('eDur').value=mm(x.dur);$('eType').value=x.type;$('eIntro').value=mm(x.intro);$('eCue').value=mm(x.cue);$('eSegue').value=mm(x.segue||0);$('eFade').value=mm(x.fade);$('eFixed').value=x.fixed||''}
function parse(t){const p=t.split(':').map(Number);return (p[0]||0)*60+(p[1]||0)}
function update(){const x=log.find(v=>v.id===sel);if(!x)return;x.title=$('eTitle').value;x.artist=$('eArtist').value;x.dur=parse($('eDur').value);x.type=$('eType').value;x.intro=parse($('eIntro').value);x.cue=parse($('eCue').value);x.segue=parse($('eSegue').value);x.fade=parse($('eFade').value);x.fixed=$('eFixed').value;render()}
['eTitle','eArtist','eDur','eType','eIntro','eCue','eSegue','eFade','eFixed'].forEach(id=>$(id).oninput=update);

$('audioFiles').onchange=e=>[...e.target.files].forEach(f=>{const u=URL.createObjectURL(f),a=new Audio(u);a.onloadedmetadata=()=>{const n=f.name.replace(/\.[^.]+$/,''),p=n.split(' - '),artist=p.length>1?p.shift():'Imported audio',title=p.length?p.join(' - '):n;lib.push({id:crypto.randomUUID(),title,artist,dur:a.duration,url:u});library();renderCarts();linkSpotifyAudio()}});
function library(){const q=$('search').value.toLowerCase(),r=$('library');r.innerHTML='';lib.filter(x=>(x.title+' '+x.artist).toLowerCase().includes(q)).forEach(x=>{const d=document.createElement('div');d.className='librow';d.draggable=true;d.dataset.libid=x.id;d.innerHTML='<span><b>'+x.title+'</b><br><small>'+x.artist+'</small></span><span>'+mm(x.dur)+'</span><button>+</button>';d.ondragstart=e=>e.dataTransfer.setData('text/plain',x.id);d.querySelector('button').onclick=()=>{const n={...x,id:crypto.randomUUID(),intro:0,cue:0,segue:Math.max(0,x.dur-5),fade:2,type:'auto',fixed:''};log.push(n);sel=n.id;render();edit()};r.appendChild(d)})}
$('search').oninput=library;

async function start(i){const x=log[i];if(!x)return;if(!x.url){window.bullLog?.('FAILED',{fader:'A/B',title:x.title,reason:'Missing playable audio'});$('status').textContent='AUDIO MISSING — import a local file for '+x.title;toast('Spotify reference only — import a playable audio file');return}const to=deck===A?B:A;to.src=x.url;to.currentTime=x.cue||0;try{await to.play()}catch(e){window.bullLog?.('FAILED',{fader:to===A?'A':'B',title:x.title,reason:e.message});toast('Playback failed: '+e.message);return}window.bullLog?.('PLAY',{fader:to===A?'A':'B',title:x.title,artist:x.artist||'',duration:x.dur||0,source:'MAIN'});deck.pause();deck=to;play=i;$('status').textContent='Playing '+x.title;render()}
$('playBtn').onclick=()=>{let i=log.findIndex(x=>x.id===sel);if(i<0)i=0;start(i)};
$('nextBtn').onclick=()=>start(play<0?0:play+1);
$('stopBtn').onclick=()=>{window.bullLog?.('STOP',{fader:deck===A?'A':'B',source:'MAIN'});A.pause();B.pause();play=-1;$('status').textContent='Stopped';render()};
$('addBlank').onclick=()=>{const n={id:crypto.randomUUID(),title:'New Item',artist:'',dur:60,intro:0,cue:0,segue:0,fade:2,type:'manual',fixed:'',url:null};log.push(n);sel=n.id;render();edit()};
$('deleteItem').onclick=()=>{log=log.filter(x=>x.id!==sel);sel=log[0]?.id||null;render();edit()};
$('duplicate').onclick=()=>{const x=log.find(v=>v.id===sel);if(x){const n={...x,id:crypto.randomUUID(),title:x.title+' copy'};log.push(n);sel=n.id;render();edit()}};
$('saveSchedule').onclick=()=>localStorage.setItem('eldoret-demo',JSON.stringify(log));
$('loadSchedule').onclick=()=>{const s=localStorage.getItem('eldoret-demo');if(s){log=JSON.parse(s);sel=log[0]?.id||null;render();edit()}};

function getCart(slot){return cartBanks[activeBank][slot]}
function assignCart(slot,libId){const x=lib.find(v=>v.id===libId);if(!x)return;cartBanks[activeBank][slot]={libId,name:x.title,color:defaultColors[slot%defaultColors.length],loop:false};saveCarts();renderCarts()}
function renderCarts(){const root=$('carts');root.innerHTML='';for(let i=0;i<(cartView==='machines'?3:SLOTS);i++){const cfg=getCart(i),src=cfg&&lib.find(v=>v.id===cfg.libId);const b=document.createElement('div');b.className='cart';b.dataset.slot=i;const player=cartPlayers[activeBank+'-'+i];const playing=player&&!player.paused;b.classList.toggle('playing',!!playing);const duration=src?mm(playing?(cartCountDown?Math.max(0,(src.dur||player.duration||0)-player.currentTime):player.currentTime):(cartCountDown?src.dur:0)):'--:--';if(cartView==='machines'){b.classList.add('sonifexFace');b.classList.toggle('loaded',!!src);b.innerHTML='<div class="sfSlot"><span class="sfMechanism">▰ ▰ ▰</span><span class="sfTape"></span><span class="sfCassette"><span class="sfCassetteLabel"></span><span class="sfCassetteReel">◉</span></span></div><div class="sfLogo"><strong>CART '+(i+1)+'</strong><small>BULL\'SHITS</small></div><div class="sfStop"><small>STOP</small><span>■</span></div><div class="sfPlay"><small>PLAY</small><span>▶</span></div><div class="sfTime"><strong class="cartTime"></strong></div><div class="sfFast"><small>FAST</small><span>▶▶</span></div><div class="sfTitle"></div><div class="sfStatus"></div>';b.querySelector('.cartTime').textContent=duration;b.querySelector('.sfCassetteLabel').textContent=cfg?.name||src?.title||'';b.querySelector('.sfTitle').textContent='';b.querySelector('.sfStatus').textContent=playing?'ON AIR':src?'READY':'EMPTY';b.querySelector('.sfPlay').onclick=e=>{e.stopPropagation();if(!playing)toggleCart(i)};b.querySelector('.sfStop').onclick=e=>{e.stopPropagation();if(playing)toggleCart(i)};b.querySelector('.sfFast').onclick=e=>{e.stopPropagation();openCartEditor(i)};}else{b.style.background=cfg?.color||defaultColors[i%defaultColors.length];b.innerHTML='<span class="cartMachine">HOTKEY</span><span class="cartName"></span><span class="cartTime"></span><span class="cartState"></span><span class="cartLamp">▶</span>';b.querySelector('.cartName').textContent=cfg?.name||('CART '+(i+1));b.querySelector('.cartTime').textContent=duration;b.querySelector('.cartState').textContent=playing?'ON AIR':src?'READY':'EMPTY';b.onclick=()=>toggleCart(i)}b.ondragover=e=>{e.preventDefault();b.classList.add('dragover')};b.ondragleave=()=>b.classList.remove('dragover');b.ondrop=e=>{e.preventDefault();b.classList.remove('dragover');assignCart(i,e.dataTransfer.getData('text/plain'))};b.oncontextmenu=e=>{e.preventDefault();openCartEditor(i)};root.appendChild(b)}}
function toggleCart(slot){const key=activeBank+'-'+slot,cfg=getCart(slot),src=cfg&&lib.find(v=>v.id===cfg.libId);if(!src)return toast('Drag audio from the library onto this cart');const old=cartPlayers[key];if(old&&!old.paused){old.pause();old.currentTime=0;renderCarts();return}const a=new Audio(src.url);a.loop=!!cfg.loop;cartPlayers[key]=a;window.eldoretMeterRegister?.(a);a.ontimeupdate=renderCarts;a.onended=()=>{window.bullLog?.('ENDED',{fader:'D',title:src.title,source:'SONIFEX'});renderCarts()};a.play().then(()=>window.bullLog?.('PLAY',{fader:'D',title:src.title,source:'SONIFEX'})).catch(e=>window.bullLog?.('FAILED',{fader:'D',title:src.title,reason:e.message}));renderCarts()}
function openCartEditor(slot){editingCart=slot;const cfg=getCart(slot)||{};$('cartName').value=cfg.name||('CART '+(slot+1));$('cartColor').value=cfg.color||defaultColors[slot%defaultColors.length];$('cartLoop').checked=!!cfg.loop;$('cartModal').classList.remove('hidden')}
$('cartCancel').onclick=()=>$('cartModal').classList.add('hidden');
$('cartSave').onclick=()=>{const cfg=getCart(editingCart);if(cfg){cfg.name=$('cartName').value;cfg.color=$('cartColor').value;cfg.loop=$('cartLoop').checked;saveCarts();renderCarts()}$('cartModal').classList.add('hidden')};
$('cartClear').onclick=()=>{const key=activeBank+'-'+editingCart;cartPlayers[key]?.pause();cartPlayers[key]=null;cartBanks[activeBank][editingCart]=null;saveCarts();renderCarts();$('cartModal').classList.add('hidden')};
document.querySelectorAll('.bank').forEach(b=>b.onclick=()=>{activeBank=Number(b.dataset.bank);document.querySelectorAll('.bank').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderCarts()});

const toast=m=>{const t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1300)};
function tick(){const d=new Date();$('clock').textContent=d.toLocaleTimeString('en-GB',{hour12:false});$('date').textContent=d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});renderCarts()}
tick();setInterval(tick,1000);library();render();renderCarts();

/* Spotify reference integration - metadata/search only, never used as playout audio */
const SPOTIFY_REDIRECT=location.origin+location.pathname;
let spotifyToken=sessionStorage.getItem('spotify_access_token')||'';
let spotifyExpiresAt=Number(sessionStorage.getItem('spotify_expires_at')||0);
let spotifyClientId=localStorage.getItem('spotify_client_id')||'';

function b64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function sha256(text){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))}
function randomVerifier(){const a=new Uint8Array(48);crypto.getRandomValues(a);return b64url(a)}
function spotifyConnected(){return !!spotifyToken&&Date.now()<spotifyExpiresAt-30000}
function storeSpotifyTokens(j){spotifyToken=j.access_token;spotifyExpiresAt=Date.now()+(Number(j.expires_in)||3600)*1000;sessionStorage.setItem('spotify_access_token',spotifyToken);sessionStorage.setItem('spotify_expires_at',String(spotifyExpiresAt));if(j.refresh_token)localStorage.setItem('spotify_refresh_token',j.refresh_token)}
async function refreshSpotify(){const refresh=localStorage.getItem('spotify_refresh_token');if(!refresh||!spotifyClientId)return false;try{const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:refresh,client_id:spotifyClientId});const r=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});if(!r.ok)return false;storeSpotifyTokens(await r.json());return true}catch{return false}}
async function ensureSpotify(){if(spotifyConnected())return true;if(await refreshSpotify())return true;spotifyToken='';sessionStorage.removeItem('spotify_access_token');return false}
function updateSpotifyStatus(msg){$('spotifyStatus').textContent=msg|| (spotifyConnected()?'Connected to Spotify':'Not connected')}

async function connectSpotify(){
  spotifyClientId=spotifyClientId||prompt('Paste your Spotify Client ID');
  if(!spotifyClientId)return;
  localStorage.setItem('spotify_client_id',spotifyClientId);
  const verifier=randomVerifier(),challenge=b64url(await sha256(verifier)),state=crypto.randomUUID();
  sessionStorage.setItem('spotify_verifier',verifier);
  sessionStorage.setItem('spotify_state',state);
  const p=new URLSearchParams({
    response_type:'code',
    client_id:spotifyClientId,
    scope:'user-read-private',
    redirect_uri:SPOTIFY_REDIRECT,
    state,
    code_challenge_method:'S256',
    code_challenge:challenge
  });
  location.href='https://accounts.spotify.com/authorize?'+p.toString();
}

async function handleSpotifyCallback(){
  const q=new URLSearchParams(location.search),code=q.get('code'),state=q.get('state');
  if(!code)return;
  if(state!==sessionStorage.getItem('spotify_state')){updateSpotifyStatus('Spotify login state mismatch');return}
  const verifier=sessionStorage.getItem('spotify_verifier');
  const body=new URLSearchParams({client_id:spotifyClientId||localStorage.getItem('spotify_client_id')||'',grant_type:'authorization_code',code,redirect_uri:SPOTIFY_REDIRECT,code_verifier:verifier});
  const r=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  if(!r.ok){updateSpotifyStatus('Spotify connection failed');return}
  const j=await r.json();storeSpotifyTokens(j);
  history.replaceState({},'',SPOTIFY_REDIRECT);
  updateSpotifyStatus('Spotify connected');
}

async function searchSpotify(){
  const q=$('spotifyQuery').value.trim();if(!q)return;
  if(!await ensureSpotify()){toast('Connect Spotify first');updateSpotifyStatus('Reconnect Spotify to search');return}
  updateSpotifyStatus('Searching Spotify…');
  const r=await fetch('https://api.spotify.com/v1/search?type=track&limit=10&q='+encodeURIComponent(q),{headers:{Authorization:'Bearer '+spotifyToken}});
  let j={}; try{j=await r.json()}catch{}
  if(r.status===401){spotifyToken='';sessionStorage.removeItem('spotify_access_token');updateSpotifyStatus('401: Spotify session expired — reconnect');return}
  if(!r.ok){const msg=j?.error?.message||j?.error||r.statusText||'Unknown error';updateSpotifyStatus(r.status+': '+msg);return}
  renderSpotify(j.tracks?.items||[]);updateSpotifyStatus((j.tracks?.items?.length||0)+' results');
}

function listenSpotify(id){
 if(!/^[A-Za-z0-9]{22}$/.test(String(id||''))){toast('No valid Spotify track ID');return}
 const modal=$('spotifyListenModal'),frame=$('spotifyListenFrame');
 if(!modal||!frame)return;
 frame.src='https://open.spotify.com/embed/track/'+id+'?utm_source=generator';
 modal.classList.remove('hidden');
}
function closeSpotifyListen(){
 const modal=$('spotifyListenModal'),frame=$('spotifyListenFrame');
 if(frame)frame.src='about:blank';
 if(modal)modal.classList.add('hidden');
}
$('spotifyListenClose').onclick=closeSpotifyListen;
$('spotifyListenModal').addEventListener('click',e=>{if(e.target.id==='spotifyListenModal')closeSpotifyListen()});
$('spotifyListenSelected').onclick=()=>{
 const x=log.find(v=>v.id===sel);
 if(!x?.spotifyId){toast('Select a Spotify track in the running order');return}
 listenSpotify(x.spotifyId);
};
function renderSpotify(rows){
  const root=$('spotifyResults');root.innerHTML='';
  rows.forEach(t=>{
    const d=document.createElement('div');d.className='spotifyRow';d.draggable=true;
    const img=t.album?.images?.at(-1)?.url||t.album?.images?.[0]?.url||'';
    const artists=(t.artists||[]).map(a=>a.name).join(', ');
    const ref={source:'spotify',spotifyId:t.id,title:t.name,artist:artists,album:t.album?.name||'',artwork:img,dur:Math.round((t.duration_ms||180000)/1000),audioMissing:true};
    d.addEventListener('dragstart',e=>{e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('application/x-eldoret-spotify',JSON.stringify(ref));e.dataTransfer.setData('text/plain',JSON.stringify(ref));});
    d.innerHTML='<img src="'+img+'" alt=""><div class="spotifyMeta"><b>'+t.name+'</b><small>'+artists+' • '+(t.album?.name||'')+'</small><em>Drag to running order</em></div><div class="spotifyActions"><a target="_blank" rel="noopener" href="'+(t.external_urls?.spotify||'#')+'">Open</a><button class="spotifyListen">▶ Listen</button><button class="spotifyAdd">+ Running order</button><button>Use metadata</button><button>Find local</button></div>';
    const buttons=d.querySelectorAll('button');
    buttons[0].onclick=()=>listenSpotify(t.id);
    buttons[1].onclick=()=>addSpotifyReference(ref);
    buttons[2].onclick=()=>useSpotifyMetadata(t.name,artists);
    buttons[3].onclick=()=>findLocalMatch(t.name,artists);
    root.appendChild(d);
  });
}
function addSpotifyReference(ref,index=null){
  const item={id:crypto.randomUUID(),title:ref.title,artist:ref.artist||'',dur:Number(ref.dur||180),intro:0,segue:0,fade:0,cue:0,type:'auto',fixed:'',src:null,mediaId:null,source:'spotify-reference',spotifyId:ref.spotifyId||'',album:ref.album||'',artwork:ref.artwork||'',audioMissing:true};
  if(index===null||index<0||index>log.length)log.push(item);else log.splice(index,0,item);
  const hit=matchAudio(item);if(hit){item.url=hit.url;item.audioMissing=false;item.localAudioId=hit.id;}
  sel=item.id;render();edit();toast(hit?'Spotify reference matched to local audio':'Added Spotify reference — local audio needed');
}
function useSpotifyMetadata(title,artist){
  const x=log.find(v=>v.id===sel);
  if(!x){toast('Select a running-order item first');return}
  x.title=title;x.artist=artist;render();edit();toast('Spotify metadata applied');
}
function findLocalMatch(title,artist){
  const n=title.toLowerCase(),a=artist.toLowerCase();
  const hit=lib.find(x=>x.title.toLowerCase()===n || (x.title.toLowerCase().includes(n)&&a.includes(x.artist.toLowerCase())));
  if(!hit){toast('No matching local audio found');return}
  $('search').value=hit.title;library();toast('Local match found');
}

async function testSpotify(){
  if(!await ensureSpotify()){updateSpotifyStatus(spotifyClientId?'Connect Spotify to resume':'Not connected');return}
  const r=await fetch('https://api.spotify.com/v1/me',{headers:{Authorization:'Bearer '+spotifyToken}});
  let j={};try{j=await r.json()}catch{}
  if(r.ok){updateSpotifyStatus('Connected as '+(j.display_name||'Spotify user')+(j.product?' • '+j.product.toUpperCase():''));return}
  updateSpotifyStatus(r.status+': '+(j?.error?.message||r.statusText||'Spotify profile check failed'));
}
$('spotifyConnect').onclick=connectSpotify;
$('spotifySearchBtn').onclick=searchSpotify;
$('spotifyQuery').addEventListener('keydown',e=>{if(e.key==='Enter')searchSpotify()});
handleSpotifyCallback().then(()=>testSpotify()).catch(()=>updateSpotifyStatus('Spotify connection needs attention'));

function enableSpotifyScheduleDrop(){
  const root=$('schedule');
  if(!root||root.dataset.spotifyDrop)return;
  root.dataset.spotifyDrop='1';
  root.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('application/x-eldoret-spotify')){e.preventDefault();e.dataTransfer.dropEffect='copy';}});
  root.addEventListener('drop',e=>{
    const raw=e.dataTransfer.getData('application/x-eldoret-spotify');if(!raw)return;
    e.preventDefault();e.stopPropagation();let ref;try{ref=JSON.parse(raw)}catch{return}
    const row=e.target.closest('[data-id],tr,.row');let at=null;
    if(row){const id=row.dataset.id;const n=id?log.findIndex(x=>x.id===id):-1;if(n>=0)at=n;}
    addSpotifyReference(ref,at);
  });
}
setTimeout(enableSpotifyScheduleDrop,0);

// Switch between elapsed and remaining time on cart LED counters.
document.getElementById('cartCounterMode').onclick=()=>{cartCountDown=!cartCountDown;document.getElementById('cartCounterMode').textContent=cartCountDown?'COUNT DOWN':'COUNT UP';renderCarts()};

// Three physical-style carts or a full hotkey pad, sharing four existing banks.
const cartTabs=document.getElementById('cartViewTabs');
cartTabs?.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{cartView=btn.dataset.view;cartTabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));document.getElementById('carts').classList.toggle('machineView',cartView==='machines');document.getElementById('carts').classList.toggle('hotkeyView',cartView==='hotkeys');renderCarts()});
document.getElementById('carts').classList.add('machineView');

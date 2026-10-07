const $=x=>document.getElementById(x);
let lib=[],log=[],sel=null,play=-1;
const A=$('deckA'),B=$('deckB');let deck=A;
let activeBank=0, editingCart=null;
const BANKS=4,SLOTS=16;
const defaultColors=['#cb3b3b','#2466be','#d4831a','#209c58','#7c4dc2','#4a5c70'];
let cartBanks=JSON.parse(localStorage.getItem('eldoret-cart-banks')||'null')||Array.from({length:BANKS},()=>Array.from({length:SLOTS},()=>null));
const cartPlayers={};

const mm=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0');
const saveCarts=()=>localStorage.setItem('eldoret-cart-banks',JSON.stringify(cartBanks));
function row(x,i){const d=document.createElement('div');d.className='row '+x.type+(i===play?' playing':'')+(x.id===sel?' selected':'');d.draggable=true;d.innerHTML='<div>'+(i===play?'▶':i+1)+'</div><div>--:--</div><div><span class="pill '+x.type+'">'+x.type.toUpperCase()+'</span></div><div><b>'+x.title+'</b><br><small>'+x.artist+'</small></div><div>'+mm(x.dur)+'</div><div>'+mm(x.intro)+'</div><div>'+mm(x.segue||0)+'</div><div>--:--</div>';d.onclick=()=>{sel=x.id;render();edit()};d.ondragstart=()=>window.drag=i;d.ondragover=e=>e.preventDefault();d.ondrop=e=>{e.preventDefault();const [m]=log.splice(window.drag,1);log.splice(i,0,m);render()};return d}
function render(){const r=$('schedule');r.innerHTML='';log.forEach((x,i)=>r.appendChild(row(x,i)));const p=log[play],n=log[play<0?0:play+1];$('nowTitle').textContent=p?.title||'Stopped';$('nowArtist').textContent=p?.artist||'Import audio to begin';$('nextTitle').textContent=n?.title||'Nothing queued';$('nextArtist').textContent=n?.artist||'—';$('nextDuration').textContent=n?mm(n.dur):'00:00'}
function edit(){const x=log.find(v=>v.id===sel);$('emptyEditor').hidden=!!x;$('editorForm').hidden=!x;if(!x)return;$('eTitle').value=x.title;$('eArtist').value=x.artist;$('eDur').value=mm(x.dur);$('eType').value=x.type;$('eIntro').value=mm(x.intro);$('eCue').value=mm(x.cue);$('eSegue').value=mm(x.segue||0);$('eFade').value=mm(x.fade);$('eFixed').value=x.fixed||''}
function parse(t){const p=t.split(':').map(Number);return (p[0]||0)*60+(p[1]||0)}
function update(){const x=log.find(v=>v.id===sel);if(!x)return;x.title=$('eTitle').value;x.artist=$('eArtist').value;x.dur=parse($('eDur').value);x.type=$('eType').value;x.intro=parse($('eIntro').value);x.cue=parse($('eCue').value);x.segue=parse($('eSegue').value);x.fade=parse($('eFade').value);x.fixed=$('eFixed').value;render()}
['eTitle','eArtist','eDur','eType','eIntro','eCue','eSegue','eFade','eFixed'].forEach(id=>$(id).oninput=update);

$('audioFiles').onchange=e=>[...e.target.files].forEach(f=>{const u=URL.createObjectURL(f),a=new Audio(u);a.onloadedmetadata=()=>{const n=f.name.replace(/\.[^.]+$/,''),p=n.split(' - '),artist=p.length>1?p.shift():'Imported audio',title=p.length?p.join(' - '):n;lib.push({id:crypto.randomUUID(),title,artist,dur:a.duration,url:u});library();renderCarts()}});
function library(){const q=$('search').value.toLowerCase(),r=$('library');r.innerHTML='';lib.filter(x=>(x.title+' '+x.artist).toLowerCase().includes(q)).forEach(x=>{const d=document.createElement('div');d.className='librow';d.draggable=true;d.dataset.libid=x.id;d.innerHTML='<span><b>'+x.title+'</b><br><small>'+x.artist+'</small></span><span>'+mm(x.dur)+'</span><button>+</button>';d.ondragstart=e=>e.dataTransfer.setData('text/plain',x.id);d.querySelector('button').onclick=()=>{const n={...x,id:crypto.randomUUID(),intro:0,cue:0,segue:Math.max(0,x.dur-5),fade:2,type:'auto',fixed:''};log.push(n);sel=n.id;render();edit()};r.appendChild(d)})}
$('search').oninput=library;

async function start(i){const x=log[i];if(!x?.url)return;const to=deck===A?B:A;to.src=x.url;to.currentTime=x.cue||0;await to.play();deck.pause();deck=to;play=i;$('status').textContent='Playing '+x.title;render()}
$('playBtn').onclick=()=>{let i=log.findIndex(x=>x.id===sel);if(i<0)i=0;start(i)};
$('nextBtn').onclick=()=>start(play<0?0:play+1);
$('stopBtn').onclick=()=>{A.pause();B.pause();play=-1;$('status').textContent='Stopped';render()};
$('addBlank').onclick=()=>{const n={id:crypto.randomUUID(),title:'New Item',artist:'',dur:60,intro:0,cue:0,segue:0,fade:2,type:'manual',fixed:'',url:null};log.push(n);sel=n.id;render();edit()};
$('deleteItem').onclick=()=>{log=log.filter(x=>x.id!==sel);sel=log[0]?.id||null;render();edit()};
$('duplicate').onclick=()=>{const x=log.find(v=>v.id===sel);if(x){const n={...x,id:crypto.randomUUID(),title:x.title+' copy'};log.push(n);sel=n.id;render();edit()}};
$('saveSchedule').onclick=()=>localStorage.setItem('eldoret-demo',JSON.stringify(log));
$('loadSchedule').onclick=()=>{const s=localStorage.getItem('eldoret-demo');if(s){log=JSON.parse(s);sel=log[0]?.id||null;render();edit()}};

function getCart(slot){return cartBanks[activeBank][slot]}
function assignCart(slot,libId){const x=lib.find(v=>v.id===libId);if(!x)return;cartBanks[activeBank][slot]={libId,name:x.title,color:defaultColors[slot%defaultColors.length],loop:false};saveCarts();renderCarts()}
function renderCarts(){const root=$('carts');root.innerHTML='';for(let i=0;i<SLOTS;i++){const cfg=getCart(i),src=cfg&&lib.find(v=>v.id===cfg.libId);const b=document.createElement('button');b.className='cart';b.dataset.slot=i;b.style.background=cfg?.color||defaultColors[i%defaultColors.length];const player=cartPlayers[activeBank+'-'+i];const playing=player&&!player.paused;b.classList.toggle('playing',!!playing);b.innerHTML='<span class="cartName">'+(cfg?.name||('CART '+(i+1)))+'</span><span class="cartTime">'+(playing?mm(Math.max(0,(src?.dur||0)-player.currentTime)):(src?mm(src.dur):'EMPTY'))+'</span><span class="cartState">'+(playing?'PLAY':'')+'</span>';b.ondragover=e=>{e.preventDefault();b.classList.add('dragover')};b.ondragleave=()=>b.classList.remove('dragover');b.ondrop=e=>{e.preventDefault();b.classList.remove('dragover');assignCart(i,e.dataTransfer.getData('text/plain'))};b.onclick=()=>toggleCart(i);b.oncontextmenu=e=>{e.preventDefault();openCartEditor(i)};root.appendChild(b)}}
function toggleCart(slot){const key=activeBank+'-'+slot,cfg=getCart(slot),src=cfg&&lib.find(v=>v.id===cfg.libId);if(!src)return toast('Drag audio from the library onto this cart');const old=cartPlayers[key];if(old&&!old.paused){old.pause();old.currentTime=0;renderCarts();return}const a=new Audio(src.url);a.loop=!!cfg.loop;cartPlayers[key]=a;a.ontimeupdate=renderCarts;a.onended=renderCarts;a.play();renderCarts()}
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
let spotifyClientId=localStorage.getItem('spotify_client_id')||'';

function b64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function sha256(text){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))}
function randomVerifier(){const a=new Uint8Array(48);crypto.getRandomValues(a);return b64url(a)}
function spotifyConnected(){return !!spotifyToken}
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
  const j=await r.json();spotifyToken=j.access_token;sessionStorage.setItem('spotify_access_token',spotifyToken);
  history.replaceState({},'',SPOTIFY_REDIRECT);
  updateSpotifyStatus('Spotify connected');
}

async function searchSpotify(){
  const q=$('spotifyQuery').value.trim();if(!q)return;
  if(!spotifyToken){toast('Connect Spotify first');return}
  updateSpotifyStatus('Searching Spotify…');
  const r=await fetch('https://api.spotify.com/v1/search?type=track&limit=12&q='+encodeURIComponent(q),{headers:{Authorization:'Bearer '+spotifyToken}});
  if(r.status===401){spotifyToken='';sessionStorage.removeItem('spotify_access_token');updateSpotifyStatus('Spotify session expired — reconnect');return}
  if(!r.ok){updateSpotifyStatus('Spotify search failed');return}
  const j=await r.json();renderSpotify(j.tracks?.items||[]);updateSpotifyStatus((j.tracks?.items?.length||0)+' results');
}

function renderSpotify(rows){
  const root=$('spotifyResults');root.innerHTML='';
  rows.forEach(t=>{
    const d=document.createElement('div');d.className='spotifyRow';
    const img=t.album?.images?.at(-1)?.url||t.album?.images?.[0]?.url||'';
    const artists=(t.artists||[]).map(a=>a.name).join(', ');
    d.innerHTML='<img src="'+img+'" alt=""><div class="spotifyMeta"><b>'+t.name+'</b><small>'+artists+' • '+(t.album?.name||'')+'</small></div><div class="spotifyActions"><a target="_blank" rel="noopener" href="'+(t.external_urls?.spotify||'#')+'">Open</a><button>Use metadata</button><button>Find local</button></div>';
    const buttons=d.querySelectorAll('button');
    buttons[0].onclick=()=>useSpotifyMetadata(t.name,artists);
    buttons[1].onclick=()=>findLocalMatch(t.name,artists);
    root.appendChild(d);
  });
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

$('spotifyConnect').onclick=connectSpotify;
$('spotifySearchBtn').onclick=searchSpotify;
$('spotifyQuery').addEventListener('keydown',e=>{if(e.key==='Enter')searchSpotify()});
handleSpotifyCallback().then(()=>updateSpotifyStatus());

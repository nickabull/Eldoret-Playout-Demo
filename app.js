const $=x=>document.getElementById(x);
let lib=[],log=[],sel=null,play=-1;
const A=$('deckA'),B=$('deckB');let deck=A;
const mm=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0');
function row(x,i){const d=document.createElement('div');d.className='row '+x.type+(i===play?' playing':'')+(x.id===sel?' selected':'');d.draggable=true;d.innerHTML='<div>'+(i===play?'▶':i+1)+'</div><div>--:--</div><div><span class="pill '+x.type+'">'+x.type.toUpperCase()+'</span></div><div><b>'+x.title+'</b><br><small>'+x.artist+'</small></div><div>'+mm(x.dur)+'</div><div>'+mm(x.intro)+'</div><div>'+mm(x.segue||0)+'</div><div>--:--</div>';d.onclick=()=>{sel=x.id;render();edit()};d.ondragstart=()=>window.drag=i;d.ondragover=e=>e.preventDefault();d.ondrop=e=>{e.preventDefault();const [m]=log.splice(window.drag,1);log.splice(i,0,m);render()};return d}
function render(){const r=$('schedule');r.innerHTML='';log.forEach((x,i)=>r.appendChild(row(x,i)));const p=log[play],n=log[play<0?0:play+1];$('nowTitle').textContent=p?.title||'Stopped';$('nowArtist').textContent=p?.artist||'Import audio to begin';$('nextTitle').textContent=n?.title||'Nothing queued';$('nextArtist').textContent=n?.artist||'—';$('nextDuration').textContent=n?mm(n.dur):'00:00'}
function edit(){const x=log.find(v=>v.id===sel);$('emptyEditor').hidden=!!x;$('editorForm').hidden=!x;if(!x)return;$('eTitle').value=x.title;$('eArtist').value=x.artist;$('eDur').value=mm(x.dur);$('eType').value=x.type;$('eIntro').value=mm(x.intro);$('eCue').value=mm(x.cue);$('eSegue').value=mm(x.segue||0);$('eFade').value=mm(x.fade);$('eFixed').value=x.fixed||''}
function parse(t){const p=t.split(':').map(Number);return (p[0]||0)*60+(p[1]||0)}
function update(){const x=log.find(v=>v.id===sel);if(!x)return;x.title=$('eTitle').value;x.artist=$('eArtist').value;x.dur=parse($('eDur').value);x.type=$('eType').value;x.intro=parse($('eIntro').value);x.cue=parse($('eCue').value);x.segue=parse($('eSegue').value);x.fade=parse($('eFade').value);x.fixed=$('eFixed').value;render()}
['eTitle','eArtist','eDur','eType','eIntro','eCue','eSegue','eFade','eFixed'].forEach(id=>$(id).oninput=update);
$('audioFiles').onchange=e=>[...e.target.files].forEach(f=>{const u=URL.createObjectURL(f),a=new Audio(u);a.onloadedmetadata=()=>{const n=f.name.replace(/\.[^.]+$/,''),p=n.split(' - '),artist=p.length>1?p.shift():'Imported audio',title=p.length?p.join(' - '):n;lib.push({id:crypto.randomUUID(),title,artist,dur:a.duration,url:u});library()}});
function library(){const q=$('search').value.toLowerCase(),r=$('library');r.innerHTML='';lib.filter(x=>(x.title+' '+x.artist).toLowerCase().includes(q)).forEach(x=>{const d=document.createElement('div');d.className='librow';d.innerHTML='<span><b>'+x.title+'</b><br><small>'+x.artist+'</small></span><span>'+mm(x.dur)+'</span><button>+</button>';d.querySelector('button').onclick=()=>{const n={...x,id:crypto.randomUUID(),intro:0,cue:0,segue:Math.max(0,x.dur-5),fade:2,type:'auto',fixed:''};log.push(n);sel=n.id;render();edit()};r.appendChild(d)})}
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
function tick(){const d=new Date();$('clock').textContent=d.toLocaleTimeString('en-GB',{hour12:false});$('date').textContent=d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}
tick();setInterval(tick,1000);library();render();
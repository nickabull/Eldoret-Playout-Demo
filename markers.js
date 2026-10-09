/* Eldoret waveform markers and browser AutoSegue prototype v0.5.0 */
const MARKER_FIELDS=[
 ['start','Start','#5cc8ff'],['end','End','#ff6464'],
 ['intro1','Intro 1','#e9b44c'],['intro2','Intro 2','#e9d36b'],
 ['hookStart','Hook start','#bf8cff'],['hookEnd','Hook end','#9d69f4'],
 ['segueStart','Segue start','#40d99d'],['segueEnd','Segue end','#2da97d'],
 ['fadeUp','Fade up','#fa9b64'],['fadeDown','Fade down','#f77868']
];
const markerDefault=x=>({start:Number(x.cue)||0,end:Number(x.dur)||0,intro1:Number(x.intro)||0,intro2:null,hookStart:null,hookEnd:null,segueStart:Number(x.segue)>0?Number(x.segue):null,segueEnd:Number(x.dur)||0,fadeUp:null,fadeDown:null});
const markersOf=x=>{if(!x.markers)x.markers=markerDefault(x);return x.markers};
const markerTime=v=>v===null||v===undefined?'—':(Math.floor(v/60)+':'+String(Math.floor(v%60)).padStart(2,'0')+'.'+String(Math.round((v%1)*10)%10));
const markerParse=s=>{if(!s.trim())return null;const a=s.trim().split(':').map(Number);const v=a.length===1?a[0]:a.length===2?a[0]*60+a[1]:NaN;return Number.isFinite(v)&&v>=0?v:null};
let markerItem=null,markerAudio=null,markerBuffer=null,markerSelected='segueStart',markerPreviewPlayers=[],seguePending=false,segueFiredFor=null;
const markerStyle=document.createElement('style');
markerStyle.textContent=`.markerModalCard{width:min(920px,96vw);max-height:92vh;overflow:auto}.markerToolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.markerToolbar h3{margin:0}.markerCanvas{width:100%;height:220px;display:block;background:#06101c;border:1px solid #35516a;border-radius:6px;cursor:crosshair;touch-action:pan-y}.markerFields{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-top:14px}.markerFields label{display:flex;flex-direction:column;gap:4px;margin:0;font-size:11px}.markerFields input{width:100%;background:#07131f;border:1px solid #35516a;color:white;padding:8px;border-radius:5px}.markerFields label.active{color:#ffd166}.markerFields label.active input{outline:2px solid #ffd166}.markerActions{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end;margin-top:15px}.markerHint{font-size:12px;color:#9eb1c4;line-height:1.5}.markerLegend{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}.markerLegend button{font-size:10px;padding:5px 7px}.markerLegend button.active{outline:2px solid #fff}.markerEditorBtn{width:100%;background:#164f77;margin:6px 0 10px}@media(max-width:700px){.markerFields{grid-template-columns:repeat(2,minmax(0,1fr))}.markerCanvas{height:170px}}`;
document.head.appendChild(markerStyle);
const markerModal=document.createElement('div');markerModal.className='modal hidden';markerModal.id='markerModal';
markerModal.innerHTML='<div class="modalCard markerModalCard"><div class="markerToolbar"><h3>WAVEFORM MARKER EDITOR</h3><button id="markerClose">✕ Close</button></div><p class="markerHint" id="markerDescription"></p><canvas id="markerWave" class="markerCanvas" width="1200" height="220"></canvas><div class="markerLegend" id="markerLegend"></div><div class="markerFields" id="markerFields"></div><p class="markerHint" id="markerHelp">Choose a marker, then click the waveform to position it. Times accept seconds or MM:SS.s. Blank clears a marker.</p><div class="markerActions"><button id="markerAudition">▶ Audition from start</button><button id="markerPreview">▶ Preview segue</button><button id="markerStop">■ Stop preview</button><button id="markerSave" class="go">Save markers</button></div></div>';
document.body.appendChild(markerModal);
const markerBtn=document.createElement('button');markerBtn.id='markerOpen';markerBtn.className='markerEditorBtn';markerBtn.textContent='◈ Open waveform / marker editor';
$('editorForm').appendChild(markerBtn);
markerBtn.onclick=()=>openMarkers();
function stopMarkerPreview(){markerPreviewPlayers.forEach(a=>{a.pause();a.src=''});markerPreviewPlayers=[]}
function closeMarkers(){stopMarkerPreview();markerModal.classList.add('hidden');markerItem=null;markerBuffer=null}
$('markerClose').onclick=closeMarkers;$('markerStop').onclick=stopMarkerPreview;
markerModal.addEventListener('click',e=>{if(e.target===markerModal)closeMarkers()});
function openMarkers(){
 const x=log.find(v=>v.id===sel);if(!x)return;
 markerItem=x;markerSelected='segueStart';markerModal.classList.remove('hidden');
 $('markerDescription').textContent=x.artist+' — '+x.title+(x.url?'':' • Audio missing: import a playable file to see the waveform and audition');
 drawMarkerControls();loadMarkerWave(x);
}
function drawMarkerControls(){
 if(!markerItem)return;const m=markersOf(markerItem),legend=$('markerLegend'),fields=$('markerFields');legend.innerHTML='';fields.innerHTML='';
 for(const [key,label,color] of MARKER_FIELDS){
  const b=document.createElement('button');b.textContent=label;b.style.borderColor=color;b.classList.toggle('active',key===markerSelected);
  b.onclick=()=>{markerSelected=key;drawMarkerControls()};legend.appendChild(b);
  const l=document.createElement('label');l.textContent=label;l.classList.toggle('active',key===markerSelected);
  const inp=document.createElement('input');inp.value=markerTime(m[key])==='—'?'':markerTime(m[key]);inp.placeholder='Not set';
  inp.onfocus=()=>{markerSelected=key;drawMarkerCanvas();legend.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',MARKER_FIELDS[i][0]===key));fields.querySelectorAll('label').forEach((v,i)=>v.classList.toggle('active',MARKER_FIELDS[i][0]===key))};
  inp.onchange=()=>{const t=markerParse(inp.value);m[key]=t===null?null:Math.min(Number(markerItem.dur)||t,t);drawMarkerControls();drawMarkerCanvas()};
  l.appendChild(inp);fields.appendChild(l);
 }
 drawMarkerCanvas();
}
async function loadMarkerWave(x){
 markerBuffer=null;drawMarkerCanvas();
 if(!x.url)return;
 try{const res=await fetch(x.url);const bytes=await res.arrayBuffer();const ctx=new (window.AudioContext||window.webkitAudioContext)();const decoded=await ctx.decodeAudioData(bytes);await ctx.close();if(markerItem!==x)return;markerBuffer=decoded;drawMarkerCanvas()}
 catch(e){$('markerHelp').textContent='Waveform decoding unavailable for this file. You can still edit marker times manually.'}
}
function drawMarkerCanvas(){
 const c=$('markerWave'),g=c.getContext('2d'),w=c.width,h=c.height;g.fillStyle='#06101c';g.fillRect(0,0,w,h);
 g.strokeStyle='#284259';g.lineWidth=1;
 for(let i=0;i<=10;i++){const x=i*w/10;g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}
 if(markerBuffer){
  const data=markerBuffer.getChannelData(0),step=Math.max(1,Math.floor(data.length/w));g.strokeStyle='#55a9f7';g.lineWidth=1;
  for(let px=0;px<w;px++){let lo=1,hi=-1;const off=px*step;for(let j=0;j<step&&off+j<data.length;j+=Math.max(1,Math.floor(step/100))){const v=data[off+j];if(v<lo)lo=v;if(v>hi)hi=v}g.beginPath();g.moveTo(px,(1-hi)*h/2);g.lineTo(px,(1-lo)*h/2);g.stroke()}
 }else{g.fillStyle='#7790a9';g.font='16px Segoe UI';g.fillText('Import a playable audio file to display waveform',24,h/2)}
 if(!markerItem)return;
 const m=markersOf(markerItem),dur=Math.max(1,Number(markerItem.dur)||markerBuffer?.duration||1);
 for(const [key,label,color] of MARKER_FIELDS){const t=m[key];if(t===null||t===undefined)continue;const x=Math.min(w,Math.max(0,t/dur*w));g.strokeStyle=color;g.lineWidth=key===markerSelected?3:2;g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();g.fillStyle=color;g.font='bold 12px Segoe UI';g.fillText(label,x+3,14+MARKER_FIELDS.findIndex(a=>a[0]===key)%5*15)}
}
$('markerWave').addEventListener('click',e=>{
 if(!markerItem)return;const r=e.currentTarget.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),dur=Number(markerItem.dur)||markerBuffer?.duration||0;
 markersOf(markerItem)[markerSelected]=Math.round(ratio*dur*10)/10;drawMarkerControls();
});
function markerSave(){if(!markerItem)return;const m=markersOf(markerItem);if(m.start!=null)markerItem.cue=m.start;if(m.intro1!=null)markerItem.intro=m.intro1;if(m.segueStart!=null)markerItem.segue=m.segueStart;if(m.fadeDown!=null)markerItem.fade=m.fadeDown;render();edit();toast('Markers saved in running order');closeMarkers()}
$('markerSave').onclick=markerSave;
$('markerAudition').onclick=async()=>{
 if(!markerItem?.url)return toast('Import audio first');stopMarkerPreview();const a=new Audio(markerItem.url);markerPreviewPlayers.push(a);a.currentTime=markersOf(markerItem).start||0;await a.play().catch(()=>toast('Audio could not play'));
};
$('markerPreview').onclick=async()=>{
 if(!markerItem?.url)return toast('Import audio first');
 const index=log.indexOf(markerItem),next=log[index+1];if(!next?.url)return toast('Add a playable next cut to preview the segue');
 const m=markersOf(markerItem),t=m.segueStart;if(t==null)return toast('Set a segue start marker first');
 stopMarkerPreview();const a=new Audio(markerItem.url),b=new Audio(next.url);markerPreviewPlayers.push(a,b);
 a.currentTime=Math.max(m.start||0,t-3);let triggered=false;
 a.ontimeupdate=()=>{if(triggered||a.currentTime<t)return;triggered=true;b.currentTime=markersOf(next).start||0;b.play().catch(()=>{});const end=m.segueEnd??markerItem.dur;const remaining=Math.max(.2,end-t);const initial=a.volume;const began=performance.now();const timer=setInterval(()=>{if(a.paused){clearInterval(timer);return}a.volume=Math.max(0,initial*(1-(performance.now()-began)/1000/remaining));if(a.volume===0){a.pause();clearInterval(timer)}},60)};
 await a.play().catch(()=>toast('Audio could not play'));
};
/* AUTO mode segue execution. This prototype fades the outgoing HTML audio deck. */
function markerStopAll(){seguePending=false;segueFiredFor=null;A.volume=1;B.volume=1}
const originalStart=start;
start=async function(i){
 const x=log[i];if(!x?.url)return originalStart(i);
 const old=deck,oldIndex=play,oldItem=log[oldIndex];
 const incoming=deck===A?B:A;incoming.volume=1;
 try{incoming.src=x.url;incoming.currentTime=markersOf(x).start||0;await incoming.play()}
 catch(e){toast('Cannot play '+x.title);return}
 deck=incoming;play=i;seguePending=false;segueFiredFor=null;
 if(old!==incoming&&!old.paused&&oldItem){
  const oldMarkers=markersOf(oldItem),end=oldMarkers.segueEnd??oldItem.dur;
  const remaining=Math.max(.2,(Number(end)||old.duration||old.currentTime)-old.currentTime);
  const begun=performance.now();const initial=old.volume;
  const timer=setInterval(()=>{if(old.paused){clearInterval(timer);old.volume=1;return}old.volume=Math.max(0,initial*(1-(performance.now()-begun)/1000/remaining));if(old.volume<=0){old.pause();old.volume=1;clearInterval(timer)}},50);
 }else if(old!==incoming){old.pause();old.volume=1}
 $('status').textContent='Playing '+x.title;render();
};
function markerTimeUpdate(e){
 if(e.target!==deck||play<0||$('mode').value!=='AUTO'||seguePending)return;
 const x=log[play],m=markersOf(x),at=m.segueStart;
 if(at==null||at<=0||e.target.currentTime<at||segueFiredFor===x.id)return;
 if(!log[play+1]?.url){segueFiredFor=x.id;$('status').textContent='Next audio missing — AutoSegue held';return}
 seguePending=true;segueFiredFor=x.id;start(play+1);
}
A.addEventListener('timeupdate',markerTimeUpdate);B.addEventListener('timeupdate',markerTimeUpdate);
$('stopBtn').addEventListener('click',markerStopAll);
const originalRender=render;
render=function(){originalRender();const x=log[play],n=log[play<0?0:play+1];if(x){const m=markersOf(x);$('nowCue').textContent='Start '+markerTime(m.start||0);$('nowSegue').textContent='Segue '+markerTime(m.segueStart)}if(n){$('nextType').textContent=n.type.toUpperCase()}};

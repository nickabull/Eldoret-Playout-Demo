(()=>{'use strict';
const $=id=>document.getElementById(id);
const presets=[['South West',153,370],['South Wales',117,327],['West Midlands',187,307],['London',219,357],['South East',244,371],['East Anglia',238,320],['East Midlands',213,273],['North West',184,239],['Yorkshire',220,220],['North East',194,171],['Scotland',177,100],['Northern Ireland',108,311]];
const KEY='bull-split-links-v1', DB='bull-split-audio-v1';
let project,selected,db,recorder,stream,chunks=[],recordMode=null,recordStart=0,timer=null,recordLimit=null,preview=null,recordToken=0;
const fresh=()=>({id:crypto.randomUUID(),name:'Untitled Split Link',duration:0,master:false,areas:presets.map(([name,x,y],i)=>({id:'preset'+i,name,x,y,mode:'master',hasAudio:false}))});
try{project=JSON.parse(localStorage.getItem(KEY))||fresh()}catch{project=fresh()}
selected=project.areas[0]?.id;
const persist=()=>{localStorage.setItem(KEY,JSON.stringify(project));render()};
const fmt=s=>{s=Math.max(0,Number(s)||0);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0')+'.'+Math.floor(s%1*10)};
const uid=id=>project.id+'-'+id;
const store=(key,blob)=>new Promise((resolve,reject)=>{const t=db.transaction('clips','readwrite');t.objectStore('clips').put(blob,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error)});
const fetchBlob=key=>new Promise((resolve,reject)=>{const t=db.transaction('clips','readonly').objectStore('clips').get(key);t.onsuccess=()=>resolve(t.result||null);t.onerror=()=>reject(t.error)});
const remove=key=>new Promise((resolve,reject)=>{const t=db.transaction('clips','readwrite');t.objectStore('clips').delete(key);t.oncomplete=resolve;t.onerror=()=>reject(t.error)});
async function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('clips');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
const status=(text,red=false)=>{$('recStatus').textContent=text;$('recStatus').classList.toggle('rec',red)};
function render(){
 $('linkName').value=project.name;$('masterTime').textContent=fmt(project.duration);
 $('areaName').value=project.areas.find(a=>a.id===selected)?.name||'';
 const markers=$('mapMarkers'),legend=$('regionLegend'),list=$('areas');markers.replaceChildren();legend.replaceChildren();list.replaceChildren();
 for(const area of project.areas){
  const ns='http://www.w3.org/2000/svg',g=document.createElementNS(ns,'g');g.setAttribute('class','region'+(selected===area.id?' active':'')+(area.hasAudio?' recorded':''));g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-label',area.name);g.setAttribute('transform','translate('+area.x+' '+area.y+')');
  const circle=document.createElementNS(ns,'circle');circle.setAttribute('r','13');const text=document.createElementNS(ns,'text');text.textContent=String(project.areas.indexOf(area)+1);text.setAttribute('text-anchor','middle');text.setAttribute('y','4');g.append(circle,text);
  g.onclick=()=>select(area.id);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(area.id)}};markers.appendChild(g);
  const btn=document.createElement('button');btn.textContent=(project.areas.indexOf(area)+1)+'. '+area.name;btn.style.textAlign='left';if(selected===area.id)btn.classList.add('primary');btn.onclick=()=>select(area.id);legend.appendChild(btn);
  const row=document.createElement('div');row.className='row'+(selected===area.id?' selected':'');
  const left=document.createElement('div');left.innerHTML='<span class="slotName"></span><small></small>';left.querySelector('span').textContent=area.name;
  left.querySelector('small').textContent=(area.mode==='alt'&&area.hasAudio?'ALT RECORDED':area.mode==='alt'?'ALT MISSING':'MASTER FEED')+' · '+fmt(project.duration);
  left.onclick=()=>select(area.id);left.style.cursor='pointer';
  const actions=document.createElement('div');actions.className='toolbar';
  const change=document.createElement('button');change.textContent=area.mode==='alt'?'ALT':'MASTER';change.onclick=()=>{area.mode=area.mode==='alt'?'master':'alt';persist()};
  const edit=document.createElement('button');edit.textContent='SELECT';edit.onclick=()=>select(area.id);
  actions.append(change,edit);row.append(left,actions);list.appendChild(row);
 }
 const a=project.areas.find(a=>a.id===selected);
 $('areaStatus').textContent=a? a.name+' · '+(a.mode==='alt'?(a.hasAudio?'alternative ready':'record an alternative'):'inherits master'):'No area selected';
 $('recordArea').disabled=!a||!project.duration||!!recorder;
 $('recordMaster').disabled=!!recorder;$('stopRec').disabled=!recorder;
 $('exportMaster').disabled=!project.master;
 $('listenMaster').disabled=!project.master;
 $('listenArea').disabled=!a||!(a.mode==='alt'?a.hasAudio:project.master);
 $('exportArea').disabled=$('listenArea').disabled;
 $('useMaster').disabled=!a;
}
function select(id){selected=id;render()}
function stopPreview(){if(preview){preview.pause();URL.revokeObjectURL(preview.src);preview=null}}
async function play(blob){stopPreview();if(!blob)return status('Nothing recorded yet');const url=URL.createObjectURL(blob);preview=new Audio(url);preview.onended=stopPreview;try{await preview.play()}catch(e){status('Audio preview: '+e.message)}}
async function startRecording(mode){
 if(recorder)return;
 if(mode!=='master'&&!project.duration)return status('Record or import a master first');
 stopPreview();const token=++recordToken;
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  if(token!==recordToken){stream.getTracks().forEach(t=>t.stop());return}
  if(mode!=='master'){
   for(let n=3;n>0;n--){status('Recording '+project.areas.find(a=>a.id===selected)?.name+' in '+n+'…',true);await new Promise(r=>setTimeout(r,1000));if(token!==recordToken){stream.getTracks().forEach(t=>t.stop());return}}
  }
  chunks=[];recordMode=mode;
  const options=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));
  recorder=new MediaRecorder(stream,options?{mimeType:options}:undefined);
  const areaAtStart=selected,started=performance.now();
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  recorder.onstop=async()=>{
   clearInterval(timer);timer=null;const blob=new Blob(chunks,{type:recorder.mimeType});recorder=null;
   stream.getTracks().forEach(t=>t.stop());stream=null;
   try{
    if(mode==='master'){const ctx=new AudioContext();const raw=await ctx.decodeAudioData(await blob.arrayBuffer());project.duration=raw.duration;await ctx.close();project.master=true;await store(uid('master'),blob)}
    else{const area=project.areas.find(a=>a.id===areaAtStart);if(area){area.mode='alt';area.hasAudio=true;await store(uid(area.id),blob)}}
    status('Recording saved · '+fmt(project.duration)+' slot');persist();
   }catch(e){status('Save failed: '+e.message)}
  };
  recorder.start(200);recordStart=performance.now();status('● RECORDING '+(mode==='master'?'MASTER':'REGIONAL TAKE'),true);
  timer=setInterval(()=>{const elapsed=(performance.now()-recordStart)/1000;$('progress').style.width=(mode==='master'?Math.min(100,elapsed/180*100):Math.min(100,elapsed/project.duration*100))+'%';$('masterTime').textContent=mode==='master'?fmt(elapsed):fmt(Math.max(0,project.duration-elapsed));if(mode!=='master'&&elapsed>=project.duration)stopRecording()},75);render();
 }catch(e){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}status('Microphone: '+e.message)}
}
function stopRecording(){++recordToken;if(recorder&&recorder.state!=='inactive')recorder.stop();clearInterval(timer);timer=null;$('progress').style.width='0%';status('Processing recording…')}
async function toWav(blob,duration){
 const ctx=new AudioContext({sampleRate:48000});let raw;
 try{raw=await ctx.decodeAudioData(await blob.arrayBuffer())}finally{await ctx.close()}
 const frames=Math.max(1,Math.round(duration*48000)),out=new ArrayBuffer(44+frames*2*2),view=new DataView(out);
 const str=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i))};
 str(0,'RIFF');view.setUint32(4,out.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,48000,true);view.setUint32(28,192000,true);view.setUint16(32,4,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,frames*4,true);
 const offline=new OfflineAudioContext(2,frames,48000),source=offline.createBufferSource();source.buffer=raw;source.connect(offline.destination);source.start(0);const rendered=await offline.startRendering();
 for(let i=0;i<frames;i++)for(let ch=0;ch<2;ch++){const sample=rendered.getChannelData(ch)[i]||0;view.setInt16(44+(i*2+ch)*2,Math.round(Math.max(-1,Math.min(1,sample))*32767),true)}
 return new Blob([out],{type:'audio/wav'});
}
const safe=s=>String(s||'split').replace(/[^a-z0-9-_]+/ig,'_').slice(0,70);
function download(blob,name){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
async function exportClip(area){
 const master=await fetchBlob(uid('master'));const blob=area?.mode==='alt'?await fetchBlob(uid(area.id)):master;
 if(!blob){status('Missing recording for '+(area?.name||'master'));return false}
 status('Rendering aligned WAV…');
 const wav=await toWav(blob,project.duration);download(wav,safe(project.name)+'_'+safe(area?.name||'MASTER')+'.wav');status('Exported '+(area?.name||'master')+' · '+fmt(project.duration));return true;
}
$('recordMaster').onclick=()=>startRecording('master');$('recordArea').onclick=()=>startRecording('area');$('stopRec').onclick=stopRecording;
$('listenMaster').onclick=async()=>play(await fetchBlob(uid('master')));
$('exportMaster').onclick=()=>exportClip(null);
$('useMaster').onclick=()=>{const a=project.areas.find(a=>a.id===selected);if(a){a.mode='master';persist()}};
$('listenArea').onclick=async()=>{const a=project.areas.find(a=>a.id===selected);if(a)play(await fetchBlob(uid(a.mode==='alt'?a.id:'master')))};
$('exportArea').onclick=()=>{const a=project.areas.find(a=>a.id===selected);if(a)exportClip(a)};
$('linkName').onchange=e=>{project.name=e.target.value;persist()};
$('areaName').onchange=e=>{const a=project.areas.find(a=>a.id===selected);if(a){a.name=e.target.value.trim()||a.name;persist()}};
$('newArea').onclick=()=>{const name=prompt('Name of new split area / outlet');if(!name?.trim())return;const i=project.areas.length;const id='area'+crypto.randomUUID();project.areas.push({id,name:name.trim(),x:260+(i%4)*23,y:100+(i%9)*28,mode:'master',hasAudio:false});selected=id;persist()};
$('importMaster').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const ctx=new AudioContext();const buf=await ctx.decodeAudioData(await file.arrayBuffer());project.duration=buf.duration;await ctx.close();await store(uid('master'),file);project.master=true;status('Master imported · '+fmt(project.duration));persist()}catch(err){status('Import failed: '+err.message)}e.target.value=''};
$('exportAll').onclick=async()=>{if(!project.master)return status('Record a master first');const manifest={name:project.name,durationSeconds:project.duration,sampleRate:48000,exportedAt:new Date().toISOString(),areas:project.areas.map(a=>({name:a.name,source:a.mode==='alt'?'alternative':'master',recorded:!!a.hasAudio}))};download(new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}),safe(project.name)+'_manifest.json');await exportClip(null);for(const a of project.areas){const ok=await exportClip(a);if(!ok)break}status('Export completed. Check downloads for WAVs and manifest.')};
$('resetProject').onclick=()=>{if(!confirm('Start a new split project? Export your current recordings first.'))return;stopPreview();project=fresh();selected=project.areas[0].id;persist();status('New project ready')};
window.addEventListener('beforeunload',()=>{stopPreview();if(stream)stream.getTracks().forEach(t=>t.stop())});
openDb().then(x=>{db=x;render();status('Split Links ready · recordings saved in this browser')}).catch(e=>status('Local storage unavailable: '+e.message));
render();
})();
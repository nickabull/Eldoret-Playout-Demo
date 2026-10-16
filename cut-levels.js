/* Sample-peak normalisation. The original file and fade envelopes are unchanged. */
(()=>{'use strict';
const KEY='bullshits-cut-levels-v1',DEFAULT=-3,MAX_BOOST=36;
const bindings=new Map();let decoder=null;
const stored=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
function profile(item){return {enabled:true,targetDb:DEFAULT,...item?.audioLevel,...stored()[item?.audioKey]}}
function gainFor(p){
 if(!p.enabled||!Number.isFinite(p.peakDb))return 0;
 return Math.min(MAX_BOOST,clamp(Number(p.targetDb)||0,-24,0)-p.peakDb);
}
async function peakOf(buffer){
 let peak=0;
 for(let ch=0;ch<buffer.numberOfChannels;ch++){
  const samples=buffer.getChannelData(ch);
  for(let offset=0;offset<samples.length;offset+=1048576){
   const end=Math.min(samples.length,offset+1048576);
   for(let i=offset;i<end;i++){const n=Math.abs(samples[i]);if(Number.isFinite(n)&&n>peak)peak=n}
   if(end<samples.length)await new Promise(resolve=>setTimeout(resolve,0));
  }
 }
 return peak>1e-9?20*Math.log10(peak):null;
}
async function analyse(item,file){
 const bytes=file?await file.arrayBuffer():await fetch(item.url).then(r=>{if(!r.ok)throw Error('Audio could not be read');return r.arrayBuffer()});
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 const audioKey=Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
 const previous=stored()[audioKey];
 if(previous&&previous.analysed===true){item.audioKey=audioKey;item.audioLevel={...previous};return item.audioLevel}
 const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 if(!Offline)throw Error('Audio analysis is unavailable in this browser');
 decoder=decoder||new Offline(1,1,48000);
 const decoded=await decoder.decodeAudioData(bytes);
 const p={analysed:true,peakDb:await peakOf(decoded),enabled:true,targetDb:DEFAULT};
 item.audioKey=audioKey;item.audioLevel=p;
 const db=stored();db[audioKey]=p;localStorage.setItem(KEY,JSON.stringify(db));
 return p;
}
function apply(audio,item){
 if(!audio||!item)return;
 const p=profile(item),db=gainFor(p);
 if(typeof window.bullAudioGain!=='function')return;
 window.bullAudioGain(audio,Math.pow(10,db/20));
 for(const [other] of bindings)if(other!==audio&&other.paused)bindings.delete(other);
 bindings.set(audio,item);
}
function find(artist,title,id){
 const items=[...(typeof log==='undefined'?[]:log),...(typeof lib==='undefined'?[]:lib)];
 return items.find(x=>x.id===id&&x.url)||items.find(x=>x.artist===artist&&x.title===title&&x.url)||null;
}
function editor(box,item){
 const section=document.createElement('section');section.className='bullCutLevel';
 section.style.cssText='border:1px solid #4c718c;border-radius:8px;padding:14px;margin:16px 0;background:#081c2b';
 section.innerHTML='<h3 style="margin:0 0 10px">AUDIO LEVEL · PEAK NORMALISATION</h3><p data-level-status role="status">Reading audio level…</p><label style="display:flex;gap:8px;align-items:center"><input data-level-enabled type="checkbox" style="width:auto"> Normalise this cut</label><label>Target sample peak (dBFS)<input data-level-target type="number" min="-24" max="0" step="0.1" value="-3"></label><input data-level-slider aria-label="Target sample peak in dBFS" type="range" min="-24" max="0" step="0.1" value="-3"><p data-level-gain></p><button type="button" data-level-reset>RESET TO −3 dBFS</button><p style="font-size:12px;color:#a5bdcd">Applies to this audio file in decks, carts and previews. Save the cut card to apply. Original file unchanged. Sample-peak normalisation does not match perceived loudness.</p>';
 box.appendChild(section);
 const get=s=>section.querySelector(s),status=get('[data-level-status]'),enabled=get('[data-level-enabled]'),target=get('[data-level-target]'),slider=get('[data-level-slider]'),result=get('[data-level-gain]');
 let p=profile(item),ready=!!p.analysed;
 const fmt=n=>(n>0?'+':'')+n.toFixed(1);
 function paint(){
  const valid=target.value.trim()!==''&&Number.isFinite(Number(target.value))&&Number(target.value)>=-24&&Number(target.value)<=0;
  if(!ready){result.textContent='';return}
  if(!valid){result.textContent='Enter a target between −24 and 0 dBFS.';return}
  const next={...p,enabled:enabled.checked,targetDb:Number(target.value)},db=gainFor(next);
  result.textContent=p.peakDb===null?'Silent / near-silent cut · no gain applied.':(next.enabled?'Playback gain '+fmt(db)+' dB · estimated peak '+fmt(p.peakDb+db)+' dBFS'+(db===MAX_BOOST?' · boost limited to +36 dB':''):'Normalisation bypassed · original level');
  target.disabled=slider.disabled=!ready||!enabled.checked;
 }
 enabled.checked=p.enabled!==false;target.value=slider.value=String(p.targetDb??DEFAULT);
 target.oninput=()=>{slider.value=target.value;paint()};slider.oninput=()=>{target.value=slider.value;paint()};enabled.onchange=paint;
 get('[data-level-reset]').onclick=()=>{enabled.checked=true;target.value=slider.value=String(DEFAULT);paint()};
 function report(){status.textContent=p.peakDb===null?'Source: silent / near-silent':'Source sample peak: '+fmt(p.peakDb)+' dBFS';paint()}
 if(!item){status.textContent='Import this audio into the main desk to measure and adjust its level.';enabled.disabled=target.disabled=slider.disabled=true;get('[data-level-reset]').disabled=true}
 else if(ready)report();
 else{
  enabled.disabled=target.disabled=slider.disabled=true;
  analyse(item).then(data=>{p=data;ready=true;enabled.disabled=false;enabled.checked=p.enabled!==false;target.value=slider.value=String(p.targetDb);report()}).catch(err=>{status.textContent='Level analysis unavailable: '+err.message;get('[data-level-reset]').disabled=true});
 }
 return {save(){
  if(!item||!ready)return;
  const n=Number(target.value);if(target.value.trim()===''||!Number.isFinite(n)||n< -24||n>0)throw Error('Level target must be between −24 and 0 dBFS');
  const next={...p,enabled:enabled.checked,targetDb:n},db=stored();db[item.audioKey]=next;localStorage.setItem(KEY,JSON.stringify(db));item.audioLevel=next;
  for(const [audio,cut] of [...bindings])if(cut.audioKey===item.audioKey)apply(audio,cut);
 }};
}
window.bullAnalyseImportedCut=analyse;
window.bullApplyCutLevel=apply;
window.bullFindCutAudio=find;
window.bullCutLevelEditor=editor;
// Pure functions retained for diagnostic checks.
window.bullCutLevelMath={peakOf,gainFor};
})();

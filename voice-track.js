/* Eldoret three-way voice track editor v0.5.5: browser prototype */
(()=>{
 const root=document.createElement('div');root.id='vtModal';root.className='vtOverlay';root.hidden=true;
 root.innerHTML='<section class="vtCard"><header><h2>THREE-WAY SEGUE · VOICE TRACK</h2><button id="vtClose">✕ CLOSE</button></header><p>Song A → recorded microphone → Song B. Select two consecutive playable items in the running order.</p><div class="vtTracks"><div class="vtTrack vtOut"><b>OUT · A</b><span id="vtOutName">—</span></div><div class="vtTrack vtMic"><b>MIC · VT</b><span id="vtMicName">Not recorded</span></div><div class="vtTrack vtIn"><b>IN · B</b><span id="vtInName">—</span></div></div><div class="vtFields"><label>Song A tail (seconds)<input id="vtTail" type="number" min="1" max="60" value="12"></label><label>Mic begins (seconds into tail)<input id="vtMicAt" type="number" min="0" max="60" value="2"></label><label>Song B begins (seconds into tail)<input id="vtInAt" type="number" min="0" max="120" value="9"></label></div><div class="vtActions"><button id="vtRecord">● RECORD MIC</button><button id="vtStop">■ STOP RECORDING</button><button id="vtPreview">▶ PREVIEW MIX</button><button id="vtSave">SAVE TRANSITION</button></div><div id="vtMessage" role="status">Choose an item in the running order, then open this editor.</div></section>';
 document.body.append(root);
 const q=id=>document.getElementById(id);let chunks=[],rec=null,stream=null,micBlob=null,micUrl=null,previewing=[],previewTimer=null;
 const message=s=>q('vtMessage').textContent=s;
 const selected=()=>{const i=log.findIndex(x=>x.id===sel);return [i,log[i],log[i+1]]};
 function refresh(){const [i,a,b]=selected();q('vtOutName').textContent=a?.title||'Select outgoing song';q('vtInName').textContent=b?.title||'No following item';q('vtMicName').textContent=micBlob?'Voice recording ready':'Not recorded';if(a?.voiceTransition){q('vtTail').value=a.voiceTransition.tail;q('vtMicAt').value=a.voiceTransition.micAt;q('vtInAt').value=a.voiceTransition.inAt;message('Saved transition metadata found. Record a new voice track to replace audio.')}else message('Record your microphone, then preview and save the transition.')}
 q('vtClose').onclick=()=>{root.hidden=true;stopPreview()};
 q('voiceTrackBtn').onclick=()=>{refresh();root.hidden=false};
 q('vtRecord').onclick=async()=>{
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){message('Microphone recording is not supported in this browser.');return}
  try{stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];rec=new MediaRecorder(stream);rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=()=>{micBlob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});if(micUrl)URL.revokeObjectURL(micUrl);micUrl=URL.createObjectURL(micBlob);stream?.getTracks().forEach(t=>t.stop());stream=null;q('vtMicName').textContent='Recorded voice · '+Math.round(micBlob.size/1024)+' KB';message('Voice recorded. Preview the three-way mix, then save.')};rec.start();message('RECORDING · Speak into your microphone. Press STOP when finished.')}
  catch(e){message('Microphone access failed: '+e.message)}
 };
 q('vtStop').onclick=()=>{if(rec?.state==='recording')rec.stop()};
 function stopPreview(){previewing.forEach(a=>{a.pause();a.src=''});previewing=[];if(previewTimer)clearTimeout(previewTimer);previewTimer=null}
 q('vtPreview').onclick=async()=>{
  const [,a,b]=selected();if(!a?.url||!b?.url||!micUrl){message('You need two playable local audio files and a recorded microphone first.');return}
  stopPreview();const tail=Number(q('vtTail').value)||12,micAt=Number(q('vtMicAt').value)||0,inAt=Number(q('vtInAt').value)||0;
  const out=new Audio(a.url),voice=new Audio(micUrl),incoming=new Audio(b.url);previewing=[out,voice,incoming];
  out.currentTime=Math.max(0,(a.dur||0)-tail);incoming.currentTime=b.markers?.start||b.cue||0;
  const later=(ms,fn)=>{const t=setTimeout(fn,ms);previewing.push({pause:()=>clearTimeout(t),src:''})};
  try{await out.play();later(micAt*1000,()=>voice.play().catch(()=>{}));later(inAt*1000,()=>incoming.play().catch(()=>{}));message('Previewing three-way transition through browser speakers.')}
  catch(e){message('Preview failed: '+e.message)}
 };
 q('vtSave').onclick=async()=>{
  const [i,a,b]=selected();if(!a||!b||!micBlob){message('Select two consecutive items and record your voice first.');return}
  const tail=Number(q('vtTail').value),micAt=Number(q('vtMicAt').value),inAt=Number(q('vtInAt').value);
  if(![tail,micAt,inAt].every(Number.isFinite)||tail<=0||micAt<0||inAt<0){message('Check transition timing values.');return}
  try{
   const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('eldoret-voice-tracks',1);request.onupgradeneeded=()=>request.result.createObjectStore('audio');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
   await new Promise((resolve,reject)=>{const tx=db.transaction('audio','readwrite');tx.objectStore('audio').put(micBlob,a.id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
   db.close();a.voiceTransition={tail,micAt,inAt,nextId:b.id,voiceKey:a.id};localStorage.setItem('eldoret-demo',JSON.stringify(log));message('Saved microphone audio locally in this browser and transition timing in the running order. Automatic on-air playback is not wired yet.');render();
  }catch(e){message('Could not save recording: '+e.message)}
 };
})();

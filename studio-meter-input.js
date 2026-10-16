/* Real level sources. USB capture is analysed only; never monitored to speakers. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),key='bullshits-audio-levels-v1';
 let packet=null,bus=null,stream=null,ctx=null,nodes=[],source=null,generation=0;
 function accept(p){if(p?.kind==='software-levels'&&Number.isFinite(p.at)&&Array.isArray(p.db)&&p.db.length===2&&p.db.every(Number.isFinite))packet=p}
 try{bus=new BroadcastChannel(key);bus.onmessage=e=>accept(e.data)}catch(e){}
 function stored(){try{accept(JSON.parse(localStorage.getItem(key)||'null'))}catch(e){}}
 window.addEventListener('storage',e=>{if(e.key===key)stored()});stored();
 const fresh=()=>packet&&Date.now()-packet.at<3000&&packet.state==='running';
 function db(a){const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);let peak=0;for(const x of data)peak=Math.max(peak,Math.abs(x));return peak?20*Math.log10(peak):-100}
 window.bullMonitorLevels=()=>[...(fresh()?packet.db:[-100,-100]),...(ctx?.state==='running'&&stream?.active?nodes.map(db):[-100,-100])];
 window.bullMonitorCaption=label=>label==='PLAYOUT'?(fresh()?'LIVE SOFTWARE · −18 dBFS = PPM 4':'OPEN / PLAY MAIN DESK HERE'):(stream?.active?'LIVE USB · −18 dBFS = PPM 4':'USB RETURN NOT CONNECTED');
 setInterval(()=>{$('connection').textContent=fresh()?'Main Desk levels connected in this browser':'Waiting for Main Desk audio in this browser';$('mode').textContent=fresh()?'LIVE SOFTWARE LEVELS':'WAITING FOR AUDIO';},500);
 async function devices(){const selected=$('usbInput').value,list=await navigator.mediaDevices.enumerateDevices();$('usbInput').replaceChildren(new Option('Default recording input',''));for(const d of list.filter(d=>d.kind==='audioinput'))$('usbInput').add(new Option(d.label||'Recording input '+($('usbInput').length),d.deviceId));if([...$('usbInput').options].some(o=>o.value===selected))$('usbInput').value=selected}
 function stop(message='USB return: disconnected'){generation++;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;source?.disconnect();source=null;nodes=[];if(ctx)ctx.close().catch(()=>{});ctx=null;$('usbConnect').textContent='CONNECT USB RETURN';$('usbStatus').textContent=message}
 $('usbConnect').onclick=async()=>{
  if(stream){stop();return}const token=++generation;$('usbConnect').disabled=true;
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Audio input is unavailable in this browser');
   ctx=new (window.AudioContext||window.webkitAudioContext)();await ctx.resume();
   const device=$('usbInput').value;
   const captured=await navigator.mediaDevices.getUserMedia({audio:{...(device?{deviceId:{exact:device}}:{}),channelCount:{ideal:2},echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
   if(token!==generation){captured.getTracks().forEach(t=>t.stop());return}stream=captured;
   source=ctx.createMediaStreamSource(stream);const split=ctx.createChannelSplitter(2);source.connect(split);
   nodes=[0,1].map(ch=>{const a=ctx.createAnalyser();a.fftSize=2048;split.connect(a,ch);return a});
   const track=stream.getAudioTracks()[0];track.onended=()=>stop('USB return: input disconnected');
   $('usbConnect').textContent='DISCONNECT USB RETURN';$('usbStatus').textContent='USB return: '+track.label+(track.getSettings().channelCount===1?' (mono input)':'');await devices();
  }catch(e){if(token===generation)stop('USB return: '+e.message)}finally{$('usbConnect').disabled=false}
 };
 $('usbInput').onchange=()=>stop('USB return: input changed; reconnect to start');
 navigator.mediaDevices?.addEventListener?.('devicechange',()=>{stop('USB return: devices changed; reconnect to start');devices().catch(()=>{})});
 devices().catch(()=>{});window.addEventListener('pagehide',()=>stop());
})();

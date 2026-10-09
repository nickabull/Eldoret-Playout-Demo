/* Eldoret stereo software output meter v0.5.3 - actual browser audio analysis */
(()=>{
 const canvas=document.getElementById('masterMeter');if(!canvas)return;
 const label=document.getElementById('meterStatus');
 let ctx=null,analyser=null,sourceCount=0,ready=false;
 const registered=new WeakSet();
 function init(){
  if(ctx)return true;
  try{ctx=new (window.AudioContext||window.webkitAudioContext)();analyser=ctx.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.12;analyser.connect(ctx.destination);ready=true;label.textContent='SOFTWARE MIX · A/B/C/D';return true}
  catch(e){label.textContent='Audio metering unavailable';return false}
 }
 function register(el){
  if(!el||registered.has(el)||!init())return;
  try{const source=ctx.createMediaElementSource(el);source.connect(analyser);registered.add(el);sourceCount++;ctx.resume().catch(()=>{})}
  catch(e){console.warn('Eldoret meter source',e)}
 }
 window.eldoretMeterRegister=register;
 document.addEventListener('pointerdown',()=>{if(ctx?.state==='suspended')ctx.resume().catch(()=>{})},{passive:true});
 register(document.getElementById('deckA'));register(document.getElementById('deckB'));
 const left=new Float32Array(2048),right=new Float32Array(2048);
 // Stereo analyser: split left and right before destination to retain channel separation.
 const splitter=ctx?.createChannelSplitter(2),analysers=[];
 if(ctx&&splitter){try{
  analyser.disconnect();analyser.connect(splitter);
  for(let ch=0;ch<2;ch++){const a=ctx.createAnalyser();a.fftSize=2048;a.smoothingTimeConstant=0;splitter.connect(a,ch);analysers.push(a)}
  // Keep audio audible by passing the original stereo signal to speakers.
  analyser.connect(ctx.destination);
 }catch(e){console.warn(e)}}
 const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 const peaks=[0,0],holds=[0,0],holdUntil=[0,0];
 function frame(){
  g.clearRect(0,0,w,h);g.fillStyle='#06121e';g.fillRect(0,0,w,h);
  const dbMarks=[-48,-36,-24,-18,-12,-6,-3,0];
  const x0=24,x1=w-35,width=x1-x0;
  function xpos(db){return x0+Math.max(0,Math.min(1,(db+48)/48))*width}
  for(const db of dbMarks){const x=xpos(db);g.strokeStyle='#284257';g.beginPath();g.moveTo(x,7);g.lineTo(x,h-16);g.stroke();g.fillStyle='#96acc1';g.font='10px Segoe UI';g.fillText(String(db),x-9,h-3)}
  for(let ch=0;ch<2;ch++){
   const data=ch===0?left:right;const a=analysers[ch];
   let peak=0;
   if(a&&ctx.state==='running'){a.getFloatTimeDomainData(data);for(let i=0;i<data.length;i++){const v=Math.abs(data[i]);if(v>peak)peak=v}}
   const db=peak>0?20*Math.log10(peak):-60;
   peaks[ch]=Math.max(db,peaks[ch]-.8);
   if(db>holds[ch]||performance.now()>holdUntil[ch]){holds[ch]=db;holdUntil[ch]=performance.now()+1400}
   const y=ch===0?16:43,barW=Math.max(0,xpos(peaks[ch])-x0);
   const grad=g.createLinearGradient(x0,0,x1,0);grad.addColorStop(0,'#139e71');grad.addColorStop(.7,'#40dba1');grad.addColorStop(.88,'#f4c348');grad.addColorStop(1,'#ed4b4b');
   g.fillStyle='#102b37';g.fillRect(x0,y,width,15);
   g.fillStyle=grad;g.fillRect(x0,y,barW,15);
   g.fillStyle='#fff';g.fillRect(xpos(holds[ch])-1,y-2,2,19);
   g.fillStyle='#b9d7ea';g.font='bold 12px Segoe UI';g.fillText(ch===0?'L':'R',7,y+12);
  }
  requestAnimationFrame(frame);
 }
 frame();
})();

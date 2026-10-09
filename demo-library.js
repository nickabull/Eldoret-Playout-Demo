/* Eldoret v0.5.7 - original synthesised demo audio, no third-party recordings */
(()=>{
 const btn=document.getElementById('loadDemoLibrary');if(!btn)return;
 const tunes=[
  {title:'Sunrise Drive',artist:'Eldoret Demo · Upbeat Pop',bpm:122,root:220,progression:[0,5,7,3],wave:'bright'},
  {title:'Night Shift',artist:'Eldoret Demo · Synthwave',bpm:106,root:164.81,progression:[0,3,8,5],wave:'warm'},
  {title:'Studio Groove',artist:'Eldoret Demo · Funk',bpm:114,root:196,progression:[0,7,5,3],wave:'pluck'},
  {title:'News Bed',artist:'Eldoret Demo · Instrumental Bed',bpm:118,root:146.83,progression:[0,5,3,7],wave:'bed'},
  {title:'Station Sting',artist:'Eldoret Demo · Jingle',bpm:132,root:261.63,progression:[0,5,7,12],wave:'sting'}
 ];
 function makeWav(tune){
  const sr=16000,duration=tune.wave==='sting'?5:20,n=sr*duration,buf=new ArrayBuffer(44+n*2),v=new DataView(buf);
  const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
  str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);
  const beat=60/tune.bpm,scale=[0,2,4,7,9,12,14,16];
  for(let i=0;i<n;i++){
   const t=i/sr,step=Math.floor(t/beat),bar=Math.floor(step/4),chord=tune.progression[bar%4],freq=tune.root*Math.pow(2,chord/12);
   const pulse=t%beat,env=Math.exp(-pulse*9),kick=Math.sin(2*Math.PI*(55*pulse-24*pulse*pulse))*Math.exp(-pulse*23);
   const snare=(step%4===1||step%4===3)?Math.sin(2*Math.PI*140*pulse)*Math.exp(-pulse*28):0;
   const hat=(Math.sin(2*Math.PI*6000*t)+Math.sin(2*Math.PI*3901*t))*.5*Math.exp(-(t%(beat/2))*35);
   const bass=Math.sin(2*Math.PI*freq/2*t)*(.20+.11*env);
   const note=scale[Math.floor(t/(beat/2))%scale.length];
   const leadFreq=freq*Math.pow(2,note/12);
   const lead=(Math.sin(2*Math.PI*leadFreq*t)+.24*Math.sin(2*Math.PI*leadFreq*2*t))*.17*Math.exp(-(t%(beat/2))* (tune.wave==='bed'?3:9));
   const pad=(Math.sin(2*Math.PI*freq*t)+Math.sin(2*Math.PI*freq*1.5*t)+Math.sin(2*Math.PI*freq*2*t))*.07;
   let sample=tune.wave==='bed'?bass*.6+pad+lead*.45:kick*.22+snare*.08+hat*.045+bass+lead+pad;
   if(tune.wave==='sting')sample=lead*1.8+pad+kick*.14;
   const fade=Math.min(1,t/.15,(duration-t)/.5);sample=Math.max(-1,Math.min(1,sample*Math.max(0,fade)));
   v.setInt16(44+i*2,Math.round(sample*28000),true);
  }
  return {blob:new Blob([buf],{type:'audio/wav'}),duration};
 }
 btn.onclick=()=>{
  if(lib.some(x=>x.demoAudio)){btn.textContent='DEMO AUDIO LOADED';return}
  btn.disabled=true;btn.textContent='GENERATING AUDIO…';
  setTimeout(()=>{
   try{
    tunes.forEach(t=>{const {blob,duration}=makeWav(t);lib.push({id:crypto.randomUUID(),title:t.title,artist:t.artist,dur:duration,url:URL.createObjectURL(blob),demoAudio:true})});
    library();renderCarts();btn.textContent='DEMO AUDIO LOADED';toast('Five original demo cuts ready to play');
   }catch(e){btn.disabled=false;btn.textContent='LOAD DEMO LIBRARY';toast('Demo generation failed: '+e.message)}
  },30);
 };
})();

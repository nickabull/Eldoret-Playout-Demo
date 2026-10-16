/* Stereo-linked 5 ms lookahead sample-peak limiter. Not a true-peak limiter. */
class BullLimiter extends AudioWorkletProcessor {
 constructor(){super();this.delay=Math.ceil(sampleRate*.005);this.size=this.delay+1;this.rings=[new Float32Array(this.size),new Float32Array(this.size)];this.peaks=new Float32Array(this.size);this.indices=new Float64Array(this.size);this.head=0;this.tail=0;this.count=0;this.n=0;this.gain=1;this.release=1-Math.exp(-1/(sampleRate*.08));this.ceiling=Math.pow(10,-1/20);this.blocks=0;}
 process(inputs,outputs){const input=inputs[0],out=outputs[0];if(!out?.length)return true;let minGain=1;
  for(let i=0;i<out[0].length;i++,this.n++){
   const slot=this.n%this.size;let peak=0;
   for(let ch=0;ch<2;ch++){let x=input[ch]?.[i]??input[0]?.[i]??0;if(!Number.isFinite(x))x=0;this.rings[ch][slot]=x;peak=Math.max(peak,Math.abs(x));}
   while(this.count&&this.indices[this.head]<this.n-this.delay){this.head=(this.head+1)%this.size;this.count--;}
   while(this.count){const last=(this.tail-1+this.size)%this.size;if(this.peaks[last]>peak)break;this.tail=last;this.count--;}
   this.peaks[this.tail]=peak;this.indices[this.tail]=this.n;this.tail=(this.tail+1)%this.size;this.count++;
   const target=Math.min(1,this.ceiling/Math.max(this.peaks[this.head],1e-12));this.gain=Math.min(target,this.gain+this.release*(1-this.gain));minGain=Math.min(minGain,this.gain);
   for(let ch=0;ch<out.length;ch++)out[ch][i]=this.n<this.delay?0:this.rings[Math.min(ch,1)][(this.n-this.delay)%this.size]*this.gain;
  }
  if(++this.blocks%16===0)this.port.postMessage({reduction:20*Math.log10(Math.max(minGain,1e-12))});return true;
 }
}
registerProcessor('bull-limiter',BullLimiter);

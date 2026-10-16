const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Audio {
 constructor(){this.paused=true;this.ended=false;this.currentTime=0;this.duration=120;this.listeners={};this.src='';this.plays=0}
 addEventListener(k,f){(this.listeners[k]??=[]).push(f)}
 pause(){this.paused=true} removeAttribute(){this.src=''} load(){this.currentTime=0;this.ended=false}
 async play(){this.paused=false;this.plays++}
}
function setup(){
 const els=new Map();const el=id=>{if(!els.has(id))els.set(id,{textContent:'',after(){}});return els.get(id)};
 const A=new Audio(),B=new Audio(),events=[];
 const ctx={A,B,deck:A,play:-1,sel:'1',log:[1,2,3,4,5].map(i=>({id:String(i),title:'Track '+i,artist:'Test',url:'audio'+i,dur:120})),
  document:{createElement:()=>({innerHTML:'',className:'',hidden:true}),querySelector:el,getElementById:el,querySelectorAll:()=>[]},
  mm:s=>String(s),render(){ctx.bullFaderDeckRender?.()},bullResumeAudio:async()=>{},bullLog:(...x)=>events.push(x)};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('fader-decks.js','utf8'),ctx);
 const signal=(a,b,cmd=234)=>ctx.bullFaderSignal([10,cmd,0,0,0,a,b,0,0,0]);
 return {ctx,A,B,events,signal,el};
}
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const {ctx,A,B,signal,el}=setup();
 signal(0,0);assert.equal(A.src,'');
 await ctx.bullFaderArm(true);assert.equal(A.src,'audio1');assert.equal(B.src,'audio2');assert(A.paused&&B.paused);
 signal(1,1);await flush();assert.equal(A.plays+B.plays,0,'Initial high snapshot must not start decks');
 signal(0,0);await flush();assert.equal(A.src,'audio1','Lowering an unplayed deck must not consume its item');
 signal(1,0);signal(1,0);signal(1,0,226);await flush();assert.equal(A.plays,1);assert.equal(B.plays,0);
 signal(1,1);await flush();assert(!A.paused&&!B.paused,'Decks can overlap');
 signal(0,1);await flush();assert(A.paused);assert(!B.paused);assert.equal(A.src,'audio3');assert.equal(el('nowTitle').textContent,'Track 3');
 signal(0,1);assert.equal(A.src,'audio3','Duplicate down must not advance');
 signal(1,1);await flush();assert.equal(A.plays,2);assert.equal(A.src,'audio3');
 signal(1,0);await flush();assert.equal(B.src,'audio4');assert(!A.paused);
 await ctx.bullFaderArm(false);signal(0,0);assert(!A.paused,'Disarming leaves audio alone');
 await ctx.bullFaderArm(true);signal(0,0);signal(1,0);await flush();assert.equal(A.plays,2,'Raising a running deck must not restart it');
 ctx.bullFaderStopAll();await flush();assert(A.paused&&B.paused);assert.equal(A.src,'audio5');assert.equal(B.src,'audio4');
 await ctx.bullFaderPlayNext();assert.equal(B.plays,2,'NEXT chooses the earliest reserved item');
 B.ended=true;B.paused=true;B.listeners.ended[0]();await flush();assert.equal(B.src,'','End of log leaves an empty deck');
 const t=setup();await t.ctx.bullFaderArm(true);let release;t.ctx.bullResumeAudio=()=>new Promise(r=>release=r);
 t.signal(0,0);t.signal(1,0);await flush();t.signal(0,0);release();await flush();assert.equal(t.A.plays,0,'Down cancels pending async start');assert.equal(t.A.src,'audio3');
 console.log('PASS: independent starts/stops, queue reservations, preload, duplicates, arming, NEXT, end of log, and delayed-start cancellation');
})().catch(e=>{console.error(e);process.exitCode=1});

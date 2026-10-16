const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const data=new Map(),gains=[],els=[];let decodes=0;
class Element {
 constructor(){this.style={};this.fields={};this.value='';this.checked=false;this.disabled=false;this.textContent=''}
 set innerHTML(html){for(const name of ['status','enabled','target','slider','gain','reset'])this.fields['[data-level-'+name+']']=new Element()}
 querySelector(s){return this.fields[s]}appendChild(s){els.push(s)}
}
class Offline {
 async decodeAudioData(){decodes++;return {numberOfChannels:2,getChannelData:ch=>new Float32Array(ch?[.25,-.5]:[.1,-.25])}}
}
const context={crypto:webcrypto,Uint8Array,Float32Array,Math,Number,Map,JSON,Promise,setTimeout,
 localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},document:{createElement:()=>new Element()},
 OfflineAudioContext:Offline,bullAudioGain:(a,g)=>gains.push({a,g}),log:[],lib:[]};
data.set('bullshits-cut-levels-v1',JSON.stringify({legacy:{analysed:true,targetDb:-3,enabled:true,peakDb:-10},custom:{analysed:true,targetDb:-6,enabled:true,peakDb:-10}}));
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('cut-levels.js','utf8'),context);
const close=(x,y)=>assert(Math.abs(x-y)<1e-5,`${x} != ${y}`);
(async()=>{
 const math=context.bullCutLevelMath;const migrated=JSON.parse(data.get('bullshits-cut-levels-v1'));assert.equal(migrated.legacy.targetDb,-.3);assert.equal(migrated.custom.targetDb,-6);
 close(await math.peakOf({numberOfChannels:2,getChannelData:ch=>Float32Array.from(ch?[.1,-.5]:[.1,.25])}),20*Math.log10(.5));
 assert.equal(await math.peakOf({numberOfChannels:1,getChannelData:()=>new Float32Array(5)}),null);
 close(math.gainFor({enabled:true,peakDb:-10,targetDb:-3}),7);
 close(math.gainFor({enabled:true,peakDb:0,targetDb:-3}),-3);
 assert.equal(math.gainFor({enabled:false,peakDb:-10,targetDb:-3}),0);
 assert.equal(math.gainFor({enabled:true,peakDb:null,targetDb:-3}),0);
 assert.equal(math.gainFor({enabled:true,peakDb:-100,targetDb:-3}),36);
 const file={arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer},cut={id:'one',artist:'Same',title:'Title',url:'blob:one'};
 await context.bullAnalyseImportedCut(cut,file);assert.equal(decodes,1);assert.equal(cut.audioLevel.targetDb,-0.3);
 const audio={paused:false};context.bullApplyCutLevel(audio,cut);close(gains.at(-1).g,Math.pow(10,-.3/20)/.5);
 const box=new Element(),editor=context.bullCutLevelEditor(box,cut),section=els.at(-1);
 section.querySelector('[data-level-target]').value='-6';editor.save();close(gains.at(-1).g,Math.pow(10,-6/20)/.5);
 const again={};await context.bullAnalyseImportedCut(again,file);assert.equal(decodes,1,'Same file reimport reuses its measured peak');assert.equal(again.audioLevel.targetDb,-6,'Adjustment survives reimport');
 const other={artist:'Same',title:'Title'};await context.bullAnalyseImportedCut(other,{arrayBuffer:async()=>new Uint8Array([9,8,7]).buffer});assert.notEqual(other.audioKey,cut.audioKey);assert.equal(other.audioLevel.targetDb,-0.3,'Different files with same artist/title have independent levels');
 section.querySelector('[data-level-target]').value='3';assert.throws(()=>editor.save(),/between/);
 section.querySelector('[data-level-target]').value='-3';section.querySelector('[data-level-enabled]').checked=false;editor.save();close(gains.at(-1).g,1);
 console.log('PASS: stereo peaks, silence, attenuation/boost, bypass, boost cap, file analysis, saved edits, reimport, file identity, and live gain updates');
})().catch(e=>{console.error(e);process.exitCode=1});

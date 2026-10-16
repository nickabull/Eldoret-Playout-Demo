/* Photograph overlays represent reported presses, never guessed physical LEDs. */
(()=>{'use strict';const photo=document.querySelector('#consolePhoto'),mode=document.getElementById('deskMode'),message=document.getElementById('deskMessage'),key='bullshits-airlite-telemetry-v1',sources=new Map(),buttons=new Map();let localConnected=false,lastSignature='';
 const x=[175,274,375,472,572,668,767,863];
 function add(id,x,y,label){const b=document.createElement('span');b.className='console-hotspot unknown';b.style.left=x/1408*100+'%';b.style.top=y/1070*100+'%';b.dataset.id=id;b.setAttribute('role','img');b.title=label+' · unknown';b.setAttribute('aria-label',b.title);photo.append(b);buttons.set(id,{b,label})}
 for(let i=0;i<8;i++){add('ch'+(i+1)+'-cue',x[i],544,'CH '+(i+1)+' CUE');add('ch'+(i+1)+'-on',x[i],588,'CH '+(i+1)+' ON')}
 for(let i=0;i<8;i++){add('a'+(i+1),965,613+i*48.5,'A'+(i+1));add('b'+(i+1),1044,613+i*48.5,'B'+(i+1))}
 for(const [id,x,y,label] of [['aux-cue',964,543,'AUX CUE'],['air-cue',1134,542,'CUE AIR'],['ns-cue',1236,542,'CUE NS'],['nonstop',1185,206,'NONSTOP'],['voip-conn',861,365,'VOIP CONNECT'],['ann-auto',1235,666,'ANNOUNCER AUTO CUE'],['phones-reset',1235,757,'PHONES CUE RESET'],['crm-auto',1235,851,'CRM AUTO CUE'],['talk-voip',1135,953,'TALK VOIP'],['talk-ann',1185,953,'TALK ANN'],['talk-aux',1237,953,'TALK AUX']])add(id,x,y,label);
 function show(id,state,label){const item=buttons.get(id);if(!item)return;item.b.className='console-hotspot '+(state===true?'pressed':state===false?'released':'unknown');item.b.textContent=state===true?'●':state===false?'–':'?';item.b.title=item.label+' · '+label;item.b.setAttribute('aria-label',item.b.title)}
 function reset(){for(const id of buttons.keys())show(id,null,'not mapped / not observed');document.getElementById('consoleFaders').textContent='Fader switches CH4 / CH5 / CH6: awaiting report'}
 function report(bytes,at=Date.now()){
  const sig=at+':'+bytes.join(',');if(sig===lastSignature)return;lastSignature=sig;
  if(bytes[0]===4&&bytes[1]===0xc4&&bytes.length>=10){for(let bank=0;bank<2;bank++)for(let bit=0;bit<8;bit++){const down=!!(bytes[bank+2]&(1<<bit));show((bank?'b':'a')+(bit+1),down,down?'PRESSED · input report':'RELEASED · input report')}message.textContent='A/B button press/release received · '+new Date(at).toLocaleTimeString('en-GB')}
  const knownOn={'10,224,0,1,0,0,0,1,1,1':2,'10,224,0,0,1,1,1,1,1,1':3,'10,224,0,0,0,1,0,1,1,1':4};
  const ch=knownOn[bytes.join(',')];if(ch){const id='ch'+ch+'-on';show(id,true,'ON-button report observed · physical lamp state unknown');message.textContent='CH'+ch+' ON-button report observed';setTimeout(()=>show(id,null,'physical lamp state unknown'),800)}
  if(bytes.length===10&&bytes[0]===10&&bytes[1]===0xea)document.getElementById('consoleFaders').textContent='Reported fader switches: '+[4,5,6].map((ch,i)=>'CH'+ch+' '+(bytes[i+5]===1?'UP':bytes[i+5]===0?'DOWN':'UNKNOWN')).join(' · ');
 }
 function accept(p){if(!p||typeof p.sender!=='string'||!Number.isFinite(p.at)||typeof p.connected!=='boolean')return;sources.set(p.sender,p);if(p.connected&&p.report?.at&&Date.now()-p.report.at<5000&&Array.isArray(p.report.bytes))report(p.report.bytes,p.report.at);paint()}
 function paint(){const live=localConnected||[...sources.values()].some(p=>p.connected&&Date.now()-p.at<5000);mode.textContent=live?'LIVE HID · READ ONLY':'DISCONNECTED / NO LIVE FEED';mode.classList.toggle('ok',live);if(!live){reset();message.textContent='Connect the Airlite on Main Desk in this browser, or use CONNECT AIRLITE on Overview. Unknown means no verified report.'}}
 reset();
 try{const bus=new BroadcastChannel(key);bus.onmessage=e=>accept(e.data)}catch{}
 window.addEventListener('storage',e=>{if(e.key===key)try{accept(JSON.parse(e.newValue))}catch{}});
 try{accept(JSON.parse(localStorage.getItem(key)||'null'))}catch{}
 window.bullConsoleLocalConnection=value=>{localConnected=!!value;if(!value)reset();paint()};window.bullConsoleLocalReport=report;
 document.querySelectorAll('[data-mtab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-mtab]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));document.querySelectorAll('[data-mview]').forEach(x=>x.hidden=x.dataset.mview!==b.dataset.mtab)});
 document.getElementById('deskReset').onclick=reset;paint();setInterval(paint,1000);
})();

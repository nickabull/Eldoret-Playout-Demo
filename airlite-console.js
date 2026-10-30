/* Photograph overlays represent reported presses, never guessed physical LEDs. */
(()=>{'use strict';const photo=document.querySelector('#consolePhoto'),mode=document.getElementById('deskMode'),message=document.getElementById('deskMessage'),key='bullshits-airlite-telemetry-v1',sources=new Map(),buttons=new Map();let localConnected=false,lastSignature='';
 const x=[175,274,375,472,572,668,770,870];
 function add(id,x,y,label){const b=document.createElement('span');b.className='console-hotspot unknown';b.style.left=x/1408*100+'%';b.style.top=y/1070*100+'%';b.dataset.id=id;b.setAttribute('role','img');b.title=label+' · unknown';b.setAttribute('aria-label',b.title);photo.append(b);buttons.set(id,{b,label})}
 for(let i=0;i<8;i++){add('ch'+(i+1)+'-cue',x[i],544,'CH '+(i+1)+' CUE');add('ch'+(i+1)+'-on',x[i],588,'CH '+(i+1)+' ON')}
 for(let i=0;i<8;i++){const perspective=-1.1*i;add('a'+(i+1),965+perspective,613+i*48.5,'A'+(i+1));add('b'+(i+1),1044+perspective,613+i*48.5,'B'+(i+1))}
 for(const [id,x,y,label] of [['aux-cue',964,543,'AUX CUE'],['air-cue',1134,542,'CUE AIR'],['ns-cue',1236,542,'CUE NS'],['nonstop',1185,206,'NONSTOP'],['voip-conn',861,365,'VOIP CONNECT'],['ann-auto',1235,666,'ANNOUNCER AUTO CUE'],['phones-reset',1235,757,'PHONES CUE RESET'],['crm-auto',1235,851,'CRM AUTO CUE'],['talk-voip',1135,953,'TALK VOIP'],['talk-ann',1185,953,'TALK ANN'],['talk-aux',1237,953,'TALK AUX']])add(id,x,y,label);
 function show(id,state,label){const item=buttons.get(id);if(!item)return;item.b.className='console-hotspot '+(state===true?'pressed':state===false?'released':'unknown');item.b.textContent=state===true?'●':state===false?'–':'?';item.b.title=item.label+' · '+label;item.b.setAttribute('aria-label',item.b.title)}
 function reset(){for(const id of buttons.keys())show(id,null,'not mapped / not observed');document.getElementById('consoleFaders').textContent='Fader switches CH1–CH8: awaiting D&R E2 report'}
 function report(bytes,at=Date.now()){
  if(!Array.isArray(bytes)||bytes.length<2)return;
  const sig=at+':'+bytes.join(',');if(sig===lastSignature)return;lastSignature=sig;
  const size=bytes[0],cmd=bytes[1];
  // D&R Airlite USB HID Control Protocol v1.5: 0xE0/A0 ON state,
  // 0xE1/A1 CUE bitmask, 0xE2/A2 fader switches, 0xC4 A/B controls.
  // Read-only: no sendReport(), no configuration changes.
  if(size===4&&cmd===0xc4&&bytes.length>=4){
   for(let bank=0;bank<2;bank++)for(let bit=0;bit<8;bit++){
    const down=!!(bytes[bank+2]&(1<<bit));
    show((bank?'b':'a')+(bit+1),down,down?'PRESSED · D&R C4':'RELEASED · D&R C4');
   }
   message.textContent='A/B switch states · '+new Date(at).toLocaleTimeString('en-GB');
  }
  if(size===10&&(cmd===0xe0||cmd===0xa0)&&bytes.length>=10){
   for(let i=0;i<8;i++)if(bytes[i+2]===0||bytes[i+2]===1)
    show('ch'+(i+1)+'-on',bytes[i+2]===1,'ON state '+(bytes[i+2]?'ACTIVE':'INACTIVE')+' · D&R '+cmd.toString(16).toUpperCase());
   message.textContent='Channel ON states · '+new Date(at).toLocaleTimeString('en-GB');
  }
  if(size===4&&(cmd===0xe1||cmd===0xa1)&&bytes.length>=4){
   for(let i=0;i<8;i++)show('ch'+(i+1)+'-cue',!!(bytes[2]&(1<<i)),'CUE state · D&R E1/A1');
   for(const [bit,id] of [[0,'aux-cue'],[1,'ns-cue'],[2,'air-cue']])
    show(id,!!(bytes[3]&(1<<bit)),'CUE state · D&R E1/A1');
   message.textContent='CUE states · '+new Date(at).toLocaleTimeString('en-GB');
  }
  if(size===10&&(cmd===0xe2||cmd===0xa2)&&bytes.length>=10){
   const faders=[];
   for(let i=0;i<8;i++)faders.push('CH'+(i+1)+' '+(bytes[i+2]===1?'UP':bytes[i+2]===0?'DOWN':'?'));
   document.getElementById('consoleFaders').textContent='Fader switches: '+faders.join(' · ');
   message.textContent='Fader states · '+new Date(at).toLocaleTimeString('en-GB');
  }
  if(size===3&&cmd===0xe5&&bytes.length>=3)show('nonstop',bytes[2]===1,'NonStop state · D&R E5');
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

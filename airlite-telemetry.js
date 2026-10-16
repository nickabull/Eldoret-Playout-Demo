/* Read-only console mirror: no USB commands and no playout actions. */
(()=>{'use strict';const key='bullshits-airlite-telemetry-v1',sender=crypto.randomUUID();let channel=null,connected=false,lastReport=null;
 try{channel=new BroadcastChannel(key)}catch{}
 function send(){const packet={sender,at:Date.now(),connected,report:lastReport};try{channel?.postMessage(packet);localStorage.setItem(key,JSON.stringify(packet))}catch{}}
 window.bullAirliteTelemetry={connection(value){connected=!!value;if(!connected)lastReport=null;send()},report(bytes){connected=true;lastReport={at:Date.now(),bytes:Array.from(bytes)};send()}};
 setInterval(()=>{if(connected)send()},1000);window.addEventListener('pagehide',()=>{if(connected){connected=false;send()}});
})();

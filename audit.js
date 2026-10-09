/* Bull'sHits event audit, cross-tab via localStorage */
(()=>{const KEY='bullshits-playout-events-v1';window.bullLog=(kind,details={})=>{try{const events=JSON.parse(localStorage.getItem(KEY)||'[]');events.push({id:crypto.randomUUID(),at:new Date().toISOString(),kind,...details});localStorage.setItem(KEY,JSON.stringify(events.slice(-5000)))}catch(e){console.warn('Audit unavailable',e)}};})();

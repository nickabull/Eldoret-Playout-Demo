/* Persistent device-local audio library; blobs and metadata commit together. */
(()=>{'use strict';
 const DB='bullshits-audio-library-v1',STORE='audio';let opening;
 function open(){return opening||=(new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id'});r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null};resolve(r.result)};r.onerror=()=>{opening=null;reject(r.error)}}))}
 async function transaction(mode,action){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,mode);let request;try{request=action(tx.objectStore(STORE))}catch(e){reject(e);return}tx.oncomplete=()=>resolve(request.result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Storage transaction failed'))})}
 async function list(){const rows=await transaction('readonly',store=>store.getAll());return rows.filter(x=>x.blob instanceof Blob).map(({blob,...item})=>({...item,url:URL.createObjectURL(blob),savedLocally:true}))}
 async function save(item,blob){const {url,savedLocally,...metadata}=item;await transaction('readwrite',store=>store.put({...metadata,blob}));item.savedLocally=true}
 async function hash(blob){const bytes=await blob.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')}
 let protection;
 function protect(){if(!protection&&navigator.storage?.persist)protection=navigator.storage.persist().catch(()=>false);return protection||Promise.resolve(false)}
 let badge;
 function status(message){if(!badge){badge=document.createElement('p');badge.id='persistentLibraryStatus';badge.setAttribute('role','status');badge.style.cssText='font:12px Arial;color:#bce7cb;margin:8px 0';document.querySelector('.panel.library')?.prepend(badge)}badge.textContent=message}
 window.bullAudioLibrary={list,save,hash,protect,status};
})();

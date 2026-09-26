const CACHE='pianopractice-shell-v2';
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);const response=await fetch('/');await cache.put('/',response.clone());
 const html=await response.text();const assets=[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match=>new URL(match[1],self.location.origin).href);
 const visited=new Set();const queue=[...assets];while(queue.length){const url=queue.shift();if(visited.has(url))continue;visited.add(url);try{const asset=await fetch(url);if(!asset.ok)continue;await cache.put(url,asset.clone());if(url.endsWith('.js')){const code=await asset.text();for(const match of code.matchAll(/["']([^"']+\.(?:js|css))["']/g)){try{const child=new URL(match[1],url);if(child.origin===self.location.origin&&!visited.has(child.href))queue.push(child.href);}catch{}}}}catch{}}
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 if(event.request.mode==='navigate')event.respondWith((async()=>{try{const fresh=await fetch(event.request);const cache=await caches.open(CACHE);await cache.put('/',fresh.clone());return fresh;}catch{return(await caches.match('/'))||Response.error();}})());
 else event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(event.request);if(cached)return cached;try{const fresh=await fetch(event.request);if(fresh.ok)await cache.put(event.request,fresh.clone());return fresh;}catch{return Response.error();}})());
});

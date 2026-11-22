"use strict";

const home = new URL("./", self.location.href);
const prefix = "nubip-educational-component-app-";
const cacheName = prefix + "v1";
const assetUrls = ["education-install.js", "education-sync.js", "manifest.webmanifest",
  "education-192.png", "education-512.png"].map(path => new URL(path, home).href);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([home.href, ...assetUrls].map(url => new Request(url, {cache: "reload"})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request, cacheKey) {
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) {
      try { await (await caches.open(cacheName)).put(cacheKey, response.clone()); } catch {}
    }
    return response;
  } catch {
    return await caches.match(cacheKey, {cacheName}) ?? Response.error();
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== home.origin) return;
  if (request.mode === "navigate"
      && [home.pathname, new URL("index.html", home).pathname].includes(url.pathname)) {
    event.respondWith(networkFirst(request, home.href));
  } else if (assetUrls.includes(url.href)) {
    event.respondWith(networkFirst(request, url.href));
  }
});
